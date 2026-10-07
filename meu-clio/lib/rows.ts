import type { Row } from "@/components/lists/ExpenseList";
import type { CatLite } from "@/components/forms/ExpenseForm";
import type { Entry } from "@/lib/calc";
import { formatBars } from "@/lib/fuel";
import type { Store } from "@/lib/store";

export const catsLite = (s: Store): CatLite[] =>
  s.categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, icon: c.icon, color: c.color, archived: c.archived }));

const SYS: Record<string, string> = {
  motor: "Motor", cambio: "Câmbio", suspensao: "Suspensão", freios: "Freios", eletrica: "Elétrica",
  arrefecimento: "Arrefecimento", pneus: "Pneus", escapamento: "Escapamento", injecao: "Injeção", outros: "Outros",
};

export function toRows(s: Store, list: Entry[]): Row[] {
  const exp = new Map(s.expenses.map((e) => [e.id, e]));
  const inst = new Map(s.installments.map((i) => [i.id, i]));
  return list.map((e) => {
    const cat = { icon: e.cat.icon, color: e.cat.color, name: e.cat.name };
    if (e.kind === "parcela") {
      const i = inst.get(e.id)!;
      return { id: e.id, date: e.date, amount: e.amount, title: e.title, sub: "Parcela do carro", cat, kind: "parcela" as const, inst: i };
    }
    const x = exp.get(e.id)!;
    const edit = { categoryId: x.categoryId, km: x.km, vendor: x.vendor, note: x.note };
    if (x.fuel) {
      const bars = x.fuel.before != null && x.fuel.after != null ? ` · ${formatBars(x.fuel.before)}→${formatBars(x.fuel.after)} barras` : "";
      return { id: x.id, date: x.date, amount: x.amount, title: `${x.fuel.liters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L de ${x.fuel.fuelType}`,
        sub: `${x.vendor ?? "Abastecimento"}${bars}`, cat, kind: "fuel" as const, edit };
    }
    if (x.maint) {
      return { id: x.id, date: x.date, amount: x.amount, title: x.maint.service, sub: `${SYS[x.maint.system] ?? "Manutenção"}${x.vendor ? ` · ${x.vendor}` : ""}`,
        cat, kind: "maint" as const, edit,
        maint: { date: x.date, km: x.km, vendor: x.vendor, note: x.note, categoryId: x.categoryId, system: x.maint.system, service: x.maint.service,
          parts: x.maint.parts, labor: x.maint.labor, nextDate: x.maint.nextDate, nextKm: x.maint.nextKm } };
    }
    return { id: x.id, date: x.date, amount: x.amount, title: x.note || e.cat.name, sub: [e.cat.name, x.vendor, x.km ? `${x.km.toLocaleString("pt-BR")} km` : null].filter(Boolean).join(" · "),
      cat, kind: "gasto" as const, edit };
  });
}
