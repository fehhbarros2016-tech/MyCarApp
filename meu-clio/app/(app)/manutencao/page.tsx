import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ApplyTemplateButton, CalibrateButton, ReopenIssueButton } from "@/components/ActionButtons";
import { AddMaintButton, IssueButton, PartButton, PlanItemButton, ResolveIssueButton, ShopButton, TireButton } from "@/components/Launchers";
import { ExpenseList } from "@/components/lists/ExpenseList";
import { CatBars } from "@/components/charts/static";
import { Icon } from "@/components/ui/Icon";
import { Bar, Card, EmptyState, Money, PageHeader, Pill, Ring, TabLinks, v } from "@/components/ui/kit";
import { catOf, entries, oilStatus } from "@/lib/calc";
import { SYSTEMS, SYS_LABEL } from "@/lib/constants";
import { ageLabel, brl, countdown, dateBR, daysUntil, intf, monthYear, todayISO } from "@/lib/format";
import { kmStats } from "@/lib/km";
import { mediaUrl } from "@/lib/media-url";
import { planStatuses, type PlanStatus } from "@/lib/plan";
import { catsLite, shopsLite, toRows } from "@/lib/rows";
import { getStore, type Store } from "@/lib/store";
import { TIRE_KIND_LABEL, tireStatus } from "@/lib/tires";

export const metadata: Metadata = { title: "Manutenção" };
export const dynamic = "force-dynamic";

const TABS = [
  { v: "visao", l: "Histórico", icon: "wrench" }, { v: "plano", l: "Plano", icon: "check" }, { v: "pecas", l: "Peças", icon: "box" },
  { v: "pneus", l: "Pneus", icon: "tire" }, { v: "problemas", l: "Problemas", icon: "alert" }, { v: "oficinas", l: "Oficinas", icon: "pin" },
];
const sysIcon = (v: string) => SYSTEMS.find((x) => x.value === v)?.icon ?? "tool";

export default async function ManutencaoPage({ searchParams }: { searchParams: Promise<{ t?: string; nova?: string; h?: string }> }) {
  const [s, sp] = await Promise.all([getStore(), searchParams]);
  if (!s) return null;
  const tab = TABS.some((t) => t.v === sp.t) ? sp.t! : "visao";
  const k = kmStats(s);
  const shops = shopsLite(s);
  const openIssues = s.issues.filter((i) => !i.resolvedOn).length;
  const plan = planStatuses(s, k);
  const late = plan.filter((p) => p.tone === "danger" || p.tone === "warn").length;
  const tabs = TABS.map((t) => ({ ...t, n: t.v === "problemas" ? openIssues : t.v === "plano" ? late : undefined }));

  const action = tab === "visao" ? <AddMaintButton categories={catsLite(s)} lastKm={k.last} shops={shops} />
    : tab === "plano" ? <PlanItemButton className="btn-primary sm" label="Item" />
    : tab === "pecas" ? <PartButton lastKm={k.last} shops={shops} replaceable={s.parts.filter((p) => !p.replacedOn).map((p) => ({ id: p.id, name: p.name }))} startOpen={sp.nova === "1"} />
    : tab === "pneus" ? <TireButton lastKm={k.last} shops={shops} defaultSize={s.vehicle.info.pneuMedida} recommended={tireStatus(s, k).recommended} />
    : tab === "problemas" ? <IssueButton lastKm={k.last} />
    : <ShopButton />;

  return (
    <>
      <PageHeader title="Manutenção" back="/mais" action={action} />
      <TabLinks tabs={tabs} active={tab} base="/manutencao" />
      <div key={tab} className="set-pane">
        {tab === "visao" && <History s={s} plan={plan} />}
        {tab === "plano" && <Plan s={s} plan={plan} />}
        {tab === "pecas" && <Parts s={s} history={sp.h === "1"} />}
        {tab === "pneus" && <Tires s={s} />}
        {tab === "problemas" && <Issues s={s} />}
        {tab === "oficinas" && <Shops s={s} />}
      </div>
    </>
  );
}

