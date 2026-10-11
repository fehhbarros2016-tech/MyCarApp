-- 0007_v05 — Meu Clio v0.5
-- Só adiciona: tabelas, colunas, índices, funções e buckets. Nenhum dado existente é removido ou reescrito
-- (a única escrita em dados é ligar gastos de manutenção à oficina com o mesmo nome, sem mexer no texto original).

-- ============ hodômetro: corrigir leitura digitada errado ============
alter table odometer_readings add column if not exists deleted_at timestamptz;
alter table odometer_readings add column if not exists note text;

-- ============ veículo: ficha e foto ============
alter table vehicles add column if not exists info jsonb not null default '{}'::jsonb;
alter table vehicles add column if not exists photo_style text not null default 'recorte';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'vehicles_photo_style') then
    alter table vehicles add constraint vehicles_photo_style check (photo_style in ('recorte','foto'));
  end if;
end $$;

-- ============ orçamento por categoria ============
alter table categories add column if not exists monthly_budget numeric(12,2);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'categories_budget_pos') then
    alter table categories add constraint categories_budget_pos check (monthly_budget is null or monthly_budget > 0);
  end if;
end $$;

-- ============ oficinas (e postos/lojas) ============
create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'oficina' check (kind in ('oficina','posto','loja','outro')),
  phone text,
  address text,
  note text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============ viagens ============
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  start_date date not null,
  end_date date,
  start_km int check (start_km >= 0),
  end_km int check (end_km >= 0),
  note text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_date is null or end_date >= start_date)
);
create index if not exists trips_vehicle on trips (vehicle_id, start_date desc);

