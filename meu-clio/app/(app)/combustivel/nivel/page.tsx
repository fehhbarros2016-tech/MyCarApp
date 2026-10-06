import type { Metadata } from "next";
import { LevelForm } from "@/components/fuel/LevelForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFuelOverview } from "@/lib/data/fuel";
import { CLIO_TANK } from "@/lib/fuel";

export const metadata: Metadata = { title: "Nível do tanque" };
export const dynamic = "force-dynamic";

export default async function LevelPage() {
  const o = await getFuelOverview();
  return (
    <div style={{ maxWidth: 560 }}>
      <PageHeader title="Nível do tanque" sub="Arraste o ponteiro até onde está o marcador do painel agora." />
      <LevelForm tank={o?.tank ?? CLIO_TANK} current={o?.level?.bars ?? 5} lastKm={o?.lastKm ?? null} />
    </div>
  );
}
