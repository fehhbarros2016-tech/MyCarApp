"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ALL_ROUTES, TAB_ROUTES, isActive } from "./routes";
import s from "./nav.module.css";

export function Sidebar() {
  const path = usePathname();
  const sideActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className={s.side} aria-label="Navegação">
      <div className={s.brand}>
        <Image src="/icons/icon-192.png" alt="" width={28} height={28} />
        <b>MEU CLIO</b>
      </div>
      {ALL_ROUTES.map((r) => (
        <Link key={r.href} href={r.href} className={s.item} data-on={sideActive(r.href)} aria-current={sideActive(r.href) ? "page" : undefined}>
          <Icon name={r.icon} /> <span>{r.label}</span>
        </Link>
      ))}
      <div className={s.grow} />
      <Link href="/configuracoes" className={s.item} data-on={path.startsWith("/configuracoes")}>
        <Icon name="gear" /> <span>Configurações</span>
      </Link>
    </nav>
  );
}

export function TabBar() {
  const path = usePathname();
  return (
    <nav className={s.tabbar} aria-label="Navegação principal">
      {TAB_ROUTES.map((r) => {
        const on = isActive(r.href, path);
        return (
          <Link key={r.href} href={r.href} className={s.tab} data-on={on} aria-current={on ? "page" : undefined}>
            <Icon name={r.icon} size={21} />
            <span>{r.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
