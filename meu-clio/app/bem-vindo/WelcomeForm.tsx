"use client";

import { useActionState, useState } from "react";
import { enter, type WelcomeState } from "./actions";
import s from "./welcome.module.css";

export function WelcomeForm() {
  const [state, action, pending] = useActionState<WelcomeState, FormData>(enter, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className={s.form} noValidate>
      <label className={s.field}>
        <span>Como você quer ser chamado?</span>
        <input name="name" id="name" autoComplete="given-name" placeholder="Seu nome" maxLength={40}
          aria-invalid={state.field === "name"} autoFocus />
      </label>
      <label className={s.field}>
        <span>Chave de acesso</span>
        <div className={s.keyRow}>
          <input name="key" id="key" type={show ? "text" : "password"} autoComplete="current-password"
            placeholder="••••••••" aria-invalid={state.field === "key"} />
          <button type="button" className={s.eye} onClick={() => setShow((v) => !v)}
            aria-label={show ? "Esconder chave" : "Mostrar chave"} aria-pressed={show}>
            {show ? "Esconder" : "Mostrar"}
          </button>
        </div>
      </label>
      <p className={s.error} role="alert" aria-live="polite">{state.error ?? ""}</p>
      <button className={s.submit} disabled={pending}>
        {pending ? <span className={s.spinner} aria-hidden /> : null}
        {pending ? "Conferindo" : "Entrar"}
      </button>
      <p className={s.hint}>A chave é pedida uma vez por aparelho. Depois o app abre direto.</p>
    </form>
  );
}
