# Meu Clio — Proposta de arquitetura (v0.2)

**Decisões do Gabriel (06/10/2026)**
- O app começa vazio: nenhum valor inicial de compra, parcelas, km ou gastos. Tudo é cadastrado dentro do app.
- Sem login completo. Na primeira abertura o app pede só o nome e passa a usá-lo nas mensagens ("Gabriel, aqui está o resumo da semana").
- Acesso por chave única (sem e-mail). Como não há contas, o banco usa `app_profile` e `app_settings` (linha única) no lugar de `auth.users`/`user_settings`; o SQL real está em `supabase/migrations`.
- Custo/km considera só o custo de uso. Entrada e parcelas ficam separadas, no bloco Compra.

Documento para ficar no repositório em `docs/ARQUITETURA.md`. Nada foi implementado além do protótipo visual e dos assets.

---

## 1. Análise dos requisitos

O app tem um único "livro-caixa" do carro, com três fontes de dinheiro e uma fonte de quilometragem:

| Fonte | O que gera | Observação |
|---|---|---|
| Compra | entrada + parcelas fixas | sem juros: progresso = parcelas pagas / total |
| Gastos | combustível, manutenção, seguro, IPVA, estética etc. | todos viram um registro em `expenses` |
| Agenda | eventos futuros (data e/ou km) | não é dinheiro gasto, é previsão |
| Hodômetro | leituras de km ao longo do tempo | base do custo/km e dos lembretes por km |

Decisão central: **todo dinheiro gasto no uso do carro vive numa única tabela `expenses`**. Combustível e manutenção têm campos extras, então ganham tabelas-filhas 1:1. Isso deixa todos os relatórios (por mês, categoria, período, custo/km) como uma única consulta, sem somar dez tabelas.

As parcelas ficam numa tabela própria (`installments`) e **não** são duplicadas em `expenses`. O custo total soma as duas fontes. Assim, marcar uma parcela como paga nunca gera contagem dupla.

## 2. Arquitetura

```
iPhone (Safari / PWA) ─┐
                       ├─► Vercel: Next.js 15 (App Router, TypeScript)
PC (navegador) ────────┘        │  Server Components + Route Handlers
                                │  só chave anon no cliente
                                ▼
                       Supabase: Postgres + Auth + RLS
                       migrations versionadas no GitHub
```

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | Next.js 15 + TypeScript strict | SSR rápido, rotas por pasta, deploy nativo na Vercel |
| Estilo | CSS Modules + tokens CSS | identidade própria, sem cara de kit pronto |
| Animação | `motion` (Framer Motion) só onde precisa; resto em CSS | transições de página e contagens; leve no iPhone |
| Dados | `@supabase/ssr` + TanStack Query | cache, estados de loading/erro e revalidação |
| Validação | Zod | mesmo schema valida formulário e servidor |
| Gráficos | SVG próprio (componentes) | o gráfico parece parte do design, não de biblioteca |
| PWA | Serwist (service worker) + manifest | instalação na tela inicial, abertura offline do shell |
| Acesso | Código de acesso único + cookie de longa duração; banco acessado só pelo servidor | sem login, mas os dados continuam protegidos (ver seção 10) |

Sem IA no app. Todo cálculo é SQL (views) ou TypeScript puro e testado.

## 3. Schema do banco

```sql
-- usuário = auth.users (Supabase). Nenhuma tabela "users" própria é necessária.

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete restrict,
  name text not null,                 -- "Meu Clio"
  make text, model text, year int, plate text,
  hero_word text default 'CLIO',      -- palavra atrás do carro
  image_path text,                    -- Supabase Storage
  purchase_date date,                 -- tudo opcional: o app começa vazio
  purchase_price numeric(12,2),
  down_payment numeric(12,2),
  initial_odometer int,               -- se vazio, usa a primeira leitura do hodômetro
  archived_at timestamptz,            -- arquivar, nunca apagar
  created_at timestamptz default now()
);

create table installments (            -- "vehicle_payments"
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete restrict,
  number int not null,                -- 1..40
  amount numeric(12,2) not null,
  due_date date not null,
  paid_at date,                       -- null = pendente; pode ser antes do vencimento
  note text,
  unique (vehicle_id, number)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  slug text not null,                 -- fuel, maintenance, insurance, documents, tires, ...
  name text not null, icon text,
  cost_group text not null check (cost_group in
    ('uso','manutencao','protecao','documentacao','estetica','modificacoes','outros')),
  sort int default 0, archived_at timestamptz,
  unique (user_id, slug)
);

create table expenses (                -- livro-caixa único
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete restrict,
  category_id uuid not null references categories,
  occurred_on date not null,
  amount numeric(12,2) not null check (amount >= 0),
  odometer int,                       -- opcional; alimenta odometer_readings
  vendor text,                        -- posto, oficina, despachante
  note text,
  details jsonb default '{}',         -- seguro: apólice; multa: infração; pneu: medida...
  created_at timestamptz default now(),
  deleted_at timestamptz              -- exclusão lógica, recuperável
);

create table fuel_records (            -- 1:1 com expenses
  expense_id uuid primary key references expenses on delete cascade,
  liters numeric(8,3) not null,
  price_per_liter numeric(8,3) not null,
  fuel_type text not null check (fuel_type in ('gasolina','etanol','gnv','diesel')),
  full_tank boolean not null default true
);

create table maintenance_records (     -- 1:1 com expenses
  expense_id uuid primary key references expenses on delete cascade,
  system text not null check (system in ('motor','cambio','suspensao','freios','eletrica',
    'arrefecimento','pneus','escapamento','injecao','outros')),
  service text not null,
  parts_cost numeric(12,2) default 0,
  labor_cost numeric(12,2) default 0,
  next_due_date date, next_due_km int  -- gera evento na agenda
);

create table odometer_readings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete restrict,
  read_on date not null, km int not null,
  source text not null default 'manual', -- manual | fuel | maintenance
  expense_id uuid references expenses on delete set null
);

create table scheduled_events (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete restrict,
  kind text not null,                 -- parcela, manutencao, seguro, ipva, licenciamento, oleo, revisao, pneus, outros
  title text not null,
  due_date date, due_km int,          -- por data, por km, ou os dois
  repeat_months int, repeat_km int,
  installment_id uuid references installments,
  done_at timestamptz, note text
);

create table user_settings (
  user_id uuid primary key references auth.users,
  display_name text,                  -- "Gabriel", usado nas mensagens do app
  prefs jsonb not null default '{}',  -- tudo da tela Configurações
  updated_at timestamptz default now()
);
```

