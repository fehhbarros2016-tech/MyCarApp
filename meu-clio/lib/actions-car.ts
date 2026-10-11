"use server";

// Ações do carro: garagem, ficha, plano de revisão, peças, pneus, problemas e oficinas.
// Excluir é sempre lógico (deleted_at) e pode ser desfeito.
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/server";
import { isISODate, parseIntLoose, parseMoney, todayISO } from "@/lib/format";
import { PLAN_TEMPLATE } from "@/lib/plan";
import { isUuid, uploadImage, vehicleId } from "@/lib/server-utils";
import { parseSettings } from "@/lib/settings";
import type { ActionResult } from "@/lib/actions";

const done = (msg: string, id?: string): ActionResult => { revalidatePath("/", "layout"); return { ok: true, msg, id, at: Date.now() }; };
const fail = (error: string): ActionResult => ({ ok: false, error, at: Date.now() });
const str = (v: FormDataEntryValue | null, max = 200) => { const s = String(v ?? "").trim().slice(0, max); return s || null; };
const uuid = (v: FormDataEntryValue | null) => (isUuid(String(v ?? "")) ? String(v) : null);
const date = (v: FormDataEntryValue | null) => { const s = str(v, 10); return s && isISODate(s) ? s : null; };
const SYSTEMS = ["motor", "cambio", "suspensao", "freios", "eletrica", "arrefecimento", "pneus", "escapamento", "injecao", "outros"];
const now = () => new Date().toISOString();

async function softDelete(table: string, id: string, label: string): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Registro inválido.");
  const { error } = await db().from(table).update({ deleted_at: now() }).eq("id", id);
  if (error) return fail("Não consegui excluir.");
  return done(label, id);
}
async function restore(table: string, id: string): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Registro inválido.");
  const { error } = await db().from(table).update({ deleted_at: null }).eq("id", id);
  if (error) return fail("Não consegui desfazer.");
  return done("Restaurado", id);
}

// ---------------- garagem ----------------
export async function addVehicle(_: ActionResult, f: FormData): Promise<ActionResult> {
  const name = str(f.get("name"), 40);
  if (!name) return fail("Dê um nome ao veículo.");
  const model = str(f.get("model"), 40);
  const word = (str(f.get("heroWord"), 24) ?? model ?? name).toUpperCase().slice(0, 24);
  const tank = parseMoney(f.get("tank"));
  const bars = parseIntLoose(f.get("bars"));
  const sb = db();
  const { data, error } = await sb.from("vehicles").insert({
    name, make: str(f.get("make"), 40), model, hero_word: word,
    ...(tank && tank > 0 && tank <= 200 ? { tank_capacity_l: tank } : {}),
    ...(bars && bars >= 2 && bars <= 20 ? { gauge_bars: bars } : {}),
  }).select("id").single();
  if (error) return fail("Não consegui criar o veículo.");
  if (f.get("activate") === "1") await setActiveVehicle(data.id);
  return done("Veículo adicionado", data.id);
}

export async function setActiveVehicle(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Veículo inválido.");
  const sb = db();
  const v = await sb.from("vehicles").select("id").eq("id", id).is("archived_at", null).maybeSingle();
  if (!v.data) return fail("Veículo não encontrado.");
  const { data } = await sb.from("app_settings").select("prefs").eq("id", 1).maybeSingle();
  const next = parseSettings({ ...parseSettings(data?.prefs), activeVehicleId: id });
  const { error } = await sb.from("app_settings").upsert({ id: 1, prefs: next, updated_at: now() });
  if (error) return fail("Não consegui trocar.");
  return done("Veículo trocado", id);
}

/** Arquivar não apaga nada: o veículo some da garagem, mas todos os registros continuam no banco. */
export async function archiveVehicle(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Veículo inválido.");
  const sb = db();
  const { count } = await sb.from("vehicles").select("id", { count: "exact", head: true }).is("archived_at", null);
  if ((count ?? 0) <= 1) return fail("É preciso ter pelo menos um veículo.");
  const { error } = await sb.from("vehicles").update({ archived_at: now() }).eq("id", id);
  if (error) return fail("Não consegui arquivar.");
  const active = await vehicleId();
  return done(active === id ? "Veículo arquivado" : "Veículo arquivado", id);
}

const INFO_KEYS = ["chassi", "renavam", "cor", "motor", "combustivel", "pneuMedida", "pressaoDianteira", "pressaoTraseira",
  "oleo", "oleoLitros", "seguradora", "apolice", "seguroTel", "guinchoTel", "notas"] as const;

