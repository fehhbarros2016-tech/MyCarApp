"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { verifyAccessKey } from "@/lib/actions-system";
import { disableLock, lockCredential, lockEnabled, verifyLock } from "@/lib/lock-client";
import { Icon } from "@/components/ui/Icon";

/**
 * Tela de bloqueio com Face ID. Aparece ao abrir o app e quando ele volta do segundo plano
 * depois do tempo escolhido nas Configurações. A chave de acesso também destrava.
 */
export function LockScreen({ initiallyLocked, lockAfterMin }: { initiallyLocked: boolean; lockAfterMin: number }) {
  const [locked, setLocked] = useState(initiallyLocked);
  const [busy, setBusy] = useState(false);
  const [useKey, setUseKey] = useState(false);
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const hiddenAt = useRef<number | null>(null);
  const tried = useRef(false);

  const unlock = useCallback(async () => {
    setBusy(true); setErr("");
    try {
      if (await verifyLock()) { setLocked(false); setUseKey(false); }
    } catch {
      setErr("Não deu certo. Tente de novo ou use a chave de acesso.");
    } finally { setBusy(false); }
  }, []);

  // cookie dizia bloqueado, mas este aparelho perdeu a credencial: libera e limpa
  useEffect(() => {
    if (initiallyLocked && !lockCredential()) { disableLock(); setLocked(false); }
  }, [initiallyLocked]);

  // tenta o Face ID sozinho na primeira vez (se o iPhone exigir um toque, o botão fica na tela)
  useEffect(() => {
    if (locked && !tried.current && lockCredential()) { tried.current = true; void unlock(); }
    if (!locked) tried.current = false;
  }, [locked, unlock]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") { hiddenAt.current = Date.now(); return; }
      if (hiddenAt.current != null && lockEnabled() && Date.now() - hiddenAt.current >= lockAfterMin * 60_000) setLocked(true);
      hiddenAt.current = null;
    };
    const onChange = () => { if (!lockEnabled()) setLocked(false); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("mc-lock-change", onChange);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("mc-lock-change", onChange); };
  }, [lockAfterMin]);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-locked", locked);
  }, [locked]);

  if (!locked) return null;
  return (
    <div className="lock" role="dialog" aria-modal="true" aria-label="App bloqueado">
      <div className="lock-card">
        <span className="lock-ic"><Icon name="lock" size={28} /></span>
        <h2>Meu Clio bloqueado</h2>
        <p>Use o Face ID para ver seus dados.</p>
        {!useKey ? (
          <>
            <button className="btn-primary" onClick={unlock} disabled={busy} autoFocus>
              {busy ? <span className="spin" aria-hidden /> : <Icon name="user" size={18} />} Desbloquear
            </button>
            <button className="link-btn" onClick={() => setUseKey(true)}>Usar a chave de acesso</button>
          </>
        ) : (
          <form className="lock-key" onSubmit={async (e) => {
            e.preventDefault(); setBusy(true); setErr("");
            const r = await verifyAccessKey(key);
            setBusy(false);
            if (r.ok) { setLocked(false); setKey(""); setUseKey(false); } else setErr(r.error ?? "Chave incorreta.");
          }}>
            <input className="inp" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Chave de acesso" autoFocus autoComplete="current-password" />
            <button className="btn-primary" disabled={busy || !key}>{busy && <span className="spin" aria-hidden />}Entrar</button>
            <button type="button" className="link-btn" onClick={() => setUseKey(false)}>Voltar para o Face ID</button>
          </form>
        )}
        <p className="lock-err" role="alert">{err}</p>
      </div>
    </div>
  );
}
