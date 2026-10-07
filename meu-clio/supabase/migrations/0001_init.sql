-- 0001_init — estrutura inicial do Meu Clio
-- Regras: só criar. Nenhum DROP/TRUNCATE. Todos os campos de valor começam vazios.
-- Acesso: o navegador nunca fala com o banco. O servidor usa a service role.
-- RLS ligado em tudo e sem políticas = chave pública (anon) não lê nem grava nada.

create extension if not exists pgcrypto;

-- ---------- perfil e preferências (app de um dono só) ----------
create table if not exists app_profile (
  id smallint primary key default 1 check (id = 1),
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  id smallint primary key default 1 check (id = 1),
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- veículo ----------
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Meu Clio',
  make text,
  model text,
  year int check (year between 1950 and 2100),
  plate text,
  hero_word text not null default 'CLIO',
  image_path text,
  purchase_date date,
  purchase_price numeric(12,2) check (purchase_price >= 0),
  down_payment numeric(12,2) check (down_payment >= 0),
  initial_odometer int check (initial_odometer >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- parcelas (sem juros: valor fixo por parcela) ----------
create table if not exists installments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  number int not null check (number > 0),
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  paid_at date,                       -- null = pendente; pode ser antes do vencimento
  note text,
  created_at timestamptz not null default now(),
  unique (vehicle_id, number)
);

-- ---------- categorias ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null default 'box',
  cost_group text not null check (cost_group in
    ('uso','manutencao','protecao','documentacao','estetica','modificacoes','outros')),
  sort int not null default 0,
  archived_at timestamptz
);

-- Categorias padrão (estrutura do app, não dados fictícios)
insert into categories (slug, name, icon, cost_group, sort) values
  ('combustivel',   'Combustível',    'fuel',     'uso',          1),
  ('manutencao',    'Manutenção',     'wrench',   'manutencao',   2),
  ('seguro',        'Seguro',         'shield',   'protecao',     3),
  ('documentacao',  'Documentação',   'file',     'documentacao', 4),
  ('pneus',         'Pneus',          'tire',     'manutencao',   5),
  ('estetica',      'Estética',       'sparkle',  'estetica',     6),
  ('modificacoes',  'Modificações',   'bolt',     'modificacoes', 7),
  ('estacionamento','Estacionamento', 'parking',  'uso',          8),
  ('pedagio',       'Pedágios',       'road',     'uso',          9),
  ('multas',        'Multas',         'alert',    'documentacao',10),
  ('outros',        'Outros',         'box',      'outros',      11)
on conflict (slug) do nothing;

-- ---------- livro-caixa único ----------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  category_id uuid not null references categories(id) on delete restrict,
  occurred_on date not null,
  amount numeric(12,2) not null check (amount >= 0),
  odometer int check (odometer >= 0),
  vendor text,
  note text,
  details jsonb not null default '{}'::jsonb,   -- multa: infração/vencimento; seguro: apólice...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz                         -- exclusão lógica
);
create index if not exists expenses_vehicle_date on expenses (vehicle_id, occurred_on desc) where deleted_at is null;
create index if not exists expenses_category on expenses (category_id);

create table if not exists fuel_records (
  expense_id uuid primary key references expenses(id) on delete cascade,
  liters numeric(8,3) not null check (liters > 0),
  price_per_liter numeric(8,3) not null check (price_per_liter > 0),
  fuel_type text not null check (fuel_type in ('gasolina','etanol','gnv','diesel')),
  full_tank boolean not null default true
);

create table if not exists maintenance_records (
  expense_id uuid primary key references expenses(id) on delete cascade,
  system text not null check (system in ('motor','cambio','suspensao','freios','eletrica',
    'arrefecimento','pneus','escapamento','injecao','outros')),
  service text not null,
  parts_cost numeric(12,2) not null default 0 check (parts_cost >= 0),
  labor_cost numeric(12,2) not null default 0 check (labor_cost >= 0),
  next_due_date date,
  next_due_km int check (next_due_km >= 0)
);

-- ---------- hodômetro ----------
create table if not exists odometer_readings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  read_on date not null,
  km int not null check (km >= 0),
  source text not null default 'manual' check (source in ('manual','expense')),
  expense_id uuid references expenses(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists odometer_vehicle on odometer_readings (vehicle_id, read_on desc);

-- Todo gasto com km informado vira uma leitura do hodômetro
create or replace function trg_expense_odometer() returns trigger
language plpgsql as $$
begin
  if new.odometer is not null and (tg_op = 'INSERT' or new.odometer is distinct from old.odometer) then
    insert into odometer_readings (vehicle_id, read_on, km, source, expense_id)
    values (new.vehicle_id, new.occurred_on, new.odometer, 'expense', new.id);
  end if;
  return null;
end $$;

create or replace trigger expense_odometer after insert or update of odometer on expenses
  for each row execute function trg_expense_odometer();

-- ---------- agenda ----------
create table if not exists scheduled_events (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  kind text not null check (kind in ('parcela','manutencao','seguro','ipva','licenciamento',
    'oleo','revisao','pneus','multa','outros')),
  title text not null,
  due_date date,
  due_km int check (due_km >= 0),
  repeat_months int check (repeat_months > 0),
  repeat_km int check (repeat_km > 0),
  installment_id uuid references installments(id) on delete set null,
  expense_id uuid references expenses(id) on delete set null,
  done_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  check (due_date is not null or due_km is not null)
);

-- ---------- segurança ----------
do $$
declare t text;
begin
  foreach t in array array['app_profile','app_settings','vehicles','installments','categories',
    'expenses','fuel_records','maintenance_records','odometer_readings','scheduled_events']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on table %I from anon, authenticated', t);
  end loop;
end $$;
