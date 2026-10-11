"use client";

import { useMemo, useState } from "react";
import { simulatePayoff } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";

const R = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const my = (iso: string | null) => (iso ? `${MONTHS[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}` : "—");

/** Simulador de quitação antecipada: arraste para escolher quantas parcelas adiantar. */
export function PayoffSim({ pending, rate, source, today }: {
  pending: { amount: number; dueDate: string }[]; rate: number | null; source: string; today: string;
}) {
  const [count, setCount] = useState(Math.min(6, pending.length));
  const [manual, setManual] = useState(rate != null ? (rate * 100).toFixed(2).replace(".", ",") : "");
  const r = useMemo(() => { if (!manual.trim()) return rate ?? 0; const n = Number(manual.replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n / 100 : rate ?? 0; }, [manual, rate]);
  const sim = useMemo(() => simulatePayoff(pending, r, count, today), [pending, r, count, today]);
  const all = useMemo(() => simulatePayoff(pending, r, pending.length, today), [pending, r, today]);
  if (!pending.length) return null;
  return (
    <div className="payoff">
      <div className="payoff-top">
        <div><span className="eyebrow">Adiantar</span><b className="num">{sim.count} {sim.count === 1 ? "parcela" : "parcelas"}</b></div>
        <div className="payoff-rate">
          <span className="eyebrow">Juros ao mês</span>
          <div className="inp-suf"><input className="inp" inputMode="decimal" value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Juros ao mês" placeholder="0" /><em>%</em></div>
        </div>
      </div>
      <input type="range" className="range" min={1} max={pending.length} value={count} onChange={(e) => setCount(Number(e.target.value))} aria-label="Quantas parcelas adiantar" />
      <div className="payoff-res">
        <div><span>Paga hoje</span><b className="money num">{R(sim.payNow)}</b><small>em vez de {R(sim.nominal)}</small></div>
        <div data-good><span>Economia</span><b className="money num">{R(sim.saving)}</b><small>{sim.nominal ? `${Math.round((sim.saving / sim.nominal) * 100)}% a menos` : ""}</small></div>
        <div><span>Quita em</span><b className="num">{my(sim.newEnd)}</b><small>antes: {my(sim.oldEnd)}</small></div>
      </div>
      <p className="muted-s"><Icon name="info" size={13} /> Quitar tudo hoje: <b className="money">{R(all.payNow)}</b> (economia de <span className="money">{R(all.saving)}</span>).
        {" "}{source === "calculada" ? "Juros calculados pelo valor do carro, entrada e parcelas." : source === "sem dados" ? "Informe os juros do contrato para uma conta mais real." : ""} O banco pode cobrar IOF e taxas; confirme o valor com ele.</p>
    </div>
  );
}
