"use client";

import { useActionState, useState } from "react";
import { deleteExpense, restoreExpense, saveMaintenance, type ActionResult } from "@/lib/actions";
import { todayISO } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ConfirmButton, SubmitButton, useActionFeedback, useRun } from "@/components/ui/client";
import type { CatLite } from "./ExpenseForm";

export const SYSTEMS: { value: string; label: string; icon: string }[] = [
  { value: "motor", label: "Motor", icon: "flame" },
  { value: "freios", label: "Freios", icon: "target" },
  { value: "suspensao", label: "Suspensão", icon: "layers" },
  { value: "pneus", label: "Pneus", icon: "tire" },
  { value: "eletrica", label: "Elétrica", icon: "bolt" },
  { value: "arrefecimento", label: "Arrefecimento", icon: "droplet" },
  { value: "cambio", label: "Câmbio", icon: "gear" },
  { value: "injecao", label: "Injeção", icon: "fuel" },
  { value: "escapamento", label: "Escapamento", icon: "road" },
  { value: "outros", label: "Outros", icon: "tool" },
];

const QUICK = [
  { service: "Troca de óleo e filtro", system: "motor", nextKm: 10000 },
  { service: "Pastilhas de freio", system: "freios", nextKm: 30000 },
  { service: "Alinhamento e balanceamento", system: "pneus", nextKm: 10000 },
  { service: "Revisão geral", system: "outros", nextMonths: 12 },
  { service: "Bateria", system: "eletrica" },
  { service: "Correia dentada", system: "motor", nextKm: 50000 },
];

export type MaintInitial = {
  id?: string; date?: string; km?: number | null; vendor?: string | null; note?: string | null; categoryId?: string;
  system?: string; service?: string; parts?: number; labor?: number; nextDate?: string | null; nextKm?: number | null;
};
const fmt = (v?: number) => (v ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");

export function MaintenanceForm({ initial, onDone, lastKm, categories }: {
  initial?: MaintInitial; onDone?: () => void; lastKm?: number | null; categories: CatLite[];
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveMaintenance, {});
  useActionFeedback(state, () => onDone?.());
  const { run } = useRun();
  const [system, setSystem] = useState(initial?.system ?? "motor");
  const [service, setService] = useState(initial?.service ?? "");
  const [km, setKm] = useState(initial?.km != null ? String(initial.km) : "");
  const [nextKm, setNextKm] = useState(initial?.nextKm != null ? String(initial.nextKm) : "");
  const [nextDate, setNextDate] = useState(initial?.nextDate ?? "");
  const [parts, setParts] = useState(fmt(initial?.parts));
  const [labor, setLabor] = useState(fmt(initial?.labor));
  const editing = Boolean(initial?.id);
  const maintCats = categories.filter((c) => !c.archived && ["manutencao", "oleo", "revisao", "pecas", "alinhamento", "pneus"].includes(c.slug));
  const [cat, setCat] = useState(initial?.categoryId ?? maintCats.find((c) => c.slug === "manutencao")?.id ?? "");
  const total = (Number(parts.replace(/\./g, "").replace(",", ".")) || 0) + (Number(labor.replace(/\./g, "").replace(",", ".")) || 0);

  const applyQuick = (q: (typeof QUICK)[number]) => {
    setService(q.service); setSystem(q.system);
    const base = Number(km.replace(/\D/g, "")) || lastKm || 0;
    if (q.nextKm && base) setNextKm(String(base + q.nextKm));
    if (q.nextMonths) { const d = new Date(); d.setMonth(d.getMonth() + q.nextMonths); setNextDate(d.toISOString().slice(0, 10)); }
    const slug = /óleo/i.test(q.service) ? "oleo" : /alinhamento/i.test(q.service) ? "alinhamento" : /revis/i.test(q.service) ? "revisao" : "manutencao";
    const c = maintCats.find((x) => x.slug === slug);
    if (c) setCat(c.id);
  };

  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {!editing && (
        <div className="chips-scroll" aria-label="Serviços comuns">
          {QUICK.map((q) => <button key={q.service} type="button" className="chip" onClick={() => applyQuick(q)}>{q.service}</button>)}
        </div>
      )}
      <label className="field"><span className="lbl">Serviço</span>
        <input className="inp" name="service" value={service} onChange={(e) => setService(e.target.value)} placeholder="Ex.: troca de óleo" maxLength={120} /></label>

      <div className="field"><span className="lbl">Sistema</span>
        <div className="sys-grid">
          {SYSTEMS.map((s) => (
            <button key={s.value} type="button" data-on={system === s.value} onClick={() => setSystem(s.value)}>
              <Icon name={s.icon} size={17} /><span>{s.label}</span>
            </button>
          ))}
        </div>
        <input type="hidden" name="system" value={system} />
      </div>

      {maintCats.length > 1 && (
        <div className="field"><span className="lbl">Categoria do gasto</span>
          <div className="chips-scroll">
            {maintCats.map((c) => (
              <button key={c.id} type="button" className="chip" data-on={cat === c.id} style={{ "--c": c.color } as React.CSSProperties}
                onClick={() => setCat(c.id)}>{c.name}</button>
            ))}
          </div>
          <input type="hidden" name="category" value={cat} />
        </div>
      )}

      <div className="row2">
        <label className="field"><span className="lbl">Peças</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="parts" inputMode="decimal" value={parts} onChange={(e) => setParts(e.target.value)} placeholder="0,00" /></div></label>
        <label className="field"><span className="lbl">Mão de obra</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="labor" inputMode="decimal" value={labor} onChange={(e) => setLabor(e.target.value)} placeholder="0,00" /></div></label>
      </div>
      <p className="sum-line">Total <b className="money">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></p>

      <div className="row2">
        <label className="field"><span className="lbl">Data</span>
          <input className="inp" type="date" name="date" defaultValue={initial?.date ?? todayISO()} max={todayISO()} /></label>
        <label className="field"><span className="lbl">Km do painel</span>
          <input className="inp" name="km" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder={lastKm ? lastKm.toLocaleString("pt-BR") : "opcional"} /></label>
      </div>
      <label className="field"><span className="lbl">Oficina</span>
        <input className="inp" name="vendor" defaultValue={initial?.vendor ?? ""} placeholder="opcional" maxLength={80} /></label>

      <fieldset className="next-box">
        <legend><Icon name="bell" size={15} /> Próxima vez (cria um lembrete)</legend>
        <div className="row2">
          <label className="field"><span className="lbl">No km</span>
            <input className="inp" name="nextKm" inputMode="numeric" value={nextKm} onChange={(e) => setNextKm(e.target.value)} placeholder="opcional" /></label>
          <label className="field"><span className="lbl">Na data</span>
            <input className="inp" type="date" name="nextDate" value={nextDate} onChange={(e) => setNextDate(e.target.value)} /></label>
        </div>
      </fieldset>
      <label className="field"><span className="lbl">Observação</span>
        <input className="inp" name="note" defaultValue={initial?.note ?? ""} placeholder="opcional" maxLength={280} /></label>

      <p className="form-err" role="alert">{state.ok === false ? state.error : ""}</p>
      <div className="form-actions">
        {editing && (
          <ConfirmButton onConfirm={async () => {
            const r = await run(() => deleteExpense(initial!.id!), { undo: () => restoreExpense(initial!.id!) });
            if (r.ok) onDone?.();
          }}><Icon name="trash" size={16} /> Excluir</ConfirmButton>
        )}
        <SubmitButton pending={pending}>{editing ? "Salvar alterações" : "Salvar manutenção"}</SubmitButton>
      </div>
    </form>
  );
}