// ---------------- histórico ----------------
function History({ s, plan }: { s: Store; plan: PlanStatus[] }) {
  const k = kmStats(s);
  const ids = new Set(s.expenses.filter((e) => e.maint || catOf(s, e.categoryId).group === "manutencao").map((e) => e.id));
  const list = entries(s, false).filter((e) => ids.has(e.id));
  const year = todayISO().slice(0, 4);
  const total = list.reduce((a, e) => a + e.amount, 0);
  const yearList = list.filter((e) => e.date.startsWith(year));
  const parts = s.expenses.filter((e) => e.maint).reduce((a, e) => a + e.maint!.parts, 0);
  const labor = s.expenses.filter((e) => e.maint).reduce((a, e) => a + e.maint!.labor, 0);
  const bySys = SYSTEMS.map((sy) => ({
    name: sy.label, icon: sy.icon, color: "#5cd6ff",
    value: s.expenses.filter((e) => e.maint?.system === sy.value).reduce((a, e) => a + e.amount, 0),
  })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const oil = oilStatus(s);
  const oilPct = oil && oil.leftKm != null ? 1 - Math.max(0, oil.leftKm) / oil.interval : null;
  const next = plan.filter((p) => p.known).slice(0, 3);

  return (
    <>
      <div className="tiles three rv" style={v(1)}>
        <div className="tile"><span className="eyebrow">Em {year}</span><Money value={yearList.reduce((a, e) => a + e.amount, 0)} /><small>{yearList.length} serviços</small></div>
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
            <p className="muted-s">Última troca aos {intf(oil.lastKm)} km · a cada {intf(oil.interval)} km {oil.fromPlan ? "(Plano de revisão)" : "(Configurações)"}</p>
          </div>
        ) : <EmptyState icon="oil" text="Registre uma troca de óleo com o km do painel e o app avisa quando estiver chegando a próxima." />}
      </Card>

      {next.length > 0 && (
        <Card title="Próximos do plano" action={{ href: "/manutencao?t=plano", label: "Plano" }} className="rv" style={v(3)}>
          <ul className="mini-plan">
            {next.map((p) => <li key={p.item.id}><i className="dot" data-tone={p.tone === "info" ? "ok" : p.tone} /><b>{p.item.name}</b><span>{planWhen(p)}</span></li>)}
          </ul>
        </Card>
      )}

      {(parts > 0 || labor > 0) && (
        <Card title="Peças x mão de obra" className="rv" style={v(4)}>
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
        <Card title="Por sistema do carro" className="rv" style={v(5)}>
          <CatBars total={bySys.reduce((a, x) => a + x.value, 0)} data={bySys} />
        </Card>
      )}

      <div className="section-h rv" style={v(6)}><h2>Serviços</h2></div>
      {list.length ? <ExpenseList rows={toRows(s, list)} categories={catsLite(s)} lastKm={k.last} shops={shopsLite(s)} />
        : <Card className="rv" style={v(7)}><EmptyState icon="wrench" text="Nenhuma manutenção registrada. Toque em Nova." /></Card>}
    </>
  );
}

// ---------------- plano ----------------
function planWhen(p: PlanStatus): string {
  if (!p.known) return "registre a última vez";
  const parts: string[] = [];
  if (p.kmLeft != null) parts.push(p.kmLeft >= 0 ? `faltam ${intf(p.kmLeft)} km` : `passou ${intf(-p.kmLeft)} km`);
  if (p.daysLeft != null && (p.kmLeft == null || p.daysLeft < 120)) parts.push(countdown(p.daysLeft));
  if (p.etaDays != null && p.kmLeft != null && p.kmLeft > 0 && p.etaDays > 0) parts.push(`~${monthYear(new Date(Date.now() + p.etaDays * 86_400_000).toISOString().slice(0, 10))}`);
  return parts.join(" · ");
}

