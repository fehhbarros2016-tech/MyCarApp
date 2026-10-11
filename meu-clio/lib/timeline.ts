// Linha do tempo do carro: tudo que aconteceu com ele, em ordem.
import { brl, intf } from "@/lib/format";
import { SYS_LABEL } from "@/lib/constants";
import { FINE_LABEL } from "@/lib/money";
import { TIRE_KIND_LABEL } from "@/lib/tires";
import type { Store } from "@/lib/store";

export type TimelineKind = "compra" | "km" | "manutencao" | "peca" | "pneu" | "problema" | "multa" | "viagem" | "documento" | "combustivel";
export type TimelineItem = { id: string; date: string; kind: TimelineKind; icon: string; color: string; title: string; detail: string; amount: number | null; href?: string };

export const TIMELINE_KINDS: { v: TimelineKind; l: string }[] = [
  { v: "manutencao", l: "Manutenção" }, { v: "peca", l: "Peças" }, { v: "pneu", l: "Pneus" }, { v: "problema", l: "Problemas" },
  { v: "documento", l: "Documentos" }, { v: "viagem", l: "Viagens" }, { v: "multa", l: "Multas" }, { v: "km", l: "Marcos de km" }, { v: "combustivel", l: "Abastecimentos" },
];

export function timeline(s: Store, opts: { includeFuel?: boolean } = {}): TimelineItem[] {
  const out: TimelineItem[] = [];
  const v = s.vehicle;
  const cat = (id: string) => s.catById.get(id);
  if (v.purchaseDate) out.push({ id: "compra", date: v.purchaseDate, kind: "compra", icon: "star", color: "#6ef095", title: `Chegada do ${v.name}`,
    detail: [v.initialKm != null ? `${intf(v.initialKm)} km no painel` : null, v.purchasePrice ? `valor ${brl(v.purchasePrice)}` : null].filter(Boolean).join(" · ") || "início da história", amount: null });

  // marcos de 10.000 km: a primeira leitura que passou de cada marco
  const odo = [...s.odometer].filter((o) => !o.date.startsWith("1900")).sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km);
  if (odo.length >= 2) {
    const start = Math.ceil((odo[0].km + 1) / 10000) * 10000;
    for (let mk = start; mk <= odo[odo.length - 1].km; mk += 10000) {
      const hit = odo.find((o) => o.km >= mk);
      if (hit) out.push({ id: `km-${mk}`, date: hit.date, kind: "km", icon: "flag", color: "#7aa7ff", title: `${intf(mk)} km`, detail: "marco do hodômetro", amount: null });
    }
  }
  for (const e of s.expenses) {
    const c = cat(e.categoryId);
    if (e.maint) out.push({ id: e.id, date: e.date, kind: "manutencao", icon: "wrench", color: "#5cd6ff", title: e.maint.service,
      detail: [SYS_LABEL[e.maint.system], e.km != null ? `${intf(e.km)} km` : null, e.vendor].filter(Boolean).join(" · "), amount: e.amount, href: "/manutencao" });
    else if (c && ["seguro", "ipva", "licenciamento", "documentacao"].includes(c.slug)) out.push({ id: e.id, date: e.date, kind: "documento", icon: c.icon, color: c.color,
      title: e.note ? `${c.name}: ${e.note}` : c.name, detail: e.vendor ?? "documentação", amount: e.amount, href: "/gastos" });
    else if (e.fuel && opts.includeFuel) out.push({ id: e.id, date: e.date, kind: "combustivel", icon: "fuel", color: "#6ef095",
      title: `${e.fuel.liters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L de ${e.fuel.fuelType}`, detail: [e.km != null ? `${intf(e.km)} km` : null, e.vendor].filter(Boolean).join(" · "), amount: e.amount });
  }
  for (const p of s.parts) {
    out.push({ id: `p-${p.id}`, date: p.installedOn, kind: "peca", icon: "box", color: "#9fb4ff", title: `${p.name} instalada`,
      detail: [p.brand, p.installedKm != null ? `${intf(p.installedKm)} km` : null].filter(Boolean).join(" · ") || SYS_LABEL[p.system], amount: p.expenseId ? null : p.price, href: "/manutencao?t=pecas" });
  }
  for (const t of s.tires) {
    if (t.kind === "calibragem") continue;
    out.push({ id: `t-${t.id}`, date: t.date, kind: "pneu", icon: "tire", color: "#9aa8c7", title: TIRE_KIND_LABEL[t.kind],
      detail: [t.brand, t.positions, t.km != null ? `${intf(t.km)} km` : null].filter(Boolean).join(" · "), amount: t.expenseId ? null : t.cost, href: "/manutencao?t=pneus" });
  }
  for (const i of s.issues) {
    out.push({ id: `i-${i.id}`, date: i.noticedOn, kind: "problema", icon: "alert", color: "#ff8a5c", title: i.title, detail: i.resolvedOn ? "problema percebido · resolvido depois" : "problema em aberto", amount: null, href: "/manutencao?t=problemas" });
    if (i.resolvedOn) out.push({ id: `ir-${i.id}`, date: i.resolvedOn, kind: "problema", icon: "check", color: "#79e0a8", title: `Resolvido: ${i.title}`, detail: i.resolution ?? "", amount: null, href: "/manutencao?t=problemas" });
  }
  for (const f of s.fines) {
    if (f.status === "cancelada") continue;
    out.push({ id: `f-${f.id}`, date: f.occurredOn ?? f.dueDate ?? "", kind: "multa", icon: "alert", color: "#ff5a4e", title: `Multa: ${f.description}`, detail: `${FINE_LABEL[f.severity]} · ${f.points} pontos`, amount: f.amount, href: "/multas" });
  }
  for (const t of s.trips) {
    out.push({ id: `v-${t.id}`, date: t.startDate, kind: "viagem", icon: "map", color: "#b49cff", title: t.name, detail: t.endDate ? "viagem" : "viagem em andamento", amount: null, href: `/viagens/${t.id}` });
  }
  const paid = s.installments.filter((i) => i.paidAt);
  if (s.installments.length && paid.length === s.installments.length) {
    const last = paid.reduce((a, i) => (i.paidAt! > a.paidAt! ? i : a));
    out.push({ id: "quitado", date: last.paidAt!, kind: "compra", icon: "checkCircle", color: "#6ef095", title: "Carro quitado!", detail: `${s.installments.length} parcelas pagas`, amount: null, href: "/parcelas" });
  }
  return out.filter((x) => x.date).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
