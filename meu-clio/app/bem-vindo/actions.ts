"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkAccessKey } from "@/lib/access-key";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { db, isDbConfigured } from "@/lib/supabase/server";

export type WelcomeState = { error?: string; field?: "name" | "key" };

const schema = z.object({
  name: z.string().trim().min(1, "Digite seu nome.").max(40, "Use até 40 caracteres."),
  key: z.string().min(1, "Digite a chave de acesso."),
});

// Limite simples contra tentativas repetidas (por instância do servidor).
const attempts = new Map<string, { n: number; until: number }>();

export async function enter(_: WelcomeState, form: FormData): Promise<WelcomeState> {
  const parsed = schema.safeParse({ name: form.get("name"), key: form.get("key") });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, field: issue.path[0] as "name" | "key" };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const a = attempts.get(ip);
  if (a && a.until > Date.now()) {
    const s = Math.ceil((a.until - Date.now()) / 1000);
    return { error: `Muitas tentativas. Tente de novo em ${s} s.`, field: "key" };
  }

  let valid = false;
  try { valid = checkAccessKey(parsed.data.key); }
  catch { return { error: "O servidor ainda não tem a chave configurada (ACCESS_KEY_HASH).", field: "key" }; }

  if (!valid) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(ip, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Chave incorreta. Confira maiúsculas e o ponto final, se houver.", field: "key" };
  }
  attempts.delete(ip);

  if (isDbConfigured()) {
    const name = parsed.data.name;
    const { error } = await db().from("app_profile")
      .upsert({ id: 1, display_name: name, updated_at: new Date().toISOString() });
    if (error) return { error: "Não consegui salvar seu nome no banco. Tente de novo.", field: "name" };
    // Garante um veículo (sem valores) para o app ter onde guardar os registros.
    const { count } = await db().from("vehicles").select("id", { count: "exact", head: true }).is("archived_at", null);
    if (!count) await db().from("vehicles").insert({ name: "Meu Clio", make: "Renault", model: "Clio" });
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}
