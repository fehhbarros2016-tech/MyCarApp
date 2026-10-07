const TZ = "America/Sao_Paulo";
const nf0 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const int = new Intl.NumberFormat("pt-BR");

export const money = (v: number, cents = false) => (cents ? nf2 : nf0).format(v);
export const brl = (v: number, cents = false) => `R$ ${money(v, cents)}`;
/** R$ compacto: 1,2 mil */
export const brlShort = (v: number) => (Math.abs(v) >= 10000 ? `R$ ${nf1.format(v / 1000)} mil` : brl(v));
export const km = (v: number) => `${int.format(Math.round(v))} km`;
export const dec1 = (v: number) => nf1.format(v);
export const intf = (v: number) => int.format(v);

export const todayISO = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: TZ });
export const monthKey = (iso: string) => iso.slice(0, 7);
export const currentMonth = () => monthKey(todayISO());

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const monthShort = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1];
export const monthLong = (key: string) => {
  const name = MONTHS_LONG[Number(key.slice(5, 7)) - 1];
  return key.slice(0, 4) === currentMonth().slice(0, 4) ? name : `${name} de ${key.slice(0, 4)}`;
};
export const dateBR = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
export const dateFull = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const WEEK = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const weekdayIdx = (iso: string) => new Date(iso + "T12:00:00Z").getUTCDay();
export const weekday = (iso: string) => WEEK[weekdayIdx(iso)];

export function dayLabel(iso: string): string {
  const t = todayISO();
  const diff = daysUntil(iso, t);
  if (diff === 0) return "Hoje";
  if (diff === -1) return "Ontem";
  return `${weekday(iso).replace(/^./, (c) => c.toUpperCase())}, ${dateBR(iso)}`;
}

export function greeting(d = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: TZ }).format(d));
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function daysUntil(isoDate: string, today: string | Date = new Date()): number {
  const t = typeof today === "string" ? today : todayISO(today);
  return Math.round((Date.parse(isoDate + "T00:00:00Z") - Date.parse(t + "T00:00:00Z")) / 86_400_000);
}

export function countdown(days: number): string {
  if (days < 0) return days === -1 ? "venceu ontem" : `venceu há ${-days} dias`;
  if (days === 0) return "vence hoje";
  if (days === 1) return "amanhã";
  if (days < 45) return `em ${days} dias`;
  const m = Math.round(days / 30);
  return `em ${m} ${m === 1 ? "mês" : "meses"}`;
}

/** "1.234,56" | "1234.56" | "R$ 12" → número */
export function parseMoney(v: FormDataEntryValue | null | undefined): number | undefined {
  let s = String(v ?? "").replace(/[^\d.,-]/g, "").trim();
  if (!s) return undefined;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) ?? []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
export function parseIntLoose(v: FormDataEntryValue | null | undefined): number | undefined {
  const s = String(v ?? "").replace(/\D/g, "");
  return s ? Number(s) : undefined;
}
export const isISODate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