export async function saveVehicleInfo(_: ActionResult, f: FormData): Promise<ActionResult> {
  const id = uuid(f.get("id")) ?? (await vehicleId());
  const info: Record<string, string> = {};
  for (const k of INFO_KEYS) { const v = str(f.get(k), k === "notas" ? 600 : 80); if (v) info[k] = v; }
  const { error } = await db().from("vehicles").update({ info }).eq("id", id);
  if (error) return fail("Não consegui salvar a ficha.");
  return done("Ficha salva", id);
}

// ---------------- oficinas ----------------
export async function saveShop(_: ActionResult, f: FormData): Promise<ActionResult> {
  const name = str(f.get("name"), 80);
  if (!name) return fail("Digite o nome.");
  const kind = ["oficina", "posto", "loja", "outro"].includes(String(f.get("kind"))) ? String(f.get("kind")) : "oficina";
  const row = { name, kind, phone: str(f.get("phone"), 30), address: str(f.get("address"), 160), note: str(f.get("note"), 280) };
  const id = uuid(f.get("id"));
  const sb = db();
  if (id) {
    const { error } = await sb.from("shops").update(row).eq("id", id);
    if (error) return fail("Não consegui salvar.");
    return done("Oficina atualizada", id);
  }
  const dup = await sb.from("shops").select("id").ilike("name", name).is("deleted_at", null).limit(1);
  if (dup.data?.[0]) return { ok: true, msg: "Já estava na lista", id: dup.data[0].id, at: Date.now() };
  const { data, error } = await sb.from("shops").insert(row).select("id").single();
  if (error) return fail("Não consegui salvar.");
  return done("Oficina adicionada", data.id);
}
/** Criação rápida (de dentro de outro formulário). Devolve o id para já deixar selecionada. */
export async function quickShop(name: string, kind = "oficina"): Promise<ActionResult> {
  const fd = new FormData();
  fd.set("name", name); fd.set("kind", kind);
  return saveShop({}, fd);
}
export async function deleteShop(id: string) { return softDelete("shops", id, "Oficina removida"); }
export async function restoreShop(id: string) { return restore("shops", id); }

// ---------------- plano de revisão ----------------
export async function savePlanItem(_: ActionResult, f: FormData): Promise<ActionResult> {
  const name = str(f.get("name"), 80);
  const intervalKm = parseIntLoose(f.get("intervalKm")) || null;
  const intervalMonths = parseIntLoose(f.get("intervalMonths")) || null;
  const system = SYSTEMS.includes(String(f.get("system"))) ? String(f.get("system")) : "outros";
  if (!name) return fail("Dê um nome ao item.");
  if (!intervalKm && !intervalMonths) return fail("Informe a cada quantos km ou meses.");
  if (intervalKm && (intervalKm < 500 || intervalKm > 300000)) return fail("Intervalo em km entre 500 e 300.000.");
  if (intervalMonths && intervalMonths > 120) return fail("Intervalo em meses até 120.");
  const lastKm = parseIntLoose(f.get("lastKm"));
  const row = {
    name, system, interval_km: intervalKm, interval_months: intervalMonths,
    last_km: lastKm ?? null, last_date: date(f.get("lastDate")), note: str(f.get("note"), 280),
    keyword: str(f.get("keyword"), 40), category_slug: str(f.get("categorySlug"), 40),
  };
  const id = uuid(f.get("id"));
  const sb = db();
  if (id) {
    const { error } = await sb.from("maintenance_plan").update(row).eq("id", id);
    if (error) return fail("Não consegui salvar.");
    return done("Item atualizado", id);
  }
  const { data, error } = await sb.from("maintenance_plan").insert({ ...row, vehicle_id: await vehicleId(), sort: 100 }).select("id").single();
  if (error) return fail("Não consegui salvar.");
  return done("Item adicionado ao plano", data.id);
}

/** Cria o plano sugerido (só os itens que ainda não existem). */
export async function applyPlanTemplate(): Promise<ActionResult> {
  const sb = db();
  const vid = await vehicleId();
  const { data: existing } = await sb.from("maintenance_plan").select("name").eq("vehicle_id", vid).is("deleted_at", null);
  const have = new Set((existing ?? []).map((r) => String(r.name).toLowerCase()));
  const rows = PLAN_TEMPLATE.filter((t) => !have.has(t.name.toLowerCase())).map((t, i) => ({
    vehicle_id: vid, name: t.name, system: t.system, interval_km: t.km ?? null, interval_months: t.months ?? null,
    category_slug: t.slug ?? null, keyword: t.keyword ?? null, note: t.note ?? null, sort: i,
  }));
  if (!rows.length) return { ok: true, msg: "O plano já está completo", at: Date.now() };
  const { error } = await sb.from("maintenance_plan").insert(rows);
  if (error) return fail("Não consegui criar o plano.");
  return done(`${rows.length} itens adicionados`);
}

