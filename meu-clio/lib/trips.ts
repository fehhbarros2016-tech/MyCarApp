// Totais de uma viagem: gastos marcados nela, km rodados e custo por km.
import { daysUntil, todayISO } from "@/lib/format";
import type { Store, Trip } from "@/lib/store";

export function tripTotals(s: Store, t: Trip, curKm: number | null) {
  const list = s.expenses.filter((e) => e.tripId === t.id);
  const total = list.reduce((a, e) => a + e.amount, 0);
  const endKm = t.endKm ?? (!t.endDate ? curKm : null);
  const km = t.startKm != null && endKm != null && endKm > t.startKm ? endKm - t.startKm : null;
  return { list, total, km, perKm: km ? total / km : null, days: Math.max(1, daysUntil(t.endDate ?? todayISO(), t.startDate) + 1) };
}
