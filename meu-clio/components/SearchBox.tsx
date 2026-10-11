"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { search, type SearchDoc } from "@/lib/search";
import { brl } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { CatIcon } from "@/components/ui/kit";
import { ExpenseList, type Row } from "@/components/lists/ExpenseList";
import type { CatLite, TripLite } from "@/components/forms/ExpenseForm";
import type { ShopLite } from "@/components/forms/ShopPicker";

const SUGGEST = ["comb", "oleo", "pneu", "seguro", "pedagio", "lavagem", "oficina"];

/** Busca instantânea: entende pedaço da palavra, erro de digitação e falta de acento. */
export function SearchBox({ rows, categories, lastKm, shops, trip }: { rows: Row[]; categories: CatLite[]; lastKm: number | null; shops: ShopLite[]; trip: TripLite | null }) {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") ?? "");
  const dq = useDeferredValue(q);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    const t = setTimeout(() => router.replace(dq ? `/buscar?q=${encodeURIComponent(dq)}` : "/buscar", { scroll: false }), 400);
    return () => clearTimeout(t);
  }, [dq, router]);

  const docs: SearchDoc[] = useMemo(() => rows.map((r) => ({
    id: r.id, date: r.date, amount: r.amount, title: r.title, sub: r.sub ?? "", catId: r.catId ?? "",
    extra: [r.edit?.note, r.edit?.vendor, r.maint?.service, r.tags?.join(" ")].filter(Boolean).join(" "),
  })), [rows]);
  const cats = useMemo(() => categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })), [categories]);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const res = useMemo(() => search(dq, docs, [...cats, { id: "parcelas", name: "Parcelas do carro", slug: "parcelas" }]), [dq, docs, cats]);
  const found = res.docs.map((h) => byId.get(h.doc.id)!).filter(Boolean);
  const total = found.reduce((a, r) => a + r.amount, 0);
  const catInfo = (id: string) => categories.find((c) => c.id === id) ?? { id, name: "Parcelas do carro", icon: "receipt", color: "#8fb8ff", slug: "parcelas" };

  return (
    <>
      <div className="search-bar rv">
        <Icon name="search" size={18} />
        <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: comb, oleo, pedagio, 150, setembro…"
          enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label="Buscar gastos" />
        {q && <button type="button" className="icon-btn sm" aria-label="Limpar" onClick={() => { setQ(""); input.current?.focus(); }}><Icon name="x" size={14} /></button>}
      </div>
      {!dq ? (
        <div className="search-hint rv">
          <p className="muted-s">Busque por categoria, descrição, local, oficina, valor ou mês. Pode escrever pela metade ou sem acento.</p>
          <div className="chips-scroll wrap">{SUGGEST.map((x) => <button key={x} type="button" className="chip" onClick={() => setQ(x)}>{x}</button>)}</div>
        </div>
      ) : (
        <>
          {res.cats.length > 0 && (
            <div className="search-cats">
              {res.cats.map((h) => {
                const c = catInfo(h.cat.id);
                const list = rows.filter((r) => r.catId === h.cat.id);
                return (
                  <button key={h.cat.id} type="button" className="search-cat" style={{ "--c": c.color } as CSSProperties} onClick={() => setQ(c.name)}>
                    <CatIcon icon={c.icon} color={c.color} size={34} />
                    <span><b>{c.name}</b><span>{list.length} {list.length === 1 ? "lançamento" : "lançamentos"} · <span className="money">{brl(list.reduce((a, r) => a + r.amount, 0))}</span></span></span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="section-h"><h2>{found.length ? `${found.length} ${found.length === 1 ? "resultado" : "resultados"}` : "Nada encontrado"}</h2>{found.length > 0 && <span className="muted-s money">{brl(total)}</span>}</div>
          {found.length > 0 ? <ExpenseList rows={found} categories={categories} lastKm={lastKm} shops={shops} trip={trip} showCat groupByDay={false} />
            : <p className="muted-s">Tente menos letras ou outra palavra (ex.: “comb” acha Combustível).</p>}
        </>
      )}
    </>
  );
}
