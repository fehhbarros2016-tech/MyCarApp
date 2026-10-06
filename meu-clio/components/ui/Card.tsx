import Link from "next/link";
import s from "./ui.module.css";

export function Card({ title, action, children, className = "", style }: {
  title?: string; action?: { href: string; label: string }; children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <article className={`${s.card} ${className}`} style={style}>
      {title && (
        <header className={s.cardHead}>
          <h3>{title}</h3>
          {action && <Link href={action.href}>{action.label}</Link>}
        </header>
      )}
      {children}
    </article>
  );
}
