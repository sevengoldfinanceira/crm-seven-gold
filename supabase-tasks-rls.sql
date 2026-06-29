-- RLS real para tarefas/retornos do CRM Seven Gold
-- Execute este arquivo no SQL Editor do Supabase.

-- 1. Adicionar colunas de responsável (se ainda não existirem)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to_email text,
  ADD COLUMN IF NOT EXISTS assigned_to_name text;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_email
  ON public.tasks (assigned_to_email);

-- 2. Garantir que RLS está ativado
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. Remover policies antigas (permissivas demais)
DROP POLICY IF EXISTS "tasks_select_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_authenticated" ON public.tasks;

-- 4. Criar policies novas com filtro por responsável

-- SELECT: admin vê tudo, vendedor vê apenas as suas
CREATE POLICY "tasks_select_by_role"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.is_crm_admin()
  OR lower(assigned_to_email) = lower(auth.jwt() ->> 'email')
);

-- INSERT: admin pode criar qualquer, vendedor só cria para si
CREATE POLICY "tasks_insert_by_role"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_crm_admin()
  OR lower(assigned_to_email) = lower(auth.jwt() ->> 'email')
);

-- UPDATE: admin pode editar qualquer, vendedor só edita as suas
CREATE POLICY "tasks_update_by_role"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.is_crm_admin()
  OR lower(assigned_to_email) = lower(auth.jwt() ->> 'email')
)
WITH CHECK (
  public.is_crm_admin()
  OR lower(assigned_to_email) = lower(auth.jwt() ->> 'email')
);

-- DELETE: apenas admin pode excluir
CREATE POLICY "tasks_delete_by_role"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  public.is_crm_admin()
);
