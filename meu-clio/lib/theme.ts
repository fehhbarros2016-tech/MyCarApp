// Variáveis de cor aplicadas no <html> (servem também para os painéis que abrem por cima de tudo).
import { ACCENTS, AMBIENTS, type Settings } from "@/lib/settings";

export function themeVars(st: Pick<Settings, "accent" | "ambientColor" | "ambientStrength">): Record<string, string> {
  const accent = ACCENTS[st.accent];
  const amb = AMBIENTS[st.ambientColor];
  const a = st.ambientColor === "destaque" ? accent : amb.a;
  const b = st.ambientColor === "destaque" ? `color-mix(in srgb, ${accent} 45%, #0b3a26)` : amb.b;
  const k = st.ambientStrength;
  return {
    "--accent": accent,
    "--amb-a": a,
    "--amb-b": b,
    // intensidade: as manchas ficam mais ou menos opacas (o tema claro usa outra base)
    "--amb-pa": `${[0, 9, 14, 22][k]}%`,
    "--amb-pb": `${[0, 16, 24, 34][k]}%`,
  };
}

/** Aplica na hora (pré-visualização ao mexer nas configurações). */
export function applyTheme(st: Pick<Settings, "accent" | "ambientColor" | "ambientStrength" | "theme">) {
  const el = document.documentElement;
  el.dataset.theme = st.theme;
  for (const [k, v] of Object.entries(themeVars(st))) el.style.setProperty(k, v);
  const meta = document.querySelector('meta[name="theme-color"]');
  const light = st.theme === "light" || (st.theme === "auto" && matchMedia("(prefers-color-scheme: light)").matches);
  meta?.setAttribute("content", light ? "#eef3ef" : "#06110c");
}
