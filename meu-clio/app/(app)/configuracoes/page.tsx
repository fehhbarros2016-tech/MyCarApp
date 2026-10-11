import type { Metadata } from "next";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { PageHeader } from "@/components/ui/kit";
import { listBackups } from "@/lib/backup";
import { APP_ENV } from "@/lib/env";
import { mediaUrl } from "@/lib/media-url";
import { oilPlanItem } from "@/lib/plan";
import { pushPublicKey } from "@/lib/push";
import { getStore } from "@/lib/store";
import { APP_VERSION_LABEL, CHANGELOG } from "@/lib/version";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const [s, sp, backups] = await Promise.all([getStore(), searchParams, listBackups().catch(() => [])]);
  if (!s) return null;
  const v = s.vehicle;
  return (
    <div className="settings">
      <PageHeader title="Configurações" sub="Tudo aqui é salvo na hora e nada apaga seus registros." back="/mais" />
      <SettingsPanel
        initialTab={sp.t}
        settings={s.settings}
        name={s.name ?? ""}
        env={APP_ENV}
        version={APP_VERSION_LABEL}
        changelog={CHANGELOG}
        pushKey={pushPublicKey()}
        pushDevices={s.pushDevices}
        backups={backups.map((b) => ({ path: b.path, name: b.name, kind: b.kind, size: b.size }))}
        oilInPlan={Boolean(oilPlanItem(s))}
        vehicles={s.vehicles.map((x) => ({ id: x.id, name: x.name, active: x.id === v.id }))}
        vehicle={{ id: v.id, name: v.name, heroWord: v.heroWord, make: v.make, model: v.model, year: v.year, plate: v.plate,
          initialKm: v.initialKm, purchaseDate: v.purchaseDate, tankL: v.tankL, bars: v.bars, image: mediaUrl(v.imagePath), photoStyle: v.photoStyle }}
        counts={{
          expenses: s.expenses.length, fuel: s.expenses.filter((e) => e.fuel).length, installments: s.installments.length,
          events: s.events.length, categories: s.categories.filter((c) => !c.archived).length, custom: s.categories.filter((c) => c.custom).length,
          parts: s.parts.length, plan: s.plan.length,
        }}
      />
    </div>
  );
}
