-- Trava no banco de dados para garantir que nenhum agendamento seja criado sem responsável.
-- Execute este arquivo no SQL Editor do Supabase.

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_assigned_to_required;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_assigned_to_required
  CHECK (
    assigned_to_email IS NOT NULL
    AND btrim(assigned_to_email) <> ''
    AND assigned_to_name IS NOT NULL
    AND btrim(assigned_to_name) <> ''
  );
