"use client";

import { useState, type CSSProperties } from "react";
import { completeEvent, reopenEvent } from "@/lib/actions";
import { countdown, dateFull } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Sheet, useRun } from "@/components/ui/client";
import { EventForm, kindInfo, type EventInitial } from "@/components/forms/EventForm";

export type EventRow = EventInitial & { id: string; days: number | null; kmLeft: number | null; tone: "danger" | "warn" | "ok"; done?: boolean };

export function EventList({ rows, lastKm }: { rows: EventRow[]; lastKm: number | null }) {
  const [open, setOpen] = useState<EventRow | null>(null);
  const { run, busy } = useRun();
  return (
    <>
      <ul className="ev-list">
        {rows.map((r, i) => {
          const k = kindInfo(r.kind ?? "outros");
          const when = r.days != null ? countdown(r.days) : r.kmLeft != null ? (r.kmLeft >= 0 ? `faltam ${r.kmLeft.toLocaleString("pt-BR")} km` : `passou ${Math.abs(r.kmLeft).toLocaleString("pt-BR")} km`) : "";
          return (
            <li key={r.id} className="rv" style={{ "--i": Math.min(i, 10), "--c": k.color } as CSSProperties} data-tone={r.tone} data-done={r.done}>
              <button className="ev-ic" disabled={busy} aria-label={r.done ? "Reabrir" : `Concluir ${r.title}`}
                onClick={() => run(() => (r.done ? reopenEvent(r.id) : completeEvent(r.id)))}>
                <Icon name={r.done ? "undo" : k.icon} size={18} />
                {!r.done && <span className="ev-done"><Icon name="check" size={16} /></span>}
              </button>
              <button className="ev-main" onClick={() => setOpen(r)}>
                <span className="ev-t">
                  <b>{r.title}</b>
                  <span>
                    {[r.dueDate ? dateFull(r.dueDate) : null, r.dueKm != null ? `${r.dueKm.toLocaleString("pt-BR")} km` : null,
                      r.repeatMonths ? `a cada ${r.repeatMonths} ${r.repeatMonths === 1 ? "mês" : "meses"}` : null,
                      r.repeatKm ? `a cada ${r.repeatKm.toLocaleString("pt-BR")} km` : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {!r.done && <span className="ev-when" data-tone={r.tone}>{when}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title="Editar lembrete">
        {open && <EventForm initial={open} lastKm={lastKm} onDone={() => setOpen(null)} />}
      </Sheet>
    </>
  );
}
