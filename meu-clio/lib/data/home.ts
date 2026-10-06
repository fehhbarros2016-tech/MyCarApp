import { db, isDbConfigured } from "@/lib/supabase/server";

export type DayPoint = { day: string; label: string; amount: number };
export type UpcomingEvent = { id: string; title: string; detail?: string; dueDate?: string; dueKm?: number };

export type HomeData =
  | { configured: false }
  | {
      configured: true;
      name: string | null;
      vehicle: { id: string; name: string; heroWord: string; purchasePrice: number | null; downPayment: number | null } | null;
      totalCost: number;
      monthSpend: number;
      costPerKm: number | null;
      installments: { total: number; paid: number; paidAmount: number; remainingAmount: number };
      last7: DayPoint[];
      upcoming: UpcomingEvent[];
      lastKm: number | null;
      tank: { bars: number; totalBars: number; liters: number; capacity: number } | null;
    };

const tz = "America/Sao_Paulo";
const isoDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: tz });
const weekday = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", timeZone: tz }).replace(".", "");

export async function getHomeData(): Promise<HomeData> {
  if (!isDbConfigured()) return { configured: false };
  const sb = db();

  const [{ data: profile }, { data: vehicle }] = await Promise.all([
    sb.from("app_profile").select("display_name").eq("id", 1).maybeSingle(),
    sb.from("vehicles").select("id,name,hero_word,purchase_price,down_payment,tank_capacity_l,gauge_bars")
      .is("archived_at", null).order("created_at").limit(1).maybeSingle(),
  ]);

  const today = new Date();
  const start7 = new Date(today.getTime() - 6 * 86_400_000);
  const days = Array.from({ length: 7 }, (_, i) => isoDay(new Date(start7.getTime() + i * 86_400_000)));
  const empty = (): HomeData => ({
    configured: true, name: profile?.display_name ?? null, vehicle: null, totalCost: 0, monthSpend: 0, costPerKm: null,
    installments: { total: 0, paid: 0, paidAmount: 0, remainingAmount: 0 },
    last7: days.map((d) => ({ day: d, label: weekday(d), amount: 0 })), upcoming: [], lastKm: null, tank: null,
  });
  if (!vehicle) return empty();

  const vid = vehicle.id as string;
  const monthStart = isoDay(today).slice(0, 8) + "01";

  const [inst, breakdown, perKm, daily, events, nextInst, odo, level] = await Promise.all([
    sb.from("v_installment_summary").select("total,paid,paid_amount,remaining_amount").eq("vehicle_id", vid).maybeSingle(),
    sb.from("v_cost_breakdown").select("amount").eq("vehicle_id", vid),
    sb.from("v_cost_per_km").select("cost_per_km").eq("vehicle_id", vid).maybeSingle(),
    sb.from("v_daily_spend").select("day,amount").eq("vehicle_id", vid).gte("day", monthStart < days[0] ? monthStart : days[0]),
    sb.from("scheduled_events").select("id,title,kind,due_date,due_km,note").eq("vehicle_id", vid).is("done_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }).limit(4),
    sb.from("installments").select("id,number,amount,due_date").eq("vehicle_id", vid).is("paid_at", null)
      .order("number").limit(1).maybeSingle(),
    sb.from("v_odometer_range").select("last_km").eq("vehicle_id", vid).maybeSingle(),
    sb.from("fuel_level_readings").select("bars,liters").eq("vehicle_id", vid)
      .order("read_on", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const firstError = [inst, breakdown, perKm, daily, events, nextInst, odo, level].find((r) => r.error)?.error;
  if (firstError) throw new Error(`Falha ao ler o banco: ${firstError.message}`);

  const num = (v: unknown) => (v == null ? 0 : Number(v));
  const byDay = new Map<string, number>((daily.data ?? []).map((r) => [r.day as string, num(r.amount)]));

  const upcoming: UpcomingEvent[] = [];
  if (nextInst.data) {
    upcoming.push({
      id: `inst-${nextInst.data.id}`, title: `Parcela ${nextInst.data.number}`,
      detail: `R$ ${num(nextInst.data.amount).toLocaleString("pt-BR")}`, dueDate: nextInst.data.due_date as string,
    });
  }
  for (const e of events.data ?? []) {
    if (e.kind === "parcela") continue;
    upcoming.push({ id: e.id as string, title: e.title as string, detail: (e.note as string) ?? undefined,
      dueDate: (e.due_date as string) ?? undefined, dueKm: (e.due_km as number) ?? undefined });
  }

  return {
    configured: true,
    name: profile?.display_name ?? null,
    vehicle: {
      id: vid, name: vehicle.name as string, heroWord: (vehicle.hero_word as string) || "CLIO",
      purchasePrice: vehicle.purchase_price == null ? null : num(vehicle.purchase_price),
      downPayment: vehicle.down_payment == null ? null : num(vehicle.down_payment),
    },
    totalCost: (breakdown.data ?? []).reduce((s, r) => s + num(r.amount), 0),
    monthSpend: [...byDay].filter(([d]) => d >= monthStart).reduce((s, [, v]) => s + v, 0),
    costPerKm: perKm.data?.cost_per_km == null ? null : num(perKm.data.cost_per_km),
    installments: {
      total: num(inst.data?.total), paid: num(inst.data?.paid),
      paidAmount: num(inst.data?.paid_amount), remainingAmount: num(inst.data?.remaining_amount),
    },
    last7: days.map((d) => ({ day: d, label: weekday(d), amount: byDay.get(d) ?? 0 })),
    upcoming: upcoming.slice(0, 3),
    lastKm: odo.data?.last_km == null ? null : num(odo.data.last_km),
    tank: level.data ? { bars: num(level.data.bars), liters: num(level.data.liters),
      totalBars: num(vehicle.gauge_bars) || 9, capacity: num(vehicle.tank_capacity_l) || 50 } : null,
  };
}
