import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { mediaUrl } from "@/lib/media-url";
import { norm } from "@/lib/text";
import type { Vehicle } from "@/lib/store";
import { CarSilhouette } from "./CarSilhouette";
import { FitWord } from "./FitWord";

/** Topo da tela inicial: marca (fina, opcional), nome grande que se ajusta e a foto do carro. */
export function Hero({ v, showBrand }: { v: Vehicle; showBrand: boolean }) {
  const photo = mediaUrl(v.imagePath);
  const isClio = !photo && /clio/.test(norm(`${v.model ?? ""} ${v.name} ${v.heroWord}`));
  const style = photo ? v.photoStyle : "recorte";
  return (
    <Link href="/carro" className="hero rv" data-style={style} aria-label={`${v.name}: abrir ficha do carro`} style={{ "--i": 2 } as CSSProperties}>
      {showBrand && v.make && <span className="hero-brand">{v.make}</span>}
      <FitWord text={v.heroWord} />
      <div className="glow" />
      {photo ? (
        // foto enviada pelo dono (bucket privado); já chega comprimida, então <img> simples
        // eslint-disable-next-line @next/next/no-img-element
        <img className="car" src={photo} alt={v.name} decoding="async" fetchPriority="high" />
      ) : isClio ? (
        <Image className="car" src="/car/clio.webp" alt={v.name} width={880} height={504} priority sizes="(min-width: 980px) 560px, 100vw" />
      ) : <CarSilhouette />}
    </Link>
  );
}
