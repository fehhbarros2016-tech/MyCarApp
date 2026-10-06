import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Relatórios" };

export default function RelatoriosPage() {
  return (
    <>
      <PageHeader title="Relatórios" sub="Para onde vai o dinheiro, mês a mês." />
      <Card className="rv" style={{ "--i": 1 } as React.CSSProperties}>
        <EmptyState icon="chart" text="Os relatórios aparecem quando houver gastos registrados." />
      </Card>
    </>
  );
}
