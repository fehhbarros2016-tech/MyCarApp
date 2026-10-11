import { cookies } from "next/headers";
import { Suspense } from "react";
import { Sidebar, TabBar } from "@/components/nav/Nav";
import { QuickAdd } from "@/components/QuickAdd";
import { LockScreen } from "@/components/security/LockScreen";
import { SWRegister } from "@/components/system/SWRegister";
import { ToastProvider } from "@/components/ui/client";
import { alerts, installmentsSummary } from "@/lib/calc";
import { todayISO } from "@/lib/format";
import { kmStats } from "@/lib/km";
import { catsLite } from "@/lib/rows";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { getStore } from "@/lib/store";
import { APP_VERSION_LABEL } from "@/lib/version";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [s, jar] = await Promise.all([getStore(), cookies()]);
  const st = s?.settings ?? DEFAULT_SETTINGS;
  const pending = s ? alerts(s).filter((a) => a.tone === "danger" || a.tone === "warn").length : 0;
  const next = s ? installmentsSummary(s).next : null;
  const today = todayISO();
  const trip = s?.trips.find((t) => t.startDate <= today && (!t.endDate || t.endDate >= today)) ?? null;
  const locked = jar.get("mc_lock")?.value === "1";
  return (
    <ToastProvider>
      <div className="app" data-motion={st.motion} data-private={st.hideValues} data-countup={st.countUp}>
        {st.ambient && st.motion !== "off" && <div className="ambient" data-k={st.ambientStrength} aria-hidden />}
        <div className="shell">
          <Sidebar name={s?.name ?? null} car={s?.vehicle.name ?? null} version={APP_VERSION_LABEL} />
          <main className="main">{children}</main>
        </div>
        <TabBar alerts={pending} />
        {s && (
          <Suspense fallback={null}><QuickAdd categories={catsLite(s)} lastKm={kmStats(s).last}
            nextInstallment={next ? { id: next.id, number: next.number, amount: next.amount } : null}
            favorites={s.favorites.map((f) => ({ id: f.id, label: f.label, amount: f.amount, color: s.catById.get(f.categoryId)?.color ?? "#a9b8ae", icon: s.catById.get(f.categoryId)?.icon ?? "box" }))}
            trip={trip ? { id: trip.id, name: trip.name } : null}
            shops={s.shops.map((x) => ({ id: x.id, name: x.name, kind: x.kind }))}
            odo={s.odoManual.slice(-6).reverse().map((o) => ({ id: o.id!, date: o.date, km: o.km }))} /></Suspense>
        )}
        <LockScreen initiallyLocked={locked} lockAfterMin={st.lockAfterMin} />
        <SWRegister />
      </div>
    </ToastProvider>
  );
}
