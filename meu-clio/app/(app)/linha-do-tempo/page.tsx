import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { Card, EmptyState, PageHeader, v } from "@/components/ui/kit";
import { brl, dateBR } from "@/lib/format";
import { getStore } from "@/lib/store";
import { TIMELINE_KINDS, timeline, type TimelineKind } from "@/lib/timeline";

export const metadata: Metadata = { title: "Linha do tempo" };
export const dynamic = "force-dynamic";

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const [s, sp] = await Promise.all([getStore(), searchParams]);
  if (!s) return null;
  const f = TIMELINE_KINDS.some((k) => k.v === sp.f) ? (sp.f as TimelineKind) : null;
  const all = timeline(s, { includeFuel: f === "combustivel" });
  const list = f ? all.filter((x) => x.kind === f || (f === "manutencao" && x.kind === "compra")) : all;
  const years = [...new Set(list.map((x) => x.date.slice(0, 4)))];
  return (
    <>
      <PageHeader title="Linha do tempo" sub={`Tudo que aconteceu com o ${s.vehicle.name}.`} back="/mais"
        action={<Link href="/relatorio-venda" className="btn-ghost sm"><Icon name="print" size={15} />Relatório</Link>} />
      <div className="filter-chips rv" style={v(1)}>
        <Link href="/linha-do-tempo" className="fchip" data-on={!f} scroll={false} replace>Tudo</Link>
        {TIMELINE_KINDS.map((k) => <Link key={k.v} href={`/linha-do-tempo?f=${k.v}`} className="fchip" data-on={f === k.v} scroll={false} replace>{k.l}</Link>)}
      </div>
      {!list.length ? <Card className="rv"><EmptyState icon="clock" text="A história do carro aparece aqui conforme você registra manutenções, peças, pneus, problemas e viagens." /></Card> : (
        years.map((y) => (
          <section key={y} className="tl-year">
            <h2 className="tl-y rv">{y}</h2>
            <ol className="tl">
              {list.filter((x) => x.date.startsWith(y)).map((x, i) => {
                const inner = (
                  <>
                    <span className="tl-dot" style={{ "--c": x.color } as CSSProperties}><Icon name={x.icon} size={14} /></span>
                    <span className="tl-t"><span className="tl-d">{dateBR(x.date)}</span><b>{x.title}</b>{x.detail && <span>{x.detail}</span>}</span>
                    {x.amount ? <span className="tl-v money num">{brl(x.amount)}</span> : null}
                  </>
                );
                return <li key={x.id} className="rv" style={v(Math.min(i, 12))}>{x.href ? <Link href={x.href} className="tl-row">{inner}</Link> : <div className="tl-row">{inner}</div>}</li>;
              })}
            </ol>
          </section>
        ))
      )}
    </>
  );
}
