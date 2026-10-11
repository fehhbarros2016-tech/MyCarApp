// Versão do app. Atualize a cada entrega e registre o que mudou.
export const APP_VERSION = "0.5.0";
export const APP_VERSION_LABEL = "v0.5";
export const APP_RELEASED = "2026-10-11";

export const CHANGELOG: { version: string; date: string; items: string[] }[] = [
  {
    version: "v0.5", date: "2026-10-11",
    items: [
      "Tema claro e escuro, cor do fundo em movimento e nome do carro que se ajusta ao tamanho",
      "Troca de veículo na tela inicial, com foto própria e marca acima do nome",
      "Etanol ou gasolina, histórico do preço do litro, autonomia estimada e alerta de consumo",
      "Manutenção com plano de revisão, peças com foto e idade, pneus, diário de problemas e oficinas",
      "Simulador de quitação, reserva para gastos anuais com base no salário e orçamento por categoria",
      "Multas com pontos da CNH, viagens, calculadora de viagem e km por dia",
      "Ficha do carro, notificações, favoritos, gastos recorrentes, busca inteligente e Face ID",
      "Resumo do mês, retrospectiva do ano, linha do tempo, relatório para venda e backup automático",
      "Correção: o km atual agora mostra a última leitura informada",
    ],
  },
  { version: "v0.4", date: "2026-10-11", items: ["Gasto previsto no início"] },
  { version: "v0.3", date: "2026-10-07", items: ["Painel completo, relatórios, configurações e barra com deslize"] },
  { version: "v0.2", date: "2026-10-06", items: ["Marcador de combustível em meia barra"] },
  { version: "v0.1", date: "2026-10-06", items: ["Primeira versão"] },
];
