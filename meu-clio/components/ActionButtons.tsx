"use client";

// Botões de um toque que chamam ações do servidor (com aviso e, quando dá, "Desfazer").
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { applyPlanTemplate, archiveVehicle, quickCalibration, reopenIssue, setActiveVehicle } from "@/lib/actions-car";
import { endTrip, pauseRecurring, setCategoryBudget } from "@/lib/actions-money";
import { savePrefs } from "@/lib/actions";
import { Icon } from "@/components/ui/Icon";
import { ConfirmButton, useRun, useToast } from "@/components/ui/client";

export function ApplyTemplateButton({ className = "btn-primary" }: { className?: string }) {
  const { run, busy } = useRun();
  return <button className={className} disabled={busy} onClick={() => run(applyPlanTemplate)}>{busy ? <span className="spin" /> : <Icon name="sparkle" size={16} />}Usar plano sugerido</button>;
}

export function CalibrateButton({ front, rear, className = "btn-ghost sm", children }: { front?: number | null; rear?: number | null; className?: string; children?: ReactNode }) {
  const { run, busy } = useRun();
  return <button className={className} disabled={busy} onClick={() => run(() => quickCalibration(front ?? null, rear ?? null))}>{busy ? <span className="spin" /> : <Icon name="check" size={15} />}{children ?? "Calibrei hoje"}</button>;
}

export function ReopenIssueButton({ id }: { id: string }) {
  const { run, busy } = useRun();
  return <button className="link-btn" disabled={busy} onClick={() => run(() => reopenIssue(id))}><Icon name="undo" size={14} /> Reabrir</button>;
}

export function EndTripButton({ id, lastKm }: { id: string; lastKm: number | null }) {
  const { run, busy } = useRun();
  const [km, setKm] = useState(lastKm ? String(lastKm) : "");
  return (
    <div className="inline-form">
      <input className="inp" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} placeholder="km na chegada" aria-label="Km na chegada" />
      <button className="btn-primary sm" disabled={busy} onClick={() => run(() => endTrip(id, km ? Number(km) : null))}><Icon name="flag" size={15} />Encerrar</button>
    </div>
  );
}

export function PauseButton({ id, paused }: { id: string; paused: boolean }) {
  const { run, busy } = useRun();
  return (
    <button className="icon-btn sm" disabled={busy} aria-label={paused ? "Retomar" : "Pausar"} onClick={() => run(() => pauseRecurring(id, !paused))}>
      <Icon name={paused ? "play" : "pause"} size={14} />
    </button>
  );
}

export function ActivateVehicleButton({ id, className = "btn-ghost sm" }: { id: string; className?: string }) {
  const { run, busy } = useRun();
  const router = useRouter();
  return <button className={className} disabled={busy} onClick={async () => { const r = await run(() => setActiveVehicle(id)); if (r.ok) router.push("/"); }}><Icon name="swap" size={15} />Usar este</button>;
}

export function ArchiveVehicleButton({ id }: { id: string }) {
  const { run } = useRun();
  return <ConfirmButton className="btn-danger sm" confirmText="Confirmar" onConfirm={() => run(() => archiveVehicle(id))}>Arquivar</ConfirmButton>;
}

/** Limite mensal de uma categoria, editável na própria linha. */
export function BudgetInput({ id, value }: { id: string; value: number | null }) {
  const [v, setV] = useState(value ? String(value).replace(".", ",") : "");
  const [saved, setSaved] = useState(value);
  const toast = useToast();
  const save = async () => {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    const next = v.trim() && n > 0 ? n : null;
    if (next === saved) return;
    const r = await setCategoryBudget(id, next);
    if (r.ok) { setSaved(next); toast(r.msg ?? "Salvo"); } else toast(r.error ?? "Erro", { tone: "error" });
  };
  return (
    <div className="inp-pre budget-inp">
      <b>R$</b>
      <input className="inp" inputMode="decimal" value={v} placeholder="sem limite" onChange={(e) => setV(e.target.value)}
        onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} aria-label="Limite mensal" />
    </div>
  );
}

/** Salário líquido mensal (só para comparar com o custo do carro). */
export function IncomeInput({ value }: { value: number | null }) {
  const [v, setV] = useState(value ? value.toLocaleString("pt-BR") : "");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <form className="inline-form" onSubmit={async (e) => {
      e.preventDefault();
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      setBusy(true);
      const r = await savePrefs({ monthlyIncome: n > 0 ? n : null });
      setBusy(false);
      toast(r.ok ? (n > 0 ? "Salário salvo" : "Salário removido") : r.error ?? "Erro", r.ok ? undefined : { tone: "error" });
    }}>
      <div className="inp-pre"><b>R$</b><input className="inp" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} placeholder="salário líquido" aria-label="Salário líquido mensal" /></div>
      <button className="btn-primary sm" disabled={busy}>{busy && <span className="spin" />}Salvar</button>
    </form>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const toast = useToast();
  return (
    <button type="button" className="icon-btn sm" aria-label={`Copiar ${label}`} onClick={async () => {
      try { await navigator.clipboard.writeText(text); toast(`${label} copiado`); } catch { toast("Não consegui copiar", { tone: "error" }); }
    }}><Icon name="copy" size={14} /></button>
  );
}
