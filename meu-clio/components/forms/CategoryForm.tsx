"use client";

import { useActionState, useState } from "react";
import { saveCategory, type ActionResult } from "@/lib/actions";
import { CATEGORY_ICONS, Icon } from "@/components/ui/Icon";
import { CatIcon } from "@/components/ui/kit";
import { SubmitButton, useActionFeedback } from "@/components/ui/client";

export const PALETTE = ["#6ef095", "#5ff0c8", "#5cd6ff", "#7aa7ff", "#8fb8ff", "#b49cff", "#ff8fd1", "#ff6b8a", "#ff5a4e",
  "#ff8a5c", "#ffb347", "#ffc35a", "#e8d66f", "#c4f25a", "#79e0a8", "#4fd1c5", "#9aa8c7", "#a9b8ae"];
export const GROUPS = [
  { value: "uso", label: "Uso" }, { value: "manutencao", label: "Manutenção" }, { value: "protecao", label: "Proteção" },
  { value: "documentacao", label: "Documentação" }, { value: "estetica", label: "Estética" },
  { value: "modificacoes", label: "Modificações" }, { value: "outros", label: "Outros" },
];

export type CategoryInitial = { id?: string; name?: string; icon?: string; color?: string; group?: string };

export function CategoryForm({ initial, onDone }: { initial?: CategoryInitial; onDone?: () => void }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveCategory, {});
  useActionFeedback(state, () => onDone?.());
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "tag");
  const [color, setColor] = useState(initial?.color ?? PALETTE[2]);
  const [group, setGroup] = useState(initial?.group ?? "outros");

  return (
    <form action={action} className="form" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="cat-preview">
        <CatIcon icon={icon} color={color} size={52} />
        <input className="inp big" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da categoria" maxLength={40} autoFocus={!initial?.id} />
      </div>
      <div className="field"><span className="lbl">Cor</span>
        <div className="swatches">
          {PALETTE.map((c) => (
            <button key={c} type="button" aria-label={`Cor ${c}`} data-on={color === c} style={{ "--c": c } as React.CSSProperties} onClick={() => setColor(c)} />
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
      </div>
      <div className="field"><span className="lbl">Ícone</span>
        <div className="icon-pick">
          {CATEGORY_ICONS.map((i) => (
            <button key={i} type="button" aria-label={i} data-on={icon === i} style={{ "--c": color } as React.CSSProperties} onClick={() => setIcon(i)}>
              <Icon name={i} size={19} />
            </button>
          ))}
        </div>
        <input type="hidden" name="icon" value={icon} />
      </div>
      <div className="field"><span className="lbl">Entra no grupo de custo</span>
        <div className="chips-scroll wrap">
          {GROUPS.map((g) => <button key={g.value} type="button" className="chip" data-on={group === g.value} onClick={() => setGroup(g.value)}>{g.label}</button>)}
        </div>
        <input type="hidden" name="group" value={group} />
      </div>
      <p className="form-err" role="alert">{state.ok === false ? state.error : ""}</p>
      <div className="form-actions"><SubmitButton pending={pending}>{initial?.id ? "Salvar categoria" : "Criar categoria"}</SubmitButton></div>
    </form>
  );
}
