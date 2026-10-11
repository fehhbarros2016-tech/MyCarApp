// Quilometragem: km atual, km rodados e ritmo de uso.
import { daysUntil, todayISO } from "@/lib/format";
import type { OdoReading, Store } from "@/lib/store";

export type KmStats = {
  first: number | null;
  last: number | null;          // km atual: a leitura mais recente (por data e, no mesmo dia, a última registrada)
  driven: number;
  lastDate: string | null;
  perDay: number | null;
  perMonth: number | null;
  perYear: number | null;
};

const EMPTY: KmStats = { first: null, last: null, driven: 0, lastDate: null, perDay: null, perMonth: null, perYear: null };

/**
 * O km atual é a ÚLTIMA leitura informada, não a maior. Assim, se um km foi digitado errado (ex.: 192.000)
 * e depois corrigido (191.891), o app passa a mostrar o valor corrigido.
 */
export function kmFrom(readings: OdoReading[]): KmStats {
  if (!readings.length) return EMPTY;
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const cur = sorted[sorted.length - 1];
  const first = Math.min(...sorted.map((r) => r.km));
  const driven = Math.max(0, cur.km - first);

  // ritmo: do primeiro registro com data real até a leitura atual (mínimo de 10 dias para não exagerar)
  const dated = sorted.filter((r) => !r.date.startsWith("1900"));
  let perDay: number | null = null;
  if (dated.length >= 2) {
    const yearAgo = new Date(Date.parse(cur.date + "T12:00:00Z") - 365 * 86_400_000).toISOString().slice(0, 10);
    const ref = dated.find((r) => r.date >= yearAgo && r.km <= cur.km) ?? dated[0];
    const days = daysUntil(cur.date, ref.date);
    if (days >= 10 && cur.km > ref.km) perDay = (cur.km - ref.km) / days;
  }
  return {
    first, last: cur.km, driven, lastDate: cur.date, perDay,
    perMonth: perDay != null ? perDay * 30.4 : null,
    perYear: perDay != null ? perDay * 365 : null,
  };
}

export const kmStats = (s: Store): KmStats => kmFrom(s.odometer);

/** Km estimado hoje (última leitura + ritmo × dias desde ela). Só para previsões; a tela mostra o km informado. */
export function kmToday(k: KmStats, today = todayISO()): number | null {
  if (k.last == null) return null;
  if (!k.perDay || !k.lastDate) return k.last;
  return Math.round(k.last + Math.max(0, daysUntil(today, k.lastDate)) * k.perDay);
}

/** Em quantos dias chega a um km, no ritmo atual. */
export function daysToKm(k: KmStats, targetKm: number): number | null {
  if (k.last == null || !k.perDay) return null;
  return Math.max(0, Math.round((targetKm - k.last) / k.perDay));
}
