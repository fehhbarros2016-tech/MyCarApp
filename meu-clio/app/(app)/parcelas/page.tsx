import type { Metadata } from "next";
import { AddInstallmentsButton, PlanButton } from "@/components/Launchers";
import { InstallmentList } from "@/components/lists/InstallmentList";
import { PayNextButton } from "@/components/PayNext";
import { Icon } from "@/components/ui/Icon";
import { Bar, Card, EmptyState, Money, PageHeader, Pill, Ring, v } from "@/components/ui/kit";
import { installmentsSummary } from "@/lib/calc";
import { addMonths, countdown, dateFull, daysUntil, monthLong } from "@/lib/format";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Parcelas" };
export const dynamic = "force-dynamic";

export default async function ParcelasPage() {
  const s = await getStore();
  if (!s) return null;
  const i = installmentsSummary(s);

  if (!i.total) {
    return (
      <>
        <PageHeader title="Parcelas" sub="Compra do carro: entrada, parcelas pagas e quanto falta." back="/mais" />
        <Card className="rv" style={v(1)}>
          <EmptyState icon="receipt" text="Cadastre o valor do carro, a entrada e as parcelas. O app gera todas as datas e acompanha o que falta.">
            <PlanButton />
          </EmptyState>
        </Card>
      </>
    );
  }

  const last = s.installments[s.installments.length - 1];
  const nextDays = i.next ? daysUntil(i.next.dueDate) : null;
  return (
    <>
      <PageHeader title="Parcelas" back="/mais" sub={i.lastDue ? `Quitação prevista em ${monthLong(i.lastDue.slice(0, 7))}` : undefined} />

      <Card className="plan-hero rv" style={v(1)}>
        <div className="plan-top">
          <Ring value={i.pct} size={112} stroke={10}>
            <b className="num">{Math.round(i.pct * 100)}%</b><span>quitado</span>
          </Ring>
          <div className="plan-nums">
            <div><span className="eyebrow">Pagas</span><b className="num">{i.paid}<em> / {i.total}</em></b></div>
            <div><span className="eyebrow">Já pago</span><Money value={i.down + i.paidAmount} /></div>
            <div><span className="eyebrow">Falta</span><Money value={i.remainingAmount} /></div>
          </div>
        </div>
        <Bar value={i.pct} />
        <div className="plan-meta">
          {i.price != null && <span>Carro <Money value={i.price} /></span>}
          {i.down > 0 && <span>Entrada <Money value={i.down} /></span>}
          <span>{i.remaining} restantes</span>
        </div>
      </Card>

      {i.overdue.length > 0 && (
        <div className="alert rv" data-tone="danger" style={v(2)}>
          <span className="alert-ic"><Icon name="alert" size={17} /></span>
          <span className="alert-t"><b>{i.overdue.length === 1 ? `Parcela ${i.overdue[0].number} atrasada` : `${i.overdue.length} parcelas atrasadas`}</b>
            <span>Toque no círculo da parcela para marcar como paga</span></span>
        </div>
      )}

      {i.next && (
        <Card title="Próxima parcela" className="rv" style={v(3)}>
          <div className="next-inst">
            <div>
              <b className="num">Parcela {i.next.number}</b>
              <span>{dateFull(i.next.dueDate)} · <Pill tone={nextDays! < 0 ? "danger" : nextDays! <= s.settings.reminderDays ? "warn" : "ok"}>{countdown(nextDays!)}</Pill></span>
            </div>
            <Money value={i.next.amount} className="next-inst-v" />
          </div>
          <PayNextButton id={i.next.id} number={i.next.number} />
        </Card>
      )}

      <div className="section-h rv" style={v(4)}>
        <h2>Todas as parcelas</h2>
        <AddInstallmentsButton defaultAmount={last?.amount ?? 0} nextDue={last ? `${addMonths(last.dueDate.slice(0, 7), 1)}-${String(Math.min(28, Number(last.dueDate.slice(8, 10)))).padStart(2, "0")}` : ""} />
      </div>
      <InstallmentList items={s.installments} />
    </>
  );
}
