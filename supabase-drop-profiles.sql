-- Seven Gold CRM — Remover tabela antiga profiles
-- Execute somente depois de publicar o código que não depende mais de public.profiles.
-- Fonte oficial de usuários/permissões a partir de agora:
--   public.crm_users
--   public.crm_role_permissions

drop table if exists public.profiles cascade;
