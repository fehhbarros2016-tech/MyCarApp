import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BudgetInput, IncomeInput } from "@/components/ActionButtons";
import { AnnualButton } from "@/components/Launchers";
import { Icon } from "@/components/ui/Icon";
import { Bar, Card, CatIcon, EmptyState, Money, PageHeader, Pill, v } from "@/components/ui/kit";
import { entries, forecast, installmentsSummary } from "@/lib/calc";
import { addMonths, brl, currentMonth, monthKey, monthLong } from "@/lib/format";
import { annualReserve, annualSuggestions } from "@/lib/money";
import { catsLite } from "@/lib/rows";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Planejamento" };
export const dynamic = "force-dynamic";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export default async function PlanejamentoPage() {
  const s = await getStore();
  if (!s) return null;
  const st = s.settings;
  const key = currentMonth();
  const all = entries(s);
  // média dos últimos 3 meses completos (só meses desde o primeiro registro)
  const first = all.length ? monthKey(all[all.length - 1].date) : key;
  const months = [1, 2, 3].map((i) => addMonths(key, -i)).filter((m) => m >= first);
  const avg = months.length ? all.filter((e) => months.includes(monthKey(e.date))).reduce((a, e) => a + e.amount, 0) / months.length : null;
  const fc = forecast(s);
  const res = annualReserve(s);
  const sugg = annualSuggestions(s);
  const income = st.monthlyIncome;
  const inst = installmentsSummary(s);
  const cats = catsLite(s);
  const thisMonth = new Map<string, number>();
  for (const e of s.expenses) if (monthKey(e.date) === key) thisMonth.set(e.categoryId, (thisMonth.get(e.categoryId) ?? 0) + e.amount);
  const base = fc.ready ? fc.total : avg ?? 0;
  const share = income ? base / income : null;

  return (
    <>
      <PageHeader title="Planejamento" sub="Quanto o carro pesa no mês e quanto guardar para não ter susto." back="/mais" />

      <Card title="Carro x salário" className="rv" style={v(1)}>
        {income ? (
          <>
            <div className="share">
              <div className="share-n"><b className="num">{share != null ? `${Math.round(share * 100)}%` : "—"}</b><span>do salário vai para o carro {fc.ready ? "(previsto do mês)" : "(média)"}</span></div>
              <div className="share-v"><Money value={base} /><small>de <span className="money">{brl(income)}</span></small></div>
            </div>
            <Bar value={Math.min(1, share ?? 0)} color={share != null && share > 0.35 ? "var(--danger)" : share != null && share > 0.2 ? "var(--warn)" : undefined} />
            <div className="mini-stats" style={{ marginTop: 14 } as CSSProperties}>
              <div><span>Média dos últimos meses</span><b className="num money">{avg != null ? brl(avg) : "—"}</b></div>
              <div><span>Com a reserva anual</span><b className="num money">{brl(base + res.perMonthNow)}</b></div>
              {inst.next && <div><span>Parcela</span><b className="num money">{brl(inst.next.amount)}</b></div>}
              <div><span>Sobra do salário</span><b className="num money">{brl(Math.max(0, income - base - res.perMonthNow))}</b></div>
            </div>
            <p className="muted-s">Referência comum: até 15–20% da renda para o carro. Alterar o salário:</p>
            <IncomeInput value={income} />
          </>
        ) : (
          <EmptyState icon="piggy" text="Informe seu salário líquido para ver quanto do mês vai para o carro e quanto guardar. Fica só no seu banco de dados.">
            <IncomeInput value={null} />
          </EmptyState>
        )}
      </Card>

      <Card title="Reserva para gastos do ano" className="rv" style={v(2)}>
        {res.lines.length ? (
          <>
            <div className="share">
              <div className="share-n"><b className="num money">{brl(res.perMonthNow)}</b><span>guardar por mês para pagar tudo em dia</span></div>
              {income ? <div className="share-v"><Pill tone="info">{Math.round((res.perMonthNow / income) * 100)}% do salário</Pill></div> : null}
            </div>
            <ul className="reserve">
              {res.lines.map((l) => (
                <li key={l.cost.id}>
                  <AnnualButton className="reserve-main" categories={cats}
                    initial={{ id: l.cost.id, name: l.cost.name, amount: l.cost.amount, dueMonth: l.cost.dueMonth, categoryId: l.cost.categoryId, note: l.cost.note }}>
                    <span className="reserve-t"><b>{l.cost.name}</b><span>{MONTHS[l.cost.dueMonth - 1]}{l.paidThisCycle ? " · já pago este ano" : ` · em ${l.monthsLeft} ${l.monthsLeft === 1 ? "mês" : "meses"}`}</span></span>
                    <span className="reserve-v"><b className="money num">{brl(l.cost.amount)}</b><small><span className="money">{brl(l.perMonth)}</span>/mês</small></span>
                  </AnnualButton>
                </li>
              ))}
            </ul>
            <p className="muted-s">Total no ano: <b className="money">{brl(res.yearly)}</b> · média de <span className="money">{brl(res.perMonthSteady)}</span> por mês depois do primeiro ciclo.</p>
          </>
        ) : <p className="muted-s">Cadastre seguro, IPVA, licenciamento e outros gastos que vêm uma vez por ano. O app divide pelos meses que faltam.</p>}
        <div className="btn-row">
          <AnnualButton categories={cats} label="Adicionar gasto anual" />
          {sugg.map((x) => (
            <AnnualButton key={x.categoryId} categories={cats} className="btn-ghost sm" label={`${x.name} (${x.from})`}
              initial={{ name: x.name, amount: x.amount || undefined, dueMonth: x.dueMonth, categoryId: x.categoryId }} />
          ))}
        </div>
      </Card>

      <Card title={`Limite por categoria · ${monthLong(key)}`} className="rv" style={v(3)}>
        <p className="muted-s" style={{ marginTop: 0 } as CSSProperties}>Deixe em branco para não ter limite. O app avisa ao chegar em {st.budgetAlertPct}%.</p>
        <ul className="budget-list">
          {s.categories.filter((c) => !c.archived).map((c) => {
            const spent = thisMonth.get(c.id) ?? 0;
            const pct = c.budget ? spent / c.budget : null;
            return (
              <li key={c.id}>
                <CatIcon icon={c.icon} color={c.color} size={32} />
                <div className="budget-main">
                  <div className="budget-top"><b>{c.name}</b><span className="money num">{brl(spent)}{c.budget ? ` / ${brl(c.budget)}` : ""}</span></div>
                  {pct != null && <div className="cb-track"><i style={{ "--p": Math.min(1, pct), "--c": pct >= 1 ? "var(--danger)" : pct * 100 >= st.budgetAlertPct ? "var(--warn)" : c.color, "--d": "0ms" } as CSSProperties} /></div>}
                </div>
                <BudgetInput id={c.id} value={c.budget} />
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="link-grid rv" style={v(4)}>
        <Link href="/parcelas" className="settings-link"><span className="q-ic" style={{ "--c": "#8fb8ff" } as CSSProperties}><Icon name="calc" size={20} /></span>
          <span><b>Simular quitação</b><span>Quanto economiza adiantando parcelas</span></span><Icon name="chevron" size={16} /></Link>
        <Link href="/configuracoes#orcamento" className="settings-link"><span className="q-ic" style={{ "--c": "#ffc35a" } as CSSProperties}><Icon name="target" size={20} /></span>
          <span><b>Orçamento total do mês</b><span>{st.monthlyBudget ? brl(st.monthlyBudget) : "sem limite"}</span></span><Icon name="chevron" size={16} /></Link>
      </div>
    </>
  );
}
