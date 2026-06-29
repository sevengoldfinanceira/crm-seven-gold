-- Tabela de Tarefas e Retornos do CRM Seven Gold
-- Execute este arquivo no SQL Editor do Supabase.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  lead_nome text not null,
  lead_telefone text,
  type text not null check (type in ('whatsapp_message', 'reminder')),
  scheduled_at timestamptz not null,
  title text,
  whatsapp_message text,
  internal_note text,
  status text not null default 'pending' check (status in ('pending', 'done', 'cancelled', 'triggered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create index if not exists tasks_lead_id_idx on public.tasks (lead_id);
create index if not exists tasks_scheduled_at_idx on public.tasks (scheduled_at);

drop policy if exists "tasks_select_authenticated" on public.tasks;
drop policy if exists "tasks_insert_authenticated" on public.tasks;
drop policy if exists "tasks_update_authenticated" on public.tasks;
drop policy if exists "tasks_delete_authenticated" on public.tasks;
drop policy if exists "tasks_select_anon" on public.tasks;
drop policy if exists "tasks_insert_anon" on public.tasks;
drop policy if exists "tasks_update_anon" on public.tasks;
drop policy if exists "tasks_delete_anon" on public.tasks;

-- Policies for authenticated role (CRM Frontend)
create policy "tasks_select_authenticated"
on public.tasks for select to authenticated using (true);

create policy "tasks_insert_authenticated"
on public.tasks for insert to authenticated with check (true);

create policy "tasks_update_authenticated"
on public.tasks for update to authenticated using (true) with check (true);

create policy "tasks_delete_authenticated"
on public.tasks for delete to authenticated using (true);

-- Policies for anon role (Extension Frontend)
create policy "tasks_select_anon"
on public.tasks for select to anon using (true);

create policy "tasks_insert_anon"
on public.tasks for insert to anon with check (true);

create policy "tasks_update_anon"
on public.tasks for update to anon using (true) with check (true);

create policy "tasks_delete_anon"
on public.tasks for delete to anon using (true);
