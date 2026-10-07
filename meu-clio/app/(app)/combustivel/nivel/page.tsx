import type { Metadata } from "next";
import { LevelForm } from "@/components/fuel/LevelForm";
import { PageHeader } from "@/components/ui/kit";
import { fuelStats, kmStats } from "@/lib/calc";
import { CLIO_TANK } from "@/lib/fuel";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Nível do tanque" };
export const dynamic = "force-dynamic";

export default async function LevelPage() {
  const s = await getStore();
  const tank = s ? { capacity: s.vehicle.tankL, bars: s.vehicle.bars } : CLIO_TANK;
  const level = s ? fuelStats(s).level : null;
  return (
    <div className="narrow">
      <PageHeader title="Nível do tanque" back="/combustivel" sub="Arraste o ponteiro até onde está o marcador do painel agora." />
      <LevelForm tank={tank} current={level?.bars ?? 5} lastKm={s ? kmStats(s).last : null} />
    </div>
  );
}
