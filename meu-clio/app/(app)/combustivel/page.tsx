import type { Metadata } from "next";
import Link from "next/link";
import { FuelGauge } from "@/components/fuel/FuelGauge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFuelOverview } from "@/lib/data/fuel";
import { km, money } from "@/lib/format";
import { formatBars } from "@/lib/fuel";
import s from "./fuel-page.module.css";

export const metadata: Metadata = { title: "Combustível" };
export const dynamic = "force-dynamic";

const L = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dateBR = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");

export default async function FuelPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const [o, sp] = await Promise.all([getFuelOverview(), searchParams]);

  return (
    <>
      <PageHeader title="Combustível" sub="Abastecimentos, nível do tanque e consumo." />
      {sp.salvo && <p className={`${s.saved} rv`} role="status">Salvo.</p>}

      <div className={s.grid}>
        <Card title="Tanque agora" action={{ href: "/combustivel/nivel", label: "Atualizar" }} className="rv" style={{ "--i": 1 } as React.CSSProperties}>
          {o?.level ? (
            <div className={s.tank}>
              <FuelGauge bars={o.tank.bars} value={o.level.bars} size="sm" label="Último nível registrado" />
              <div>
                <div className={`${s.big} num`}>{L(o.level.liters)}<small>L</small></div>
                <div className={s.meta}>{formatBars(o.level.bars)} de {o.tank.bars} barras · de {o.tank.capacity} L</div>
                <div className={s.meta}>medido em {dateBR(o.level.date)}{o.level.km != null ? ` aos ${km(o.level.km)}` : ""}</div>
              </div>
            </div>
          ) : (
            <EmptyState icon="gauge" text="Marque no marcador quanto combustível tem agora." cta={{ href: "/combustivel/nivel", label: "Marcar nível" }} />
          )}
        </Card>

        <Card title="Consumo" className="rv" style={{ "--i": 2 } as React.CSSProperties}>
          <div className={s.stats}>
            <div><span className="eyebrow">Média</span>
              <b className="num">{o?.avgKmPerLiter ? `${L(o.avgKmPerLiter)} km/l` : "—"}</b>
              <span className={s.meta}>{o?.segments ? `${o.segments} trecho${o.segments > 1 ? "s" : ""} medido${o.segments > 1 ? "s" : ""}` : "precisa de 2 leituras com km"}</span></div>
            <div><span className="eyebrow">Preço médio</span>
              <b className="num">{o?.avgPrice ? `R$ ${money(o.avgPrice, true)}` : "—"}</b>
              <span className={s.meta}>por litro</span></div>
          </div>
        </Card>
      </div>

      <div className={`${s.head} rv`} style={{ "--i": 3 } as React.CSSProperties}>
        <h2 className="eyebrow">Abastecimentos</h2>
        <Link href="/combustivel/novo" className={s.add}><Icon name="plus" size={16} />Abastecer</Link>
      </div>

      {o?.fills.length ? (
        <ul className={`${s.list} rv`} style={{ "--i": 4 } as React.CSSProperties}>
          {o.fills.map((f) => (
            <li key={f.id}>
              <div className={s.when}><b>{dateBR(f.date)}</b><span>{f.km != null ? km(f.km) : "sem km"}</span></div>
              <div className={s.what}>
                <b className="num">{L(f.liters)} L</b>
                <span>{f.barsBefore != null && f.barsAfter != null ? `${formatBars(f.barsBefore)} → ${formatBars(f.barsAfter)} barras` : ""}{f.source === "marcador" ? " · pelo marcador" : " · pela bomba"}</span>
              </div>
              <div className={s.cost}><b className="num">R$ {money(f.amount, true)}</b><span>R$ {money(f.price, true)}/L</span></div>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="rv" style={{ "--i": 4 } as React.CSSProperties}>
          <EmptyState icon="fuel" text="Você ainda não registrou nenhum abastecimento." cta={{ href: "/combustivel/novo", label: "Adicionar abastecimento" }} />
        </Card>
      )}
    </>
  );
}
