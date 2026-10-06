import { test } from "node:test";
import assert from "node:assert/strict";
import { averageKmPerLiter, consumptionSegments, estimateFill, formatBars, litersFromBars, CLIO_TANK } from "../lib/fuel";

const close = (a: number, b: number, eps = 0.05) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("cada barra do Clio vale 50/9 L", () => {
  close(litersFromBars(9, CLIO_TANK), 50);
  close(litersFromBars(1, CLIO_TANK), 5.56);
  close(litersFromBars(6, CLIO_TANK), 33.33);
});

test("sem preço por litro: litros vêm do marcador", () => {
  const r = estimateFill({ amount: 140, barsBefore: 2, barsAfter: 6 });
  assert.ok(r.ok);
  if (r.ok) { assert.equal(r.source, "marcador"); close(r.liters, 22.22); close(r.pricePerLiter, 6.3); close(r.tankAfter, 33.33); }
});

test("com preço por litro: conta exata e alerta se o marcador discorda", () => {
  const r = estimateFill({ amount: 140, barsBefore: 2, barsAfter: 6, pricePerLiter: 6.29 });
  assert.ok(r.ok && r.source === "bomba" && !r.mismatch);
  const r2 = estimateFill({ amount: 140, barsBefore: 4, barsAfter: 6, pricePerLiter: 6.29 });
  assert.ok(r2.ok && r2.mismatch);
});

test("erros de preenchimento", () => {
  assert.deepEqual(estimateFill({ amount: 100, barsBefore: 5, barsAfter: 3 }), { ok: false, reason: "depois_menor" });
  assert.deepEqual(estimateFill({ amount: 100, barsBefore: 5, barsAfter: 5 }), { ok: false, reason: "nao_subiu" });
  assert.deepEqual(estimateFill({ amount: 0, barsBefore: 1, barsAfter: 5 }), { ok: false, reason: "valor_invalido" });
});

test("consumo entre abastecimentos usando antes/depois", () => {
  // Abastece em 10.000 km (2→9 barras), roda até 10.400 e chega com 3 barras, abastece de novo.
  const L = (b: number) => litersFromBars(b, CLIO_TANK);
  const readings = [
    { km: 10000, liters: L(2), context: "antes" as const, date: "2026-10-01" },
    { km: 10000, liters: L(9), context: "depois" as const, date: "2026-10-01" },
    { km: 10400, liters: L(3), context: "antes" as const, date: "2026-10-10" },
    { km: 10400, liters: L(8), context: "depois" as const, date: "2026-10-10" },
  ];
  const fills = [{ km: 10000, liters: L(7), date: "2026-10-01" }, { km: 10400, liters: L(5), date: "2026-10-10" }];
  const seg = consumptionSegments(readings, fills);
  assert.equal(seg.length, 1);           // o abastecimento no mesmo km não vira trecho
  close(seg[0].liters, L(6));            // 9 barras → 3 barras = 33,3 L
  close(seg[0].kmPerLiter, 12);          // 400 km / 33,3 L
});

test("abastecimento sem leitura 'antes' entra na conta do trecho", () => {
  const readings = [
    { km: 1000, liters: 40, context: "depois" as const, date: "2026-01-01" },
    { km: 1500, liters: 30, context: "depois" as const, date: "2026-01-09" },
  ];
  const fills = [{ km: 1500, liters: 30, date: "2026-01-09" }];
  const seg = consumptionSegments(readings, fills);
  close(seg[0].liters, 40);              // 40 + 30 − 30
  close(seg[0].kmPerLiter, 12.5);
  close(averageKmPerLiter(seg)!, 12.5);
});

test("meia barra", () => {
  close(litersFromBars(3.5, CLIO_TANK), 19.44);
  const r = estimateFill({ amount: 100, barsBefore: 1.5, barsAfter: 4.5 });
  assert.ok(r.ok);
  if (r.ok) close(r.liters, 16.67);
  assert.equal(formatBars(3.5), "3½");
  assert.equal(formatBars(0.5), "½");
  assert.equal(formatBars(6), "6");
});
