// Utilitários só do servidor: veículo ativo e arquivos (fotos) no Storage privado.
import { randomUUID } from "node:crypto";
import { db } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Veículo que aparece no app agora (preferência activeVehicleId; senão, o primeiro). */
export async function activeVehicle(): Promise<{ id: string; tank: { capacity: number; bars: number } }> {
  const sb = db();
  const [prefs, list] = await Promise.all([
    sb.from("app_settings").select("prefs").eq("id", 1).maybeSingle(),
    sb.from("vehicles").select("id,tank_capacity_l,gauge_bars").is("archived_at", null).order("created_at"),
  ]);
  const want = (prefs.data?.prefs as Record<string, unknown> | null)?.activeVehicleId;
  const rows = list.data ?? [];
  const v = rows.find((r) => r.id === want) ?? rows[0];
  if (!v) throw new Error("Nenhum veículo encontrado.");
  return { id: v.id as string, tank: { capacity: Number(v.tank_capacity_l), bars: Number(v.gauge_bars) } };
}
export const vehicleId = async () => (await activeVehicle()).id;

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** Guarda uma imagem no bucket privado "media". Devolve o caminho (o nome é aleatório e nunca se repete). */
export async function uploadImage(file: unknown, folder: "pecas" | "veiculos"): Promise<{ path?: string; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return {};
  const ext = TYPES[file.type];
  if (!ext) return { error: "Use uma foto JPG, PNG ou WEBP." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "A foto passou de 6 MB." };
  const path = `${folder}/${randomUUID()}.${ext}`;
  const { error } = await db().storage.from("media").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (error) return { error: "Não consegui enviar a foto." };
  return { path };
}
