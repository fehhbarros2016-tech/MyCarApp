"use client";

import { useActionState, useMemo, useState } from "react";
import { saveFill, type FormState } from "@/app/(app)/combustivel/actions";
import { estimateFill, formatBars, litersFromBars, litersPerBar, type Tank } from "@/lib/fuel";
import { FuelGauge } from "./FuelGauge";
import s from "./fuel.module.css";

const parse = (v: string) => { const n = Number(v.replace(/\./g, "").replace(",", ".")); return v.trim() && Number.isFinite(n) ? n : undefined; };
const L = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const R = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function FillForm({ tank, defaultBefore, lastKm, today, defaultFuel = "gasolina" }: { tank: Tank; defaultBefore: number; lastKm: number | null; today: string; defaultFuel?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveFill, {});
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [before, setBefore] = useState(defaultBefore);
  const [after, setAfter] = useState(tank.bars);
  const [mode, setMode] = useState<"before" | "after">("after");
  const [fuel, setFuel] = useState(defaultFuel);

  const cur = mode === "after" ? after : before;
  const setCur = mode === "after" ? setAfter : setBefore;
  const est = useMemo(() => estimateFill({ amount: parse(amount) ?? 0, barsBefore: before, barsAfter: after, pricePerLiter: parse(price) }, tank),
    [amount, price, before, after, tank]);

  let note = `Com meia barra de precisão (≈ ${L(litersPerBar(tank) / 2)} L), a leitura do marcador tem margem de ± ${L(litersPerBar(tank) / 4)} L. A média de vários abastecimentos corrige isso.`;
  let alert = false;
  if (!est.ok && est.reason === "depois_menor") { note = "O “Depois” está abaixo do “Antes”. Confira as duas posições."; alert = true; }
  else if (!est.ok && est.reason === "nao_subiu") { note = "O marcador não subiu. Ajuste o “Depois” ou informe o preço por litro."; alert = true; }
  else if (est.ok && est.mismatch) { note = `O marcador indica ${L(est.gaugeLiters)} L e a bomba ${L(est.liters)} L. A diferença passa de meia barra; confira o “Antes”.`; alert = true; }
  else if (est.ok && est.source === "bomba") note = `Marcador e bomba batem (diferença de ${L(Math.abs(est.liters - est.gaugeLiters))} L).`;
  else if (est.ok && est.unusualPrice) { note = `O preço por litro estimado (${R(est.pricePerLiter)}) está fora do comum; confira as barras.`; alert = true; }

  return (
    <form action={action} className={s.form} noValidate>
      <div className={`${s.fields} rv`} style={{ "--i": 1 } as React.CSSProperties}>
        <label className={s.field}><span>Valor pago</span>
          <div className={s.inp}><b>R$</b><input data-pre name="amount" id="amount" inputMode="decimal" placeholder="0,00" autoComplete="off"
            value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={state.field === "amount"} /></div></label>
        <label className={s.field}><span>Km do painel</span>
          <div className={s.inp}><input data-suf name="km" id="km" inputMode="numeric" autoComplete="off"
            placeholder={lastKm != null ? lastKm.toLocaleString("pt-BR") : "0"} aria-invalid={state.field === "km"} /><em>km</em></div></label>
        <label className={`${s.field} ${s.full}`}><span>Preço por litro <i>· opcional, deixa a conta exata</i></span>
          <div className={s.inp}><b>R$</b><input data-pre name="price" id="price" inputMode="decimal" placeholder="ex.: 6,29" autoComplete="off"
            value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={state.field === "price"} /></div></label>
      </div>

      <section className={`${s.card} rv`} style={{ "--i": 2 } as React.CSSProperties} data-invalid={state.field === "gauge"} aria-label="Marcador de combustível">
        <div className={s.seg} role="tablist">
          <button type="button" role="tab" data-on={mode === "before"} aria-selected={mode === "before"} onClick={() => setMode("before")}>
            Antes de abastecer<small>{formatBars(before)} de {tank.bars}</small></button>
          <button type="button" role="tab" data-on={mode === "after"} aria-selected={mode === "after"} onClick={() => setMode("after")}>
            Depois<small>{formatBars(after)} de {tank.bars}</small></button>
        </div>
        <div className={s.row}>
          <FuelGauge bars={tank.bars} value={cur} onChange={setCur} base={mode === "after" ? before : undefined}
            label={mode === "after" ? "Marcador depois de abastecer" : "Marcador antes de abastecer"} />
          <div className={s.read}>
            <div className="eyebrow">{mode === "after" ? "No tanque depois" : "No tanque antes"}</div>
            <div className={s.liters}>{L(litersFromBars(cur, tank))}<small>L</small></div>
            <div className={s.bars}>{cur === 0 ? "tanque vazio" : `${formatBars(cur)} de ${tank.bars} barras · ${Math.round((cur / tank.bars) * 100)}%`}</div>
            <div className={s.hint}>{cur <= 1.5 ? <span className={s.warn}>Na reserva.</span>
              : mode === "before" ? "Onde o ponteiro estava ao chegar no posto." : "Onde o ponteiro parou depois de abastecer."}</div>
            <div className={s.steps}>
              <button type="button" aria-label="Meia barra a menos" onClick={() => setCur(Math.max(0, cur - 0.5))}>−</button>
              <button type="button" aria-label="Meia barra a mais" onClick={() => setCur(Math.min(tank.bars, cur + 0.5))}>+</button>
            </div>
          </div>
        </div>
        <div className={s.result}>
          <div><span className="eyebrow">Abastecido</span><b data-acc>{est.ok ? `${L(est.liters)} L` : "—"}</b>
            <span>{est.ok && est.source === "bomba" ? "valor ÷ preço" : "pelo marcador"}</span></div>
          <div><span className="eyebrow">No tanque</span><b>{L(litersFromBars(after, tank))} L</b><span>de {tank.capacity} L</span></div>
          <div><span className="eyebrow">Preço / L</span><b>{est.ok ? R(est.pricePerLiter) : "—"}</b>
            <span>{est.ok && est.source === "bomba" ? "informado" : "estimado"}</span></div>
        </div>
        <p className={s.note} data-alert={alert}>{note}</p>
      </section>

      <details className={`${s.more} rv`} style={{ "--i": 3 } as React.CSSProperties}>
        <summary>Data, combustível e posto</summary>
        <div className={s.fields}>
          <label className={s.field}><span>Data</span><div className={s.inp}><input type="date" name="date" id="date" defaultValue={today} max={today} /></div></label>
          <label className={s.field}><span>Posto</span><div className={s.inp}><input name="vendor" id="vendor" maxLength={60} placeholder="opcional" /></div></label>
          <div className={`${s.field} ${s.full}`}><span>Combustível</span>
            <div className={s.seg}>
              {["gasolina", "etanol"].map((f) => (
                <button key={f} type="button" data-on={fuel === f} onClick={() => setFuel(f)}>{f === "gasolina" ? "Gasolina" : "Etanol"}</button>
              ))}
            </div>
          </div>
        </div>
      </details>

      <input type="hidden" name="before" value={before} />
      <input type="hidden" name="after" value={after} />
      <input type="hidden" name="fuelType" value={fuel} />
      <p className={s.error} role="alert" aria-live="polite">{state.error ?? ""}</p>
      <button className={s.submit} disabled={pending}>{pending ? "Salvando" : "Salvar abastecimento"}</button>
    </form>
  );
}
