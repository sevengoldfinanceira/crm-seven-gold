-- Fix: adicionar colunas que faltam e corrigir usuario_id em agendamentos antigos
-- Execute este arquivo no SQL Editor do Supabase.

-- 1. Adicionar colunas que a extensão WhatsApp precisa
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS assigned_to_email text,
  ADD COLUMN IF NOT EXISTS assigned_to_name text;

CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to_email
  ON public.appointments (assigned_to_email);

-- 2. Backfill usuario_id para agendamentos antigos que não tinham
UPDATE public.appointments a
SET usuario_id = u.id
FROM public.crm_users u
WHERE a.usuario_id IS NULL
  AND lower(a.nome_usuario) = lower(u.nome)
  AND u.ativo = true;

-- 3. Backfill assigned_to_email a partir de crm_users para agendamentos sem ele
UPDATE public.appointments a
SET assigned_to_email = u.email,
    assigned_to_name = u.nome
FROM public.crm_users u
WHERE a.assigned_to_email IS NULL
  AND a.usuario_id = u.id
  AND u.ativo = true;
