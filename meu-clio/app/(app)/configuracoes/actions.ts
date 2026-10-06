"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/session";
import { db } from "@/lib/supabase/server";

export type NameState = { ok?: boolean; error?: string };

export async function saveName(_: NameState, form: FormData): Promise<NameState> {
  const parsed = z.string().trim().min(1, "Digite um nome.").max(40, "Use até 40 caracteres.").safeParse(form.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db().from("app_profile")
    .upsert({ id: 1, display_name: parsed.data, updated_at: new Date().toISOString() });
  if (error) return { error: "Não consegui salvar. Tente de novo." };
  revalidatePath("/", "layout");
  return { ok: true };
}

// Remove só o acesso deste aparelho. Nenhum dado é apagado.
export async function signOutDevice() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/bem-vindo");
}
