import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripButton } from "@/components/Launchers";
import { CatBars } from "@/components/charts/static";
import { ExpenseList } from "@/components/lists/ExpenseList";
import { Card, EmptyState, Money, PageHeader, v } from "@/components/ui/kit";
import { byCategory, entries } from "@/lib/calc";
import { dateBR, intf, todayISO } from "@/lib/format";
import { kmStats } from "@/lib/km";
import { activeTrip, catsLite, shopsLite, toRows } from "@/lib/rows";
import { getStore } from "@/lib/store";
import { tripTotals } from "@/lib/trips";

export const metadata: Metadata = { title: "Viagem" };
export const dynamic = "force-dynamic";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const [s, { id }] = await Promise.all([getStore(), params]);
  if (!s) return null;
  const t = s.trips.find((x) => x.id === id);
  if (!t) notFound();
  const k = kmStats(s);
  const x = tripTotals(s, t, k.last);
  const ids = new Set(x.list.map((e) => e.id));
  const list = entries(s, false).filter((e) => ids.has(e.id));
  const cats = byCategory(list);
  return (
    <>
      <PageHeader title={t.name} back="/viagens" sub={`${dateBR(t.startDate)}${t.endDate ? ` a ${dateBR(t.endDate)}` : " · em andamento"} · ${x.days} ${x.days === 1 ? "dia" : "dias"}`}
        action={<TripButton label="Editar" className="btn-ghost sm" lastKm={k.last} initial={{ id: t.id, name: t.name, startDate: t.startDate, endDate: t.endDate, startKm: t.startKm, endKm: t.endKm, note: t.note }} />} />
      <div className="tiles three rv" style={v(1)}>
        <div className="tile"><span className="eyebrow">Total</span><Money value={x.total} /><small>{x.list.length} gastos</small></div>
        <div className="tile"><span className="eyebrow">Rodado</span><b className="num">{x.km != null ? `${intf(x.km)} km` : "—"}</b><small>{t.startKm != null ? `saída ${intf(t.startKm)}` : "informe o km"}</small></div>
        <div className="tile"><span className="eyebrow">Por km</span>{x.perKm ? <Money value={x.perKm} cents /> : <b className="muted">—</b>}<small>por dia <span className="money">R$ {Math.round(x.total / x.days)}</span></small></div>
      </div>
      {cats.length > 0 && (
        <Card title="Por categoria" className="rv" style={v(2)}>
          <CatBars total={x.total} data={cats.map((c) => ({ name: c.cat.name, icon: c.cat.icon, color: c.cat.color, value: c.total }))} />
        </Card>
      )}
      <div className="section-h rv" style={v(3)}><h2>Gastos da viagem</h2></div>
      {list.length ? <ExpenseList rows={toRows(s, list)} categories={catsLite(s)} lastKm={k.last} shops={shopsLite(s)} trip={activeTrip(s, todayISO())} />
        : <Card className="rv"><EmptyState icon="wallet" text="Nenhum gasto marcado nesta viagem ainda." /></Card>}
    </>
  );
}
