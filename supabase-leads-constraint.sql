-- Trava no banco de dados para garantir que nenhum lead seja criado sem responsável.
-- Execute este arquivo no SQL Editor do Supabase.

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_assigned_to_required;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_assigned_to_required
  CHECK (
    assigned_to_email IS NOT NULL
    AND btrim(assigned_to_email) <> ''
    AND assigned_to_name IS NOT NULL
    AND btrim(assigned_to_name) <> ''
  );
