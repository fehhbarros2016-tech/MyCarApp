import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { WeekChart } from "@/components/home/WeekChart";
import { FuelGauge } from "@/components/fuel/FuelGauge";
import { formatBars } from "@/lib/fuel";
import { getHomeData } from "@/lib/data/home";
import { countdown, daysUntil, greeting, km, money } from "@/lib/format";
import s from "@/components/home/home.module.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const d = await getHomeData();

  if (!d.configured) {
    return (
      <>
        <div className={s.top}><p className={s.hello}>Quase lá</p><DemoBadge /></div>
        <Hero word="CLIO" />
        <Card title="Conectar o banco" className={`${s.setup} rv`}>
          <ol>
            <li>Crie o projeto no Supabase e rode as migrations de <code>supabase/migrations</code>.</li>
            <li>Preencha <code>SUPABASE_URL</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code> no <code>.env.local</code> ou na Vercel.</li>
            <li>Recarregue esta página.</li>
          </ol>
        </Card>
      </>
    );
  }

  const v = d.vehicle;
  const inst = d.installments;
  const hasPurchase = inst.total > 0 || v?.purchasePrice != null;
  const week = d.last7.reduce((a, p) => a + p.amount, 0);

  return (
    <>
      <div className={s.top}>
        <p className={s.hello}>{greeting()}{d.name ? <>, <b>{d.name}</b></> : null}</p>
        <DemoBadge />
      </div>

      <div className={s.layout}>
        <div>
          <Hero word={v?.heroWord ?? "CLIO"} />
          <div className={`${s.total} rv`} style={{ "--i": 2 } as React.CSSProperties}>
            <div className="eyebrow">Custo total</div>
            <div className={`${s.big} num`}><small>R$</small><CountUp value={d.totalCost} /></div>
            <p>{d.totalCost ? "Total investido no carro" : "Os valores aparecem conforme você registra"}</p>
          </div>
          <div className={`${s.stats} rv`} style={{ "--i": 3 } as React.CSSProperties}>
            <div className={s.stat}>
              <div className="eyebrow">Este mês</div>
              <div className={`${s.v} num`}>R$ {money(d.monthSpend)}</div>
            </div>
            <div className={s.stat}>
              <div className="eyebrow">Custo / km</div>
              <div className={`${s.v} num`}>{d.costPerKm == null ? <span className={s.dim}>—</span> : `R$ ${money(d.costPerKm, true)}`}</div>
            </div>
            <div className={s.stat}>
              <div className="eyebrow">Parcelas</div>
              <div className={`${s.v} num`}>{inst.total ? <>{inst.paid}<em> / {inst.total}</em></> : <span className={s.dim}>—</span>}</div>
            </div>
          </div>
        </div>

        <div className={s.cards}>
          <Card title="Carro" action={hasPurchase ? { href: "/parcelas", label: "Ver parcelas" } : undefined}
            className="rv" style={{ "--i": 4 } as React.CSSProperties}>
            {hasPurchase ? (
              <>
                <div className={s.payRow}>
                  <span className={`${s.price} num`}>{v?.purchasePrice != null ? `R$ ${money(v.purchasePrice)}` : `${inst.total} parcelas`}</span>
                  <span className={s.pct}>{inst.total ? Math.round((inst.paid / inst.total) * 100) : 0}%</span>
                </div>
                <ProgressBar value={inst.total ? inst.paid / inst.total : 0} label="Parcelas pagas" />
                <div className={s.of}>
                  {inst.paid} de {inst.total} parcelas pagas
                  {v?.downPayment ? <> · entrada de R$&nbsp;{money(v.downPayment)}</> : null}
                </div>
                <div className={s.meta}>
                  <div><span>Pago</span><strong className="num">R$ {money((v?.downPayment ?? 0) + inst.paidAmount)}</strong></div>
                  <div><span>Restante</span><strong className="num">R$ {money(inst.remainingAmount)}</strong></div>
                </div>
              </>
            ) : (
              <EmptyState icon="receipt" text="Cadastre o valor do carro, a entrada e as parcelas para acompanhar quanto falta pagar."
                cta={{ href: "/parcelas", label: "Cadastrar compra" }} />
            )}
          </Card>

          <Card title="Gastos dos últimos 7 dias" className="rv" style={{ "--i": 5 } as React.CSSProperties}>
            {week > 0 ? (
              <>
                <div className={s.sum7}><b className="num">R$ {money(week)}</b><span>média R$ {money(week / 7)}/dia</span></div>
                <WeekChart data={d.last7} />
              </>
            ) : (
              <EmptyState icon="wallet" text="Nenhum gasto nos últimos 7 dias." cta={{ href: "/gastos", label: "Adicionar gasto" }} />
            )}
          </Card>

          <Card title="Próximos eventos" action={d.upcoming.length ? { href: "/agenda", label: "Agenda" } : undefined}
            className="rv" style={{ "--i": 6 } as React.CSSProperties}>
            {d.upcoming.length ? (
              <ul className={s.next}>
                {d.upcoming.map((e) => {
                  const days = e.dueDate ? daysUntil(e.dueDate) : null;
                  const kmLeft = e.dueKm != null && d.lastKm != null ? e.dueKm - d.lastKm : null;
                  return (
                    <li key={e.id}>
                      <i className={s.dot} data-soon={days != null && days <= 5} />
                      <div className={s.t}><b>{e.title}</b>{e.detail && <span>{e.detail}</span>}</div>
                      <div className={s.c}>
                        {days != null ? countdown(days) : kmLeft != null ? (kmLeft > 0 ? `faltam ${km(kmLeft)}` : "km atingido") : ""}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon="calendar" text="Nada agendado. Parcelas, IPVA, seguro e trocas de óleo aparecem aqui."
                cta={{ href: "/agenda", label: "Criar lembrete" }} />
            )}
          </Card>

          <Card title="Tanque" action={{ href: d.tank ? "/combustivel/nivel" : "/combustivel/novo", label: d.tank ? "Atualizar" : "Abastecer" }}
            className="rv" style={{ "--i": 7 } as React.CSSProperties}>
            {d.tank ? (
              <div className={s.tank}>
                <FuelGauge bars={d.tank.totalBars} value={d.tank.bars} size="sm" label="Nível do tanque" />
                <div>
                  <div className={`${s.tankL} num`}>{d.tank.liters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}<small>L</small></div>
                  <div className={s.tankM}>{formatBars(d.tank.bars)} de {d.tank.totalBars} barras · tanque de {d.tank.capacity} L</div>
                </div>
              </div>
            ) : (
              <EmptyState icon="fuel" text="Marque o nível do tanque no marcador para o app saber quanto combustível tem no carro."
                cta={{ href: "/combustivel/nivel", label: "Marcar nível" }} />
            )}
          </Card>

          {d.lastKm == null && (
            <Card title="Hodômetro" className="rv" style={{ "--i": 8 } as React.CSSProperties}>
              <EmptyState icon="gauge" text="Informe a quilometragem atual para calcular o custo por km."
                cta={{ href: "/combustivel/nivel", label: "Informar km" }} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Hero({ word }: { word: string }) {
  return (
    <div className={s.hero}>
      <h1 className={s.word} data-long={word.length > 4} aria-label={word}>{word}</h1>
      <div className={s.glow} />
      <Image className={s.car} src="/car/clio.webp" alt="Renault Clio" width={880} height={504} priority
        sizes="(min-width: 980px) 560px, 100vw" />
    </div>
  );
}
