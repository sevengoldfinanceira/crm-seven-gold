-- Seven Gold CRM - Equipes comerciais
-- Execute no SQL Editor do Supabase antes de usar a aba Equipes comerciais.

create extension if not exists pgcrypto;

create table if not exists public.crm_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  coordinator_user_id uuid not null references public.crm_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.crm_teams(id) on delete cascade,
  user_id uuid not null references public.crm_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists crm_team_members_team_id_idx
  on public.crm_team_members(team_id);

create unique index if not exists crm_teams_name_lower_uidx
  on public.crm_teams(lower(name));

alter table public.crm_teams enable row level security;
alter table public.crm_team_members enable row level security;

drop policy if exists "crm_teams_select_authenticated" on public.crm_teams;
create policy "crm_teams_select_authenticated"
  on public.crm_teams for select
  to authenticated
  using (true);

drop policy if exists "crm_team_members_select_authenticated" on public.crm_team_members;
create policy "crm_team_members_select_authenticated"
  on public.crm_team_members for select
  to authenticated
  using (true);

drop policy if exists "crm_teams_manage_authorized" on public.crm_teams;
create policy "crm_teams_manage_authorized"
  on public.crm_teams for all
  to authenticated
  using (
    exists (
      select 1 from public.crm_users u
      where lower(u.email) = lower(auth.jwt() ->> 'email')
        and u.ativo = true
        and u.cargo in ('diretor-ceo', 'administrador', 'coordenador-rh')
    )
  )
  with check (
    exists (
      select 1 from public.crm_users u
      where lower(u.email) = lower(auth.jwt() ->> 'email')
        and u.ativo = true
        and u.cargo in ('diretor-ceo', 'administrador', 'coordenador-rh')
    )
  );

drop policy if exists "crm_team_members_manage_authorized" on public.crm_team_members;
create policy "crm_team_members_manage_authorized"
  on public.crm_team_members for all
  to authenticated
  using (
    exists (
      select 1 from public.crm_users u
      where lower(u.email) = lower(auth.jwt() ->> 'email')
        and u.ativo = true
        and u.cargo in ('diretor-ceo', 'administrador', 'coordenador-rh')
    )
  )
  with check (
    exists (
      select 1 from public.crm_users u
      where lower(u.email) = lower(auth.jwt() ->> 'email')
        and u.ativo = true
        and u.cargo in ('diretor-ceo', 'administrador', 'coordenador-rh')
    )
  );

comment on table public.crm_teams is 'Equipes comerciais e seus coordenadores responsáveis';
comment on table public.crm_team_members is 'Vínculo único de colaboradores às equipes comerciais';
