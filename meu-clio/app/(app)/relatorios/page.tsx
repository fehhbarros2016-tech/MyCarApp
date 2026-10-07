import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { MonthBars } from "@/components/charts/MonthBars";
import { CatBars, Donut, Trend, WeekBars } from "@/components/charts/static";
import { Icon } from "@/components/ui/Icon";
import { Card, CatIcon, EmptyState, Money, PageHeader, v } from "@/components/ui/kit";
import { byCategory, entries, fuelStats, GROUP_COLOR, GROUP_LABEL, monthlySeries, periodStart, totals, weekdaySpend } from "@/lib/calc";
import { brl, currentMonth, dateBR, daysUntil, dec1, intf, monthShort, todayISO } from "@/lib/format";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

const PERIODS = [
  { v: "mes", l: "Mês" }, { v: "3m", l: "3 meses" }, { v: "6m", l: "6 meses" }, { v: "12m", l: "12 meses" }, { v: "tudo", l: "Tudo" },
];

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const [s, sp] = await Promise.all([getStore(), searchParams]);
  if (!s) return null;
  const p = PERIODS.some((x) => x.v === sp.p) ? sp.p! : "6m";
  const from = periodStart(p);
  const all = entries(s);
  const list = from ? all.filter((e) => e.date >= from) : all;
  const total = list.reduce((a, e) => a + e.amount, 0);
  const firstDate = list.length ? list[list.length - 1].date : todayISO();
  const spanDays = Math.max(1, daysUntil(todayISO(), from ?? firstDate) + 1);
  const cats = byCategory(list);
  const t = totals(s);
  const f = fuelStats(s);
  const months = monthlySeries(s, p === "mes" || p === "3m" ? 6 : 12);
  const bars = months.map((m) => ({
    key: m.key, label: monthShort(m.key), total: m.total,
    parts: Object.entries(m.byGroup).map(([g, value]) => ({ label: GROUP_LABEL[g as keyof typeof GROUP_LABEL] ?? g, value, color: GROUP_COLOR[g as keyof typeof GROUP_COLOR] ?? "#a9b8ae" })),
  }));
  const top = [...list].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const week = weekdaySpend(list, s.settings.weekStart);
  const fuelIn = list.filter((e) => e.cat.slug === "combustivel").reduce((a, e) => a + e.amount, 0);
  const perDay = total / spanDays;
  const kml = f.segments.slice(-10).map((x, i) => ({ label: `#${i + 1}`, value: x.kmPerLiter }));
  const price = f.priceSeries.slice(-12).map((x) => ({ label: dateBR(x.date), value: x.value }));

  return (
    <>
      <PageHeader title="Relatórios" sub="Para onde vai o dinheiro do carro." />
      <div className="seg period rv" style={v(1)}>
        {PERIODS.map((x) => <Link key={x.v} href={`/relatorios?p=${x.v}`} data-on={p === x.v} scroll={false}>{x.l}</Link>)}
      </div>

      {!all.length ? (
        <Card className="rv" style={v(2)}><EmptyState icon="chart" text="Os relatórios ganham vida conforme você registra gastos, abastecimentos e parcelas." /></Card>
      ) : (
        <>
          <div className="tiles rv" style={v(2)}>
            <div className="tile"><span className="eyebrow">No período</span><Money value={total} /><small>{list.length} lançamentos</small></div>
            <div className="tile"><span className="eyebrow">Por dia</span><Money value={perDay} cents /><small>{brl(perDay * 30)} / mês</small></div>
            <div className="tile"><span className="eyebrow">Custo / km</span>{t.costPerKm != null ? <Money value={t.costPerKm} cents /> : <b className="muted">—</b>}<small>{t.costPerKm != null ? `${brl(t.costPerKm * 1000)} / 1.000 km` : "precisa de km"}</small></div>
            <div className="tile"><span className="eyebrow">Ritmo anual</span><Money value={perDay * 365} /><small>se continuar assim</small></div>
          </div>

          <Card title="Mês a mês" className="rv" style={v(3)}>
            <MonthBars data={bars} initial={bars.findIndex((b) => b.key === currentMonth())} />
          </Card>

          <Card title="Por categoria" className="rv" style={v(4)}>
            {cats.length ? (
              <>
                <div className="donut-center">
                  <Donut data={cats.slice(0, 8).map((c) => ({ label: c.cat.name, value: c.total, color: c.cat.color }))} size={190} stroke={20}>
                    <span className="eyebrow">Total</span><b className="money num">{brl(total)}</b>
                  </Donut>
                </div>
                <CatBars total={total} data={cats.map((c) => ({ name: c.cat.name, icon: c.cat.icon, color: c.cat.color, value: c.total }))} />
              </>
            ) : <EmptyState icon="pie" text="Sem gastos neste período." />}
          </Card>

          <Card title="Custo real do carro" className="rv" style={v(5)}>
            <p className="muted-s">Desde a compra · {s.settings.includeDownInTotal ? "inclui a entrada" : "sem a entrada"}</p>
            <div className="big num money cost-total"><small>R$</small>{intf(Math.round(t.total))}</div>
            <div className="stack-bar">
              {t.groups.map((g) => <i key={g.group} style={{ flexGrow: g.total, background: g.color } as CSSProperties} title={g.label} />)}
            </div>
            <ul className="groups">
              {t.groups.map((g) => (
                <li key={g.group}><i style={{ background: g.color }} /><span>{g.label}</span><Money value={g.total} /><em className="num">{t.total ? Math.round((g.total / t.total) * 100) : 0}%</em></li>
              ))}
            </ul>
          </Card>

          <div className="two-col">
            <Card title="Combustível" className="rv" style={v(6)}>
              <div className="mini-stats">
                <div><span>Média</span><b className="num">{f.kmPerL ? `${dec1(f.kmPerL)} km/l` : "—"}</b></div>
                <div><span>Preço médio</span><b className="num">{f.avgPrice ? brl(f.avgPrice, true) : "—"}</b></div>
                <div><span>Litros</span><b className="num">{intf(Math.round(f.liters))} L</b></div>
                <div><span>No período</span><Money value={fuelIn} /></div>
              </div>
              {kml.length >= 2 ? <><p className="chart-cap">Consumo nos últimos abastecimentos</p><Trend points={kml} unit="km/l" decimals={1} /></> : null}
              {price.length >= 2 ? <><p className="chart-cap">Preço por litro</p><Trend points={price} unit="R$/L" color="#ffc35a" /></> : null}
              {kml.length < 2 && price.length < 2 && <p className="muted-s">Os gráficos de consumo aparecem depois de dois abastecimentos com o marcador.</p>}
            </Card>

            <Card title="Dia da semana" className="rv" style={v(7)}>
              <WeekBars data={week} />
              {(() => {
                const topDay = week.reduce((b, d) => (d.total > b.total ? d : b), week[0]);
                return topDay.total > 0 ? <p className="muted-s">Você gasta mais às <b>{topDay.label}</b>: <Money value={topDay.total} /> no período.</p> : null;
              })()}
            </Card>
          </div>

          <Card title="Maiores gastos" className="rv" style={v(8)}>
            {top.length ? (
              <ol className="top-list">
                {top.map((e, i) => (
                  <li key={e.id}>
                    <span className="top-n num">{i + 1}</span>
                    <CatIcon icon={e.cat.icon} color={e.cat.color} size={30} />
                    <span className="top-t"><b>{e.title}</b><span>{e.cat.name} · {dateBR(e.date)}</span></span>
                    <Money value={e.amount} />
                  </li>
                ))}
              </ol>
            ) : <EmptyState icon="star" text="Sem gastos neste período." />}
          </Card>

          <Link href="/gastos" className="foot-link rv" style={v(9)}><Icon name="wallet" size={16} /> Ver todos os lançamentos <Icon name="chevron" size={14} /></Link>
        </>
      )}
    </>
  );
}
