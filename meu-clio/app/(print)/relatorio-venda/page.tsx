import type { Metadata } from "next";
import { PrintBar } from "@/components/PrintBar";
import { fuelStats, kmStats } from "@/lib/calc";
import { SYS_LABEL } from "@/lib/constants";
import { ageLabel, brl, dateFull, dec1, intf, todayISO } from "@/lib/format";
import { planStatuses } from "@/lib/plan";
import { getStore } from "@/lib/store";
import { TIRE_KIND_LABEL } from "@/lib/tires";
import { APP_VERSION_LABEL } from "@/lib/version";
import s from "./print.module.css";

export const metadata: Metadata = { title: "Relatório do carro" };
export const dynamic = "force-dynamic";

export default async function SaleReport({ searchParams }: { searchParams: Promise<{ valores?: string; placa?: string }> }) {
  const [st, sp] = await Promise.all([getStore(), searchParams]);
  if (!st) return null;
  const showValues = sp.valores === "1";
  const showPlate = sp.placa === "1";
  const v = st.vehicle;
  const k = kmStats(st);
  const f = fuelStats(st);
  const shop = new Map(st.shops.map((x) => [x.id, x.name]));
  const maint = st.expenses.filter((e) => e.maint).sort((a, b) => b.date.localeCompare(a.date));
  const parts = st.parts.filter((p) => !p.replacedOn);
  const tires = st.tires.filter((t) => t.kind !== "calibragem").slice(0, 12);
  const solved = st.issues.filter((i) => i.resolvedOn);
  const plan = planStatuses(st, k).filter((p) => p.known);
  const total = maint.reduce((a, e) => a + e.amount, 0);
  const today = todayISO();
  return (
    <div className={s.page}>
      <PrintBar values={showValues} plate={showPlate} />
      <article className={s.sheet}>
        <header className={s.head}>
          <div>
            <span className={s.kicker}>Histórico do veículo</span>
            <h1>{[v.make, v.model].filter(Boolean).join(" ") || v.name}</h1>
            <p>{[v.year, showPlate && v.plate ? `placa ${v.plate}` : null, v.info.cor, v.info.motor].filter(Boolean).join(" · ")}</p>
          </div>
          <div className={s.km}><b>{k.last != null ? intf(k.last) : "—"}</b><span>km atuais</span></div>
        </header>

        <section className={s.facts}>
          <div><span>Com o dono atual</span><b>{v.purchaseDate ? ageLabel(v.purchaseDate, today) : "—"}</b></div>
          <div><span>Manutenções registradas</span><b>{maint.length}</b></div>
          <div><span>Consumo médio medido</span><b>{f.kmPerL ? `${dec1(f.kmPerL)} km/l` : "—"}</b></div>
          <div><span>Rodados no período</span><b>{k.driven ? `${intf(k.driven)} km` : "—"}</b></div>
        </section>

        <h2>Manutenções</h2>
        {maint.length ? (
          <table className={s.table}>
            <thead><tr><th>Data</th><th>Km</th><th>Serviço</th><th>Onde</th>{showValues && <th className={s.r}>Valor</th>}</tr></thead>
            <tbody>
              {maint.map((e) => (
                <tr key={e.id}><td>{dateFull(e.date)}</td><td>{e.km != null ? intf(e.km) : "—"}</td>
                  <td>{e.maint!.service}<small>{SYS_LABEL[e.maint!.system]}</small></td><td>{(e.shopId && shop.get(e.shopId)) || e.vendor || "—"}</td>
                  {showValues && <td className={s.r}>{brl(e.amount)}</td>}</tr>
              ))}
            </tbody>
            {showValues && <tfoot><tr><td colSpan={4}>Total investido em manutenção</td><td className={s.r}>{brl(total)}</td></tr></tfoot>}
          </table>
        ) : <p className={s.empty}>Nenhuma manutenção registrada no app.</p>}

        {plan.length > 0 && (
          <>
            <h2>Plano de revisão</h2>
            <table className={s.table}>
              <thead><tr><th>Item</th><th>Última vez</th><th>Próxima</th></tr></thead>
              <tbody>
                {plan.map((p) => (
                  <tr key={p.item.id}><td>{p.item.name}</td>
                    <td>{[p.lastKm != null ? `${intf(p.lastKm)} km` : null, p.lastDate ? dateFull(p.lastDate) : null].filter(Boolean).join(" · ")}</td>
                    <td>{[p.dueKm != null ? `${intf(p.dueKm)} km` : null, p.dueDate ? dateFull(p.dueDate) : null].filter(Boolean).join(" ou ")}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {parts.length > 0 && (
          <>
            <h2>Peças instaladas</h2>
            <table className={s.table}>
              <thead><tr><th>Peça</th><th>Instalada</th><th>Idade</th>{showValues && <th className={s.r}>Valor</th>}</tr></thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id}><td>{p.name}{p.brand && <small>{p.brand}</small>}</td>
                    <td>{dateFull(p.installedOn)}{p.installedKm != null ? ` · ${intf(p.installedKm)} km` : ""}</td><td>{ageLabel(p.installedOn, today)}</td>
                    {showValues && <td className={s.r}>{p.price != null ? brl(p.price) : "—"}</td>}</tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tires.length > 0 && (
          <>
            <h2>Pneus</h2>
            <table className={s.table}>
              <thead><tr><th>Data</th><th>Serviço</th><th>Km</th><th>Detalhe</th></tr></thead>
              <tbody>{tires.map((t) => <tr key={t.id}><td>{dateFull(t.date)}</td><td>{TIRE_KIND_LABEL[t.kind]}</td><td>{t.km != null ? intf(t.km) : "—"}</td><td>{[t.brand, t.size, t.positions].filter(Boolean).join(" · ") || "—"}</td></tr>)}</tbody>
            </table>
          </>
        )}

        {solved.length > 0 && (
          <>
            <h2>Problemas resolvidos</h2>
            <ul className={s.list}>{solved.map((i) => <li key={i.id}><b>{i.title}</b> · resolvido em {dateFull(i.resolvedOn!)}{i.resolution ? ` — ${i.resolution}` : ""}</li>)}</ul>
          </>
        )}

        <footer className={s.foot}>
          Gerado em {dateFull(today)} pelo app Meu Clio {APP_VERSION_LABEL}, a partir dos registros feitos pelo proprietário ao longo do uso.
        </footer>
      </article>
    </div>
  );
}
