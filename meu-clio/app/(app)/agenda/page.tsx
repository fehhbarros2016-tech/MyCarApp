import type { Metadata } from "next";
import Link from "next/link";
import { AddEventButton } from "@/components/Launchers";
import { EventList, type EventRow } from "@/components/lists/EventList";
import { Icon } from "@/components/ui/Icon";
import { Card, EmptyState, PageHeader, Pill, v } from "@/components/ui/kit";
import { kmStats, upcoming } from "@/lib/calc";
import { countdown, intf } from "@/lib/format";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const s = await getStore();
  if (!s) return null;
  const k = kmStats(s);
  const up = new Map(upcoming(s).map((u) => [u.id, u]));
  const open: EventRow[] = s.events.filter((e) => !e.doneAt).map((e) => {
    const u = up.get(e.id);
    return { ...e, days: u?.days ?? null, kmLeft: u?.kmLeft ?? null, tone: u?.tone ?? "ok" };
  }).sort((a, b) => (a.tone === b.tone ? (a.days ?? 9999) - (b.days ?? 9999) : a.tone === "danger" ? -1 : b.tone === "danger" ? 1 : a.tone === "warn" ? -1 : 1));
  const done: EventRow[] = s.events.filter((e) => e.doneAt).slice(-8).reverse()
    .map((e) => ({ ...e, days: null, kmLeft: null, tone: "ok" as const, done: true }));
  const auto = upcoming(s).filter((u) => u.source !== "evento");
  const autoShown = [...auto.filter((u) => u.source !== "plano"), ...auto.filter((u) => u.source === "plano").slice(0, 4)];
  const AUTO_STYLE: Record<string, { icon: string; c: string }> = {
    parcela: { icon: "receipt", c: "#8fb8ff" }, oleo: { icon: "oil", c: "#e0b15e" }, plano: { icon: "wrench", c: "#5cd6ff" },
    multa: { icon: "alert", c: "#ff8a5c" }, pneu: { icon: "tire", c: "#9aa8c7" },
  };

  return (
    <>
      <PageHeader title="Agenda" sub="Vencimentos e lembretes por data ou por km." back="/mais" action={<AddEventButton lastKm={k.last} />} />

      <div className="auto-row rv" style={v(1)}>
        {autoShown.map((u) => {
          const st = AUTO_STYLE[u.source] ?? { icon: "calendar", c: "#a9b8ae" };
          const when = u.days != null && (u.kmLeft == null || u.days < 60) ? countdown(u.days)
            : u.kmLeft != null ? (u.kmLeft >= 0 ? `faltam ${intf(u.kmLeft)} km` : `passou ${intf(-u.kmLeft)} km`) : "";
          return (
            <Link key={u.id} href={u.href} className="auto-card" data-tone={u.tone}>
              <span className="auto-ic" style={{ "--c": st.c } as React.CSSProperties}><Icon name={st.icon} size={18} /></span>
              <span><b>{u.title}</b><span>{u.source === "parcela" && u.detail ? <><span className="money">{u.detail}</span> · </> : null}{when}</span></span>
              <Pill tone={u.tone === "danger" ? "danger" : u.tone === "warn" ? "warn" : "muted"}>{u.source === "plano" ? "plano" : "auto"}</Pill>
            </Link>
          );
        })}
      </div>

      {open.length ? <EventList rows={open} lastKm={k.last} /> : (
        <Card className="rv" style={v(2)}>
          <EmptyState icon="calendar" text="Nenhum lembrete. Crie para IPVA, seguro, licenciamento, revisão ou troca de óleo. Lembretes que repetem se renovam sozinhos." />
        </Card>
      )}
      <p className="foot-hint rv" style={v(3)}><Icon name="check" size={14} /> Toque no ícone à esquerda para concluir. Se o lembrete repete, o próximo é criado na hora.</p>

      {done.length > 0 && (
        <>
          <div className="section-h rv" style={v(4)}><h2>Concluídos</h2></div>
          <EventList rows={done} lastKm={k.last} />
        </>
      )}
    </>
  );
}
