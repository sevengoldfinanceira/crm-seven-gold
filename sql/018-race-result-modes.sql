-- Modos de resultado da Corrida: agendamentos ou clientes fechados.
-- Execute depois dos arquivos 013-appointment-races.sql, 014-sales-module.sql e 015-sales-attendant.sql.

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

alter table public.appointment_races
add column if not exists race_mode text not null default 'appointments';

alter table public.appointment_races
add column if not exists appointment_target integer;

alter table public.appointment_races
add column if not exists closed_clients_target integer;

update public.appointment_races
set
  race_mode = case
    when lower(trim(coalesce(race_mode, ''))) in ('closed_clients', 'clientes_fechados', 'clientes-fechados') then 'closed_clients'
    else 'appointments'
  end,
  appointment_target = coalesce(appointment_target, target, 10),
  closed_clients_target = coalesce(closed_clients_target, 5);

alter table public.appointment_races
alter column race_mode set default 'appointments';

alter table public.appointment_races
alter column appointment_target set default 10;

alter table public.appointment_races
alter column appointment_target set not null;

alter table public.appointment_races
alter column closed_clients_target set default 5;

alter table public.appointment_races
alter column closed_clients_target set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointment_races'::regclass
      and conname = 'appointment_races_race_mode_check'
  ) then
    alter table public.appointment_races
    add constraint appointment_races_race_mode_check
    check (race_mode in ('appointments', 'closed_clients'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointment_races'::regclass
      and conname = 'appointment_races_appointment_target_check'
  ) then
    alter table public.appointment_races
    add constraint appointment_races_appointment_target_check
    check (appointment_target > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointment_races'::regclass
      and conname = 'appointment_races_closed_clients_target_check'
  ) then
    alter table public.appointment_races
    add constraint appointment_races_closed_clients_target_check
    check (closed_clients_target > 0);
  end if;
end $$;

create index if not exists appointment_races_mode_idx
  on public.appointment_races (organization_id, race_date, race_mode);

create index if not exists sales_race_checked_idx
  on public.sales (organization_id, status, seller_id, checked_at, closed_at);

create or replace function public.appointment_race_normalize_mode(
  p_mode text default 'appointments'
)
returns text
language sql
immutable
as $$
  select case
    when lower(trim(coalesce(p_mode, ''))) in ('closed_clients', 'clientes_fechados', 'clientes-fechados') then 'closed_clients'
    else 'appointments'
  end;
$$;

create or replace function public.appointment_race_selected_target(
  p_race public.appointment_races
)
returns integer
language sql
stable
as $$
  select greatest(
    1,
    case
      when public.appointment_race_normalize_mode(p_race.race_mode) = 'closed_clients'
        then coalesce(p_race.closed_clients_target, p_race.target, 5)
      else coalesce(p_race.appointment_target, p_race.target, 10)
    end
  );
$$;

create or replace function public.appointment_race_closed_client_counts(
  p_race_date date,
  p_target integer,
  p_organization_id text default 'seven_gold'
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
        'coordenador-comercial', 'supervisor-comercial',
        'vendedor', 'assistente-vendas', 'home-office'
      )
  ),
  checked_sales as (
    select distinct on (sp.seller_id, sp.client_key)
      sp.seller_id::uuid as user_id,
      sp.client_key,
      sp.result_at
    from (
      select
        s.seller_id,
        s.lead_id,
        s.client_name,
        s.client_phone,
        s.created_at,
        coalesce(
          s.checked_at,
          ((s.closed_at::timestamp + coalesce(s.closed_time, time '00:00')) at time zone 'America/Sao_Paulo'),
          s.created_at
        ) as result_at,
        coalesce(
          s.lead_id::text,
          nullif(regexp_replace(coalesce(s.client_phone, ''), '\D', '', 'g'), ''),
          lower(trim(coalesce(s.client_name, '')))
        ) as client_key
      from public.sales s
      where s.organization_id = p_organization_id
        and s.seller_id is not null
        and s.status = 'checked'
    ) sp
    where (sp.result_at at time zone 'America/Sao_Paulo')::date = p_race_date
      and sp.client_key is not null
    order by sp.seller_id, sp.client_key, sp.result_at asc, sp.created_at asc
  ),
  numbered as (
    select
      cs.*,
      row_number() over (partition by cs.user_id order by cs.result_at asc) as rn
    from checked_sales cs
  ),
  counted as (
    select
      n.user_id,
      count(*)::integer as appointment_count,
      max(n.result_at) as latest_point_at,
      min(n.result_at) filter (where n.rn = p_target) as completion_at
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

create or replace function public.appointment_race_counts(
  p_race_date date,
  p_target integer,
  p_race_mode text default 'appointments',
  p_organization_id text default 'seven_gold'
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
language plpgsql
stable
as $$
begin
  if public.appointment_race_normalize_mode(p_race_mode) = 'closed_clients' then
    return query
      select *
      from public.appointment_race_closed_client_counts(p_race_date, p_target, p_organization_id);
    return;
  end if;

  return query
    select *
    from public.appointment_race_valid_counts(p_race_date, p_target);
end;
$$;

create or replace function public.ensure_weekday_appointment_race(
  p_organization_id text default 'seven_gold'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := public.appointment_race_today_sp();
  v_previous public.appointment_races%rowtype;
  v_mode text := 'appointments';
  v_appointment_target integer := 10;
  v_closed_clients_target integer := 5;
  v_selected_target integer := 10;
begin
  if extract(isodow from v_today) not between 1 and 5 then
    return;
  end if;

  select *
  into v_previous
  from public.appointment_races r
  where r.organization_id = p_organization_id
    and r.race_date < v_today
    and extract(isodow from r.race_date) between 1 and 5
  order by r.race_date desc, r.updated_at desc
  limit 1;

  v_mode := public.appointment_race_normalize_mode(coalesce(v_previous.race_mode, 'appointments'));
  v_appointment_target := greatest(1, coalesce(v_previous.appointment_target, case when v_mode = 'appointments' then v_previous.target end, 10));
  v_closed_clients_target := greatest(1, coalesce(v_previous.closed_clients_target, case when v_mode = 'closed_clients' then v_previous.target end, 5));
  v_selected_target := case when v_mode = 'closed_clients' then v_closed_clients_target else v_appointment_target end;

  insert into public.appointment_races (
    organization_id, race_date, target, race_mode, appointment_target, closed_clients_target, status, created_by
  )
  values (
    p_organization_id, v_today, v_selected_target, v_mode, v_appointment_target, v_closed_clients_target, 'active', null
  )
  on conflict (organization_id, race_date) do nothing;
end;
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
  v_mode text := 'appointments';
  v_target integer := 10;
  v_participants jsonb := '[]'::jsonb;
begin
  perform public.ensure_weekday_appointment_race(p_organization_id);

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

  v_mode := public.appointment_race_normalize_mode(v_race.race_mode);
  v_target := public.appointment_race_selected_target(v_race);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', c.user_id,
      'name', c.user_name,
      'email', c.user_email,
      'role', c.user_role,
      'count', c.appointment_count,
      'progress', least(100, round((c.appointment_count::numeric / greatest(v_target, 1)) * 100, 1)),
      'missing', greatest(v_target - c.appointment_count, 0),
      'latest_point_at', c.latest_point_at,
      'completion_at', c.completion_at
    )
    order by c.appointment_count desc, c.completion_at asc nulls last, c.latest_point_at asc nulls last, c.user_name asc
  ), '[]'::jsonb)
  into v_participants
  from public.appointment_race_counts(v_race.race_date, v_target, v_mode, p_organization_id) c;

  return jsonb_build_object(
    'race', to_jsonb(v_race) || jsonb_build_object(
      'race_mode', v_mode,
      'target', v_target,
      'selected_target', v_target
    ),
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
  v_mode text := 'appointments';
  v_target integer := 10;
  v_winner record;
begin
  perform public.ensure_weekday_appointment_race(p_organization_id);

  select *
  into v_race
  from public.appointment_races
  where organization_id = p_organization_id
    and race_date = v_today
  for update;

  if v_race.id is null or v_race.status = 'cancelled' then
    return public.get_daily_appointment_race(p_organization_id);
  end if;

  v_mode := public.appointment_race_normalize_mode(v_race.race_mode);
  v_target := public.appointment_race_selected_target(v_race);

  select *
  into v_winner
  from public.appointment_race_counts(v_race.race_date, v_target, v_mode, p_organization_id)
  where appointment_count >= v_target
    and completion_at is not null
  order by completion_at asc, user_name asc
  limit 1;

  if v_winner.user_id is not null then
    update public.appointment_races
    set
      target = v_target,
      status = 'finished',
      winner_user_id = v_winner.user_id,
      won_at = v_winner.completion_at,
      updated_at = now()
    where id = v_race.id
      and (
        target is distinct from v_target
        or status is distinct from 'finished'
        or winner_user_id is distinct from v_winner.user_id
        or won_at is distinct from v_winner.completion_at
      );
  else
    update public.appointment_races
    set
      target = v_target,
      status = 'active',
      winner_user_id = null,
      won_at = null,
      updated_at = now()
    where id = v_race.id
      and (
        target is distinct from v_target
        or status is distinct from 'active'
        or winner_user_id is not null
        or won_at is not null
      );
  end if;

  return public.get_daily_appointment_race(p_organization_id);
end;
$$;

drop function if exists public.upsert_daily_appointment_race(integer, text);
drop function if exists public.upsert_daily_appointment_race(integer, text, text, integer, integer);

create function public.upsert_daily_appointment_race(
  p_target integer default null,
  p_organization_id text default 'seven_gold',
  p_race_mode text default 'appointments',
  p_appointment_target integer default null,
  p_closed_clients_target integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := public.appointment_race_today_sp();
  v_existing public.appointment_races%rowtype;
  v_mode text := public.appointment_race_normalize_mode(p_race_mode);
  v_appointment_target integer;
  v_closed_clients_target integer;
  v_selected_target integer;
begin
  if not public.appointment_race_is_admin() then
    raise exception 'Apenas administradores podem iniciar a corrida.';
  end if;

  select *
  into v_existing
  from public.appointment_races r
  where r.organization_id = p_organization_id
    and r.race_date <= v_today
  order by r.race_date desc, r.updated_at desc
  limit 1;

  v_appointment_target := coalesce(
    nullif(p_appointment_target, 0),
    case when v_mode = 'appointments' then nullif(p_target, 0) end,
    v_existing.appointment_target,
    case when public.appointment_race_normalize_mode(v_existing.race_mode) = 'appointments' then v_existing.target end,
    10
  );
  v_closed_clients_target := coalesce(
    nullif(p_closed_clients_target, 0),
    case when v_mode = 'closed_clients' then nullif(p_target, 0) end,
    v_existing.closed_clients_target,
    case when public.appointment_race_normalize_mode(v_existing.race_mode) = 'closed_clients' then v_existing.target end,
    5
  );

  if v_appointment_target <= 0 then
    raise exception 'Informe uma meta de agendamentos maior que zero.';
  end if;
  if v_closed_clients_target <= 0 then
    raise exception 'Informe uma meta de clientes fechados maior que zero.';
  end if;

  v_selected_target := case when v_mode = 'closed_clients' then v_closed_clients_target else v_appointment_target end;

  insert into public.appointment_races (
    organization_id, race_date, target, race_mode, appointment_target, closed_clients_target, status, winner_user_id, won_at, created_by
  )
  values (
    p_organization_id, v_today, v_selected_target, v_mode, v_appointment_target, v_closed_clients_target, 'active', null, null, auth.uid()
  )
  on conflict (organization_id, race_date)
  do update set
    target = excluded.target,
    race_mode = excluded.race_mode,
    appointment_target = excluded.appointment_target,
    closed_clients_target = excluded.closed_clients_target,
    status = 'active',
    winner_user_id = null,
    won_at = null,
    updated_at = now();

  return public.finish_appointment_race_if_needed(p_organization_id);
end;
$$;

drop function if exists public.restart_daily_appointment_race(integer, text);
drop function if exists public.restart_daily_appointment_race(integer, text, text, integer, integer);

create function public.restart_daily_appointment_race(
  p_target integer default null,
  p_organization_id text default 'seven_gold',
  p_race_mode text default null,
  p_appointment_target integer default null,
  p_closed_clients_target integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := public.appointment_race_today_sp();
  v_existing public.appointment_races%rowtype;
  v_mode text := 'appointments';
  v_appointment_target integer;
  v_closed_clients_target integer;
  v_selected_target integer;
begin
  if not public.appointment_race_is_admin() then
    raise exception 'Apenas administradores podem reiniciar a corrida.';
  end if;

  select *
  into v_existing
  from public.appointment_races r
  where r.organization_id = p_organization_id
    and r.race_date <= v_today
  order by r.race_date desc, r.updated_at desc
  limit 1;

  v_mode := case
    when nullif(trim(coalesce(p_race_mode, '')), '') is null
      then public.appointment_race_normalize_mode(coalesce(v_existing.race_mode, 'appointments'))
    else public.appointment_race_normalize_mode(p_race_mode)
  end;

  v_appointment_target := coalesce(
    nullif(p_appointment_target, 0),
    case when v_mode = 'appointments' then nullif(p_target, 0) end,
    v_existing.appointment_target,
    case when public.appointment_race_normalize_mode(v_existing.race_mode) = 'appointments' then v_existing.target end,
    10
  );
  v_closed_clients_target := coalesce(
    nullif(p_closed_clients_target, 0),
    case when v_mode = 'closed_clients' then nullif(p_target, 0) end,
    v_existing.closed_clients_target,
    case when public.appointment_race_normalize_mode(v_existing.race_mode) = 'closed_clients' then v_existing.target end,
    5
  );

  if v_appointment_target <= 0 then
    raise exception 'Informe uma meta de agendamentos maior que zero.';
  end if;
  if v_closed_clients_target <= 0 then
    raise exception 'Informe uma meta de clientes fechados maior que zero.';
  end if;

  v_selected_target := case when v_mode = 'closed_clients' then v_closed_clients_target else v_appointment_target end;

  insert into public.appointment_races (
    organization_id, race_date, target, race_mode, appointment_target, closed_clients_target, status, winner_user_id, won_at, created_by
  )
  values (
    p_organization_id, v_today, v_selected_target, v_mode, v_appointment_target, v_closed_clients_target, 'active', null, null, auth.uid()
  )
  on conflict (organization_id, race_date)
  do update set
    target = excluded.target,
    race_mode = excluded.race_mode,
    appointment_target = excluded.appointment_target,
    closed_clients_target = excluded.closed_clients_target,
    status = 'active',
    winner_user_id = null,
    won_at = null,
    updated_at = now();

  return public.finish_appointment_race_if_needed(p_organization_id);
end;
$$;

create or replace function public.appointment_race_touch_from_appointments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.appointment_races
  set updated_at = now()
  where organization_id = 'seven_gold'
    and race_date = public.appointment_race_today_sp();

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.appointment_race_touch_from_sales()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id text;
begin
  if tg_op = 'DELETE' then
    v_organization_id := coalesce(old.organization_id, 'seven_gold');
  else
    v_organization_id := coalesce(new.organization_id, 'seven_gold');
  end if;

  update public.appointment_races
  set updated_at = now()
  where organization_id = v_organization_id
    and race_date = public.appointment_race_today_sp();

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_touch_appointment_race on public.appointments;
create trigger appointments_touch_appointment_race
after insert or update or delete on public.appointments
for each row execute function public.appointment_race_touch_from_appointments();

drop trigger if exists sales_touch_appointment_race on public.sales;
create trigger sales_touch_appointment_race
after insert or update or delete on public.sales
for each row execute function public.appointment_race_touch_from_sales();

revoke all on function public.appointment_race_normalize_mode(text) from public, anon, authenticated;
revoke all on function public.appointment_race_selected_target(public.appointment_races) from public, anon, authenticated;
revoke all on function public.appointment_race_valid_counts(date, integer) from public, anon, authenticated;
revoke all on function public.appointment_race_closed_client_counts(date, integer, text) from public, anon, authenticated;
revoke all on function public.appointment_race_counts(date, integer, text, text) from public, anon, authenticated;
revoke all on function public.ensure_weekday_appointment_race(text) from public, anon, authenticated;
revoke all on function public.appointment_race_touch_from_appointments() from public, anon, authenticated;
revoke all on function public.appointment_race_touch_from_sales() from public, anon, authenticated;
revoke all on function public.upsert_daily_appointment_race(integer, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.restart_daily_appointment_race(integer, text, text, integer, integer) from public, anon, authenticated;

grant execute on function public.get_daily_appointment_race(text) to authenticated;
grant execute on function public.finish_appointment_race_if_needed(text) to authenticated;
grant execute on function public.upsert_daily_appointment_race(integer, text, text, integer, integer) to authenticated;
grant execute on function public.restart_daily_appointment_race(integer, text, text, integer, integer) to authenticated;
grant execute on function public.cancel_daily_appointment_race(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.sales;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
