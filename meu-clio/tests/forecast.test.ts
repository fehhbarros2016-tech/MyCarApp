import { test } from "node:test";
import assert from "node:assert/strict";
import { forecast } from "../lib/calc";
import { addMonths, currentMonth } from "../lib/format";
import { cat, exp as mk, store as mkStore } from "./helpers";
import type { Expense, Store } from "../lib/store";

const cats = [cat("c", "combustivel"), cat("m", "manutencao", "manutencao"), cat("s", "seguro", "protecao"), cat("i", "ipva", "documentacao")];
const K = currentMonth();
const d = (monthsAgo: number, day = 10) => `${addMonths(K, -monthsAgo)}-${String(day).padStart(2, "0")}`;
const exp = (catId: string, date: string, amount: number) => mk(catId, date, amount);
const store = (expenses: Expense[], extra: Partial<Store> = {}) => mkStore(expenses, extra, cats);

test("média por categoria dos meses completos, com zero nos meses sem gasto", () => {
  // combustível 400/mês nos últimos 3 meses; manutenção 300 em um deles; uso começou há 3 meses
  const s = store([exp("c", d(1), 400), exp("c", d(2), 400), exp("c", d(3), 400), exp("m", d(2), 300)]);
  const f = forecast(s);
  assert.equal(f.months, 3);                       // não conta meses antes do primeiro registro
  assert.equal(f.lines.find((l) => l.id === "c")?.amount, 400);
  assert.equal(f.lines.find((l) => l.id === "m")?.amount, 100); // 300 ÷ 3
  assert.equal(f.total, 500);
});

test("seguro anual não vira média; entra no mês do lembrete com o último valor", () => {
  const s = store([exp("c", d(1), 400), exp("s", d(2), 2400)], {
    events: [{ id: "ev", kind: "seguro", title: "Seguro", dueDate: `${K}-20`, dueKm: null, repeatMonths: 12, repeatKm: null, doneAt: null, note: null, expenseId: null }],
  });
  const f = forecast(s);
  const seg = f.lines.find((l) => l.id === "s");
  assert.equal(seg?.amount, 2400);
  assert.equal(seg?.basis, "lembrete");
  // sem lembrete no mês, o seguro some da previsão
  const sem = forecast(store([exp("c", d(1), 400), exp("s", d(2), 2400)]));
  assert.equal(sem.lines.find((l) => l.id === "s"), undefined);
});

test("IPVA pago no mesmo mês do ano passado volta a ser previsto", () => {
  const f = forecast(store([exp("c", d(1), 300), exp("i", d(12), 1100)]));
  assert.equal(f.lines.find((l) => l.id === "i")?.amount, 1100);
  assert.equal(f.lines.find((l) => l.id === "i")?.basis, "anual");
});

test("parcela do mês entra com valor exato e o gasto do mês abate o restante", () => {
  const s = store([exp("c", d(1), 400), exp("c", `${K}-02`, 150)], {
    installments: [{ id: "p", number: 7, amount: 1000, dueDate: `${K}-10`, paidAt: null, note: null }],
  });
  const f = forecast(s);
  assert.equal(f.lines.find((l) => l.id === "parcelas")?.amount, 1000);
  assert.equal(f.total, 1400);
  assert.equal(f.spent, 150);
  assert.equal(f.remaining, 1250);
});

test("sem histórico: só o que é certo", () => {
  const f = forecast(store([exp("c", `${K}-01`, 200)]));
  assert.equal(f.months, 0);
  assert.equal(f.ready, false);
});
