"use client";

import { useState } from "react";
import { quickShop } from "@/lib/actions-car";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/client";

export type ShopLite = { id: string; name: string; kind: string };

/**
 * Oficina: na primeira vez, toque no + e digite o nome. Depois é só escolher na lista.
 * Envia "shop" (id) e "vendor" (nome, para as listas antigas continuarem mostrando).
 */
export function ShopPicker({ shops, value, onChange, label = "Oficina", kind = "oficina" }: {
  shops: ShopLite[]; value: string | null; onChange?: (id: string | null) => void; label?: string; kind?: string;
}) {
  const [list, setList] = useState(shops);
  const [sel, setSel] = useState<string | null>(value);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const pick = (id: string | null) => { setSel(id); onChange?.(id); };
  const chosen = list.find((s) => s.id === sel) ?? null;
  const shown = [...list].sort((a, b) => Number(b.kind === kind) - Number(a.kind === kind));

  const create = async () => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    const r = await quickShop(n, kind);
    setBusy(false);
    if (!r.ok || !r.id) { toast(r.error ?? "Não consegui salvar", { tone: "error" }); return; }
    if (!list.some((s) => s.id === r.id)) setList((l) => [...l, { id: r.id!, name: n, kind }]);
    pick(r.id);
    setAdding(false); setName("");
    toast(r.msg ?? "Adicionada");
  };

  return (
    <div className="field">
      <span className="lbl">{label}</span>
      {adding ? (
        <div className="inline-form">
          <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nome da ${label.toLowerCase()}`} maxLength={80} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void create(); } }} />
          <button type="button" className="btn-primary sm" onClick={create} disabled={busy || !name.trim()}>{busy && <span className="spin" aria-hidden />}Salvar</button>
          <button type="button" className="icon-btn" aria-label="Cancelar" onClick={() => setAdding(false)}><Icon name="x" size={16} /></button>
        </div>
      ) : (
        <div className="chips-scroll" role="radiogroup" aria-label={label}>
          <button type="button" className="chip chip-add" onClick={() => setAdding(true)} aria-label={`Adicionar ${label.toLowerCase()}`}>
            <Icon name="plus" size={14} />{list.length ? "Nova" : `Adicionar ${label.toLowerCase()}`}
          </button>
          {shown.map((s) => (
            <button key={s.id} type="button" className="chip" role="radio" aria-checked={sel === s.id} data-on={sel === s.id}
              onClick={() => pick(sel === s.id ? null : s.id)}>{s.name}</button>
          ))}
        </div>
      )}
      <input type="hidden" name="shop" value={sel ?? ""} />
      <input type="hidden" name="vendor" value={chosen?.name ?? ""} />
    </div>
  );
}
