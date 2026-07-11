-- Corrida diaria de agendamentos do CRM Seven Gold.
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

create table if not exists public.appointment_races (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null default 'seven_gold',
  race_date date not null,
  target integer not null default 10 check (target > 0),
  status text not null default 'active' check (status in ('active', 'finished', 'cancelled')),
  winner_user_id uuid,
  won_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, race_date)
);

create index if not exists appointment_races_date_idx
  on public.appointment_races (organization_id, race_date);

create index if not exists appointment_races_winner_idx
  on public.appointment_races (winner_user_id);

create or replace function public.set_appointment_races_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists appointment_races_set_updated_at on public.appointment_races;
create trigger appointment_races_set_updated_at
before update on public.appointment_races
for each row execute function public.set_appointment_races_updated_at();

create or replace function public.appointment_race_current_email()
returns text
language sql
stable
as $$
  select lower(nullif(trim(coalesce(auth.jwt() ->> 'email', '')), ''));
$$;

create or replace function public.appointment_race_is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.crm_users u
    where lower(trim(u.email)) = public.appointment_race_current_email()
      and coalesce(u.ativo, false) = true
      and lower(regexp_replace(unaccent(coalesce(u.cargo, '')), '[^a-z0-9]+', '-', 'g')) in (
        'diretor-ceo', 'dono', 'admin', 'administrador'
      )
  );
$$;

create or replace function public.appointment_race_today_sp()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

create or replace function public.appointment_race_valid_counts(
  p_race_date date,
  p_target integer
)
returns table (
  user_id uuid,
  user_name text,
  user_email text,
  user_role text,
  appointment_count integer,
  latest_point_at timestamptz,
  completion_at timestamptz
)
language sql
stable
as $$
  with sellers as (
    select
      u.id::uuid as user_id,
      coalesce(nullif(trim(u.nome), ''), u.email) as user_name,
      lower(trim(u.email)) as user_email,
      coalesce(u.cargo, '') as user_role
    from public.crm_users u
    where coalesce(u.ativo, false) = true
      and lower(regexp_replace(unaccent(coalesce(u.cargo, '')), '[^a-z0-9]+', '-', 'g')) in (
        'diretor-ceo', 'dono', 'administrador',
        'coordenador-comercial', 'supervisor-comercial',
        'vendedor', 'assistente-vendas', 'home-office'
      )
  ),
  valid_appointments as (
    select distinct on (
      a.usuario_id,
      coalesce(
        a.lead_id::text,
        nullif(regexp_replace(coalesce(a.telefone_cliente, ''), '\D', '', 'g'), ''),
        lower(trim(coalesce(a.nome_cliente, '')))
      )
    )
      a.usuario_id::uuid as user_id,
      coalesce(
        a.lead_id::text,
        nullif(regexp_replace(coalesce(a.telefone_cliente, ''), '\D', '', 'g'), ''),
        lower(trim(coalesce(a.nome_cliente, '')))
      ) as client_key,
      a.created_at
    from public.appointments a
    where (a.created_at at time zone 'America/Sao_Paulo')::date = p_race_date
      and a.usuario_id is not null
      and coalesce(lower(a.status), '') not in ('cancelado', 'cancelled', 'deleted', 'excluido')
      and coalesce(
        a.lead_id::text,
        nullif(regexp_replace(coalesce(a.telefone_cliente, ''), '\D', '', 'g'), ''),
        lower(trim(coalesce(a.nome_cliente, '')))
      ) is not null
    order by
      a.usuario_id,
      coalesce(
        a.lead_id::text,
        nullif(regexp_replace(coalesce(a.telefone_cliente, ''), '\D', '', 'g'), ''),
        lower(trim(coalesce(a.nome_cliente, '')))
      ),
      a.created_at asc
  ),
  numbered as (
    select
      va.*,
      row_number() over (partition by va.user_id order by va.created_at asc) as rn
    from valid_appointments va
  ),
  counted as (
    select
      n.user_id,
      count(*)::integer as appointment_count,
      max(n.created_at) as latest_point_at,
      min(n.created_at) filter (where n.rn = p_target) as completion_at
    from numbered n
    group by n.user_id
  )
  select
    s.user_id,
    s.user_name,
    s.user_email,
    s.user_role,
    coalesce(c.appointment_count, 0)::integer as appointment_count,
    c.latest_point_at,
    c.completion_at
  from sellers s
  left join counted c on c.user_id = s.user_id;
$$;

create or replace function public.get_daily_appointment_race(
  p_organization_id text default 'seven_gold'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := public.appointment_race_today_sp();
  v_race public.appointment_races%rowtype;
  v_participants jsonb := '[]'::jsonb;
begin
  select *
  into v_race
  from public.appointment_races
  where organization_id = p_organization_id
    and race_date = v_today
  limit 1;

  if v_race.id is null then
    return jsonb_build_object(
      'race', null,
      'participants', '[]'::jsonb,
      'server_now', now(),
      'race_date', v_today
    );
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', c.user_id,
      'name', c.user_name,
      'email', c.user_email,
      'role', c.user_role,
      'count', c.appointment_count,
      'progress', least(100, round((c.appointment_count::numeric / greatest(v_race.target, 1)) * 100, 1)),
      'missing', greatest(v_race.target - c.appointment_count, 0),
      'latest_point_at', c.latest_point_at,
      'completion_at', c.completion_at
    )
    order by c.appointment_count desc, c.completion_at asc nulls last, c.latest_point_at asc nulls last, c.user_name asc
  ), '[]'::jsonb)
  into v_participants
  from public.appointment_race_valid_counts(v_race.race_date, v_race.target) c;

  return jsonb_build_object(
    'race', to_jsonb(v_race),
    'participants', v_participants,
    'server_now', now(),
    'race_date', v_today
  );
