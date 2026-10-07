"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useState, type CSSProperties } from "react";
import { saveOdometer, setInstallmentPaid, type ActionResult } from "@/lib/actions";
import { brl } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Sheet, SubmitButton, useActionFeedback, useRun } from "@/components/ui/client";
import { ExpenseForm, type CatLite } from "@/components/forms/ExpenseForm";
import { MaintenanceForm } from "@/components/forms/MaintenanceForm";
import { EventForm } from "@/components/forms/EventForm";

type Mode = null | "menu" | "gasto" | "manut" | "lembrete" | "km";

export function OdometerForm({ lastKm, onDone }: { lastKm: number | null; onDone?: () => void }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveOdometer, {});
  useActionFeedback(state, () => onDone?.());
  return (
    <form action={action} className="form" noValidate>
      <label className="amount-field">
        <input name="km" inputMode="numeric" placeholder={lastKm ? lastKm.toLocaleString("pt-BR") : "0"} autoFocus aria-label="Km do painel" />
        <span>km</span>
      </label>
      {lastKm != null && <p className="sum-line">Última leitura: <b>{lastKm.toLocaleString("pt-BR")} km</b></p>}
      <p className="form-err" role="alert">{state.ok === false ? state.error : ""}</p>
      <div className="form-actions"><SubmitButton pending={pending}>Salvar km</SubmitButton></div>
    </form>
  );
}

export function QuickAdd({ categories, lastKm, nextInstallment }: {
  categories: CatLite[]; lastKm: number | null; nextInstallment: { id: string; number: number; amount: number } | null;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const path = usePathname();
  const { run, busy } = useRun();
  const close = () => setMode(null);
  if (path.startsWith("/combustivel/novo") || path.startsWith("/combustivel/nivel") || path.startsWith("/configuracoes")) return null;

  const items: { key: string; icon: string; label: string; sub: string; color: string; onClick?: () => void; href?: string }[] = [
    { key: "gasto", icon: "wallet", label: "Gasto", sub: "Qualquer despesa", color: "var(--accent)", onClick: () => setMode("gasto") },
    { key: "fuel", icon: "fuel", label: "Abastecimento", sub: "Com o marcador", color: "#6ef095", href: "/combustivel/novo" },
    { key: "manut", icon: "wrench", label: "Manutenção", sub: "Peças e serviço", color: "#5cd6ff", onClick: () => setMode("manut") },
    { key: "nivel", icon: "gauge", label: "Nível do tanque", sub: "Marcar agora", color: "#c4f25a", href: "/combustivel/nivel" },
    { key: "km", icon: "road", label: "Quilometragem", sub: "Km do painel", color: "#7aa7ff", onClick: () => setMode("km") },
    { key: "lembrete", icon: "bell", label: "Lembrete", sub: "Data ou km", color: "#ffc35a", onClick: () => setMode("lembrete") },
  ];

  return (
    <>
      <button className="fab" onClick={() => setMode("menu")} aria-label="Adicionar"><Icon name="plus" size={26} /></button>
      <Sheet open={mode === "menu"} onClose={close} title="Registrar">
        {nextInstallment && (
          <button className="pay-next" disabled={busy} onClick={async () => {
            const r = await run(() => setInstallmentPaid(nextInstallment.id, true), { undo: () => setInstallmentPaid(nextInstallment.id, false) });
            if (r.ok) close();
          }}>
            <Icon name="receipt" size={18} />
            <span>Marcar parcela {nextInstallment.number} como paga</span>
            <b className="money">{brl(nextInstallment.amount)}</b>
          </button>
        )}
        <div className="quick-grid">
          {items.map((i) => {
            const inner = (<><span className="q-ic" style={{ "--c": i.color } as CSSProperties}><Icon name={i.icon} size={22} /></span><b>{i.label}</b><span>{i.sub}</span></>);
            return i.href
              ? <Link key={i.key} href={i.href} className="q-item" onClick={close}>{inner}</Link>
              : <button key={i.key} type="button" className="q-item" onClick={i.onClick}>{inner}</button>;
          })}
        </div>
      </Sheet>
      <Sheet open={mode === "gasto"} onClose={close} title="Novo gasto">
        <ExpenseForm categories={categories} onDone={close} lastKm={lastKm} />
      </Sheet>
      <Sheet open={mode === "manut"} onClose={close} title="Nova manutenção">
        <MaintenanceForm categories={categories} onDone={close} lastKm={lastKm} />
      </Sheet>
      <Sheet open={mode === "lembrete"} onClose={close} title="Novo lembrete">
        <EventForm onDone={close} lastKm={lastKm} />
      </Sheet>
      <Sheet open={mode === "km"} onClose={close} title="Quilometragem atual">
        <OdometerForm lastKm={lastKm} onDone={close} />
      </Sheet>
    </>
  );
}
