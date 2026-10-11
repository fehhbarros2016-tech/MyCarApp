"use client";

import { useState, type CSSProperties } from "react";
import {
  addVehicle, deleteIssue, deletePart, deletePlanItem, deleteShop, deleteTireEvent, resolveIssue, restoreIssue, restorePart,
  restorePlanItem, restoreShop, restoreTireEvent, saveIssue, savePart, savePlanItem, saveShop, saveTireEvent, saveVehicleInfo,
} from "@/lib/actions-car";
import type { ActionResult } from "@/lib/actions";
import { SYSTEMS } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ConfirmButton, Segmented, SubmitButton, Switch, useRun, useFormAction } from "@/components/ui/client";
import { ImagePicker } from "./ImagePicker";
import { ShopPicker, type ShopLite } from "./ShopPicker";

type Done = { onDone?: () => void };
const money = (v?: number | null) => (v == null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const Err = ({ s }: { s: ActionResult }) => <p className="form-err" role="alert">{s.ok === false ? s.error : ""}</p>;

function SystemPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field"><span className="lbl">Sistema</span>
      <div className="sys-grid">
        {SYSTEMS.map((x) => (
          <button key={x.value} type="button" data-on={value === x.value} onClick={() => onChange(x.value)}>
            <Icon name={x.icon} size={17} /><span>{x.label}</span>
          </button>
        ))}
      </div>
      <input type="hidden" name="system" value={value} />
    </div>
  );
}

function DeleteRow({ onDelete, onRestore, onDone, label = "Excluir" }: { onDelete: () => Promise<ActionResult>; onRestore: () => Promise<ActionResult>; onDone?: () => void; label?: string }) {
  const { run } = useRun();
  return (
    <ConfirmButton onConfirm={async () => { const r = await run(onDelete, { undo: onRestore }); if (r.ok) onDone?.(); }}>
      <Icon name="trash" size={16} /> {label}
    </ConfirmButton>
  );
}

// ---------------- problemas ----------------
export type IssueInitial = { id?: string; title?: string; description?: string | null; severity?: string; noticedOn?: string; km?: number | null };
const SEVERITY = [{ value: "baixa", label: "Leve" }, { value: "media", label: "Médio" }, { value: "alta", label: "Sério" }];

export function IssueForm({ initial, onDone, lastKm }: Done & { initial?: IssueInitial; lastKm?: number | null }) {
  const [s, action, pending] = useFormAction(saveIssue, () => onDone?.());
  const [sev, setSev] = useState(initial?.severity ?? "media");
  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <label className="field"><span className="lbl">O que está acontecendo?</span>
        <input className="inp" name="title" defaultValue={initial?.title ?? ""} placeholder="Ex.: barulho na roda dianteira ao frear" maxLength={100} autoFocus={!initial?.id} /></label>
      <div className="field"><span className="lbl">Gravidade</span>
        <Segmented value={sev} onChange={setSev} name="severity" options={SEVERITY} /></div>
      <label className="field"><span className="lbl">Detalhes para o mecânico</span>
        <textarea className="inp" name="description" rows={3} defaultValue={initial?.description ?? ""} placeholder="Quando acontece, com o motor frio ou quente, em que velocidade…" maxLength={1000} /></label>
      <div className="row2">
        <label className="field"><span className="lbl">Desde quando</span>
          <input className="inp" type="date" name="noticedOn" defaultValue={initial?.noticedOn ?? todayISO()} max={todayISO()} /></label>
        <label className="field"><span className="lbl">Km do painel</span>
          <input className="inp" name="km" inputMode="numeric" defaultValue={initial?.km ?? ""} placeholder={lastKm ? lastKm.toLocaleString("pt-BR") : "opcional"} /></label>
      </div>
      <Err s={s} />
      <div className="form-actions">
        {initial?.id && <DeleteRow onDelete={() => deleteIssue(initial.id!)} onRestore={() => restoreIssue(initial.id!)} onDone={onDone} />}
        <SubmitButton pending={pending}>{initial?.id ? "Salvar" : "Anotar problema"}</SubmitButton>
      </div>
    </form>
  );
}

