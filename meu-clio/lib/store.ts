// Leitura única do banco por requisição. Todas as consultas saem em paralelo (uma ida e volta),
// e React cache() garante que layout e página dividam o mesmo resultado.
import { cache } from "react";
import { db, isDbConfigured } from "@/lib/supabase/server";
import { parseSettings, type Settings } from "@/lib/settings";

export type CostGroup = "uso" | "manutencao" | "protecao" | "documentacao" | "estetica" | "modificacoes" | "outros";

export type Category = {
  id: string; slug: string; name: string; icon: string; color: string;
  group: CostGroup; sort: number; archived: boolean; custom: boolean;
};
export type FuelInfo = {
  liters: number; price: number; fuelType: string; fullTank: boolean;
  source: "bomba" | "marcador"; before: number | null; after: number | null;
};
export type MaintInfo = {
  system: string; service: string; parts: number; labor: number;
  nextDate: string | null; nextKm: number | null;
};
export type Expense = {
  id: string; date: string; amount: number; km: number | null; vendor: string | null; note: string | null;
  categoryId: string; createdAt: string; fuel: FuelInfo | null; maint: MaintInfo | null;
};
export type Installment = { id: string; number: number; amount: number; dueDate: string; paidAt: string | null; note: string | null };
export type AgendaEvent = {
  id: string; kind: string; title: string; dueDate: string | null; dueKm: number | null;
  repeatMonths: number | null; repeatKm: number | null; doneAt: string | null; note: string | null; expenseId: string | null;
};
export type LevelReading = { id: string; date: string; km: number | null; bars: number; liters: number; context: "antes" | "depois" | "manual"; expenseId: string | null; createdAt: string };
export type OdoReading = { date: string; km: number; source: string };
export type Vehicle = {
  id: string; name: string; make: string | null; model: string | null; year: number | null; plate: string | null;
  heroWord: string; purchaseDate: string | null; purchasePrice: number | null; downPayment: number | null;
  initialKm: number | null; tankL: number; bars: number;
};

export type Store = {
  name: string | null;
  settings: Settings;
  vehicle: Vehicle;
  categories: Category[];
  catById: Map<string, Category>;
  expenses: Expense[];        // sem excluídos, mais recentes primeiro
  installments: Installment[];
  events: AgendaEvent[];
  levels: LevelReading[];     // em ordem cronológica, sem as de gastos excluídos
  odometer: OdoReading[];     // manual + km de gastos ativos + km da compra
};

const n = (v: unknown) => (v == null ? null : Number(v));
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

