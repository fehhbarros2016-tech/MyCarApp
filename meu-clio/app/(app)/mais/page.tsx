import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader, v } from "@/components/ui/kit";
import { installmentsSummary, oilStatus, upcoming } from "@/lib/calc";
import { addMonths, currentMonth, intf, monthLong, todayISO } from "@/lib/format";
import { finePoints } from "@/lib/money";
import { planStatuses } from "@/lib/plan";
import { getStore } from "@/lib/store";
import { APP_VERSION_LABEL } from "@/lib/version";

export const metadata: Metadata = { title: "Mais" };
export const dynamic = "force-dynamic";

type Item = { href: string; icon: string; color: string; label: string; sub: string; badge?: number };

export default async function MorePage() {
  const s = await getStore();
  if (!s) return null;
  const inst = installmentsSummary(s);
  const up = upcoming(s);
  const oil = oilStatus(s);
  const plan = planStatuses(s);
  const late = plan.filter((p) => p.tone === "danger" || p.tone === "warn").length;
  const issues = s.issues.filter((i) => !i.resolvedOn).length;
  const fp = finePoints(s);
  const today = todayISO();
  const trip = s.trips.find((t) => t.startDate <= today && (!t.endDate || t.endDate >= today));
  const custom = s.categories.filter((c) => c.custom).length;
  const prev = addMonths(currentMonth(), -1);

  const groups: { title: string; items: Item[] }[] = [
    { title: "Carro", items: [
      { href: "/manutencao", icon: "wrench", color: "#5cd6ff", label: "Manutenção", sub: issues ? `${issues} ${issues === 1 ? "problema aberto" : "problemas abertos"}` : oil?.leftKm != null ? `óleo em ${intf(Math.max(0, oil.leftKm))} km` : "plano, peças e pneus", badge: late + issues || undefined },
      { href: "/carro", icon: "car", color: "#6ef095", label: "Ficha do carro", sub: s.vehicles.length > 1 ? `${s.vehicles.length} veículos` : "documento, pneus, socorro" },
      { href: "/agenda", icon: "calendar", color: "#ffc35a", label: "Agenda", sub: up.length ? `${up.length} próximos` : "lembretes" },
      { href: "/combustivel", icon: "fuel", color: "#c4f25a", label: "Combustível", sub: "etanol x gasolina" },
    ] },
    { title: "Dinheiro", items: [
      { href: "/parcelas", icon: "receipt", color: "#8fb8ff", label: "Parcelas", sub: inst.total ? `${inst.paid} de ${inst.total} · simular quitação` : "cadastrar compra" },
      { href: "/planejamento", icon: "piggy", color: "#ff8fc7", label: "Planejamento", sub: s.settings.monthlyIncome ? "salário, reserva e limites" : "reserva anual e limites" },
      { href: "/multas", icon: "badge", color: "#ff8a5c", label: "Multas", sub: fp.points ? `${fp.points} pontos na CNH` : "pontos e prazos" },
      { href: "/gastos/rapidos", icon: "star", color: "#ffd166", label: "Rápidos", sub: `${s.favorites.length} favoritos · ${s.recurring.length} recorrentes` },
    ] },
    { title: "Histórico", items: [
      { href: "/viagens", icon: "map", color: "#b49cff", label: "Viagens", sub: trip ? `em andamento: ${trip.name}` : "custo por viagem" },
      { href: "/linha-do-tempo", icon: "clock", color: "#7aa7ff", label: "Linha do tempo", sub: "tudo que aconteceu" },
      { href: `/resumo/${prev}`, icon: "sparkle", color: "#5ff0c8", label: "Resumo do mês", sub: monthLong(prev) },
      { href: `/retrospectiva/${today.slice(0, 4)}`, icon: "trend", color: "#ff9a5a", label: "Retrospectiva", sub: `seu ${today.slice(0, 4)}` },
      { href: "/relatorio-venda", icon: "print", color: "#a9b8ae", label: "Relatório", sub: "PDF para venda" },
      { href: "/buscar", icon: "search", color: "#9fb4ff", label: "Buscar", sub: "qualquer gasto" },
    ] },
  ];
  let n = 0;
  return (
    <>
      <PageHeader title="Mais" />
      {groups.map((g) => (
        <section key={g.title} className="more-sec">
          <h2 className="more-h rv" style={v(n++)}>{g.title}</h2>
          <div className="more-grid">
            {g.items.map((i) => (
              <Link key={i.href} href={i.href} className="more-item rv" style={{ ...v(n++), "--c": i.color } as CSSProperties}>
                <span className="q-ic"><Icon name={i.icon} size={22} />{i.badge ? <em className="more-badge">{i.badge}</em> : null}</span>
                <b>{i.label}</b><span>{i.sub}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <Link href="/configuracoes/categorias" className="settings-link rv" style={v(n++)}>
        <span className="q-ic" style={{ "--c": "#ff8fd1" } as CSSProperties}><Icon name="tag" size={20} /></span>
        <span><b>Categorias</b><span>{s.categories.filter((c) => !c.archived).length} ativas{custom ? ` · ${custom} suas` : ""}</span></span>
        <Icon name="chevron" size={16} />
      </Link>
      <Link href="/configuracoes" className="settings-link rv" style={v(n++)}>
        <span className="q-ic" style={{ "--c": "#a9b8ae" } as CSSProperties}><Icon name="gear" size={20} /></span>
        <span><b>Configurações</b><span>Aparência, veículo, avisos, segurança e dados</span></span>
        <Icon name="chevron" size={16} />
      </Link>
      <p className="version-foot rv">Meu Clio {APP_VERSION_LABEL} · sem IA no app</p>
    </>
  );
}
