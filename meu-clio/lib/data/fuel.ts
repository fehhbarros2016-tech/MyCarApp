import { db, isDbConfigured } from "@/lib/supabase/server";
import { averageKmPerLiter, consumptionSegments, type Tank } from "@/lib/fuel";

export type FuelFill = { id: string; date: string; km: number | null; amount: number; liters: number; price: number;
  source: "bomba" | "marcador"; barsBefore: number | null; barsAfter: number | null; vendor: string | null };

export type FuelOverview = {
  vehicleId: string;
  tank: Tank;
  level: { bars: number; liters: number; date: string; km: number | null } | null;
  lastKm: number | null;
  fills: FuelFill[];
  avgKmPerLiter: number | null;
  avgPrice: number | null;
  segments: number;
};

export async function getActiveVehicle() {
  if (!isDbConfigured()) return null;
  const { data } = await db().from("vehicles").select("id,tank_capacity_l,gauge_bars")
    .is("archived_at", null).order("created_at").limit(1).maybeSingle();
  return data ? { id: data.id as string, tank: { capacity: Number(data.tank_capacity_l), bars: Number(data.gauge_bars) } } : null;
}

export async function getFuelOverview(): Promise<FuelOverview | null> {
  const v = await getActiveVehicle();
  if (!v) return null;
  const sb = db();
  const [levels, fills, odo] = await Promise.all([
    sb.from("fuel_level_readings").select("bars,liters,km,read_on,context,created_at")
      .eq("vehicle_id", v.id).order("read_on").order("created_at"),
    sb.from("expenses").select("id,occurred_on,odometer,amount,vendor,fuel_records!inner(liters,price_per_liter,liters_source,gauge_before,gauge_after)")
      .eq("vehicle_id", v.id).is("deleted_at", null).order("occurred_on", { ascending: false }).order("created_at", { ascending: false }),
    sb.from("v_odometer_range").select("last_km").eq("vehicle_id", v.id).maybeSingle(),
  ]);
  const err = [levels, fills, odo].find((r) => r.error)?.error;
  if (err) throw new Error(`Falha ao ler combustível: ${err.message}`);

  const fillRows: FuelFill[] = (fills.data ?? []).map((r) => {
    const f = (Array.isArray(r.fuel_records) ? r.fuel_records[0] : r.fuel_records) as Record<string, unknown>;
    return {
      id: r.id as string, date: r.occurred_on as string, km: (r.odometer as number) ?? null, amount: Number(r.amount),
      liters: Number(f.liters), price: Number(f.price_per_liter), source: f.liters_source as "bomba" | "marcador",
      barsBefore: f.gauge_before == null ? null : Number(f.gauge_before), barsAfter: f.gauge_after == null ? null : Number(f.gauge_after), vendor: (r.vendor as string) ?? null,
    };
  });

  const levelRows = levels.data ?? [];
  const lastLevel = levelRows.at(-1);
  const segments = consumptionSegments(
    levelRows.filter((l) => l.km != null).map((l) => ({ km: l.km as number, liters: Number(l.liters), context: l.context, date: l.read_on as string })),
    fillRows.filter((f) => f.km != null).map((f) => ({ km: f.km as number, liters: f.liters, date: f.date })),
  );
  const totLiters = fillRows.reduce((s, f) => s + f.liters, 0);

  return {
    vehicleId: v.id, tank: v.tank,
    level: lastLevel ? { bars: Number(lastLevel.bars), liters: Number(lastLevel.liters), date: lastLevel.read_on as string, km: (lastLevel.km as number) ?? null } : null,
    lastKm: odo.data?.last_km == null ? null : Number(odo.data.last_km),
    fills: fillRows,
    avgKmPerLiter: averageKmPerLiter(segments),
    avgPrice: totLiters > 0 ? fillRows.reduce((s, f) => s + f.amount, 0) / totLiters : null,
    segments: segments.length,
  };
}