function Plan({ s, plan }: { s: Store; plan: PlanStatus[] }) {
  const k = kmStats(s);
  if (!plan.length) {
    return (
      <Card className="rv" style={v(1)}>
        <EmptyState icon="check" text="Monte o plano de revisão do seu carro: cada item tem um intervalo em km ou meses e o app avisa quando está chegando. Comece pelo sugerido e ajuste ao manual.">
          <div className="btn-row"><ApplyTemplateButton /><PlanItemButton label="Criar do zero" /></div>
        </EmptyState>
      </Card>
    );
  }
  return (
    <>
      <p className="muted-s rv" style={{ ...v(1), margin: "0 4px 12px" } as CSSProperties}>
        {k.perDay ? `Você roda ~${intf(Math.round(k.perDay))} km por dia; as datas estimadas usam esse ritmo.` : "Atualize o km com frequência para o app estimar as datas."}
      </p>
      <ul className="plan-list">
        {plan.map((p, i) => (
          <li key={p.item.id} className="rv" data-tone={p.tone} style={v(Math.min(i + 2, 10))}>
            <PlanItemButton className="plan-main" initial={{ id: p.item.id, name: p.item.name, system: p.item.system, intervalKm: p.item.intervalKm,
              intervalMonths: p.item.intervalMonths, lastKm: p.item.lastKm, lastDate: p.item.lastDate, note: p.item.note, keyword: p.item.keyword, categorySlug: p.item.categorySlug }}>
              <span className="plan-ic"><Icon name={sysIcon(p.item.system)} size={18} /></span>
              <span className="plan-t">
                <b>{p.item.name}</b>
                <span>{[p.item.intervalKm ? `${intf(p.item.intervalKm)} km` : null, p.item.intervalMonths ? `${p.item.intervalMonths} meses` : null].filter(Boolean).join(" ou ")}
                  {p.known ? ` · última ${p.lastKm != null ? `aos ${intf(p.lastKm)} km` : ""}${p.lastDate ? ` em ${monthYear(p.lastDate)}` : ""}` : ""}</span>
                {p.known && <span className="plan-bar"><i style={{ "--p": Math.min(1, p.pct) } as CSSProperties} /></span>}
              </span>
              <span className="plan-when" data-tone={p.tone}>{planWhen(p)}</span>
            </PlanItemButton>
            <AddMaintButton className="plan-do" categories={catsLite(s)} lastKm={k.last} shops={shopsLite(s)} title={p.item.name}
              initial={{ planId: p.item.id, planName: p.item.name, service: p.item.name, system: p.item.system, categorySlug: p.item.categorySlug ?? (p.item.system === "pneus" ? "alinhamento" : null) }}>
              <Icon name="check" size={15} /><span>Fiz</span>
            </AddMaintButton>
          </li>
        ))}
      </ul>
      <div className="btn-row rv"><ApplyTemplateButton className="btn-ghost sm" /></div>
      <p className="foot-hint rv"><Icon name="info" size={14} /> Toque no item para ajustar o intervalo ou informar quando foi feito antes de usar o app. &quot;Fiz&quot; registra a manutenção nos gastos e atualiza o plano.</p>
    </>
  );
}

