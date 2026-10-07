"use client";

import { useState, type CSSProperties } from "react";
import { setInstallmentPaid } from "@/lib/actions";
import { brl, dateBR, daysUntil, todayISO } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Sheet, useRun } from "@/components/ui/client";
import { InstallmentForm, type InstallmentLite } from "@/components/forms/InstallmentForms";

export function InstallmentList({ items }: { items: InstallmentLite[] }) {
  const [open, setOpen] = useState<InstallmentLite | null>(null);
  const [showPaid, setShowPaid] = useState(false);
  const { run, busy } = useRun();
  const today = todayISO();
  const paid = items.filter((i) => i.paidAt);
  const list = showPaid ? items : items.filter((i) => !i.paidAt);

  return (
    <>
      <div className="inst-toolbar">
        <button className="link-btn" onClick={() => setShowPaid((v) => !v)}>
          <Icon name={showPaid ? "eyeOff" : "eye"} size={14} /> {showPaid ? "Ocultar pagas" : `Mostrar ${paid.length} pagas`}
        </button>
      </div>
      <ul className="inst-list">
        {list.map((i, idx) => {
          const late = !i.paidAt && i.dueDate < today;
          const d = daysUntil(i.dueDate, today);
          const status = i.paidAt ? "paga" : late ? "atrasada" : d <= 7 ? "em breve" : "a vencer";
          return (
            <li key={i.id} className="rv" style={{ "--i": Math.min(idx, 10) } as CSSProperties} data-state={i.paidAt ? "paid" : late ? "late" : d <= 7 ? "soon" : "open"}>
              <button className="inst-check" disabled={busy} aria-label={i.paidAt ? `Desmarcar parcela ${i.number}` : `Marcar parcela ${i.number} como paga`}
                onClick={() => run(() => setInstallmentPaid(i.id, !i.paidAt), { undo: () => setInstallmentPaid(i.id, Boolean(i.paidAt)) })}>
                <Icon name="check" size={16} />
              </button>
              <button className="inst-main" onClick={() => setOpen(i)}>
                <span className="inst-n num">{String(i.number).padStart(2, "0")}</span>
                <span className="inst-t"><b>{i.paidAt ? `Paga em ${dateBR(i.paidAt)}` : `Vence ${dateBR(i.dueDate)}`}</b><span>{i.note ?? status}</span></span>
                <span className="inst-v money num">{brl(i.amount)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open ? `Parcela ${open.number}` : ""}>
        {open && <InstallmentForm item={open} onDone={() => setOpen(null)} />}
      </Sheet>
    </>
  );
}
