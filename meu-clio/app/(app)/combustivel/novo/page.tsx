import type { Metadata } from "next";
import { FillForm } from "@/components/fuel/FillForm";
import { PageHeader } from "@/components/ui/kit";
import { fuelStats, kmStats } from "@/lib/calc";
import { todayISO } from "@/lib/format";
import { CLIO_TANK } from "@/lib/fuel";
import { activeTrip } from "@/lib/rows";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Novo abastecimento" };
export const dynamic = "force-dynamic";

export default async function NewFillPage() {
  const s = await getStore();
  const tank = s ? { capacity: s.vehicle.tankL, bars: s.vehicle.bars } : CLIO_TANK;
  const f = s ? fuelStats(s) : null;
  const est = f?.litersNow != null && s ? Math.max(0, Math.round((f.litersNow / s.vehicle.tankL) * s.vehicle.bars * 2) / 2) : null;
  const trip = s ? activeTrip(s, todayISO()) : null;
  return (
    <div className="narrow">
      <PageHeader title="Novo abastecimento" back="/combustivel" sub="Valor pago, km do painel e onde o ponteiro estava antes e depois." />
      <FillForm tank={tank} defaultBefore={est ?? f?.level?.bars ?? 2} lastKm={s ? kmStats(s).last : null} today={todayISO()} defaultFuel={s?.settings.defaultFuel} trip={trip} />
    </div>
  );
}
