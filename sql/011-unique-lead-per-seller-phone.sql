-- Regra de duplicidade por vendedor + telefone normalizado.
-- Permite o mesmo telefone para vendedores diferentes.
-- Bloqueia o mesmo telefone para o mesmo vendedor fora da Lixeira.
--
-- Antes de aplicar em produção, verifique se já existem duplicados ativos.

create or replace function public.normalize_lead_phone(phone text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(phone, ''), '\D', '', 'g') like '55%'
      and length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) = 13
      then substring(regexp_replace(coalesce(phone, ''), '\D', '', 'g') from 3)
    else regexp_replace(coalesce(phone, ''), '\D', '', 'g')
  end;
$$;

-- Consulta de diagnóstico para rodar antes do índice:
-- select
--   lower(trim(assigned_to_email)) as vendedor,
--   public.normalize_lead_phone(telefone) as telefone_normalizado,
--   count(*) as total,
--   array_agg(id) as lead_ids
-- from public.leads
-- where status <> 'cancelado'
--   and coalesce(trim(assigned_to_email), '') <> ''
--   and public.normalize_lead_phone(telefone) <> ''
-- group by lower(trim(assigned_to_email)), public.normalize_lead_phone(telefone)
-- having count(*) > 1;

create unique index if not exists unique_active_lead_per_seller_phone
on public.leads (
  lower(trim(assigned_to_email)),
  public.normalize_lead_phone(telefone)
)
where status <> 'cancelado'
  and coalesce(trim(assigned_to_email), '') <> ''
  and public.normalize_lead_phone(telefone) <> '';