export function ResolveIssueForm({ id, shops, onDone }: Done & { id: string; shops: ShopLite[] }) {
  const [s, action, pending] = useFormAction(resolveIssue, () => onDone?.());
  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="id" value={id} />
      <label className="field"><span className="lbl">O que resolveu?</span>
        <textarea className="inp" name="resolution" rows={3} placeholder="Ex.: troca das pastilhas e disco" maxLength={600} autoFocus /></label>
      <ShopPicker shops={shops} value={null} />
      <label className="field"><span className="lbl">Resolvido em</span>
        <input className="inp" type="date" name="resolvedOn" defaultValue={todayISO()} max={todayISO()} /></label>
      <p className="muted-s">Se teve custo, registre também como manutenção para entrar nos gastos.</p>
      <Err s={s} />
      <div className="form-actions"><SubmitButton pending={pending}><Icon name="check" size={16} /> Marcar como resolvido</SubmitButton></div>
    </form>
  );
}

// ---------------- pneus ----------------
export type TireInitial = { id?: string; kind?: string; date?: string; km?: number | null; front?: number | null; rear?: number | null;
  positions?: string | null; brand?: string | null; size?: string | null; cost?: number | null; shopId?: string | null; note?: string | null };
const TIRE_KINDS = [{ value: "calibragem", label: "Calibragem" }, { value: "rodizio", label: "Rodízio" }, { value: "troca", label: "Troca" }, { value: "reparo", label: "Reparo" }];

