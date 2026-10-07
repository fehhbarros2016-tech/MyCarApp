-- 0005_function_search_path — fixa o search_path das funções (aviso de segurança do Supabase).
-- Só altera configuração das funções; nenhuma tabela ou dado é tocado.
alter function public.trg_expense_odometer() set search_path = public;
alter function public.record_fuel_fill(uuid,date,int,numeric,numeric,numeric,text,text,smallint,smallint,text,text) set search_path = public;
alter function public.save_fuel_fill(uuid,date,int,numeric,numeric,numeric,text,text,numeric,numeric,text,text) set search_path = public;
