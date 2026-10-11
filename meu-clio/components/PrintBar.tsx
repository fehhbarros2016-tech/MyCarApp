"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export function PrintBar({ values, plate }: { values: boolean; plate: boolean }) {
  const q = (v: boolean, p: boolean) => `/relatorio-venda?${v ? "valores=1&" : ""}${p ? "placa=1" : ""}`;
  return (
    <div className="pr-bar">
      <Link href="/linha-do-tempo" className="pr-btn"><Icon name="back" size={16} /> Voltar</Link>
      <div className="pr-opts">
        <Link href={q(!values, plate)} className="pr-chip" data-on={values} replace scroll={false}>{values ? "✓ " : ""}Valores</Link>
        <Link href={q(values, !plate)} className="pr-chip" data-on={plate} replace scroll={false}>{plate ? "✓ " : ""}Placa</Link>
      </div>
      <button className="pr-btn primary" onClick={() => window.print()}><Icon name="print" size={16} /> Salvar PDF</button>
    </div>
  );
}
