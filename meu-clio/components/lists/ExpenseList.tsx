"use client";

import { useState, type CSSProperties } from "react";
import { brl, dayLabel } from "@/lib/format";
import { CatIcon } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/client";
import { Icon } from "@/components/ui/Icon";
import dynamic from "next/dynamic";
import type { CatLite, TripLite } from "@/components/forms/ExpenseForm";
import type { MaintInitial } from "@/components/forms/MaintenanceForm";
import type { InstallmentLite } from "@/components/forms/InstallmentForms";
import type { ShopLite } from "@/components/forms/ShopPicker";

const Loading = () => <div className="form-skel"><i /><i /><i /></div>;
const ExpenseForm = dynamic(() => import("@/components/forms/ExpenseForm").then((m) => m.ExpenseForm), { loading: Loading });
const MaintenanceForm = dynamic(() => import("@/components/forms/MaintenanceForm").then((m) => m.MaintenanceForm), { loading: Loading });
const InstallmentForm = dynamic(() => import("@/components/forms/InstallmentForms").then((m) => m.InstallmentForm), { loading: Loading });

export type Row = {
  id: string; date: string; amount: number; title: string; sub?: string; cat: { icon: string; color: string; name: string };
  kind: "gasto" | "fuel" | "maint" | "parcela";
  edit?: { categoryId: string; km: number | null; vendor: string | null; note: string | null; tripId: string | null; recurring: boolean };
  tags?: string[];
  catId?: string;
  maint?: MaintInitial; inst?: InstallmentLite;
};

export function ExpenseList({ rows, categories, lastKm, groupByDay = true, limit, shops = [], trip = null, showCat = false }: {
  rows: Row[]; categories: CatLite[]; lastKm: number | null; groupByDay?: boolean; limit?: number; shops?: ShopLite[]; trip?: TripLite | null; showCat?: boolean;
}) {
  const [open, setOpen] = useState<Row | null>(null);
  const shown = limit ? rows.slice(0, limit) : rows;
  const groups: { day: string; total: number; items: Row[] }[] = [];
  for (const r of shown) {
    const g = groupByDay ? groups.find((x) => x.day === r.date) : groups[0];
    if (g) { g.items.push(r); g.total += r.amount; }
    else groups.push({ day: groupByDay ? r.date : "", total: r.amount, items: [r] });
  }
  const close = () => setOpen(null);

  return (
    <>
      <div className="xlist">
        {groups.map((g, gi) => (
          <div key={g.day || gi} className="xgroup rv" style={{ "--i": Math.min(gi, 8) } as CSSProperties}>
            {groupByDay && <div className="xday"><span>{dayLabel(g.day)}</span><span className="money num">{brl(g.total)}</span></div>}
            <ul>
              {g.items.map((r) => (
                <li key={r.id}>
                  <button className="xrow" onClick={() => setOpen(r)}>
                    <CatIcon icon={r.cat.icon} color={r.cat.color} />
                    <span className="xt"><b>{r.title}</b><span>{showCat && <i className="xcat" style={{ "--c": r.cat.color } as CSSProperties}>{r.cat.name}</i>}{r.tags?.map((t) => <i key={t} className="xtag">{t}</i>)}{r.sub ?? r.cat.name}</span></span>
                    <span className="xv money num">{brl(r.amount, true)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Sheet open={open?.kind === "gasto" || open?.kind === "fuel"} onClose={close} title={open?.kind === "fuel" ? "Editar abastecimento" : "Editar gasto"}>
        {open && (open.kind === "gasto" || open.kind === "fuel") && (
          <>
            {open.kind === "fuel" && <p className="sheet-note"><Icon name="gauge" size={15} /> Litros e marcador ficam como foram registrados. Aqui você ajusta valor, data, km e local.</p>}
            <ExpenseForm categories={categories} lastKm={lastKm} onDone={close} trip={trip}
              initial={{ id: open.id, amount: open.amount, date: open.date, categoryId: open.edit?.categoryId, km: open.edit?.km, vendor: open.edit?.vendor, note: open.edit?.note,
                tripId: open.edit?.tripId ?? null, recurring: open.edit?.recurring }} />
          </>
        )}
      </Sheet>
      <Sheet open={open?.kind === "maint"} onClose={close} title="Editar manutenção">
        {open?.kind === "maint" && <MaintenanceForm categories={categories} lastKm={lastKm} onDone={close} shops={shops} initial={{ ...open.maint, id: open.id }} />}
      </Sheet>
      <Sheet open={open?.kind === "parcela"} onClose={close} title={open?.inst ? `Parcela ${open.inst.number}` : "Parcela"}>
        {open?.kind === "parcela" && open.inst && <InstallmentForm item={open.inst} onDone={close} />}
      </Sheet>
    </>
  );
}
