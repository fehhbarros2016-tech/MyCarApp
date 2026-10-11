// Bloco "Previsto para o mês", logo abaixo do gasto atual.
import type { CSSProperties } from "react";
import type { Forecast } from "@/lib/calc";
import { brl } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { CatIcon } from "@/components/ui/kit";

const BASIS: Record<string, string> = { parcela: "certo", media: "média", anual: "anual", lembrete: "lembrete" };

export function ForecastBlock({ f, monthsSetting }: { f: Forecast; monthsSetting: number }) {
  if (!f.ready) {
    return (
      <div className="fc fc-empty">
        <Icon name="sparkle" size={16} />
        <p>O <b>gasto previsto</b> aparece quando houver parcelas no mês ou pelo menos um mês completo de gastos. Ele usa a média dos últimos {monthsSetting} meses.</p>
      </div>
    );
  }
  const state = f.over > 0 ? "over" : f.pct >= 0.9 ? "near" : "ok";
  return (
    <details className="fc" data-state={state}>
      <summary>
        <div className="fc-top">
          <div>
            <span className="eyebrow">Previsto para o mês</span>
            <b className="fc-total money num">{brl(f.total)}</b>
          </div>
          <div className="fc-side">
            {f.over > 0
              ? <span className="fc-left over"><Icon name="alert" size={14} /> <span className="money">{brl(f.over)}</span> acima</span>
              : <span className="fc-left">faltam <b className="money">{brl(f.remaining)}</b></span>}
            <span className="fc-more">detalhes <Icon name="down" size={14} /></span>
          </div>
        </div>
        <div className="fc-bar" aria-label={`${Math.round(f.pct * 100)}% do previsto já gasto`}>
          <i style={{ "--p": Math.min(1, f.pct) } as CSSProperties} />
          {f.pct > 0 && f.pct < 1 && <em style={{ left: `${f.pct * 100}%` }} className="num">{Math.round(f.pct * 100)}%</em>}
        </div>
      </summary>
      <ul className="fc-lines">
        {f.lines.map((l) => (
          <li key={l.id}>
            <CatIcon icon={l.icon} color={l.color} size={30} />
            <span className="fc-t"><b>{l.label}</b><span>{l.note}</span></span>
            <span className="fc-tag" data-b={l.basis}>{BASIS[l.basis]}</span>
            <span className="money num fc-v">{brl(l.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="fc-how">
        Parcelas pelo valor exato · gastos do dia a dia pela média {f.months ? `dos últimos ${f.months} ${f.months === 1 ? "mês" : "meses"}` : "(ainda sem mês completo)"} · seguro, IPVA e licenciamento só no mês em que vencem.
      </p>
    </details>
  );
}
