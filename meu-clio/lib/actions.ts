"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/session";
import { isISODate, parseIntLoose, parseMoney, todayISO } from "@/lib/format";
import { parseSettings, type Settings } from "@/lib/settings";

export type ActionResult = { ok?: boolean; error?: string; at?: number; msg?: string; id?: string };

const done = (msg: string, id?: string): ActionResult => {
  revalidatePath("/", "layout");
  return { ok: true, msg, id, at: Date.now() };
};
const fail = (error: string): ActionResult => ({ ok: false, error, at: Date.now() });
const str = (v: FormDataEntryValue | null, max = 200) => {
  const s = String(v ?? "").trim().slice(0, max);
  return s || null;
};
const COLOR = /^#[0-9a-fA-F]{6}$/;

async function vehicleId(): Promise<string> {
  const { data, error } = await db().from("vehicles").select("id").is("archived_at", null).order("created_at").limit(1);
  if (error || !data?.[0]) throw new Error("Nenhum veículo encontrado.");
  return data[0].id as string;
}

// ---------------- gastos ----------------
export async function saveExpense(_: ActionResult, f: FormData): Promise<ActionResult> {
  const amount = parseMoney(f.get("amount"));
  const category = str(f.get("category"), 64);
  const date = str(f.get("date"), 10) ?? todayISO();
  if (!amount || amount <= 0) return fail("Digite o valor.");
  if (!category) return fail("Escolha uma categoria.");
  if (!isISODate(date)) return fail("Data inválida.");
  const row = {
    amount, category_id: category, occurred_on: date,
    odometer: parseIntLoose(f.get("km")) ?? null,
    vendor: str(f.get("vendor"), 80), note: str(f.get("note"), 280),
    updated_at: new Date().toISOString(),
  };
  const id = str(f.get("id"), 64);
  const sb = db();
  if (id) {
    const { error } = await sb.from("expenses").update(row).eq("id", id);
    if (error) return fail("Não consegui salvar. Tente de novo.");
    return done("Gasto atualizado", id);
  }
  const { data, error } = await sb.from("expenses").insert({ ...row, vehicle_id: await vehicleId() }).select("id").single();
  if (error) return fail("Não consegui salvar. Tente de novo.");
  return done("Gasto salvo", data.id);
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const { error } = await db().from("expenses").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return fail("Não consegui excluir.");
  return done("Excluído", id);
}

export async function restoreExpense(id: string): Promise<ActionResult> {
  const { error } = await db().from("expenses").update({ deleted_at: null }).eq("id", id);
  if (error) return fail("Não consegui desfazer.");
  return done("Restaurado", id);
}

// ---------------- categorias ----------------
const GROUPS = ["uso", "manutencao", "protecao", "documentacao", "estetica", "modificacoes", "outros"];

export async function saveCategory(_: ActionResult, f: FormData): Promise<ActionResult> {
  const name = str(f.get("name"), 40);
  const color = String(f.get("color") ?? "");
  const icon = str(f.get("icon"), 24) ?? "box";
  const group = String(f.get("group") ?? "outros");
  if (!name) return fail("Dê um nome para a categoria.");
  if (!COLOR.test(color)) return fail("Cor inválida.");
  if (!GROUPS.includes(group)) return fail("Grupo inválido.");
  const id = str(f.get("id"), 64);
  const sb = db();
  if (id) {
    const { error } = await sb.from("categories").update({ name, color, icon, cost_group: group }).eq("id", id);
    if (error) return fail("Não consegui salvar.");
    return done("Categoria atualizada", id);
  }
  const slug = `c-${name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30)}-${Date.now().toString(36)}`;
  const { data: maxSort } = await sb.from("categories").select("sort").order("sort", { ascending: false }).limit(1);
  const { data, error } = await sb.from("categories")
    .insert({ slug, name, color, icon, cost_group: group, is_custom: true, sort: (maxSort?.[0]?.sort ?? 20) + 1 })
    .select("id").single();
  if (error) return fail("Não consegui criar a categoria.");
  return done("Categoria criada", data.id);
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<ActionResult> {
  const sb = db();
  const { data } = await sb.from("categories").select("slug").eq("id", id).single();
  if (data?.slug === "combustivel" && archived) return fail("Combustível é usado pelo marcador e não pode ser ocultado.");
  const { error } = await sb.from("categories").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id);
  if (error) return fail("Não consegui alterar.");
  return done(archived ? "Categoria oculta" : "Categoria visível", id);
}

