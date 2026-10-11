import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import "./globals.css";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { getStore } from "@/lib/store";
import { themeVars } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: "Meu Clio", template: "%s · Meu Clio" },
  description: "Controle de gastos, parcelas e manutenção do carro.",
  applicationName: "Meu Clio",
  appleWebApp: { capable: true, title: "Meu Clio", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};

/** Preferências de aparência só para quem já entrou (a tela de boas-vindas fica sempre escura). */
async function prefs(): Promise<Settings> {
  try {
    const ok = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
    if (!ok) return DEFAULT_SETTINGS;
    return (await getStore())?.settings ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function generateViewport(): Promise<Viewport> {
  const st = await prefs();
  const themeColor = st.theme === "light" ? "#eef3ef" : st.theme === "auto"
    ? [{ media: "(prefers-color-scheme: light)", color: "#eef3ef" }, { media: "(prefers-color-scheme: dark)", color: "#06110c" }]
    : "#06110c";
  return { themeColor, colorScheme: st.theme === "auto" ? "light dark" : st.theme, width: "device-width", initialScale: 1, viewportFit: "cover" };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const st = await prefs();
  return (
    <html lang="pt-BR" data-theme={st.theme} style={themeVars(st) as CSSProperties}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,300..900&family=JetBrains+Mono:wght@400;500&display=swap" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
