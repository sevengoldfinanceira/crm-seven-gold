-- Adiciona o vendedor de atendimento nas vendas.
-- Execute depois do arquivo 014-sales-module.sql.

alter table public.sales
add column if not exists attendant_id uuid;

update public.sales
set attendant_id = seller_id
where attendant_id is null;

alter table public.sales
alter column attendant_id set not null;

create index if not exists sales_attendant_idx on public.sales (attendant_id);

drop function if exists public.save_sale(uuid, text, uuid, uuid, text, text, date, time, numeric, numeric, integer, numeric, numeric, text);
drop function if exists public.save_sale(uuid, text, uuid, uuid, uuid, text, text, date, time, numeric, numeric, integer, numeric, numeric, text);

create or replace function public.save_sale(
  p_sale_id uuid default null,
  p_organization_id text default 'seven_gold',
  p_seller_id uuid default null,
  p_attendant_id uuid default null,
  p_lead_id uuid default null,
  p_client_name text default null,
  p_client_phone text default null,
  p_closed_at date default null,
  p_closed_time time default null,
  p_credit_amount numeric default null,
  p_down_payment_amount numeric default 0,
  p_table_number integer default null,
  p_full_installment_amount numeric default null,
  p_reduced_installment_amount numeric default null,
  p_notes text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.sales_current_user_id();
  v_is_admin boolean := public.sales_is_admin();
  v_existing public.sales;
  v_saved public.sales;
  v_attendant_id uuid := coalesce(p_attendant_id, p_seller_id);
begin
  if v_user_id is null then
    raise exception 'Usuário não autorizado.';
  end if;

  if p_seller_id is null then
    raise exception 'Vendedor obrigatório.';
  end if;

  if v_attendant_id is null then
    raise exception 'Vendedor de atendimento obrigatório.';
  end if;

  if not exists (
    select 1 from public.crm_users
    where id = v_attendant_id
      and coalesce(ativo, false) = true
  ) then
    raise exception 'Vendedor de atendimento inválido ou inativo.';
  end if;

  if not v_is_admin and p_seller_id <> v_user_id then
    raise exception 'Vendedor não pode cadastrar venda para outro vendedor.';
  end if;

  if p_client_name is null or length(trim(p_client_name)) = 0 then
    raise exception 'Nome do cliente obrigatório.';
  end if;

  if p_closed_at is null then
    raise exception 'Data de fechamento obrigatória.';
  end if;

  if p_table_number is null or p_table_number < 1 or p_table_number > 7 then
    raise exception 'Tabela inválida.';
  end if;

  if coalesce(p_credit_amount, -1) < 0
    or coalesce(p_down_payment_amount, 0) < 0
    or coalesce(p_full_installment_amount, -1) < 0
    or coalesce(p_reduced_installment_amount, -1) < 0 then
    raise exception 'Valores financeiros inválidos.';
  end if;

  if p_sale_id is null then
    insert into public.sales (
      organization_id, seller_id, attendant_id, lead_id, client_name, client_phone, closed_at, closed_time,
      status, credit_amount, down_payment_amount, table_number, full_installment_amount,
      reduced_installment_amount, notes, created_by
    )
    values (
      coalesce(nullif(trim(p_organization_id), ''), 'seven_gold'), p_seller_id, v_attendant_id, p_lead_id,
      trim(p_client_name), nullif(trim(coalesce(p_client_phone, '')), ''), p_closed_at, p_closed_time,
      'pending_check', p_credit_amount, coalesce(p_down_payment_amount, 0), p_table_number,
      p_full_installment_amount, p_reduced_installment_amount, p_notes, v_user_id
    )
    returning * into v_saved;

    perform public.sales_log(v_saved.id, 'sale_created', null, to_jsonb(v_saved));
    return v_saved;
  end if;

  select * into v_existing from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  if not v_is_admin then
    if v_existing.seller_id <> v_user_id then
      raise exception 'Você não pode editar venda de outro vendedor.';
    end if;
    if v_existing.status <> 'pending_check' then
      raise exception 'Venda só pode ser editada enquanto aguarda checagem.';
    end if;
    if p_seller_id <> v_existing.seller_id then
      raise exception 'Você não pode trocar o vendedor responsável.';
    end if;
  end if;

  update public.sales
  set seller_id = p_seller_id,
      attendant_id = v_attendant_id,
      lead_id = p_lead_id,
      client_name = trim(p_client_name),
      client_phone = nullif(trim(coalesce(p_client_phone, '')), ''),
      closed_at = p_closed_at,
      closed_time = p_closed_time,
      credit_amount = p_credit_amount,
      down_payment_amount = coalesce(p_down_payment_amount, 0),
      table_number = p_table_number,
      full_installment_amount = p_full_installment_amount,
      reduced_installment_amount = p_reduced_installment_amount,
      notes = p_notes
  where id = p_sale_id
  returning * into v_saved;

  perform public.sales_log(v_saved.id, 'sale_updated', to_jsonb(v_existing), to_jsonb(v_saved));
  return v_saved;
end;
$$;

drop policy if exists sales_select_own_or_admin on public.sales;
create policy sales_select_own_or_admin
on public.sales
for select
to authenticated
using (
  organization_id = 'seven_gold'
  and (
    public.sales_is_admin()
    or seller_id = public.sales_current_user_id()
    or attendant_id = public.sales_current_user_id()
  )
);

drop policy if exists sales_history_select_own_or_admin on public.sales_history;
create policy sales_history_select_own_or_admin
on public.sales_history
for select
to authenticated
using (
  organization_id = 'seven_gold'
  and (
    public.sales_is_admin()
    or sale_id in (
      select id
      from public.sales
      where seller_id = public.sales_current_user_id()
         or attendant_id = public.sales_current_user_id()
    )
  )
);

revoke all on function public.save_sale(uuid, text, uuid, uuid, uuid, text, text, date, time, numeric, numeric, integer, numeric, numeric, text) from public, anon;
grant execute on function public.save_sale(uuid, text, uuid, uuid, uuid, text, text, date, time, numeric, numeric, integer, numeric, numeric, text) to authenticated;