export async function moveCategory(id: string, dir: -1 | 1): Promise<ActionResult> {
  const sb = db();
  const { data } = await sb.from("categories").select("id,sort").order("sort");
  const list = data ?? [];
  const i = list.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true, at: Date.now() };
  const a = list[i], b = list[j];
  const sa = a.sort === b.sort ? a.sort + dir : b.sort;
  await Promise.all([
    sb.from("categories").update({ sort: sa }).eq("id", a.id),
    sb.from("categories").update({ sort: a.sort }).eq("id", b.id),
  ]);
  return done("Ordem alterada", id);
}

// ---------------- manutenção ----------------
const SYSTEMS = ["motor", "cambio", "suspensao", "freios", "eletrica", "arrefecimento", "pneus", "escapamento", "injecao", "outros"];

export async function saveMaintenance(_: ActionResult, f: FormData): Promise<ActionResult> {
  const service = str(f.get("service"), 120);
  const system = String(f.get("system") ?? "outros");
  const date = str(f.get("date"), 10) ?? todayISO();
  const parts = parseMoney(f.get("parts")) ?? 0;
  const labor = parseMoney(f.get("labor")) ?? 0;
  if (!service) return fail("Diga qual serviço foi feito.");
  if (!SYSTEMS.includes(system)) return fail("Sistema inválido.");
  if (parts + labor <= 0) return fail("Informe o valor de peças ou de mão de obra.");
  if (!isISODate(date)) return fail("Data inválida.");
  const nextDate = str(f.get("nextDate"), 10);
  const id = str(f.get("id"), 64);
  const sb = db();
  const km = parseIntLoose(f.get("km")) ?? null;
  const nextKm = parseIntLoose(f.get("nextKm")) ?? null;
  const category = str(f.get("category"), 64);
  if (id) {
    const [a, b] = await Promise.all([
      sb.from("expenses").update({ amount: parts + labor, occurred_on: date, odometer: km, vendor: str(f.get("vendor"), 80),
        note: str(f.get("note"), 280), ...(category ? { category_id: category } : {}), updated_at: new Date().toISOString() }).eq("id", id),
      sb.from("maintenance_records").update({ system, service, parts_cost: parts, labor_cost: labor,
        next_due_date: nextDate && isISODate(nextDate) ? nextDate : null, next_due_km: nextKm }).eq("expense_id", id),
    ]);
    if (a.error || b.error) return fail("Não consegui salvar.");
    return done("Manutenção atualizada", id);
  }
  const { data, error } = await sb.rpc("save_maintenance", {
    p_vehicle: await vehicleId(), p_date: date, p_km: km, p_category: category, p_system: system, p_service: service,
    p_parts: parts, p_labor: labor, p_vendor: str(f.get("vendor"), 80), p_note: str(f.get("note"), 280),
    p_next_date: nextDate && isISODate(nextDate) ? nextDate : null, p_next_km: nextKm,
  });
  if (error) return fail("Não consegui salvar. Nada foi gravado.");
  return done(nextDate || nextKm ? "Manutenção salva e lembrete criado" : "Manutenção salva", data as string);
}

