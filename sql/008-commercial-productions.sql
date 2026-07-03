-- Producoes comerciais mensais e travas de integridade.
create table if not exists public.commercial_productions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  month smallint not null check (month between 1 and 12),
  year integer not null check (year >= 2000),
  starts_at date not null,
  ends_at date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, month),
  check (ends_at >= starts_at)
);

create unique index if not exists commercial_productions_single_open
  on public.commercial_productions (status) where status = 'open';

alter table public.leads add column if not exists production_id uuid references public.commercial_productions(id);
alter table public.leads add column if not exists production_month smallint;
alter table public.leads add column if not exists production_year integer;
alter table public.leads add column if not exists locked_at timestamptz;
alter table public.leads add column if not exists locked_reason text;
alter table public.leads add column if not exists original_lead_id uuid references public.leads(id);

do $$
declare
  current_month date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into public.commercial_productions (name, month, year, starts_at, ends_at, status)
  select
    (array['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'])[extract(month from month_start)::int] || '/' || extract(year from month_start)::int,
    extract(month from month_start)::int,
    extract(year from month_start)::int,
    month_start,
    (month_start + interval '1 month - 1 day')::date,
    case when month_start = current_month then 'open' else 'closed' end
  from (
    select distinct date_trunc('month', coalesce(created_at, now()) at time zone 'America/Sao_Paulo')::date month_start
    from public.leads
    union select current_month
  ) months
  on conflict (year, month) do nothing;

  update public.leads l
  set production_id = p.id,
      production_month = p.month,
      production_year = p.year,
      locked_at = case when p.status = 'closed' then coalesce(l.locked_at, now()) else l.locked_at end,
      locked_reason = case when p.status = 'closed' then coalesce(l.locked_reason, 'Produção comercial encerrada.') else l.locked_reason end
  from public.commercial_productions p
  where l.production_id is null
    and p.year = extract(year from coalesce(l.created_at, now()) at time zone 'America/Sao_Paulo')::int
    and p.month = extract(month from coalesce(l.created_at, now()) at time zone 'America/Sao_Paulo')::int;
end $$;

create or replace function public.assign_open_production_to_lead()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.commercial_productions%rowtype;
begin
  select * into p from public.commercial_productions where status = 'open' order by starts_at desc limit 1;
  if p.id is null then
    raise exception 'Não existe produção aberta. Peça ao Diretor-CEO para iniciar uma nova produção.';
  end if;
  new.production_id := p.id;
  new.production_month := p.month;
  new.production_year := p.year;
  new.locked_at := null;
  new.locked_reason := null;
  return new;
end $$;

create or replace function public.guard_closed_production_lead()
returns trigger language plpgsql security definer set search_path = public as $$
declare p_status text;
begin
  select status into p_status from public.commercial_productions where id = old.production_id;
  if p_status = 'closed' then
    raise exception 'Não é possível alterar lead de uma produção encerrada.';
  end if;
  if tg_op = 'UPDATE' and new.production_id is distinct from old.production_id then
    raise exception 'Não é permitido mover um lead entre produções.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists leads_assign_open_production on public.leads;
create trigger leads_assign_open_production before insert on public.leads
for each row execute function public.assign_open_production_to_lead();
drop trigger if exists leads_guard_closed_production on public.leads;
create trigger leads_guard_closed_production before update or delete on public.leads
for each row execute function public.guard_closed_production_lead();

create or replace function public.guard_closed_production_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare linked_lead uuid := coalesce(new.lead_id, old.lead_id); p_status text;
begin
  if linked_lead is not null then
    select p.status into p_status from public.leads l join public.commercial_productions p on p.id = l.production_id where l.id = linked_lead;
    if p_status = 'closed' then raise exception 'Não é possível alterar agendamento de uma produção encerrada.'; end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists appointments_guard_closed_production on public.appointments;
create trigger appointments_guard_closed_production before insert or update or delete on public.appointments
for each row execute function public.guard_closed_production_appointment();

create or replace function public.close_commercial_production(target_id uuid, actor_id uuid)
returns public.commercial_productions language plpgsql security definer set search_path = public as $$
declare result public.commercial_productions%rowtype;
begin
  update public.leads set locked_at = now(), locked_reason = 'Produção comercial encerrada.'
  where production_id = target_id and locked_at is null;
  update public.commercial_productions
  set status = 'closed', closed_at = now(), closed_by = actor_id, updated_at = now()
  where id = target_id and status = 'open' returning * into result;
  if result.id is null then raise exception 'Produção não encontrada ou já encerrada.'; end if;
  return result;
end $$;

alter table public.commercial_productions enable row level security;
drop policy if exists commercial_productions_authenticated_read on public.commercial_productions;
create policy commercial_productions_authenticated_read on public.commercial_productions for select to authenticated using (true);
revoke all on function public.close_commercial_production(uuid, uuid) from public, anon, authenticated;
grant execute on function public.close_commercial_production(uuid, uuid) to service_role;
grant select on public.commercial_productions to authenticated;
grant all on public.commercial_productions to service_role;
