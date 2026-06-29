-- Migration to add tasks actions and metadata columns
alter table public.tasks 
add column if not exists completed_at timestamptz,
add column if not exists completed_by_email text,
add column if not exists completed_by_name text,
add column if not exists updated_by_email text,
add column if not exists updated_by_name text,
add column if not exists assigned_to_email text,
add column if not exists assigned_to_name text;