// ---------------- parcelas ----------------
export async function createPlan(_: ActionResult, f: FormData): Promise<ActionResult> {
  const price = parseMoney(f.get("price"));
  const down = parseMoney(f.get("down")) ?? 0;
  const count = parseIntLoose(f.get("count"));
  const amount = parseMoney(f.get("amount"));
  const first = str(f.get("firstDue"), 10);
  const paid = parseIntLoose(f.get("paid")) ?? 0;
  if (!count || count < 1 || count > 240) return fail("Número de parcelas entre 1 e 240.");
  if (!amount || amount <= 0) return fail("Digite o valor de cada parcela.");
  if (!first || !isISODate(first)) return fail("Escolha o vencimento da 1ª parcela.");
  if (paid > count) return fail("Parcelas pagas não pode passar do total.");
  const { error } = await db().rpc("create_installment_plan", {
    p_vehicle: await vehicleId(), p_price: price ?? down + count * amount, p_down: down, p_count: count,
    p_amount: amount, p_first_due: first, p_paid: paid, p_purchase_date: str(f.get("purchaseDate"), 10),
  });
  if (error) return fail("Não consegui criar as parcelas.");
  return done(`${count} parcelas criadas`);
}

export async function updateInstallment(_: ActionResult, f: FormData): Promise<ActionResult> {
  const id = str(f.get("id"), 64);
  const amount = parseMoney(f.get("amount"));
  const due = str(f.get("dueDate"), 10);
  const paid = f.get("paid") === "on" || f.get("paid") === "1";
  const paidAt = str(f.get("paidAt"), 10);
  if (!id) return fail("Parcela inválida.");
  if (!amount || amount <= 0) return fail("Valor inválido.");
  if (!due || !isISODate(due)) return fail("Vencimento inválido.");
  const { error } = await db().from("installments").update({
    amount, due_date: due, note: str(f.get("note"), 200),
    paid_at: paid ? (paidAt && isISODate(paidAt) ? paidAt : todayISO()) : null,
  }).eq("id", id);
  if (error) return fail("Não consegui salvar.");
  return done(paid ? "Parcela marcada como paga" : "Parcela atualizada", id);
}

export async function setInstallmentPaid(id: string, paid: boolean): Promise<ActionResult> {
  const { error } = await db().from("installments").update({ paid_at: paid ? todayISO() : null }).eq("id", id);
  if (error) return fail("Não consegui alterar.");
  return done(paid ? "Parcela paga" : "Pagamento desfeito", id);
}

export async function addInstallments(_: ActionResult, f: FormData): Promise<ActionResult> {
  const count = parseIntLoose(f.get("count")) ?? 1;
  const amount = parseMoney(f.get("amount"));
  const first = str(f.get("firstDue"), 10);
  if (!amount || !first || !isISODate(first) || count < 1 || count > 120) return fail("Confira valor, quantidade e vencimento.");
  const sb = db();
  const vid = await vehicleId();
  const v = await sb.from("vehicles").select("purchase_price,down_payment").eq("id", vid).single();
  const { error } = await sb.rpc("create_installment_plan", {
    p_vehicle: vid, p_price: v.data?.purchase_price ?? null, p_down: v.data?.down_payment ?? 0, p_count: count,
    p_amount: amount, p_first_due: first, p_paid: 0, p_purchase_date: null,
  });
  if (error) return fail("Não consegui adicionar.");
  return done(count === 1 ? "Parcela adicionada" : `${count} parcelas adicionadas`);
}

// ---------------- agenda ----------------
const KINDS = ["parcela", "manutencao", "seguro", "ipva", "licenciamento", "oleo", "revisao", "pneus", "multa", "outros"];

export async function saveEvent(_: ActionResult, f: FormData): Promise<ActionResult> {
  const title = str(f.get("title"), 80);
  const kind = String(f.get("kind") ?? "outros");
  const dueDate = str(f.get("dueDate"), 10);
  const dueKm = parseIntLoose(f.get("dueKm")) ?? null;
  if (!title) return fail("Dê um nome ao lembrete.");
  if (!KINDS.includes(kind)) return fail("Tipo inválido.");
  if (!(dueDate && isISODate(dueDate)) && dueKm == null) return fail("Informe uma data ou um km.");
  const row = {
    title, kind, due_date: dueDate && isISODate(dueDate) ? dueDate : null, due_km: dueKm,
    repeat_months: parseIntLoose(f.get("repeatMonths")) || null, repeat_km: parseIntLoose(f.get("repeatKm")) || null,
    note: str(f.get("note"), 200),
  };
  const id = str(f.get("id"), 64);
  const sb = db();
  const { error } = id ? await sb.from("scheduled_events").update(row).eq("id", id)
    : await sb.from("scheduled_events").insert({ ...row, vehicle_id: await vehicleId() });
  if (error) return fail("Não consegui salvar.");
  return done(id ? "Lembrete atualizado" : "Lembrete criado");
}

