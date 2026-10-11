import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { FineButton } from "@/components/Launchers";
import { Icon } from "@/components/ui/Icon";
import { Card, EmptyState, Money, PageHeader, Pill, Ring, v } from "@/components/ui/kit";
import { countdown, dateBR, daysUntil } from "@/lib/format";
import { FINE_LABEL, finePoints } from "@/lib/money";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Multas" };
export const dynamic = "force-dynamic";

const STATUS = { aberta: { l: "Aberta", t: "warn" }, recurso: { l: "Em recurso", t: "info" }, paga: { l: "Paga", t: "ok" }, cancelada: { l: "Cancelada", t: "muted" } } as const;
const SEV_COLOR = { leve: "#7aa7ff", media: "#ffc35a", grave: "#ff8a5c", gravissima: "#ff5a4e" } as const;

export default async function MultasPage() {
  const s = await getStore();
  if (!s) return null;
  const fp = finePoints(s);
  const tone = fp.pct >= 1 ? "var(--danger)" : fp.pct >= 0.75 ? "var(--warn)" : undefined;
  return (
    <>
      <PageHeader title="Multas" sub="Pontos na CNH e prazos para pagar ou recorrer." back="/mais" action={<FineButton />} />
      <Card className="rv" style={v(1)}>
        <div className="cnh">
          <Ring value={Math.min(1, fp.pct)} size={104} stroke={10} color={tone}>
            <b className="num">{fp.points}</b><span>de {fp.limit} pts</span>
          </Ring>
          <div className="cnh-t">
            <b>{fp.points === 0 ? "Nenhum ponto nos últimos 12 meses" : `${fp.points} pontos nos últimos 12 meses`}</b>
            <span>Limite de {fp.limit} pontos {fp.limit === 40 ? "(sem gravíssimas)" : fp.limit === 30 ? "(com 1 gravíssima)" : "(com 2 ou mais gravíssimas)"}.</span>
            {fp.open.length > 0 && <span>{fp.open.length} em aberto{fp.openAmount ? <> · <Money value={fp.openAmount} /></> : null}</span>}
          </div>
        </div>
        <p className="muted-s">Regra do CTB desde 2021. Conta pela data da infração. Confira sempre no app da Carteira Digital de Trânsito.</p>
      </Card>

      {s.fines.length ? (
        <ul className="ev-list" style={{ marginTop: 14 } as CSSProperties}>
          {s.fines.map((f, i) => {
            const days = f.dueDate && (f.status === "aberta" || f.status === "recurso") ? daysUntil(f.dueDate) : null;
            return (
              <li key={f.id} className="rv" data-tone={days != null && days < 0 ? "danger" : days != null && days <= s.settings.reminderDays ? "warn" : undefined} style={v(Math.min(i + 2, 10))}>
                <FineButton className="ev-main" initial={{ id: f.id, description: f.description, severity: f.severity, points: f.points, occurredOn: f.occurredOn, dueDate: f.dueDate, amount: f.amount, status: f.status, note: f.note }}>
                  <span className="ev-ic" style={{ "--c": SEV_COLOR[f.severity] } as CSSProperties}><Icon name="alert" size={18} /></span>
                  <span className="ev-t"><b>{f.description}</b>
                    <span>{FINE_LABEL[f.severity]} · {f.points} pts{f.occurredOn ? ` · ${dateBR(f.occurredOn)}` : ""} <Pill tone={STATUS[f.status].t}>{STATUS[f.status].l}</Pill></span></span>
                  <span className="ev-when" data-tone={days != null && days < 0 ? "danger" : days != null && days <= s.settings.reminderDays ? "warn" : undefined}>
                    {f.amount ? <span className="money">R$ {Math.round(f.amount).toLocaleString("pt-BR")}</span> : null}
                    {days != null && <><br />{countdown(days)}</>}
                  </span>
                </FineButton>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="rv" style={v(2)}><EmptyState icon="badge" text="Nenhuma multa. Se chegar alguma, registre a gravidade e o prazo: o app soma os pontos e avisa antes do vencimento." /></Card>
      )}
    </>
  );
}
