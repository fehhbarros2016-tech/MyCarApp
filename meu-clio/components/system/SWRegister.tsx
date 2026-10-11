"use client";

import { useEffect } from "react";

/** Registra o service worker (necessário para as notificações). Não guarda páginas em cache. */
export function SWRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const t = setTimeout(() => { navigator.serviceWorker.register("/sw.js").catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
