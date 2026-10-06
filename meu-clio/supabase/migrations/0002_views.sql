-- 0002_views — todos os números do app vêm daqui. O cliente não recalcula nada.
-- security_invoker: as views respeitam o RLS de quem consulta (anon continua sem acesso).

-- Parcelas: progresso simples, sem juros
create or replace view v_installment_summary with (security_invoker = true) as
select
  v.id as vehicle_id,
  count(i.id)::int                                                   as total,
  count(i.id) filter (where i.paid_at is not null)::int              as paid,
  count(i.id) filter (where i.paid_at is null)::int                  as remaining,
  coalesce(sum(i.amount) filter (where i.paid_at is not null), 0)    as paid_amount,
  coalesce(sum(i.amount) filter (where i.paid_at is null), 0)        as remaining_amount,
  coalesce(sum(i.amount), 0)                                         as installments_amount,
  v.down_payment,
  v.purchase_price
from vehicles v
left join installments i on i.vehicle_id = v.id
group by v.id;

-- Km: primeira e última leitura (inclui o km da compra, se informado)
create or replace view v_odometer_range with (security_invoker = true) as
with all_km as (
  select vehicle_id, km, read_on from odometer_readings
  union all
  select id, initial_odometer, coalesce(purchase_date, created_at::date) from vehicles where initial_odometer is not null
)
select vehicle_id,
       min(km) as first_km,
       max(km) as last_km,
       (max(km) - min(km)) as driven_km,
       count(*)::int as readings,
       max(read_on) as last_read_on
from all_km
group by vehicle_id;

-- Custo por grupo. "Compra" = entrada + parcelas pagas. Demais grupos = livro-caixa.
create or replace view v_cost_breakdown with (security_invoker = true) as
select v.id as vehicle_id, 'compra'::text as cost_group,
       coalesce(v.down_payment, 0) + coalesce(s.paid_amount, 0) as amount
from vehicles v
left join v_installment_summary s on s.vehicle_id = v.id
union all
select e.vehicle_id, c.cost_group, sum(e.amount)
from expenses e
join categories c on c.id = e.category_id
where e.deleted_at is null
group by e.vehicle_id, c.cost_group;

-- Custo por km: SOMENTE custo de uso (todo o livro-caixa). Entrada e parcelas ficam fora.
create or replace view v_cost_per_km with (security_invoker = true) as
select v.id as vehicle_id,
       coalesce(u.usage_cost, 0) as usage_cost,
       r.driven_km,
       case when coalesce(r.driven_km, 0) > 0
            then round(coalesce(u.usage_cost, 0) / r.driven_km, 4) end as cost_per_km,
       case when coalesce(r.driven_km, 0) > 0
            then round(coalesce(u.usage_cost, 0) / r.driven_km * 1000, 2) end as cost_per_1000km
from vehicles v
left join (
  select vehicle_id, sum(amount) as usage_cost
  from expenses where deleted_at is null group by vehicle_id
) u on u.vehicle_id = v.id
left join v_odometer_range r on r.vehicle_id = v.id;

-- Gasto diário (livro-caixa + parcelas pagas no dia)
create or replace view v_daily_spend with (security_invoker = true) as
select vehicle_id, day, sum(amount) as amount, sum(amount) filter (where kind = 'gasto') as expenses_amount
from (
  select vehicle_id, occurred_on as day, amount, 'gasto'::text as kind
  from expenses where deleted_at is null
  union all
  select vehicle_id, paid_at, amount, 'parcela'
  from installments where paid_at is not null
) x
group by vehicle_id, day;

-- Gasto mensal por categoria (parcelas aparecem como categoria própria)
create or replace view v_monthly_spend with (security_invoker = true) as
select e.vehicle_id, date_trunc('month', e.occurred_on)::date as month, c.slug as category, sum(e.amount) as amount
from expenses e join categories c on c.id = e.category_id
where e.deleted_at is null
group by 1, 2, 3
union all
select vehicle_id, date_trunc('month', paid_at)::date, 'parcelas', sum(amount)
from installments where paid_at is not null
group by 1, 2;

-- Consumo: tanque cheio a tanque cheio
create or replace view v_fuel_efficiency with (security_invoker = true) as
with full_fills as (
  select e.vehicle_id, e.occurred_on, e.odometer, f.liters, f.full_tank, e.id,
         sum(f.liters) over (partition by e.vehicle_id order by e.occurred_on, e.odometer
                             rows between unbounded preceding and current row) as cum_liters
  from expenses e join fuel_records f on f.expense_id = e.id
  where e.deleted_at is null and e.odometer is not null
), marks as (
  select *, lag(odometer) over w as prev_km, lag(cum_liters) over w as prev_cum
  from full_fills where full_tank
  window w as (partition by vehicle_id order by occurred_on, odometer)
)
select vehicle_id, occurred_on, odometer,
       (odometer - prev_km) as km,
       (cum_liters - prev_cum) as liters,
       round((odometer - prev_km) / nullif(cum_liters - prev_cum, 0), 2) as km_per_liter
from marks
where prev_km is not null;

do $$
declare v text;
begin
  foreach v in array array['v_installment_summary','v_odometer_range','v_cost_breakdown',
    'v_cost_per_km','v_daily_spend','v_monthly_spend','v_fuel_efficiency']
  loop
    execute format('revoke all on table %I from anon, authenticated', v);
  end loop;
end $$;
