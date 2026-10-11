// Preferências do app (guardadas em app_settings.prefs). Tudo tem valor padrão.

export const ACCENTS = {
  verde: "#6ef095",
  menta: "#5ff0c8",
  ciano: "#5cd6ff",
  lima: "#c4f25a",
  ambar: "#ffc35a",
  violeta: "#b49cff",
  rosa: "#ff8fc7",
} as const;
export type Accent = keyof typeof ACCENTS;
export const ACCENT_LABEL: Record<Accent, string> = {
  verde: "Verde", menta: "Menta", ciano: "Ciano", lima: "Lima", ambar: "Âmbar", violeta: "Violeta", rosa: "Rosa",
};

/** Cores do fundo em movimento. "destaque" acompanha a cor de destaque. Duas manchas por cor. */
export const AMBIENTS = {
  destaque: { label: "Destaque", a: "", b: "" },
  floresta: { label: "Floresta", a: "#3fd67a", b: "#145a3c" },
  oceano: { label: "Oceano", a: "#4aa8ff", b: "#123a6b" },
  aurora: { label: "Aurora", a: "#5ff0c8", b: "#6b4bd6" },
  por_do_sol: { label: "Pôr do sol", a: "#ff9a5a", b: "#8a2c5a" },
  uva: { label: "Uva", a: "#b49cff", b: "#3b1f6b" },
  rubi: { label: "Rubi", a: "#ff6b7a", b: "#5a1420" },
  grafite: { label: "Grafite", a: "#9aa8b4", b: "#2a3138" },
} as const;
export type Ambient = keyof typeof AMBIENTS;

export const HOME_BLOCKS = {
  alerts: "Avisos",
  chart: "Gráfico do mês",
  categories: "Gastos por categoria",
  stats: "Indicadores",
  tank: "Tanque",
  purchase: "Compra e parcelas",
  agenda: "Próximos eventos",
  recent: "Últimos gastos",
} as const;
export type HomeBlock = keyof typeof HOME_BLOCKS;

export const NOTIFY_TYPES = {
  vencimentos: "Vencimentos (parcelas, lembretes, multas)",
  manutencao: "Manutenção, óleo e pneus",
  orcamento: "Orçamento e consumo",
  resumo: "Resumo do mês (dia 1º)",
} as const;
export type NotifyType = keyof typeof NOTIFY_TYPES;

export type Settings = {
  monthlyBudget: number | null;
  budgetAlertPct: number;
  reminderDays: number;
  oilIntervalKm: number;
  defaultFuel: "gasolina" | "etanol";
  consumptionUnit: "kml" | "l100";
  motion: "full" | "reduced" | "off";
  ambient: boolean;
  ambientColor: Ambient;
  ambientStrength: 1 | 2 | 3;
  theme: "dark" | "light" | "auto";
  countUp: boolean;
  hideValues: boolean;
  accent: Accent;
  home: Record<HomeBlock, boolean>;
  heroBrand: boolean;
  includeDownInTotal: boolean;
  includeInstallmentsInMonth: boolean;
  weekStart: 0 | 1;
  showCents: boolean;
  forecastMonths: 3 | 6 | 12;
  activeVehicleId: string | null;
  monthlyIncome: number | null;
  tireRotationKm: number;
  tirePressureDays: number;
  tireLifeKm: number;
  consumptionAlert: boolean;
  consumptionDropPct: number;
  notify: Record<NotifyType, boolean>;
  lockAfterMin: 0 | 1 | 5 | 15;
};

export const DEFAULT_SETTINGS: Settings = {
  monthlyBudget: null,
  budgetAlertPct: 80,
  reminderDays: 5,
  oilIntervalKm: 10000,
  defaultFuel: "gasolina",
  consumptionUnit: "kml",
  motion: "full",
  ambient: true,
  ambientColor: "destaque",
  ambientStrength: 2,
  theme: "dark",
  countUp: true,
  hideValues: false,
  accent: "verde",
  home: { alerts: true, chart: true, categories: true, stats: true, tank: true, purchase: true, agenda: true, recent: true },
  heroBrand: true,
  includeDownInTotal: true,
  includeInstallmentsInMonth: true,
  weekStart: 1,
  showCents: false,
  forecastMonths: 6,
  activeVehicleId: null,
  monthlyIncome: null,
  tireRotationKm: 10000,
  tirePressureDays: 15,
  tireLifeKm: 45000,
  consumptionAlert: true,
  consumptionDropPct: 15,
  notify: { vencimentos: true, manutencao: true, orcamento: true, resumo: true },
  lockAfterMin: 1,
};

