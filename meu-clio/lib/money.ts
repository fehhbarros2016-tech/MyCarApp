// Dinheiro: quitação antecipada, reserva para gastos anuais, orçamento por categoria, salário e multas.
import { addMonths, currentMonth, daysUntil, monthKey, todayISO } from "@/lib/format";
import type { AnnualCost, Category, Fine, Installment, Store } from "@/lib/store";

// ---------------- quitação antecipada ----------------
const monthsBetween = (fromISO: string, toISO: string) => daysUntil(toISO, fromISO) / 30.4375;

/** Taxa mensal implícita: a que faz o valor presente das parcelas igualar o valor financiado. */
export function impliedMonthlyRate(financed: number, list: { amount: number; dueDate: string }[], startISO: string): number | null {
  const total = list.reduce((a, i) => a + i.amount, 0);
  if (!(financed > 0) || !list.length) return null;
  if (total <= financed * 1.0005) return 0;
  const pv = (r: number) => list.reduce((a, i) => a + i.amount / Math.pow(1 + r, Math.max(0, monthsBetween(startISO, i.dueDate))), 0);
  let lo = 0, hi = 0.2;
  if (pv(hi) > financed) return null; // juros acima de 20% a.m.: dados inconsistentes
  for (let it = 0; it < 80; it++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > financed) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export type Payoff = {
  rate: number | null; rateSource: "calculada" | "informada" | "sem dados";
  pending: Installment[];
  simulate: (count: number) => { count: number; nominal: number; payNow: number; saving: number; newEnd: string | null; oldEnd: string | null };
};

export function payoff(s: Store, manualRate?: number | null, today = todayISO()): Payoff {
  const pending = s.installments.filter((i) => !i.paidAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.number - b.number);
  const v = s.vehicle;
  const all = [...s.installments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const start = v.purchaseDate ?? (all[0] ? `${addMonths(all[0].dueDate.slice(0, 7), -1)}${all[0].dueDate.slice(7)}` : today);
  const financed = v.purchasePrice != null ? v.purchasePrice - (v.downPayment ?? 0) : 0;
  let rate: number | null = null;
  let rateSource: Payoff["rateSource"] = "sem dados";
  if (manualRate != null && manualRate >= 0) { rate = manualRate; rateSource = "informada"; }
  else {
    const r = impliedMonthlyRate(financed, all, start);
    if (r != null) { rate = r; rateSource = "calculada"; }
  }
  const simulate = (count: number) => simulatePayoff(pending, rate ?? 0, count, today);
  return { rate, rateSource, pending, simulate };
}

/** Adiantar as últimas "count" parcelas hoje: valor presente de cada uma pela taxa mensal. */
export function simulatePayoff(pending: { amount: number; dueDate: string }[], rate: number, count: number, today = todayISO()) {
  const c = Math.max(0, Math.min(pending.length, Math.round(count)));
  const advanced = pending.slice(pending.length - c); // bancos abatem as últimas parcelas
  const nominal = advanced.reduce((a, i) => a + i.amount, 0);
  const payNow = advanced.reduce((a, i) => a + i.amount / Math.pow(1 + rate, Math.max(0, monthsBetween(today, i.dueDate))), 0);
  const rest = pending.slice(0, pending.length - c);
  return { count: c, nominal, payNow, saving: Math.max(0, nominal - payNow), newEnd: rest.at(-1)?.dueDate ?? null, oldEnd: pending.at(-1)?.dueDate ?? null };
}

// ---------------- reserva para gastos anuais ----------------
export type ReserveLine = { cost: AnnualCost; dueKey: string; monthsLeft: number; perMonth: number; paidThisCycle: boolean };

export function annualReserve(s: Store, today = todayISO()) {
  const cur = currentMonth();
  const [y, m] = cur.split("-").map(Number);
  const lines: ReserveLine[] = s.annual.map((c) => {
    let dueYear = c.dueMonth >= m ? y : y + 1;
    // já pago neste mês de vencimento (ou nos 2 meses antes)? então o próximo é no ano que vem
    const cat = c.categoryId;
    const paid = cat != null && c.dueMonth === m && s.expenses.some((e) => e.categoryId === cat && e.date >= `${addMonths(cur, -2)}-01` && e.date <= today);
    if (paid) dueYear = y + 1;
    const dueKey = `${dueYear}-${String(c.dueMonth).padStart(2, "0")}`;
    const monthsLeft = (dueYear * 12 + c.dueMonth) - (y * 12 + m);
    return { cost: c, dueKey, monthsLeft, perMonth: c.amount / Math.max(1, monthsLeft), paidThisCycle: paid };
  }).sort((a, b) => a.monthsLeft - b.monthsLeft);
  const yearly = s.annual.reduce((a, c) => a + c.amount, 0);
  return { lines, perMonthNow: lines.reduce((a, l) => a + l.perMonth, 0), perMonthSteady: yearly / 12, yearly };
}

/** Sugestões de gastos anuais a partir do histórico (seguro, IPVA, licenciamento) que ainda não estão na lista. */
export function annualSuggestions(s: Store) {
  const out: { name: string; categoryId: string; amount: number; dueMonth: number; from: string }[] = [];
  for (const slug of ["seguro", "ipva", "licenciamento"]) {
    const cat = s.categories.find((c) => c.slug === slug);
    if (!cat || s.annual.some((a) => a.categoryId === cat.id)) continue;
    const since = `${addMonths(currentMonth(), -14)}-01`;
    const paid = s.expenses.filter((e) => e.categoryId === cat.id && e.date >= since);
    const ev = s.events.find((e) => !e.doneAt && e.kind === slug && e.dueDate);
    if (paid.length) {
      const byMonth = new Map<string, number>();
      for (const e of paid) byMonth.set(monthKey(e.date), (byMonth.get(monthKey(e.date)) ?? 0) + e.amount);
      const total = paid.reduce((a, e) => a + e.amount, 0);
      const first = paid.reduce((a, e) => (e.date < a ? e.date : a), paid[0].date);
      out.push({ name: cat.name, categoryId: cat.id, amount: Math.round(total), dueMonth: Number((ev?.dueDate ?? first).slice(5, 7)), from: "pelos seus gastos" });
    } else if (ev) {
      out.push({ name: cat.name, categoryId: cat.id, amount: 0, dueMonth: Number(ev.dueDate!.slice(5, 7)), from: "pelo lembrete" });
    }
  }
  return out;
}

// ---------------- orçamento por categoria ----------------
export type CatBudget = { cat: Category; budget: number; spent: number; pct: number; tone: "ok" | "warn" | "danger" };
export function categoryBudgets(s: Store, key = currentMonth()): CatBudget[] {
  const alertPct = s.settings.budgetAlertPct / 100;
  return s.categories.filter((c) => c.budget && !c.archived).map((c) => {
    const spent = s.expenses.filter((e) => e.categoryId === c.id && monthKey(e.date) === key).reduce((a, e) => a + e.amount, 0);
    const pct = spent / (c.budget as number);
    return { cat: c, budget: c.budget as number, spent, pct, tone: pct >= 1 ? "danger" as const : pct >= alertPct ? "warn" as const : "ok" as const };
  }).sort((a, b) => b.pct - a.pct);
}

// ---------------- multas ----------------
export const FINE_POINTS: Record<Fine["severity"], number> = { leve: 3, media: 4, grave: 5, gravissima: 7 };
export const FINE_LABEL: Record<Fine["severity"], string> = { leve: "Leve", media: "Média", grave: "Grave", gravissima: "Gravíssima" };

/** Pontos dos últimos 12 meses e o limite da CNH pela regra atual (20 com 2+ gravíssimas, 30 com 1, 40 sem). */
export function finePoints(s: Store, today = todayISO()) {
  const since = new Date(Date.parse(today + "T12:00:00Z") - 365 * 86_400_000).toISOString().slice(0, 10);
  const valid = s.fines.filter((f) => f.status !== "cancelada" && (f.occurredOn ?? today) >= since);
  const points = valid.reduce((a, f) => a + f.points, 0);
  const grav = valid.filter((f) => f.severity === "gravissima").length;
  const limit = grav >= 2 ? 20 : grav === 1 ? 30 : 40;
  const open = s.fines.filter((f) => f.status === "aberta" || f.status === "recurso");
  return { points, limit, pct: points / limit, count: valid.length, open, openAmount: open.reduce((a, f) => a + (f.amount ?? 0), 0) };
}
