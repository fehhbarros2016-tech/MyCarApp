import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Parcelas" };

export default function ParcelasPage() {
  return (
    <>
      <PageHeader title="Parcelas" sub="Compra do carro: entrada, parcelas pagas e restantes." />
      <Card className="rv" style={{ "--i": 1 } as React.CSSProperties}>
        <EmptyState icon="receipt" text="Você ainda não cadastrou a compra do carro." />
        <p className="soon">O formulário “Cadastrar compra” entra na próxima etapa.</p>
      </Card>
    </>
  );
}