const num = (v: unknown, d: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T =>
  typeof v === "string" && (opts as readonly string[]).includes(v) ? (v as T) : d;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const h = (r.home && typeof r.home === "object" ? r.home : {}) as Record<string, unknown>;
  const home = Object.fromEntries(
    (Object.keys(HOME_BLOCKS) as HomeBlock[]).map((k) => [k, bool(h[k], d.home[k])]),
  ) as Record<HomeBlock, boolean>;
  const nt = (r.notify && typeof r.notify === "object" ? r.notify : {}) as Record<string, unknown>;
  const notify = Object.fromEntries(
    (Object.keys(NOTIFY_TYPES) as NotifyType[]).map((k) => [k, bool(nt[k], d.notify[k])]),
  ) as Record<NotifyType, boolean>;
  return {
    monthlyBudget: typeof r.monthlyBudget === "number" && r.monthlyBudget > 0 ? r.monthlyBudget : null,
    budgetAlertPct: num(r.budgetAlertPct, d.budgetAlertPct, 10, 100),
    reminderDays: num(r.reminderDays, d.reminderDays, 1, 30),
    oilIntervalKm: num(r.oilIntervalKm, d.oilIntervalKm, 1000, 30000),
    defaultFuel: oneOf(r.defaultFuel, ["gasolina", "etanol"] as const, d.defaultFuel),
    consumptionUnit: oneOf(r.consumptionUnit, ["kml", "l100"] as const, d.consumptionUnit),
    motion: oneOf(r.motion, ["full", "reduced", "off"] as const, d.motion),
    ambient: bool(r.ambient, d.ambient),
    ambientColor: oneOf(r.ambientColor, Object.keys(AMBIENTS) as Ambient[], d.ambientColor),
    ambientStrength: r.ambientStrength === 1 || r.ambientStrength === 3 ? r.ambientStrength : 2,
    theme: oneOf(r.theme, ["dark", "light", "auto"] as const, d.theme),
    countUp: bool(r.countUp, d.countUp),
    hideValues: bool(r.hideValues, d.hideValues),
    accent: oneOf(r.accent, Object.keys(ACCENTS) as Accent[], d.accent),
    home,
    heroBrand: bool(r.heroBrand, d.heroBrand),
    includeDownInTotal: bool(r.includeDownInTotal, d.includeDownInTotal),
    includeInstallmentsInMonth: bool(r.includeInstallmentsInMonth, d.includeInstallmentsInMonth),
    weekStart: r.weekStart === 0 ? 0 : 1,
    showCents: bool(r.showCents, d.showCents),
    forecastMonths: r.forecastMonths === 3 || r.forecastMonths === 12 ? r.forecastMonths : 6,
    activeVehicleId: typeof r.activeVehicleId === "string" && UUID.test(r.activeVehicleId) ? r.activeVehicleId : null,
    monthlyIncome: typeof r.monthlyIncome === "number" && r.monthlyIncome > 0 ? r.monthlyIncome : null,
    tireRotationKm: num(r.tireRotationKm, d.tireRotationKm, 3000, 30000),
    tirePressureDays: num(r.tirePressureDays, d.tirePressureDays, 5, 60),
    tireLifeKm: num(r.tireLifeKm, d.tireLifeKm, 10000, 120000),
    consumptionAlert: bool(r.consumptionAlert, d.consumptionAlert),
    consumptionDropPct: num(r.consumptionDropPct, d.consumptionDropPct, 5, 40),
    notify,
    lockAfterMin: r.lockAfterMin === 0 || r.lockAfterMin === 5 || r.lockAfterMin === 15 ? r.lockAfterMin : 1,
  };
}
