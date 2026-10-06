-- 0003_fuel_gauge — marcador de combustível em barras (Clio: 9 barras, 50 L)
-- Só adiciona. Nenhuma tabela ou dado existente é removido ou reescrito.

-- Tanque e marcador do veículo (o veículo existente recebe 50 L / 9 barras pelo default)
alter table vehicles add column if not exists tank_capacity_l numeric(5,1) not null default 50
  check (tank_capacity_l > 0 and tank_capacity_l <= 200);
alter table vehicles add column if not exists gauge_bars smallint not null default 9
  check (gauge_bars between 2 and 20);

-- Como os litros do abastecimento foram obtidos e onde o marcador estava
alter table fuel_records add column if not exists liters_source text not null default 'bomba'
  check (liters_source in ('bomba','marcador'));
alter table fuel_records add column if not exists gauge_before smallint check (gauge_before >= 0);
alter table fuel_records add column if not exists gauge_after smallint check (gauge_after >= 0);

-- Leituras do marcador (antes/depois de abastecer, ou atualização avulsa)
create table if not exists fuel_level_readings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  read_on date not null,
  km int check (km >= 0),
  bars smallint not null check (bars >= 0),
  liters numeric(6,2) not null check (liters >= 0),
  context text not null check (context in ('antes','depois','manual')),
  expense_id uuid references expenses(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists fuel_level_vehicle on fuel_level_readings (vehicle_id, read_on desc, created_at desc);

alter table fuel_level_readings enable row level security;
revoke all on table fuel_level_readings from anon, authenticated;

-- Abastecimento em uma única transação: gasto + detalhes + leituras antes/depois.
-- Se qualquer parte falhar, nada é gravado.
create or replace function record_fuel_fill(
  p_vehicle uuid, p_date date, p_km int, p_amount numeric,
  p_liters numeric, p_price numeric, p_source text,
  p_fuel_type text, p_bars_before smallint, p_bars_after smallint,
  p_vendor text default null, p_note text default null
) returns uuid
language plpgsql as $$
declare
  v vehicles%rowtype;
  cat uuid;
  exp uuid;
begin
  select * into v from vehicles where id = p_vehicle and archived_at is null;
  if not found then raise exception 'veiculo_nao_encontrado'; end if;
  if p_bars_before > v.gauge_bars or p_bars_after > v.gauge_bars then raise exception 'barras_invalidas'; end if;
  if p_bars_after < p_bars_before then raise exception 'depois_menor_que_antes'; end if;
  select id into cat from categories where slug = 'combustivel';

  insert into expenses (vehicle_id, category_id, occurred_on, amount, odometer, vendor, note)
  values (p_vehicle, cat, p_date, p_amount, p_km, p_vendor, p_note)
  returning id into exp;

  insert into fuel_records (expense_id, liters, price_per_liter, fuel_type, full_tank, liters_source, gauge_before, gauge_after)
  values (exp, p_liters, p_price, p_fuel_type, p_bars_after = v.gauge_bars, p_source, p_bars_before, p_bars_after);

  insert into fuel_level_readings (vehicle_id, read_on, km, bars, liters, context, expense_id) values
    (p_vehicle, p_date, p_km, p_bars_before, round(p_bars_before::numeric / v.gauge_bars * v.tank_capacity_l, 2), 'antes', exp),
    (p_vehicle, p_date, p_km, p_bars_after,  round(p_bars_after::numeric  / v.gauge_bars * v.tank_capacity_l, 2), 'depois', exp);

  return exp;
end $$;

revoke all on function record_fuel_fill(uuid,date,int,numeric,numeric,numeric,text,text,smallint,smallint,text,text) from public, anon, authenticated;
