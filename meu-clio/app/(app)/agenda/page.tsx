import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return (
    <>
      <PageHeader title="Agenda" sub="Vencimentos e lembretes por data ou km." />
      <Card className="rv" style={{ "--i": 1 } as React.CSSProperties}>
        <EmptyState icon="calendar" text="Nenhum evento agendado." />
        <p className="soon">O formulário “Criar lembrete” entra na próxima etapa.</p>
      </Card>
    </>
  );
}
