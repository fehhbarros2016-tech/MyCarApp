// Envio de notificações (Web Push com chaves VAPID). Só no servidor.
import webpush from "web-push";
import { db } from "@/lib/supabase/server";
import type { Notice } from "@/lib/notify";

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;
export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let ready = false;
function setup() {
  if (ready) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://mycarapp3.vercel.app", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string; failures: number };

/** Envia para todos os aparelhos (ou só um endpoint). Aparelhos que a Apple/Google dizem que sumiram são desativados. */
export async function sendPush(notices: Pick<Notice, "title" | "body" | "url" | "key">[], onlyEndpoint?: string) {
  if (!pushConfigured() || !notices.length) return { sent: 0, devices: 0 };
  setup();
  const sb = db();
  let q = sb.from("push_subscriptions").select("id,endpoint,p256dh,auth,failures").is("disabled_at", null);
  if (onlyEndpoint) q = q.eq("endpoint", onlyEndpoint);
  const { data } = await q;
  const subs = (data ?? []) as Sub[];
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    let okAny = false;
    for (const n of notices) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: n.title, body: n.body, url: n.url, tag: n.key.slice(0, 60) }), { TTL: 60 * 60 * 20, urgency: "normal" });
        sent++; okAny = true;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) { await sb.from("push_subscriptions").update({ disabled_at: new Date().toISOString() }).eq("id", s.id); return; }
        await sb.from("push_subscriptions").update({ failures: s.failures + 1 }).eq("id", s.id);
      }
    }
    if (okAny) await sb.from("push_subscriptions").update({ last_success_at: new Date().toISOString(), failures: 0 }).eq("id", s.id);
  }));
  return { sent, devices: subs.length };
}
