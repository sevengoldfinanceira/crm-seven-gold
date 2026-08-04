-- Módulo Seven Gold: Simulação de Financiamento Imobiliário
-- Este script cria somente a estrutura. Nenhuma taxa bancária fictícia é inserida.

create table if not exists public.financing_rate_products (
  id uuid primary key default gen_random_uuid(),
  institution_name text not null,
  product_name text not null,
  annual_interest_rate numeric(10,6) not null check (annual_interest_rate >= 0),
  rate_type text not null default 'EFETIVA' check (rate_type in ('EFETIVA', 'NOMINAL')),
  indexer text not null default 'NÃO INFORMADO',
  amortization_systems text[] not null default array['SAC']::text[],
  max_financing_percent numeric(7,4) not null check (max_financing_percent > 0 and max_financing_percent <= 100),
  min_property_value numeric(15,2),
  max_property_value numeric(15,2),
  min_financing_value numeric(15,2),
  max_financing_value numeric(15,2),
  min_term_months integer not null default 12 check (min_term_months > 0),
  max_term_months integer not null check (max_term_months >= min_term_months),
  max_age_at_end numeric(6,2) not null check (max_age_at_end > 0),
  income_commitment_percent numeric(7,4) not null default 30 check (income_commitment_percent > 0 and income_commitment_percent <= 100),
  property_types text[] not null default array['RESIDENCIAL']::text[],
  property_conditions text[] not null default array['NOVO','USADO']::text[],
  eligible_states text[] not null default array[]::text[],
  eligible_cities text[] not null default array[]::text[],
  appraisal_fee numeric(15,2) not null default 0,
  registration_fee numeric(15,2) not null default 0,
  other_upfront_fees numeric(15,2) not null default 0,
  monthly_fee numeric(15,2) not null default 0,
  monthly_insurance_amount numeric(15,2) not null default 0,
  monthly_insurance_percent numeric(10,6) not null default 0,
  fee_details jsonb not null default '{}'::jsonb,
  insurance_details jsonb not null default '{}'::jsonb,
  cost_data_complete boolean not null default false,
  source_name text not null,
  source_url text,
  source_notes text,
  updated_reference_at timestamptz not null,
  valid_from date,
  valid_until date,
  active boolean not null default true,
  version integer not null default 1,
  created_by_email text,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until >= valid_from),
  check (array_length(amortization_systems, 1) > 0)
);

create table if not exists public.financing_simulations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by_auth_id uuid not null,
  created_by_email text not null,
  created_by_name text,
  client_id text,
  client_name text,
  input_data jsonb not null,
  products_shown jsonb not null default '[]'::jsonb,
  selected_product jsonb,
  rate_versions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financing_rate_products_active_idx
  on public.financing_rate_products (active, updated_reference_at desc);
create index if not exists financing_simulations_user_idx
  on public.financing_simulations (created_by_auth_id, created_at desc);
create index if not exists financing_simulations_client_idx
  on public.financing_simulations (client_id) where client_id is not null;

alter table public.financing_rate_products enable row level security;
alter table public.financing_simulations enable row level security;

drop policy if exists financing_products_read on public.financing_rate_products;
drop policy if exists financing_products_admin_insert on public.financing_rate_products;
drop policy if exists financing_products_admin_update on public.financing_rate_products;
drop policy if exists financing_products_admin_delete on public.financing_rate_products;
drop policy if exists financing_simulations_owner_select on public.financing_simulations;
drop policy if exists financing_simulations_owner_insert on public.financing_simulations;
drop policy if exists financing_simulations_owner_update on public.financing_simulations;
drop policy if exists financing_simulations_owner_delete on public.financing_simulations;

create policy financing_products_read on public.financing_rate_products
  for select to authenticated using (active or public.is_crm_admin());
create policy financing_products_admin_insert on public.financing_rate_products
  for insert to authenticated with check (public.is_crm_admin());
create policy financing_products_admin_update on public.financing_rate_products
  for update to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());
create policy financing_products_admin_delete on public.financing_rate_products
  for delete to authenticated using (public.is_crm_admin());

create policy financing_simulations_owner_select on public.financing_simulations
  for select to authenticated using (created_by_auth_id = auth.uid() or public.is_crm_admin());
create policy financing_simulations_owner_insert on public.financing_simulations
  for insert to authenticated with check (created_by_auth_id = auth.uid());
create policy financing_simulations_owner_update on public.financing_simulations
  for update to authenticated using (created_by_auth_id = auth.uid()) with check (created_by_auth_id = auth.uid());
create policy financing_simulations_owner_delete on public.financing_simulations
  for delete to authenticated using (created_by_auth_id = auth.uid());

comment on table public.financing_rate_products is
  'Condições reais e versionadas de financiamento imobiliário. Não inserir taxas sem fonte e data de referência.';
comment on column public.financing_rate_products.cost_data_complete is
  'Somente true quando tarifas e seguros necessários para estimativa de CET estiverem completos.';
comment on table public.financing_simulations is
  'Simulações independentes de propostas de consórcio; vínculo com cliente é sempre opcional.';
