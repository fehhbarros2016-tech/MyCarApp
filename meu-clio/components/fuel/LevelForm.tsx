"use client";

import { useActionState, useState } from "react";
import { saveLevel, type FormState } from "@/app/(app)/combustivel/actions";
import { formatBars, litersFromBars, type Tank } from "@/lib/fuel";
import { FuelGauge } from "./FuelGauge";
import s from "./fuel.module.css";

const L = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function LevelForm({ tank, current, lastKm }: { tank: Tank; current: number; lastKm: number | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLevel, {});
  const [bars, setBars] = useState(current);
  return (
    <form action={action} className={s.form} noValidate>
      <section className={`${s.card} rv`} style={{ "--i": 1 } as React.CSSProperties}>
        <div className={s.row}>
          <FuelGauge bars={tank.bars} value={bars} onChange={setBars} label="Nível atual do tanque" />
          <div className={s.read}>
            <div className="eyebrow">No tanque agora</div>
            <div className={s.liters}>{L(litersFromBars(bars, tank))}<small>L</small></div>
            <div className={s.bars}>{bars === 0 ? "tanque vazio" : `${formatBars(bars)} de ${tank.bars} barras`}</div>
            <div className={s.steps}>
              <button type="button" aria-label="Meia barra a menos" onClick={() => setBars(Math.max(0, bars - 0.5))}>−</button>
              <button type="button" aria-label="Meia barra a mais" onClick={() => setBars(Math.min(tank.bars, bars + 0.5))}>+</button>
            </div>
          </div>
        </div>
      </section>
      <label className={`${s.field} rv`} style={{ "--i": 2 } as React.CSSProperties}><span>Km do painel <i>· melhora a média de consumo</i></span>
        <div className={s.inp}><input data-suf name="km" id="km" inputMode="numeric" autoComplete="off"
          placeholder={lastKm != null ? lastKm.toLocaleString("pt-BR") : "0"} /><em>km</em></div></label>
      <input type="hidden" name="bars" value={bars} />
      <p className={s.error} role="alert" aria-live="polite">{state.error ?? ""}</p>
      <button className={s.submit} disabled={pending}>{pending ? "Salvando" : "Salvar nível"}</button>
    </form>
  );
}
