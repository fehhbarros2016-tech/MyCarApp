"use server";

// Notificações, backup e conferência da chave de acesso (para destravar sem Face ID).
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { checkAccessKey } from "@/lib/access-key";
import { makeBackup } from "@/lib/backup";
import { sendPush, pushConfigured } from "@/lib/push";
import { db } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";

const ok = (msg: string): ActionResult => ({ ok: true, msg, at: Date.now() });
const fail = (error: string): ActionResult => ({ ok: false, error, at: Date.now() });

type SubJSON = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function subscribePush(sub: SubJSON, device: string): Promise<ActionResult> {
  if (!pushConfigured()) return fail("As notificações ainda não foram configuradas no servidor.");
  const endpoint = String(sub?.endpoint ?? "");
  const p256dh = String(sub?.keys?.p256dh ?? "");
  const auth = String(sub?.keys?.auth ?? "");
  if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) return fail("Inscrição inválida.");
  const { error } = await db().from("push_subscriptions").upsert(
    { endpoint, p256dh, auth, device: device.slice(0, 80), disabled_at: null, failures: 0 }, { onConflict: "endpoint" });
  if (error) return fail("Não consegui ativar.");
  revalidatePath("/configuracoes");
  return ok("Notificações ativadas neste aparelho");
}

export async function unsubscribePush(endpoint: string): Promise<ActionResult> {
  const { error } = await db().from("push_subscriptions").update({ disabled_at: new Date().toISOString() }).eq("endpoint", endpoint);
  if (error) return fail("Não consegui desativar.");
  revalidatePath("/configuracoes");
  return ok("Notificações desativadas neste aparelho");
}

export async function testPush(endpoint: string): Promise<ActionResult> {
  const r = await sendPush([{ key: "teste", title: "Meu Clio", body: "Pronto! Os avisos do carro vão chegar assim.", url: "/" }], endpoint);
  return r.sent ? ok("Notificação de teste enviada") : fail("Não chegou. Confira se o app está na Tela de Início e as notificações permitidas.");
}

export async function backupNow(): Promise<ActionResult> {
  try {
    const r = await makeBackup("manual");
    revalidatePath("/configuracoes");
    return ok(`Backup feito: ${r.rows} registros`);
  } catch {
    return fail("Não consegui fazer o backup agora.");
  }
}

const tries = new Map<string, { n: number; until: number }>();
export async function verifyAccessKey(key: string): Promise<ActionResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const t = tries.get(ip);
  if (t && t.until > Date.now()) return fail("Muitas tentativas. Aguarde um minuto.");
  let valid = false;
  try { valid = checkAccessKey(String(key ?? "")); } catch { return fail("Chave não configurada no servidor."); }
  if (!valid) {
    const n = (t?.n ?? 0) + 1;
    tries.set(ip, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
    await new Promise((r) => setTimeout(r, 500));
    return fail("Chave incorreta.");
  }
  tries.delete(ip);
  return ok("Desbloqueado");
}
