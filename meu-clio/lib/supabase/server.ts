// Cliente do banco SOMENTE para código de servidor (Server Components, Server Actions).
// Usa a service role; nunca importe este arquivo num componente "use client".
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function db(): SupabaseClient {
  if (typeof window !== "undefined") throw new Error("db() chamado no navegador");
  if (!isDbConfigured()) throw new Error("Banco não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  client ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
