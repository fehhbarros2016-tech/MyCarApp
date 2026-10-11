import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchBox } from "@/components/SearchBox";
import { PageHeader } from "@/components/ui/kit";
import { entries } from "@/lib/calc";
import { todayISO } from "@/lib/format";
import { kmStats } from "@/lib/km";
import { activeTrip, catsLite, shopsLite, toRows } from "@/lib/rows";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Buscar" };
export const dynamic = "force-dynamic";

export default async function BuscarPage() {
  const s = await getStore();
  if (!s) return null;
  return (
    <>
      <PageHeader title="Buscar" back="/gastos" />
      <Suspense fallback={null}>
        <SearchBox rows={toRows(s, entries(s))} categories={catsLite(s)} lastKm={kmStats(s).last} shops={shopsLite(s)} trip={activeTrip(s, todayISO())} />
      </Suspense>
    </>
  );
}
