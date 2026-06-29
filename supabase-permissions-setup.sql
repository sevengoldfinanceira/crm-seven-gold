-- Permissões de Cargos e Áreas do CRM Seven Gold
-- Execute este arquivo no SQL Editor do Supabase.

-- Função auxiliar is_crm_admin se não existir
create or replace function public.is_crm_admin()
returns boolean
security definer
language plpgsql
as $$
declare
  user_cargo text;
begin
  select cargo into user_cargo
  from public.crm_users
  where email = auth.jwt() ->> 'email';

  return (lower(user_cargo) = 'dono' or lower(user_cargo) = 'admin' or lower(user_cargo) = 'administrador');
end;
$$;

-- Criar tabela de permissões por cargo e área
create table if not exists public.crm_role_permissions (
  id uuid primary key default gen_random_uuid(),
  cargo text not null,
  area_key text not null,
  area_label text not null,
  permitido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cargo, area_key)
);

-- Ativar RLS
alter table public.crm_role_permissions enable row level security;

-- Policies
drop policy if exists "crm_role_permissions_select" on public.crm_role_permissions;
drop policy if exists "crm_role_permissions_insert_admin" on public.crm_role_permissions;
drop policy if exists "crm_role_permissions_update_admin" on public.crm_role_permissions;
drop policy if exists "crm_role_permissions_delete_admin" on public.crm_role_permissions;

create policy "crm_role_permissions_select"
on public.crm_role_permissions
for select
to authenticated
using (true);

create policy "crm_role_permissions_insert_admin"
on public.crm_role_permissions
for insert
to authenticated
with check (public.is_crm_admin());

create policy "crm_role_permissions_update_admin"
on public.crm_role_permissions
for update
to authenticated
using (public.is_crm_admin())
with check (public.is_crm_admin());

create policy "crm_role_permissions_delete_admin"
on public.crm_role_permissions
for delete
to authenticated
using (public.is_crm_admin());
