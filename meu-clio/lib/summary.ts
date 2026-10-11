// Resumo do mês e retrospectiva do ano. Funções puras sobre o Store.
import { averageKmPerLiter } from "@/lib/fuel";
import { addMonths, monthKey } from "@/lib/format";
import { byCategory, entries, fuelStats, type Entry } from "@/lib/calc";
import type { OdoReading, Store } from "@/lib/store";

/** Km rodados entre duas datas (inclusive), pelas leituras do hodômetro. */
export function kmBetween(readings: OdoReading[], from: string, to: string): number | null {
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const before = sorted.filter((r) => r.date < from).at(-1) ?? null;
  const inside = sorted.filter((r) => r.date >= from && r.date <= to);
  if (!inside.length) return null;
  const start = before?.km ?? inside[0].km;
  const end = inside.at(-1)!.km;
  return end > start ? end - start : null;
}

const top = <T,>(list: T[], key: (x: T) => string | null) => {
  const m = new Map<string, number>();
  for (const x of list) { const k = key(x); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  let best: [string, number] | null = null;
  for (const e of m) if (!best || e[1] > best[1]) best = e;
  return best;
};

export function monthSummary(s: Store, key: string) {
  const all = entries(s);
  const list = all.filter((e) => monthKey(e.date) === key);
  const prev = all.filter((e) => monthKey(e.date) === addMonths(key, -1));
  const total = list.reduce((a, e) => a + e.amount, 0);
  const prevTotal = prev.reduce((a, e) => a + e.amount, 0);
  const from = `${key}-01`, to = `${key}-31`;
  const km = kmBetween(s.odometer, from, to);
  const usage = list.filter((e) => e.kind === "gasto").reduce((a, e) => a + e.amount, 0);
  const fills = s.expenses.filter((e) => e.fuel && monthKey(e.date) === key);
  const liters = fills.reduce((a, e) => a + e.fuel!.liters, 0);
  const f = fuelStats(s);
  const kmInMonth = (toKm: number) => {
    const r = [...s.odometer].filter((o) => o.km >= toKm).sort((a, b) => a.km - b.km)[0];
    return r ? monthKey(r.date) === key : false;
  };
  const segs = f.segments.filter((x) => kmInMonth(x.toKm));
  const maint = s.expenses.filter((e) => e.maint && monthKey(e.date) === key);
  const station = top(fills, (e) => e.vendor);
  const days = new Set(list.map((e) => e.date)).size;
  const budget = s.settings.monthlyBudget;
  return {
    key, total, prevTotal, delta: prevTotal > 0 ? (total - prevTotal) / prevTotal : null, count: list.length,
    byCat: byCategory(list).slice(0, 6), km, costPerKm: km ? usage / km : null, liters, fills: fills.length,
    kmPerL: averageKmPerLiter(segs), maint, station: station?.[0] ?? null, days,
    biggest: list.reduce<Entry | null>((b, e) => (!b || e.amount > b.amount ? e : b), null),
    budget, budgetLeft: budget ? budget - total : null,
    parcelas: list.filter((e) => e.kind === "parcela").length,
  };
}

export function yearRecap(s: Store, year: string) {
  const all = entries(s).filter((e) => e.date.startsWith(year));
  const total = all.reduce((a, e) => a + e.amount, 0);
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`).map((k) => ({
    key: k, total: all.filter((e) => monthKey(e.date) === k).reduce((a, e) => a + e.amount, 0),
  }));
  const active = months.filter((m) => m.total > 0);
  const priciest = active.reduce<{ key: string; total: number } | null>((b, m) => (!b || m.total > b.total ? m : b), null);
  const cheapest = active.reduce<{ key: string; total: number } | null>((b, m) => (!b || m.total < b.total ? m : b), null);
  const cats = byCategory(all);
  const fills = s.expenses.filter((e) => e.fuel && e.date.startsWith(year));
  const liters = fills.reduce((a, e) => a + e.fuel!.liters, 0);
  const f = fuelStats(s);
  const segs = f.segments.filter((x) => s.odometer.some((o) => o.km >= x.toKm && o.date.startsWith(year)));
  const best = segs.reduce<typeof segs[number] | null>((b, x) => (x.km >= 80 && (!b || x.kmPerLiter > b.kmPerLiter) ? x : b), null);
  const prices = fills.map((e) => e.fuel!.price);
  const maint = s.expenses.filter((e) => e.maint && e.date.startsWith(year));
  const shopId = top(s.expenses.filter((e) => e.shopId && e.date.startsWith(year)), (e) => e.shopId);
  const station = top(fills, (e) => e.vendor);
  return {
    year, total, count: all.length, months, priciest, cheapest, topCat: cats[0] ?? null, cats: cats.slice(0, 5),
    km: kmBetween(s.odometer, `${year}-01-01`, `${year}-12-31`), liters, fills: fills.length,
    kmPerL: averageKmPerLiter(segs), best,
    priceMin: prices.length ? Math.min(...prices) : null, priceMax: prices.length ? Math.max(...prices) : null,
    maintCount: maint.length, maintTotal: maint.reduce((a, e) => a + e.amount, 0),
    shop: shopId ? s.shops.find((x) => x.id === shopId[0])?.name ?? null : null, station: station?.[0] ?? null,
    biggest: all.reduce<Entry | null>((b, e) => (!b || e.amount > b.amount ? e : b), null),
    parcelas: all.filter((e) => e.kind === "parcela").length,
    trips: s.trips.filter((t) => t.startDate.startsWith(year)).length,
    finePoints: s.fines.filter((x) => x.status !== "cancelada" && (x.occurredOn ?? "").startsWith(year)).reduce((a, x) => a + x.points, 0),
    parts: s.parts.filter((p) => p.installedOn.startsWith(year)).length,
    issuesSolved: s.issues.filter((i) => i.resolvedOn?.startsWith(year)).length,
    perDay: total / (year === new Date().getFullYear().toString() ? Math.max(1, Math.ceil((Date.now() - Date.parse(`${year}-01-01`)) / 86_400_000)) : 365),
  };
}
