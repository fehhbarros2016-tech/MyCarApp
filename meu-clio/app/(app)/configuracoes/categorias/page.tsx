import type { Metadata } from "next";
import { NewCategoryButton } from "@/components/Launchers";
import { CategoryList } from "@/components/lists/CategoryList";
import { Icon } from "@/components/ui/Icon";
import { PageHeader, v } from "@/components/ui/kit";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Categorias" };
export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const s = await getStore();
  if (!s) return null;
  const stats = new Map<string, { count: number; total: number }>();
  for (const e of s.expenses) {
    const x = stats.get(e.categoryId) ?? { count: 0, total: 0 };
    x.count++; x.total += e.amount;
    stats.set(e.categoryId, x);
  }
  const rows = s.categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, icon: c.icon, color: c.color, group: c.group,
    archived: c.archived, custom: c.custom, ...(stats.get(c.id) ?? { count: 0, total: 0 }) }));
  return (
    <>
      <PageHeader title="Categorias" sub="Toque para mudar nome, cor e ícone. Ocultar não apaga nada." back="/configuracoes?t=dados" action={<NewCategoryButton />} />
      <CategoryList rows={rows} />
      <p className="foot-hint rv" style={v(3)}><Icon name="eyeOff" size={14} /> Categorias ocultas somem da hora de lançar, mas os gastos antigos continuam nos relatórios.</p>
    </>
  );
}
