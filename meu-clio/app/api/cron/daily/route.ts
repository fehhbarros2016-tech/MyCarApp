import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";
import { listBackups, makeBackup } from "@/lib/backup";
import { daysUntil, todayISO, weekdayIdx } from "@/lib/format";
import { bundle, buildNotices } from "@/lib/notify";
import { sendPush } from "@/lib/push";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Roda uma vez por dia (vercel.json). Só a Vercel chama: ela envia "Authorization: Bearer CRON_SECRET".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Não autorizado", { status: 401 });
  const out: Record<string, unknown> = {};
  const today = todayISO();

  // 1) lança gastos recorrentes (também roda ao abrir o app)
  const rec = await db().rpc("run_recurring", { p_today: today });
  out.recorrentes = rec.error ? rec.error.message : rec.data;

  // 2) notificações novas
  try {
    const s = await getStore();
    if (s) {
      const all = buildNotices(s, today);
      const keys = all.map((n) => n.key);
      const seen = new Set<string>();
      for (let i = 0; i < keys.length; i += 200) {
        const { data } = await db().from("push_log").select("key").in("key", keys.slice(i, i + 200));
        (data ?? []).forEach((r) => seen.add(r.key as string));
      }
      const fresh = all.filter((n) => !seen.has(n.key));
      const r = await sendPush(bundle(fresh));
      if (r.devices > 0 && fresh.length) {
        await db().from("push_log").upsert(fresh.map((n) => ({ key: n.key, title: n.title })), { onConflict: "key" });
      }
      out.notificacoes = { novas: fresh.length, enviadas: r.sent, aparelhos: r.devices };
    }
  } catch (e) { out.notificacoes = String(e); }

  // 3) backup semanal (domingo) ou se o último tiver mais de 7 dias
  try {
    const last = (await listBackups()).find((b) => b.kind === "auto");
    const lastDay = last?.name.slice(0, 10);
    if (weekdayIdx(today) === 0 || !lastDay || daysUntil(today, lastDay) >= 7) out.backup = await makeBackup("auto");
    else out.backup = `último em ${lastDay}`;
  } catch (e) { out.backup = String(e); }

  return NextResponse.json({ ok: true, dia: today, ...out });
}
