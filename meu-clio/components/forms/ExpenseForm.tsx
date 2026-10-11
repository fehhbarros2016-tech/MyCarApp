"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, type CSSProperties } from "react";
import { deleteExpense, restoreExpense, saveExpense, type ActionResult } from "@/lib/actions";
import { todayISO } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { CatIcon } from "@/components/ui/kit";
import { ConfirmButton, Segmented, SubmitButton, Switch, useActionFeedback, useRun } from "@/components/ui/client";

export type CatLite = { id: string; slug: string; name: string; icon: string; color: string; archived?: boolean };
export type TripLite = { id: string; name: string };
export type ExpenseInitial = {
  id?: string; amount?: number; categoryId?: string; date?: string; km?: number | null; vendor?: string | null; note?: string | null;
  tripId?: string | null; recurring?: boolean;
};

const fmt = (v?: number) => (v == null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
type Repeat = "" | "semanal" | "mensal" | "anual";

export function ExpenseForm({ categories, initial, onDone, lastKm, trip }: {
  categories: CatLite[]; initial?: ExpenseInitial; onDone?: () => void; lastKm?: number | null; trip?: TripLite | null;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveExpense, {});
  useActionFeedback(state, () => onDone?.());
  const { run } = useRun();
  const visible = useMemo(() => categories.filter((c) => !c.archived || c.id === initial?.categoryId), [categories, initial?.categoryId]);
  const [cat, setCat] = useState(initial?.categoryId ?? "");
  const [amount, setAmount] = useState(fmt(initial?.amount));
  const editing = Boolean(initial?.id);
  const [more, setMore] = useState(Boolean(initial?.vendor || initial?.km));
  const [repeat, setRepeat] = useState<Repeat>("");
  const [fav, setFav] = useState(false);
  const [inTrip, setInTrip] = useState(Boolean(editing ? initial?.tripId : trip));
  const chosen = visible.find((c) => c.id === cat);
  const tripId = inTrip ? (editing ? initial?.tripId ?? trip?.id : trip?.id) ?? null : null;

  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <label className="amount-field" style={chosen ? ({ "--c": chosen.color } as CSSProperties) : undefined}>
        <span>R$</span>
        <input name="amount" id="amount" inputMode="decimal" placeholder="0,00" autoComplete="off" value={amount}
          onChange={(e) => setAmount(e.target.value)} autoFocus={!editing} aria-label="Valor" />
      </label>

      <div className="field">
        <span className="lbl">Categoria</span>
        <div className="cat-grid" role="radiogroup" aria-label="Categoria">
          {visible.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={cat === c.id} data-on={cat === c.id}
              style={{ "--c": c.color } as CSSProperties} onClick={() => setCat(c.id)}>
              <CatIcon icon={c.icon} color={c.color} size={36} />
              <span>{c.name}</span>
            </button>
          ))}
          <Link href="/configuracoes/categorias" className="cat-new"><span className="cat-ic"><Icon name="plus" size={18} /></span><span>Nova</span></Link>
        </div>
        <input type="hidden" name="category" value={cat} />
      </div>

      {chosen?.slug === "combustivel" && !editing && (
        <Link href="/combustivel/novo" className="hint-link">
          <Icon name="gauge" size={16} /> Usar o marcador do tanque para calcular litros e consumo <Icon name="chevron" size={14} />
        </Link>
      )}

      <div className="row2">
        <label className="field"><span className="lbl">Data</span>
          <input className="inp" type="date" name="date" defaultValue={initial?.date ?? todayISO()} max={todayISO()} /></label>
        <label className="field"><span className="lbl">Observação</span>
          <input className="inp" name="note" defaultValue={initial?.note ?? ""} placeholder="opcional" maxLength={280} /></label>
      </div>

      {(trip || initial?.tripId) && (
        <div className="switch-row">
          <div><b><Icon name="map" size={14} /> {trip ? trip.name : "Viagem"}</b><span>{inTrip ? "Este gasto entra na viagem" : "Fora da viagem"}</span></div>
          <Switch checked={inTrip} onChange={setInTrip} label="Marcar na viagem" />
        </div>
      )}
      {tripId && <input type="hidden" name="trip" value={tripId} />}

      {more ? (
        <div className="row2">
          <label className="field"><span className="lbl">Km do painel</span>
            <input className="inp" name="km" inputMode="numeric" defaultValue={initial?.km ?? ""} placeholder={lastKm ? lastKm.toLocaleString("pt-BR") : "opcional"} /></label>
          <label className="field"><span className="lbl">Local</span>
            <input className="inp" name="vendor" defaultValue={initial?.vendor ?? ""} placeholder="posto, loja…" maxLength={80} /></label>
        </div>
      ) : (
        <button type="button" className="link-btn" onClick={() => setMore(true)}><Icon name="plus" size={14} /> Km e local</button>
      )}

      {!editing && (
        <div className="opt-box">
          <div className="field">
            <span className="lbl"><Icon name="repeat" size={12} /> Repetir este gasto</span>
            <Segmented<Repeat> value={repeat} onChange={setRepeat} name="repeat"
              options={[{ value: "", label: "Não" }, { value: "semanal", label: "Semanal" }, { value: "mensal", label: "Mensal" }, { value: "anual", label: "Anual" }]} />
          </div>
          {repeat && (
            <label className="field"><span className="lbl">Repetir até (opcional)</span>
              <input className="inp" type="date" name="repeatUntil" min={todayISO()} /></label>
          )}
          {repeat && <p className="muted-s">O app lança sozinho {repeat === "semanal" ? "toda semana" : repeat === "mensal" ? "todo mês" : "todo ano"} no mesmo dia. Pausar ou encerrar em Gastos → Rápidos.</p>}
          <div className="switch-row">
            <div><b><Icon name="star" size={14} /> Salvar como favorito</b><span>Vira um botão de um toque no +</span></div>
            <Switch checked={fav} onChange={setFav} label="Salvar como favorito" />
          </div>
          {fav && <input type="hidden" name="favorite" value="1" />}
        </div>
      )}
      {editing && initial?.recurring && <p className="sheet-note"><Icon name="repeat" size={15} /> Lançado por uma recorrência. Mudar aqui altera só este mês.</p>}

      <p className="form-err" role="alert">{state.ok === false ? state.error : ""}</p>
      <div className="form-actions">
        {editing && (
          <ConfirmButton onConfirm={async () => {
            const r = await run(() => deleteExpense(initial!.id!), { undo: () => restoreExpense(initial!.id!) });
            if (r.ok) onDone?.();
          }}><Icon name="trash" size={16} /> Excluir</ConfirmButton>
        )}
        <SubmitButton pending={pending}>{editing ? "Salvar alterações" : "Salvar gasto"}</SubmitButton>
      </div>
    </form>
  );
}
