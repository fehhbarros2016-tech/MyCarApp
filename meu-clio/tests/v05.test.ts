import { test } from "node:test";
import assert from "node:assert/strict";
import { alerts, upcoming } from "../lib/calc";
import { compareFuels } from "../lib/fuel";
import { kmFrom } from "../lib/km";
import { annualReserve, finePoints, impliedMonthlyRate, payoff } from "../lib/money";
import { planStatus } from "../lib/plan";
import { search } from "../lib/search";
import { editDistance, norm } from "../lib/text";
import { tireStatus } from "../lib/tires";
import { addMonths, currentMonth, todayISO } from "../lib/format";
import { cat, exp, store, vehicle } from "./helpers";
import type { OdoReading, PlanItem } from "../lib/store";

const odo = (date: string, km: number, createdAt: string, source: OdoReading["source"] = "manual"): OdoReading => ({ id: null, date, km, source, createdAt });

// ---------------- km atual ----------------
test("km atual é a última leitura, não a maior (corrige km digitado errado)", () => {
  const k = kmFrom([
    odo("2026-09-29", 191850, "2026-10-07T22:21:48Z", "gasto"),
    odo("2026-10-07", 192000, "2026-10-07T06:04:11Z"),
    odo("2026-10-07", 191891, "2026-10-07T22:16:58Z"),
  ]);
  assert.equal(k.last, 191891);
  assert.equal(k.lastDate, "2026-10-07");
});

test("gasto com data antiga não muda o km atual", () => {
  const k = kmFrom([odo("2026-10-07", 191891, "2026-10-07T10:00:00Z"), odo("2026-09-01", 190000, "2026-10-08T10:00:00Z", "gasto")]);
  assert.equal(k.last, 191891);
});

test("ritmo de uso em km por dia", () => {
  const k = kmFrom([odo("2026-09-01", 10000, "a"), odo("2026-10-01", 11500, "b")]);
  assert.equal(Math.round(k.perDay!), 50);
  assert.equal(Math.round(k.perYear!), 18250);
});

// ---------------- plano de revisão ----------------
const item = (extra: Partial<PlanItem> = {}): PlanItem => ({
  id: "p1", name: "Velas", system: "motor", categorySlug: null, keyword: "vela", intervalKm: 20000, intervalMonths: 24,
  lastKm: null, lastDate: null, note: null, sort: 0, ...extra,
});

test("plano reconhece manutenção já registrada pelo nome do serviço", () => {
  const cats = [cat("m", "manutencao", "manutencao")];
  const s = store([exp("m", "2026-09-29", 113, { km: 191850, maint: { system: "motor", service: "Velas NGK", parts: 113, labor: 0, nextDate: null, nextKm: null, planId: null } })],
    { odometer: [odo("2026-10-07", 191891, "x")] }, cats);
  const p = planStatus(s, item(), kmFrom(s.odometer), "2026-10-11");
  assert.equal(p.lastKm, 191850);
  assert.equal(p.dueKm, 211850);
  assert.equal(p.kmLeft, 211850 - 191891);
  assert.equal(p.tone, "ok");
});

test("plano: vencido por tempo vira perigo; nunca feito fica como informação", () => {
  const s = store([], { odometer: [odo("2026-10-07", 50000, "x")] });
  const late = planStatus(s, item({ lastDate: "2024-01-10", lastKm: 49000 }), kmFrom(s.odometer), "2026-10-11");
  assert.equal(late.tone, "danger");
  const never = planStatus(s, item(), kmFrom(s.odometer), "2026-10-11");
  assert.equal(never.known, false);
  assert.equal(never.tone, "info");
});

// ---------------- pneus ----------------
test("pneus: rodízio por km e desgaste pela vida útil", () => {
  const s = store([], {
    odometer: [odo("2026-10-01", 60000, "x")],
    tires: [{ id: "t", kind: "troca", date: "2026-01-10", km: 40000, front: 32, rear: 30, positions: null, brand: null, size: null, cost: null, shopId: null, expenseId: null, note: null, createdAt: "a" }],
  });
  const t = tireStatus(s, kmFrom(s.odometer), "2026-10-11");
  assert.equal(t.kmOnSet, 20000);
  assert.equal(t.rotation.nextKm, 50000);
  assert.equal(t.rotation.tone, "danger");
  assert.equal(Math.round(t.wearPct! * 100), Math.round((20000 / 45000) * 100));
});

// ---------------- dinheiro ----------------
test("taxa implícita do financiamento e economia ao adiantar parcelas", () => {
  // 40 mil financiados em 48x de 1.100 → juros de ~1,2% a.m.
  const list = Array.from({ length: 48 }, (_, i) => ({ amount: 1100, dueDate: `${addMonths("2026-11", i)}-10` }));
  const r = impliedMonthlyRate(40000, list, "2026-10-10")!;
  assert.ok(r > 0.011 && r < 0.0125, `taxa ${r}`);
  const s = store([], {
    vehicle: vehicle({ purchasePrice: 50000, downPayment: 10000, purchaseDate: "2026-10-10" }),
    installments: list.map((x, i) => ({ id: `i${i}`, number: i + 1, amount: x.amount, dueDate: x.dueDate, paidAt: null, note: null })),
  });
  const sim = payoff(s, null, "2026-10-10").simulate(12);
  assert.equal(sim.count, 12);
  assert.equal(sim.nominal, 13200);
  assert.ok(sim.saving > 3000 && sim.payNow < 10000, JSON.stringify(sim));
  assert.equal(sim.newEnd, list[35].dueDate);
});