// ---------------- peças ----------------
function Parts({ s, history }: { s: Store; history: boolean }) {
  const k = kmStats(s);
  const shops = shopsLite(s);
  const active = s.parts.filter((p) => !p.replacedOn);
  const old = s.parts.filter((p) => p.replacedOn);
  const list = history ? old : active;
  const today = todayISO();
  const replaceable = active.map((p) => ({ id: p.id, name: p.name }));
  return (
    <>
      <div className="seg period rv" style={v(1)}>
        <Link href="/manutencao?t=pecas" data-on={!history} scroll={false} replace>No carro <small>{active.length}</small></Link>
        <Link href="/manutencao?t=pecas&h=1" data-on={history} scroll={false} replace>Substituídas <small>{old.length}</small></Link>
      </div>
      {!list.length ? (
        <Card className="rv" style={v(2)}>
          <EmptyState icon="box" text={history ? "Quando você trocar uma peça cadastrada, a antiga aparece aqui com a idade que durou." : "Cadastre as peças do carro com foto, valor e data. O app mostra a idade de cada uma e avisa perto do fim da vida útil."} />
        </Card>
      ) : (
        <div className="part-grid">
          {list.map((p, i) => {
            const end = p.replacedOn ?? today;
            const age = ageLabel(p.installedOn, end);
            const usedKm = p.installedKm != null ? ((p.replacedOn ? s.parts.find((x) => x.id === p.replacedBy)?.installedKm : k.last) ?? null) : null;
            const kmOn = usedKm != null && p.installedKm != null ? Math.max(0, usedKm - p.installedKm) : null;
            const lifePct = Math.max(p.lifeKm && kmOn != null ? kmOn / p.lifeKm : 0, p.lifeMonths ? daysUntil(end, p.installedOn) / (p.lifeMonths * 30.4) : 0);
            const img = mediaUrl(p.imagePath);
            return (
              <PartButton key={p.id} className="part-card rv" lastKm={k.last} shops={shops} replaceable={replaceable}
                initial={{ id: p.id, name: p.name, brand: p.brand, system: p.system, price: p.price, installedOn: p.installedOn, installedKm: p.installedKm,
                  lifeKm: p.lifeKm, lifeMonths: p.lifeMonths, note: p.note, shopId: p.shopId, image: img }}>
                <span className="part-img" style={v(i) as CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img ? <img src={img} alt="" loading="lazy" decoding="async" /> : <Icon name={sysIcon(p.system)} size={30} />}
                  <em className="part-age">{age}</em>
                </span>
                <span className="part-t">
                  <b>{p.name}</b>
                  <span>{[p.brand, SYS_LABEL[p.system]].filter(Boolean).join(" · ")}</span>
                  <span className="part-meta">{p.price != null ? <Money value={p.price} /> : <i>sem valor</i>}{kmOn != null ? <i>{intf(kmOn)} km</i> : null}</span>
                  {lifePct > 0 && !p.replacedOn && <span className="plan-bar" data-tone={lifePct >= 1 ? "danger" : lifePct >= 0.85 ? "warn" : "ok"}><i style={{ "--p": Math.min(1, lifePct) } as CSSProperties} /></span>}
                  {p.replacedOn && <span className="part-meta"><i>trocada em {dateBR(p.replacedOn)}</i></span>}
                </span>
              </PartButton>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------------- pneus ----------------
function Tires({ s }: { s: Store }) {
  const k = kmStats(s);
  const t = tireStatus(s, k);
  const shops = shopsLite(s);
  const rec = t.recommended;
  const recF = rec.front ? Number(rec.front.replace(/[^\d,.]/g, "").replace(",", ".")) || null : null;
  const recR = rec.rear ? Number(rec.rear.replace(/[^\d,.]/g, "").replace(",", ".")) || null : null;
  return (
    <>
      <div className="tire-grid rv" style={v(1)}>
        <Card className="tire-card">
          <span className="eyebrow">Desgaste</span>
          {t.wearPct != null ? (
            <div className="tire-ring">
              <Ring value={Math.min(1, t.wearPct)} size={84} stroke={9} color={t.wearPct >= 0.9 ? "var(--danger)" : t.wearPct >= 0.75 ? "var(--warn)" : undefined}>
                <b className="num">{Math.round(t.wearPct * 100)}%</b>
              </Ring>
              <p className="muted-s">{intf(t.kmOnSet ?? 0)} km com este jogo · {t.ageDays != null ? ageLabel(t.lastSwap!.date) : ""}</p>
            </div>
          ) : <p className="muted-s">Registre a última troca de pneus (com o km) para ver o desgaste estimado.</p>}
        </Card>
        <Card className="tire-card">
          <span className="eyebrow">Rodízio</span>
          {t.rotation.kmLeft != null ? (
            <>
              <b className="tire-big num" data-tone={t.rotation.tone}>{t.rotation.kmLeft >= 0 ? `${intf(t.rotation.kmLeft)} km` : `passou ${intf(-t.rotation.kmLeft)} km`}</b>
              <p className="muted-s">próximo aos {intf(t.rotation.nextKm!)} km{t.rotation.etaDays ? ` · ${countdown(t.rotation.etaDays)}` : ""}</p>
            </>
          ) : <p className="muted-s">Registre um rodízio ou troca com o km.</p>}
        </Card>
        <Card className="tire-card wide">
          <div className="tire-cal">
            <div>
              <span className="eyebrow">Calibragem</span>
              <b className="tire-big num" data-tone={t.pressure.tone}>{t.pressure.daysLeft == null ? "—" : t.pressure.daysLeft >= 0 ? `em ${t.pressure.daysLeft} ${t.pressure.daysLeft === 1 ? "dia" : "dias"}` : "atrasada"}</b>
              <p className="muted-s">{t.pressure.lastDate ? `última em ${dateBR(t.pressure.lastDate)}` : "nunca registrada"} · a cada {s.settings.tirePressureDays} dias</p>
              <p className="muted-s">Recomendado: <b>{rec.front ?? "—"}</b> na frente, <b>{rec.rear ?? "—"}</b> atrás{!rec.front && " (preencha na Ficha do carro)"}</p>
            </div>
            <CalibrateButton front={recF} rear={recR} className="btn-primary sm">Calibrei hoje</CalibrateButton>
          </div>
        </Card>
      </div>

      <div className="section-h rv" style={v(2)}><h2>Histórico dos pneus</h2></div>
      {s.tires.length ? (
        <ul className="ev-list">
          {s.tires.slice(0, 40).map((e) => (
            <li key={e.id} className="rv">
              <TireButton className="ev-main" lastKm={k.last} shops={shops} defaultSize={s.vehicle.info.pneuMedida}
                initial={{ id: e.id, kind: e.kind, date: e.date, km: e.km, front: e.front, rear: e.rear, positions: e.positions, brand: e.brand, size: e.size, cost: e.cost, shopId: e.shopId, note: e.note }}>
                <span className="ev-ic" style={{ "--c": e.kind === "troca" ? "#9fb4ff" : e.kind === "rodizio" ? "#79e0a8" : e.kind === "reparo" ? "#ff8a5c" : "#9aa8c7" } as CSSProperties}><Icon name="tire" size={18} /></span>
                <span className="ev-t"><b>{TIRE_KIND_LABEL[e.kind]}</b>
                  <span>{[e.km != null ? `${intf(e.km)} km` : null, e.front || e.rear ? `${e.front ?? "—"}/${e.rear ?? "—"} psi` : null, e.brand, e.positions].filter(Boolean).join(" · ")}</span></span>
                <span className="ev-when">{dateBR(e.date)}{e.cost ? <><br /><span className="money">{brl(e.cost)}</span></> : null}</span>
              </TireButton>
            </li>
          ))}
        </ul>
      ) : <Card className="rv"><EmptyState icon="tire" text="Nada registrado. Use “Calibrei hoje” ou registre a última troca e o último rodízio." /></Card>}
      <p className="foot-hint rv"><Icon name="info" size={14} /> Intervalos de rodízio, calibragem e vida útil ficam em Configurações → Avisos.</p>
    </>
  );
}

// ---------------- problemas ----------------
function Issues({ s }: { s: Store }) {
  const k = kmStats(s);
  const open = s.issues.filter((i) => !i.resolvedOn);
  const done = s.issues.filter((i) => i.resolvedOn);
  const shops = shopsLite(s);
  const shopName = new Map(s.shops.map((x) => [x.id, x.name]));
  const SEV = { baixa: { l: "Leve", tone: "muted" }, media: { l: "Médio", tone: "warn" }, alta: { l: "Sério", tone: "danger" } } as const;
  return (
    <>
      {!open.length && !done.length && (
        <Card className="rv" style={v(1)}>
          <EmptyState icon="alert" text="Anote barulhos, luzes no painel e defeitos assim que perceber, com data e km. Na oficina, é só mostrar o histórico." />
        </Card>
      )}
      {open.length > 0 && (
        <>
          <div className="section-h rv" style={v(1)}><h2>Em aberto</h2></div>
          <ul className="issue-list">
            {open.map((i) => (
              <li key={i.id} className="rv" data-sev={i.severity}>
                <IssueButton className="issue-main" lastKm={k.last} initial={{ id: i.id, title: i.title, description: i.description, severity: i.severity, noticedOn: i.noticedOn, km: i.km }}>
                  <span className="issue-t"><b>{i.title}</b>
                    <span><Pill tone={SEV[i.severity].tone}>{SEV[i.severity].l}</Pill> desde {dateBR(i.noticedOn)}{i.km != null ? ` · ${intf(i.km)} km` : ""} · {ageLabel(i.noticedOn)}</span>
                    {i.description && <span className="issue-d">{i.description}</span>}
                  </span>
                </IssueButton>
                <ResolveIssueButton id={i.id} shops={shops} />
              </li>
            ))}
          </ul>
        </>
      )}
      {done.length > 0 && (
        <>
          <div className="section-h rv"><h2>Resolvidos</h2></div>
          <ul className="issue-list done">
            {done.slice(0, 30).map((i) => (
              <li key={i.id} className="rv">
                <span className="issue-t"><b>{i.title}</b>
                  <span>Resolvido em {dateBR(i.resolvedOn!)}{i.shopId ? ` · ${shopName.get(i.shopId) ?? ""}` : ""} · levou {ageLabel(i.noticedOn, i.resolvedOn!)}</span>
                  {i.resolution && <span className="issue-d">{i.resolution}</span>}
                </span>
                <ReopenIssueButton id={i.id} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// ---------------- oficinas ----------------
function Shops({ s }: { s: Store }) {
  const stats = s.shops.map((x) => {
    const list = s.expenses.filter((e) => e.shopId === x.id);
    const total = list.reduce((a, e) => a + e.amount, 0);
    const last = list.reduce<string | null>((m, e) => (!m || e.date > m ? e.date : m), null);
    return { shop: x, total, count: list.length, avg: list.length ? total / list.length : 0, last, services: list.filter((e) => e.maint).slice(0, 3).map((e) => e.maint!.service) };
  }).sort((a, b) => b.total - a.total || a.shop.name.localeCompare(b.shop.name));
  const withData = stats.filter((x) => x.count > 0);
  const cheapest = withData.length >= 2 ? withData.reduce((b, x) => (x.avg < b.avg ? x : b), withData[0]).shop.id : null;
  if (!stats.length) {
    return <Card className="rv" style={v(1)}><EmptyState icon="pin" text="Suas oficinas aparecem aqui conforme você registra manutenções. Toque em Nova para adicionar uma agora, com telefone e endereço." /></Card>;
  }
  return (
    <ul className="shop-list">
      {stats.map((x, i) => (
        <li key={x.shop.id} className="rv" style={v(Math.min(i + 1, 10))}>
          <ShopButton className="shop-main" initial={{ id: x.shop.id, name: x.shop.name, kind: x.shop.kind, phone: x.shop.phone, address: x.shop.address, note: x.shop.note }}>
            <span className="shop-t">
              <b>{x.shop.name}{x.shop.id === cheapest && <Pill tone="ok">menor ticket</Pill>}</b>
              <span>{x.count ? `${x.count} ${x.count === 1 ? "serviço" : "serviços"} · última vez em ${dateBR(x.last!)}` : "nenhum serviço ainda"}</span>
              {x.services.length > 0 && <span className="shop-s">{x.services.join(" · ")}</span>}
            </span>
            <span className="shop-v">
              <Money value={x.total} />
              {x.count > 0 && <small>média <span className="money">{brl(x.avg)}</span></small>}
            </span>
          </ShopButton>
          {x.shop.phone && <a className="icon-btn" href={`tel:${x.shop.phone.replace(/[^\d+]/g, "")}`} aria-label={`Ligar para ${x.shop.name}`}><Icon name="call" size={17} /></a>}
        </li>
      ))}
    </ul>
  );
}
