-- 0006_app_completo — categorias com cor, categorias personalizadas, manutenção, parcelas e agenda.
-- Só adiciona colunas, linhas de categorias e funções. Nenhum dado existente é removido.

-- ---------- categorias ----------
alter table categories add column if not exists color text not null default '#6ef095';
alter table categories add column if not exists is_custom boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'categories_color_hex') then
    alter table categories add constraint categories_color_hex check (color ~ '^#[0-9a-fA-F]{6}$');
  end if;
end $$;

-- cores das categorias padrão (só onde a cor ainda é a padrão da coluna)
update categories c set color = v.color
from (values
  ('manutencao','#5cd6ff'), ('seguro','#b49cff'), ('documentacao','#ffc35a'), ('pneus','#9aa8c7'),
  ('estetica','#ff8fd1'), ('modificacoes','#ff8a5c'), ('estacionamento','#7aa7ff'), ('pedagio','#e8d66f'),
  ('multas','#ff5a4e'), ('outros','#a9b8ae')
) as v(slug, color)
where c.slug = v.slug and c.is_custom = false and c.color = '#6ef095';

insert into categories (slug, name, icon, cost_group, sort, color) values
  ('ipva',          'IPVA',                       'file',    'documentacao', 12, '#ffb347'),
  ('licenciamento', 'Licenciamento',              'badge',   'documentacao', 13, '#f5d76e'),
  ('lavagem',       'Lavagem',                    'droplet', 'estetica',     14, '#7fdcff'),
  ('oleo',          'Troca de óleo',              'oil',     'manutencao',   15, '#e0b15e'),
  ('revisao',       'Revisão',                    'check',   'manutencao',   16, '#4fd1c5'),
  ('pecas',         'Peças',                      'tool',    'manutencao',   17, '#9fb4ff'),
  ('alinhamento',   'Alinhamento e balanceamento','target',  'manutencao',   18, '#79e0a8'),
  ('acessorios',    'Acessórios',                 'star',    'modificacoes', 19, '#ff9f6e'),
  ('guincho',       'Guincho e socorro',          'truck',   'outros',       20, '#ff6b8a')
on conflict (slug) do nothing;

-- ---------- agenda: exclusão lógica ----------
alter table scheduled_events add column if not exists deleted_at timestamptz;

-- ---------- manutenção em uma transação ----------
create or replace function save_maintenance(
  p_vehicle uuid, p_date date, p_km int, p_category uuid, p_system text, p_service text,
  p_parts numeric, p_labor numeric, p_vendor text, p_note text, p_next_date date, p_next_km int
) returns uuid
language plpgsql set search_path = public as $$
declare
  exp uuid;
  total numeric := coalesce(p_parts, 0) + coalesce(p_labor, 0);
begin
  if total < 0 then raise exception 'valor_invalido'; end if;
  insert into expenses (vehicle_id, category_id, occurred_on, amount, odometer, vendor, note)
  values (p_vehicle, coalesce(p_category, (select id from categories where slug = 'manutencao')),
          p_date, total, p_km, p_vendor, p_note)
  returning id into exp;

  insert into maintenance_records (expense_id, system, service, parts_cost, labor_cost, next_due_date, next_due_km)
  values (exp, p_system, p_service, coalesce(p_parts, 0), coalesce(p_labor, 0), p_next_date, p_next_km);

  if p_next_date is not null or p_next_km is not null then
    insert into scheduled_events (vehicle_id, kind, title, due_date, due_km, expense_id)
    values (p_vehicle,
            case when p_service ilike '%óleo%' or p_service ilike '%oleo%' then 'oleo' else 'manutencao' end,
            p_service, p_next_date, p_next_km, exp);
  end if;
  return exp;
end $$;

-- ---------- plano de parcelas ----------
create or replace function create_installment_plan(
  p_vehicle uuid, p_price numeric, p_down numeric, p_count int, p_amount numeric,
  p_first_due date, p_paid int default 0, p_purchase_date date default null
) returns int
language plpgsql set search_path = public as $$
declare
  start_n int;
begin
  if p_count < 1 or p_count > 240 then raise exception 'quantidade_invalida'; end if;
  if p_amount <= 0 then raise exception 'valor_invalido'; end if;
  update vehicles set purchase_price = p_price, down_payment = p_down,
         purchase_date = coalesce(p_purchase_date, purchase_date)
   where id = p_vehicle;
  select coalesce(max(number), 0) into start_n from installments where vehicle_id = p_vehicle;
  insert into installments (vehicle_id, number, amount, due_date, paid_at)
  select p_vehicle, start_n + g, p_amount,
         (p_first_due + make_interval(months => g - 1))::date,
         case when g <= coalesce(p_paid, 0) then (p_first_due + make_interval(months => g - 1))::date end
    from generate_series(1, p_count) as g;
  return p_count;
end $$;

-- ---------- concluir lembrete (e criar o próximo, se repetir) ----------
create or replace function complete_event(p_event uuid, p_km int default null) returns uuid
language plpgsql set search_path = public as $$
declare
  e scheduled_events%rowtype;
  nid uuid;
begin
  update scheduled_events set done_at = now()
   where id = p_event and done_at is null and deleted_at is null
  returning * into e;
  if not found then raise exception 'evento_nao_encontrado'; end if;

  if e.repeat_months is not null or e.repeat_km is not null then
    insert into scheduled_events (vehicle_id, kind, title, due_date, due_km, repeat_months, repeat_km, note)
    values (e.vehicle_id, e.kind, e.title,
            case when e.repeat_months is not null
                 then (coalesce(e.due_date, current_date) + make_interval(months => e.repeat_months))::date end,
            case when e.repeat_km is not null then coalesce(p_km, e.due_km, 0) + e.repeat_km end,
            e.repeat_months, e.repeat_km, e.note)
    returning id into nid;
  end if;
  return nid;
end $$;

revoke all on function save_maintenance(uuid,date,int,uuid,text,text,numeric,numeric,text,text,date,int) from public, anon, authenticated;
revoke all on function create_installment_plan(uuid,numeric,numeric,int,numeric,date,int,date) from public, anon, authenticated;
revoke all on function complete_event(uuid,int) from public, anon, authenticated;