test("sem juros: adiantar não muda o valor", () => {
  const s = store([], {
    vehicle: vehicle({ purchasePrice: 12000, downPayment: 0, purchaseDate: "2026-10-01" }),
    installments: Array.from({ length: 12 }, (_, i) => ({ id: `i${i}`, number: i + 1, amount: 1000, dueDate: `${addMonths("2026-11", i)}-01`, paidAt: null, note: null })),
  });
  const p = payoff(s, null, "2026-10-01");
  assert.equal(p.rate, 0);
  assert.equal(Math.round(p.simulate(3).saving), 0);
});

test("reserva mensal para gastos anuais", () => {
  const m = Number(currentMonth().slice(5, 7));
  const due = ((m + 5) % 12) + 1; // daqui a 6 meses
  const s = store([], { annual: [{ id: "a", name: "Seguro", categoryId: null, amount: 2400, dueMonth: due, note: null }] });
  const r = annualReserve(s);
  assert.equal(r.lines[0].monthsLeft, 6);
  assert.equal(r.perMonthNow, 400);
  assert.equal(r.perMonthSteady, 200);
});

test("pontos da CNH e limite pela regra das gravíssimas", () => {
  const t = todayISO();
  const f = (sev: "leve" | "gravissima", points: number) => ({ id: sev + points, description: "x", severity: sev, points, occurredOn: t, dueDate: null, amount: null, status: "aberta" as const, note: null, expenseId: null });
  assert.equal(finePoints(store([], { fines: [f("leve", 3)] })).limit, 40);
  assert.equal(finePoints(store([], { fines: [f("gravissima", 7)] })).limit, 30);
  const two = finePoints(store([], { fines: [f("gravissima", 7), f("gravissima", 8)] }));
  assert.equal(two.limit, 20);
  assert.equal(two.points, 15);
});

// ---------------- combustível ----------------
test("etanol x gasolina pelo rendimento real", () => {
  const c = compareFuels(6.0, 4.0, 12, 8.5)!;
  assert.equal(c.basis, "seus dados");
  assert.equal(c.best, "etanol"); // 4/8,5 = 0,47 < 6/12 = 0,50
  const r = compareFuels(6.0, 4.5)!;
  assert.equal(r.basis, "regra dos 70%");
  assert.equal(r.best, "gasolina"); // 4,5/6 = 75% > 70%
  assert.equal(Math.round(r.breakEvenEthanol * 100), 420);
});

// ---------------- busca ----------------
test("busca entende pedaço, erro de digitação e acento", () => {
  const cats = [{ id: "c", name: "Combustível", slug: "combustivel" }, { id: "o", name: "Troca de óleo", slug: "oleo" }, { id: "p", name: "Pedágios", slug: "pedagio" }];
  const docs = [
    { id: "1", date: "2026-09-10", amount: 250, title: "40 L de gasolina", sub: "Posto Shell", catId: "c" },
    { id: "2", date: "2026-09-12", amount: 180, title: "Troca de óleo", sub: "Oficina do Zé", catId: "o" },
    { id: "3", date: "2026-08-02", amount: 12.4, title: "Pedágios", sub: "Rodovia", catId: "p" },
  ];
  assert.equal(search("comb", docs, cats).cats[0].cat.id, "c");
  assert.equal(search("comb", docs, cats).docs[0].doc.id, "1");
  assert.equal(search("conbustivel", docs, cats).docs[0].doc.id, "1");
  assert.equal(search("oleo", docs, cats).docs[0].doc.id, "2");
  assert.equal(search("pedagio", docs, cats).docs[0].doc.id, "3");
  assert.equal(search("alcool", docs, cats).cats[0]?.cat.id, "c");
  assert.equal(search("setembro oficina", docs, cats).docs.length, 1);
  assert.equal(search("250", docs, cats).docs[0].doc.id, "1");
  assert.equal(search("xyzw", docs, cats).docs.length, 0);
});

test("texto: sem acento e distância de edição", () => {
  assert.equal(norm("  Óleo   do MOTOR "), "oleo do motor");
  assert.equal(editDistance("conbustivel", "combustivel"), 1);
  assert.equal(editDistance("oelo", "oleo"), 1);
});

// ---------------- avisos ----------------
test("avisos e próximos eventos funcionam com o Store completo", () => {
  const cats = [cat("c", "combustivel", "uso", 100)];
  const s = store([exp("c", todayISO(), 150)], { odometer: [odo(todayISO(), 1000, "x")] }, cats);
  const a = alerts(s);
  assert.ok(a.some((x) => x.id === "cb-c" && x.tone === "danger"));
  assert.ok(Array.isArray(upcoming(s)));
});
