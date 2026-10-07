// Peças visuais sem estado (podem ser usadas no servidor e no cliente).
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";
import { money } from "@/lib/format";

export const v = (i: number) => ({ "--i": i } as CSSProperties);

export function PageHeader({ title, sub, back, action }: { title: string; sub?: string; back?: string; action?: ReactNode }) {
  return (
    <header className="ph rv">
      <div className="ph-row">
        {back && <Link href={back} className="icon-btn" aria-label="Voltar"><Icon name="back" size={18} /></Link>}
        <h1>{title}</h1>
        {action && <div className="ph-action">{action}</div>}
      </div>
      {sub && <p>{sub}</p>}
    </header>
  );
}

export function Card({ title, action, children, className = "", style, tone }: {
  title?: ReactNode; action?: { href: string; label: string }; children: ReactNode; className?: string; style?: CSSProperties; tone?: string;
}) {
  return (
    <section className={`card ${className}`} style={style} data-tone={tone}>
      {title && (
        <header className="card-h">
          <h3>{title}</h3>
          {action && <Link href={action.href} prefetch>{action.label}</Link>}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ icon, text, cta, children }: { icon: string; text: string; cta?: { href: string; label: string }; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-ic"><Icon name={icon} size={18} /></span>
      <p>{text}</p>
      {cta && <Link className="btn-ghost" href={cta.href}><Icon name="plus" size={16} />{cta.label}</Link>}
      {children}
    </div>
  );
}

export function CatIcon({ icon, color, size = 34 }: { icon: string; color: string; size?: number }) {
  return (
    <span className="cat-ic" style={{ "--c": color, width: size, height: size } as CSSProperties}>
      <Icon name={icon} size={Math.round(size * 0.52)} />
    </span>
  );
}

/** Valor em reais. A classe .money permite borrar os valores no modo privado. */
export function Money({ value, cents = false, className = "", sign = false }: { value: number; cents?: boolean; className?: string; sign?: boolean }) {
  const s = sign && value > 0 ? "+" : value < 0 ? "−" : "";
  return <span className={`money num ${className}`}>{s}R$&nbsp;{money(Math.abs(value), cents)}</span>;
}

export function Delta({ value, invert = true }: { value: number | null; invert?: boolean }) {
  if (value == null || !Number.isFinite(value)) return null;
  const up = value > 0;
  const good = invert ? !up : up;
  return (
    <span className="delta" data-good={good} data-zero={Math.abs(value) < 0.005}>
      <Icon name={up ? "trend" : "trendDown"} size={13} />
      {Math.abs(value * 100).toFixed(0)}%
    </span>
  );
}

export function Bar({ value, color, label }: { value: number; color?: string; label?: string }) {
  const p = Math.max(0, Math.min(1, value));
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
      <i style={{ "--p": p, ...(color ? { "--c": color } : {}) } as CSSProperties} />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color, children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const p = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={stroke} />
        <circle className="ring-p" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color ?? "var(--accent)"} strokeWidth={stroke}
          strokeLinecap="round" pathLength={100} style={{ "--p": p * 100 } as CSSProperties} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-c">{children}</div>
    </div>
  );
}

export function Pill({ tone = "ok", children }: { tone?: "ok" | "warn" | "danger" | "info" | "muted"; children: ReactNode }) {
  return <span className="pill" data-tone={tone}>{children}</span>;
}
