"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { deleteExpense, deleteOdometer, restoreOdometer, saveOdometer, setInstallmentPaid, type ActionResult } from "@/lib/actions";
import { launchFavorite } from "@/lib/actions-money";
import { quickCalibration } from "@/lib/actions-car";
import { brl, dateBR } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Sheet, SubmitButton, useRun, useFormAction } from "@/components/ui/client";
import type { CatLite, TripLite } from "@/components/forms/ExpenseForm";
import type { ShopLite } from "@/components/forms/ShopPicker";

// Formulários só carregam quando abrem (o app fica mais leve).
const Loading = () => <div className="form-skel"><i /><i /><i /></div>;
const ExpenseForm = dynamic(() => import("@/components/forms/ExpenseForm").then((m) => m.ExpenseForm), { loading: Loading });
const MaintenanceForm = dynamic(() => import("@/components/forms/MaintenanceForm").then((m) => m.MaintenanceForm), { loading: Loading });
const EventForm = dynamic(() => import("@/components/forms/EventForm").then((m) => m.EventForm), { loading: Loading });
const IssueForm = dynamic(() => import("@/components/forms/CarForms").then((m) => m.IssueForm), { loading: Loading });
const TireForm = dynamic(() => import("@/components/forms/CarForms").then((m) => m.TireForm), { loading: Loading });

type Mode = null | "menu" | "gasto" | "manut" | "lembrete" | "km" | "problema" | "pneu";
export type FavLite = { id: string; label: string; amount: number; color: string; icon: string };
export type OdoLite = { id: string; date: string; km: number };

