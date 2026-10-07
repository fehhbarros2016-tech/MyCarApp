"use client";

import { useState, useTransition } from "react";
import { savePrefs } from "@/lib/actions";
import { Icon } from "@/components/ui/Icon";

/** Olho no topo: borra todos os valores em reais (útil em público). */
export function PrivacyToggle({ hidden }: { hidden: boolean }) {
  const [on, setOn] = useState(hidden);
  const [, start] = useTransition();
  return (
    <button className="icon-btn" aria-pressed={on} aria-label={on ? "Mostrar valores" : "Ocultar valores"}
      onClick={() => {
        const v = !on;
        setOn(v);
        document.querySelector(".app")?.setAttribute("data-private", String(v));
        start(async () => { await savePrefs({ hideValues: v }); });
      }}>
      <Icon name={on ? "eyeOff" : "eye"} size={18} />
    </button>
  );
}
