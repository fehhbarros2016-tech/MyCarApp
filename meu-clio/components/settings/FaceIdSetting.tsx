"use client";

import { useEffect, useState } from "react";
import { disableLock, enableLock, lockEnabled, lockSupported, verifyLock } from "@/lib/lock-client";
import { Icon } from "@/components/ui/Icon";
import { Switch, useToast } from "@/components/ui/client";

/** Liga/desliga o bloqueio com Face ID neste aparelho. Para desligar, pede o Face ID antes. */
export function FaceIdSetting({ name }: { name: string }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => { void lockSupported().then(setSupported); setOn(lockEnabled()); }, []);

  const toggle = async (v: boolean) => {
    setBusy(true);
    try {
      if (v) { await enableLock(name); setOn(true); toast("Face ID ativado neste aparelho"); }
      else {
        if (await verifyLock()) { disableLock(); setOn(false); toast("Bloqueio desligado"); }
      }
    } catch {
      toast(v ? "Não consegui ativar. Confira se o Face ID está configurado no aparelho." : "Não confirmou o Face ID.", { tone: "error" });
    } finally { setBusy(false); }
  };

  return (
    <div className="set-item">
      <span className="set-ic" style={{ "--c": "#7aa7ff" } as React.CSSProperties}><Icon name="faceid" size={17} /></span>
      <span className="set-t"><b>Bloquear com Face ID</b>
        <span>{supported === false ? "Este aparelho não tem Face ID/Touch ID disponível para sites." : "Pede o Face ID ao abrir o app. A chave de acesso também destrava."}</span></span>
      <div className="set-c"><Switch checked={on} onChange={toggle} label="Bloquear com Face ID" disabled={busy || supported === false} /></div>
    </div>
  );
}
