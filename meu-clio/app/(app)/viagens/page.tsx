import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { EndTripButton } from "@/components/ActionButtons";
import { TripButton } from "@/components/Launchers";
import { TripCalc } from "@/components/TripCalc";
import { Icon } from "@/components/ui/Icon";
import { Card, EmptyState, Money, PageHeader, v } from "@/components/ui/kit";
import { fuelStats } from "@/lib/calc";
import { brl, dateBR, intf, todayISO } from "@/lib/format";
import { kmStats } from "@/lib/km";
import { getStore } from "@/lib/store";
import { tripTotals } from "@/lib/trips";

export const metadata: Metadata = { title: "Viagens" };
export const dynamic = "force-dynamic";

export default async function ViagensPage() {
  const s = await getStore();
  if (!s) return null;
  const k = kmStats(s);
  const f = fuelStats(s);
  const today = todayISO();
  const active = s.trips.find((t) => t.startDate <= today && (!t.endDate || t.endDate >= today)) ?? null;
  const price = f.byType[s.settings.defaultFuel].lastPrice ?? f.avgPrice;
  return (
    <>
      <PageHeader title="Viagens" sub="Separe o custo de cada viagem e planeje a próxima." back="/mais" action={active ? undefined : <TripButton lastKm={k.last} />} />

      {active && (() => {
        const t = tripTotals(s, active, k.last);
        return (
          <Card className="trip-active rv" style={v(1)}>
            <div className="trip-head"><span className="pill" data-tone="ok"><Icon name="map" size={12} /> em andamento</span><Link href={`/viagens/${active.id}`}>Detalhes</Link></div>
            <b className="trip-name">{active.name}</b>
            <div className="trip-nums">
              <div><span>Gasto</span><Money value={t.total} /></div>
              <div><span>Rodado</span><b className="num">{t.km != null ? `${intf(t.km)} km` : "—"}</b></div>
              <div><span>Por km</span>{t.perKm ? <Money value={t.perKm} cents /> : <b className="muted">—</b>}</div>
            </div>
            <p className="muted-s">Desde {dateBR(active.startDate)} · {t.days} {t.days === 1 ? "dia" : "dias"} · gastos novos entram aqui automaticamente.</p>
            <EndTripButton id={active.id} lastKm={k.last} />
          </Card>
        );
      })()}

      <Card title="Calculadora de viagem" className="rv" style={v(2)}>
        <TripCalc kml={f.kmPerL} price={price ?? null} tankL={s.vehicle.tankL} litersNow={f.litersNow} />
      </Card>

      <div className="section-h rv" style={v(3)}><h2>Suas viagens</h2>{active && <TripButton lastKm={k.last} className="btn-ghost sm" />}</div>
      {s.trips.length ? (
        <ul className="trip-list">
          {s.trips.map((t, i) => {
            const x = tripTotals(s, t, k.last);
            return (
              <li key={t.id} className="rv" style={v(Math.min(i + 4, 10))}>
                <Link href={`/viagens/${t.id}`} className="trip-row">
                  <span className="q-ic" style={{ "--c": t.id === active?.id ? "#6ef095" : "#7aa7ff" } as CSSProperties}><Icon name="map" size={18} /></span>
                  <span className="trip-t"><b>{t.name}</b><span>{dateBR(t.startDate)}{t.endDate ? ` a ${dateBR(t.endDate)}` : " · ativa"}{x.km ? ` · ${intf(x.km)} km` : ""}</span></span>
                  <span className="trip-v"><b className="money num">{brl(x.total)}</b>{x.perKm ? <small className="money">{brl(x.perKm, true)}/km</small> : null}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : <Card className="rv" style={v(4)}><EmptyState icon="map" text="Crie uma viagem antes de sair. Combustível, pedágio, estacionamento e outros gastos ficam separados, com custo por km." /></Card>}
    </>
  );
}
