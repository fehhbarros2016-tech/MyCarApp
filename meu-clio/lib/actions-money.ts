"use server";

// Ações de dinheiro e uso: orçamento por categoria, gastos anuais, multas, viagens, recorrentes e favoritos.
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/server";
import { isISODate, parseIntLoose, parseMoney, todayISO } from "@/lib/format";
import { FINE_POINTS } from "@/lib/money";
import { isUuid, vehicleId } from "@/lib/server-utils";
import type { ActionResult } from "@/lib/actions";

const done = (msg: string, id?: string): ActionResult => { revalidatePath("/", "layout"); return { ok: true, msg, id, at: Date.now() }; };
const fail = (error: string): ActionResult => ({ ok: false, error, at: Date.now() });
const str = (v: FormDataEntryValue | null, max = 200) => { const s = String(v ?? "").trim().slice(0, max); return s || null; };
const uuid = (v: FormDataEntryValue | null) => (isUuid(String(v ?? "")) ? String(v) : null);
const date = (v: FormDataEntryValue | null) => { const s = str(v, 10); return s && isISODate(s) ? s : null; };
const now = () => new Date().toISOString();

async function soft(table: string, id: string, msg: string, undo = false): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Registro inválido.");
  const { error } = await db().from(table).update({ deleted_at: undo ? null : now() }).eq("id", id);
  if (error) return fail(undo ? "Não consegui desfazer." : "Não consegui excluir.");
  return done(undo ? "Restaurado" : msg, id);
}

// ---------------- orçamento por categoria ----------------
export async function setCategoryBudget(id: string, amount: number | null): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Categoria inválida.");
  if (amount != null && (!(amount > 0) || amount > 1_000_000)) return fail("Valor inválido.");
  const { error } = await db().from("categories").update({ monthly_budget: amount }).eq("id", id);
  if (error) return fail("Não consegui salvar.");
  return done(amount ? "Limite salvo" : "Limite removido", id);
}

// ---------------- gastos anuais ----------------
export async function saveAnnual(_: ActionResult, f: FormData): Promise<ActionResult> {
  const name = str(f.get("name"), 60);
  const amount = parseMoney(f.get("amount"));
  const month = parseIntLoose(f.get("dueMonth"));
  if (!name) return fail("Dê um nome (ex.: Seguro).");
  if (!amount || amount <= 0) return fail("Digite o valor aproximado.");
  if (!month || month < 1 || month > 12) return fail("Escolha o mês.");
  const row = { name, amount, due_month: month, category_id: uuid(f.get("category")), note: str(f.get("note"), 200) };
  const id = uuid(f.get("id"));
  const sb = db();
  if (id) {
    const { error } = await sb.from("annual_costs").update(row).eq("id", id);
    if (error) return fail("Não consegui salvar.");
    return done("Atualizado", id);
  }
  const { data, error } = await sb.from("annual_costs").insert({ ...row, vehicle_id: await vehicleId() }).select("id").single();
  if (error) return fail("Não consegui salvar.");
  return done("Gasto anual adicionado", data.id);
}
export async function deleteAnnual(id: string) { return soft("annual_costs", id, "Removido"); }
export async function restoreAnnual(id: string) { return soft("annual_costs", id, "", true); }

// ---------------- multas ----------------
export async function saveFine(_: ActionResult, f: FormData): Promise<ActionResult> {
  const description = str(f.get("description"), 120);
  const severity = String(f.get("severity"));
  if (!description) return fail("Descreva a multa (ex.: excesso de velocidade).");
  if (!(severity in FINE_POINTS)) return fail("Escolha a gravidade.");
  const pts = parseIntLoose(f.get("points"));
  const status = ["aberta", "paga", "recurso", "cancelada"].includes(String(f.get("status"))) ? String(f.get("status")) : "aberta";
  const amount = parseMoney(f.get("amount")) ?? null;
  const row = {
    description, severity, points: pts != null && pts <= 20 ? pts : FINE_POINTS[severity as keyof typeof FINE_POINTS],
    occurred_on: date(f.get("occurredOn")), due_date: date(f.get("dueDate")), amount, status, note: str(f.get("note"), 280),
  };
  const id = uuid(f.get("id"));
  const sb = db();
  let fineId = id;
  if (id) {
    const { error } = await sb.from("fines").update(row).eq("id", id);
    if (error) return fail("Não consegui salvar.");
  } else {
    const { data, error } = await sb.from("fines").insert({ ...row, vehicle_id: await vehicleId() }).select("id").single();
    if (error) return fail("Não consegui salvar.");
    fineId = data.id;
  }
  // paga com valor e ainda sem gasto: lança em Multas
  if (status === "paga" && amount && amount > 0 && fineId) {
    const cur = await sb.from("fines").select("expense_id,vehicle_id").eq("id", fineId).single();
    if (cur.data && !cur.data.expense_id) {
      const cat = await sb.from("categories").select("id").eq("slug", "multas").maybeSingle();
      const e = await sb.from("expenses").insert({ vehicle_id: cur.data.vehicle_id, category_id: cat.data?.id, occurred_on: todayISO(),
        amount, note: `Multa: ${description}` }).select("id").single();
      if (!e.error) await sb.from("fines").update({ expense_id: e.data.id }).eq("id", fineId);
      return done("Multa paga e lançada nos gastos", fineId);
    }
  }
  return done(id ? "Multa atualizada" : "Multa registrada", fineId ?? undefined);
}
export async function deleteFine(id: string) { return soft("fines", id, "Multa removida"); }
export async function restoreFine(id: string) { return soft("fines", id, "", true); }

