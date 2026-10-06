import type { IconName } from "@/components/ui/Icon";

export type Route = { href: string; label: string; icon: IconName };

export const ALL_ROUTES: Route[] = [
  { href: "/", label: "Início", icon: "home" },
  { href: "/gastos", label: "Gastos", icon: "wallet" },
  { href: "/parcelas", label: "Parcelas", icon: "receipt" },
  { href: "/combustivel", label: "Combustível", icon: "fuel" },
  { href: "/manutencao", label: "Manutenção", icon: "wrench" },
  { href: "/relatorios", label: "Relatórios", icon: "chart" },
  { href: "/agenda", label: "Agenda", icon: "calendar" },
];

export const TAB_ROUTES: Route[] = [
  { href: "/", label: "Início", icon: "home" },
  { href: "/gastos", label: "Gastos", icon: "wallet" },
  { href: "/manutencao", label: "Manutenção", icon: "wrench" },
  { href: "/relatorios", label: "Relatórios", icon: "chart" },
  { href: "/mais", label: "Mais", icon: "more" },
];

// "Mais" fica ativo quando a tela atual não está na barra.
export function isActive(href: string, path: string): boolean {
  if (href === "/") return path === "/";
  if (href === "/mais") return ["/mais", "/parcelas", "/combustivel", "/agenda", "/configuracoes"].some((p) => path.startsWith(p));
  return path.startsWith(href);
}
