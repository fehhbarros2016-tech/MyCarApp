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

export type Settings = {
  monthlyBudget: number | null;
  budgetAlertPct: number;
  reminderDays: number;
  oilIntervalKm: number;
  defaultFuel: "gasolina" | "etanol";
  consumptionUnit: "kml" | "l100";
  motion: "full" | "reduced" | "off";
  ambient: boolean;
  countUp: boolean;
  hideValues: boolean;
  accent: Accent;
  home: Record<HomeBlock, boolean>;
  includeDownInTotal: boolean;
  includeInstallmentsInMonth: boolean;
  weekStart: 0 | 1;
  showCents: boolean;
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
  countUp: true,
  hideValues: false,
  accent: "verde",
  home: { alerts: true, chart: true, categories: true, stats: true, tank: true, purchase: true, agenda: true, recent: true },
  includeDownInTotal: true,
  includeInstallmentsInMonth: true,
  weekStart: 1,
  showCents: false,
};

const num = (v: unknown, d: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T =>
  typeof v === "string" && (opts as readonly string[]).includes(v) ? (v as T) : d;

export function parseSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const h = (r.home && typeof r.home === "object" ? r.home : {}) as Record<string, unknown>;
  const home = Object.fromEntries(
    (Object.keys(HOME_BLOCKS) as HomeBlock[]).map((k) => [k, bool(h[k], d.home[k])]),
  ) as Record<HomeBlock, boolean>;
  return {
    monthlyBudget: typeof r.monthlyBudget === "number" && r.monthlyBudget > 0 ? r.monthlyBudget : null,
    budgetAlertPct: num(r.budgetAlertPct, d.budgetAlertPct, 10, 100),
    reminderDays: num(r.reminderDays, d.reminderDays, 1, 30),
    oilIntervalKm: num(r.oilIntervalKm, d.oilIntervalKm, 1000, 30000),
    defaultFuel: oneOf(r.defaultFuel, ["gasolina", "etanol"] as const, d.defaultFuel),
    consumptionUnit: oneOf(r.consumptionUnit, ["kml", "l100"] as const, d.consumptionUnit),
    motion: oneOf(r.motion, ["full", "reduced", "off"] as const, d.motion),
    ambient: bool(r.ambient, d.ambient),
    countUp: bool(r.countUp, d.countUp),
    hideValues: bool(r.hideValues, d.hideValues),
    accent: oneOf(r.accent, Object.keys(ACCENTS) as Accent[], d.accent),
    home,
    includeDownInTotal: bool(r.includeDownInTotal, d.includeDownInTotal),
    includeInstallmentsInMonth: bool(r.includeInstallmentsInMonth, d.includeInstallmentsInMonth),
    weekStart: r.weekStart === 0 ? 0 : 1,
    showCents: bool(r.showCents, d.showCents),
  };
}