// ---------------- viagens ----------------
export async function saveTrip(_: ActionResult, f: FormData): Promise<ActionResult> {
  const name = str(f.get("name"), 80);
  const start = date(f.get("startDate")) ?? todayISO();
  const end = date(f.get("endDate"));
  if (!name) return fail("Dê um nome à viagem.");
  if (end && end < start) return fail("A volta não pode ser antes da ida.");
  const row = { name, start_date: start, end_date: end, start_km: parseIntLoose(f.get("startKm")) ?? null,
    end_km: parseIntLoose(f.get("endKm")) ?? null, note: str(f.get("note"), 280) };
  if (row.start_km != null && row.end_km != null && row.end_km < row.start_km) return fail("O km final é menor que o inicial.");
  const id = uuid(f.get("id"));
  const sb = db();
  if (id) {
    const { error } = await sb.from("trips").update(row).eq("id", id);
    if (error) return fail("Não consegui salvar.");
    return done("Viagem atualizada", id);
  }
  const { data, error } = await sb.from("trips").insert({ ...row, vehicle_id: await vehicleId() }).select("id").single();
  if (error) return fail("Não consegui salvar.");
  return done("Viagem criada. Os gastos de hoje em diante podem ser marcados nela", data.id);
}
export async function endTrip(id: string, endKm: number | null): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Viagem inválida.");
  const { error } = await db().from("trips").update({ end_date: todayISO(), ...(endKm != null ? { end_km: endKm } : {}) }).eq("id", id);
  if (error) return fail("Não consegui encerrar.");
  return done("Viagem encerrada", id);
}
export async function deleteTrip(id: string) { return soft("trips", id, "Viagem removida (os gastos continuam)"); }
export async function restoreTrip(id: string) { return soft("trips", id, "", true); }

// ---------------- recorrentes ----------------
export async function updateRecurring(_: ActionResult, f: FormData): Promise<ActionResult> {
  const id = uuid(f.get("id"));
  const amount = parseMoney(f.get("amount"));
  if (!id) return fail("Recorrência inválida.");
  if (!amount || amount <= 0) return fail("Digite o valor.");
  const freq = ["semanal", "mensal", "anual"].includes(String(f.get("frequency"))) ? String(f.get("frequency")) : null;
  const next = date(f.get("nextDate"));
  const { error } = await db().from("recurring_expenses").update({
    amount, note: str(f.get("note"), 280), ...(freq ? { frequency: freq } : {}),
    ...(next ? { next_date: next, anchor_day: Number(next.slice(8, 10)) } : {}),
    end_date: date(f.get("endDate")), category_id: uuid(f.get("category")) ?? undefined,
  }).eq("id", id);
  if (error) return fail("Não consegui salvar.");
  return done("Recorrência atualizada", id);
}
export async function pauseRecurring(id: string, paused: boolean): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Recorrência inválida.");
  const { error } = await db().from("recurring_expenses").update({ paused_at: paused ? now() : null }).eq("id", id);
  if (error) return fail("Não consegui alterar.");
  return done(paused ? "Pausada" : "Retomada", id);
}
export async function deleteRecurring(id: string) { return soft("recurring_expenses", id, "Recorrência encerrada (os gastos já lançados continuam)"); }
export async function restoreRecurring(id: string) { return soft("recurring_expenses", id, "", true); }

// ---------------- favoritos ----------------
export async function saveFavorite(_: ActionResult, f: FormData): Promise<ActionResult> {
  const label = str(f.get("label"), 40);
  const amount = parseMoney(f.get("amount"));
  const category = uuid(f.get("category"));
  if (!label) return fail("Dê um nome curto (ex.: Lavagem).");
  if (!amount || amount <= 0) return fail("Digite o valor.");
  if (!category) return fail("Escolha a categoria.");
  const row = { label, amount, category_id: category, note: str(f.get("note"), 280), vendor: str(f.get("vendor"), 80) };
  const id = uuid(f.get("id"));
  const sb = db();
  const { data, error } = id ? await sb.from("expense_favorites").update(row).eq("id", id).select("id").single()
    : await sb.from("expense_favorites").insert(row).select("id").single();
  if (error) return fail("Não consegui salvar.");
  return done(id ? "Favorito atualizado" : "Favorito criado", data.id);
}
/** Um toque: lança o gasto do favorito com a data de hoje. Devolve o id do gasto (para desfazer). */
export async function launchFavorite(id: string, tripId?: string | null): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Favorito inválido.");
  const sb = db();
  const fav = await sb.from("expense_favorites").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!fav.data) return fail("Favorito não encontrado.");
  const { data, error } = await sb.from("expenses").insert({
    vehicle_id: await vehicleId(), category_id: fav.data.category_id, occurred_on: todayISO(), amount: fav.data.amount,
    note: fav.data.note ?? fav.data.label, vendor: fav.data.vendor, trip_id: tripId && isUuid(tripId) ? tripId : null,
  }).select("id").single();
  if (error) return fail("Não consegui lançar.");
  return done(`${fav.data.label} lançado`, data.id);
}
export async function deleteFavorite(id: string) { return soft("expense_favorites", id, "Favorito removido"); }
export async function restoreFavorite(id: string) { return soft("expense_favorites", id, "", true); }
