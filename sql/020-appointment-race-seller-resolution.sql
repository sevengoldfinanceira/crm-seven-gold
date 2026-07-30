-- Corrige a atribuicao de pontos da Corrida de Agendamentos.
-- appointments.usuario_id referencia auth.users, enquanto o ranking usa crm_users.
-- O responsavel do lead (assigned_to_email) tem prioridade sobre o usuario que
-- executou a operacao. Compativel com as migracoes 013 e 018.

create index if not exists appointments_race_assignee_created_idx
  on public.appointments ((lower(trim(assigned_to_email))), created_at)
  where assigned_to_email is not null;

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
      (
        select au.id
        from auth.users au
        where lower(trim(au.email)) = lower(trim(u.email))
        order by au.created_at asc
        limit 1
      )::uuid as auth_user_id,
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
  mapped_appointments as (
    select
      coalesce(assigned_seller.user_id, actor_seller.user_id) as user_id,
      coalesce(
        a.lead_id::text,
        nullif(regexp_replace(coalesce(a.telefone_cliente, ''), '\D', '', 'g'), ''),
        nullif(lower(trim(coalesce(a.nome_cliente, ''))), '')
      ) as client_key,
      a.created_at
    from public.appointments a
    left join sellers assigned_seller
      on assigned_seller.user_email = lower(trim(coalesce(a.assigned_to_email, '')))
    left join sellers actor_seller
      on actor_seller.auth_user_id = a.usuario_id
    where (a.created_at at time zone 'America/Sao_Paulo')::date = p_race_date
      and coalesce(lower(a.status), '') not in ('cancelado', 'cancelled', 'deleted', 'excluido')
  ),
  valid_appointments as (
    select distinct on (a.user_id, a.client_key)
      a.user_id,
      a.client_key,
      a.created_at
    from mapped_appointments a
    where a.user_id is not null
      and a.client_key is not null
    order by a.user_id, a.client_key, a.created_at asc
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

revoke all on function public.appointment_race_valid_counts(date, integer)
  from public, anon, authenticated;

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

drop trigger if exists appointments_touch_appointment_race on public.appointments;
create trigger appointments_touch_appointment_race
after insert or update or delete on public.appointments
for each row execute function public.appointment_race_touch_from_appointments();

revoke all on function public.appointment_race_touch_from_appointments()
  from public, anon, authenticated;

update public.appointment_races
set updated_at = now()
where organization_id = 'seven_gold'
  and race_date = public.appointment_race_today_sp();
