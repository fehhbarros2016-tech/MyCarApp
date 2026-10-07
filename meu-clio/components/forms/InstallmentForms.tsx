"use client";

import { useActionState, useMemo, useState } from "react";
import { addInstallments, createPlan, updateInstallment, type ActionResult } from "@/lib/actions";
import { brl, dateFull, todayISO } from "@/lib/format";
import { SubmitButton, Switch, useActionFeedback } from "@/components/ui/client";

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

export function PlanForm({ onDone }: { onDone?: () => void }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createPlan, {});
  useActionFeedback(state, () => onDone?.());
  const [price, setPrice] = useState("");
  const [down, setDown] = useState("");
  const [count, setCount] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState("");
  const [first, setFirst] = useState("");
  const suggested = useMemo(() => {
    const p = num(price), d = num(down), c = Number(count) || 0;
    return p > d && c > 0 ? (p - d) / c : null;
  }, [price, down, count]);
  const total = num(down) + (Number(count) || 0) * num(amount || String(suggested ?? 0).replace(".", ","));

  return (
    <form action={action} className="form" noValidate>
      <div className="row2">
        <label className="field"><span className="lbl">Valor do carro</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50.000" /></div></label>
        <label className="field"><span className="lbl">Entrada</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="down" inputMode="decimal" value={down} onChange={(e) => setDown(e.target.value)} placeholder="10.000" /></div></label>
      </div>
      <div className="row2">
        <label className="field"><span className="lbl">Nº de parcelas</span>
          <input className="inp" name="count" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} placeholder="40" /></label>
        <label className="field"><span className="lbl">Valor da parcela</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder={suggested ? suggested.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "1.000"} /></div></label>
      </div>
      {suggested != null && !amount && (
        <button type="button" className="link-btn" onClick={() => setAmount(suggested.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}>
          Usar {brl(suggested, true)} (restante ÷ parcelas)
        </button>
      )}
      <div className="row2">
        <label className="field"><span className="lbl">1º vencimento</span>
          <input className="inp" type="date" name="firstDue" value={first} onChange={(e) => setFirst(e.target.value)} /></label>
        <label className="field"><span className="lbl">Já pagas</span>
          <input className="inp" name="paid" inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value.replace(/\D/g, ""))} placeholder="0" /></label>
      </div>
      <label className="field"><span className="lbl">Data da compra</span>
        <input className="inp" type="date" name="purchaseDate" max={todayISO()} /></label>
      {Number(count) > 0 && num(amount || "0") + (suggested ?? 0) > 0 && (
        <p className="sum-line">Total pago ao fim: <b className="money">{brl(total)}</b>{Number(paid) > 0 ? ` · ${paid} já marcadas como pagas` : ""}</p>
      )}
      <p className="form-err" role="alert">{state.ok === false ? state.error : ""}</p>
      <div className="form-actions"><SubmitButton pending={pending}>Criar parcelas</SubmitButton></div>
    </form>
  );
}

export type InstallmentLite = { id: string; number: number; amount: number; dueDate: string; paidAt: string | null; note: string | null };

export function InstallmentForm({ item, onDone }: { item: InstallmentLite; onDone?: () => void }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateInstallment, {});
  useActionFeedback(state, () => onDone?.());
  const [paid, setPaid] = useState(Boolean(item.paidAt));
  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="id" value={item.id} />
      <div className="switch-row">
        <div><b>{paid ? "Paga" : "Pendente"}</b><span>{item.paidAt ? `Paga em ${dateFull(item.paidAt)}` : `Vence em ${dateFull(item.dueDate)}`}</span></div>
        <Switch checked={paid} onChange={setPaid} label="Parcela paga" />
        <input type="hidden" name="paid" value={paid ? "1" : "0"} />
      </div>
      {paid && (
        <label className="field"><span className="lbl">Data do pagamento</span>
          <input className="inp" type="date" name="paidAt" defaultValue={item.paidAt ?? todayISO()} max={todayISO()} /></label>
      )}
      <div className="row2">
        <label className="field"><span className="lbl">Valor</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="amount" inputMode="decimal" defaultValue={item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} /></div></label>
        <label className="field"><span className="lbl">Vencimento</span>
          <input className="inp" type="date" name="dueDate" defaultValue={item.dueDate} /></label>
      </div>
      <label className="field"><span className="lbl">Observação</span>
        <input className="inp" name="note" defaultValue={item.note ?? ""} placeholder="ex.: paga adiantada" maxLength={200} /></label>
      <p className="form-err" role="alert">{state.ok === false ? state.error : ""}</p>
      <div className="form-actions"><SubmitButton pending={pending}>Salvar parcela</SubmitButton></div>
    </form>
  );
}

export function AddInstallmentsForm({ defaultAmount, nextDue, onDone }: { defaultAmount: number; nextDue: string; onDone?: () => void }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(addInstallments, {});
  useActionFeedback(state, () => onDone?.());
  return (
    <form action={action} className="form" noValidate>
      <div className="row2">
        <label className="field"><span className="lbl">Quantidade</span><input className="inp" name="count" inputMode="numeric" defaultValue="1" /></label>
        <label className="field"><span className="lbl">Valor</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="amount" inputMode="decimal" defaultValue={defaultAmount ? defaultAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""} /></div></label>
      </div>
      <label className="field"><span className="lbl">Vencimento da primeira</span><input className="inp" type="date" name="firstDue" defaultValue={nextDue} /></label>
      <p className="form-err" role="alert">{state.ok === false ? state.error : ""}</p>
      <div className="form-actions"><SubmitButton pending={pending}>Adicionar</SubmitButton></div>
    </form>
  );
}
