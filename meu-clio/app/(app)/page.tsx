import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { MonthChart } from "@/components/charts/MonthChart";
import { CatBars, Donut } from "@/components/charts/static";
import { FuelGauge } from "@/components/fuel/FuelGauge";
import { ExpenseList } from "@/components/lists/ExpenseList";
import { PrivacyToggle } from "@/components/PrefToggles";
import { CountUp } from "@/components/ui/CountUp";
import { Icon } from "@/components/ui/Icon";
import { Bar, Card, Delta, EmptyState, Money, Ring, v } from "@/components/ui/kit";
import { alerts, entries, fuelStats, installmentsSummary, monthOverview, totals, upcoming } from "@/lib/calc";
import { addMonths, brl, countdown, currentMonth, daysUntil, dec1, greeting, intf, monthLong, monthShort } from "@/lib/format";
import { formatBars } from "@/lib/fuel";
import { catsLite, toRows } from "@/lib/rows";
import { getStore } from "@/lib/store";
import { IS_PROD } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const s = await getStore();
  if (!s) return <NotConfigured />;
  const st = s.settings, show = st.home;
  const m = monthOverview(s);
  const t = totals(s);
  const f = fuelStats(s);
  const inst = installmentsSummary(s);
  const up = upcoming(s).slice(0, 4);
  const al = alerts(s);
  const recent = toRows(s, entries(s)).slice(0, 6);
  const cats = catsLite(s);
  const key = currentMonth();
  const kmPerL = f.kmPerL ? (st.consumptionUnit === "l100" ? `${dec1(100 / f.kmPerL)} L/100` : `${dec1(f.kmPerL)} km/l`) : "—";

  return (
    <div className="home">
      <div className="top rv">
        <div>
          <p className="hello">{greeting()}{s.name ? <>, <b>{s.name}</b></> : null}</p>
          <p className="today">{monthLong(key).replace(/^./, (c) => c.toUpperCase())}{!IS_PROD && <span className="dev-tag">dev</span>}</p>
        </div>
        <div className="top-actions">
          <PrivacyToggle hidden={st.hideValues} />
          <Link href="/configuracoes" className="icon-btn" aria-label="Configurações"><Icon name="gear" size={18} /></Link>
        </div>
      </div>

      {show.alerts && (
        <div className="alerts rv" style={v(1)}>
          {al.map((a) => (
            <Link key={a.id} href={a.href} className="alert" data-tone={a.tone}>
              <span className="alert-ic"><Icon name={a.icon} size={17} /></span>
              <span className="alert-t"><b>{a.title}</b><span>{a.detail}</span></span>
            </Link>
          ))}
        </div>
      )}

      <div className="home-grid">
        <div className="col">
          <div className="hero rv" style={v(2)}>
            <h1 className="word" data-long={s.vehicle.heroWord.length > 4} aria-label={s.vehicle.heroWord}>{s.vehicle.heroWord}</h1>
            <div className="glow" />
            <Image className="car" src="/car/clio.webp" alt={s.vehicle.name} width={880} height={504} priority sizes="(min-width: 980px) 560px, 100vw" />
          </div>

          <Card className="month-card rv" style={v(3)}>
            <div className="month-head">
              <div>
                <span className="eyebrow">Gastos de {monthLong(key)}</span>
                <div className="big num money"><small>R$</small>{st.countUp ? <CountUp value={Math.round(m.total)} /> : intf(Math.round(m.total))}</div>
                <div className="month-sub">
                  <Delta value={m.delta} />
                  <span>{m.delta != null ? `vs ${monthShort(addMonths(key, -1))} (` : ""}{m.delta != null && <Money value={m.prevTotal} />}{m.delta != null ? ")" : `${m.count} ${m.count === 1 ? "lançamento" : "lançamentos"}`}</span>
                </div>
              </div>
              {m.budget ? (
                <Ring value={m.budgetPct ?? 0} size={76} color={(m.budgetPct ?? 0) >= 1 ? "var(--danger)" : (m.budgetPct ?? 0) * 100 >= st.budgetAlertPct ? "var(--warn)" : undefined}>
                  <b className="num">{Math.round((m.budgetPct ?? 0) * 100)}%</b><span>orçam.</span>
                </Ring>
              ) : (
                <Link href="/configuracoes#orcamento" className="budget-cta"><Icon name="target" size={16} />Definir orçamento</Link>
              )}
            </div>
            {show.chart && (
              <MonthChart cumulative={m.cumulative} prev={m.prevCumulative} budget={m.budget} days={m.days}
                label={monthShort(key)} prevLabel={monthShort(addMonths(key, -1))} />
            )}
            <div className="month-foot">
              <div><span>Média por dia</span><Money value={m.dailyAvg} /></div>
              <div><span>Projeção do mês</span>{m.projection ? <Money value={m.projection} /> : <b className="muted">—</b>}</div>
              <div><span>Maior gasto</span>{m.biggest ? <Money value={m.biggest.amount} /> : <b className="muted">—</b>}</div>
            </div>
          </Card>

          {show.stats && (
            <div className="tiles rv" style={v(4)}>
              <Link href="/relatorios" className="tile"><span className="eyebrow">Custo total</span><Money value={t.total} /><small>desde a compra</small></Link>
              <Link href="/relatorios" className="tile"><span className="eyebrow">Custo / km</span>{t.costPerKm != null ? <Money value={t.costPerKm} cents /> : <b className="muted">—</b>}<small>{t.km.driven ? `${intf(t.km.driven)} km rodados` : "informe o km"}</small></Link>
              <Link href="/combustivel" className="tile"><span className="eyebrow">Consumo</span><b className="num">{kmPerL}</b><small>{f.segments.length ? `${f.segments.length} medições` : "após 2 abastecimentos"}</small></Link>
              <Link href="/combustivel" className="tile"><span className="eyebrow">Km atual</span><b className="num">{t.km.last != null ? intf(t.km.last) : "—"}</b><small>{t.km.perMonth ? `${intf(Math.round(t.km.perMonth))} km/mês` : "hodômetro"}</small></Link>
            </div>
          )}
        </div>

        <div className="col">
          {show.categories && (
            <Card title="Para onde foi o dinheiro" action={m.count ? { href: "/relatorios", label: "Relatórios" } : undefined} className="rv" style={v(5)}>
              {m.byCat.length ? (
                <div className="donut-row">
                  <Donut data={m.byCat.slice(0, 6).map((c) => ({ label: c.cat.name, value: c.total, color: c.cat.color }))} size={132} stroke={15}>
                    <b className="num">{m.byCat.length}</b><span>{m.byCat.length === 1 ? "categoria" : "categorias"}</span>
                  </Donut>
                  <CatBars total={m.total} data={m.byCat.slice(0, 4).map((c) => ({ name: c.cat.name, icon: c.cat.icon, color: c.cat.color, value: c.total }))} />
                </div>
              ) : <EmptyState icon="pie" text="Nenhum gasto neste mês ainda. Toque no + para registrar o primeiro." />}
            </Card>
          )}

          {show.tank && (
            <Card title="Tanque" action={{ href: "/combustivel/nivel", label: "Atualizar" }} className="rv" style={v(6)}>
              {f.level ? (
                <div className="tank-row">
                  <div>
                    <div className="tank-l num">{dec1(f.level.liters)}<small>L</small></div>
                    <p className="muted-s">{formatBars(f.level.bars)} de {s.vehicle.bars} barras · tanque de {s.vehicle.tankL} L</p>
                    {f.autonomyKm ? <p className="autonomy"><Icon name="road" size={14} /> Autonomia de ~{intf(Math.round(f.autonomyKm))} km</p> : null}
                    <Link href="/combustivel/novo" className="btn-ghost sm"><Icon name="fuel" size={15} />Abastecer</Link>
                  </div>
                  <FuelGauge bars={s.vehicle.bars} value={f.level.bars} size="sm" label="Nível do tanque" />
                </div>
              ) : <EmptyState icon="gauge" text="Marque no marcador quanto combustível tem agora." cta={{ href: "/combustivel/nivel", label: "Marcar nível" }} />}
            </Card>
          )}

          {show.purchase && (
            <Card title="Compra do carro" action={{ href: "/parcelas", label: inst.total ? "Parcelas" : "Cadastrar" }} className="rv" style={v(7)}>
              {inst.total ? (
                <>
                  <div className="buy-row">
                    <Ring value={inst.pct} size={70}><b className="num">{Math.round(inst.pct * 100)}%</b></Ring>
                    <div>
                      <p className="buy-n"><b className="num">{inst.paid}</b> de {inst.total} parcelas pagas</p>
                      <p className="muted-s">Faltam <Money value={inst.remainingAmount} /> em {inst.remaining} parcelas</p>
                      {inst.next && <p className="muted-s">Próxima: {brl(inst.next.amount)} · {countdown(daysUntil(inst.next.dueDate))}</p>}
                    </div>
                  </div>
                  <Bar value={inst.pct} />
                </>
              ) : <EmptyState icon="receipt" text="Cadastre valor, entrada e parcelas para ver quanto falta pagar." cta={{ href: "/parcelas", label: "Cadastrar compra" }} />}
            </Card>
          )}

          {show.agenda && (
            <Card title="Próximos eventos" action={{ href: "/agenda", label: "Agenda" }} className="rv" style={v(8)}>
              {up.length ? (
                <ul className="next">
                  {up.map((u) => (
                    <li key={u.id}>
                      <i className="dot" data-tone={u.tone} />
                      <div className="next-t"><b>{u.title}</b>{u.detail && <span>{u.detail}</span>}</div>
                      <div className="next-c" data-tone={u.tone}>{u.days != null ? countdown(u.days) : u.kmLeft != null ? (u.kmLeft >= 0 ? `faltam ${intf(u.kmLeft)} km` : `passou ${intf(-u.kmLeft)} km`) : ""}</div>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon="calendar" text="Nada agendado. IPVA, seguro, revisões e trocas de óleo aparecem aqui." cta={{ href: "/agenda", label: "Criar lembrete" }} />}
            </Card>
          )}

          {show.recent && (
            <Card title="Últimos lançamentos" action={recent.length ? { href: "/gastos", label: "Ver todos" } : undefined} className="rv" style={v(9)}>
              {recent.length ? <ExpenseList rows={recent} categories={cats} lastKm={t.km.last} groupByDay={false} />
                : <EmptyState icon="wallet" text="Seus gastos aparecem aqui. Toque no + para começar." />}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function NotConfigured() {
  return (
    <Card title="Conectar o banco" style={{ marginTop: 24 } as CSSProperties}>
      <p className="muted-s">Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel e recarregue.</p>
    </Card>
  );
}
