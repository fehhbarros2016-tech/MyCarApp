import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ActivateVehicleButton, ArchiveVehicleButton, CopyButton } from "@/components/ActionButtons";
import { AddVehicleButton, VehicleInfoButton } from "@/components/Launchers";
import { Icon } from "@/components/ui/Icon";
import { Card, Money, PageHeader, Pill, v } from "@/components/ui/kit";
import { totals } from "@/lib/calc";
import { ageLabel, dateFull, intf } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { getStore, type VehicleInfo } from "@/lib/store";

export const metadata: Metadata = { title: "Ficha do carro" };
export const dynamic = "force-dynamic";

const ROWS: { title: string; icon: string; items: { k: keyof VehicleInfo; l: string; copy?: boolean; tel?: boolean }[] }[] = [
  { title: "Documento", icon: "file", items: [{ k: "renavam", l: "Renavam", copy: true }, { k: "chassi", l: "Chassi", copy: true }, { k: "cor", l: "Cor" }, { k: "motor", l: "Motor" }, { k: "combustivel", l: "Combustível" }] },
  { title: "Pneus e óleo", icon: "tire", items: [{ k: "pneuMedida", l: "Medida do pneu", copy: true }, { k: "pressaoDianteira", l: "Calibragem dianteira" }, { k: "pressaoTraseira", l: "Calibragem traseira" }, { k: "oleo", l: "Óleo do motor", copy: true }, { k: "oleoLitros", l: "Quantidade de óleo" }] },
  { title: "Seguro e socorro", icon: "shield", items: [{ k: "seguradora", l: "Seguradora" }, { k: "apolice", l: "Apólice", copy: true }, { k: "seguroTel", l: "Telefone do seguro", tel: true }, { k: "guinchoTel", l: "Guincho / 24h", tel: true }] },
];

export default async function CarroPage() {
  const s = await getStore();
  if (!s) return null;
  const veh = s.vehicle;
  const info = veh.info;
  const t = totals(s);
  const photo = mediaUrl(veh.imagePath);
  const tow = info.guinchoTel ?? info.seguroTel;
  const filled = ROWS.flatMap((r) => r.items).filter((i) => info[i.k]).length;
  return (
    <>
      <PageHeader title="Ficha do carro" back="/mais" action={<VehicleInfoButton id={veh.id} info={info} />} />

      <Card className="car-id rv" style={v(1)}>
        <div className="car-id-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo ? <img src={photo} alt="" className="car-id-img" /> : <span className="q-ic" style={{ "--c": "var(--accent)", width: 56, height: 56 } as CSSProperties}><Icon name="car" size={28} /></span>}
          <div className="car-id-t">
            <b>{veh.name}</b>
            <span>{[veh.make, veh.model, veh.year].filter(Boolean).join(" · ") || "Complete marca e modelo em Configurações"}</span>
            {veh.plate && <span className="plate">{veh.plate}</span>}
          </div>
        </div>
        <div className="mini-stats car-id-stats">
          <div><span>Km atual</span><b className="num">{t.km.last != null ? intf(t.km.last) : "—"}</b></div>
          <div><span>Com você há</span><b>{veh.purchaseDate ? ageLabel(veh.purchaseDate) : "—"}</b></div>
          <div><span>Custo total</span><Money value={t.total} /></div>
          <div><span>Rodou</span><b className="num">{t.km.driven ? `${intf(t.km.driven)} km` : "—"}</b></div>
        </div>
        <Link href="/configuracoes?t=veiculo" className="link-btn"><Icon name="edit" size={14} /> Nome, foto, tanque e compra</Link>
      </Card>

      {tow && (
        <a href={`tel:${tow.replace(/[^\d+]/g, "")}`} className="sos rv" style={v(2)}>
          <span className="sos-ic"><Icon name="call" size={22} /></span>
          <span><b>Pedir socorro</b><span>{info.guinchoTel ? "Guincho / assistência 24h" : info.seguradora ?? "Seguro"} · {tow}</span></span>
          <Icon name="chevron" size={16} />
        </a>
      )}

      {ROWS.map((r, i) => (
        <section key={r.title} className="set-group rv" style={v(i + 3)}>
          <h2>{r.title}</h2>
          <div className="set-list">
            {r.items.map((it) => (
              <div key={it.k} className="set-item">
                <span className="set-t"><span>{it.l}</span><b className={info[it.k] ? "" : "muted"}>{info[it.k] ?? "—"}</b></span>
                {info[it.k] && it.copy && <CopyButton text={info[it.k]!} label={it.l} />}
                {info[it.k] && it.tel && <a className="icon-btn sm" href={`tel:${info[it.k]!.replace(/[^\d+]/g, "")}`} aria-label={`Ligar: ${it.l}`}><Icon name="call" size={14} /></a>}
              </div>
            ))}
          </div>
        </section>
      ))}
      {info.notas && (
        <section className="set-group rv"><h2>Anotações</h2><div className="set-list"><p className="notes">{info.notas}</p></div></section>
      )}
      {filled < 4 && <p className="foot-hint rv"><Icon name="info" size={14} /> Preencha a ficha uma vez (está no documento e no manual). Numa emergência, tudo fica a um toque.</p>}

      <section className="set-group rv">
        <h2>Garagem</h2>
        <div className="set-list">
          {s.vehicles.map((x) => (
            <div key={x.id} className="set-item">
              <span className="set-ic"><Icon name="car" size={17} /></span>
              <span className="set-t"><b>{x.name} {x.id === veh.id && <Pill tone="ok">na tela inicial</Pill>}</b><span>{[x.make, x.model, x.plate].filter(Boolean).join(" · ") || "sem detalhes"}{x.purchaseDate ? ` · desde ${dateFull(x.purchaseDate)}` : ""}</span></span>
              <div className="set-c gap">
                {x.id !== veh.id && <ActivateVehicleButton id={x.id} />}
                {s.vehicles.length > 1 && <ArchiveVehicleButton id={x.id} />}
              </div>
            </div>
          ))}
        </div>
        <div className="btn-row"><AddVehicleButton /></div>
        <p className="muted-s">Arquivar tira o veículo da garagem sem apagar nada do que foi registrado.</p>
      </section>
    </>
  );
}
