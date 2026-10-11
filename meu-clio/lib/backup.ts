// Backup completo (todas as tabelas, inclusive o que foi excluído) em JSON no bucket privado "backups".
// Backups nunca são apagados pelo app.
import { db } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import { APP_VERSION } from "@/lib/version";

const TABLES = [
  "app_profile", "app_settings", "vehicles", "categories", "expenses", "fuel_records", "maintenance_records", "installments",
  "scheduled_events", "odometer_readings", "fuel_level_readings", "shops", "trips", "recurring_expenses", "expense_favorites",
  "maintenance_plan", "parts", "tire_events", "car_issues", "fines", "annual_costs",
] as const;

async function readAll(table: string) {
  const sb = db();
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select("*").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function makeBackup(kind: "auto" | "manual") {
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = await readAll(t);
  const stamp = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).replace(" ", "_").replace(/:/g, "-").slice(0, 16);
  const path = `${kind}/${kind === "auto" ? todayISO() : stamp}.json`;
  const body = JSON.stringify({ app: "meu-clio", versao: APP_VERSION, criado_em: new Date().toISOString(), tabelas: tables });
  const { error } = await db().storage.from("backups").upload(path, new Blob([body], { type: "application/json" }), { contentType: "application/json", upsert: true });
  if (error) throw new Error(error.message);
  return { path, bytes: body.length, rows: Object.values(tables).reduce((a, r) => a + r.length, 0) };
}

export type BackupFile = { path: string; kind: "auto" | "manual"; name: string; size: number; createdAt: string };

export async function listBackups(): Promise<BackupFile[]> {
  const sb = db();
  const out: BackupFile[] = [];
  for (const kind of ["auto", "manual"] as const) {
    const { data } = await sb.storage.from("backups").list(kind, { limit: 200, sortBy: { column: "name", order: "desc" } });
    for (const f of data ?? []) {
      if (!f.name.endsWith(".json")) continue;
      out.push({ path: `${kind}/${f.name}`, kind, name: f.name.replace(".json", ""), size: Number((f.metadata as { size?: number } | null)?.size ?? 0), createdAt: f.created_at ?? "" });
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
