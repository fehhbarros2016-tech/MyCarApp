import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader, v } from "@/components/ui/kit";
import { installmentsSummary, oilStatus, upcoming } from "@/lib/calc";
import { intf } from "@/lib/format";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Mais" };
export const dynamic = "force-dynamic";

export default async function MorePage() {
  const s = await getStore();
  const inst = s ? installmentsSummary(s) : null;
  const up = s ? upcoming(s) : [];
  const oil = s ? oilStatus(s) : null;
  const custom = s ? s.categories.filter((c) => c.custom).length : 0;
  const items = [
    { href: "/parcelas", icon: "receipt", color: "#8fb8ff", label: "Parcelas", sub: inst?.total ? `${inst.paid} de ${inst.total} pagas` : "Cadastrar compra" },
    { href: "/manutencao", icon: "wrench", color: "#5cd6ff", label: "Manutenção", sub: oil?.leftKm != null ? `óleo em ${intf(Math.max(0, oil.leftKm))} km` : "Serviços e peças" },
    { href: "/agenda", icon: "calendar", color: "#ffc35a", label: "Agenda", sub: up.length ? `${up.length} pendentes` : "Lembretes" },
    { href: "/combustivel", icon: "fuel", color: "#6ef095", label: "Combustível", sub: "Tanque e consumo" },
    { href: "/relatorios", icon: "chart", color: "#b49cff", label: "Relatórios", sub: "Gráficos e análises" },
    { href: "/configuracoes/categorias", icon: "tag", color: "#ff8fd1", label: "Categorias", sub: `${s?.categories.filter((c) => !c.archived).length ?? 0} ativas${custom ? ` · ${custom} suas` : ""}` },
  ];
  return (
    <>
      <PageHeader title="Mais" />
      <div className="more-grid">
        {items.map((i, n) => (
          <Link key={i.href} href={i.href} className="more-item rv" style={{ ...v(n + 1), "--c": i.color } as CSSProperties}>
            <span className="q-ic"><Icon name={i.icon} size={22} /></span>
            <b>{i.label}</b><span>{i.sub}</span>
          </Link>
        ))}
      </div>
      <Link href="/configuracoes" className="settings-link rv" style={v(8)}>
        <span className="q-ic" style={{ "--c": "#a9b8ae" } as CSSProperties}><Icon name="gear" size={20} /></span>
        <span><b>Configurações</b><span>Veículo, orçamento, aparência, avisos e dados</span></span>
        <Icon name="chevron" size={16} />
      </Link>
    </>
  );
}
