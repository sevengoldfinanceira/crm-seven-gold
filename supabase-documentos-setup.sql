-- Setup da aba Documentos - Seven Gold
-- Rode este arquivo no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sector text,
  category text,
  document_type text,
  role_key text,
  file_name text not null,
  file_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_documents enable row level security;

create index if not exists company_documents_created_at_idx
  on public.company_documents (created_at desc);

create index if not exists company_documents_uploaded_by_idx
  on public.company_documents (uploaded_by);

create index if not exists company_documents_sector_idx
  on public.company_documents (sector);

create or replace function public.set_company_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists company_documents_set_updated_at on public.company_documents;

create trigger company_documents_set_updated_at
before update on public.company_documents
for each row
execute function public.set_company_documents_updated_at();

drop policy if exists "company_documents_select_authenticated" on public.company_documents;
drop policy if exists "company_documents_insert_authenticated" on public.company_documents;
drop policy if exists "company_documents_update_authenticated" on public.company_documents;
drop policy if exists "company_documents_delete_authenticated" on public.company_documents;

create policy "company_documents_select_authenticated"
on public.company_documents
for select
to authenticated
using (true);

create policy "company_documents_insert_authenticated"
on public.company_documents
for insert
to authenticated
with check (uploaded_by = auth.uid());

create policy "company_documents_update_authenticated"
on public.company_documents
for update
to authenticated
using (true)
with check (true);

create policy "company_documents_delete_authenticated"
on public.company_documents
for delete
to authenticated
using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-documents',
  'company-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company_documents_storage_select_authenticated" on storage.objects;
drop policy if exists "company_documents_storage_insert_authenticated" on storage.objects;
drop policy if exists "company_documents_storage_update_authenticated" on storage.objects;
drop policy if exists "company_documents_storage_delete_authenticated" on storage.objects;

create policy "company_documents_storage_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'company-documents');

create policy "company_documents_storage_insert_authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "company_documents_storage_update_authenticated"
on storage.objects
for update
to authenticated
using (bucket_id = 'company-documents')
with check (bucket_id = 'company-documents');

create policy "company_documents_storage_delete_authenticated"
on storage.objects
for delete
to authenticated
using (bucket_id = 'company-documents');
