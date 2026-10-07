import type { Metadata } from "next";
import Link from "next/link";
import { AddEventButton } from "@/components/Launchers";
import { EventList, type EventRow } from "@/components/lists/EventList";
import { Icon } from "@/components/ui/Icon";
import { Card, EmptyState, Money, PageHeader, Pill, v } from "@/components/ui/kit";
import { installmentsSummary, kmStats, oilStatus, upcoming } from "@/lib/calc";
import { countdown, daysUntil, intf } from "@/lib/format";
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
  const inst = installmentsSummary(s);
  const oil = oilStatus(s);
  const hasOilEvent = s.events.some((e) => !e.doneAt && e.kind === "oleo");

  return (
    <>
      <PageHeader title="Agenda" sub="Vencimentos e lembretes por data ou por km." back="/mais" action={<AddEventButton lastKm={k.last} />} />

      <div className="auto-row rv" style={v(1)}>
        {inst.next && (
          <Link href="/parcelas" className="auto-card">
            <span className="auto-ic" style={{ "--c": "#8fb8ff" } as React.CSSProperties}><Icon name="receipt" size={18} /></span>
            <span><b>Parcela {inst.next.number}</b><span><Money value={inst.next.amount} /> · {countdown(daysUntil(inst.next.dueDate))}</span></span>
            <Pill tone={inst.overdue.length ? "danger" : "muted"}>auto</Pill>
          </Link>
        )}
        {oil && !hasOilEvent && (
          <Link href="/manutencao" className="auto-card">
            <span className="auto-ic" style={{ "--c": "#e0b15e" } as React.CSSProperties}><Icon name="oil" size={18} /></span>
            <span><b>Troca de óleo</b><span>{oil.leftKm != null ? (oil.leftKm >= 0 ? `faltam ${intf(oil.leftKm)} km` : `passou ${intf(-oil.leftKm)} km`) : `aos ${intf(oil.nextKm)} km`}</span></span>
            <Pill tone="muted">auto</Pill>
          </Link>
        )}
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
