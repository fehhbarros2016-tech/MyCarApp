// Gráficos sem interação, desenhados no servidor e animados só com CSS.
import type { CSSProperties, ReactNode } from "react";
import { CatIcon } from "@/components/ui/kit";

export type Slice = { label: string; value: number; color: string };

export function Donut({ data, size = 168, stroke = 18, children }: { data: Slice[]; size?: number; stroke?: number; children?: ReactNode }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = (size - stroke) / 2;
  const gap = data.length > 1 ? 0.8 : 0;
  let acc = 0;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img"
        aria-label={data.map((d) => `${d.label} ${Math.round((d.value / (total || 1)) * 100)}%`).join(", ")}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={stroke} />
        {total > 0 && data.map((d, i) => {
          const len = (d.value / total) * 100;
          const seg = (
            <circle key={d.label} className="donut-seg" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
              pathLength={100} transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ "--len": Math.max(0, len - gap), "--off": -acc, "--d": `${i * 70}ms` } as CSSProperties} />
          );
          acc += len;
          return seg;
        })}
      </svg>
      <div className="donut-c">{children}</div>
    </div>
  );
}

export function CatBars({ data, total }: { data: { name: string; icon: string; color: string; value: number; count?: number }[]; total: number }) {
  return (
    <ul className="catbars">
      {data.map((d, i) => (
        <li key={d.name} className="rv" style={{ "--i": i } as CSSProperties}>
          <CatIcon icon={d.icon} color={d.color} size={30} />
          <div className="cb-main">
            <div className="cb-top"><b>{d.name}</b><span className="money num">R$ {Math.round(d.value).toLocaleString("pt-BR")}</span></div>
            <div className="cb-track"><i style={{ "--p": total ? d.value / total : 0, "--c": d.color, "--d": `${i * 60 + 100}ms` } as CSSProperties} /></div>
          </div>
          <span className="cb-pct num">{total ? Math.round((d.value / total) * 100) : 0}%</span>
        </li>
      ))}
    </ul>
  );
}

export function Trend({ points, unit, color = "var(--accent)", decimals = 2, height = 120 }: {
  points: { label: string; value: number }[]; unit: string; color?: string; decimals?: number; height?: number;
}) {
  const W = 320, H = height, P = 10;
  if (points.length < 2) return null;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.2 || hi * 0.05 || 1;
  const min = lo - pad, max = hi + pad;
  const x = (i: number) => P + (i / (points.length - 1)) * (W - 2 * P);
  const y = (v: number) => P + (1 - (v - min) / (max - min)) * (H - 2 * P - 14);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const last = points[points.length - 1];
  const f = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Tendência: último ${f(last.value)} ${unit}`}>
      <path d={d} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="trend-line" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4.5 : 2.5} fill={i === points.length - 1 ? color : "var(--bg)"} stroke={color} strokeWidth={1.6} />)}
      <text x={x(points.length - 1)} y={y(last.value) - 10} textAnchor="end" className="trend-val">{f(last.value)} {unit}</text>
      <text x={P} y={H - 2} className="trend-lbl">{points[0].label}</text>
      <text x={W - P} y={H - 2} textAnchor="end" className="trend-lbl">{last.label}</text>
    </svg>
  );
}

export function WeekBars({ data }: { data: { label: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const top = data.reduce((b, d) => (d.total > b.total ? d : b), data[0]);
  return (
    <div className="weekbars">
      {data.map((d, i) => (
        <div key={d.label} className="wb" data-top={d === top && d.total > 0}>
          <span className="wb-col"><i style={{ height: `${(d.total / max) * 100}%`, "--d": `${i * 50}ms` } as CSSProperties} /></span>
          <span className="wb-l">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
