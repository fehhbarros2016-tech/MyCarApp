"use client";

import { useEffect, useState } from "react";
import { subscribePush, testPush, unsubscribePush } from "@/lib/actions-system";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/client";

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const deviceName = () => {
  const ua = navigator.userAgent;
  return /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : "Navegador";
};

type State = "carregando" | "sem-suporte" | "instalar" | "bloqueado" | "desligado" | "ligado";

/** Ativa as notificações NESTE aparelho (cada celular/computador ativa o seu). */
export function PushSettings({ publicKey, devices }: { publicKey: string | null; devices: number }) {
  const [state, setState] = useState<State>("carregando");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setState(ios && !standalone ? "instalar" : "sem-suporte"); return; }
      if (ios && !standalone) { setState("instalar"); return; }
      if (Notification.permission === "denied") { setState("bloqueado"); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setEndpoint(sub?.endpoint ?? null);
      setState(sub ? "ligado" : "desligado");
    })().catch(() => setState("sem-suporte"));
  }, []);

  const enable = async () => {
    if (!publicKey) { toast("O servidor ainda não tem as chaves de notificação.", { tone: "error" }); return; }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "bloqueado" : "desligado"); return; }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) });
      const r = await subscribePush(sub.toJSON() as never, deviceName());
      if (!r.ok) { await sub.unsubscribe().catch(() => {}); toast(r.error ?? "Não consegui ativar", { tone: "error" }); return; }
      setEndpoint(sub.endpoint); setState("ligado"); toast(r.msg ?? "Ativado");
    } catch {
      toast("Não consegui ativar as notificações neste aparelho.", { tone: "error" });
    } finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await unsubscribePush(sub.endpoint); await sub.unsubscribe(); }
      setEndpoint(null); setState("desligado"); toast("Notificações desligadas neste aparelho");
    } finally { setBusy(false); }
  };

  return (
    <div className="push">
      <div className="set-item">
        <span className="set-ic" style={{ "--c": state === "ligado" ? "var(--ok)" : "#ffc35a" } as React.CSSProperties}><Icon name="bell" size={17} /></span>
        <span className="set-t"><b>Notificações neste aparelho</b>
          <span>{{
            carregando: "Verificando…",
            "sem-suporte": "Este navegador não recebe notificações de sites.",
            instalar: "No iPhone: toque em Compartilhar → Adicionar à Tela de Início e abra o app pelo ícone. Depois ative aqui.",
            bloqueado: "Bloqueadas nos ajustes do aparelho. Libere em Ajustes → Notificações → Meu Clio.",
            desligado: "Avisos de vencimentos, manutenção e resumo do mês, mesmo com o app fechado.",
            ligado: `Ativadas${devices > 1 ? ` · ${devices} aparelhos recebem` : ""}. Os avisos chegam por volta das 9h.`,
          }[state]}</span></span>
        <div className="set-c">
          {state === "desligado" && <button className="btn-primary sm" disabled={busy} onClick={enable}>{busy && <span className="spin" />}Ativar</button>}
          {state === "ligado" && <button className="btn-ghost sm" disabled={busy} onClick={disable}>Desligar</button>}
        </div>
      </div>
      {state === "ligado" && endpoint && (
        <div className="set-item">
          <span className="set-ic"><Icon name="zap" size={17} /></span>
          <span className="set-t"><b>Testar</b><span>Envia uma notificação agora para este aparelho</span></span>
          <div className="set-c"><button className="btn-ghost sm" disabled={busy} onClick={async () => {
            setBusy(true); const r = await testPush(endpoint); setBusy(false);
            toast(r.ok ? r.msg ?? "Enviada" : r.error ?? "Falhou", r.ok ? undefined : { tone: "error" });
          }}>Enviar teste</button></div>
        </div>
      )}
    </div>
  );
}
