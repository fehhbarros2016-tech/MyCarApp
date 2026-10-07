"use client";

import { useActionState, useState } from "react";
import { deleteEvent, saveEvent, type ActionResult } from "@/lib/actions";
import { Icon } from "@/components/ui/Icon";
import { ConfirmButton, SubmitButton, useActionFeedback, useRun } from "@/components/ui/client";

export const EVENT_KINDS: { value: string; label: string; icon: string; color: string; months?: number; km?: number }[] = [
  { value: "oleo", label: "Troca de óleo", icon: "oil", color: "#e0b15e", km: 10000 },
  { value: "revisao", label: "Revisão", icon: "check", color: "#4fd1c5", months: 12 },
  { value: "seguro", label: "Seguro", icon: "shield", color: "#b49cff", months: 12 },
  { value: "ipva", label: "IPVA", icon: "file", color: "#ffb347", months: 12 },
  { value: "licenciamento", label: "Licenciamento", icon: "badge", color: "#f5d76e", months: 12 },
  { value: "pneus", label: "Pneus", icon: "tire", color: "#9aa8c7" },
  { value: "manutencao", label: "Manutenção", icon: "wrench", color: "#5cd6ff" },
  { value: "multa", label: "Multa", icon: "alert", color: "#ff5a4e" },
  { value: "outros", label: "Outro", icon: "bell", color: "#a9b8ae" },
];
export const kindInfo = (k: string) => EVENT_KINDS.find((e) => e.value === k) ?? EVENT_KINDS[EVENT_KINDS.length - 1];

export type EventInitial = { id?: string; kind?: string; title?: string; dueDate?: string | null; dueKm?: number | null; repeatMonths?: number | null; repeatKm?: number | null; note?: string | null };

export function EventForm({ initial, onDone, lastKm }: { initial?: EventInitial; onDone?: () => void; lastKm?: number | null }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveEvent, {});
  useActionFeedback(state, () => onDone?.());
  const { run } = useRun();
  const [kind, setKind] = useState(initial?.kind ?? "outros");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [rm, setRm] = useState(initial?.repeatMonths ? String(initial.repeatMonths) : "");
  const [rk, setRk] = useState(initial?.repeatKm ? String(initial.repeatKm) : "");
  const [dueKm, setDueKm] = useState(initial?.dueKm != null ? String(initial.dueKm) : "");
  const editing = Boolean(initial?.id);

  const pick = (k: (typeof EVENT_KINDS)[number]) => {
    setKind(k.value);
    if (!title || EVENT_KINDS.some((e) => e.label === title)) setTitle(k.label);
    if (!editing) {
      setRm(k.months ? String(k.months) : "");
      setRk(k.km ? String(k.km) : "");
      if (k.km && lastKm && !dueKm) setDueKm(String(lastKm + k.km));
    }
  };

  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="kind-grid">
        {EVENT_KINDS.map((k) => (
          <button key={k.value} type="button" data-on={kind === k.value} style={{ "--c": k.color } as React.CSSProperties} onClick={() => pick(k)}>
            <Icon name={k.icon} size={18} /><span>{k.label}</span>
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={kind} />
      <label className="field"><span className="lbl">Nome</span>
        <input className="inp" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: IPVA 2027" maxLength={80} /></label>
      <div className="row2">
        <label className="field"><span className="lbl">Data</span>
          <input className="inp" type="date" name="dueDate" defaultValue={initial?.dueDate ?? ""} /></label>
        <label className="field"><span className="lbl">Ou no km</span>
          <input className="inp" name="dueKm" inputMode="numeric" value={dueKm} onChange={(e) => setDueKm(e.target.value)} placeholder="opcional" /></label>
      </div>
      <fieldset className="next-box">
        <legend><Icon name="repeat" size={15} /> Repetir</legend>
        <div className="row2">
          <label className="field"><span className="lbl">A cada (meses)</span>
            <input className="inp" name="repeatMonths" inputMode="numeric" value={rm} onChange={(e) => setRm(e.target.value)} placeholder="não repete" /></label>
          <label className="field"><span className="lbl">A cada (km)</span>
            <input className="inp" name="repeatKm" inputMode="numeric" value={rk} onChange={(e) => setRk(e.target.value)} placeholder="não repete" /></label>
        </div>
      </fieldset>
      <label className="field"><span className="lbl">Observação</span>
        <input className="inp" name="note" defaultValue={initial?.note ?? ""} placeholder="opcional" maxLength={200} /></label>
      <p className="form-err" role="alert">{state.ok === false ? state.error : ""}</p>
      <div className="form-actions">
        {editing && (
          <ConfirmButton onConfirm={async () => { const r = await run(() => deleteEvent(initial!.id!)); if (r.ok) onDone?.(); }}>
            <Icon name="trash" size={16} /> Excluir
          </ConfirmButton>
        )}
        <SubmitButton pending={pending}>{editing ? "Salvar" : "Criar lembrete"}</SubmitButton>
      </div>
    </form>
  );
}
