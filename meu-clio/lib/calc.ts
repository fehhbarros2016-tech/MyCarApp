// Todos os números do app. Funções puras sobre o Store: fáceis de testar e rápidas.
import { averageKmPerLiter, consumptionSegments, type Segment } from "@/lib/fuel";
import { addMonths, currentMonth, daysInMonth, daysUntil, monthKey, todayISO, weekdayIdx } from "@/lib/format";
import { kmStats } from "@/lib/km";
import { categoryBudgets, finePoints } from "@/lib/money";
import { oilPlanItem, planStatus, planStatuses } from "@/lib/plan";
import { tireStatus } from "@/lib/tires";
import type { Category, CostGroup, Store } from "@/lib/store";

export { kmStats } from "@/lib/km";

export const INSTALLMENT_CAT: Category = {
  id: "parcelas", slug: "parcelas", name: "Parcelas do carro", icon: "receipt", color: "#8fb8ff",
  group: "outros", sort: 0, archived: false, custom: false, budget: null,
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

export type TypeStats = { kmPerL: number | null; km: number; liters: number; avgPrice: number | null; lastPrice: number | null; fills: number };

export function fuelStats(s: Store) {
  const fills = s.expenses.filter((e) => e.fuel).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const segs = consumptionSegments(
    s.levels.filter((l) => l.km != null).map((l) => ({ km: l.km as number, liters: l.liters, context: l.context, date: l.date })),
    fills.filter((f) => f.km != null).map((f) => ({ km: f.km as number, liters: f.fuel!.liters, date: f.date })),
  );
  const liters = fills.reduce((a, f) => a + f.fuel!.liters, 0);
  const spent = sum(fills);
  const last = s.levels.at(-1) ?? null;
  const kmPerL = averageKmPerLiter(segs);

  // combustível de cada trecho = o do último abastecimento até o início do trecho
  const typeOf = (seg: Segment) => [...fills].reverse().find((f) => f.km != null && (f.km as number) <= seg.fromKm)?.fuel?.fuelType
    ?? fills.find((f) => f.km != null && (f.km as number) <= seg.toKm)?.fuel?.fuelType ?? null;
  const byType: Record<"gasolina" | "etanol", TypeStats> = { gasolina: emptyType(), etanol: emptyType() };
  for (const t of ["gasolina", "etanol"] as const) {
    const tf = fills.filter((f) => f.fuel!.fuelType === t);
    const tl = tf.reduce((a, f) => a + f.fuel!.liters, 0);
    const ts = segs.filter((x) => typeOf(x) === t);
    byType[t] = { kmPerL: averageKmPerLiter(ts), km: ts.reduce((a, x) => a + x.km, 0), liters: tl,
      avgPrice: tl > 0 ? sum(tf) / tl : null, lastPrice: tf.at(-1)?.fuel?.price ?? null, fills: tf.length };
  }

  // nível estimado agora: última leitura menos o que foi rodado desde ela
  const k = kmStats(s);
  let litersNow: number | null = last ? last.liters : null;
  let estimated = false;
  if (last && last.km != null && k.last != null && kmPerL && k.last > last.km) {
    litersNow = Math.max(0, last.liters - (k.last - last.km) / kmPerL);
    estimated = true;
  }

  // queda de consumo: último trecho (≥ 80 km) contra a média dos anteriores
  const valid = segs.filter((x) => x.km >= 80);
  const lastSeg = valid.at(-1) ?? null;
  const before = valid.slice(0, -1).slice(-6);
  const avgBefore = before.length >= 2 ? averageKmPerLiter(before) : null;
  const drop = lastSeg && avgBefore ? (avgBefore - lastSeg.kmPerLiter) / avgBefore : null;

  return {
    fills,
    level: last ? { bars: last.bars, liters: last.liters, date: last.date, km: last.km } : null,
    litersNow, estimated,
    kmPerL,
    segments: segs,
    liters, spent,
    avgPrice: liters > 0 ? spent / liters : null,
    priceSeries: fills.map((f) => ({ date: f.date, value: f.fuel!.price, type: f.fuel!.fuelType })),
    kmlSeries: segs.map((x) => ({ date: String(x.toKm), value: x.kmPerLiter })),
    autonomyKm: litersNow != null && kmPerL ? litersNow * kmPerL : null,
    byType,
    drop: drop != null ? { pct: drop, last: lastSeg!.kmPerLiter, avg: avgBefore!, toKm: lastSeg!.toKm } : null,
  };
}
const emptyType = (): TypeStats => ({ kmPerL: null, km: 0, liters: 0, avgPrice: null, lastPrice: null, fills: 0 });

export function oilStatus(s: Store) {
  const item = oilPlanItem(s);
  const k = kmStats(s);
  if (item) {
    const p = planStatus(s, item, k);
    if (p.lastKm == null || p.dueKm == null) return null;
    return { lastKm: p.lastKm, lastDate: p.lastDate ?? "", nextKm: p.dueKm, leftKm: p.kmLeft, interval: item.intervalKm ?? s.settings.oilIntervalKm, fromPlan: true };
  }
  const oilCat = s.categories.find((c) => c.slug === "oleo")?.id;
  const last = s.expenses.find((e) => e.km != null && (e.categoryId === oilCat || /[óo]leo/i.test(e.maint?.service ?? "") || /[óo]leo/i.test(e.note ?? "")));
  if (!last) return null;
  const nextKm = (last.km as number) + s.settings.oilIntervalKm;
  return { lastKm: last.km as number, lastDate: last.date, nextKm, leftKm: k.last != null ? nextKm - k.last : null, interval: s.settings.oilIntervalKm, fromPlan: false };
}

export type Upcoming = { id: string; title: string; detail: string | null; dueDate: string | null; dueKm: number | null;
  days: number | null; kmLeft: number | null; tone: "danger" | "warn" | "ok"; kind: string;
  source: "evento" | "parcela" | "oleo" | "plano" | "multa" | "pneu"; href: string };

export function upcoming(s: Store): Upcoming[] {
  const today = todayISO();
  const k = kmStats(s);
  const tone = (days: number | null, kmLeft: number | null): Upcoming["tone"] =>
    (days != null && days < 0) || (kmLeft != null && kmLeft < 0) ? "danger"
      : (days != null && days <= s.settings.reminderDays) || (kmLeft != null && kmLeft <= 500) ? "warn" : "ok";
  const out: Upcoming[] = s.events.filter((e) => !e.doneAt).map((e) => {
    const days = e.dueDate ? daysUntil(e.dueDate, today) : null;
    const kmLeft = e.dueKm != null && k.last != null ? e.dueKm - k.last : null;
    return { id: e.id, title: e.title, detail: e.note, dueDate: e.dueDate, dueKm: e.dueKm, days, kmLeft, tone: tone(days, kmLeft), kind: e.kind, source: "evento" as const, href: "/agenda" };
  });
  const inst = installmentsSummary(s);
  if (inst.next) {
    const days = daysUntil(inst.next.dueDate, today);
    out.push({ id: inst.next.id, title: `Parcela ${inst.next.number}`, detail: `R$ ${inst.next.amount.toLocaleString("pt-BR")}`,
      dueDate: inst.next.dueDate, dueKm: null, days, kmLeft: null, tone: tone(days, null), kind: "parcela", source: "parcela", href: "/parcelas" });
  }
  // plano de revisão (só itens já registrados alguma vez)
  for (const p of planStatuses(s, k)) {
    if (!p.known || (p.dueKm == null && p.dueDate == null)) continue;
    out.push({ id: `plano-${p.item.id}`, title: p.item.name, detail: "plano de revisão", dueDate: p.dueDate, dueKm: p.dueKm,
      days: p.daysLeft, kmLeft: p.kmLeft, tone: p.tone === "info" ? "ok" : p.tone, kind: p.item.categorySlug === "oleo" ? "oleo" : "revisao", source: "plano", href: "/manutencao?t=plano" });
  }
  const oil = oilStatus(s);
  if (oil && !oil.fromPlan && !s.events.some((e) => !e.doneAt && e.kind === "oleo")) {
    out.push({ id: "oleo", title: "Troca de óleo", detail: `a cada ${oil.interval.toLocaleString("pt-BR")} km`,
      dueDate: null, dueKm: oil.nextKm, days: null, kmLeft: oil.leftKm, tone: tone(null, oil.leftKm), kind: "oleo", source: "oleo", href: "/manutencao" });
  }
  for (const f of s.fines) {
    if ((f.status !== "aberta" && f.status !== "recurso") || !f.dueDate) continue;
    const days = daysUntil(f.dueDate, today);
    out.push({ id: `multa-${f.id}`, title: `Multa: ${f.description}`, detail: f.status === "recurso" ? "prazo do recurso" : "prazo para pagar",
      dueDate: f.dueDate, dueKm: null, days, kmLeft: null, tone: tone(days, null), kind: "multa", source: "multa", href: "/multas" });
  }
  const t = tireStatus(s, k);
  if (t.rotation.nextKm != null) {
    out.push({ id: "pneu-rodizio", title: "Rodízio dos pneus", detail: `a cada ${s.settings.tireRotationKm.toLocaleString("pt-BR")} km`,
      dueDate: null, dueKm: t.rotation.nextKm, days: null, kmLeft: t.rotation.kmLeft, tone: tone(null, t.rotation.kmLeft), kind: "pneus", source: "pneu", href: "/manutencao?t=pneus" });
  }
  const rank = (u: Upcoming) => (u.tone === "danger" ? 0 : u.tone === "warn" ? 1 : 2);
  const eta = (u: Upcoming) => {
    const byKm = u.kmLeft != null ? (k.perDay ? u.kmLeft / k.perDay : u.kmLeft / 40) : null;
    return Math.min(u.days ?? 1e9, byKm ?? 1e9);
  };
  return out.sort((a, b) => rank(a) - rank(b) || eta(a) - eta(b));
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
    out.push({ id: `u-${u.id}`, tone: u.tone, icon: u.kind === "parcela" ? "receipt" : u.kind === "oleo" ? "oil" : u.kind === "multa" ? "alert" : u.kind === "pneus" ? "tire" : u.source === "plano" ? "wrench" : "calendar",
      title: u.title, detail: when, href: u.href });
  }
  for (const b of categoryBudgets(s)) {
    if (b.tone === "ok") continue;
    out.push({ id: `cb-${b.cat.id}`, tone: b.tone, icon: b.cat.icon, href: "/planejamento",
      title: b.tone === "danger" ? `${b.cat.name}: orçamento estourado` : `${b.cat.name}: ${Math.round(b.pct * 100)}% do orçamento`,
      detail: b.tone === "danger" ? `R$ ${Math.round(b.spent - b.budget).toLocaleString("pt-BR")} acima` : `Restam R$ ${Math.round(b.budget - b.spent).toLocaleString("pt-BR")}` });
  }
  for (const i of s.issues) {
    if (i.resolvedOn || i.severity !== "alta") continue;
    out.push({ id: `pb-${i.id}`, tone: "warn", icon: "alert", href: "/manutencao?t=problemas", title: i.title, detail: "Problema em aberto" });
  }
  const tires = tireStatus(s);
  if (tires.pressure.daysLeft != null && tires.pressure.daysLeft < 0) out.push({ id: "calib", tone: "info", icon: "tire", href: "/manutencao?t=pneus",
    title: "Calibrar os pneus", detail: `Última calibragem há ${-tires.pressure.daysLeft + s.settings.tirePressureDays} dias` });
  if (tires.wearPct != null && tires.wearPct >= 0.9) out.push({ id: "desgaste", tone: "warn", icon: "tire", href: "/manutencao?t=pneus",
    title: "Pneus perto do fim", detail: `${Math.round(tires.wearPct * 100)}% da vida útil estimada` });
  const fp = finePoints(s);
  if (fp.points > 0 && fp.pct >= 0.75) out.push({ id: "cnh", tone: fp.pct >= 1 ? "danger" : "warn", icon: "badge", href: "/multas",
    title: `${fp.points} pontos na CNH`, detail: `Limite de ${fp.limit} em 12 meses` });
  const m = monthOverview(s);
  if (m.budget && m.budgetPct != null) {
    if (m.budgetPct >= 1) out.push({ id: "orc", tone: "danger", icon: "wallet", href: "/gastos", title: "Orçamento do mês estourado",
      detail: `R$ ${Math.round(m.total - m.budget).toLocaleString("pt-BR")} acima do limite` });
    else if (m.budgetPct * 100 >= s.settings.budgetAlertPct) out.push({ id: "orc", tone: "warn", icon: "wallet", href: "/gastos",
      title: `${Math.round(m.budgetPct * 100)}% do orçamento usado`, detail: `Restam R$ ${Math.round(m.budget - m.total).toLocaleString("pt-BR")}` });
    else {
      const fc = forecast(s);
      if (fc.ready && fc.total > m.budget) out.push({ id: "prev", tone: "info", icon: "trend", href: "/",
        title: "O previsto do mês passa do orçamento", detail: `Previsto R$ ${Math.round(fc.total).toLocaleString("pt-BR")}` });
      else if (m.projection && m.projection > m.budget) out.push({ id: "proj", tone: "info", icon: "trend", href: "/relatorios",
        title: "No ritmo atual, o mês passa do orçamento", detail: `Projeção de R$ ${Math.round(m.projection).toLocaleString("pt-BR")}` });
    }
  }
  const f = fuelStats(s);
  const reserveL = (1.5 / s.vehicle.bars) * s.vehicle.tankL;
  if (f.litersNow != null && f.litersNow <= reserveL) out.push({ id: "reserva", tone: "warn", icon: "fuel", href: "/combustivel/novo",
    title: f.estimated ? "Tanque deve estar na reserva" : "Tanque na reserva", detail: `Cerca de ${Math.round(f.litersNow)} L no tanque` });
  if (s.settings.consumptionAlert && f.drop && f.drop.pct * 100 >= s.settings.consumptionDropPct) out.push({ id: `consumo-${f.drop.toKm}`, tone: "warn", icon: "trendDown", href: "/combustivel",
    title: `Consumo caiu ${Math.round(f.drop.pct * 100)}%`, detail: `${f.drop.last.toFixed(1).replace(".", ",")} km/l (média ${f.drop.avg.toFixed(1).replace(".", ",")}). Confira pneus e filtros` });
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

// ---------------- gasto previsto ----------------
export type ForecastLine = { id: string; label: string; icon: string; color: string; amount: number;
  basis: "parcela" | "media" | "anual" | "lembrete"; note: string };
export type Forecast = { total: number; lines: ForecastLine[]; months: number; spent: number; remaining: number;
  over: number; pct: number; ready: boolean };

const ANNUAL = ["seguro", "ipva", "licenciamento"];
const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/**
 * Previsão do mês:
 *  - parcelas: valor exato das que vencem no mês;
 *  - gastos recorrentes: média por categoria dos últimos N meses completos (só desde o primeiro mês com registro);
 *  - seguro, IPVA e licenciamento: só no mês em que acontecem (lembrete vencendo no mês, com o último valor pago,
 *    ou pago no mesmo mês do ano passado). Assim um gasto anual não infla todos os meses.
 */
export function forecast(s: Store, key = currentMonth()): Forecast {
  const lines: ForecastLine[] = [];
  const firstDate = s.expenses.reduce<string | null>((m, e) => (!m || e.date < m ? e.date : m), null);
  const firstMonth = firstDate ? monthKey(firstDate) : key;
  const window: string[] = [];
  for (let i = 1; i <= s.settings.forecastMonths; i++) {
    const k = addMonths(key, -i);
    if (k >= firstMonth) window.push(k);
  }
  const months = window.length;

  if (s.settings.includeInstallmentsInMonth) {
    const due = s.installments.filter((i) => monthKey(i.dueDate) === key);
    const amount = due.reduce((a, i) => a + i.amount, 0);
    if (amount > 0) lines.push({ id: "parcelas", label: due.length === 1 ? `Parcela ${due[0].number}` : `${due.length} parcelas`,
      icon: INSTALLMENT_CAT.icon, color: INSTALLMENT_CAT.color, amount, basis: "parcela",
      note: due.length === 1 ? `vence dia ${Number(due[0].dueDate.slice(8, 10))}` : "vencem neste mês" });
  }

  if (months > 0) {
    const inWindow = new Set(window);
    const sums = new Map<string, number>();
    for (const e of s.expenses) {
      if (!inWindow.has(monthKey(e.date))) continue;
      sums.set(e.categoryId, (sums.get(e.categoryId) ?? 0) + e.amount);
    }
    for (const [catId, total] of sums) {
      const cat = catOf(s, catId);
      if (ANNUAL.includes(cat.slug)) continue;
      const avg = total / months;
      if (avg >= 1) lines.push({ id: cat.id, label: cat.name, icon: cat.icon, color: cat.color, amount: avg, basis: "media",
        note: `média de ${months} ${months === 1 ? "mês" : "meses"}` });
    }
  }

  for (const slug of ANNUAL) {
    const cat = s.categories.find((c) => c.slug === slug);
    if (!cat) continue;
    const paid = s.expenses.filter((e) => e.categoryId === cat.id); // mais recentes primeiro
    const ev = s.events.find((e) => !e.doneAt && e.kind === slug && e.dueDate && monthKey(e.dueDate) === key);
    const alreadyThisMonth = paid.some((e) => monthKey(e.date) === key);
    const lastYear = paid.filter((e) => monthKey(e.date) === addMonths(key, -12)).reduce((a, e) => a + e.amount, 0);
    if (ev && paid[0] && !alreadyThisMonth) {
      lines.push({ id: cat.id, label: cat.name, icon: cat.icon, color: cat.color, amount: paid[0].amount, basis: "lembrete",
        note: `lembrete vence dia ${Number(ev.dueDate!.slice(8, 10))}` });
    } else if (lastYear > 0) {
      lines.push({ id: cat.id, label: cat.name, icon: cat.icon, color: cat.color, amount: lastYear, basis: "anual",
        note: `pago em ${MONTHS_PT[Number(key.slice(5, 7)) - 1]} do ano passado` });
    }
  }

  lines.sort((a, b) => b.amount - a.amount);
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const spent = entries(s).filter((e) => monthKey(e.date) === key).reduce((a, e) => a + e.amount, 0);
  return { total, lines, months, spent, remaining: Math.max(0, total - spent), over: Math.max(0, spent - total),
    pct: total > 0 ? spent / total : 0, ready: total > 0 };
}
