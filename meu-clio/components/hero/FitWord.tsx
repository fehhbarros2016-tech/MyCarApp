"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";

/**
 * Palavra gigante atrás do carro. Começa com um tamanho estimado pelo número de letras (sem piscar)
 * e depois mede de verdade: se não couber na largura, diminui até caber. Funciona com qualquer nome.
 */
export function FitWord({ text }: { text: string }) {
  const el = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const h = el.current;
    if (!h) return;
    const fit = () => {
      h.style.fontSize = "";
      const box = h.parentElement!.clientWidth;
      const w = h.scrollWidth;
      if (w > box * 0.98) h.style.fontSize = `${(parseFloat(getComputedStyle(h).fontSize) * box * 0.96) / w}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(h.parentElement!);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [text]);
  return (
    <h1 ref={el} className="word" style={{ "--len": Math.max(3, [...text].length) } as CSSProperties} aria-label={text}>
      {text}
    </h1>
  );
}
