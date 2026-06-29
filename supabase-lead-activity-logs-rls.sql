-- RLS real para histórico dos leads do CRM Seven Gold
-- Execute este arquivo no SQL Editor do Supabase.

-- Garantir que RLS está ativado
ALTER TABLE public.lead_activity_logs ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "lead_activity_logs_select_by_lead_access" ON public.lead_activity_logs;
DROP POLICY IF EXISTS "lead_activity_logs_insert_by_lead_access" ON public.lead_activity_logs;
DROP POLICY IF EXISTS "lead_activity_logs_update_admin" ON public.lead_activity_logs;
DROP POLICY IF EXISTS "lead_activity_logs_delete_admin" ON public.lead_activity_logs;

-- SELECT
-- Usuário só vê histórico dos leads que ele pode ver.
CREATE POLICY "lead_activity_logs_select_by_lead_access"
ON public.lead_activity_logs
FOR SELECT
TO authenticated
USING (
  public.is_crm_admin()
  OR EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = lead_activity_logs.lead_id
      AND lower(l.assigned_to_email) = lower(auth.jwt() ->> 'email')
  )
);

-- INSERT
-- Usuário só cria histórico em lead dele.
CREATE POLICY "lead_activity_logs_insert_by_lead_access"
ON public.lead_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_crm_admin()
  OR EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = lead_activity_logs.lead_id
      AND lower(l.assigned_to_email) = lower(auth.jwt() ->> 'email')
  )
);

-- UPDATE
-- Histórico não deveria ser editado por vendedor.
-- Só admin/dono pode editar se precisar corrigir algo.
CREATE POLICY "lead_activity_logs_update_admin"
ON public.lead_activity_logs
FOR UPDATE
TO authenticated
USING (
  public.is_crm_admin()
)
WITH CHECK (
  public.is_crm_admin()
);

-- DELETE
-- Só admin/dono pode apagar histórico.
CREATE POLICY "lead_activity_logs_delete_admin"
ON public.lead_activity_logs
FOR DELETE
TO authenticated
USING (
  public.is_crm_admin()
);
