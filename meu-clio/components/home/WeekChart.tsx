import type { DayPoint } from "@/lib/data/home";
import s from "./home.module.css";

// Barras em SVG próprio: escala única para barras e rótulos; animação só em CSS.
export function WeekChart({ data }: { data: DayPoint[] }) {
  const W = 320, top = 20, base = 104, bw = 26;
  const gap = (W - bw * data.length) / (data.length - 1);
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <svg className={s.chart} viewBox={`0 0 ${W} 130`} role="img"
      aria-label={`Gastos por dia: ${data.map((d) => `${d.label} R$ ${d.amount}`).join(", ")}`}>
      <defs>
        <linearGradient id="wk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6ef095" />
          <stop offset="1" stopColor="#6ef095" stopOpacity=".25" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={base + 0.5} y2={base + 0.5} stroke="rgba(200,255,215,.1)" />
      {data.map((d, i) => {
        const x = i * (bw + gap);
        const h = d.amount ? Math.max(6, (d.amount / max) * (base - top)) : 0;
        const last = i === data.length - 1;
        return (
          <g key={d.day}>
            {h ? (
              <>
                <rect className={s.barRect} x={x} y={base - h} width={bw} height={h} rx={7} fill="url(#wk)"
                  style={{ animationDelay: `${150 + i * 70}ms` }} />
                <text className={s.val} x={x + bw / 2} y={base - h - 6} textAnchor="middle">
                  {Math.round(d.amount).toLocaleString("pt-BR")}
                </text>
              </>
            ) : (
              <rect x={x} y={base - 3} width={bw} height={3} rx={1.5} fill="rgba(255,255,255,.06)" />
            )}
            <text className={s.lbl} x={x + bw / 2} y={base + 18} textAnchor="middle" data-today={last || undefined}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
