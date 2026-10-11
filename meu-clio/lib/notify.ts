// O que vira notificação no celular. Função pura: recebe o Store e o dia e devolve as mensagens.
// Cada mensagem tem uma chave única: a mesma chave nunca é enviada duas vezes (registro em push_log).
import { forecast, fuelStats, installmentsSummary, monthOverview, upcoming } from "@/lib/calc";
import { addMonths, brl, currentMonth, daysUntil, monthLong, todayISO } from "@/lib/format";
import { kmStats } from "@/lib/km";
import { categoryBudgets } from "@/lib/money";
import { tireStatus } from "@/lib/tires";
import type { NotifyType } from "@/lib/settings";
import type { Store } from "@/lib/store";

export type Notice = { key: string; type: NotifyType; title: string; body: string; url: string };

const km = (n: number) => `${Math.abs(Math.round(n)).toLocaleString("pt-BR")} km`;

export function buildNotices(s: Store, today = todayISO()): Notice[] {
  const out: Notice[] = [];
  const st = s.settings;
  const k = kmStats(s);
  const car = s.vehicle.name;

  // vencimentos e manutenção pelo mesmo cálculo da agenda
  for (const u of upcoming(s)) {
    if (u.tone === "ok") continue;
    const type: NotifyType = u.source === "plano" || u.source === "oleo" || u.source === "pneu" || u.kind === "oleo" || u.kind === "revisao" || u.kind === "manutencao" || u.kind === "pneus" ? "manutencao" : "vencimentos";
    let stage: string, body: string;
    if (u.days != null && (u.kmLeft == null || u.days <= (u.kmLeft / Math.max(1, k.perDay ?? 40)))) {
      stage = u.days < 0 ? "atrasado" : u.days === 0 ? "hoje" : "aviso";
      body = u.days < 0 ? `Venceu há ${-u.days} ${-u.days === 1 ? "dia" : "dias"}.` : u.days === 0 ? "Vence hoje." : `Vence em ${u.days} ${u.days === 1 ? "dia" : "dias"}.`;
    } else if (u.kmLeft != null) {
      stage = u.kmLeft < 0 ? "km-passou" : "km-perto";
      body = u.kmLeft < 0 ? `Passou ${km(u.kmLeft)} do previsto.` : `Faltam ${km(u.kmLeft)}.`;
    } else continue;
    const ref = u.dueDate ?? (u.dueKm != null ? String(u.dueKm) : "");
    out.push({ key: `${u.id}:${ref}:${stage}`, type, title: u.title, body: `${body}${u.detail && u.source !== "plano" ? ` ${u.detail}` : ""}`.trim(), url: u.href });
  }

  // parcela atrasada (uma vez por parcela)
  for (const i of installmentsSummary(s).overdue) {
    out.push({ key: `parcela-atraso:${i.id}`, type: "vencimentos", title: `Parcela ${i.number} atrasada`, body: `${brl(i.amount)} venceu em ${i.dueDate.split("-").reverse().join("/")}.`, url: "/parcelas" });
  }

  // calibragem (uma vez por ciclo)
  const t = tireStatus(s, k, today);
  if (t.pressure.daysLeft != null && t.pressure.daysLeft <= 0 && t.pressure.lastDate) {
    out.push({ key: `calibragem:${t.pressure.lastDate}`, type: "manutencao", title: "Hora de calibrar os pneus", body: `A última calibragem do ${car} foi em ${t.pressure.lastDate.split("-").reverse().join("/")}.`, url: "/manutencao?t=pneus" });
  }

  // orçamento e consumo
  const m = monthOverview(s);
  const key = currentMonth();
  if (m.budget && m.budgetPct != null) {
    if (m.budgetPct >= 1) out.push({ key: `orc:${key}:100`, type: "orcamento", title: "Orçamento do mês estourado", body: `${brl(m.total)} de ${brl(m.budget)}.`, url: "/" });
    else if (m.budgetPct * 100 >= st.budgetAlertPct) out.push({ key: `orc:${key}:alerta`, type: "orcamento", title: `${Math.round(m.budgetPct * 100)}% do orçamento usado`, body: `Restam ${brl(m.budget - m.total)} para ${monthLong(key)}.`, url: "/" });
  }
  for (const b of categoryBudgets(s)) {
    if (b.tone === "danger") out.push({ key: `orc-cat:${key}:${b.cat.id}`, type: "orcamento", title: `${b.cat.name}: limite estourado`, body: `${brl(b.spent)} de ${brl(b.budget)} no mês.`, url: "/planejamento" });
  }
  const f = fuelStats(s);
  if (st.consumptionAlert && f.drop && f.drop.pct * 100 >= st.consumptionDropPct) {
    out.push({ key: `consumo:${f.drop.toKm}`, type: "orcamento", title: `Consumo caiu ${Math.round(f.drop.pct * 100)}%`, body: "Pode ser calibragem, filtro de ar ou velas. Vale conferir.", url: "/combustivel" });
  }

  // resumo do mês no dia 1º
  if (today.slice(8, 10) === "01") {
    const prev = addMonths(key, -1);
    const pm = monthOverview(s, prev);
    if (pm.count > 0) {
      const fc = forecast(s);
      out.push({ key: `resumo:${prev}`, type: "resumo", title: `Seu resumo de ${monthLong(prev)}`, body: `${brl(pm.total)} em ${pm.count} lançamentos.${fc.ready ? ` Previsto para este mês: ${brl(fc.total)}.` : ""}`, url: `/resumo/${prev}` });
    }
  }
  return out.filter((n) => st.notify[n.type]);
}

/** Junta muitas notificações num resumo para não lotar a tela de bloqueio. */
export function bundle(list: Notice[], max = 3): Notice[] {
  if (list.length <= max) return list;
  const head = list.slice(0, max - 1);
  const rest = list.slice(max - 1);
  return [...head, { key: rest.map((r) => r.key).join("|"), type: rest[0].type, title: `Mais ${rest.length} avisos`, body: rest.map((r) => r.title).join(" · ").slice(0, 160), url: "/" }];
}

export const daysAgo = (iso: string, today = todayISO()) => -daysUntil(iso, today);
