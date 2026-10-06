"use client";

import { useActionState } from "react";
import { saveName, type NameState } from "./actions";
import s from "./settings.module.css";

export function NameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<NameState, FormData>(saveName, {});
  return (
    <form action={action} className={s.inline}>
      <input id="display-name" name="name" defaultValue={current} maxLength={40} aria-label="Seu nome" />
      <button disabled={pending}>{pending ? "Salvando" : state.ok ? "Salvo" : "Salvar"}</button>
      {state.error && <p role="alert" className={s.err}>{state.error}</p>}
    </form>
  );
}
