"use client";

import { useCallback, useRef, useState } from "react";
import s from "./gauge.module.css";

// Marcador em meia-lua como o do Clio: centro na direita, arco abrindo para a esquerda.
// Topo = cheio (I), base = reserva (R). Barras ímpares mais grossas. O ponteiro para em meia barra.
const CX = 202, CY = 165, R1 = 106, R2 = 140, RT = 152, RN = 92;
const VB_Y = -14, VB_H = 358;

type Props = {
  bars?: number;              // total de barras (Clio: 9)
  value: number;              // 0..bars, em passos de 0,5
  onChange?: (v: number) => void;
  base?: number;              // barras que já havia (destacadas mais fracas)
  label?: string;
  size?: "md" | "sm";
};

export function FuelGauge({ bars = 9, value, onChange, base, label = "Nível do tanque", size = "md" }: Props) {
  const step = 152 / (bars - 1);
  const ang = (v: number) => (v < 1 ? 88 - v * 12 : 76 - (v - 1) * step);
  const pt = (r: number, a: number) => [CX - r * Math.cos((a * Math.PI) / 180), CY + r * Math.sin((a * Math.PI) / 180)] as const;
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const interactive = Boolean(onChange);

  const set = useCallback((n: number) => {
    const v = Math.max(0, Math.min(bars, Math.round(n * 2) / 2));
    if (v !== value) { onChange?.(v); navigator.vibrate?.(6); }
  }, [bars, value, onChange]);

  const fromPointer = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const k = VB_H / r.height;
    const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k + VB_Y;
    let a = (Math.atan2(y - CY, CX - x) * 180) / Math.PI;
    if (x > CX) a = y < CY ? -90 : 90;
    const v = a > 76 ? (88 - a) / 12 : (76 - a) / step + 1;
    return Math.max(0, Math.min(bars, Math.round(v * 2) / 2));
  };

  const red = value <= 1.5;
  const color = (n: number) => {
    if (n - 0.5 === value) return red ? "rgba(255,90,78,.45)" : "rgba(110,240,149,.45)"; // meia barra
    if (n > value) return "rgba(255,255,255,.08)";
    if (red) return "var(--danger)";
    return base != null && n <= base ? "rgba(110,240,149,.38)" : "var(--accent)";
  };

  const [rx, ry] = pt(160, ang(1) + 7);
  const [ix, iy] = pt(160, ang(bars) - 7);
  const [hx, hy] = pt(166, ang((bars + 1) / 2));
  const [t1x, t1y] = pt(RT, -88), [t2x, t2y] = pt(RT, 88);

  return (
    <svg ref={svgRef} viewBox={`0 ${VB_Y} 236 ${VB_H}`} className={`${s.gauge} ${s[size]}`} data-dragging={dragging}
      data-interactive={interactive}
      role={interactive ? "slider" : "img"} tabIndex={interactive ? 0 : undefined} aria-label={label}
      aria-valuemin={interactive ? 0 : undefined} aria-valuemax={interactive ? bars : undefined}
      aria-valuenow={interactive ? value : undefined}
      aria-valuetext={`${String(value).replace(".", ",")} de ${bars} barras`}
      onPointerDown={interactive ? (e) => { svgRef.current?.setPointerCapture(e.pointerId); setDragging(true); set(fromPointer(e)); } : undefined}
      onPointerMove={interactive ? (e) => { if (dragging) set(fromPointer(e)); } : undefined}
      onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}
      onKeyDown={interactive ? (e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); set(value + 0.5); }
        if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); set(value - 0.5); }
      } : undefined}>
      <path d={`M ${t1x} ${t1y} A ${RT} ${RT} 0 0 0 ${t2x} ${t2y}`} fill="none" stroke="rgba(200,255,215,.08)" strokeWidth={2} strokeLinecap="round" />
      {Array.from({ length: bars }, (_, i) => {
        const n = i + 1, a = ang(n);
        const [x1, y1] = pt(R1, a), [x2, y2] = pt(R2, a);
        return <line key={n} className={s.bar} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={n % 2 ? 9 : 4.5} strokeLinecap="round" stroke={color(n)} />;
      })}
      <text className={`${s.lbl} ${s.r}`} x={rx} y={ry + 8} textAnchor="middle">R</text>
      <text className={s.lbl} x={ix} y={iy + 4} textAnchor="middle">I</text>
      <text className={s.half} x={hx} y={hy + 4} textAnchor="middle">½</text>
      <g transform={`translate(${CX - 28},${CY - 13}) scale(-.9,.9)`} fill="none" stroke="rgba(236,243,238,.35)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 26V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v22M0 26h17M5 6h7v6H5zM15 13h2.5a2 2 0 0 1 2 2v5a1.8 1.8 0 0 0 3.6 0V9l-3.5-3.5" />
      </g>
      <g className={s.needle} style={{ transform: `rotate(${-ang(value)}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
        <line x1={CX} y1={CY} x2={CX - RN} y2={CY} stroke="var(--fg)" strokeWidth={3} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={9} fill="#0b1912" stroke="rgba(236,243,238,.5)" strokeWidth={2} />
        {interactive && <circle className={s.knob} cx={CX - RT} cy={CY} r={11} fill={red ? "var(--danger)" : "var(--accent)"} stroke="var(--accent-ink)" strokeWidth={3} />}
      </g>
    </svg>
  );
}
