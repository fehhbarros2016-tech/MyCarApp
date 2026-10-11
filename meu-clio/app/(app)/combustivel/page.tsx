import type { Metadata } from "next";
import Link from "next/link";
import { DateLines, Trend } from "@/components/charts/static";
import { EthanolCalc } from "@/components/fuel/EthanolCalc";
import { FuelGauge } from "@/components/fuel/FuelGauge";
import { OdometerButton } from "@/components/Launchers";
import { ExpenseList } from "@/components/lists/ExpenseList";
import { Icon } from "@/components/ui/Icon";
import { Card, EmptyState, Money, PageHeader, v } from "@/components/ui/kit";
import { entries, fuelStats, kmStats } from "@/lib/calc";
import { brl, currentMonth, dateBR, dec1, intf, monthKey } from "@/lib/format";
import { formatBars } from "@/lib/fuel";
import { catsLite, shopsLite, toRows } from "@/lib/rows";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Combustível" };
export const dynamic = "force-dynamic";

export default async function FuelPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const [s, sp] = await Promise.all([getStore(), searchParams]);
  if (!s) return null;
  const f = fuelStats(s);
  const k = kmStats(s);
  const unitL100 = s.settings.consumptionUnit === "l100";
  const cons = f.kmPerL ? (unitL100 ? `${dec1(100 / f.kmPerL)}` : dec1(f.kmPerL)) : "—";
  const fuelIds = new Set(f.fills.map((x) => x.id));
  const rows = toRows(s, entries(s, false).filter((e) => fuelIds.has(e.id)));
  const monthSpent = f.fills.filter((x) => monthKey(x.date) === currentMonth()).reduce((a, x) => a + x.amount, 0);
  const lastSeg = f.segments.at(-1);

  return (
    <>
      <PageHeader title="Combustível" action={<Link href="/combustivel/novo" className="btn-primary sm"><Icon name="plus" size={16} />Abastecer</Link>} />
      {sp.salvo && <p className="saved rv"><Icon name="checkCircle" size={16} /> Salvo.</p>}

      <Card className="tank-hero rv" style={v(1)}>
        {f.level ? (
          <div className="tank-hero-row">
            <div className="tank-hero-read">
              <span className="eyebrow">No tanque agora</span>
              <div className="tank-l num">{dec1(f.litersNow ?? f.level.liters)}<small>L</small></div>
              {f.estimated ? (
                <p className="muted-s">estimado agora · marcado {formatBars(f.level.bars)} de {s.vehicle.bars} em {dateBR(f.level.date)}{f.level.km != null ? ` aos ${intf(f.level.km)} km` : ""}</p>
              ) : (
                <>
                  <p className="muted-s">{formatBars(f.level.bars)} de {s.vehicle.bars} barras · {Math.round((f.level.bars / s.vehicle.bars) * 100)}%</p>
                  <p className="muted-s">medido em {dateBR(f.level.date)}{f.level.km != null ? ` aos ${intf(f.level.km)} km` : ""}</p>
                </>
              )}
              {f.autonomyKm ? <p className="autonomy"><Icon name="road" size={14} /> Dá para rodar ~{intf(Math.round(f.autonomyKm))} km</p> : null}
              <div className="btn-row">
                <Link href="/combustivel/nivel" className="btn-ghost sm"><Icon name="gauge" size={15} />Atualizar nível</Link>
                <OdometerButton lastKm={k.last} history={s.odoManual.slice(-6).reverse().map((o) => ({ id: o.id!, date: o.date, km: o.km }))} />
              </div>
            </div>
            <FuelGauge bars={s.vehicle.bars} value={f.litersNow != null ? Math.max(0, Math.round((f.litersNow / s.vehicle.tankL) * s.vehicle.bars * 2) / 2) : f.level.bars} label={f.estimated ? "Nível estimado agora" : "Último nível registrado"} />
          </div>
        ) : <EmptyState icon="gauge" text="Marque no marcador quanto combustível tem agora. É a base para calcular os litros de cada abastecimento." cta={{ href: "/combustivel/nivel", label: "Marcar nível" }} />}
      </Card>

      <div className="tiles rv" style={v(2)}>
        <div className="tile"><span className="eyebrow">Consumo médio</span><b className="num">{cons}</b><small>{unitL100 ? "L/100 km" : "km por litro"}</small></div>
        <div className="tile"><span className="eyebrow">Preço médio</span>{f.avgPrice ? <Money value={f.avgPrice} cents /> : <b className="muted">—</b>}<small>por litro</small></div>
        <div className="tile"><span className="eyebrow">Este mês</span><Money value={monthSpent} /><small>em combustível</small></div>
        <div className="tile"><span className="eyebrow">Por km</span>{f.kmPerL && f.avgPrice ? <Money value={f.avgPrice / f.kmPerL} cents /> : <b className="muted">—</b>}<small>só combustível</small></div>
      </div>

      {f.drop && s.settings.consumptionAlert && f.drop.pct * 100 >= s.settings.consumptionDropPct && (
        <div className="alert rv" data-tone="warn" style={v(2)}>
          <span className="alert-ic"><Icon name="trendDown" size={17} /></span>
          <span className="alert-t"><b>Consumo caiu {Math.round(f.drop.pct * 100)}% no último trecho</b>
            <span>{dec1(f.drop.last)} km/l contra {dec1(f.drop.avg)} de média. Confira calibragem, filtro de ar e velas.</span></span>
        </div>
      )}

      <Card title="Etanol ou gasolina?" className="rv" style={v(3)}>
        <EthanolCalc kmlG={f.byType.gasolina.kmPerL} kmlE={f.byType.etanol.kmPerL} lastG={f.byType.gasolina.lastPrice} lastE={f.byType.etanol.lastPrice}
          tankL={s.vehicle.tankL} kmMonth={k.perMonth} />
      </Card>

      {f.priceSeries.length >= 2 && (
        <Card title="Preço do litro" className="rv" style={v(3)}>
          <DateLines unit="R$/L" series={[
            { name: "Gasolina", color: "#ffc35a", points: f.priceSeries.filter((p) => p.type === "gasolina").map((p) => ({ date: p.date, value: p.value })) },
            { name: "Etanol", color: "#6ef095", points: f.priceSeries.filter((p) => p.type === "etanol").map((p) => ({ date: p.date, value: p.value })) },
          ].filter((x) => x.points.length)} />
          <div className="price-stats">
            {(["gasolina", "etanol"] as const).filter((t) => f.byType[t].fills).map((t) => {
              const ps = f.priceSeries.filter((p) => p.type === t).map((p) => p.value);
              return (
                <div key={t}>
                  <span className="eyebrow"><i style={{ background: t === "gasolina" ? "#ffc35a" : "#6ef095" }} />{t === "gasolina" ? "Gasolina" : "Etanol"}</span>
                  <b className="num">{brl(f.byType[t].lastPrice ?? 0, true)}</b>
                  <small>média {brl(f.byType[t].avgPrice ?? 0, true)} · menor {brl(Math.min(...ps), true)} · maior {brl(Math.max(...ps), true)}</small>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {f.segments.length >= 2 ? (
        <Card title="Consumo por trecho" className="rv" style={v(3)}>
          <Trend points={f.segments.slice(-10).map((x) => ({ label: `${intf(x.toKm)} km`, value: unitL100 ? 100 / x.kmPerLiter : x.kmPerLiter }))} unit={unitL100 ? "L/100" : "km/l"} decimals={1} />
          {lastSeg && <p className="muted-s">Último trecho: {intf(lastSeg.km)} km com {dec1(lastSeg.liters)} L ({dec1(lastSeg.kmPerLiter)} km/l)</p>}
        </Card>
      ) : (
        <Card className="tip rv" style={v(3)}>
          <p><Icon name="sparkle" size={15} /> <b>Como o consumo é calculado:</b> em cada abastecimento você marca onde o ponteiro estava antes e depois. Com dois abastecimentos (com km), o app sabe quantos litros gastou entre eles e calcula o km/l real.</p>
        </Card>
      )}

      <div className="section-h rv" style={v(4)}><h2>Abastecimentos</h2>{f.liters > 0 && <span className="muted-s">{intf(Math.round(f.liters))} L · {brl(f.spent)}</span>}</div>
      {rows.length ? <ExpenseList rows={rows} categories={catsLite(s)} lastKm={k.last} shops={shopsLite(s)} />
        : <Card className="rv" style={v(5)}><EmptyState icon="fuel" text="Você ainda não registrou nenhum abastecimento." cta={{ href: "/combustivel/novo", label: "Adicionar abastecimento" }} /></Card>}
    </>
  );
}
