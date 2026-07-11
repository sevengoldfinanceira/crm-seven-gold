-- Modulo de Vendas do CRM Seven Gold.
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null default 'seven_gold',
  seller_id uuid not null,
  lead_id uuid,
  client_name text not null check (length(trim(client_name)) > 0),
  client_phone text,
  closed_at date not null,
  closed_time time,
  status text not null default 'pending_check' check (status in ('pending_check', 'checked', 'cancelled')),
  credit_amount numeric(14,2) not null check (credit_amount >= 0),
  down_payment_amount numeric(14,2) not null default 0 check (down_payment_amount >= 0),
  table_number integer not null check (table_number between 1 and 7),
  full_installment_amount numeric(14,2) not null check (full_installment_amount >= 0),
  reduced_installment_amount numeric(14,2) not null check (reduced_installment_amount >= 0),
  notes text,
  cancellation_reason text,
  created_by uuid not null,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_history (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null default 'seven_gold',
  sale_id uuid references public.sales(id) on delete set null,
  user_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sales_org_closed_idx on public.sales (organization_id, closed_at desc);
create index if not exists sales_seller_idx on public.sales (seller_id);
create index if not exists sales_status_idx on public.sales (status);
create index if not exists sales_history_sale_idx on public.sales_history (sale_id, created_at desc);

create or replace function public.set_sales_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_sales_updated_at();

create or replace function public.sales_current_email()
returns text
language sql
stable
as $$
  select lower(nullif(trim(coalesce(auth.jwt() ->> 'email', '')), ''));
$$;

create or replace function public.sales_current_user_id()
returns uuid
language sql
stable
as $$
  select u.id
  from public.crm_users u
  where lower(trim(u.email)) = public.sales_current_email()
    and coalesce(u.ativo, false) = true
  limit 1;
$$;

create or replace function public.sales_is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.crm_users u
    where lower(trim(u.email)) = public.sales_current_email()
      and coalesce(u.ativo, false) = true
      and lower(regexp_replace(unaccent(coalesce(u.cargo, '')), '[^a-z0-9]+', '-', 'g')) in (
        'diretor-ceo', 'dono', 'admin', 'administrador'
      )
  );
$$;

create or replace function public.sales_log(
  p_sale_id uuid,
  p_action text,
  p_old_data jsonb default null,
  p_new_data jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org text;
begin
  select organization_id into v_org from public.sales where id = p_sale_id;
  insert into public.sales_history (organization_id, sale_id, user_id, action, old_data, new_data)
  values (coalesce(v_org, 'seven_gold'), p_sale_id, public.sales_current_user_id(), p_action, p_old_data, p_new_data);
end;
$$;

create or replace function public.save_sale(
  p_sale_id uuid default null,
  p_organization_id text default 'seven_gold',
  p_seller_id uuid default null,
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
begin
  if v_user_id is null then
    raise exception 'Usuário não autorizado.';
  end if;

  if p_seller_id is null then
    raise exception 'Vendedor obrigatório.';
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
      organization_id, seller_id, lead_id, client_name, client_phone, closed_at, closed_time,
      status, credit_amount, down_payment_amount, table_number, full_installment_amount,
      reduced_installment_amount, notes, created_by
    )
    values (
      coalesce(nullif(trim(p_organization_id), ''), 'seven_gold'), p_seller_id, p_lead_id,
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

create or replace function public.update_sale_status(
  p_sale_id uuid,
  p_status text,
  p_cancellation_reason text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.sales_current_user_id();
  v_existing public.sales;
  v_saved public.sales;
begin
  if v_user_id is null or not public.sales_is_admin() then
    raise exception 'Somente administrador pode alterar status.';
  end if;

  if p_status not in ('pending_check', 'checked', 'cancelled') then
    raise exception 'Status inválido.';
  end if;

  select * into v_existing from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  update public.sales
  set status = p_status,
      cancellation_reason = case when p_status = 'cancelled' then nullif(trim(coalesce(p_cancellation_reason, '')), '') else cancellation_reason end,
      checked_by = case when p_status = 'checked' then v_user_id when p_status = 'pending_check' then null else checked_by end,
      checked_at = case when p_status = 'checked' then now() when p_status = 'pending_check' then null else checked_at end
  where id = p_sale_id
  returning * into v_saved;

  perform public.sales_log(
    v_saved.id,
    case
      when p_status = 'checked' then 'sale_checked'
      when p_status = 'cancelled' then 'sale_cancelled'
      else 'sale_returned_to_check'
    end,
    to_jsonb(v_existing),
    to_jsonb(v_saved)
  );

  return v_saved;
end;
$$;

create or replace function public.delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.sales;
begin
  if public.sales_current_user_id() is null or not public.sales_is_admin() then
    raise exception 'Somente administrador pode excluir venda.';
  end if;

  select * into v_existing from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  perform public.sales_log(v_existing.id, 'sale_deleted', to_jsonb(v_existing), null);
  delete from public.sales where id = p_sale_id;
end;
$$;

alter table public.sales enable row level security;
alter table public.sales_history enable row level security;

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
      select id from public.sales where seller_id = public.sales_current_user_id()
    )
  )
);

revoke all on public.sales from anon, authenticated;
revoke all on public.sales_history from anon, authenticated;
grant select on public.sales to authenticated;
grant select on public.sales_history to authenticated;
grant all on public.sales to service_role;
grant all on public.sales_history to service_role;

revoke all on function public.save_sale(uuid, text, uuid, uuid, text, text, date, time, numeric, numeric, integer, numeric, numeric, text) from public, anon;
revoke all on function public.update_sale_status(uuid, text, text) from public, anon;
revoke all on function public.delete_sale(uuid) from public, anon;
grant execute on function public.save_sale(uuid, text, uuid, uuid, text, text, date, time, numeric, numeric, integer, numeric, numeric, text) to authenticated;
grant execute on function public.update_sale_status(uuid, text, text) to authenticated;
grant execute on function public.delete_sale(uuid) to authenticated;
