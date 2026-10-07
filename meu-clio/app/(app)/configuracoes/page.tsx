import type { Metadata } from "next";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { PageHeader } from "@/components/ui/kit";
import { APP_ENV } from "@/lib/env";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const [s, sp] = await Promise.all([getStore(), searchParams]);
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
        vehicle={{ name: v.name, heroWord: v.heroWord, make: v.make, model: v.model, year: v.year, plate: v.plate,
          initialKm: v.initialKm, purchaseDate: v.purchaseDate, tankL: v.tankL, bars: v.bars }}
        counts={{
          expenses: s.expenses.length, fuel: s.expenses.filter((e) => e.fuel).length, installments: s.installments.length,
          events: s.events.length, categories: s.categories.filter((c) => !c.archived).length, custom: s.categories.filter((c) => c.custom).length,
        }}
      />
    </div>
  );
}
