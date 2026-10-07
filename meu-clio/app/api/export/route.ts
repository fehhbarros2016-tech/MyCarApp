import { NextResponse, type NextRequest } from "next/server";
import { catOf } from "@/lib/calc";
import { todayISO } from "@/lib/format";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Protegido pelo middleware (exige o cookie de acesso).
export async function GET(req: NextRequest) {
  const s = await getStore();
  if (!s) return NextResponse.json({ error: "Banco não configurado" }, { status: 503 });
  const stamp = todayISO();

  if (req.nextUrl.searchParams.get("f") === "json") {
    const body = JSON.stringify({
      exportado_em: new Date().toISOString(), nome: s.name, veiculo: s.vehicle, preferencias: s.settings,
      categorias: s.categories, gastos: s.expenses, parcelas: s.installments, lembretes: s.events, leituras_tanque: s.levels, hodometro: s.odometer,
    }, null, 2);
    return new NextResponse(body, { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="meu-clio-backup-${stamp}.json"` } });
  }

  const head = ["data", "categoria", "grupo", "valor", "km", "local", "observacao", "litros", "preco_litro", "servico"];
  const lines = s.expenses.map((e) => {
    const c = catOf(s, e.categoryId);
    return [e.date, c.name, c.group, e.amount.toFixed(2).replace(".", ","), e.km ?? "", e.vendor ?? "", e.note ?? "",
      e.fuel ? e.fuel.liters.toFixed(2).replace(".", ",") : "", e.fuel ? e.fuel.price.toFixed(3).replace(".", ",") : "", e.maint?.service ?? ""].map(csvCell).join(";");
  });
  for (const i of s.installments) if (i.paidAt) lines.push([i.paidAt, `Parcela ${i.number}`, "compra", i.amount.toFixed(2).replace(".", ","), "", "", i.note ?? "", "", "", ""].map(csvCell).join(";"));
  const csv = "﻿" + [head.join(";"), ...lines].join("\n");
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="meu-clio-gastos-${stamp}.csv"` } });
}