export function OdometerForm({ lastKm, onDone, history = [] }: { lastKm: number | null; onDone?: () => void; history?: OdoLite[] }) {
  const [state, action, pending] = useFormAction(saveOdometer, () => onDone?.());
  const { run } = useRun();
  const [hidden, setHidden] = useState<string[]>([]);
  return (
    <form action={action} className="form" noValidate>
      <label className="amount-field">
        <input name="km" inputMode="numeric" placeholder={lastKm ? lastKm.toLocaleString("pt-BR") : "0"} autoFocus aria-label="Km do painel" />
        <span>km</span>
      </label>
      {lastKm != null && <p className="sum-line">Km atual no app: <b>{lastKm.toLocaleString("pt-BR")} km</b> (vale sempre a última leitura)</p>}
      <p className="form-err" role="alert">{state.ok === false ? state.error : ""}</p>
      <div className="form-actions"><SubmitButton pending={pending}>Salvar km</SubmitButton></div>
      {history.filter((h) => !hidden.includes(h.id)).length > 0 && (
        <div className="odo-hist">
          <span className="lbl">Últimas leituras · toque no x para apagar uma errada</span>
          <ul>
            {history.filter((h) => !hidden.includes(h.id)).map((h) => (
              <li key={h.id}>
                <span>{dateBR(h.date)}</span><b className="num">{h.km.toLocaleString("pt-BR")} km</b>
                <button type="button" className="icon-btn sm" aria-label="Apagar leitura" onClick={async () => {
                  const r = await run(() => deleteOdometer(h.id), { undo: () => restoreOdometer(h.id).then((u) => { setHidden((x) => x.filter((i) => i !== h.id)); return u; }) });
                  if (r.ok) setHidden((x) => [...x, h.id]);
                }}><Icon name="x" size={14} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

export function QuickAdd(props: {
  categories: CatLite[]; lastKm: number | null; nextInstallment: { id: string; number: number; amount: number } | null;
  favorites: FavLite[]; trip: TripLite | null; shops: ShopLite[]; odo: OdoLite[];
}) {
  const { categories, lastKm, nextInstallment, favorites, trip, shops, odo } = props;
  const [mode, setMode] = useState<Mode>(null);
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const { run, busy } = useRun();
  const close = () => setMode(null);

  // atalhos: /?add=gasto | km | manut | lembrete | problema | pneu
  useEffect(() => {
    const add = params.get("add");
    if (add && ["gasto", "km", "manut", "lembrete", "problema", "pneu", "menu"].includes(add)) {
      setMode(add as Mode);
      router.replace(path, { scroll: false });
    }
  }, [params, path, router]);

  if (path.startsWith("/combustivel/novo") || path.startsWith("/combustivel/nivel") || path.startsWith("/configuracoes")) return null;

  const items: { key: string; icon: string; label: string; sub: string; color: string; onClick?: () => void; href?: string }[] = [
    { key: "gasto", icon: "wallet", label: "Gasto", sub: "Qualquer despesa", color: "var(--accent)", onClick: () => setMode("gasto") },
    { key: "fuel", icon: "fuel", label: "Abastecer", sub: "Com o marcador", color: "#6ef095", href: "/combustivel/novo" },
    { key: "manut", icon: "wrench", label: "Manutenção", sub: "Peças e serviço", color: "#5cd6ff", onClick: () => setMode("manut") },
    { key: "km", icon: "road", label: "Km atual", sub: "Do painel", color: "#7aa7ff", onClick: () => setMode("km") },
    { key: "nivel", icon: "gauge", label: "Tanque", sub: "Marcar nível", color: "#c4f25a", href: "/combustivel/nivel" },
    { key: "pneu", icon: "tire", label: "Pneus", sub: "Calibrei, rodízio", color: "#9aa8c7", onClick: () => setMode("pneu") },
    { key: "problema", icon: "alert", label: "Problema", sub: "Anotar defeito", color: "#ff8a5c", onClick: () => setMode("problema") },
    { key: "lembrete", icon: "bell", label: "Lembrete", sub: "Data ou km", color: "#ffc35a", onClick: () => setMode("lembrete") },
    { key: "peca", icon: "box", label: "Peça", sub: "Com foto", color: "#9fb4ff", href: "/manutencao?t=pecas&nova=1" },
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
        {favorites.length > 0 && (
          <div className="fav-row">
            <span className="lbl"><Icon name="star" size={12} /> Um toque · lança hoje</span>
            <div className="chips-scroll">
              {favorites.map((f) => (
                <button key={f.id} type="button" className="fav-chip" disabled={busy} style={{ "--c": f.color } as CSSProperties}
                  onClick={async () => {
                    const r = await run(() => launchFavorite(f.id, trip?.id), { undo: (done) => (done.id ? deleteExpense(done.id) : Promise.resolve({ ok: false })) });
                    if (r.ok) close();
                  }}>
                  <Icon name={f.icon} size={16} /><span>{f.label}</span><b className="money">{brl(f.amount)}</b>
                </button>
              ))}
              <Link href="/gastos/rapidos" className="fav-chip more" onClick={close}><Icon name="edit" size={15} /><span>Editar</span></Link>
            </div>
          </div>
        )}
        <div className="quick-grid">
          {items.map((i) => {
            const inner = (<><span className="q-ic" style={{ "--c": i.color } as CSSProperties}><Icon name={i.icon} size={22} /></span><b>{i.label}</b><span>{i.sub}</span></>);
            return i.href
              ? <Link key={i.key} href={i.href} className="q-item" onClick={close}>{inner}</Link>
              : <button key={i.key} type="button" className="q-item" onClick={i.onClick}>{inner}</button>;
          })}
        </div>
        {trip && <p className="sheet-note trip-note"><Icon name="map" size={15} /> Viagem ativa: <b>{trip.name}</b>. Os gastos novos entram nela.</p>}
      </Sheet>
      <Sheet open={mode === "gasto"} onClose={close} title="Novo gasto">
        {mode === "gasto" && <ExpenseForm categories={categories} onDone={close} lastKm={lastKm} trip={trip} />}
      </Sheet>
      <Sheet open={mode === "manut"} onClose={close} title="Nova manutenção">
        {mode === "manut" && <MaintenanceForm categories={categories} onDone={close} lastKm={lastKm} shops={shops} />}
      </Sheet>
      <Sheet open={mode === "lembrete"} onClose={close} title="Novo lembrete">
        {mode === "lembrete" && <EventForm onDone={close} lastKm={lastKm} />}
      </Sheet>
      <Sheet open={mode === "km"} onClose={close} title="Quilometragem atual">
        {mode === "km" && <OdometerForm lastKm={lastKm} onDone={close} history={odo} />}
      </Sheet>
      <Sheet open={mode === "problema"} onClose={close} title="Anotar problema">
        {mode === "problema" && <IssueForm onDone={close} lastKm={lastKm} />}
      </Sheet>
      <Sheet open={mode === "pneu"} onClose={close} title="Pneus">
        {mode === "pneu" && (
          <>
            <button type="button" className="pay-next" disabled={busy} onClick={async () => { const r = await run(() => quickCalibration(null, null)); if (r.ok) close(); }}>
              <Icon name="check" size={18} /><span>Calibrei hoje</span><b>1 toque</b>
            </button>
            <TireForm onDone={close} lastKm={lastKm} shops={shops} />
          </>
        )}
      </Sheet>
    </>
  );
}