**Tabelas da lista original que não viram tabela própria, e por quê**

| Proposta original | Onde fica | Motivo |
|---|---|---|
| `users` | `auth.users` do Supabase | já existe e é a base do RLS |
| `insurance`, `documents`, `tires`, `modifications` | categorias em `expenses` + `details jsonb` | só têm 1–3 campos extras; tabelas próprias multiplicariam consultas sem ganho. Se uma delas crescer, vira tabela 1:1 por migration, sem perder dados |
| `settings` | `user_settings.prefs` | preferências mudam com frequência; jsonb evita migration a cada opção nova |

**Views de cálculo** (o app só lê, nunca recalcula no cliente):
- `v_installment_summary`: total, pagas, restantes, valor pago, valor restante, % concluído.
- `v_cost_breakdown`: total por grupo (Compra = entrada + parcelas pagas; Uso; Manutenção; Proteção; Documentação; Estética; Modificações).
- `v_monthly_spend`: gasto por mês e categoria.
- `v_fuel_efficiency`: km/l pelo método tanque cheio a tanque cheio.
- `v_cost_per_km`: custo de uso (todos os gastos, sem entrada e sem parcelas) / (km atual − primeira leitura) e o valor por 1.000 km. Sem duas leituras de km, mostra "—" em vez de um número inventado.

## 4. Relacionamentos

```
auth.users 1─N vehicles 1─N installments
     │              ├──1─N expenses 1─0..1 fuel_records
     │              │         └────1─0..1 maintenance_records
     │              ├──1─N odometer_readings (opcionalmente ligados a um gasto)
     │              └──1─N scheduled_events (opcionalmente ligados a uma parcela)
     ├──1─N categories 1─N expenses
     └──1─1 user_settings
```

Tudo pendura no veículo, então um segundo carro no futuro é só mais uma linha em `vehicles`.

## 5. Estrutura de pastas

```
meu-clio/
├─ app/
│  ├─ (auth)/login/
│  ├─ (app)/layout.tsx          shell: fundo, nav, transições
│  ├─ (app)/page.tsx            Início
│  ├─ (app)/gastos/  parcelas/  combustivel/  manutencao/
│  ├─ (app)/relatorios/  agenda/  configuracoes/
│  └─ manifest.ts  sw.ts
├─ components/
│  ├─ ui/        Button, Card, Sheet, Input, Switch, Segmented, Stepper, Badge, Skeleton, EmptyState, Toast
│  ├─ charts/    BarChart, LineChart, Donut, Sparkline (SVG)
│  ├─ motion/    PageTransition, Reveal, CountUp, ProgressBar
│  └─ nav/       TabBar, Sidebar
├─ features/     uma pasta por domínio: queries, mutations, schemas Zod, componentes próprios
│  ├─ installments/  expenses/  fuel/  maintenance/  reports/  agenda/  settings/
├─ lib/          supabase (client/server), format (R$, km), dates, calc (puro, testado)
├─ styles/       tokens.css, globals.css
├─ public/       icons/, car/clio.webp
├─ supabase/
│  ├─ migrations/   0001_init.sql, 0002_views.sql, ...
│  └─ seed.dev.sql  (só desenvolvimento)
└─ tests/        calc, views SQL
```

## 6. Componentes

Três níveis: `ui/` (primitivos sem regra de negócio) → `features/*/components` (sabem o que é parcela, abastecimento) → páginas (só compõem). Todo componente que busca dados usa o mesmo padrão `<DataState>` com skeleton, vazio ("Você ainda não registrou nenhum abastecimento" + botão), erro com "Tentar de novo" e toast de sucesso.

