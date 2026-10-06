const brl0 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat("pt-BR");

export const money = (v: number, cents = false) => (cents ? brl2 : brl0).format(v);
export const km = (v: number) => `${int.format(v)} km`;

export function greeting(d = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(d));
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function daysUntil(isoDate: string, today = new Date()): number {
  const t = new Date(today.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + "T00:00:00");
  const d = new Date(isoDate + "T00:00:00");
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

export function countdown(days: number): string {
  if (days < 0) return days === -1 ? "venceu ontem" : `venceu há ${-days} dias`;
  if (days === 0) return "vence hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}
