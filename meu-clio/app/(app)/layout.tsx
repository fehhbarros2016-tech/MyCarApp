import type { CSSProperties } from "react";
import { Sidebar, TabBar } from "@/components/nav/Nav";
import { QuickAdd } from "@/components/QuickAdd";
import { ToastProvider } from "@/components/ui/client";
import { alerts, installmentsSummary, kmStats } from "@/lib/calc";
import { catsLite } from "@/lib/rows";
import { ACCENTS, DEFAULT_SETTINGS } from "@/lib/settings";
import { getStore } from "@/lib/store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getStore();
  const st = s?.settings ?? DEFAULT_SETTINGS;
  const pending = s ? alerts(s).filter((a) => a.tone === "danger" || a.tone === "warn").length : 0;
  const next = s ? installmentsSummary(s).next : null;
  return (
    <ToastProvider>
      <div className="app" data-motion={st.motion} data-private={st.hideValues} data-countup={st.countUp}
        style={{ "--accent": ACCENTS[st.accent] } as CSSProperties}>
        {st.ambient && st.motion !== "off" && <div className="ambient" aria-hidden />}
        <div className="shell">
          <Sidebar name={s?.name ?? null} />
          <main className="main">{children}</main>
        </div>
        <TabBar alerts={pending} />
        {s && (
          <QuickAdd categories={catsLite(s)} lastKm={kmStats(s).last}
            nextInstallment={next ? { id: next.id, number: next.number, amount: next.amount } : null} />
        )}
      </div>
    </ToastProvider>
  );
}