/** "Já fiz": marca a última vez sem lançar gasto (útil para o que foi feito antes de usar o app). */
export async function markPlanDone(id: string, km: number | null, when: string): Promise<ActionResult> {
  if (!isUuid(id) || !isISODate(when)) return fail("Dados inválidos.");
  const { error } = await db().from("maintenance_plan").update({ last_date: when, last_km: km }).eq("id", id);
  if (error) return fail("Não consegui salvar.");
  return done("Registrado", id);
}
export async function deletePlanItem(id: string) { return softDelete("maintenance_plan", id, "Item removido do plano"); }
export async function restorePlanItem(id: string) { return restore("maintenance_plan", id); }

// ---------------- peças ----------------
export async function savePart(_: ActionResult, f: FormData): Promise<ActionResult> {
  const name = str(f.get("name"), 80);
  const installedOn = date(f.get("installedOn")) ?? todayISO();
  if (!name) return fail("Diga qual é a peça.");
  if (installedOn > todayISO()) return fail("A data não pode ser no futuro.");
  const price = parseMoney(f.get("price")) ?? null;
  const photo = await uploadImage(f.get("photo"), "pecas");
  if (photo.error) return fail(photo.error);
  const system = SYSTEMS.includes(String(f.get("system"))) ? String(f.get("system")) : "outros";
  const row = {
    name, brand: str(f.get("brand"), 60), system, price, installed_on: installedOn,
    installed_km: parseIntLoose(f.get("installedKm")) ?? null,
    life_km: parseIntLoose(f.get("lifeKm")) || null, life_months: parseIntLoose(f.get("lifeMonths")) || null,
    note: str(f.get("note"), 280), shop_id: uuid(f.get("shop")),
    ...(photo.path ? { image_path: photo.path } : f.get("removePhoto") === "1" ? { image_path: null } : {}),
  };
  const id = uuid(f.get("id"));
  const sb = db();
  if (id) {
    const { error } = await sb.from("parts").update(row).eq("id", id);
    if (error) return fail("Não consegui salvar.");
    return done("Peça atualizada", id);
  }
  const vid = await vehicleId();
  let expenseId: string | null = null;
  if (f.get("asExpense") === "1" && price && price > 0) {
    const cat = await sb.from("categories").select("id").eq("slug", "pecas").maybeSingle();
    const shopName = row.shop_id ? (await sb.from("shops").select("name").eq("id", row.shop_id).maybeSingle()).data?.name ?? null : null;
    const e = await sb.from("expenses").insert({
      vehicle_id: vid, category_id: cat.data?.id, occurred_on: installedOn, amount: price, odometer: row.installed_km,
      note: name, vendor: shopName, shop_id: row.shop_id,
    }).select("id").single();
    if (e.error) return fail("Não consegui lançar o gasto da peça.");
    expenseId = e.data.id;
  }
  const { data, error } = await sb.from("parts").insert({ ...row, vehicle_id: vid, expense_id: expenseId }).select("id").single();
  if (error) return fail("Não consegui salvar a peça.");
  const replaces = uuid(f.get("replaces"));
  if (replaces) await sb.from("parts").update({ replaced_on: installedOn, replaced_by: data.id }).eq("id", replaces).is("replaced_on", null);
  return done(replaces ? "Peça trocada. A anterior foi para o histórico" : expenseId ? "Peça salva e gasto lançado" : "Peça salva", data.id);
}
export async function deletePart(id: string) { return softDelete("parts", id, "Peça removida"); }
export async function restorePart(id: string) { return restore("parts", id); }

// ---------------- pneus ----------------
const pressure = (v: FormDataEntryValue | null) => { const n = parseMoney(v); return n && n >= 10 && n <= 80 ? n : null; };

