import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { Card, CatIcon, EmptyState, Money, PageHeader, v } from "@/components/ui/kit";
import { brl, dateBR, dec1, intf, monthLong, monthShort, todayISO } from "@/lib/format";
import { getStore } from "@/lib/store";
import { yearRecap } from "@/lib/summary";

export const metadata: Metadata = { title: "Retrospectiva" };
export const dynamic = "force-dynamic";

export default async function RetroPage({ params }: { params: Promise<{ y: string }> }) {
  const [s, { y }] = await Promise.all([getStore(), params]);
  if (!s) return null;
  if (!/^\d{4}$/.test(y)) notFound();
  const r = yearRecap(s, y);
  const cur = todayISO().slice(0, 4);
  const max = Math.max(1, ...r.months.map((m) => m.total));
  const facts: { icon: string; color: string; t: React.ReactNode; d: string }[] = [];
  if (r.km) facts.push({ icon: "road", color: "#7aa7ff", t: `${intf(r.km)} km rodados`, d: `cerca de ${intf(Math.round(r.km / 40075 * 100))}% de uma volta na Terra` });
  if (r.liters) facts.push({ icon: "fuel", color: "#6ef095", t: `${intf(Math.round(r.liters))} litros`, d: `${r.fills} abastecimentos${r.station ? ` · posto favorito: ${r.station}` : ""}` });
  if (r.kmPerL) facts.push({ icon: "gauge", color: "#c4f25a", t: `${dec1(r.kmPerL)} km/l de média`, d: r.best ? `melhor trecho: ${dec1(r.best.kmPerLiter)} km/l em ${intf(r.best.km)} km` : "no ano" });
  if (r.priceMin != null) facts.push({ icon: "trend", color: "#ffc35a", t: <>litro de <span className="money">{brl(r.priceMin, true)}</span> a <span className="money">{brl(r.priceMax!, true)}</span></>, d: "menor e maior preço que você pagou" });
  if (r.maintCount) facts.push({ icon: "wrench", color: "#5cd6ff", t: `${r.maintCount} ${r.maintCount === 1 ? "manutenção" : "manutenções"}`, d: `${brl(r.maintTotal)}${r.shop ? ` · oficina de confiança: ${r.shop}` : ""}` });
  if (r.parts) facts.push({ icon: "box", color: "#9fb4ff", t: `${r.parts} ${r.parts === 1 ? "peça nova" : "peças novas"}`, d: "registradas com foto e idade" });
  if (r.parcelas) facts.push({ icon: "receipt", color: "#8fb8ff", t: `${r.parcelas} ${r.parcelas === 1 ? "parcela paga" : "parcelas pagas"}`, d: "cada uma mais perto da quitação" });
  if (r.trips) facts.push({ icon: "map", color: "#b49cff", t: `${r.trips} ${r.trips === 1 ? "viagem" : "viagens"}`, d: "com custo separado" });
  if (r.issuesSolved) facts.push({ icon: "check", color: "#79e0a8", t: `${r.issuesSolved} ${r.issuesSolved === 1 ? "problema resolvido" : "problemas resolvidos"}`, d: "do diário de problemas" });
  facts.push({ icon: "badge", color: r.finePoints ? "#ff8a5c" : "#6ef095", t: r.finePoints ? `${r.finePoints} pontos na CNH` : "Nenhuma multa", d: r.finePoints ? "no ano" : "ano limpo no trânsito" });
  return (
    <>
      <PageHeader title={`Seu ${y}`} sub={y === cur ? "Retrospectiva até agora" : "Retrospectiva do ano"} back="/relatorios"
        action={<div className="ph-years">{Number(y) > 2020 && <Link href={`/retrospectiva/${Number(y) - 1}`} className="icon-btn" aria-label="Ano anterior"><Icon name="back" size={18} /></Link>}
          {y < cur && <Link href={`/retrospectiva/${Number(y) + 1}`} className="icon-btn" aria-label="Próximo ano"><Icon name="chevron" size={18} /></Link>}</div>} />
      {!r.count ? <Card className="rv"><EmptyState icon="sparkle" text={`Nada registrado em ${y}.`} /></Card> : (
        <>
          <Card className="retro-hero rv" style={v(1)}>
            <span className="eyebrow">Você gastou com o carro</span>
            <div className="big num money"><small>R$</small>{intf(Math.round(r.total))}</div>
            <p className="muted-s">{r.count} lançamentos · <span className="money">{brl(r.perDay, true)}</span> por dia{r.topCat ? <> · campeã: <b>{r.topCat.cat.name}</b></> : null}</p>
            <div className="retro-bars" aria-label="Gasto por mês">
              {r.months.map((m, i) => (
                <div key={m.key} className="retro-col" data-top={r.priciest?.key === m.key}>
                  <i style={{ height: `${(m.total / max) * 100}%`, "--d": `${i * 40}ms` } as CSSProperties} />
                  <span>{monthShort(m.key).slice(0, 1).toUpperCase()}</span>
                </div>
              ))}
            </div>
            {r.priciest && <p className="muted-s">Mês mais caro: <b>{monthLong(r.priciest.key)}</b> (<span className="money">{brl(r.priciest.total)}</span>){r.cheapest && r.cheapest.key !== r.priciest.key ? <> · mais leve: <b>{monthLong(r.cheapest.key)}</b></> : null}</p>}
          </Card>

          <div className="facts">
            {facts.map((f, i) => (
              <div key={i} className="fact rv" style={{ ...v(i + 2), "--c": f.color } as CSSProperties}>
                <span className="q-ic"><Icon name={f.icon} size={20} /></span>
                <b>{f.t}</b><span>{f.d}</span>
              </div>
            ))}
          </div>

          {r.cats.length > 0 && (
            <Card title="Onde mais gastou" className="rv">
              <ol className="top-list">
                {r.cats.map((c, i) => (
                  <li key={c.cat.id}><span className="top-n num">{i + 1}</span><CatIcon icon={c.cat.icon} color={c.cat.color} size={30} />
                    <span className="top-t"><b>{c.cat.name}</b><span>{Math.round(c.pct * 100)}% · {c.count} lançamentos</span></span><Money value={c.total} /></li>
                ))}
              </ol>
            </Card>
          )}
          {r.biggest && <p className="foot-hint rv"><Icon name="star" size={14} /> Maior gasto do ano: {r.biggest.title} em {dateBR(r.biggest.date)} (<span className="money">{brl(r.biggest.amount)}</span>).</p>}
        </>
      )}
    </>
  );
}