## 7. Navegação

- **iPhone**: tab bar flutuante com Início · Gastos · Manutenção · Relatórios · Mais. "Mais" leva a Parcelas, Combustível, Agenda e Configurações.
- **Desktop (≥ 980 px)**: sidebar com todas as seções; Início em duas colunas (carro e números à esquerda, cartões à direita).
- **Adicionar gasto**: botão "+" global abre uma folha (sheet) com a categoria primeiro; combustível e manutenção mostram os campos extras.
- Transição entre telas: fade + blur 6 px + 8 px de deslocamento, 500 ms. Itens entram em cascata de 60 ms.

## 8. Identidade visual

Está no protótipo publicado. Fundo `#06110C` com duas manchas verdes que derivam em 45–60 s (só `transform`, sem custo de GPU contínuo relevante). Verde de destaque `#6EF095`. Tipografia Archivo em largura expandida para a palavra CLIO e os números grandes, JetBrains Mono para rótulos e unidades. Bordas a 8% de opacidade, cards só onde agrupam informação.

O carro foi recortado, escurecido, com vidros escuros, mais contraste, luz verde vindo da esquerda e desaparecimento suave na parte de baixo.

## 9. PWA

- `app/manifest.ts`: nome "Meu Clio", `display: standalone`, `theme_color` e `background_color` `#06110C`, ícones 192/512 e maskable.
- `apple-touch-icon` 180 px, `apple-mobile-web-app-status-bar-style: black-translucent`, `viewport-fit=cover` e padding de safe area.
- Splash do iOS: imagens `apple-touch-startup-image` geradas por tamanho de iPhone.
- Service worker (Serwist): guarda o shell e as fontes em cache; dados **sempre** vêm do Supabase (network-first), para nunca mostrar número desatualizado como se fosse atual.
- Selo no ícone (Badging API, iOS 16.4+ instalado) com o número de eventos próximos.

## 10. Como os dados ficam seguros em futuras atualizações

1. **Código e dados separados**: deploy na Vercel troca só a interface. O banco não é tocado por deploy.
2. **Só migrations para frente**: cada mudança é um arquivo novo em `supabase/migrations`, revisado no GitHub. Proibido `drop table`, `truncate` ou `db reset` em produção; o CI falha se uma migration contiver esses comandos sem a marca `-- DESTRUTIVO: aprovado por Gabriel em <data>`.
3. **Mudanças aditivas**: coluna nova entra como opcional ou com default; renomear é feito em duas etapas (nova coluna, cópia, remoção só depois e com aprovação).
4. **Exclusão lógica**: gastos têm `deleted_at`; veículos são arquivados, nunca apagados. `on delete restrict` impede apagar um carro com registros.
5. **Acesso sem login, mas protegido**: na primeira abertura em cada aparelho o app pede o nome e um código de acesso (definido por você uma vez, guardado como hash na Vercel). O servidor grava um cookie seguro (`httpOnly`, 1 ano), e o aparelho não pede mais. O navegador nunca fala direto com o banco: todas as leituras e gravações passam pelas rotas do Next.js, que usam a service role key só no servidor. RLS fica ligado em todas as tabelas, negando qualquer acesso pela chave pública. Resultado: quem descobrir o endereço do app não vê nem altera nada.
6. **Ambientes separados**: projeto Supabase de desenvolvimento (com `seed.dev.sql` e dados de exemplo) e projeto de produção (sem seed). O app mostra o selo DEMO sempre que não está em produção.
7. **Backups**: backup diário do Supabase + exportação JSON/CSV nas Configurações + backup semanal opcional por e-mail.

---

## Próximo passo após sua aprovação

1. Repositório no GitHub, projeto Next.js, tokens e shell (fundo, navegação, transições).
2. Supabase: `0001_init.sql` + RLS + views, em desenvolvimento.
3. Início e Parcelas com dados reais; depois Gastos, Combustível, Manutenção, Agenda, Relatórios e Configurações.

Primeira abertura: tela de boas-vindas pede nome e código; depois o Início aparece com estados vazios e atalhos ("Cadastrar a compra do carro", "Registrar primeiro abastecimento", "Informar km atual").

---

## Marcador de combustível (migration 0003)

- `vehicles.tank_capacity_l` = 50 e `vehicles.gauge_bars` = 9 (Clio). Cada barra ≈ 5,6 L.
- `fuel_level_readings`: leituras do marcador (`antes`, `depois` de abastecer ou `manual`), com km quando informado.
- `record_fuel_fill(...)`: grava gasto + detalhes + leituras antes/depois numa única transação.
- Litros abastecidos: valor ÷ preço por litro quando o preço é informado; senão, barras que subiram × 5,6 L.
- Consumo (`lib/fuel.ts`, testado em `tests/fuel.test.ts`): entre leituras consecutivas, litros gastos = nível anterior + abastecido no meio − nível atual; média = km totais ÷ litros totais.
