"use client";

import { useState, type CSSProperties } from "react";

// Barras mensais empilhadas por grupo de custo. Toque numa barra para ver o mês.
export type MonthBar = { key: string; label: string; total: number; parts: { color: string; value: number; label: string }[] };

export function MonthBars({ data, initial }: { data: MonthBar[]; initial?: number }) {
  const [sel, setSel] = useState(initial ?? data.length - 1);
  const max = Math.max(1, ...data.map((d) => d.total));
  const avg = data.filter((d) => d.total > 0).reduce((a, d, _, arr) => a + d.total / arr.length, 0);
  const s = data[sel];
  return (
    <div className="mbars">
      <div className="mbars-read">
        <div><span className="eyebrow">{s?.label}</span><b className="money num">R$ {Math.round(s?.total ?? 0).toLocaleString("pt-BR")}</b></div>
        {avg > 0 && <div className="right"><span className="eyebrow">Média</span><b className="money num muted">R$ {Math.round(avg).toLocaleString("pt-BR")}</b></div>}
      </div>
      <div className="mbars-plot" role="listbox" aria-label="Meses">
        {avg > 0 && <div className="mbars-avg" style={{ bottom: `${(avg / max) * 100}%` }} />}
        {data.map((d, i) => (
          <button key={d.key} role="option" aria-selected={i === sel} data-on={i === sel} onClick={() => setSel(i)}
            style={{ "--d": `${i * 45}ms` } as CSSProperties} aria-label={`${d.label}: R$ ${Math.round(d.total)}`}>
            <span className="mb-col" style={{ height: `${Math.max(d.total ? 3 : 0, (d.total / max) * 100)}%` }}>
              {d.parts.filter((p) => p.value > 0).map((p) => (
                <i key={p.label} style={{ flexGrow: p.value, background: p.color }} />
              ))}
            </span>
            <span className="mb-l">{d.label}</span>
          </button>
        ))}
      </div>
      {s && s.parts.some((p) => p.value > 0) && (
        <div className="mbars-parts">
          {s.parts.filter((p) => p.value > 0).sort((a, b) => b.value - a.value).map((p) => (
            <span key={p.label}><i style={{ background: p.color }} />{p.label} <b className="money num">R$ {Math.round(p.value).toLocaleString("pt-BR")}</b></span>
          ))}
        </div>
      )}
    </div>
  );
}