export function TireForm({ initial, onDone, lastKm, shops, defaultSize, recommended }: Done & {
  initial?: TireInitial; lastKm?: number | null; shops: ShopLite[]; defaultSize?: string | null; recommended?: { front: string | null; rear: string | null };
}) {
  const [s, action, pending] = useFormAction(saveTireEvent, () => onDone?.());
  const [kind, setKind] = useState(initial?.kind ?? "calibragem");
  const editing = Boolean(initial?.id);
  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <Segmented value={kind} onChange={setKind} name="kind" options={TIRE_KINDS} />
      <div className="row2">
        <label className="field"><span className="lbl">Data</span>
          <input className="inp" type="date" name="date" defaultValue={initial?.date ?? todayISO()} max={todayISO()} /></label>
        <label className="field"><span className="lbl">Km do painel</span>
          <input className="inp" name="km" inputMode="numeric" defaultValue={initial?.km ?? ""} placeholder={lastKm ? lastKm.toLocaleString("pt-BR") : kind === "calibragem" ? "opcional" : "recomendado"} /></label>
      </div>
      {(kind === "calibragem" || kind === "troca" || kind === "rodizio") && (
        <div className="row2">
          <label className="field"><span className="lbl">Dianteiros (psi)</span>
            <input className="inp" name="front" inputMode="decimal" defaultValue={initial?.front ?? ""} placeholder={recommended?.front ?? "ex.: 32"} /></label>
          <label className="field"><span className="lbl">Traseiros (psi)</span>
            <input className="inp" name="rear" inputMode="decimal" defaultValue={initial?.rear ?? ""} placeholder={recommended?.rear ?? "ex.: 30"} /></label>
        </div>
      )}
      {kind === "troca" && (
        <>
          <div className="row2">
            <label className="field"><span className="lbl">Marca e modelo</span>
              <input className="inp" name="brand" defaultValue={initial?.brand ?? ""} placeholder="ex.: Pirelli P1" maxLength={60} /></label>
            <label className="field"><span className="lbl">Medida</span>
              <input className="inp" name="size" defaultValue={initial?.size ?? defaultSize ?? ""} placeholder="185/65 R15" maxLength={30} /></label>
          </div>
          <label className="field"><span className="lbl">Quais pneus</span>
            <input className="inp" name="positions" defaultValue={initial?.positions ?? "Os 4"} maxLength={60} /></label>
        </>
      )}
      {kind === "reparo" && (
        <label className="field"><span className="lbl">Qual pneu</span>
          <input className="inp" name="positions" defaultValue={initial?.positions ?? ""} placeholder="ex.: traseiro direito" maxLength={60} /></label>
      )}
      {kind !== "calibragem" && (
        <>
          <label className="field"><span className="lbl">Valor pago</span>
            <div className="inp-pre"><b>R$</b><input className="inp" name="cost" inputMode="decimal" defaultValue={money(initial?.cost)} placeholder="opcional" /></div></label>
          <ShopPicker shops={shops} value={initial?.shopId ?? null} label="Onde fez" />
          {!editing && <p className="muted-s">Com valor, o app lança também nos gastos (categoria Pneus).</p>}
        </>
      )}
      <label className="field"><span className="lbl">Observação</span>
        <input className="inp" name="note" defaultValue={initial?.note ?? ""} placeholder="opcional" maxLength={280} /></label>
      <Err s={s} />
      <div className="form-actions">
        {initial?.id && <DeleteRow onDelete={() => deleteTireEvent(initial.id!)} onRestore={() => restoreTireEvent(initial.id!)} onDone={onDone} />}
        <SubmitButton pending={pending}>{editing ? "Salvar" : "Registrar"}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------- plano de revisão ----------------
export type PlanInitial = { id?: string; name?: string; system?: string; intervalKm?: number | null; intervalMonths?: number | null;
  lastKm?: number | null; lastDate?: string | null; note?: string | null; keyword?: string | null; categorySlug?: string | null };

export function PlanItemForm({ initial, onDone }: Done & { initial?: PlanInitial }) {
  const [s, action, pending] = useFormAction(savePlanItem, () => onDone?.());
  const [system, setSystem] = useState(initial?.system ?? "motor");
  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {initial?.keyword && <input type="hidden" name="keyword" value={initial.keyword} />}
      {initial?.categorySlug && <input type="hidden" name="categorySlug" value={initial.categorySlug} />}
      <label className="field"><span className="lbl">Item</span>
        <input className="inp" name="name" defaultValue={initial?.name ?? ""} placeholder="Ex.: Troca do fluido de freio" maxLength={80} autoFocus={!initial?.id} /></label>
      <SystemPick value={system} onChange={setSystem} />
      <div className="row2">
        <label className="field"><span className="lbl">A cada (km)</span>
          <input className="inp" name="intervalKm" inputMode="numeric" defaultValue={initial?.intervalKm ?? ""} placeholder="ex.: 10.000" /></label>
        <label className="field"><span className="lbl">Ou a cada (meses)</span>
          <input className="inp" name="intervalMonths" inputMode="numeric" defaultValue={initial?.intervalMonths ?? ""} placeholder="ex.: 12" /></label>
      </div>
      <fieldset className="next-box">
        <legend><Icon name="history" size={15} /> Última vez (se já fez antes de usar o app)</legend>
        <div className="row2">
          <label className="field"><span className="lbl">Km</span>
            <input className="inp" name="lastKm" inputMode="numeric" defaultValue={initial?.lastKm ?? ""} placeholder="opcional" /></label>
          <label className="field"><span className="lbl">Data</span>
            <input className="inp" type="date" name="lastDate" defaultValue={initial?.lastDate ?? ""} max={todayISO()} /></label>
        </div>
      </fieldset>
      <label className="field"><span className="lbl">Observação</span>
        <input className="inp" name="note" defaultValue={initial?.note ?? ""} placeholder="ex.: óleo 5W30 sintético" maxLength={280} /></label>
      <Err s={s} />
      <div className="form-actions">
        {initial?.id && <DeleteRow label="Remover" onDelete={() => deletePlanItem(initial.id!)} onRestore={() => restorePlanItem(initial.id!)} onDone={onDone} />}
        <SubmitButton pending={pending}>{initial?.id ? "Salvar" : "Adicionar ao plano"}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------- peças ----------------
export type PartInitial = { id?: string; name?: string; brand?: string | null; system?: string; price?: number | null; installedOn?: string;
  installedKm?: number | null; lifeKm?: number | null; lifeMonths?: number | null; note?: string | null; shopId?: string | null; image?: string | null };

export function PartForm({ initial, onDone, lastKm, shops, replaceable = [] }: Done & {
  initial?: PartInitial; lastKm?: number | null; shops: ShopLite[]; replaceable?: { id: string; name: string }[];
}) {
  const [s, action, pending] = useFormAction(savePart, () => onDone?.());
  const [system, setSystem] = useState(initial?.system ?? "outros");
  const [name, setName] = useState(initial?.name ?? "");
  const [asExpense, setAsExpense] = useState(true);
  const editing = Boolean(initial?.id);
  const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const same = !editing && name.trim().length >= 3 ? replaceable.find((p) => norm(p.name) === norm(name) || norm(p.name).startsWith(norm(name))) : undefined;
  const [replace, setReplace] = useState(true);
  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <ImagePicker current={initial?.image ?? null} label="Foto da peça" />
      <label className="field"><span className="lbl">Peça</span>
        <input className="inp" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bateria Moura 60Ah" maxLength={80} /></label>
      {same && (
        <div className="switch-row">
          <div><b>Substitui &quot;{same.name}&quot;?</b><span>A anterior vai para o histórico com a idade final</span></div>
          <Switch checked={replace} onChange={setReplace} label="Substituir peça anterior" />
        </div>
      )}
      {same && replace && <input type="hidden" name="replaces" value={same.id} />}
      <div className="row2">
        <label className="field"><span className="lbl">Marca</span>
          <input className="inp" name="brand" defaultValue={initial?.brand ?? ""} placeholder="opcional" maxLength={60} /></label>
        <label className="field"><span className="lbl">Valor</span>
          <div className="inp-pre"><b>R$</b><input className="inp" name="price" inputMode="decimal" defaultValue={money(initial?.price)} placeholder="0,00" /></div></label>
      </div>
      <div className="row2">
        <label className="field"><span className="lbl">Instalada em</span>
          <input className="inp" type="date" name="installedOn" defaultValue={initial?.installedOn ?? todayISO()} max={todayISO()} /></label>
        <label className="field"><span className="lbl">Km na instalação</span>
          <input className="inp" name="installedKm" inputMode="numeric" defaultValue={initial?.installedKm ?? ""} placeholder={lastKm ? lastKm.toLocaleString("pt-BR") : "opcional"} /></label>
      </div>
      <SystemPick value={system} onChange={setSystem} />
      <fieldset className="next-box">
        <legend><Icon name="clock" size={15} /> Vida útil esperada (opcional)</legend>
        <div className="row2">
          <label className="field"><span className="lbl">Km</span>
            <input className="inp" name="lifeKm" inputMode="numeric" defaultValue={initial?.lifeKm ?? ""} placeholder="ex.: 40.000" /></label>
          <label className="field"><span className="lbl">Meses</span>
            <input className="inp" name="lifeMonths" inputMode="numeric" defaultValue={initial?.lifeMonths ?? ""} placeholder="ex.: 24" /></label>
        </div>
      </fieldset>
      <ShopPicker shops={shops} value={initial?.shopId ?? null} label="Onde comprou ou instalou" />
      <label className="field"><span className="lbl">Observação</span>
        <input className="inp" name="note" defaultValue={initial?.note ?? ""} placeholder="garantia, código da peça…" maxLength={280} /></label>
      {!editing && (
        <div className="switch-row">
          <div><b>Lançar nos gastos</b><span>Cria um gasto em Peças com o valor</span></div>
          <Switch checked={asExpense} onChange={setAsExpense} label="Lançar nos gastos" />
        </div>
      )}
      {asExpense && !editing && <input type="hidden" name="asExpense" value="1" />}
      <Err s={s} />
      <div className="form-actions">
        {initial?.id && <DeleteRow label="Remover" onDelete={() => deletePart(initial.id!)} onRestore={() => restorePart(initial.id!)} onDone={onDone} />}
        <SubmitButton pending={pending}>{editing ? "Salvar" : "Salvar peça"}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------- oficinas ----------------
export type ShopInitial = { id?: string; name?: string; kind?: string; phone?: string | null; address?: string | null; note?: string | null };
export function ShopForm({ initial, onDone }: Done & { initial?: ShopInitial }) {
  const [s, action, pending] = useFormAction(saveShop, () => onDone?.());
  const [kind, setKind] = useState(initial?.kind ?? "oficina");
  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <label className="field"><span className="lbl">Nome</span>
        <input className="inp" name="name" defaultValue={initial?.name ?? ""} maxLength={80} autoFocus={!initial?.id} /></label>
      <Segmented value={kind} onChange={setKind} name="kind" options={[{ value: "oficina", label: "Oficina" }, { value: "loja", label: "Loja" }, { value: "posto", label: "Posto" }, { value: "outro", label: "Outro" }]} />
      <div className="row2">
        <label className="field"><span className="lbl">Telefone</span>
          <input className="inp" name="phone" type="tel" inputMode="tel" defaultValue={initial?.phone ?? ""} maxLength={30} /></label>
        <label className="field"><span className="lbl">Endereço</span>
          <input className="inp" name="address" defaultValue={initial?.address ?? ""} maxLength={160} /></label>
      </div>
      <label className="field"><span className="lbl">Observação</span>
        <input className="inp" name="note" defaultValue={initial?.note ?? ""} placeholder="ex.: falar com o Zé" maxLength={280} /></label>
      <Err s={s} />
      <div className="form-actions">
        {initial?.id && <DeleteRow label="Remover" onDelete={() => deleteShop(initial.id!)} onRestore={() => restoreShop(initial.id!)} onDone={onDone} />}
        <SubmitButton pending={pending}>Salvar</SubmitButton>
      </div>
    </form>
  );
}

// ---------------- garagem e ficha ----------------
export function AddVehicleForm({ onDone }: Done) {
  const [s, action, pending] = useFormAction(addVehicle, () => onDone?.());
  const [activate, setActivate] = useState(true);
  return (
    <form action={action} className="form" noValidate>
      <label className="field"><span className="lbl">Apelido</span>
        <input className="inp" name="name" placeholder="Ex.: Carro da família" maxLength={40} autoFocus /></label>
      <div className="row2">
        <label className="field"><span className="lbl">Marca</span><input className="inp" name="make" placeholder="Ex.: Volkswagen" maxLength={40} /></label>
        <label className="field"><span className="lbl">Modelo</span><input className="inp" name="model" placeholder="Ex.: Gol" maxLength={40} /></label>
      </div>
      <div className="row2">
        <label className="field"><span className="lbl">Tanque (L)</span><input className="inp" name="tank" inputMode="decimal" placeholder="50" /></label>
        <label className="field"><span className="lbl">Barras do marcador</span><input className="inp" name="bars" inputMode="numeric" placeholder="9" /></label>
      </div>
      <div className="switch-row">
        <div><b>Mostrar na tela inicial agora</b><span>Você troca quando quiser</span></div>
        <Switch checked={activate} onChange={setActivate} label="Mostrar agora" />
      </div>
      {activate && <input type="hidden" name="activate" value="1" />}
      <p className="muted-s">Cada veículo tem seus próprios gastos, parcelas, manutenção e lembretes. Nada se mistura.</p>
      <Err s={s} />
      <div className="form-actions"><SubmitButton pending={pending}>Adicionar veículo</SubmitButton></div>
    </form>
  );
}

export type InfoFields = Record<string, string | undefined>;
const INFO_GROUPS: { title: string; fields: { k: string; l: string; ph?: string; type?: string; wide?: boolean }[] }[] = [
  { title: "Documento", fields: [{ k: "renavam", l: "Renavam" }, { k: "chassi", l: "Chassi" }, { k: "cor", l: "Cor" }, { k: "motor", l: "Motor", ph: "1.0 16V" }, { k: "combustivel", l: "Combustível", ph: "Flex" }] },
  { title: "Pneus e óleo", fields: [{ k: "pneuMedida", l: "Medida do pneu", ph: "185/65 R15" }, { k: "pressaoDianteira", l: "Calibragem dianteira", ph: "32 psi" },
    { k: "pressaoTraseira", l: "Calibragem traseira", ph: "30 psi" }, { k: "oleo", l: "Óleo do motor", ph: "5W30 sintético" }, { k: "oleoLitros", l: "Quantidade de óleo", ph: "4,5 L" }] },
  { title: "Seguro e socorro", fields: [{ k: "seguradora", l: "Seguradora" }, { k: "apolice", l: "Nº da apólice" }, { k: "seguroTel", l: "Telefone do seguro", type: "tel" }, { k: "guinchoTel", l: "Guincho / assistência 24h", type: "tel" }] },
];

export function VehicleInfoForm({ id, info, onDone }: Done & { id: string; info: InfoFields }) {
  const [s, action, pending] = useFormAction(saveVehicleInfo, () => onDone?.());
  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="id" value={id} />
      {INFO_GROUPS.map((g) => (
        <fieldset key={g.title} className="next-box">
          <legend>{g.title}</legend>
          <div className="row2">
            {g.fields.map((f) => (
              <label key={f.k} className="field" style={f.wide ? ({ gridColumn: "1 / -1" } as CSSProperties) : undefined}><span className="lbl">{f.l}</span>
                <input className="inp" name={f.k} type={f.type ?? "text"} inputMode={f.type === "tel" ? "tel" : undefined} defaultValue={info[f.k] ?? ""} placeholder={f.ph} maxLength={80} /></label>
            ))}
          </div>
        </fieldset>
      ))}
      <label className="field"><span className="lbl">Anotações</span>
        <textarea className="inp" name="notas" rows={3} defaultValue={info.notas ?? ""} placeholder="Código do rádio, segredo da roda, onde fica o estepe…" maxLength={600} /></label>
      <Err s={s} />
      <div className="form-actions"><SubmitButton pending={pending}>Salvar ficha</SubmitButton></div>
    </form>
  );
}
