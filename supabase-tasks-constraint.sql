-- Trava no banco de dados para garantir que nenhuma tarefa/retorno seja criada sem responsável.
-- Execute este arquivo no SQL Editor do Supabase.

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_assigned_to_required;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assigned_to_required
  CHECK (
    assigned_to_email IS NOT NULL
    AND btrim(assigned_to_email) <> ''
    AND assigned_to_name IS NOT NULL
    AND btrim(assigned_to_name) <> ''
  );