-- ============ gastos recorrentes ============
create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  category_id uuid not null references categories(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  note text,
  vendor text,
  shop_id uuid references shops(id) on delete set null,
  frequency text not null check (frequency in ('semanal','mensal','anual')),
  anchor_day smallint check (anchor_day between 1 and 31),
  next_date date not null,
  end_date date,
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============ gastos: oficina, viagem e origem recorrente ============
alter table expenses add column if not exists shop_id uuid references shops(id) on delete set null;
alter table expenses add column if not exists trip_id uuid references trips(id) on delete set null;
alter table expenses add column if not exists recurring_id uuid references recurring_expenses(id) on delete set null;
create index if not exists expenses_trip on expenses (trip_id) where trip_id is not null;
create index if not exists expenses_shop on expenses (shop_id) where shop_id is not null;
-- uma ocorrência por data para cada recorrência (evita gasto duplicado mesmo com duas abas abertas)
create unique index if not exists expenses_recurring_once on expenses (recurring_id, occurred_on) where recurring_id is not null;

-- ============ favoritos (gasto em um toque) ============
create table if not exists expense_favorites (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 40),
  category_id uuid not null references categories(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  note text,
  vendor text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============ plano de revisão ============
create table if not exists maintenance_plan (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  system text not null default 'outros' check (system in ('motor','cambio','suspensao','freios','eletrica',
    'arrefecimento','pneus','escapamento','injecao','outros')),
  category_slug text,
  keyword text,
  interval_km int check (interval_km > 0),
  interval_months int check (interval_months > 0),
  last_km int check (last_km >= 0),
  last_date date,
  note text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (interval_km is not null or interval_months is not null)
);
create index if not exists plan_vehicle on maintenance_plan (vehicle_id, sort);
alter table maintenance_records add column if not exists plan_id uuid references maintenance_plan(id) on delete set null;

-- ============ peças (idade de cada peça) ============
create table if not exists parts (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  brand text,
  system text not null default 'outros' check (system in ('motor','cambio','suspensao','freios','eletrica',
    'arrefecimento','pneus','escapamento','injecao','outros')),
  price numeric(12,2) check (price >= 0),
  installed_on date not null,
  installed_km int check (installed_km >= 0),
  life_km int check (life_km > 0),
  life_months int check (life_months > 0),
  image_path text,
  note text,
  shop_id uuid references shops(id) on delete set null,
  expense_id uuid references expenses(id) on delete set null,
  replaced_on date,
  replaced_by uuid references parts(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists parts_vehicle on parts (vehicle_id, installed_on desc);

-- ============ pneus ============
create table if not exists tire_events (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  kind text not null check (kind in ('troca','rodizio','calibragem','reparo')),
  done_on date not null,
  km int check (km >= 0),
  pressure_front numeric(4,1) check (pressure_front between 10 and 80),
  pressure_rear numeric(4,1) check (pressure_rear between 10 and 80),
  positions text,
  brand text,
  size text,
  cost numeric(12,2) check (cost >= 0),
  shop_id uuid references shops(id) on delete set null,
  expense_id uuid references expenses(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists tires_vehicle on tire_events (vehicle_id, done_on desc);

-- ============ diário de problemas ============
create table if not exists car_issues (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 100),
  description text,
  severity text not null default 'media' check (severity in ('baixa','media','alta')),
  noticed_on date not null,
  km int check (km >= 0),
  resolved_on date,
  resolution text,
  shop_id uuid references shops(id) on delete set null,
  expense_id uuid references expenses(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============ multas ============
create table if not exists fines (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  description text not null check (char_length(description) between 1 and 120),
  severity text not null check (severity in ('leve','media','grave','gravissima')),
  points smallint not null check (points between 0 and 20),
  occurred_on date,
  due_date date,
  amount numeric(12,2) check (amount >= 0),
  status text not null default 'aberta' check (status in ('aberta','paga','recurso','cancelada')),
  note text,
  expense_id uuid references expenses(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============ gastos anuais (reserva mensal) ============
create table if not exists annual_costs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 60),
  category_id uuid references categories(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  due_month smallint not null check (due_month between 1 and 12),
  note text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============ notificações ============
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  failures int not null default 0,
  disabled_at timestamptz
);
create table if not exists push_log (
  key text primary key,
  title text,
  sent_at timestamptz not null default now()
);

-- ============ segurança das tabelas novas ============
do $$
declare t text;
begin
  foreach t in array array['shops','trips','recurring_expenses','expense_favorites','maintenance_plan','parts',
    'tire_events','car_issues','fines','annual_costs','push_subscriptions','push_log']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on table %I from anon, authenticated', t);
  end loop;
end $$;

-- ============ arquivos (fotos e backups), privados ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 8388608, array['image/jpeg','image/png','image/webp']),
       ('backups', 'backups', false, 52428800, array['application/json'])
on conflict (id) do nothing;

-- ============ oficinas a partir do que já foi digitado ============
insert into shops (name, kind)
select distinct on (lower(trim(e.vendor))) trim(e.vendor), 'oficina'
  from expenses e join maintenance_records m on m.expense_id = e.id
 where e.vendor is not null and trim(e.vendor) <> ''
   and not exists (select 1 from shops s where lower(s.name) = lower(trim(e.vendor)) and s.deleted_at is null);

update expenses e set shop_id = s.id
  from shops s
 where e.shop_id is null and e.vendor is not null and s.deleted_at is null
   and lower(s.name) = lower(trim(e.vendor))
   and exists (select 1 from maintenance_records m where m.expense_id = e.id);

-- ============ funções ============

-- Próxima data de uma recorrência. anchor = dia original (31 vira 30/28 em meses curtos e volta a 31 depois).
create or replace function next_occurrence(p_date date, p_freq text, p_anchor smallint)
returns date language plpgsql immutable set search_path = public as $$
declare
  base date;
  last_day int;
begin
  if p_freq = 'semanal' then return p_date + 7; end if;
  base := (date_trunc('month', p_date) + case when p_freq = 'anual' then interval '12 months' else interval '1 month' end)::date;
  last_day := extract(day from (base + interval '1 month - 1 day'))::int;
  return make_date(extract(year from base)::int, extract(month from base)::int,
                   least(coalesce(p_anchor, extract(day from p_date)::int), last_day));
end $$;

-- Lança os gastos recorrentes que venceram até hoje. Seguro para rodar várias vezes (não duplica).
create or replace function run_recurring(p_today date default (now() at time zone 'America/Sao_Paulo')::date)
returns int language plpgsql set search_path = public as $$
declare
  r recurring_expenses%rowtype;
  d date;
  n int := 0;
  guard int;
begin
  for r in select * from recurring_expenses
            where deleted_at is null and paused_at is null and next_date <= p_today
              and (end_date is null or next_date <= end_date)
            for update skip locked
  loop
    d := r.next_date; guard := 0;
    while d <= p_today and (r.end_date is null or d <= r.end_date) and guard < 60 loop
      insert into expenses (vehicle_id, category_id, occurred_on, amount, vendor, note, shop_id, recurring_id)
      values (r.vehicle_id, r.category_id, d, r.amount, r.vendor, r.note, r.shop_id, r.id)
      on conflict do nothing;
      n := n + 1; guard := guard + 1;
      d := next_occurrence(d, r.frequency, r.anchor_day);
    end loop;
    update recurring_expenses set next_date = d where id = r.id;
  end loop;
  return n;
end $$;

-- Manutenção com oficina, item do plano e viagem, em uma transação.
create or replace function save_maintenance_v2(
  p_vehicle uuid, p_date date, p_km int, p_category uuid, p_system text, p_service text,
  p_parts numeric, p_labor numeric, p_vendor text, p_note text, p_next_date date, p_next_km int,
  p_shop uuid default null, p_plan uuid default null, p_trip uuid default null
) returns uuid
language plpgsql set search_path = public as $$
declare
  exp uuid;
  total numeric := coalesce(p_parts, 0) + coalesce(p_labor, 0);
begin
  if total < 0 then raise exception 'valor_invalido'; end if;
  insert into expenses (vehicle_id, category_id, occurred_on, amount, odometer, vendor, note, shop_id, trip_id)
  values (p_vehicle, coalesce(p_category, (select id from categories where slug = 'manutencao')),
          p_date, total, p_km, p_vendor, p_note, p_shop, p_trip)
  returning id into exp;

  insert into maintenance_records (expense_id, system, service, parts_cost, labor_cost, next_due_date, next_due_km, plan_id)
  values (exp, p_system, p_service, coalesce(p_parts, 0), coalesce(p_labor, 0), p_next_date, p_next_km, p_plan);

  if p_plan is not null then
    update maintenance_plan
       set last_date = p_date, last_km = coalesce(p_km, last_km)
     where id = p_plan and (last_date is null or p_date >= last_date);
  end if;

  if p_plan is null and (p_next_date is not null or p_next_km is not null) then
    insert into scheduled_events (vehicle_id, kind, title, due_date, due_km, expense_id)
    values (p_vehicle,
            case when p_service ilike '%óleo%' or p_service ilike '%oleo%' then 'oleo' else 'manutencao' end,
            p_service, p_next_date, p_next_km, exp);
  end if;
  return exp;
end $$;

-- Tudo que as telas precisam, em UMA ida ao banco. Antes de ler, lança os recorrentes vencidos.
create or replace function app_snapshot() returns jsonb
language plpgsql set search_path = public as $$
declare
  p jsonb;
  want text;
  vid uuid;
  out jsonb;
begin
  perform run_recurring((now() at time zone 'America/Sao_Paulo')::date);

  select s.prefs into p from app_settings s where s.id = 1;
  want := p->>'activeVehicleId';
  if want ~ '^[0-9a-fA-F-]{36}$' then
    select v.id into vid from vehicles v where v.id = want::uuid and v.archived_at is null;
  end if;
  if vid is null then
    select v.id into vid from vehicles v where v.archived_at is null order by v.created_at limit 1;
  end if;

  select jsonb_build_object(
    'profile', (select jsonb_build_object('display_name', a.display_name) from app_profile a where a.id = 1),
    'prefs', coalesce(p, '{}'::jsonb),
    'vehicle_id', vid,
    'vehicles', coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at) from vehicles v where v.archived_at is null), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort, c.name) from categories c), '[]'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(to_jsonb(e) || jsonb_build_object(
               'fuel', case when f.expense_id is null then null else to_jsonb(f) end,
               'maint', case when m.expense_id is null then null else to_jsonb(m) end)
             order by e.occurred_on desc, e.created_at desc)
        from expenses e
        left join fuel_records f on f.expense_id = e.id
        left join maintenance_records m on m.expense_id = e.id
       where e.vehicle_id = vid and e.deleted_at is null), '[]'::jsonb),
    'installments', coalesce((select jsonb_agg(to_jsonb(i) order by i.number) from installments i where i.vehicle_id = vid), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(ev) order by ev.due_date nulls last, ev.created_at)
        from scheduled_events ev where ev.vehicle_id = vid and ev.deleted_at is null), '[]'::jsonb),
    'levels', coalesce((select jsonb_agg(to_jsonb(l) order by l.read_on, l.created_at)
        from fuel_level_readings l
       where l.vehicle_id = vid
         and (l.expense_id is null or exists (select 1 from expenses x where x.id = l.expense_id and x.deleted_at is null))), '[]'::jsonb),
    'odometer', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'read_on', o.read_on, 'km', o.km, 'created_at', o.created_at, 'note', o.note)
        order by o.read_on, o.created_at)
        from odometer_readings o where o.vehicle_id = vid and o.source = 'manual' and o.deleted_at is null), '[]'::jsonb),
    'plan', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort, x.created_at) from maintenance_plan x where x.vehicle_id = vid and x.deleted_at is null), '[]'::jsonb),
    'parts', coalesce((select jsonb_agg(to_jsonb(x) order by x.installed_on desc, x.created_at desc) from parts x where x.vehicle_id = vid and x.deleted_at is null), '[]'::jsonb),
    'tires', coalesce((select jsonb_agg(to_jsonb(x) order by x.done_on desc, x.created_at desc) from tire_events x where x.vehicle_id = vid and x.deleted_at is null), '[]'::jsonb),
    'issues', coalesce((select jsonb_agg(to_jsonb(x) order by x.noticed_on desc, x.created_at desc) from car_issues x where x.vehicle_id = vid and x.deleted_at is null), '[]'::jsonb),
    'fines', coalesce((select jsonb_agg(to_jsonb(x) order by x.occurred_on desc nulls last, x.created_at desc) from fines x where x.vehicle_id = vid and x.deleted_at is null), '[]'::jsonb),
    'trips', coalesce((select jsonb_agg(to_jsonb(x) order by x.start_date desc, x.created_at desc) from trips x where x.vehicle_id = vid and x.deleted_at is null), '[]'::jsonb),
    'recurring', coalesce((select jsonb_agg(to_jsonb(x) order by x.next_date) from recurring_expenses x where x.vehicle_id = vid and x.deleted_at is null), '[]'::jsonb),
    'favorites', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort, x.created_at) from expense_favorites x where x.deleted_at is null), '[]'::jsonb),
    'shops', coalesce((select jsonb_agg(to_jsonb(x) order by lower(x.name)) from shops x where x.deleted_at is null), '[]'::jsonb),
    'annual', coalesce((select jsonb_agg(to_jsonb(x) order by x.due_month, x.name) from annual_costs x where x.vehicle_id = vid and x.deleted_at is null), '[]'::jsonb),
    'push_devices', (select count(*) from push_subscriptions s where s.disabled_at is null)
  ) into out;
  return out;
end $$;

revoke all on function next_occurrence(date,text,smallint) from public, anon, authenticated;
revoke all on function run_recurring(date) from public, anon, authenticated;
revoke all on function save_maintenance_v2(uuid,date,int,uuid,text,text,numeric,numeric,text,text,date,int,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function app_snapshot() from public, anon, authenticated;