end;
$$;

create or replace function public.finish_appointment_race_if_needed(
  p_organization_id text default 'seven_gold'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := public.appointment_race_today_sp();
  v_race public.appointment_races%rowtype;
  v_winner record;
begin
  select *
  into v_race
  from public.appointment_races
  where organization_id = p_organization_id
    and race_date = v_today
  for update;

  if v_race.id is null or v_race.status <> 'active' or v_race.winner_user_id is not null then
    return public.get_daily_appointment_race(p_organization_id);
  end if;

  select *
  into v_winner
  from public.appointment_race_valid_counts(v_race.race_date, v_race.target)
  where appointment_count >= v_race.target
    and completion_at is not null
  order by completion_at asc, user_name asc
  limit 1;

  if v_winner.user_id is not null then
    update public.appointment_races
    set
      status = 'finished',
      winner_user_id = v_winner.user_id,
      won_at = v_winner.completion_at,
      updated_at = now()
    where id = v_race.id
      and winner_user_id is null;
  end if;

  return public.get_daily_appointment_race(p_organization_id);
end;
$$;

create or replace function public.upsert_daily_appointment_race(
  p_target integer,
  p_organization_id text default 'seven_gold'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := public.appointment_race_today_sp();
begin
  if not public.appointment_race_is_admin() then
    raise exception 'Apenas administradores podem iniciar a corrida.';
  end if;

  if coalesce(p_target, 0) <= 0 then
    raise exception 'Informe uma meta maior que zero.';
  end if;

  insert into public.appointment_races (organization_id, race_date, target, status, created_by)
  values (p_organization_id, v_today, p_target, 'active', auth.uid())
  on conflict (organization_id, race_date)
  do update set
    target = excluded.target,
    status = case when appointment_races.status = 'cancelled' then 'active' else appointment_races.status end,
    updated_at = now();

  return public.finish_appointment_race_if_needed(p_organization_id);
end;
$$;

create or replace function public.restart_daily_appointment_race(
  p_target integer default null,
  p_organization_id text default 'seven_gold'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := public.appointment_race_today_sp();
begin
  if not public.appointment_race_is_admin() then
    raise exception 'Apenas administradores podem reiniciar a corrida.';
  end if;

  update public.appointment_races
  set
    target = coalesce(nullif(p_target, 0), target),
    status = 'active',
    winner_user_id = null,
    won_at = null,
    updated_at = now()
  where organization_id = p_organization_id
    and race_date = v_today;

  if not found then
    insert into public.appointment_races (organization_id, race_date, target, status, created_by)
    values (p_organization_id, v_today, coalesce(nullif(p_target, 0), 10), 'active', auth.uid());
  end if;

  return public.finish_appointment_race_if_needed(p_organization_id);
end;
$$;

create or replace function public.cancel_daily_appointment_race(
  p_organization_id text default 'seven_gold'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.appointment_race_is_admin() then
    raise exception 'Apenas administradores podem encerrar a corrida.';
  end if;

  update public.appointment_races
  set status = 'cancelled', updated_at = now()
  where organization_id = p_organization_id
    and race_date = public.appointment_race_today_sp();

  return public.get_daily_appointment_race(p_organization_id);
end;
$$;

alter table public.appointment_races enable row level security;

drop policy if exists appointment_races_select_authenticated on public.appointment_races;
drop policy if exists appointment_races_insert_authenticated on public.appointment_races;
drop policy if exists appointment_races_update_authenticated on public.appointment_races;
drop policy if exists appointment_races_delete_authenticated on public.appointment_races;

create policy appointment_races_select_authenticated
on public.appointment_races
for select to authenticated
using (
  exists (
    select 1
    from public.crm_users u
    where lower(trim(u.email)) = public.appointment_race_current_email()
      and coalesce(u.ativo, false) = true
  )
);

revoke all on public.appointment_races from public, anon, authenticated;
grant select on public.appointment_races to authenticated;
grant all on public.appointment_races to service_role;

revoke all on function public.get_daily_appointment_race(text) from public, anon, authenticated;
revoke all on function public.finish_appointment_race_if_needed(text) from public, anon, authenticated;
revoke all on function public.upsert_daily_appointment_race(integer, text) from public, anon, authenticated;
revoke all on function public.restart_daily_appointment_race(integer, text) from public, anon, authenticated;
revoke all on function public.cancel_daily_appointment_race(text) from public, anon, authenticated;

grant execute on function public.get_daily_appointment_race(text) to authenticated;
grant execute on function public.finish_appointment_race_if_needed(text) to authenticated;
grant execute on function public.upsert_daily_appointment_race(integer, text) to authenticated;
grant execute on function public.restart_daily_appointment_race(integer, text) to authenticated;
grant execute on function public.cancel_daily_appointment_race(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.appointment_races;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.appointments;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
