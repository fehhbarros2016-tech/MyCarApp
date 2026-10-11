"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { saveName, savePrefs, saveVehicle, signOutDevice, type ActionResult } from "@/lib/actions";
import { setHeroWord } from "@/lib/actions-car";
import { backupNow } from "@/lib/actions-system";
import { ACCENTS, ACCENT_LABEL, AMBIENTS, HOME_BLOCKS, NOTIFY_TYPES, type Accent, type Ambient, type HomeBlock, type NotifyType, type Settings } from "@/lib/settings";
import { applyTheme } from "@/lib/theme";
import { Icon } from "@/components/ui/Icon";
import { ConfirmButton, Segmented, SubmitButton, Switch, useActionFeedback, useRun, useToast } from "@/components/ui/client";
import { ImagePicker } from "@/components/forms/ImagePicker";
import { ActivateVehicleButton } from "@/components/ActionButtons";

const PushSettings = dynamic(() => import("./PushSettings").then((m) => m.PushSettings), { ssr: false });
const FaceIdSetting = dynamic(() => import("./FaceIdSetting").then((m) => m.FaceIdSetting), { ssr: false });

export type VehicleLite = { id: string; name: string; heroWord: string; make: string | null; model: string | null; year: number | null; plate: string | null;
  initialKm: number | null; purchaseDate: string | null; tankL: number; bars: number; image: string | null; photoStyle: "recorte" | "foto" };
type Counts = { expenses: number; fuel: number; installments: number; events: number; categories: number; custom: number; parts: number; plan: number };
type Backup = { path: string; name: string; kind: string; size: number };

const TABS = [
  { v: "geral", l: "Geral", icon: "sliders" }, { v: "visual", l: "Aparência", icon: "palette" }, { v: "inicio", l: "Início", icon: "home" },
  { v: "veiculo", l: "Veículo", icon: "car" }, { v: "avisos", l: "Avisos", icon: "bell" }, { v: "seguranca", l: "Segurança", icon: "lock" },
  { v: "dados", l: "Dados", icon: "layers" }, { v: "avancado", l: "Avançado", icon: "key" }, { v: "sobre", l: "Sobre", icon: "info" },
] as const;
type Tab = (typeof TABS)[number]["v"];

