import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Gastos" };

export default function GastosPage() {
  return (
    <>
      <PageHeader title="Gastos" sub="Todos os gastos do carro, por categoria e período." />
      <Card className="rv" style={{ "--i": 1 } as React.CSSProperties}>
        <EmptyState icon="wallet" text="Você ainda não registrou nenhum gasto." />
        <p className="soon">O formulário “Adicionar gasto” entra na próxima etapa.</p>
      </Card>
    </>
  );
}