export async function completeEvent(id: string): Promise<ActionResult> {
  const { data, error } = await db().rpc("complete_event", { p_event: id, p_km: null });
  if (error) return fail("Não consegui concluir.");
  return done(data ? "Feito! Próximo lembrete criado" : "Feito!", id);
}

export async function reopenEvent(id: string): Promise<ActionResult> {
  const { error } = await db().from("scheduled_events").update({ done_at: null }).eq("id", id);
  if (error) return fail("Não consegui reabrir.");
  return done("Lembrete reaberto", id);
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const { error } = await db().from("scheduled_events").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return fail("Não consegui excluir.");
  return done("Lembrete excluído", id);
}

// ---------------- hodômetro ----------------
export async function saveOdometer(_: ActionResult, f: FormData): Promise<ActionResult> {
  const km = parseIntLoose(f.get("km"));
  if (km == null || km > 2_000_000) return fail("Digite o km do painel.");
  const { error } = await db().from("odometer_readings").insert({ vehicle_id: await vehicleId(), read_on: todayISO(), km, source: "manual" });
  if (error) return fail("Não consegui salvar.");
  return done("Quilometragem atualizada");
}

// ---------------- perfil, veículo e preferências ----------------
export async function saveName(_: ActionResult, f: FormData): Promise<ActionResult> {
  const name = str(f.get("name"), 40);
  if (!name) return fail("Digite um nome.");
  const { error } = await db().from("app_profile").upsert({ id: 1, display_name: name, updated_at: new Date().toISOString() });
  if (error) return fail("Não consegui salvar.");
  return done("Nome salvo");
}

export async function saveVehicle(_: ActionResult, f: FormData): Promise<ActionResult> {
  const tank = parseMoney(f.get("tank"));
  const bars = parseIntLoose(f.get("bars"));
  const year = parseIntLoose(f.get("year"));
  if (tank != null && (tank <= 0 || tank > 200)) return fail("Tanque entre 1 e 200 L.");
  if (bars != null && (bars < 2 || bars > 20)) return fail("Barras do marcador entre 2 e 20.");
  if (year != null && (year < 1950 || year > 2100)) return fail("Ano inválido.");
  const pd = str(f.get("purchaseDate"), 10);
  const { error } = await db().from("vehicles").update({
    name: str(f.get("name"), 40) ?? "Meu Clio",
    hero_word: (str(f.get("heroWord"), 10) ?? "CLIO").toUpperCase(),
    make: str(f.get("make"), 40), model: str(f.get("model"), 40), plate: str(f.get("plate"), 10)?.toUpperCase() ?? null,
    year: year ?? null, initial_odometer: parseIntLoose(f.get("initialKm")) ?? null,
    purchase_date: pd && isISODate(pd) ? pd : null,
    ...(tank != null ? { tank_capacity_l: tank } : {}), ...(bars != null ? { gauge_bars: bars } : {}),
  }).eq("id", await vehicleId());
  if (error) return fail("Não consegui salvar.");
  return done("Veículo atualizado");
}

export async function savePrefs(patch: Partial<Settings>): Promise<ActionResult> {
  const sb = db();
  const { data } = await sb.from("app_settings").select("prefs").eq("id", 1).maybeSingle();
  const current = parseSettings(data?.prefs);
  const next = parseSettings({ ...current, ...patch, home: { ...current.home, ...(patch.home ?? {}) } });
  const { error } = await sb.from("app_settings").upsert({ id: 1, prefs: next, updated_at: new Date().toISOString() });
  if (error) return fail("Não consegui salvar.");
  return done("Preferência salva");
}

export async function signOutDevice() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/bem-vindo");
}
