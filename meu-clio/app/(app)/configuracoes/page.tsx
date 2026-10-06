import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { APP_ENV } from "@/lib/env";
import { db, isDbConfigured } from "@/lib/supabase/server";
import { signOutDevice } from "./actions";
import { NameForm } from "./NameForm";
import s from "./settings.module.css";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const name = isDbConfigured()
    ? ((await db().from("app_profile").select("display_name").eq("id", 1).maybeSingle()).data?.display_name ?? "")
    : "";

  return (
    <div className={s.page}>
      <PageHeader title="Configurações" sub="Nada aqui apaga seus registros." />

      <section className={`${s.group} rv`} style={{ "--i": 1 } as React.CSSProperties}>
        <h2>Você</h2>
        <div className={s.list}>
          <div className={`${s.item} ${s.stack}`}>
            <span className={s.ic}><Icon name="home" size={17} /></span>
            <span className={s.tx}><b>Seu nome</b><span>Usado nas mensagens do app</span></span>
            <NameForm current={name} />
          </div>
        </div>
      </section>

      <section className={`${s.group} rv`} style={{ "--i": 2 } as React.CSSProperties}>
        <h2>Este aparelho</h2>
        <div className={s.list}>
          <form action={signOutDevice}>
            <button className={s.item}>
              <span className={`${s.ic} ${s.n}`}><Icon name="eye" size={17} /></span>
              <span className={s.tx}><b>Sair deste aparelho</b><span>A chave de acesso será pedida de novo aqui</span></span>
              <Icon name="chevron" size={14} className={s.chev} />
            </button>
          </form>
          <div className={s.item}>
            <span className={`${s.ic} ${s.n}`}><Icon name="gear" size={17} /></span>
            <span className={s.tx}><b>Ambiente</b><span>Produção não aceita dados de exemplo</span></span>
            <span className={s.mono}>{APP_ENV}</span>
          </div>
        </div>
      </section>

      <p className={`soon rv`} style={{ "--i": 3 } as React.CSSProperties}>
        Aparência, unidades, lembretes, exportação e opções avançadas entram na próxima etapa, como no protótipo.
      </p>
    </div>
  );
}
