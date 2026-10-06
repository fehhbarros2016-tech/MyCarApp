import type { Metadata } from "next";
import { FillForm } from "@/components/fuel/FillForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFuelOverview } from "@/lib/data/fuel";
import { CLIO_TANK } from "@/lib/fuel";

export const metadata: Metadata = { title: "Novo abastecimento" };
export const dynamic = "force-dynamic";

export default async function NewFillPage() {
  const o = await getFuelOverview();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return (
    <div style={{ maxWidth: 560 }}>
      <PageHeader title="Novo abastecimento" sub="Preencha o que pagou, o km do painel e arraste o marcador até onde o ponteiro do carro parou." />
      <FillForm tank={o?.tank ?? CLIO_TANK} defaultBefore={o?.level?.bars ?? 2} lastKm={o?.lastKm ?? null} today={today} />
    </div>
  );
}
