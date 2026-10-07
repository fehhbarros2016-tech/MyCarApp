import type { Metadata } from "next";
import { FillForm } from "@/components/fuel/FillForm";
import { PageHeader } from "@/components/ui/kit";
import { fuelStats, kmStats } from "@/lib/calc";
import { todayISO } from "@/lib/format";
import { CLIO_TANK } from "@/lib/fuel";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Novo abastecimento" };
export const dynamic = "force-dynamic";

export default async function NewFillPage() {
  const s = await getStore();
  const tank = s ? { capacity: s.vehicle.tankL, bars: s.vehicle.bars } : CLIO_TANK;
  const level = s ? fuelStats(s).level : null;
  return (
    <div className="narrow">
      <PageHeader title="Novo abastecimento" back="/combustivel" sub="Valor pago, km do painel e onde o ponteiro estava antes e depois." />
      <FillForm tank={tank} defaultBefore={level?.bars ?? 2} lastKm={s ? kmStats(s).last : null} today={todayISO()} defaultFuel={s?.settings.defaultFuel} />
    </div>
  );
}
