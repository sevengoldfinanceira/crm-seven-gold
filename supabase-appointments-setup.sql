-- Agenda comercial do CRM Seven Gold
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  nome_cliente text not null,
  telefone_cliente text,
  usuario_id uuid references auth.users(id) on delete set null,
  nome_usuario text not null,
  data_agendamento date not null,
  hora_agendamento time not null,
  observacao text,
  status text not null default 'agendado'
    check (status in ('agendado', 'concluido', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

create index if not exists appointments_date_time_idx
  on public.appointments (data_agendamento, hora_agendamento);

create index if not exists appointments_lead_id_idx
  on public.appointments (lead_id);

create index if not exists appointments_user_id_idx
  on public.appointments (usuario_id);

create or replace function public.set_appointments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists appointments_set_updated_at on public.appointments;

create trigger appointments_set_updated_at
before update on public.appointments
for each row
execute function public.set_appointments_updated_at();

drop policy if exists "appointments_select_authenticated" on public.appointments;
drop policy if exists "appointments_insert_authenticated" on public.appointments;
drop policy if exists "appointments_update_authenticated" on public.appointments;
drop policy if exists "appointments_delete_authenticated" on public.appointments;

create policy "appointments_select_authenticated"
on public.appointments
for select
to authenticated
using (true);

create policy "appointments_insert_authenticated"
on public.appointments
for insert
to authenticated
with check (usuario_id = auth.uid());

create policy "appointments_update_authenticated"
on public.appointments
for update
to authenticated
using (true)
with check (true);

create policy "appointments_delete_authenticated"
on public.appointments
for delete
to authenticated
using (true);