function Item({ icon, title, sub, children, stack, color }: { icon: string; title: string; sub?: ReactNode; children?: ReactNode; stack?: boolean; color?: string }) {
  return (
    <div className="set-item" data-stack={stack}>
      <span className="set-ic" style={color ? ({ "--c": color } as CSSProperties) : undefined}><Icon name={icon} size={17} /></span>
      <span className="set-t"><b>{title}</b>{sub && <span>{sub}</span>}</span>
      {children && <div className="set-c">{children}</div>}
    </div>
  );
}
function Group({ title, children, id, note }: { title: string; children: ReactNode; id?: string; note?: ReactNode }) {
  return <section className="set-group rv" id={id}><h2>{title}</h2><div className="set-list">{children}</div>{note && <p className="set-note">{note}</p>}</section>;
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
const money = (v: number | null) => (v ? v.toLocaleString("pt-BR") : "");

export function SettingsPanel(props: {
  settings: Settings; vehicle: VehicleLite; vehicles: { id: string; name: string; active: boolean }[]; name: string; counts: Counts; env: string;
  initialTab?: string; pushKey: string | null; pushDevices: number; backups: Backup[]; oilInPlan: boolean; version: string;
  changelog: { version: string; date: string; items: string[] }[];
}) {
  const { settings, vehicle, vehicles, name, counts, env, initialTab, pushKey, pushDevices, backups, oilInPlan, version, changelog } = props;
  const [tab, setTab] = useState<Tab>((TABS.some((t) => t.v === initialTab) ? initialTab : "geral") as Tab);
  const [st, setSt] = useState(settings);
  const [, start] = useTransition();
  const toast = useToast();
  const { run, busy } = useRun();
  const [budget, setBudget] = useState(money(settings.monthlyBudget));
  const [income, setIncome] = useState(money(settings.monthlyIncome));
  const [word, setWord] = useState(vehicle.heroWord);

  useEffect(() => { if (location.hash === "#orcamento") setTab("geral"); }, []);
  useEffect(() => { history.replaceState(null, "", `/configuracoes?t=${tab}`); }, [tab]);

  const set = <K extends keyof Settings>(k: K, val: Settings[K]) => {
    const next = { ...st, [k]: val };
    setSt(next);
    if (k === "accent" || k === "theme" || k === "ambientColor" || k === "ambientStrength") applyTheme(next);
    const app = document.querySelector<HTMLElement>(".app");
    if (app) {
      if (k === "motion") app.dataset.motion = String(val);
      if (k === "hideValues") app.dataset.private = String(val);
    }
    const amb = document.querySelector<HTMLElement>(".ambient");
    if (k === "ambientStrength" && amb) amb.dataset.k = String(val);
    start(async () => {
      const r = await savePrefs({ [k]: val } as Partial<Settings>);
      if (!r.ok) toast(r.error ?? "Não consegui salvar", { tone: "error" });
    });
  };
  const setHome = (k: HomeBlock, val: boolean) => {
    setSt((s) => ({ ...s, home: { ...s.home, [k]: val } }));
    start(async () => { await savePrefs({ home: { ...st.home, [k]: val } }); });
  };
  const setNotify = (k: NotifyType, val: boolean) => {
    setSt((s) => ({ ...s, notify: { ...s.notify, [k]: val } }));
    start(async () => { await savePrefs({ notify: { ...st.notify, [k]: val } }); });
  };
  const moneyForm = (val: string, key: "monthlyBudget" | "monthlyIncome", okMsg: string) => (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(val.replace(/\./g, "").replace(",", "."));
    set(key, n > 0 ? n : null);
    toast(n > 0 ? okMsg : "Removido");
  };

  const [nameState, nameAction, namePending] = useActionState<ActionResult, FormData>(saveName, {});
  useActionFeedback(nameState);
  const [vState, vAction, vPending] = useActionState<ActionResult, FormData>(saveVehicle, {});
  useActionFeedback(vState);
  const [style, setStyle] = useState(vehicle.photoStyle);

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
                <input className="inp" name="name" defaultValue={name} maxLength={40} />
                <SubmitButton pending={namePending} className="btn-primary sm">Salvar</SubmitButton>
              </div>
            </form>
          </Group>
          <Group title="Orçamento" id="orcamento" note={<>Limites por categoria ficam em <Link href="/planejamento">Planejamento</Link>.</>}>
            <Item icon="target" title="Limite mensal do carro" sub="Avisos e linha no gráfico do mês" stack>
              <form className="inline-form" onSubmit={moneyForm(budget, "monthlyBudget", "Orçamento salvo")}>
                <div className="inp-pre"><b>R$</b><input className="inp" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="sem limite" /></div>
                <button className="btn-primary sm">Salvar</button>
              </form>
            </Item>
            <Item icon="bell" title="Avisar ao atingir" sub="Porcentagem do orçamento">
              <Stepper value={st.budgetAlertPct} step={5} min={10} max={100} suffix="%" onChange={(v) => set("budgetAlertPct", v)} />
            </Item>
            <Item icon="piggy" title="Salário líquido" sub="Mostra quanto do mês vai para o carro e quanto guardar" stack>
              <form className="inline-form" onSubmit={moneyForm(income, "monthlyIncome", "Salário salvo")}>
                <div className="inp-pre"><b>R$</b><input className="inp" inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="opcional" /></div>
                <button className="btn-primary sm">Salvar</button>
              </form>
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

      {tab === "visual" && (
        <div key="visual" className="set-pane">
          <Group title="Tema">
            <div className="theme-grid">
              {([["dark", "Escuro", "moon"], ["light", "Claro", "sun"], ["auto", "Automático", "phone"]] as const).map(([v, l, ic]) => (
                <button key={v} type="button" data-on={st.theme === v} data-t={v} onClick={() => set("theme", v)}>
                  <span className="theme-prev"><i /><i /><i /></span>
                  <span><Icon name={ic} size={14} /> {l}</span>
                </button>
              ))}
            </div>
            <p className="set-note in">Automático segue o modo claro/escuro do celular.</p>
          </Group>
          <Group title="Cor de destaque">
            <div className="accent-grid">
              {(Object.keys(ACCENTS) as Accent[]).map((a) => (
                <button key={a} type="button" data-on={st.accent === a} style={{ "--c": ACCENTS[a] } as CSSProperties} onClick={() => set("accent", a)}>
                  <i /><span>{ACCENT_LABEL[a]}</span>
                </button>
              ))}
            </div>
          </Group>
          <Group title="Fundo em movimento">
            <Item icon="layers" title="Fundo em movimento" sub="Manchas de cor que derivam devagar atrás das telas">
              <Switch checked={st.ambient} onChange={(v) => set("ambient", v)} label="Fundo em movimento" />
            </Item>
            {st.ambient && (
              <>
                <div className="amb-grid">
                  {(Object.keys(AMBIENTS) as Ambient[]).map((a) => {
                    const c = AMBIENTS[a];
                    const ca = a === "destaque" ? ACCENTS[st.accent] : c.a;
                    const cb = a === "destaque" ? ACCENTS[st.accent] : c.b;
                    return (
                      <button key={a} type="button" data-on={st.ambientColor === a} onClick={() => set("ambientColor", a)}
                        style={{ "--a": ca, "--b": cb } as CSSProperties}>
                        <i /><span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
                <Item icon="sparkle" title="Intensidade" stack>
                  <Segmented<1 | 2 | 3> value={st.ambientStrength} onChange={(v) => set("ambientStrength", v)}
                    options={[{ value: 1, label: "Suave" }, { value: 2, label: "Média" }, { value: 3, label: "Forte" }]} />
                </Item>
                {st.motion === "off" && <p className="set-note in">As animações estão desligadas, então o fundo não aparece.</p>}
              </>
            )}
          </Group>
          <Group title="Movimento">
            <Item icon="sparkle" title="Animações" stack>
              <Segmented<Settings["motion"]> value={st.motion} onChange={(v) => set("motion", v)}
                options={[{ value: "full", label: "Completas" }, { value: "reduced", label: "Suaves" }, { value: "off", label: "Desligadas" }]} />
            </Item>
            <Item icon="trend" title="Contagem dos números" sub="Valores sobem ao abrir o início"><Switch checked={st.countUp} onChange={(v) => set("countUp", v)} label="Contagem dos números" /></Item>
          </Group>
        </div>
      )}

      {tab === "inicio" && (
        <div key="inicio" className="set-pane">
          <Group title="Topo da tela inicial">
            <div className="hero-prev" aria-hidden>
              {st.heroBrand && vehicle.make && <span className="hero-brand">{vehicle.make}</span>}
              <span className="hero-prev-word" style={{ "--len": Math.max(3, [...word].length) } as CSSProperties}>{word || " "}</span>
            </div>
            <Item icon="edit" title="Nome atrás do carro" sub="Qualquer tamanho: a letra diminui sozinha para caber" stack>
              <form className="inline-form" onSubmit={(e) => { e.preventDefault(); void run(() => setHeroWord(vehicle.id, word)); }}>
                <input className="inp upper" value={word} onChange={(e) => setWord(e.target.value.toUpperCase())} maxLength={24} />
                <button className="btn-primary sm" disabled={busy}>Salvar</button>
              </form>
            </Item>
            <Item icon="tag" title="Marca acima do nome" sub={vehicle.make ? `Mostra “${vehicle.make.toUpperCase()}” em letra fina` : "Preencha a marca na aba Veículo"}>
              <Switch checked={st.heroBrand} onChange={(v) => set("heroBrand", v)} label="Marca acima do nome" />
            </Item>
          </Group>
          <Group title="Blocos da tela inicial">
            {(Object.keys(HOME_BLOCKS) as HomeBlock[]).map((k) => (
              <Item key={k} icon={{ alerts: "bell", chart: "trend", categories: "pie", stats: "grid", tank: "fuel", purchase: "receipt", agenda: "calendar", recent: "log" }[k]} title={HOME_BLOCKS[k]}>
                <Switch checked={st.home[k]} onChange={(v) => setHome(k, v)} label={HOME_BLOCKS[k]} />
              </Item>
            ))}
          </Group>
        </div>
      )}

      {tab === "veiculo" && (
        <div key="veiculo" className="set-pane">
          {vehicles.length > 1 && (
            <Group title="Veículo na tela inicial">
              {vehicles.map((x) => (
                <Item key={x.id} icon="car" title={x.name} sub={x.active ? "aparece agora" : undefined} color={x.active ? "var(--ok)" : undefined}>
                  {!x.active && <ActivateVehicleButton id={x.id} />}
                </Item>
              ))}
            </Group>
          )}
          <form action={vAction} className="set-pane-form">
            <input type="hidden" name="id" value={vehicle.id} />
            <Group title="Foto">
              <div className="set-form">
                <ImagePicker current={vehicle.image} label="Foto do carro" keepAlpha />
                <div className="field"><span className="lbl">Como mostrar</span>
                  <Segmented<"recorte" | "foto"> value={style} onChange={setStyle} name="photoStyle"
                    options={[{ value: "recorte", label: "Recortada", hint: "PNG sem fundo" }, { value: "foto", label: "Foto", hint: "com fundo" }]} /></div>
                <p className="muted-s">Dica: uma foto de lado, sem fundo (PNG), fica igual à do Clio, com o nome por trás. Sem foto, o app usa um desenho.</p>
              </div>
            </Group>
            <Group title="Identificação">
              <div className="set-form">
                <label className="field"><span className="lbl">Apelido</span><input className="inp" name="name" defaultValue={vehicle.name} maxLength={40} /></label>
                <input type="hidden" name="heroWord" value={word} />
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
          <Link href="/carro" className="settings-link rv"><span className="q-ic" style={{ "--c": "#6ef095" } as CSSProperties}><Icon name="car" size={20} /></span>
            <span><b>Ficha do carro e garagem</b><span>Documento, pneus, seguro, socorro e outros veículos</span></span><Icon name="chevron" size={16} /></Link>
        </div>
      )}

      {tab === "avisos" && (
        <div key="avisos" className="set-pane">
          <Group title="Notificações no celular">
            <PushSettings publicKey={pushKey} devices={pushDevices} />
          </Group>
          <Group title="O que avisar">
            {(Object.keys(NOTIFY_TYPES) as NotifyType[]).map((k) => (
              <Item key={k} icon={{ vencimentos: "calendar", manutencao: "wrench", orcamento: "wallet", resumo: "sparkle" }[k]} title={NOTIFY_TYPES[k]}>
                <Switch checked={st.notify[k]} onChange={(v) => setNotify(k, v)} label={NOTIFY_TYPES[k]} />
              </Item>
            ))}
          </Group>
          <Group title="Prazos">
            <Item icon="receipt" title="Avisar vencimentos" sub="Dias antes (parcelas, lembretes, multas)">
              <Stepper value={st.reminderDays} step={1} min={1} max={30} suffix=" d" onChange={(v) => set("reminderDays", v)} />
            </Item>
            {oilInPlan ? (
              <Link href="/manutencao?t=plano" className="set-item link"><span className="set-ic"><Icon name="oil" size={17} /></span>
                <span className="set-t"><b>Troca de óleo</b><span>O intervalo está no Plano de revisão</span></span><Icon name="chevron" size={16} /></Link>
            ) : (
              <Item icon="oil" title="Troca de óleo a cada" sub="A partir da última troca registrada">
                <Stepper value={st.oilIntervalKm} step={1000} min={1000} max={30000} suffix=" km" onChange={(v) => set("oilIntervalKm", v)} />
              </Item>
            )}
          </Group>
          <Group title="Pneus">
            <Item icon="refresh" title="Rodízio a cada"><Stepper value={st.tireRotationKm} step={1000} min={3000} max={30000} suffix=" km" onChange={(v) => set("tireRotationKm", v)} /></Item>
            <Item icon="tire" title="Calibrar a cada"><Stepper value={st.tirePressureDays} step={1} min={5} max={60} suffix=" d" onChange={(v) => set("tirePressureDays", v)} /></Item>
            <Item icon="clock" title="Vida útil dos pneus"><Stepper value={st.tireLifeKm} step={5000} min={10000} max={120000} suffix=" km" onChange={(v) => set("tireLifeKm", v)} /></Item>
          </Group>
          <Group title="Consumo">
            <Item icon="trendDown" title="Avisar queda de consumo" sub="Quando o último trecho rende bem menos que a média">
              <Switch checked={st.consumptionAlert} onChange={(v) => set("consumptionAlert", v)} label="Avisar queda de consumo" />
            </Item>
            {st.consumptionAlert && (
              <Item icon="gauge" title="Queda mínima"><Stepper value={st.consumptionDropPct} step={5} min={5} max={40} suffix="%" onChange={(v) => set("consumptionDropPct", v)} /></Item>
            )}
          </Group>
        </div>
      )}

      {tab === "seguranca" && (
        <div key="seguranca" className="set-pane">
          <Group title="Bloqueio" note="O bloqueio vale para este aparelho. Outros aparelhos ativam o deles.">
            <FaceIdSetting name={name} />
            <Item icon="clock" title="Bloquear de novo após" sub="Tempo com o app em segundo plano" stack>
              <Segmented<0 | 1 | 5 | 15> value={st.lockAfterMin} onChange={(v) => set("lockAfterMin", v)}
                options={[{ value: 0, label: "Na hora" }, { value: 1, label: "1 min" }, { value: 5, label: "5 min" }, { value: 15, label: "15 min" }]} />
            </Item>
          </Group>
          <Group title="Privacidade">
            <Item icon="eyeOff" title="Ocultar valores" sub="Borra os R$ (também no olho do início)"><Switch checked={st.hideValues} onChange={(v) => set("hideValues", v)} label="Ocultar valores" /></Item>
          </Group>
          <Group title="Este aparelho">
            <div className="set-item">
              <span className="set-ic" style={{ "--c": "#ff7a6e" } as CSSProperties}><Icon name="lock" size={17} /></span>
              <span className="set-t"><b>Sair deste aparelho</b><span>A chave de acesso será pedida de novo. Nenhum dado é apagado.</span></span>
              <div className="set-c"><ConfirmButton className="btn-danger sm" confirmText="Confirmar" onConfirm={() => { void signOutDevice(); }}>Sair</ConfirmButton></div>
            </div>
          </Group>
          <Group title="Como seus dados ficam protegidos">
            <Item icon="shield" title="Banco privado" sub="O navegador nunca acessa o banco direto; tudo passa pelo servidor com chave secreta. Fotos e backups ficam em pastas privadas." />
          </Group>
        </div>
      )}

      {tab === "dados" && (
        <div key="dados" className="set-pane">
          <Group title="Seus registros">
            <div className="count-grid">
              <div><b className="num">{counts.expenses}</b><span>gastos</span></div>
              <div><b className="num">{counts.fuel}</b><span>abastec.</span></div>
              <div><b className="num">{counts.parts}</b><span>peças</span></div>
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
          <Group title="Backup automático" note="Toda semana o app guarda uma cópia completa (inclusive o que foi excluído). Backups nunca são apagados.">
            <Item icon="cloud" title={backups[0] ? `Último: ${backups[0].name.replace("_", " ")}` : "Nenhum backup ainda"} sub={`${backups.length} ${backups.length === 1 ? "cópia guardada" : "cópias guardadas"}`}>
              <button className="btn-ghost sm" disabled={busy} onClick={() => run(backupNow)}>{busy && <span className="spin" />}Fazer agora</button>
            </Item>
            {backups.slice(0, 6).map((b) => (
              <a key={b.path} href={`/api/backup?f=${encodeURIComponent(b.path)}`} className="set-item link" download>
                <span className="set-ic"><Icon name="download" size={17} /></span>
                <span className="set-t"><b>{b.name.replace("_", " ")}</b><span>{b.kind === "auto" ? "automático" : "manual"} · {(b.size / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB</span></span>
                <Icon name="chevron" size={16} />
              </a>
            ))}
          </Group>
          <Group title="Exportar">
            <a href="/api/export?f=csv" className="set-item link" download>
              <span className="set-ic"><Icon name="download" size={17} /></span>
              <span className="set-t"><b>Planilha (CSV)</b><span>Todos os gastos, abre no Excel e Google Sheets</span></span>
              <Icon name="chevron" size={16} />
            </a>
            <a href="/api/export?f=json" className="set-item link" download>
              <span className="set-ic"><Icon name="layers" size={17} /></span>
              <span className="set-t"><b>Cópia completa (JSON)</b><span>Tudo do veículo atual, agora</span></span>
              <Icon name="chevron" size={16} />
            </a>
            <Link href="/relatorio-venda" className="set-item link">
              <span className="set-ic"><Icon name="print" size={17} /></span>
              <span className="set-t"><b>Relatório para venda (PDF)</b><span>Histórico de manutenção para mostrar ao comprador</span></span>
              <Icon name="chevron" size={16} />
            </Link>
          </Group>
          <Group title="Atalhos" note={<>No iPhone, abra o app <b>Atalhos</b> → novo atalho → <b>Abrir URL</b> com um dos links abaixo → <b>Adicionar à Tela de Início</b>. No Android, segure o ícone do app.</>}>
            {[["Abastecer", "/combustivel/novo", "fuel"], ["Novo gasto", "/?add=gasto", "wallet"], ["Atualizar km", "/?add=km", "road"], ["Calibrei / pneus", "/?add=pneu", "tire"]].map(([l, p, ic]) => (
              <ShortcutRow key={p} label={l} path={p} icon={ic} />
            ))}
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
            <Item icon="sparkle" title="Gasto previsto usa a média de" sub="Meses completos considerados no previsto do início" stack>
              <Segmented<3 | 6 | 12> value={st.forecastMonths} onChange={(v) => set("forecastMonths", v)}
                options={[{ value: 3, label: "3 meses" }, { value: 6, label: "6 meses" }, { value: 12, label: "12 meses" }]} />
            </Item>
            <Item icon="road" title="Custo por km" sub="Usa só os gastos de uso, sem entrada e sem parcelas" />
            <Item icon="gauge" title="Km atual" sub="Vale sempre a última leitura informada. Leitura errada? Apague em + → Km atual." />
          </Group>
          <Group title="Sistema">
            <Item icon="layers" title="Ambiente" sub="Produção não aceita dados de exemplo"><span className="pill" data-tone={env === "production" ? "ok" : "warn"}>{env}</span></Item>
          </Group>
        </div>
      )}

      {tab === "sobre" && (
        <div key="sobre" className="set-pane">
          <div className="about rv">
            <span className="about-ic"><Icon name="car" size={28} /></span>
            <b>Meu Clio</b>
            <span className="about-v">{version}</span>
            <p>Controle de gastos, manutenção e uso do carro. Sem IA, sem anúncios, seus dados no seu banco.</p>
          </div>
          {changelog.map((c, i) => (
            <Group key={c.version} title={`${c.version} · ${c.date.split("-").reverse().join("/")}`}>
              <ul className={`changes ${i ? "old" : ""}`}>{c.items.map((x) => <li key={x}>{x}</li>)}</ul>
            </Group>
          ))}
        </div>
      )}
    </>
  );
}

function ShortcutRow({ label, path, icon }: { label: string; path: string; icon: string }) {
  const toast = useToast();
  return (
    <div className="set-item">
      <span className="set-ic"><Icon name={icon} size={17} /></span>
      <span className="set-t"><b>{label}</b><span className="mono-s">{path}</span></span>
      <div className="set-c"><button className="btn-ghost sm" onClick={async () => {
        try { await navigator.clipboard.writeText(location.origin + path); toast("Link copiado"); } catch { toast("Não consegui copiar", { tone: "error" }); }
      }}><Icon name="copy" size={14} />Copiar</button></div>
    </div>
  );
}
