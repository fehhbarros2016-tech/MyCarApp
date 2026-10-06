-- 0004_half_bars — o marcador aceita meia barra (ex.: 3,5 de 9).
-- Só alarga o tipo das colunas (inteiro → decimal); os valores já gravados continuam iguais.

alter table fuel_level_readings alter column bars type numeric(4,1);
alter table fuel_records alter column gauge_before type numeric(4,1);
alter table fuel_records alter column gauge_after type numeric(4,1);

-- só múltiplos de 0,5
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fuel_level_half_step') then
    alter table fuel_level_readings add constraint fuel_level_half_step check (bars * 2 = round(bars * 2));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fuel_records_half_step') then
    alter table fuel_records add constraint fuel_records_half_step
      check ((gauge_before is null or gauge_before * 2 = round(gauge_before * 2))
         and (gauge_after  is null or gauge_after  * 2 = round(gauge_after  * 2)));
  end if;
end $$;

-- Nova versão da função de abastecimento, com barras decimais.
create or replace function record_fuel_fill(
  p_vehicle uuid, p_date date, p_km int, p_amount numeric,
  p_liters numeric, p_price numeric, p_source text,
  p_fuel_type text, p_bars_before numeric, p_bars_after numeric,
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
  if p_bars_before < 0 or p_bars_after < 0 or p_bars_before > v.gauge_bars or p_bars_after > v.gauge_bars then
    raise exception 'barras_invalidas';
  end if;
  if p_bars_after < p_bars_before then raise exception 'depois_menor_que_antes'; end if;
  select id into cat from categories where slug = 'combustivel';

  insert into expenses (vehicle_id, category_id, occurred_on, amount, odometer, vendor, note)
  values (p_vehicle, cat, p_date, p_amount, p_km, p_vendor, p_note)
  returning id into exp;

  insert into fuel_records (expense_id, liters, price_per_liter, fuel_type, full_tank, liters_source, gauge_before, gauge_after)
  values (exp, p_liters, p_price, p_fuel_type, p_bars_after = v.gauge_bars, p_source, p_bars_before, p_bars_after);

  insert into fuel_level_readings (vehicle_id, read_on, km, bars, liters, context, expense_id) values
    (p_vehicle, p_date, p_km, p_bars_before, round(p_bars_before / v.gauge_bars * v.tank_capacity_l, 2), 'antes', exp),
    (p_vehicle, p_date, p_km, p_bars_after,  round(p_bars_after  / v.gauge_bars * v.tank_capacity_l, 2), 'depois', exp);

  return exp;
end $$;

revoke all on function record_fuel_fill(uuid,date,int,numeric,numeric,numeric,text,text,numeric,numeric,text,text) from public, anon, authenticated;

-- A versão antiga (barras inteiras) deixa de ser usada. Remover a função não toca em nenhum dado.
drop function if exists record_fuel_fill(uuid,date,int,numeric,numeric,numeric,text,text,smallint,smallint,text,text);
