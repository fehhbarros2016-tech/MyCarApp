"use client";

import { useActionState, useState, type CSSProperties } from "react";
import {
  deleteAnnual, deleteFavorite, deleteFine, deleteRecurring, deleteTrip, restoreAnnual, restoreFavorite, restoreFine,
  restoreRecurring, restoreTrip, saveAnnual, saveFavorite, saveFine, saveTrip, updateRecurring,
} from "@/lib/actions-money";
import type { ActionResult } from "@/lib/actions";
import { todayISO } from "@/lib/format";
import { FINE_LABEL, FINE_POINTS } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";
import { CatIcon } from "@/components/ui/kit";
import { ConfirmButton, Segmented, SubmitButton, useActionFeedback, useRun } from "@/components/ui/client";
import type { CatLite } from "./ExpenseForm";

type Done = { onDone?: () => void };
const money = (v?: number | null) => (v == null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const Err = ({ s }: { s: ActionResult }) => <p className="form-err" role="alert">{s.ok === false ? s.error : ""}</p>;
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function Remove({ del, undo, onDone, label = "Excluir" }: { del: () => Promise<ActionResult>; undo: () => Promise<ActionResult>; onDone?: () => void; label?: string }) {
  const { run } = useRun();
  return <ConfirmButton onConfirm={async () => { const r = await run(del, { undo }); if (r.ok) onDone?.(); }}><Icon name="trash" size={16} /> {label}</ConfirmButton>;
}

function CatChips({ cats, value, onChange }: { cats: CatLite[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field"><span className="lbl">Categoria</span>
      <div className="chips-scroll">
        {cats.filter((c) => !c.archived || c.id === value).map((c) => (
          <button key={c.id} type="button" className="chip" data-on={value === c.id} style={{ "--c": c.color } as CSSProperties} onClick={() => onChange(c.id)}>{c.name}</button>
        ))}
      </div>
      <input type="hidden" name="category" value={value} />
    </div>
  );
}

// ---------------- multas ----------------
export type FineInitial = { id?: string; description?: string; severity?: string; points?: number; occurredOn?: string | null; dueDate?: string | null;
  amount?: number | null; status?: string; note?: string | null };

export function FineForm({ initial, onDone }: Done & { initial?: FineInitial }) {
  const [s, action, pending] = useActionState<ActionResult, FormData>(saveFine, {});
  useActionFeedback(s, () => onDone?.());
  const [sev, setSev] = useState(initial?.severity ?? "media");
  const [status, setStatus] = useState(initial?.status ?? "aberta");
  const [pts, setPts] = useState(String(initial?.points ?? FINE_POINTS[(initial?.severity ?? "media") as keyof typeof FINE_POINTS]));
  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <label className="field"><span className="lbl">O que foi</span>
        <input className="inp" name="description" defaultValue={initial?.description ?? ""} placeholder="Ex.: excesso de velocidade até 20%" maxLength={120} autoFocus={!initial?.id} /></label>
      <div className="field"><span className="lbl">Gravidade</span>
        <div className="sev-grid">
          {(Object.keys(FINE_POINTS) as (keyof typeof FINE_POINTS)[]).map((k) => (
            <button key={k} type="button" data-on={sev === k} data-sev={k} onClick={() => { setSev(k); setPts(String(FINE_POINTS[k])); }}>
              <b>{FINE_LABEL[k]}</b><span>{FINE_POINTS[k]} pts</span>
            </button>
          ))}
        </div>
        <input type="hidden" name="severity" value={sev} />
      </div>
      <div className="row2">
        <label className="field"><span className="lbl">Pontos</span>
          <input className="inp" name="points" inputMode="numeric" value={pts} onChange={(e) => setPts(e.target.value.replace(/\D/g, ""))} /></label>
        <label className="field"><span className="lbl">Valor</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="amount" inputMode="decimal" defaultValue={money(initial?.amount)} placeholder="opcional" /></div></label>
      </div>
      <div className="row2">
        <label className="field"><span className="lbl">Data da infração</span>
          <input className="inp" type="date" name="occurredOn" defaultValue={initial?.occurredOn ?? todayISO()} max={todayISO()} /></label>
        <label className="field"><span className="lbl">Prazo (pagar ou recorrer)</span>
          <input className="inp" type="date" name="dueDate" defaultValue={initial?.dueDate ?? ""} /></label>
      </div>
      <div className="field"><span className="lbl">Situação</span>
        <Segmented value={status} onChange={setStatus} name="status"
          options={[{ value: "aberta", label: "Aberta" }, { value: "recurso", label: "Recurso" }, { value: "paga", label: "Paga" }, { value: "cancelada", label: "Cancelada" }]} /></div>
      {status === "paga" && <p className="muted-s">Com valor, a multa paga entra nos gastos (categoria Multas) uma única vez.</p>}
      <Err s={s} />
      <div className="form-actions">
        {initial?.id && <Remove del={() => deleteFine(initial.id!)} undo={() => restoreFine(initial.id!)} onDone={onDone} />}
        <SubmitButton pending={pending}>{initial?.id ? "Salvar" : "Registrar multa"}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------- viagens ----------------
export type TripInitial = { id?: string; name?: string; startDate?: string; endDate?: string | null; startKm?: number | null; endKm?: number | null; note?: string | null };

export function TripForm({ initial, onDone, lastKm }: Done & { initial?: TripInitial; lastKm?: number | null }) {
  const [s, action, pending] = useActionState<ActionResult, FormData>(saveTrip, {});
  useActionFeedback(s, () => onDone?.());
  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <label className="field"><span className="lbl">Nome</span>
        <input className="inp" name="name" defaultValue={initial?.name ?? ""} placeholder="Ex.: Praia no feriado" maxLength={80} autoFocus={!initial?.id} /></label>
      <div className="row2">
        <label className="field"><span className="lbl">Ida</span>
          <input className="inp" type="date" name="startDate" defaultValue={initial?.startDate ?? todayISO()} /></label>
        <label className="field"><span className="lbl">Volta</span>
          <input className="inp" type="date" name="endDate" defaultValue={initial?.endDate ?? ""} /></label>
      </div>
      <div className="row2">
        <label className="field"><span className="lbl">Km na saída</span>
          <input className="inp" name="startKm" inputMode="numeric" defaultValue={initial?.startKm ?? lastKm ?? ""} /></label>
        <label className="field"><span className="lbl">Km na chegada</span>
          <input className="inp" name="endKm" inputMode="numeric" defaultValue={initial?.endKm ?? ""} placeholder="ao voltar" /></label>
      </div>
      <label className="field"><span className="lbl">Observação</span>
        <input className="inp" name="note" defaultValue={initial?.note ?? ""} placeholder="opcional" maxLength={280} /></label>
      <p className="muted-s">Enquanto a viagem estiver ativa, novos gastos e abastecimentos já vêm marcados nela.</p>
      <Err s={s} />
      <div className="form-actions">
        {initial?.id && <Remove label="Remover" del={() => deleteTrip(initial.id!)} undo={() => restoreTrip(initial.id!)} onDone={onDone} />}
        <SubmitButton pending={pending}>{initial?.id ? "Salvar" : "Começar viagem"}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------- gasto anual ----------------
export type AnnualInitial = { id?: string; name?: string; amount?: number; dueMonth?: number; categoryId?: string | null; note?: string | null };

export function AnnualForm({ initial, onDone, categories }: Done & { initial?: AnnualInitial; categories: CatLite[] }) {
  const [s, action, pending] = useActionState<ActionResult, FormData>(saveAnnual, {});
  useActionFeedback(s, () => onDone?.());
  const [month, setMonth] = useState(initial?.dueMonth ?? Number(todayISO().slice(5, 7)));
  const [cat, setCat] = useState(initial?.categoryId ?? "");
  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="row2">
        <label className="field"><span className="lbl">Nome</span>
          <input className="inp" name="name" defaultValue={initial?.name ?? ""} placeholder="Ex.: Seguro" maxLength={60} /></label>
        <label className="field"><span className="lbl">Valor aproximado</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="amount" inputMode="decimal" defaultValue={money(initial?.amount)} placeholder="0,00" /></div></label>
      </div>
      <div className="field"><span className="lbl">Mês em que vence</span>
        <div className="month-grid">
          {MONTHS.map((m, i) => <button key={m} type="button" data-on={month === i + 1} onClick={() => setMonth(i + 1)}>{m}</button>)}
        </div>
        <input type="hidden" name="dueMonth" value={month} />
      </div>
      <CatChips cats={categories} value={cat} onChange={setCat} />
      <p className="muted-s">A categoria serve para o app saber quando você já pagou no ano.</p>
      <Err s={s} />
      <div className="form-actions">
        {initial?.id && <Remove label="Remover" del={() => deleteAnnual(initial.id!)} undo={() => restoreAnnual(initial.id!)} onDone={onDone} />}
        <SubmitButton pending={pending}>Salvar</SubmitButton>
      </div>
    </form>
  );
}

// ---------------- favorito ----------------
export type FavInitial = { id?: string; label?: string; amount?: number; categoryId?: string; note?: string | null; vendor?: string | null };

export function FavoriteForm({ initial, onDone, categories }: Done & { initial?: FavInitial; categories: CatLite[] }) {
  const [s, action, pending] = useActionState<ActionResult, FormData>(saveFavorite, {});
  useActionFeedback(s, () => onDone?.());
  const [cat, setCat] = useState(initial?.categoryId ?? "");
  const c = categories.find((x) => x.id === cat);
  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="fav-preview">{c ? <CatIcon icon={c.icon} color={c.color} size={38} /> : <span className="cat-ic" style={{ width: 38, height: 38, "--c": "#a9b8ae" } as CSSProperties}><Icon name="star" size={19} /></span>}
        <span>Aparece como botão de um toque no +</span></div>
      <div className="row2">
        <label className="field"><span className="lbl">Nome do botão</span>
          <input className="inp" name="label" defaultValue={initial?.label ?? ""} placeholder="Ex.: Lavagem" maxLength={40} /></label>
        <label className="field"><span className="lbl">Valor</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="amount" inputMode="decimal" defaultValue={money(initial?.amount)} placeholder="0,00" /></div></label>
      </div>
      <CatChips cats={categories} value={cat} onChange={setCat} />
      <div className="row2">
        <label className="field"><span className="lbl">Observação</span>
          <input className="inp" name="note" defaultValue={initial?.note ?? ""} placeholder="opcional" maxLength={280} /></label>
        <label className="field"><span className="lbl">Local</span>
          <input className="inp" name="vendor" defaultValue={initial?.vendor ?? ""} placeholder="opcional" maxLength={80} /></label>
      </div>
      <Err s={s} />
      <div className="form-actions">
        {initial?.id && <Remove label="Remover" del={() => deleteFavorite(initial.id!)} undo={() => restoreFavorite(initial.id!)} onDone={onDone} />}
        <SubmitButton pending={pending}>Salvar favorito</SubmitButton>
      </div>
    </form>
  );
}

// ---------------- recorrente ----------------
export type RecInitial = { id: string; amount: number; categoryId: string; note: string | null; frequency: string; nextDate: string; endDate: string | null };

export function RecurringForm({ initial, onDone, categories }: Done & { initial: RecInitial; categories: CatLite[] }) {
  const [s, action, pending] = useActionState<ActionResult, FormData>(updateRecurring, {});
  useActionFeedback(s, () => onDone?.());
  const [cat, setCat] = useState(initial.categoryId);
  const [freq, setFreq] = useState(initial.frequency);
  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="id" value={initial.id} />
      <div className="row2">
        <label className="field"><span className="lbl">Valor</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="amount" inputMode="decimal" defaultValue={money(initial.amount)} /></div></label>
        <label className="field"><span className="lbl">Observação</span>
          <input className="inp" name="note" defaultValue={initial.note ?? ""} maxLength={280} /></label>
      </div>
      <div className="field"><span className="lbl">Frequência</span>
        <Segmented value={freq} onChange={setFreq} name="frequency" options={[{ value: "semanal", label: "Semanal" }, { value: "mensal", label: "Mensal" }, { value: "anual", label: "Anual" }]} /></div>
      <div className="row2">
        <label className="field"><span className="lbl">Próximo lançamento</span>
          <input className="inp" type="date" name="nextDate" defaultValue={initial.nextDate} min={todayISO()} /></label>
        <label className="field"><span className="lbl">Termina em</span>
          <input className="inp" type="date" name="endDate" defaultValue={initial.endDate ?? ""} /></label>
      </div>
      <CatChips cats={categories} value={cat} onChange={setCat} />
      <p className="muted-s">Mudanças valem para os próximos lançamentos. Os que já entraram continuam iguais.</p>
      <Err s={s} />
      <div className="form-actions">
        <Remove label="Encerrar" del={() => deleteRecurring(initial.id)} undo={() => restoreRecurring(initial.id)} onDone={onDone} />
        <SubmitButton pending={pending}>Salvar</SubmitButton>
      </div>
    </form>
  );
}
