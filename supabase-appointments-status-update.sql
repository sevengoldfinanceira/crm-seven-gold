-- Atualiza os status permitidos da agenda comercial.
-- Execute este arquivo no SQL Editor do Supabase antes de usar as novas etiquetas do Calendário.

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (
    status IN (
      'agendado',
      'concluido',
      'confirmado',
      'cancelado',
      'faltou',
      'compareceu',
      'reagendar',
      'reagendado'
    )
  );
