"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { saveName, savePrefs, saveVehicle, signOutDevice, type ActionResult } from "@/lib/actions";
import { ACCENTS, ACCENT_LABEL, HOME_BLOCKS, type Accent, type HomeBlock, type Settings } from "@/lib/settings";
import { Icon } from "@/components/ui/Icon";
import { ConfirmButton, Segmented, SubmitButton, Switch, useActionFeedback, useToast } from "@/components/ui/client";

type VehicleLite = { name: string; heroWord: string; make: string | null; model: string | null; year: number | null; plate: string | null;
  initialKm: number | null; purchaseDate: string | null; tankL: number; bars: number };
type Counts = { expenses: number; fuel: number; installments: number; events: number; categories: number; custom: number };

const TABS = [
  { v: "geral", l: "Geral", icon: "sliders" }, { v: "veiculo", l: "Veículo", icon: "car" }, { v: "visual", l: "Aparência", icon: "palette" },
  { v: "inicio", l: "Início", icon: "home" }, { v: "dados", l: "Dados", icon: "layers" }, { v: "avancado", l: "Avançado", icon: "key" },
] as const;
type Tab = (typeof TABS)[number]["v"];

function Item({ icon, title, sub, children, stack, color }: { icon: string; title: string; sub?: string; children?: ReactNode; stack?: boolean; color?: string }) {
  return (
    <div className="set-item" data-stack={stack}>
      <span className="set-ic" style={color ? ({ "--c": color } as CSSProperties) : undefined}><Icon name={icon} size={17} /></span>
      <span className="set-t"><b>{title}</b>{sub && <span>{sub}</span>}</span>
      {children && <div className="set-c">{children}</div>}
    </div>
  );
}
function Group({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return <section className="set-group rv" id={id}><h2>{title}</h2><div className="set-list">{children}</div></section>;
}
function Stepper({ value, step, min, max, suffix, onChange }: { value: number; step: number; min: number; max: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Diminuir" onClick={() => onChange(Math.max(min, value - step))}><Icon name="minus" size={15} /></button>
      <output className="num">{value.toLocaleString("pt-BR")}{suffix}</output>
      <button type="button" aria-label="Aumentar" onClick={() => onChange(Math.min(max, value + step))}><Icon name="plus" size={15} /></button>
    </div>
  );
}

export function SettingsPanel({ settings, vehicle, name, counts, env, initialTab }: {
  settings: Settings; vehicle: VehicleLite; name: string; counts: Counts; env: string; initialTab?: string;
}) {
  const [tab, setTab] = useState<Tab>((TABS.some((t) => t.v === initialTab) ? initialTab : "geral") as Tab);
  const [st, setSt] = useState(settings);
  const [, start] = useTransition();
  const toast = useToast();
  const [budget, setBudget] = useState(settings.monthlyBudget ? String(settings.monthlyBudget) : "");

  useEffect(() => { if (location.hash === "#orcamento") setTab("geral"); }, []);

  const set = <K extends keyof Settings>(k: K, val: Settings[K]) => {
    setSt((s) => ({ ...s, [k]: val }));
    const app = document.querySelector<HTMLElement>(".app");
    if (app) {
      if (k === "accent") app.style.setProperty("--accent", ACCENTS[val as Accent]);
      if (k === "motion") app.dataset.motion = String(val);
      if (k === "hideValues") app.dataset.private = String(val);
    }
    start(async () => {
      const r = await savePrefs({ [k]: val } as Partial<Settings>);
      if (!r.ok) toast(r.error ?? "Não consegui salvar", { tone: "error" });
    });
  };
  const setHome = (k: HomeBlock, val: boolean) => {
    setSt((s) => ({ ...s, home: { ...s.home, [k]: val } }));
    start(async () => { await savePrefs({ home: { ...st.home, [k]: val } }); });
  };

  const [nameState, nameAction, namePending] = useActionState<ActionResult, FormData>(saveName, {});
  useActionFeedback(nameState);
  const [vState, vAction, vPending] = useActionState<ActionResult, FormData>(saveVehicle, {});
  useActionFeedback(vState);

  return (
    <>
      <div className="set-tabs rv" role="tablist">
        {TABS.map((t) => (
          <button key={t.v} role="tab" aria-selected={tab === t.v} data-on={tab === t.v} onClick={() => setTab(t.v)}>
            <Icon name={t.icon} size={16} /><span>{t.l}</span>
          </button>
        ))}
      </div>

      {tab === "geral" && (
        <div key="geral" className="set-pane">
          <Group title="Você">
            <form action={nameAction} className="set-item" data-stack>
              <span className="set-ic"><Icon name="user" size={17} /></span>
              <span className="set-t"><b>Seu nome</b><span>Usado nas saudações do app</span></span>
              <div className="set-c inline-form">
                <input className="inp" name="name" id="set-name" defaultValue={name} maxLength={40} />
                <SubmitButton pending={namePending} className="btn-primary sm">Salvar</SubmitButton>
              </div>
            </form>
          </Group>
          <Group title="Orçamento" id="orcamento">
            <Item icon="target" title="Limite mensal" sub="Avisos e linha no gráfico do mês" stack>
              <form className="inline-form" onSubmit={(e) => {
                e.preventDefault();
                const n = Number(budget.replace(/\./g, "").replace(",", "."));
                set("monthlyBudget", n > 0 ? n : null);
                toast(n > 0 ? "Orçamento salvo" : "Orçamento removido");
              }}>
                <div className="inp-pre"><b>R$</b><input className="inp" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="sem limite" /></div>
                <button className="btn-primary sm">Salvar</button>
              </form>
            </Item>
            <Item icon="bell" title="Avisar ao atingir" sub="Porcentagem do orçamento">
              <Stepper value={st.budgetAlertPct} step={5} min={10} max={100} suffix="%" onChange={(v) => set("budgetAlertPct", v)} />
            </Item>
          </Group>
          <Group title="Lembretes">
            <Item icon="receipt" title="Avisar parcela" sub="Dias antes do vencimento">
              <Stepper value={st.reminderDays} step={1} min={1} max={30} suffix=" d" onChange={(v) => set("reminderDays", v)} />
            </Item>
            <Item icon="oil" title="Troca de óleo a cada" sub="Calcula a próxima a partir da última troca">
              <Stepper value={st.oilIntervalKm} step={1000} min={1000} max={30000} suffix=" km" onChange={(v) => set("oilIntervalKm", v)} />
            </Item>
          </Group>
          <Group title="Combustível e unidades">
            <Item icon="fuel" title="Combustível padrão" stack>
              <Segmented<Settings["defaultFuel"]> value={st.defaultFuel} onChange={(v) => set("defaultFuel", v)} options={[{ value: "gasolina", label: "Gasolina" }, { value: "etanol", label: "Etanol" }]} />
            </Item>
            <Item icon="droplet" title="Mostrar consumo em" stack>
              <Segmented<Settings["consumptionUnit"]> value={st.consumptionUnit} onChange={(v) => set("consumptionUnit", v)} options={[{ value: "kml", label: "km/l" }, { value: "l100", label: "L/100 km" }]} />
            </Item>
            <Item icon="calendar" title="Semana começa" stack>
              <Segmented<0 | 1> value={st.weekStart} onChange={(v) => set("weekStart", v)} options={[{ value: 0, label: "Domingo" }, { value: 1, label: "Segunda" }]} />
            </Item>
          </Group>
        </div>
      )}

      {tab === "veiculo" && (
        <form key="veiculo" action={vAction} className="set-pane">
          <Group title="Identificação">
            <div className="set-form">
              <label className="field"><span className="lbl">Nome do carro</span><input className="inp" name="name" defaultValue={vehicle.name} maxLength={40} /></label>
              <label className="field"><span className="lbl">Palavra atrás do carro</span><input className="inp upper" name="heroWord" defaultValue={vehicle.heroWord} maxLength={10} /></label>
              <div className="row2">
                <label className="field"><span className="lbl">Marca</span><input className="inp" name="make" defaultValue={vehicle.make ?? ""} maxLength={40} /></label>
                <label className="field"><span className="lbl">Modelo</span><input className="inp" name="model" defaultValue={vehicle.model ?? ""} maxLength={40} /></label>
              </div>
              <div className="row2">
                <label className="field"><span className="lbl">Ano</span><input className="inp" name="year" inputMode="numeric" defaultValue={vehicle.year ?? ""} /></label>
                <label className="field"><span className="lbl">Placa</span><input className="inp upper" name="plate" defaultValue={vehicle.plate ?? ""} maxLength={10} /></label>
              </div>
            </div>
          </Group>
          <Group title="Quilometragem e compra">
            <div className="set-form">
              <div className="row2">
                <label className="field"><span className="lbl">Km na compra</span><input className="inp" name="initialKm" inputMode="numeric" defaultValue={vehicle.initialKm ?? ""} placeholder="opcional" /></label>
                <label className="field"><span className="lbl">Data da compra</span><input className="inp" type="date" name="purchaseDate" defaultValue={vehicle.purchaseDate ?? ""} /></label>
              </div>
            </div>
          </Group>
          <Group title="Tanque e marcador">
            <div className="set-form">
              <div className="row2">
                <label className="field"><span className="lbl">Capacidade (L)</span><input className="inp" name="tank" inputMode="decimal" defaultValue={vehicle.tankL} /></label>
                <label className="field"><span className="lbl">Barras do marcador</span><input className="inp" name="bars" inputMode="numeric" defaultValue={vehicle.bars} /></label>
              </div>
              <p className="muted-s">Clio: 50 L e 9 barras. Cada barra vale {(vehicle.tankL / vehicle.bars).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L.</p>
            </div>
          </Group>
          <p className="form-err" role="alert">{vState.ok === false ? vState.error : ""}</p>
          <div className="form-actions"><SubmitButton pending={vPending}>Salvar veículo</SubmitButton></div>
        </form>
      )}

      {tab === "visual" && (
        <div key="visual" className="set-pane">
          <Group title="Cor de destaque">
            <div className="accent-grid">
              {(Object.keys(ACCENTS) as Accent[]).map((a) => (
                <button key={a} type="button" data-on={st.accent === a} style={{ "--c": ACCENTS[a] } as CSSProperties} onClick={() => set("accent", a)}>
                  <i /><span>{ACCENT_LABEL[a]}</span>
                </button>
              ))}
            </div>
          </Group>
          <Group title="Movimento">
            <Item icon="sparkle" title="Animações" stack>
              <Segmented<Settings["motion"]> value={st.motion} onChange={(v) => set("motion", v)}
                options={[{ value: "full", label: "Completas" }, { value: "reduced", label: "Suaves" }, { value: "off", label: "Desligadas" }]} />
            </Item>
            <Item icon="layers" title="Fundo em movimento" sub="Gradiente lento atrás das telas"><Switch checked={st.ambient} onChange={(v) => set("ambient", v)} label="Fundo em movimento" /></Item>
            <Item icon="trend" title="Contagem dos números" sub="Valores sobem ao abrir o início"><Switch checked={st.countUp} onChange={(v) => set("countUp", v)} label="Contagem dos números" /></Item>
          </Group>
          <Group title="Privacidade">
            <Item icon="eyeOff" title="Ocultar valores" sub="Borra os R$ (também no olho do início)"><Switch checked={st.hideValues} onChange={(v) => set("hideValues", v)} label="Ocultar valores" /></Item>
          </Group>
        </div>
      )}

      {tab === "inicio" && (
        <div key="inicio" className="set-pane">
          <Group title="Blocos da tela inicial">
            {(Object.keys(HOME_BLOCKS) as HomeBlock[]).map((k) => (
              <Item key={k} icon={{ alerts: "bell", chart: "trend", categories: "pie", stats: "grid", tank: "fuel", purchase: "receipt", agenda: "calendar", recent: "log" }[k]} title={HOME_BLOCKS[k]}>
                <Switch checked={st.home[k]} onChange={(v) => setHome(k, v)} label={HOME_BLOCKS[k]} />
              </Item>
            ))}
          </Group>
        </div>
      )}

      {tab === "dados" && (
        <div key="dados" className="set-pane">
          <Group title="Seus registros">
            <div className="count-grid">
              <div><b className="num">{counts.expenses}</b><span>gastos</span></div>
              <div><b className="num">{counts.fuel}</b><span>abastecimentos</span></div>
              <div><b className="num">{counts.installments}</b><span>parcelas</span></div>
              <div><b className="num">{counts.events}</b><span>lembretes</span></div>
            </div>
          </Group>
          <Group title="Categorias">
            <Link href="/configuracoes/categorias" className="set-item link">
              <span className="set-ic"><Icon name="tag" size={17} /></span>
              <span className="set-t"><b>Gerenciar categorias</b><span>{counts.categories} ativas · {counts.custom} criadas por você</span></span>
              <Icon name="chevron" size={16} />
            </Link>
          </Group>
          <Group title="Exportar">
            <a href="/api/export?f=csv" className="set-item link" download>
              <span className="set-ic"><Icon name="download" size={17} /></span>
              <span className="set-t"><b>Planilha (CSV)</b><span>Todos os gastos, abre no Excel e Google Sheets</span></span>
              <Icon name="chevron" size={16} />
            </a>
            <a href="/api/export?f=json" className="set-item link" download>
              <span className="set-ic"><Icon name="layers" size={17} /></span>
              <span className="set-t"><b>Backup completo (JSON)</b><span>Gastos, parcelas, lembretes, leituras e preferências</span></span>
              <Icon name="chevron" size={16} />
            </a>
          </Group>
          <Group title="Segurança">
            <Item icon="shield" title="Seus dados ficam no Supabase" sub="O navegador nunca acessa o banco direto; tudo passa pelo servidor com chave secreta." />
          </Group>
        </div>
      )}

      {tab === "avancado" && (
        <div key="avancado" className="set-pane">
          <Group title="Como calcular">
            <Item icon="receipt" title="Parcelas entram nos gastos do mês" sub="Desligado: o gráfico mostra só o custo de uso">
              <Switch checked={st.includeInstallmentsInMonth} onChange={(v) => set("includeInstallmentsInMonth", v)} label="Parcelas nos gastos do mês" />
            </Item>
            <Item icon="wallet" title="Entrada no custo total" sub="Soma o valor da entrada ao custo do carro">
              <Switch checked={st.includeDownInTotal} onChange={(v) => set("includeDownInTotal", v)} label="Entrada no custo total" />
            </Item>
            <Item icon="road" title="Custo por km" sub="Usa só os gastos de uso, sem entrada e sem parcelas" />
          </Group>
          <Group title="Sistema">
            <Item icon="layers" title="Ambiente" sub="Produção não aceita dados de exemplo"><span className="pill" data-tone={env === "production" ? "ok" : "warn"}>{env}</span></Item>
            <Item icon="log" title="Versão" sub="Meu Clio 1.0 · sem IA no app" />
          </Group>
          <Group title="Este aparelho">
            <div className="set-item">
              <span className="set-ic" style={{ "--c": "#ff7a6e" } as CSSProperties}><Icon name="lock" size={17} /></span>
              <span className="set-t"><b>Sair deste aparelho</b><span>A chave de acesso será pedida de novo. Nenhum dado é apagado.</span></span>
              <div className="set-c"><ConfirmButton className="btn-danger sm" confirmText="Confirmar" onConfirm={() => { void signOutDevice(); }}>Sair</ConfirmButton></div>
            </div>
          </Group>
        </div>
      )}
    </>
  );
}
