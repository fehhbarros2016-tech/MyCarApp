import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { AddExpenseButton } from "@/components/Launchers";
import { ExpenseList } from "@/components/lists/ExpenseList";
import { Icon } from "@/components/ui/Icon";
import { Card, CatIcon, Delta, EmptyState, Money, PageHeader, v } from "@/components/ui/kit";
import { byCategory, entries, kmStats } from "@/lib/calc";
import { addMonths, currentMonth, monthKey, monthLong } from "@/lib/format";
import { catsLite, toRows } from "@/lib/rows";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Gastos" };
export const dynamic = "force-dynamic";

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ m?: string; c?: string }> }) {
  const [s, sp] = await Promise.all([getStore(), searchParams]);
  if (!s) return null;
  const key = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m! : currentMonth();
  const all = entries(s);
  const month = all.filter((e) => monthKey(e.date) === key);
  const prev = all.filter((e) => monthKey(e.date) === addMonths(key, -1));
  const list = sp.c ? month.filter((e) => e.cat.id === sp.c) : month;
  const cats = byCategory(month);
  const total = list.reduce((a, e) => a + e.amount, 0);
  const prevTotal = sp.c ? prev.filter((e) => e.cat.id === sp.c).reduce((a, e) => a + e.amount, 0) : prev.reduce((a, e) => a + e.amount, 0);
  const isCurrent = key === currentMonth();
  const q = (m: string, c?: string) => `/gastos?m=${m}${c ? `&c=${c}` : ""}`;
  const selected = sp.c ? cats.find((c) => c.cat.id === sp.c)?.cat : null;

  return (
    <>
      <PageHeader title="Gastos" action={<AddExpenseButton categories={catsLite(s)} lastKm={kmStats(s).last} label="Novo" />} />

      <div className="month-nav rv" style={v(1)}>
        <Link href={q(addMonths(key, -1), sp.c)} className="icon-btn" aria-label="Mês anterior" scroll={false}><Icon name="back" size={18} /></Link>
        <div className="mn-c">
          <b>{monthLong(key).replace(/^./, (c) => c.toUpperCase())}</b>
          <span><Money value={total} cents /> · {list.length} {list.length === 1 ? "lançamento" : "lançamentos"} <Delta value={prevTotal ? (total - prevTotal) / prevTotal : null} /></span>
        </div>
        {isCurrent ? <span className="icon-btn ghost" aria-hidden /> :
          <Link href={q(addMonths(key, 1), sp.c)} className="icon-btn" aria-label="Próximo mês" scroll={false}><Icon name="chevron" size={18} /></Link>}
      </div>

      {cats.length > 0 && (
        <div className="filter-chips rv" style={v(2)}>
          <Link href={q(key)} className="fchip" data-on={!sp.c} scroll={false}>Todas</Link>
          {cats.map((c) => (
            <Link key={c.cat.id} href={q(key, c.cat.id)} className="fchip" data-on={sp.c === c.cat.id} scroll={false}
              style={{ "--c": c.cat.color } as CSSProperties}>
              <i />{c.cat.name} <span className="money num">{Math.round(c.pct * 100)}%</span>
            </Link>
          ))}
        </div>
      )}

      {selected && (
        <div className="sel-cat rv" style={v(3)}>
          <CatIcon icon={selected.icon} color={selected.color} size={40} />
          <div><b>{selected.name}</b><span>{Math.round((cats.find((c) => c.cat.id === sp.c)?.pct ?? 0) * 100)}% dos gastos do mês</span></div>
        </div>
      )}

      {list.length ? (
        <ExpenseList rows={toRows(s, list)} categories={catsLite(s)} lastKm={kmStats(s).last} />
      ) : (
        <Card className="rv" style={v(3)}>
          <EmptyState icon="wallet" text={isCurrent ? "Nenhum gasto neste mês. Toque em Novo ou no + para registrar." : "Nenhum gasto neste mês."} />
        </Card>
      )}
    </>
  );
}
