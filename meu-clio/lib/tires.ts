// Pneus: desgaste pela km desde a troca, rodízio por km e calibragem por dias.
import { daysUntil, todayISO } from "@/lib/format";
import { daysToKm, kmStats, type KmStats } from "@/lib/km";
import type { Store, TireEvent } from "@/lib/store";

export type TireStatus = {
  lastSwap: TireEvent | null;
  wearPct: number | null;            // km rodados com o jogo atual ÷ vida útil
  kmOnSet: number | null;
  ageDays: number | null;
  rotation: { lastKm: number | null; nextKm: number | null; kmLeft: number | null; etaDays: number | null; tone: Tone };
  pressure: { lastDate: string | null; nextDate: string | null; daysLeft: number | null; tone: Tone; front: number | null; rear: number | null };
  recommended: { front: string | null; rear: string | null };
  hasData: boolean;
};
type Tone = "danger" | "warn" | "ok" | "info";

const latest = (list: TireEvent[], kinds: TireEvent["kind"][]) =>
  list.filter((t) => kinds.includes(t.kind)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0] ?? null;

export function tireStatus(s: Store, k: KmStats = kmStats(s), today = todayISO()): TireStatus {
  const st = s.settings;
  const swap = latest(s.tires, ["troca"]);
  const rot = latest(s.tires, ["rodizio", "troca"]);
  const cal = latest(s.tires, ["calibragem", "troca"]);
  const kmOnSet = swap?.km != null && k.last != null ? Math.max(0, k.last - swap.km) : null;

  const rotLastKm = rot?.km ?? null;
  const nextKm = rotLastKm != null ? rotLastKm + st.tireRotationKm : null;
  const kmLeft = nextKm != null && k.last != null ? nextKm - k.last : null;
  const rotTone: Tone = kmLeft == null ? "info" : kmLeft < 0 ? "danger" : kmLeft <= 1000 ? "warn" : "ok";

  const nextDate = cal ? new Date(Date.parse(cal.date + "T12:00:00Z") + st.tirePressureDays * 86_400_000).toISOString().slice(0, 10) : null;
  const daysLeft = nextDate ? daysUntil(nextDate, today) : null;
  const calTone: Tone = daysLeft == null ? "info" : daysLeft < 0 ? "warn" : daysLeft <= 2 ? "warn" : "ok";
  const lastPressure = latest(s.tires.filter((t) => t.front != null || t.rear != null), ["calibragem", "troca", "rodizio", "reparo"]);

  return {
    lastSwap: swap,
    wearPct: kmOnSet != null ? kmOnSet / st.tireLifeKm : null,
    kmOnSet,
    ageDays: swap ? daysUntil(today, swap.date) : null,
    rotation: { lastKm: rotLastKm, nextKm, kmLeft, etaDays: nextKm != null ? daysToKm(k, nextKm) : null, tone: rotTone },
    pressure: { lastDate: cal?.date ?? null, nextDate, daysLeft, tone: calTone, front: lastPressure?.front ?? null, rear: lastPressure?.rear ?? null },
    recommended: { front: s.vehicle.info.pressaoDianteira ?? null, rear: s.vehicle.info.pressaoTraseira ?? null },
    hasData: s.tires.length > 0,
  };
}

export const TIRE_KIND_LABEL: Record<TireEvent["kind"], string> = {
  troca: "Troca de pneus", rodizio: "Rodízio", calibragem: "Calibragem", reparo: "Reparo",
};
