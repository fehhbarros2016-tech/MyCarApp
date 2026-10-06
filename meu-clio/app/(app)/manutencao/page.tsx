import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Manutenção" };

export default function ManutencaoPage() {
  return (
    <>
      <PageHeader title="Manutenção" sub="Serviços, peças e próximas revisões." />
      <Card className="rv" style={{ "--i": 1 } as React.CSSProperties}>
        <EmptyState icon="wrench" text="Você ainda não registrou nenhuma manutenção." />
        <p className="soon">O formulário “Adicionar manutenção” entra na próxima etapa.</p>
      </Card>
    </>
  );
}
