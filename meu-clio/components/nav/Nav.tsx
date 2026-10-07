"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";

type Route = { href: string; label: string; icon: string };

export const TABS: Route[] = [
  { href: "/", label: "Início", icon: "home" },
  { href: "/gastos", label: "Gastos", icon: "wallet" },
  { href: "/combustivel", label: "Tanque", icon: "fuel" },
  { href: "/relatorios", label: "Relatórios", icon: "chart" },
  { href: "/mais", label: "Mais", icon: "grid" },
];
const SIDE: Route[] = [
  { href: "/", label: "Início", icon: "home" },
  { href: "/gastos", label: "Gastos", icon: "wallet" },
  { href: "/combustivel", label: "Combustível", icon: "fuel" },
  { href: "/manutencao", label: "Manutenção", icon: "wrench" },
  { href: "/parcelas", label: "Parcelas", icon: "receipt" },
  { href: "/agenda", label: "Agenda", icon: "calendar" },
  { href: "/relatorios", label: "Relatórios", icon: "chart" },
];
const MORE = ["/mais", "/parcelas", "/manutencao", "/agenda", "/configuracoes"];

function tabIndex(path: string) {
  if (path === "/") return 0;
  if (path.startsWith("/gastos")) return 1;
  if (path.startsWith("/combustivel")) return 2;
  if (path.startsWith("/relatorios")) return 3;
  if (MORE.some((p) => path.startsWith(p))) return 4;
  return -1;
}

/** Barra inferior: toque, ou deslize o dedo sobre os ícones para trocar de aba (o indicador acompanha). */
export function TabBar({ alerts = 0 }: { alerts?: number }) {
  const path = usePathname();
  const router = useRouter();
  const active = tabIndex(path);
  const [pending, setPending] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const bar = useRef<HTMLElement>(null);
  const g = useRef<{ x: number; start: number; moved: boolean } | null>(null);

  useEffect(() => { TABS.forEach((t) => router.prefetch(t.href)); }, [router]);
  useEffect(() => { setPending(null); }, [path]);

  const idxAt = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    const pad = 6;
    const w = (r.width - pad * 2) / TABS.length;
    return Math.max(0, Math.min(TABS.length - 1, Math.floor((clientX - r.left - pad) / w)));
  };
  const go = (i: number) => {
    if (i === active && pending == null) { if (i === 0) window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setPending(i);
    router.push(TABS[i].href);
  };

  const shown = hover ?? pending ?? active;
  return (
    <nav ref={bar} className="tabbar" aria-label="Navegação principal" data-drag={hover != null}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        bar.current?.setPointerCapture(e.pointerId);
        const i = idxAt(e.clientX);
        g.current = { x: e.clientX, start: i, moved: false };
        setHover(i);
      }}
      onPointerMove={(e) => {
        if (!g.current) return;
        if (Math.abs(e.clientX - g.current.x) > 6) g.current.moved = true;
        const i = idxAt(e.clientX);
        if (i !== hover) { setHover(i); navigator.vibrate?.(4); }
      }}
      onPointerUp={(e) => {
        if (!g.current) return;
        let i = idxAt(e.clientX);
        const dx = e.clientX - g.current.x;
        // deslize curto dentro do mesmo ícone: vai para a aba vizinha
        if (i === g.current.start && g.current.moved && Math.abs(dx) > 22) i = Math.max(0, Math.min(TABS.length - 1, i + (dx > 0 ? 1 : -1)));
        g.current = null;
        setHover(null);
        go(i);
      }}
      onPointerCancel={() => { g.current = null; setHover(null); }}>
      <span className="tab-pill" style={{ "--i": shown < 0 ? 0 : shown, opacity: shown < 0 ? 0 : 1 } as CSSProperties} aria-hidden />
      {TABS.map((t, i) => (
        <a key={t.href} href={t.href} className="tab" data-on={shown === i} aria-current={active === i ? "page" : undefined}
          onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(i); } }}>
          <span className="tab-ic">
            <Icon name={t.icon} size={22} />
            {t.href === "/" && alerts > 0 && <i className="tab-badge">{alerts}</i>}
          </span>
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  );
}

export function Sidebar({ name }: { name: string | null }) {
  const path = usePathname();
  const on = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="side" aria-label="Navegação">
      <div className="brand">
        <Image src="/icons/icon-192.png" alt="" width={30} height={30} />
        <b>MEU CLIO</b>
      </div>
      {SIDE.map((r) => (
        <Link key={r.href} href={r.href} className="side-item" data-on={on(r.href)} aria-current={on(r.href) ? "page" : undefined}>
          <Icon name={r.icon} size={19} /> <span>{r.label}</span>
        </Link>
      ))}
      <div className="grow" />
      <Link href="/configuracoes" className="side-item" data-on={path.startsWith("/configuracoes")}>
        <Icon name="gear" size={19} /> <span>Configurações</span>
      </Link>
      {name && <p className="side-user"><Icon name="user" size={15} /> {name}</p>}
    </nav>
  );
}
