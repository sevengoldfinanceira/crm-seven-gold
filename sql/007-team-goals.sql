-- Migration 007: Team Goals
-- Creates the team_goals table for monthly team performance targets

create table if not exists public.team_goals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.crm_teams(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2020 and 2099),
  leads_goal integer not null default 0,
  appointments_goal integer not null default 0,
  closings_goal integer not null default 0,
  conversion_goal numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  unique (team_id, month, year)
);

-- Enable RLS
alter table public.team_goals enable row level security;

-- Drop existing policies if any
drop policy if exists "team_goals_select" on public.team_goals;
drop policy if exists "team_goals_insert_admin" on public.team_goals;
drop policy if exists "team_goals_update_admin" on public.team_goals;
drop policy if exists "team_goals_delete_admin" on public.team_goals;

-- SELECT: admin vê tudo, coordenador vê da própria equipe
create policy "team_goals_select"
on public.team_goals
for select
to authenticated
using (
  public.is_crm_admin()
  or exists (
    select 1 from public.crm_teams t
    where t.id = team_goals.team_id
    and t.coordinator_user_id = (
      select id from public.crm_users
      where lower(email) = lower(auth.jwt() ->> 'email')
      limit 1
    )
  )
);

-- INSERT: apenas admin e coordenador
create policy "team_goals_insert_admin"
on public.team_goals
for insert
to authenticated
with check (
  public.is_crm_admin()
  or exists (
    select 1 from public.crm_teams t
    where t.id = team_goals.team_id
    and t.coordinator_user_id = (
      select id from public.crm_users
      where lower(email) = lower(auth.jwt() ->> 'email')
      limit 1
    )
  )
);

-- UPDATE: apenas admin e coordenador da equipe
create policy "team_goals_update_admin"
on public.team_goals
for update
to authenticated
using (
  public.is_crm_admin()
  or exists (
    select 1 from public.crm_teams t
    where t.id = team_goals.team_id
    and t.coordinator_user_id = (
      select id from public.crm_users
      where lower(email) = lower(auth.jwt() ->> 'email')
      limit 1
    )
  )
)
with check (
  public.is_crm_admin()
  or exists (
    select 1 from public.crm_teams t
    where t.id = team_goals.team_id
    and t.coordinator_user_id = (
      select id from public.crm_users
      where lower(email) = lower(auth.jwt() ->> 'email')
      limit 1
    )
  )
);

-- DELETE: apenas admin
create policy "team_goals_delete_admin"
on public.team_goals
for delete
to authenticated
using (public.is_crm_admin());

-- Index for fast lookups
create index if not exists idx_team_goals_team_month
on public.team_goals (team_id, month, year);
