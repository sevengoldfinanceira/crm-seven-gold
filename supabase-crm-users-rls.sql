-- Políticas de Segurança (RLS) para crm_users
-- Execute este arquivo no SQL Editor do Supabase para corrigir a listagem de usuários.

-- 1. Ativar RLS na tabela crm_users
ALTER TABLE public.crm_users ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar duplicidades
DROP POLICY IF EXISTS "crm_users_select_authenticated" ON public.crm_users;
DROP POLICY IF EXISTS "crm_users_insert_admin" ON public.crm_users;
DROP POLICY IF EXISTS "crm_users_update_admin" ON public.crm_users;
DROP POLICY IF EXISTS "crm_users_delete_admin" ON public.crm_users;

-- 3. Criar nova política de leitura: qualquer usuário logado no CRM pode listar os usuários
CREATE POLICY "crm_users_select_authenticated"
ON public.crm_users
FOR SELECT
TO authenticated
USING (true);

-- 4. Criar política de inserção: apenas admins podem adicionar novos usuários
CREATE POLICY "crm_users_insert_admin"
ON public.crm_users
FOR INSERT
TO authenticated
WITH CHECK (public.is_crm_admin());

-- 5. Criar política de atualização: apenas admins podem atualizar usuários
CREATE POLICY "crm_users_update_admin"
ON public.crm_users
FOR UPDATE
TO authenticated
USING (public.is_crm_admin())
WITH CHECK (public.is_crm_admin());

-- 6. Criar política de remoção: apenas admins podem deletar usuários
CREATE POLICY "crm_users_delete_admin"
ON public.crm_users
FOR DELETE
TO authenticated
USING (public.is_crm_admin());
