"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import type { ActionResult } from "@/lib/actions";

// ---------------- toasts ----------------
type ToastAction = { label: string; run: () => void };
type Toast = { id: number; text: string; tone: "ok" | "error"; action?: ToastAction };
const ToastCtx = createContext<(text: string, opts?: { tone?: "ok" | "error"; action?: ToastAction }) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const show = useCallback((text: string, opts?: { tone?: "ok" | "error"; action?: ToastAction }) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-2), { id, text, tone: opts?.tone ?? "ok", action: opts?.action }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), opts?.action ? 5000 : 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="toasts" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className="toast" data-tone={t.tone} role="status">
            <Icon name={t.tone === "error" ? "alert" : "checkCircle"} size={17} />
            <span>{t.text}</span>
            {t.action && (
              <button onClick={() => { t.action!.run(); setList((l) => l.filter((x) => x.id !== t.id)); }}>{t.action.label}</button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Mostra o toast e chama onOk quando uma action de formulário termina. */
export function useActionFeedback(state: ActionResult, onOk?: (s: ActionResult) => void) {
  const toast = useToast();
  const last = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!state.at || state.at === last.current) return;
    last.current = state.at;
    if (state.ok) { if (state.msg) toast(state.msg); onOk?.(state); }
    // erros aparecem dentro do formulário
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.at]);
}

/** Executa uma action direta (sem formulário) com toast. */
export function useRun() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<ActionResult>, opts?: { undo?: () => Promise<ActionResult> }) => {
    setBusy(true);
    try {
      const r = await fn();
      if (r.ok) toast(r.msg ?? "Pronto", opts?.undo ? { action: { label: "Desfazer", run: () => { void opts.undo!().then((u) => u.ok && toast("Desfeito")); } } } : undefined);
      else toast(r.error ?? "Algo deu errado", { tone: "error" });
      return r;
    } catch {
      toast("Sem conexão. Tente de novo.", { tone: "error" });
      return { ok: false } as ActionResult;
    } finally {
      setBusy(false);
    }
  }, [toast]);
  return { run, busy };
}

// ---------------- sheet (painel que sobe de baixo) ----------------
export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    if (open) { setMounted(true); requestAnimationFrame(() => requestAnimationFrame(() => setShow(true))); }
    else if (mounted) { setShow(false); const t = setTimeout(() => setMounted(false), 280); return () => clearTimeout(t); }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className="sheet-root" data-open={show}>
      <div className="sheet-bg" onClick={onClose} />
      <div ref={panel} className="sheet" data-wide={wide} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grab"
          onPointerDown={(e) => { drag.current = { y: e.clientY, dy: 0 }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            if (!drag.current || !panel.current) return;
            drag.current.dy = Math.max(0, e.clientY - drag.current.y);
            panel.current.style.transform = `translateY(${drag.current.dy}px)`;
            panel.current.style.transition = "none";
          }}
          onPointerUp={() => {
            if (!panel.current) return;
            panel.current.style.transition = ""; panel.current.style.transform = "";
            if ((drag.current?.dy ?? 0) > 90) onClose();
            drag.current = null;
          }}>
          <i />
        </div>
        {title && (
          <div className="sheet-h">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="x" size={18} /></button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ---------------- controles ----------------
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" className="switch" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)} />
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, name }: {
  value: T; options: { value: T; label: string; hint?: string }[]; onChange?: (v: T) => void; name?: string;
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} data-on={o.value === value}
          onClick={() => onChange?.(o.value)}>
          {o.label}{o.hint && <small>{o.hint}</small>}
        </button>
      ))}
      {name && <input type="hidden" name={name} value={String(value)} />}
    </div>
  );
}

/** Botão que pede um segundo toque para confirmar (o app não usa confirm()). */
export function ConfirmButton({ onConfirm, children, className = "btn-danger", confirmText = "Toque de novo para confirmar" }: {
  onConfirm: () => void; children: ReactNode; className?: string; confirmText?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t); }, [armed]);
  return (
    <button type="button" className={className} data-armed={armed} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? confirmText : children}
    </button>
  );
}

export function SubmitButton({ pending, children, className = "btn-primary" }: { pending: boolean; children: ReactNode; className?: string }) {
  return (
    <button className={className} disabled={pending}>
      {pending && <span className="spin" aria-hidden />}
      {children}
    </button>
  );
}
