// Plano de revisão: cada item tem um intervalo (km e/ou meses) e sabe quando foi feito pela última vez.
// "Última vez" vem do próprio item (informado à mão ou ao registrar a manutenção pelo plano) ou de um
// gasto já registrado que combine com ele (mesma categoria ou o nome do serviço). Nada é duplicado.
import { addMonths, daysUntil, todayISO } from "@/lib/format";
import { daysToKm, kmStats, type KmStats } from "@/lib/km";
import { norm } from "@/lib/text";
import type { PlanItem, Store } from "@/lib/store";

export type PlanTemplate = { name: string; system: string; km?: number; months?: number; slug?: string; keyword?: string; note?: string };

/** Plano sugerido para um carro flex 1.0–1.6 (ex.: Clio). Tudo é editável depois. */
export const PLAN_TEMPLATE: PlanTemplate[] = [
  { name: "Óleo do motor e filtro", system: "motor", km: 10000, months: 12, slug: "oleo", keyword: "oleo" },
  { name: "Filtro de ar do motor", system: "motor", km: 10000, months: 12, keyword: "filtro de ar" },
  { name: "Filtro de combustível", system: "injecao", km: 10000, months: 12, keyword: "filtro de combustivel" },
  { name: "Filtro de cabine (ar-condicionado)", system: "outros", km: 10000, months: 12, keyword: "filtro de cabine" },
  { name: "Alinhamento e balanceamento", system: "pneus", km: 10000, months: 12, slug: "alinhamento", keyword: "alinhamento" },
  { name: "Velas de ignição", system: "motor", km: 20000, months: 24, keyword: "vela" },
  { name: "Pastilhas de freio (verificar)", system: "freios", km: 20000, months: 24, keyword: "pastilha" },
  { name: "Fluido de freio", system: "freios", months: 24, keyword: "fluido de freio" },
  { name: "Líquido de arrefecimento", system: "arrefecimento", km: 40000, months: 24, keyword: "arrefecimento" },
  { name: "Correia dentada e tensor", system: "motor", km: 50000, months: 48, keyword: "correia dentada", note: "Confira o intervalo no manual do seu motor." },
  { name: "Bateria (verificar)", system: "eletrica", months: 24, keyword: "bateria" },
  { name: "Palhetas do limpador", system: "outros", months: 12, keyword: "palheta" },
  { name: "Revisão geral", system: "outros", km: 10000, months: 12, slug: "revisao", keyword: "revisao" },
];

export type PlanStatus = {
  item: PlanItem;
  lastKm: number | null;
  lastDate: string | null;
  dueKm: number | null;
  dueDate: string | null;
  kmLeft: number | null;
  daysLeft: number | null;
  etaDays: number | null;      // quando deve vencer, considerando o ritmo de uso
  pct: number;                 // quanto do intervalo já passou (pode passar de 1)
  tone: "danger" | "warn" | "ok" | "info";
  known: boolean;              // false = nunca registrado
};

const addMonthsISO = (iso: string, months: number) => {
  const target = addMonths(iso.slice(0, 7), months);
  const [y, m] = target.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${target}-${String(Math.min(Number(iso.slice(8, 10)), last)).padStart(2, "0")}`;
};

/** Gastos que contam como "feito" para este item. */
function matches(s: Store, item: PlanItem) {
  const kw = item.keyword ? norm(item.keyword) : null;
  return s.expenses.filter((e) => {
    if (e.maint?.planId === item.id) return true;
    const cat = s.catById.get(e.categoryId);
    if (item.categorySlug && cat?.slug === item.categorySlug) return true;
    if (kw && e.maint && norm(e.maint.service).includes(kw)) return true;
    return false;
  });
}

export function planStatus(s: Store, item: PlanItem, k: KmStats = kmStats(s), today = todayISO()): PlanStatus {
  let lastDate = item.lastDate;
  let lastKm = item.lastKm;
  for (const e of matches(s, item)) {
    if (!lastDate || e.date > lastDate) { lastDate = e.date; lastKm = e.km ?? lastKm; }
    else if (e.date === lastDate && e.km != null && (lastKm == null || e.km > lastKm)) lastKm = e.km;
  }
  const known = lastDate != null || lastKm != null;
  const dueKm = item.intervalKm && lastKm != null ? lastKm + item.intervalKm : null;
  const dueDate = item.intervalMonths && lastDate ? addMonthsISO(lastDate, item.intervalMonths) : null;
  const kmLeft = dueKm != null && k.last != null ? dueKm - k.last : null;
  const daysLeft = dueDate ? daysUntil(dueDate, today) : null;
  const etaKm = dueKm != null ? daysToKm(k, dueKm) : null;
  const etaDays = [daysLeft, etaKm].filter((x): x is number => x != null).reduce<number | null>((a, b) => (a == null ? b : Math.min(a, b)), null);

  const pk = item.intervalKm && kmLeft != null ? 1 - kmLeft / item.intervalKm : 0;
  const pd = item.intervalMonths && daysLeft != null ? 1 - daysLeft / (item.intervalMonths * 30.4) : 0;
  const pct = Math.max(0, pk, pd);
  const warnKm = item.intervalKm ? Math.max(500, item.intervalKm * 0.1) : 0;
  const tone: PlanStatus["tone"] = !known ? "info"
    : (kmLeft != null && kmLeft < 0) || (daysLeft != null && daysLeft < 0) ? "danger"
    : (kmLeft != null && kmLeft <= warnKm) || (daysLeft != null && daysLeft <= 30) ? "warn" : "ok";
  return { item, lastKm, lastDate, dueKm, dueDate, kmLeft, daysLeft, etaDays, pct, tone, known };
}

export function planStatuses(s: Store, k: KmStats = kmStats(s)): PlanStatus[] {
  const rank = { danger: 0, warn: 1, ok: 2, info: 3 } as const;
  return s.plan.map((p) => planStatus(s, p, k))
    .sort((a, b) => rank[a.tone] - rank[b.tone] || (a.etaDays ?? 1e9) - (b.etaDays ?? 1e9) || a.item.sort - b.item.sort);
}

/** Item do plano que representa a troca de óleo (se houver). */
export const oilPlanItem = (s: Store) =>
  s.plan.find((p) => p.categorySlug === "oleo") ?? s.plan.find((p) => p.keyword && norm(p.keyword) === "oleo") ?? null;
