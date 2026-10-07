"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { estimateFill, litersFromBars } from "@/lib/fuel";
import { getActiveVehicle } from "@/lib/data/fuel";
import { db } from "@/lib/supabase/server";

export type FormState = { error?: string; field?: string };

const money = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const int = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/\D/g, "");
  return s ? Number(s) : undefined;
};
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

const fillSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  amount: z.number({ invalid_type_error: "Digite o valor pago." }).positive("Digite o valor pago."),
  km: z.number({ invalid_type_error: "Digite o km do painel." }).int().min(0).max(2_000_000),
  price: z.number().positive("Preço por litro inválido.").max(50).optional(),
  fuelType: z.enum(["gasolina", "etanol", "gnv", "diesel"]),
  before: z.number().min(0).multipleOf(0.5),
  after: z.number().min(0).multipleOf(0.5),
  vendor: z.string().trim().max(60).optional(),
});

export async function saveFill(_: FormState, form: FormData): Promise<FormState> {
  const v = await getActiveVehicle();
  if (!v) return { error: "Nenhum veículo encontrado." };

  const parsed = fillSchema.safeParse({
    date: String(form.get("date") || today()),
    amount: money(form.get("amount")),
    km: int(form.get("km")),
    price: money(form.get("price")),
    fuelType: form.get("fuelType") || "gasolina",
    before: Number(form.get("before")),
    after: Number(form.get("after")),
    vendor: String(form.get("vendor") ?? "") || undefined,
  });
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { error: i.message, field: String(i.path[0]) };
  }
  const d = parsed.data;
  if (d.before > v.tank.bars || d.after > v.tank.bars) return { error: "Posição do marcador inválida." };

  const est = estimateFill({ amount: d.amount, barsBefore: d.before, barsAfter: d.after, pricePerLiter: d.price }, v.tank);
  if (!est.ok) {
    const msg = { depois_menor: "O marcador “Depois” está abaixo do “Antes”.",
      nao_subiu: "O marcador não subiu. Ajuste o “Depois” ou informe o preço por litro.",
      valor_invalido: "Digite o valor pago." }[est.reason];
    return { error: msg, field: est.reason === "valor_invalido" ? "amount" : "gauge" };
  }

  const { error } = await db().rpc("save_fuel_fill", {
    p_vehicle: v.id, p_date: d.date, p_km: d.km, p_amount: d.amount,
    p_liters: Math.round(est.liters * 1000) / 1000, p_price: Math.round(est.pricePerLiter * 1000) / 1000,
    p_source: est.source, p_fuel_type: d.fuelType, p_bars_before: d.before, p_bars_after: d.after,
    p_vendor: d.vendor ?? null, p_note: null,
  });
  if (error) return { error: "Não consegui salvar. Nada foi gravado; tente de novo." };

  revalidatePath("/", "layout");
  redirect("/combustivel?salvo=1");
}

const levelSchema = z.object({
  bars: z.number().min(0).multipleOf(0.5),
  km: z.number().int().min(0).max(2_000_000).optional(),
});

export async function saveLevel(_: FormState, form: FormData): Promise<FormState> {
  const v = await getActiveVehicle();
  if (!v) return { error: "Nenhum veículo encontrado." };
  const parsed = levelSchema.safeParse({ bars: Number(form.get("bars")), km: int(form.get("km")) });
  if (!parsed.success || parsed.data.bars > v.tank.bars) return { error: "Posição do marcador inválida." };

  const sb = db();
  const date = today();
  const { error } = await sb.from("fuel_level_readings").insert({
    vehicle_id: v.id, read_on: date, km: parsed.data.km ?? null, bars: parsed.data.bars,
    liters: Math.round(litersFromBars(parsed.data.bars, v.tank) * 100) / 100, context: "manual",
  });
  if (error) return { error: "Não consegui salvar. Tente de novo." };
  if (parsed.data.km != null) {
    await sb.from("odometer_readings").insert({ vehicle_id: v.id, read_on: date, km: parsed.data.km, source: "manual" });
  }
  revalidatePath("/", "layout");
  redirect("/combustivel?salvo=1");
}
