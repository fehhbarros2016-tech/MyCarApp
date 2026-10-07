import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { AddMaintButton } from "@/components/Launchers";
import { ExpenseList } from "@/components/lists/ExpenseList";
import { SYSTEMS } from "@/components/forms/MaintenanceForm";
import { CatBars } from "@/components/charts/static";
import { Icon } from "@/components/ui/Icon";
import { Bar, Card, EmptyState, Money, PageHeader, v } from "@/components/ui/kit";
import { catOf, entries, kmStats, oilStatus } from "@/lib/calc";
import { intf, todayISO } from "@/lib/format";
import { catsLite, toRows } from "@/lib/rows";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Manutenção" };
export const dynamic = "force-dynamic";

export default async function ManutencaoPage() {
  const s = await getStore();
  if (!s) return null;
  const k = kmStats(s);
  const ids = new Set(s.expenses.filter((e) => e.maint || catOf(s, e.categoryId).group === "manutencao").map((e) => e.id));
  const list = entries(s, false).filter((e) => ids.has(e.id));
  const year = todayISO().slice(0, 4);
  const total = list.reduce((a, e) => a + e.amount, 0);
  const yearTotal = list.filter((e) => e.date.startsWith(year)).reduce((a, e) => a + e.amount, 0);
  const parts = s.expenses.filter((e) => e.maint).reduce((a, e) => a + e.maint!.parts, 0);
  const labor = s.expenses.filter((e) => e.maint).reduce((a, e) => a + e.maint!.labor, 0);
  const bySys = SYSTEMS.map((sy) => ({
    name: sy.label, icon: sy.icon, color: "#5cd6ff",
    value: s.expenses.filter((e) => e.maint?.system === sy.value).reduce((a, e) => a + e.amount, 0),
  })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const oil = oilStatus(s);
  const oilPct = oil && oil.leftKm != null ? 1 - Math.max(0, oil.leftKm) / s.settings.oilIntervalKm : null;

  return (
    <>
      <PageHeader title="Manutenção" back="/mais" action={<AddMaintButton categories={catsLite(s)} lastKm={k.last} />} />

      <div className="tiles three rv" style={v(1)}>
        <div className="tile"><span className="eyebrow">Em {year}</span><Money value={yearTotal} /><small>{list.filter((e) => e.date.startsWith(year)).length} serviços</small></div>
        <div className="tile"><span className="eyebrow">Total</span><Money value={total} /><small>desde o início</small></div>
        <div className="tile"><span className="eyebrow">Por 1.000 km</span>{k.driven > 0 ? <Money value={(total / k.driven) * 1000} /> : <b className="muted">—</b>}<small>manutenção</small></div>
      </div>

      <Card title="Troca de óleo" className="rv" style={v(2)}>
        {oil ? (
          <div className="oil">
            <div className="oil-top">
              <div><b className="num">{oil.leftKm != null ? (oil.leftKm >= 0 ? `${intf(oil.leftKm)} km` : `passou ${intf(-oil.leftKm)} km`) : "—"}</b>
                <span>{oil.leftKm != null && oil.leftKm >= 0 ? "até a próxima troca" : "troca atrasada"}</span></div>
              <span className="muted-s">próxima aos {intf(oil.nextKm)} km</span>
            </div>
            <Bar value={oilPct ?? 0} color={oilPct != null && oilPct >= 1 ? "var(--danger)" : oilPct != null && oilPct > 0.9 ? "var(--warn)" : undefined} />
            <p className="muted-s">Última troca aos {intf(oil.lastKm)} km · intervalo de {intf(s.settings.oilIntervalKm)} km (muda nas Configurações)</p>
          </div>
        ) : <EmptyState icon="oil" text="Registre uma troca de óleo com o km do painel e o app avisa quando estiver chegando a próxima." />}
      </Card>

      {(parts > 0 || labor > 0) && (
        <Card title="Peças x mão de obra" className="rv" style={v(3)}>
          <div className="split">
            <div className="split-bar">
              <i style={{ flexGrow: parts, background: "#9fb4ff" } as CSSProperties} />
              <i style={{ flexGrow: labor, background: "#5cd6ff" } as CSSProperties} />
            </div>
            <div className="split-leg">
              <span><i style={{ background: "#9fb4ff" }} />Peças <Money value={parts} /></span>
              <span><i style={{ background: "#5cd6ff" }} />Mão de obra <Money value={labor} /></span>
            </div>
          </div>
        </Card>
      )}

      {bySys.length > 0 && (
        <Card title="Por sistema do carro" className="rv" style={v(4)}>
          <CatBars total={bySys.reduce((a, x) => a + x.value, 0)} data={bySys} />
        </Card>
      )}

      <div className="section-h rv" style={v(5)}><h2>Histórico</h2></div>
      {list.length ? <ExpenseList rows={toRows(s, list)} categories={catsLite(s)} lastKm={k.last} />
        : <Card className="rv" style={v(6)}><EmptyState icon="wrench" text="Nenhuma manutenção registrada. Toque em Nova manutenção." /></Card>}
      <p className="foot-hint rv" style={v(7)}><Icon name="bell" size={14} /> Ao informar &quot;Próxima vez&quot;, o lembrete aparece na Agenda e nos avisos do início.</p>
    </>
  );
}
