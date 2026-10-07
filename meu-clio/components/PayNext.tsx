"use client";

import { setInstallmentPaid } from "@/lib/actions";
import { Icon } from "@/components/ui/Icon";
import { useRun } from "@/components/ui/client";

export function PayNextButton({ id, number }: { id: string; number: number }) {
  const { run, busy } = useRun();
  return (
    <button className="btn-primary" disabled={busy}
      onClick={() => run(() => setInstallmentPaid(id, true), { undo: () => setInstallmentPaid(id, false) })}>
      {busy ? <span className="spin" aria-hidden /> : <Icon name="check" size={17} />} Marcar parcela {number} como paga
    </button>
  );
}