export async function saveTireEvent(_: ActionResult, f: FormData): Promise<ActionResult> {
  const kind = String(f.get("kind"));
  if (!["troca", "rodizio", "calibragem", "reparo"].includes(kind)) return fail("Tipo inválido.");
  const doneOn = date(f.get("date")) ?? todayISO();
  if (doneOn > todayISO()) return fail("A data não pode ser no futuro.");
  const km = parseIntLoose(f.get("km")) ?? null;
  const cost = parseMoney(f.get("cost")) ?? null;
  const shop = uuid(f.get("shop"));
  const row = {
    kind, done_on: doneOn, km, pressure_front: pressure(f.get("front")), pressure_rear: pressure(f.get("rear")),
    positions: str(f.get("positions"), 60), brand: str(f.get("brand"), 60), size: str(f.get("size"), 30), cost,
    shop_id: shop, note: str(f.get("note"), 280),
  };
  const id = uuid(f.get("id"));
  const sb = db();
  if (id) {
    const { error } = await sb.from("tire_events").update(row).eq("id", id);
    if (error) return fail("Não consegui salvar.");
    return done("Atualizado", id);
  }
  const vid = await vehicleId();
  let expenseId: string | null = null;
  if (cost && cost > 0 && f.get("asExpense") !== "0") {
    const slug = kind === "rodizio" ? "alinhamento" : "pneus";
    const cat = await sb.from("categories").select("id").eq("slug", slug).maybeSingle();
    const shopName = shop ? (await sb.from("shops").select("name").eq("id", shop).maybeSingle()).data?.name ?? null : null;
    const label = { troca: "Troca de pneus", rodizio: "Rodízio de pneus", calibragem: "Calibragem", reparo: "Reparo de pneu" }[kind];
    const e = await sb.from("expenses").insert({ vehicle_id: vid, category_id: cat.data?.id, occurred_on: doneOn, amount: cost, odometer: km,
      note: label, vendor: shopName, shop_id: shop }).select("id").single();
    if (!e.error) expenseId = e.data.id;
  }
  const { data, error } = await sb.from("tire_events").insert({ ...row, vehicle_id: vid, expense_id: expenseId }).select("id").single();
  if (error) return fail("Não consegui salvar.");
  if (km != null) await sb.from("odometer_readings").insert({ vehicle_id: vid, read_on: doneOn, km, source: "manual", note: "pneus" });
  return done(kind === "calibragem" ? "Calibragem registrada" : kind === "rodizio" ? "Rodízio registrado" : kind === "troca" ? "Troca de pneus registrada" : "Reparo registrado", data.id);
}
/** "Calibrei hoje" com um toque. */
export async function quickCalibration(front: number | null, rear: number | null): Promise<ActionResult> {
  const fd = new FormData();
  fd.set("kind", "calibragem"); fd.set("date", todayISO());
  if (front) fd.set("front", String(front).replace(".", ","));
  if (rear) fd.set("rear", String(rear).replace(".", ","));
  return saveTireEvent({}, fd);
}
export async function deleteTireEvent(id: string) { return softDelete("tire_events", id, "Registro removido"); }
export async function restoreTireEvent(id: string) { return restore("tire_events", id); }

// ---------------- problemas ----------------
export async function saveIssue(_: ActionResult, f: FormData): Promise<ActionResult> {
  const title = str(f.get("title"), 100);
  if (!title) return fail("Descreva o problema em poucas palavras.");
  const severity = ["baixa", "media", "alta"].includes(String(f.get("severity"))) ? String(f.get("severity")) : "media";
  const noticed = date(f.get("noticedOn")) ?? todayISO();
  const row = {
    title, severity, noticed_on: noticed, description: str(f.get("description"), 1000),
    km: parseIntLoose(f.get("km")) ?? null,
  };
  const id = uuid(f.get("id"));
  const sb = db();
  if (id) {
    const { error } = await sb.from("car_issues").update(row).eq("id", id);
    if (error) return fail("Não consegui salvar.");
    return done("Problema atualizado", id);
  }
  const { data, error } = await sb.from("car_issues").insert({ ...row, vehicle_id: await vehicleId() }).select("id").single();
  if (error) return fail("Não consegui salvar.");
  return done("Problema anotado", data.id);
}
export async function resolveIssue(_: ActionResult, f: FormData): Promise<ActionResult> {
  const id = uuid(f.get("id"));
  if (!id) return fail("Problema inválido.");
  const { error } = await db().from("car_issues").update({
    resolved_on: date(f.get("resolvedOn")) ?? todayISO(), resolution: str(f.get("resolution"), 600), shop_id: uuid(f.get("shop")),
  }).eq("id", id);
  if (error) return fail("Não consegui salvar.");
  return done("Marcado como resolvido", id);
}
export async function reopenIssue(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Problema inválido.");
  const { error } = await db().from("car_issues").update({ resolved_on: null }).eq("id", id);
  if (error) return fail("Não consegui reabrir.");
  return done("Problema reaberto", id);
}
export async function deleteIssue(id: string) { return softDelete("car_issues", id, "Problema removido"); }
export async function restoreIssue(id: string) { return restore("car_issues", id); }

/** Só a palavra grande atrás do carro (tela inicial). */
export async function setHeroWord(id: string, word: string): Promise<ActionResult> {
  const w = String(word ?? "").trim().toUpperCase().slice(0, 24);
  if (!isUuid(id)) return fail("Veículo inválido.");
  if (!w) return fail("Digite um nome.");
  const { error } = await db().from("vehicles").update({ hero_word: w }).eq("id", id);
  if (error) return fail("Não consegui salvar.");
  return done("Nome atualizado", id);
}
