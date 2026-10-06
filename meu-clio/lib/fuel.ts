// Cálculos do marcador de combustível. Funções puras, sem banco: testadas em tests/fuel.test.ts.

export type Tank = { capacity: number; bars: number }; // Clio: { capacity: 50, bars: 9 }
export const CLIO_TANK: Tank = { capacity: 50, bars: 9 };

/** Barras com meia posição: 3.5 → "3½", 0.5 → "½". */
export const formatBars = (v: number) => (v % 1 ? `${Math.floor(v) || ""}½` : String(v));
export const snapHalf = (v: number) => Math.round(v * 2) / 2;

export const litersPerBar = (t: Tank) => t.capacity / t.bars;
export const litersFromBars = (bars: number, t: Tank) => (Math.max(0, Math.min(t.bars, bars)) / t.bars) * t.capacity;

export type FillInput = {
  amount: number;            // R$ pago
  barsBefore: number;
  barsAfter: number;
  pricePerLiter?: number;    // opcional: se vier, a conta é exata
};

export type FillEstimate =
  | { ok: true; liters: number; source: "bomba" | "marcador"; pricePerLiter: number; gaugeLiters: number;
      tankAfter: number; mismatch: boolean; unusualPrice: boolean }
  | { ok: false; reason: "depois_menor" | "nao_subiu" | "valor_invalido" };

export function estimateFill(input: FillInput, t: Tank = CLIO_TANK): FillEstimate {
  const { amount, barsBefore, barsAfter, pricePerLiter } = input;
  if (!(amount > 0)) return { ok: false, reason: "valor_invalido" };
  if (barsAfter < barsBefore) return { ok: false, reason: "depois_menor" };

  const gaugeLiters = (barsAfter - barsBefore) * litersPerBar(t);
  const tankAfter = litersFromBars(barsAfter, t);

  if (pricePerLiter && pricePerLiter > 0) {
    const liters = amount / pricePerLiter;
    return {
      ok: true, liters, source: "bomba", pricePerLiter, gaugeLiters, tankAfter,
      // bomba e marcador discordam em mais de meia barra: provável erro no "antes"
      mismatch: Math.abs(liters - gaugeLiters) > litersPerBar(t) / 2,
      unusualPrice: false,
    };
  }
  if (gaugeLiters <= 0) return { ok: false, reason: "nao_subiu" };
  const price = amount / gaugeLiters;
  return { ok: true, liters: gaugeLiters, source: "marcador", pricePerLiter: price, gaugeLiters, tankAfter,
    mismatch: false, unusualPrice: price < 3.5 || price > 9 };
}

// ---------- consumo ----------
export type LevelReading = { km: number; liters: number; context: "antes" | "depois" | "manual"; date: string };
export type Fill = { km: number; liters: number; date: string };
export type Segment = { fromKm: number; toKm: number; km: number; liters: number; kmPerLiter: number };

// No mesmo km, a ordem é: leitura "antes" → abastecimento → leitura "depois"/"manual".
const rank = { antes: 0, fill: 1, depois: 2, manual: 2 } as const;

/**
 * Consumo entre leituras consecutivas do marcador:
 *   litros gastos = (no tanque na leitura anterior) + (abastecido no meio) − (no tanque agora)
 *   km/l = km rodados ÷ litros gastos
 */
export function consumptionSegments(readings: LevelReading[], fills: Fill[]): Segment[] {
  type Ev = { km: number; date: string; r: number } & ({ kind: "reading"; liters: number } | { kind: "fill"; liters: number });
  const evs: Ev[] = [
    ...readings.map((r) => ({ km: r.km, date: r.date, r: rank[r.context], kind: "reading" as const, liters: r.liters })),
    ...fills.map((f) => ({ km: f.km, date: f.date, r: rank.fill, kind: "fill" as const, liters: f.liters })),
  ].sort((a, b) => a.km - b.km || a.date.localeCompare(b.date) || a.r - b.r);

  const out: Segment[] = [];
  let last: { km: number; liters: number } | null = null;
  let added = 0;
  for (const e of evs) {
    if (e.kind === "fill") { if (last) added += e.liters; continue; }
    if (last && e.km > last.km) {
      const used = last.liters + added - e.liters;
      if (used > 0.5) out.push({ fromKm: last.km, toKm: e.km, km: e.km - last.km, liters: used, kmPerLiter: (e.km - last.km) / used });
    }
    last = { km: e.km, liters: e.liters };
    added = 0;
  }
  return out;
}

/** Média ponderada (total de km ÷ total de litros), que pesa mais os trechos longos. */
export function averageKmPerLiter(segments: Segment[]): number | null {
  const km = segments.reduce((s, x) => s + x.km, 0);
  const l = segments.reduce((s, x) => s + x.liters, 0);
  return l > 0 ? km / l : null;
}
