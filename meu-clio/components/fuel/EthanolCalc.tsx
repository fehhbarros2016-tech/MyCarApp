"use client";

import { useEffect, useMemo, useState } from "react";
import { compareFuels } from "@/lib/fuel";
import { Icon } from "@/components/ui/Icon";

const num = (v: string) => { const n = Number(v.replace(/[^\d,.]/g, "").replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : 0; };
const R = (v: number, d = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const KEY = "mc_precos";

/** Etanol ou gasolina? Digite os dois preços na bomba. Usa o km/l real de cada combustível quando já existe. */
export function EthanolCalc({ kmlG, kmlE, lastG, lastE, tankL, kmMonth }: {
  kmlG: number | null; kmlE: number | null; lastG: number | null; lastE: number | null; tankL: number; kmMonth: number | null;
}) {
  const [g, setG] = useState(lastG ? R(lastG) : "");
  const [e, setE] = useState(lastE ? R(lastE) : "");
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (saved?.g) setG(saved.g); if (saved?.e) setE(saved.e); } catch { /* sem armazenamento */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ g, e })); } catch { /* ok */ } }, [g, e]);
  const c = useMemo(() => compareFuels(num(g), num(e), kmlG, kmlE), [g, e, kmlG, kmlE]);
  const perTank = c ? Math.abs(c.costKmG - c.costKmE) * Math.min(c.kmlG, c.kmlE) * tankL : 0;
  const perMonth = c && kmMonth ? Math.abs(c.costKmG - c.costKmE) * kmMonth : 0;

  return (
    <div className="eth">
      <div className="row2">
        <label className="field"><span className="lbl">Gasolina (R$/L)</span>
          <div className="inp-pre"><b>R$</b><input className="inp" inputMode="decimal" value={g} onChange={(ev) => setG(ev.target.value)} placeholder="6,29" /></div></label>
        <label className="field"><span className="lbl">Etanol (R$/L)</span>
          <div className="inp-pre"><b>R$</b><input className="inp" inputMode="decimal" value={e} onChange={(ev) => setE(ev.target.value)} placeholder="4,19" /></div></label>
      </div>
      {c ? (
        <div className="eth-res" data-best={c.best}>
          <div className="eth-win">
            <span className="eyebrow">Vale mais</span>
            <b>{c.best === "empate" ? "Tanto faz" : c.best === "etanol" ? "Etanol" : "Gasolina"}</b>
            {c.best !== "empate" && <span>{Math.round(c.savingPct * 100)}% mais barato por km</span>}
          </div>
          <div className="eth-bars">
            {(["gasolina", "etanol"] as const).map((t) => {
              const cost = t === "gasolina" ? c.costKmG : c.costKmE;
              const max = Math.max(c.costKmG, c.costKmE);
              return (
                <div key={t} className="eth-bar" data-on={c.best === t}>
                  <span>{t === "gasolina" ? "Gasolina" : "Etanol"} <small>{R(t === "gasolina" ? c.kmlG : c.kmlE, 1)} km/l</small></span>
                  <i style={{ width: `${(cost / max) * 100}%` }} />
                  <b className="num">R$ {R(cost, 3)}/km</b>
                </div>
              );
            })}
          </div>
          <p className="muted-s">
            Etanol compensa até <b>R$ {R(c.breakEvenEthanol)}</b> ({Math.round(c.ratio * 100)}% da gasolina).
            {perTank > 1 ? ` Diferença de ~R$ ${R(perTank, 0)} por tanque` : ""}{perMonth > 1 ? ` e ~R$ ${R(perMonth, 0)} por mês no seu ritmo.` : perTank > 1 ? "." : ""}
          </p>
          <p className="eth-basis"><Icon name="info" size={13} /> {c.basis === "seus dados" ? "Usando o consumo real do seu carro com cada combustível."
            : c.basis === "seus dados + 70%" ? "Usando seu consumo real e estimando o outro combustível pela regra dos 70%." : "Ainda sem consumo medido: usando a regra dos 70%."}</p>
        </div>
      ) : <p className="muted-s">Digite os dois preços para comparar.</p>}
    </div>
  );
}
