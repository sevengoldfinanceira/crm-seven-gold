-- Marca leads da Lixeira que foram enviados como lead novo para outro vendedor.
-- Rode no SQL Editor do Supabase antes de usar a ação "Recuperar" como novo.

alter table public.leads
  add column if not exists trash_forwarded_to_email text,
  add column if not exists trash_forwarded_to_name text,
  add column if not exists trash_forwarded_at timestamptz,
  add column if not exists trash_forwarded_lead_id uuid references public.leads(id);

comment on column public.leads.trash_forwarded_to_email is 'E-mail do vendedor que recebeu este lead da Lixeira como lead novo.';
comment on column public.leads.trash_forwarded_to_name is 'Nome do vendedor que recebeu este lead da Lixeira como lead novo.';
comment on column public.leads.trash_forwarded_at is 'Data/hora em que este lead da Lixeira foi enviado como lead novo.';
comment on column public.leads.trash_forwarded_lead_id is 'Novo lead criado a partir deste lead da Lixeira.';
