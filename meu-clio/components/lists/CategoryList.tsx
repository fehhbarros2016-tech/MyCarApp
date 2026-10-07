"use client";

import { useState, type CSSProperties } from "react";
import { moveCategory, setCategoryArchived } from "@/lib/actions";
import { Icon } from "@/components/ui/Icon";
import { CatIcon } from "@/components/ui/kit";
import { Sheet, Switch, useRun } from "@/components/ui/client";
import { CategoryForm, GROUPS } from "@/components/forms/CategoryForm";

export type CatRow = { id: string; slug: string; name: string; icon: string; color: string; group: string; archived: boolean; custom: boolean; count: number; total: number };

export function CategoryList({ rows }: { rows: CatRow[] }) {
  const [open, setOpen] = useState<CatRow | null>(null);
  const { run, busy } = useRun();
  return (
    <>
      <ul className="cat-list">
        {rows.map((c, i) => (
          <li key={c.id} className="rv" data-archived={c.archived} style={{ "--i": Math.min(i, 12) } as CSSProperties}>
            <button className="cat-main" onClick={() => setOpen(c)}>
              <CatIcon icon={c.icon} color={c.color} size={36} />
              <span className="cat-t">
                <b>{c.name}{c.custom && <em>sua</em>}</b>
                <span>{GROUPS.find((g) => g.value === c.group)?.label} · {c.count ? `${c.count} lançamentos · R$ ${Math.round(c.total).toLocaleString("pt-BR")}` : "sem lançamentos"}</span>
              </span>
            </button>
            <div className="cat-ctrl">
              <button className="icon-btn sm" aria-label="Subir" disabled={busy || i === 0} onClick={() => run(() => moveCategory(c.id, -1))}><Icon name="up" size={15} /></button>
              <button className="icon-btn sm" aria-label="Descer" disabled={busy || i === rows.length - 1} onClick={() => run(() => moveCategory(c.id, 1))}><Icon name="down" size={15} /></button>
              <Switch checked={!c.archived} label={c.archived ? `Mostrar ${c.name}` : `Ocultar ${c.name}`} disabled={busy || c.slug === "combustivel"}
                onChange={(on) => run(() => setCategoryArchived(c.id, !on))} />
            </div>
          </li>
        ))}
      </ul>
      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title="Editar categoria">
        {open && <CategoryForm initial={{ id: open.id, name: open.name, icon: open.icon, color: open.color, group: open.group }} onDone={() => setOpen(null)} />}
      </Sheet>
    </>
  );
}
