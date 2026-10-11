import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { PauseButton } from "@/components/ActionButtons";
import { FavoriteButton, RecurringButton } from "@/components/Launchers";
import { Icon } from "@/components/ui/Icon";
import { Card, CatIcon, EmptyState, PageHeader, Pill, v } from "@/components/ui/kit";
import { catOf } from "@/lib/calc";
import { brl, countdown, daysUntil, dateBR } from "@/lib/format";
import { catsLite } from "@/lib/rows";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Favoritos e recorrentes" };
export const dynamic = "force-dynamic";
const FREQ = { semanal: "toda semana", mensal: "todo mês", anual: "todo ano" } as const;

export default async function RapidosPage() {
  const s = await getStore();
  if (!s) return null;
  const cats = catsLite(s);
  const monthly = s.recurring.filter((r) => !r.paused).reduce((a, r) => a + (r.frequency === "mensal" ? r.amount : r.frequency === "semanal" ? r.amount * 4.33 : r.amount / 12), 0);
  return (
    <>
      <PageHeader title="Rápidos" sub="Favoritos de um toque e gastos que se lançam sozinhos." back="/gastos" />

      <div className="section-h rv" style={v(1)}><h2>Favoritos</h2><FavoriteButton categories={cats} /></div>
      {s.favorites.length ? (
        <div className="fav-grid rv" style={v(2)}>
          {s.favorites.map((f) => {
            const c = catOf(s, f.categoryId);
            return (
              <FavoriteButton key={f.id} className="fav-card" categories={cats} initial={{ id: f.id, label: f.label, amount: f.amount, categoryId: f.categoryId, note: f.note, vendor: f.vendor }}>
                <CatIcon icon={c.icon} color={c.color} size={36} />
                <b>{f.label}</b><span className="money">{brl(f.amount, true)}</span><small>{c.name}</small>
              </FavoriteButton>
            );
          })}
        </div>
      ) : <Card className="rv" style={v(2)}><EmptyState icon="star" text="Crie botões para gastos repetidos (lavagem, estacionamento, café do posto). Eles aparecem no + e lançam com um toque." /></Card>}

      <div className="section-h rv" style={v(3)}><h2>Recorrentes</h2>{monthly > 0 && <span className="muted-s">≈ <span className="money">{brl(monthly)}</span>/mês</span>}</div>
      {s.recurring.length ? (
        <ul className="ev-list rv" style={v(4)}>
          {s.recurring.map((r) => {
            const c = catOf(s, r.categoryId);
            const d = daysUntil(r.nextDate);
            return (
              <li key={r.id} data-done={r.paused}>
                <RecurringButton className="ev-main" categories={cats} initial={{ id: r.id, amount: r.amount, categoryId: r.categoryId, note: r.note, frequency: r.frequency, nextDate: r.nextDate, endDate: r.endDate }}>
                  <span className="ev-ic" style={{ "--c": c.color } as CSSProperties}><Icon name="repeat" size={18} /></span>
                  <span className="ev-t"><b>{r.note || c.name} <span className="money">{brl(r.amount, true)}</span></b>
                    <span>{c.name} · {FREQ[r.frequency]}{r.endDate ? ` até ${dateBR(r.endDate)}` : ""} {r.paused && <Pill tone="muted">pausado</Pill>}</span></span>
                  <span className="ev-when">{r.paused ? "—" : `próximo ${countdown(d).replace("vence ", "")}`}</span>
                </RecurringButton>
                <PauseButton id={r.id} paused={r.paused} />
              </li>
            );
          })}
        </ul>
      ) : <Card className="rv" style={v(4)}><EmptyState icon="repeat" text="Ao registrar um gasto, escolha “Repetir” (semanal, mensal ou anual). O app lança sozinho no dia certo, sem duplicar." /></Card>}
      <p className="foot-hint rv"><Icon name="info" size={14} /> Pausar não apaga nada. Encerrar para os próximos; os já lançados continuam nos gastos.</p>
    </>
  );
}
