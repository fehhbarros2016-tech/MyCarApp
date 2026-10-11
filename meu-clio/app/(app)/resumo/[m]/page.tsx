import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { CatBars } from "@/components/charts/static";
import { Icon } from "@/components/ui/Icon";
import { Card, CatIcon, Delta, EmptyState, Money, PageHeader, v } from "@/components/ui/kit";
import { addMonths, brl, currentMonth, dateBR, dec1, intf, monthLong } from "@/lib/format";
import { getStore } from "@/lib/store";
import { monthSummary } from "@/lib/summary";

export const metadata: Metadata = { title: "Resumo do mês" };
export const dynamic = "force-dynamic";

export default async function ResumoPage({ params }: { params: Promise<{ m: string }> }) {
  const [s, { m }] = await Promise.all([getStore(), params]);
  if (!s) return null;
  if (!/^\d{4}-\d{2}$/.test(m)) notFound();
  const r = monthSummary(s, m);
  const title = monthLong(m).replace(/^./, (c) => c.toUpperCase());
  const isFuture = m > currentMonth();
  return (
    <>
      <PageHeader title={title} sub="Resumo do mês" back="/relatorios" />
      <div className="month-nav rv" style={v(1)}>
        <Link href={`/resumo/${addMonths(m, -1)}`} className="icon-btn" aria-label="Mês anterior"><Icon name="back" size={18} /></Link>
        <div className="mn-c"><b>{title}</b><span>{r.count} lançamentos em {r.days} {r.days === 1 ? "dia" : "dias"}</span></div>
        {m < currentMonth() ? <Link href={`/resumo/${addMonths(m, 1)}`} className="icon-btn" aria-label="Próximo mês"><Icon name="chevron" size={18} /></Link> : <span className="icon-btn ghost" aria-hidden />}
      </div>

      {!r.count || isFuture ? (
        <Card className="rv" style={v(2)}><EmptyState icon="calendar" text="Nenhum lançamento neste mês." /></Card>
      ) : (
        <>
          <Card className="recap-hero rv" style={v(2)}>
            <span className="eyebrow">Gasto no mês</span>
            <div className="big num money"><small>R$</small>{intf(Math.round(r.total))}</div>
            <div className="month-sub"><Delta value={r.delta} /><span>{r.delta != null ? <>vs <Money value={r.prevTotal} /> no mês anterior</> : "primeiro mês com registros"}</span></div>
            {r.budget ? <p className={`recap-budget ${r.budgetLeft! < 0 ? "over" : ""}`}><Icon name={r.budgetLeft! < 0 ? "alert" : "checkCircle"} size={15} />
              {r.budgetLeft! >= 0 ? <>Dentro do orçamento: sobraram <b className="money">{brl(r.budgetLeft!)}</b></> : <>Passou do orçamento em <b className="money">{brl(-r.budgetLeft!)}</b></>}</p> : null}
          </Card>

          <div className="tiles rv" style={v(3)}>
            <div className="tile"><span className="eyebrow">Rodou</span><b className="num">{r.km != null ? `${intf(r.km)} km` : "—"}</b><small>{r.km ? `${intf(Math.round(r.km / 30))} km por dia` : "informe o km"}</small></div>
            <div className="tile"><span className="eyebrow">Custo / km</span>{r.costPerKm ? <Money value={r.costPerKm} cents /> : <b className="muted">—</b>}<small>sem parcelas</small></div>
            <div className="tile"><span className="eyebrow">Combustível</span><b className="num">{r.liters ? `${dec1(r.liters)} L` : "—"}</b><small>{r.fills} {r.fills === 1 ? "abastecimento" : "abastecimentos"}</small></div>
            <div className="tile"><span className="eyebrow">Consumo</span><b className="num">{r.kmPerL ? `${dec1(r.kmPerL)} km/l` : "—"}</b><small>{r.station ? `posto: ${r.station}` : "no mês"}</small></div>
          </div>

          <Card title="Por categoria" className="rv" style={v(4)}>
            <CatBars total={r.total} data={r.byCat.map((c) => ({ name: c.cat.name, icon: c.cat.icon, color: c.cat.color, value: c.total }))} />
          </Card>

          {r.biggest && (
            <Card title="Maior gasto" className="rv" style={v(5)}>
              <div className="recap-row"><CatIcon icon={r.biggest.cat.icon} color={r.biggest.cat.color} size={38} />
                <span><b>{r.biggest.title}</b><span>{r.biggest.cat.name} · {dateBR(r.biggest.date)}</span></span><Money value={r.biggest.amount} /></div>
            </Card>
          )}

          {r.maint.length > 0 && (
            <Card title="Manutenção" className="rv" style={v(6)}>
              <ul className="mini-plan">{r.maint.map((e) => <li key={e.id}><i className="dot" /><b>{e.maint!.service}</b><span className="money">{brl(e.amount)}</span></li>)}</ul>
            </Card>
          )}
          <Link href={`/gastos?m=${m}`} className="foot-link rv" style={v(7) as CSSProperties}><Icon name="wallet" size={16} /> Ver os lançamentos do mês <Icon name="chevron" size={14} /></Link>
        </>
      )}
    </>
  );
}
