// Todos os números do app. Funções puras sobre o Store: fáceis de testar e rápidas.
import { averageKmPerLiter, consumptionSegments } from "@/lib/fuel";
import { addMonths, currentMonth, daysInMonth, daysUntil, monthKey, todayISO, weekdayIdx } from "@/lib/format";
import type { Category, CostGroup, Store } from "@/lib/store";

export const INSTALLMENT_CAT: Category = {
  id: "parcelas", slug: "parcelas", name: "Parcelas do carro", icon: "receipt", color: "#8fb8ff",
  group: "outros", sort: 0, archived: false, custom: false,
};

export const GROUP_LABEL: Record<CostGroup | "compra", string> = {
  compra: "Compra", uso: "Uso", manutencao: "Manutenção", protecao: "Proteção",
  documentacao: "Documentação", estetica: "Estética", modificacoes: "Modificações", outros: "Outros",
};
export const GROUP_COLOR: Record<CostGroup | "compra", string> = {
  compra: "#8fb8ff", uso: "#6ef095", manutencao: "#5cd6ff", protecao: "#b49cff",
  documentacao: "#ffc35a", estetica: "#ff8fd1", modificacoes: "#ff8a5c", outros: "#a9b8ae",
};

export type Entry = { id: string; date: string; amount: number; cat: Category; kind: "gasto" | "parcela"; title: string };

export function catOf(s: Store, id: string): Category {
  return s.catById.get(id) ?? { ...INSTALLMENT_CAT, id, name: "Sem categoria", icon: "box", color: "#a9b8ae" };
}

