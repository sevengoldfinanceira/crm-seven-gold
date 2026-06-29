-- Setup crm_sales_goals table
create table if not exists public.crm_sales_goals (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  user_name text,
  month text not null,
  target_leads integer not null default 0,
  target_appointments integer not null default 0,
  target_sales integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_email, month)
);

-- Enable RLS
alter table public.crm_sales_goals enable row level security;

-- Drop existing policies if any
drop policy if exists "crm_sales_goals_select" on public.crm_sales_goals;
drop policy if exists "crm_sales_goals_insert_admin" on public.crm_sales_goals;
drop policy if exists "crm_sales_goals_update_admin" on public.crm_sales_goals;
drop policy if exists "crm_sales_goals_delete_admin" on public.crm_sales_goals;

-- Create policies
create policy "crm_sales_goals_select"
on public.crm_sales_goals
for select
to authenticated
using (
  public.is_crm_admin()
  or lower(user_email) = lower(auth.jwt() ->> 'email')
);

create policy "crm_sales_goals_insert_admin"
on public.crm_sales_goals
for insert
to authenticated
with check (public.is_crm_admin());

create policy "crm_sales_goals_update_admin"
on public.crm_sales_goals
for update
to authenticated
using (public.is_crm_admin())
with check (public.is_crm_admin());

create policy "crm_sales_goals_delete_admin"
on public.crm_sales_goals
for delete
to authenticated
using (public.is_crm_admin());
