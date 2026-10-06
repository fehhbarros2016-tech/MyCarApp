import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import s from "../configuracoes/settings.module.css";

export const metadata: Metadata = { title: "Mais" };

const links: { href: string; label: string; sub: string; icon: IconName }[] = [
  { href: "/parcelas", label: "Parcelas", sub: "Compra, entrada e quanto falta", icon: "receipt" },
  { href: "/combustivel", label: "Combustível", sub: "Abastecimentos e consumo", icon: "fuel" },
  { href: "/agenda", label: "Agenda", sub: "Vencimentos e lembretes", icon: "calendar" },
  { href: "/configuracoes", label: "Configurações", sub: "Geral, aparência e avançado", icon: "gear" },
];

export default function MorePage() {
  return (
    <>
      <PageHeader title="Mais" />
      <div className={`${s.list} rv`} style={{ "--i": 1 } as React.CSSProperties}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={s.item}>
            <span className={s.ic}><Icon name={l.icon} size={17} /></span>
            <span className={s.tx}><b>{l.label}</b><span>{l.sub}</span></span>
            <Icon name="chevron" size={14} className={s.chev} />
          </Link>
        ))}
      </div>
    </>
  );
}