/** Lançamentos de dinheiro: gastos + parcelas pagas (se a preferência incluir). */
export function entries(s: Store, withInstallments = s.settings.includeInstallmentsInMonth): Entry[] {
  const out: Entry[] = s.expenses.map((e) => {
    const cat = catOf(s, e.categoryId);
    return { id: e.id, date: e.date, amount: e.amount, cat, kind: "gasto" as const,
      title: e.maint?.service ?? e.note ?? e.vendor ?? cat.name };
  });
  if (withInstallments) {
    for (const i of s.installments) if (i.paidAt) out.push({ id: i.id, date: i.paidAt, amount: i.amount, cat: INSTALLMENT_CAT, kind: "parcela", title: `Parcela ${i.number}` });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export type CatTotal = { cat: Category; total: number; pct: number; count: number };
export function byCategory(list: Entry[]): CatTotal[] {
  const m = new Map<string, CatTotal>();
  for (const e of list) {
    const c = m.get(e.cat.id) ?? { cat: e.cat, total: 0, pct: 0, count: 0 };
    c.total += e.amount; c.count++;
    m.set(e.cat.id, c);
  }
  const total = list.reduce((a, e) => a + e.amount, 0);
  return [...m.values()].map((c) => ({ ...c, pct: total ? c.total / total : 0 })).sort((a, b) => b.total - a.total);
}

const sum = (l: { amount: number }[]) => l.reduce((a, e) => a + e.amount, 0);

export type MonthOverview = {
  key: string; total: number; prevTotal: number; delta: number | null; count: number;
  byCat: CatTotal[]; cumulative: (number | null)[]; prevCumulative: number[]; days: number; todayIdx: number | null;
  projection: number | null; budget: number | null; budgetPct: number | null; dailyAvg: number; biggest: Entry | null;
};

function cumulativeFor(list: Entry[], key: string, upto?: number): number[] {
  const days = daysInMonth(key);
  const daily = new Array(days).fill(0);
  for (const e of list) if (monthKey(e.date) === key) daily[Number(e.date.slice(8, 10)) - 1] += e.amount;
  const out: number[] = [];
  let acc = 0;
  for (let i = 0; i < (upto ?? days); i++) { acc += daily[i]; out.push(acc); }
  return out;
}

export function monthOverview(s: Store, key = currentMonth()): MonthOverview {
  const all = entries(s);
  const list = all.filter((e) => monthKey(e.date) === key);
  const prevKey = addMonths(key, -1);
  const prev = all.filter((e) => monthKey(e.date) === prevKey);
  const total = sum(list), prevTotal = sum(prev);
  const days = daysInMonth(key);
  const isCurrent = key === currentMonth();
  const todayIdx = isCurrent ? Number(todayISO().slice(8, 10)) - 1 : null;
  const cum = cumulativeFor(all, key);
  const cumulative = cum.map((v, i) => (todayIdx != null && i > todayIdx ? null : v));
  const elapsed = todayIdx != null ? todayIdx + 1 : days;
  const budget = s.settings.monthlyBudget;
  return {
    key, total, prevTotal, count: list.length,
    delta: prevTotal > 0 ? (total - prevTotal) / prevTotal : null,
    byCat: byCategory(list),
    cumulative, prevCumulative: cumulativeFor(all, prevKey).slice(0, days),
    days, todayIdx,
    projection: isCurrent && elapsed >= 3 ? (total / elapsed) * days : null,
    budget, budgetPct: budget ? total / budget : null,
    dailyAvg: total / elapsed,
    biggest: list.reduce<Entry | null>((b, e) => (!b || e.amount > b.amount ? e : b), null),
  };
}

export type MonthPoint = { key: string; total: number; byGroup: Record<string, number> };
export function monthlySeries(s: Store, count = 12, endKey = currentMonth()): MonthPoint[] {
  const all = entries(s);
  const keys = Array.from({ length: count }, (_, i) => addMonths(endKey, i - count + 1));
  return keys.map((key) => {
    const list = all.filter((e) => monthKey(e.date) === key);
    const byGroup: Record<string, number> = {};
    for (const e of list) {
      const g = e.kind === "parcela" ? "compra" : e.cat.group;
      byGroup[g] = (byGroup[g] ?? 0) + e.amount;
    }
    return { key, total: sum(list), byGroup };
  });
}

export function installmentsSummary(s: Store) {
  const list = s.installments;
  const paid = list.filter((i) => i.paidAt);
  const pending = list.filter((i) => !i.paidAt).sort((a, b) => a.number - b.number);
  const today = todayISO();
  return {
    total: list.length, paid: paid.length, remaining: pending.length,
    paidAmount: sum(paid), remainingAmount: sum(pending),
    next: pending[0] ?? null,
    overdue: pending.filter((i) => i.dueDate < today),
    pct: list.length ? paid.length / list.length : 0,
    down: s.vehicle.downPayment ?? 0,
    price: s.vehicle.purchasePrice,
    lastDue: list.length ? list[list.length - 1].dueDate : null,
  };
}

export function kmStats(s: Store) {
  const o = s.odometer;
  if (!o.length) return { first: null as number | null, last: null as number | null, driven: 0, lastDate: null as string | null, perMonth: null as number | null };
  const first = Math.min(...o.map((r) => r.km));
  const lastR = o.reduce((b, r) => (r.km > b.km ? r : b), o[0]);
  const firstR = o.reduce((b, r) => (r.km < b.km ? r : b), o[0]);
  const driven = lastR.km - first;
  const spanDays = firstR.date.startsWith("1900") ? 0 : daysUntil(lastR.date, firstR.date);
  return { first, last: lastR.km, driven, lastDate: lastR.date,
    perMonth: spanDays >= 14 && driven > 0 ? driven / (spanDays / 30.4) : null };
}

export function totals(s: Store) {
  const inst = installmentsSummary(s);
  const usage = sum(s.expenses);
  const purchase = (s.settings.includeDownInTotal ? inst.down : 0) + inst.paidAmount;
  const groups = new Map<CostGroup | "compra", number>();
  if (purchase) groups.set("compra", purchase);
  for (const e of s.expenses) {
    const g = catOf(s, e.categoryId).group;
    groups.set(g, (groups.get(g) ?? 0) + e.amount);
  }
  const k = kmStats(s);
  return {
    total: purchase + usage, purchase, usage,
    groups: [...groups.entries()].map(([g, v]) => ({ group: g, label: GROUP_LABEL[g], color: GROUP_COLOR[g], total: v }))
      .sort((a, b) => b.total - a.total),
    costPerKm: k.driven > 0 ? usage / k.driven : null,
    km: k,
  };
}

export function fuelStats(s: Store) {
  const fills = s.expenses.filter((e) => e.fuel).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const segs = consumptionSegments(
    s.levels.filter((l) => l.km != null).map((l) => ({ km: l.km as number, liters: l.liters, context: l.context, date: l.date })),
    fills.filter((f) => f.km != null).map((f) => ({ km: f.km as number, liters: f.fuel!.liters, date: f.date })),
  );
  const liters = fills.reduce((a, f) => a + f.fuel!.liters, 0);
  const spent = sum(fills);
  const last = s.levels.at(-1) ?? null;
  return {
    fills,
    level: last ? { bars: last.bars, liters: last.liters, date: last.date, km: last.km } : null,
    kmPerL: averageKmPerLiter(segs),
    segments: segs,
    liters, spent,
    avgPrice: liters > 0 ? spent / liters : null,
    priceSeries: fills.map((f) => ({ date: f.date, value: f.fuel!.price })),
    kmlSeries: segs.map((x) => ({ date: String(x.toKm), value: x.kmPerLiter })),
    autonomyKm: last && segs.length ? last.liters * (averageKmPerLiter(segs) ?? 0) : null,
  };
}

export function oilStatus(s: Store) {
  const oilCat = s.categories.find((c) => c.slug === "oleo")?.id;
  const last = s.expenses.find((e) => e.km != null && (e.categoryId === oilCat || /[óo]leo/i.test(e.maint?.service ?? "") || /[óo]leo/i.test(e.note ?? "")));
  if (!last) return null;
  const k = kmStats(s);
  const nextKm = (last.km as number) + s.settings.oilIntervalKm;
  return { lastKm: last.km as number, lastDate: last.date, nextKm, leftKm: k.last != null ? nextKm - k.last : null };
}

export type Upcoming = { id: string; title: string; detail: string | null; dueDate: string | null; dueKm: number | null;
  days: number | null; kmLeft: number | null; tone: "danger" | "warn" | "ok"; kind: string; source: "evento" | "parcela" | "oleo" };

export function upcoming(s: Store): Upcoming[] {
  const today = todayISO();
  const k = kmStats(s);
  const tone = (days: number | null, kmLeft: number | null): Upcoming["tone"] =>
    (days != null && days < 0) || (kmLeft != null && kmLeft < 0) ? "danger"
      : (days != null && days <= s.settings.reminderDays) || (kmLeft != null && kmLeft <= 500) ? "warn" : "ok";
  const out: Upcoming[] = s.events.filter((e) => !e.doneAt).map((e) => {
    const days = e.dueDate ? daysUntil(e.dueDate, today) : null;
    const kmLeft = e.dueKm != null && k.last != null ? e.dueKm - k.last : null;
    return { id: e.id, title: e.title, detail: e.note, dueDate: e.dueDate, dueKm: e.dueKm, days, kmLeft, tone: tone(days, kmLeft), kind: e.kind, source: "evento" as const };
  });
  const inst = installmentsSummary(s);
  if (inst.next) {
    const days = daysUntil(inst.next.dueDate, today);
    out.push({ id: inst.next.id, title: `Parcela ${inst.next.number}`, detail: `R$ ${inst.next.amount.toLocaleString("pt-BR")}`,
      dueDate: inst.next.dueDate, dueKm: null, days, kmLeft: null, tone: tone(days, null), kind: "parcela", source: "parcela" });
  }
  const oil = oilStatus(s);
  if (oil && !s.events.some((e) => !e.doneAt && e.kind === "oleo")) {
    out.push({ id: "oleo", title: "Troca de óleo", detail: `a cada ${s.settings.oilIntervalKm.toLocaleString("pt-BR")} km`,
      dueDate: null, dueKm: oil.nextKm, days: null, kmLeft: oil.leftKm, tone: tone(null, oil.leftKm), kind: "oleo", source: "oleo" });
  }
  const rank = (u: Upcoming) => (u.tone === "danger" ? 0 : u.tone === "warn" ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b) || (a.days ?? (a.kmLeft ?? 1e9) / 40) - (b.days ?? (b.kmLeft ?? 1e9) / 40));
}

export type Alert = { id: string; tone: "danger" | "warn" | "info" | "ok"; icon: string; title: string; detail: string; href: string };

export function alerts(s: Store): Alert[] {
  const out: Alert[] = [];
  const inst = installmentsSummary(s);
  if (inst.overdue.length) out.push({ id: "atraso", tone: "danger", icon: "alert", href: "/parcelas",
    title: inst.overdue.length === 1 ? `Parcela ${inst.overdue[0].number} atrasada` : `${inst.overdue.length} parcelas atrasadas`,
    detail: `Total de R$ ${sum(inst.overdue).toLocaleString("pt-BR")}` });
  for (const u of upcoming(s)) {
    if (u.tone === "ok" || (u.source === "parcela" && inst.overdue.length)) continue;
    const when = u.days != null ? (u.days < 0 ? `venceu há ${-u.days} ${-u.days === 1 ? "dia" : "dias"}` : u.days === 0 ? "vence hoje" : `vence em ${u.days} ${u.days === 1 ? "dia" : "dias"}`)
      : u.kmLeft != null ? (u.kmLeft < 0 ? `passou ${Math.abs(u.kmLeft).toLocaleString("pt-BR")} km` : `faltam ${u.kmLeft.toLocaleString("pt-BR")} km`) : "";
    out.push({ id: `u-${u.id}`, tone: u.tone, icon: u.kind === "parcela" ? "receipt" : u.kind === "oleo" ? "oil" : "calendar",
      title: u.title, detail: when, href: u.source === "parcela" ? "/parcelas" : "/agenda" });
  }
  const m = monthOverview(s);
  if (m.budget && m.budgetPct != null) {
    if (m.budgetPct >= 1) out.push({ id: "orc", tone: "danger", icon: "wallet", href: "/gastos", title: "Orçamento do mês estourado",
      detail: `R$ ${Math.round(m.total - m.budget).toLocaleString("pt-BR")} acima do limite` });
    else if (m.budgetPct * 100 >= s.settings.budgetAlertPct) out.push({ id: "orc", tone: "warn", icon: "wallet", href: "/gastos",
      title: `${Math.round(m.budgetPct * 100)}% do orçamento usado`, detail: `Restam R$ ${Math.round(m.budget - m.total).toLocaleString("pt-BR")}` });
    else if (m.projection && m.projection > m.budget) out.push({ id: "proj", tone: "info", icon: "trend", href: "/relatorios",
      title: "No ritmo atual, o mês passa do orçamento", detail: `Projeção de R$ ${Math.round(m.projection).toLocaleString("pt-BR")}` });
  }
  const f = fuelStats(s);
  if (f.level && f.level.bars <= 1.5) out.push({ id: "reserva", tone: "warn", icon: "fuel", href: "/combustivel/novo",
    title: "Tanque na reserva", detail: `Cerca de ${Math.round(f.level.liters)} L no tanque` });
  if (!s.odometer.length) out.push({ id: "km", tone: "info", icon: "gauge", href: "/combustivel/nivel",
    title: "Informe a quilometragem", detail: "Libera custo por km e lembretes por km" });
  if (!out.length) out.push({ id: "ok", tone: "ok", icon: "check", href: "/agenda", title: "Tudo em dia", detail: "Nenhuma pendência agora" });
  return out;
}

export function weekdaySpend(list: Entry[], weekStart: 0 | 1) {
  const totals = new Array(7).fill(0);
  for (const e of list) totals[weekdayIdx(e.date)] += e.amount;
  const order = weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const labels = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return order.map((i) => ({ label: labels[i], total: totals[i] }));
}

export function periodStart(period: string): string | null {
  const t = todayISO();
  if (period === "mes") return t.slice(0, 8) + "01";
  const m = { "3m": 3, "6m": 6, "12m": 12 }[period];
  if (!m) return null;
  return addMonths(t.slice(0, 7), -(m - 1)) + "-01";
}
