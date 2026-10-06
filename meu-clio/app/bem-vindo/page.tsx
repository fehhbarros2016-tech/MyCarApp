import Image from "next/image";
import type { Metadata } from "next";
import { WelcomeForm } from "./WelcomeForm";
import s from "./welcome.module.css";

export const metadata: Metadata = { title: "Bem-vindo" };

export default function WelcomePage() {
  return (
    <main className={s.wrap}>
      <div className={s.hero}>
        <h1 className={s.word} aria-label="Clio">CLIO</h1>
        <Image className={s.car} src="/car/clio.webp" alt="Renault Clio" width={1014} height={596} priority />
      </div>
      <div className={s.panel}>
        <Image src="/icons/icon-192.png" alt="" width={44} height={44} className={s.logo} />
        <h2>Bem-vindo ao Meu Clio</h2>
        <p className={s.sub}>Tudo o que o carro custa, num lugar só.</p>
        <WelcomeForm />
      </div>
    </main>
  );
}
