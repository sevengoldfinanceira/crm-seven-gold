-- RLS real para agendamentos do CRM Seven Gold
-- Execute este arquivo no SQL Editor do Supabase.

-- 1. Adicionar colunas de responsável (se ainda não existirem)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS assigned_to_email text,
  ADD COLUMN IF NOT EXISTS assigned_to_name text;

CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to_email
  ON public.appointments (assigned_to_email);

-- 2. Garantir que RLS está ativado
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 3. Remover policies antigas (permissivas demais)
DROP POLICY IF EXISTS "appointments_select_authenticated" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_authenticated" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_authenticated" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_authenticated" ON public.appointments;

-- 4. Criar policies novas com filtro por responsável

-- SELECT: admin vê tudo, vendedor vê apenas os seus
CREATE POLICY "appointments_select_by_role"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  public.is_crm_admin()
  OR lower(assigned_to_email) = lower(auth.jwt() ->> 'email')
);

-- INSERT: admin pode criar qualquer, vendedor só cria para si
CREATE POLICY "appointments_insert_by_role"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_crm_admin()
  OR lower(assigned_to_email) = lower(auth.jwt() ->> 'email')
);

-- UPDATE: admin pode editar qualquer, vendedor só edita os seus
CREATE POLICY "appointments_update_by_role"
ON public.appointments
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
CREATE POLICY "appointments_delete_by_role"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  public.is_crm_admin()
);
