-- Fix: adicionar colunas que faltam e corrigir usuario_id em agendamentos antigos
-- Execute este arquivo no SQL Editor do Supabase.

-- 1. Adicionar colunas que a extensão WhatsApp precisa
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS assigned_to_email text,
  ADD COLUMN IF NOT EXISTS assigned_to_name text;

CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to_email
  ON public.appointments (assigned_to_email);

-- 2. Backfill usuario_id usando auth.users (UUID correto da FK)
UPDATE public.appointments a
SET usuario_id = au.id
FROM public.crm_users cu
JOIN auth.users au ON lower(cu.email) = lower(au.email)
WHERE a.usuario_id IS NULL
  AND lower(a.nome_usuario) = lower(cu.nome)
  AND cu.ativo = true;

-- 3. Backfill assigned_to_email a partir de crm_users
UPDATE public.appointments a
SET assigned_to_email = cu.email,
    assigned_to_name = cu.nome
FROM public.crm_users cu
WHERE a.assigned_to_email IS NULL
  AND a.usuario_id IS NOT NULL
  AND a.usuario_id = (
    SELECT au.id FROM auth.users au
    WHERE lower(au.email) = lower(cu.email)
    LIMIT 1
  )
  AND cu.ativo = true;
