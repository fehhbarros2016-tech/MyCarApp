"use client";

import { useMemo, useRef, useState } from "react";

// Gasto acumulado do mês (linha cheia) contra o mês anterior (tracejada) e o orçamento.
// Deslize o dedo sobre o gráfico para ver o valor de cada dia.
const W = 340, H = 168, L = 6, R = 6, T = 14, B = 22;

export function MonthChart({ cumulative, prev, budget, days, label, prevLabel }: {
  cumulative: (number | null)[]; prev: number[]; budget: number | null; days: number; label: string; prevLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const lastIdx = cumulative.reduce<number>((a, v, i) => (v != null ? i : a), -1);
  const max = Math.max(1, ...cumulative.map((v) => v ?? 0), ...prev, (budget ?? 0) * 1.02);
  const x = (i: number) => L + (i / Math.max(1, days - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);

  const { line, area, prevLine } = useMemo(() => {
    const pts = cumulative.map((v, i) => (v == null ? null : [x(i), y(v)] as const)).filter(Boolean) as (readonly [number, number])[];
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
    const area = pts.length ? `${line}L${pts[pts.length - 1][0].toFixed(1)},${H - B}L${pts[0][0].toFixed(1)},${H - B}Z` : "";
    const prevLine = prev.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    return { line, area, prevLine };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cumulative, prev, max, days]);

  const pick = (clientX: number) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const i = Math.round(((clientX - r.left) / r.width * W - L) / (W - L - R) * (days - 1));
    setHover(Math.max(0, Math.min(days - 1, i)));
  };
  const hi = hover ?? lastIdx;
  const cur = hi >= 0 ? cumulative[hi] : null;
  const pv = prev[hi] ?? null;
  const ticks = [1, Math.ceil(days / 2), days];

  return (
    <div className="mchart">
      <div className="mchart-read" aria-live="polite">
        <span className="dot" /> <b>Dia {hi + 1}</b>
        <span className="money num">{cur != null ? `R$ ${Math.round(cur).toLocaleString("pt-BR")}` : "—"}</span>
        {prev.length > 0 && <span className="muted">· {prevLabel} <span className="money num">R$ {Math.round(pv ?? prev[prev.length - 1] ?? 0).toLocaleString("pt-BR")}</span></span>}
      </div>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Gasto acumulado em ${label}`}
        onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); pick(e.clientX); }}
        onPointerMove={(e) => (e.buttons || e.pointerType === "mouse") && pick(e.clientX)}
        onPointerLeave={() => setHover(null)} onPointerUp={(e) => e.pointerType !== "mouse" && setTimeout(() => setHover(null), 1200)}>
        <defs>
          <linearGradient id="mc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={L} x2={W - R} y1={T + f * (H - T - B)} y2={T + f * (H - T - B)} stroke="rgba(200,255,215,.05)" />)}
        <line x1={L} x2={W - R} y1={H - B + 0.5} y2={H - B + 0.5} stroke="rgba(200,255,215,.12)" />
        {budget != null && budget > 0 && (
          <g className="mc-budget">
            <line x1={L} x2={W - R} y1={y(budget)} y2={y(budget)} />
            <text x={W - R} y={y(budget) - 5} textAnchor="end">orçamento</text>
          </g>
        )}
        {prevLine && <path d={prevLine} className="mc-prev" pathLength={1} />}
        {area && <path d={area} fill="url(#mc-fill)" className="mc-area" />}
        {line && <path d={line} className="mc-line" pathLength={1} />}
        {hi >= 0 && cur != null && (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={T} y2={H - B} stroke="rgba(236,243,238,.25)" strokeDasharray="2 3" />
            <circle cx={x(hi)} cy={y(cur)} r={5} fill="var(--bg)" stroke="var(--accent)" strokeWidth={2.5} className="mc-dot" />
          </g>
        )}
        {ticks.map((d) => <text key={d} x={x(d - 1)} y={H - 6} textAnchor={d === 1 ? "start" : d === days ? "end" : "middle"} className="mc-tick">{d}</text>)}
      </svg>
      <div className="mchart-legend"><span><i className="lg-cur" />{label}</span><span><i className="lg-prev" />{prevLabel}</span>{budget ? <span><i className="lg-bud" />Orçamento</span> : null}</div>
    </div>
  );
}