async function load(): Promise<Store | null> {
  if (!isDbConfigured()) return null;
  const sb = db();
  const [profile, settings, vehicles, cats, exps, deleted, inst, evs, levels, odo] = await Promise.all([
    sb.from("app_profile").select("display_name").eq("id", 1).maybeSingle(),
    sb.from("app_settings").select("prefs").eq("id", 1).maybeSingle(),
    sb.from("vehicles").select("*").is("archived_at", null).order("created_at").limit(1),
    sb.from("categories").select("*").order("sort"),
    sb.from("expenses")
      .select("id,occurred_on,amount,odometer,vendor,note,category_id,created_at,vehicle_id,fuel_records(*),maintenance_records(*)")
      .is("deleted_at", null).order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(5000),
    sb.from("expenses").select("id").not("deleted_at", "is", null).limit(5000),
    sb.from("installments").select("*").order("number"),
    sb.from("scheduled_events").select("*").is("deleted_at", null).order("due_date", { ascending: true, nullsFirst: false }),
    sb.from("fuel_level_readings").select("*").order("read_on").order("created_at"),
    sb.from("odometer_readings").select("read_on,km,source,expense_id").eq("source", "manual").order("read_on"),
  ]);
  const err = [profile, settings, vehicles, cats, exps, deleted, inst, evs, levels, odo].find((r) => r.error)?.error;
  if (err) throw new Error(`Falha ao ler o banco: ${err.message}`);

  let v = vehicles.data?.[0];
  if (!v) {
    const created = await sb.from("vehicles").insert({ name: "Meu Clio", make: "Renault", model: "Clio" }).select("*").single();
    if (created.error) throw new Error(created.error.message);
    v = created.data;
  }
  const vid = v.id as string;
  const vehicle: Vehicle = {
    id: vid, name: v.name, make: v.make, model: v.model, year: n(v.year), plate: v.plate,
    heroWord: v.hero_word || "CLIO", purchaseDate: v.purchase_date, purchasePrice: n(v.purchase_price),
    downPayment: n(v.down_payment), initialKm: n(v.initial_odometer),
    tankL: Number(v.tank_capacity_l ?? 50), bars: Number(v.gauge_bars ?? 9),
  };

  const categories: Category[] = (cats.data ?? []).map((c) => ({
    id: c.id, slug: c.slug, name: c.name, icon: c.icon, color: c.color ?? "#6ef095",
    group: c.cost_group, sort: c.sort, archived: Boolean(c.archived_at), custom: Boolean(c.is_custom),
  }));

  const expenses: Expense[] = (exps.data ?? []).filter((e) => e.vehicle_id === vid).map((e) => {
    const f = one(e.fuel_records as unknown) as Record<string, unknown> | null;
    const m = one(e.maintenance_records as unknown) as Record<string, unknown> | null;
    return {
      id: e.id, date: e.occurred_on, amount: Number(e.amount), km: n(e.odometer), vendor: e.vendor, note: e.note,
      categoryId: e.category_id, createdAt: e.created_at,
      fuel: f ? { liters: Number(f.liters), price: Number(f.price_per_liter), fuelType: String(f.fuel_type),
        fullTank: Boolean(f.full_tank), source: f.liters_source === "marcador" ? "marcador" : "bomba",
        before: n(f.gauge_before), after: n(f.gauge_after) } : null,
      maint: m ? { system: String(m.system), service: String(m.service), parts: Number(m.parts_cost), labor: Number(m.labor_cost),
        nextDate: (m.next_due_date as string) ?? null, nextKm: n(m.next_due_km) } : null,
    };
  });
  const deletedIds = new Set((deleted.data ?? []).map((d) => d.id as string));

  const odometer: OdoReading[] = [
    ...(vehicle.initialKm != null ? [{ date: vehicle.purchaseDate ?? "1900-01-01", km: vehicle.initialKm, source: "compra" }] : []),
    ...(odo.data ?? []).map((o) => ({ date: o.read_on, km: Number(o.km), source: "manual" })),
    ...expenses.filter((e) => e.km != null).map((e) => ({ date: e.date, km: e.km as number, source: "gasto" })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km);

  return {
    name: profile.data?.display_name ?? null,
    settings: parseSettings(settings.data?.prefs),
    vehicle,
    categories,
    catById: new Map(categories.map((c) => [c.id, c])),
    expenses,
    installments: (inst.data ?? []).filter((i) => i.vehicle_id === vid).map((i) => ({
      id: i.id, number: i.number, amount: Number(i.amount), dueDate: i.due_date, paidAt: i.paid_at, note: i.note,
    })),
    events: (evs.data ?? []).filter((e) => e.vehicle_id === vid).map((e) => ({
      id: e.id, kind: e.kind, title: e.title, dueDate: e.due_date, dueKm: n(e.due_km),
      repeatMonths: n(e.repeat_months), repeatKm: n(e.repeat_km), doneAt: e.done_at, note: e.note, expenseId: e.expense_id,
    })),
    levels: (levels.data ?? [])
      .filter((l) => l.vehicle_id === vid && !(l.expense_id && deletedIds.has(l.expense_id)))
      .map((l) => ({ id: l.id, date: l.read_on, km: n(l.km), bars: Number(l.bars), liters: Number(l.liters),
        context: l.context, expenseId: l.expense_id, createdAt: l.created_at })),
    odometer,
  };
}

export const getStore = cache(load);
