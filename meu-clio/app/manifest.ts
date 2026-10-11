import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meu Clio",
    short_name: "Meu Clio",
    description: "Controle de gastos, parcelas e manutenção do carro.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#06110c",
    theme_color: "#06110c",
    lang: "pt-BR",
    shortcuts: [
      { name: "Abastecer", short_name: "Abastecer", url: "/combustivel/novo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Novo gasto", short_name: "Gasto", url: "/?add=gasto", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Atualizar km", short_name: "Km", url: "/?add=km", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Buscar", short_name: "Buscar", url: "/buscar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
