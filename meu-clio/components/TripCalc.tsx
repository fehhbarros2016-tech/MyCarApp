"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/client";

const num = (v: string) => { const n = Number(v.replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : 0; };
const R = (v: number, d = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Calculadora de viagem: litros, custo e paradas para abastecer, com o consumo real do carro. */
export function TripCalc({ kml, price, tankL, litersNow }: { kml: number | null; price: number | null; tankL: number; litersNow: number | null }) {
  const [dist, setDist] = useState("");
  const [round, setRound] = useState(true);
  const [cons, setCons] = useState(kml ? R(kml * 1.1, 1) : "12");
  const [p, setP] = useState(price ? R(price, 2) : "");
  const [toll, setToll] = useState("");
  const r = useMemo(() => {
    const km = num(dist) * (round ? 2 : 1);
    const k = num(cons), pr = num(p);
    if (!km || !k) return null;
    const liters = km / k;
    const fuel = liters * pr;
    const tolls = num(toll) * (round ? 2 : 1);
    const usable = tankL * 0.85 * k;                    // reserva de 15%
    const start = litersNow != null ? Math.max(0, litersNow - tankL * 0.15) * k : usable;
    const stops = km <= start ? 0 : Math.ceil((km - start) / usable);
    return { km, liters, fuel, tolls, total: fuel + tolls, stops, range: usable };
  }, [dist, round, cons, p, toll, tankL, litersNow]);

  return (
    <div className="tcalc">
      <div className="row2">
        <label className="field"><span className="lbl">Distância (ida)</span>
          <div className="inp-suf"><input className="inp" inputMode="decimal" value={dist} onChange={(e) => setDist(e.target.value)} placeholder="ex.: 320" /><em>km</em></div></label>
        <label className="field"><span className="lbl">Pedágios (ida)</span>
          <div className="inp-pre"><b>R$</b><input className="inp" inputMode="decimal" value={toll} onChange={(e) => setToll(e.target.value)} placeholder="0" /></div></label>
      </div>
      <div className="row2">
        <label className="field"><span className="lbl">Consumo na estrada</span>
          <div className="inp-suf"><input className="inp" inputMode="decimal" value={cons} onChange={(e) => setCons(e.target.value)} /><em>km/l</em></div></label>
        <label className="field"><span className="lbl">Preço do litro</span>
          <div className="inp-pre"><b>R$</b><input className="inp" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} placeholder="6,29" /></div></label>
      </div>
      <div className="switch-row"><div><b>Ida e volta</b><span>Dobra distância e pedágios</span></div><Switch checked={round} onChange={setRound} label="Ida e volta" /></div>
      {r ? (
        <div className="tcalc-res">
          <div><span>Total</span><b className="money num">R$ {R(r.total)}</b><small>{R(r.km)} km</small></div>
          <div><span>Combustível</span><b className="num">{R(r.liters, 1)} L</b><small className="money">R$ {R(r.fuel)}</small></div>
          <div><span>Paradas</span><b className="num">{r.stops}</b><small>~{R(r.range)} km por tanque</small></div>
        </div>
      ) : <p className="muted-s">Digite a distância para calcular.</p>}
      <p className="muted-s"><Icon name="info" size={13} /> {kml ? `Consumo sugerido: sua média (${R(kml, 1)} km/l) + 10%, porque na estrada o carro rende mais.` : "Ajuste o consumo do seu carro na estrada."} Paradas contam com 15% de reserva{litersNow != null ? " e com o que tem no tanque agora" : ""}.</p>
    </div>
  );
}
