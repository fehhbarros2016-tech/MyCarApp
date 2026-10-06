"use client";

import { useEffect, useState } from "react";
import s from "./ui.module.css";

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id); }, []);
  const p = Math.max(0, Math.min(1, value));
  return (
    <div className={s.bar} data-ready={ready} role="progressbar" aria-label={label}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}
      style={{ "--p": p } as React.CSSProperties}>
      <i />
    </div>
  );
}
