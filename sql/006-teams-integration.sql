-- Seven Gold CRM - Integração de Equipes Comerciais
-- Adiciona team_id em leads, appointments e tasks
-- Cria função helper para resolver team_id a partir do assigned_to_email
-- Backfill automático de dados existentes
-- Execute no SQL Editor do Supabase

-- ============================================================
-- 1. Função helper: resolve team_id a partir do email do vendedor
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_team_id_by_email(user_email text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT tm.team_id
  FROM public.crm_team_members tm
  JOIN public.crm_users u ON u.id = tm.user_id
  WHERE lower(u.email) = lower(user_email)
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_team_id_by_email(text) IS 'Retorna o team_id do vendedor a partir do seu email. Usado para fallback quando lead/task/appointment não tem team_id.';

-- ============================================================
-- 2. Função helper: verifica se o usuário é coordenador de uma equipe
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_team_coordinator(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_teams t
    JOIN public.crm_users u ON u.id = t.coordinator_user_id
    WHERE lower(u.email) = lower(user_email)
  );
$$;

COMMENT ON FUNCTION public.is_team_coordinator(text) IS 'Verifica se o usuário é coordenador/gestor de alguma equipe comercial.';

-- ============================================================
-- 3. Função helper: retorna team_id do qual o usuário é coordenador
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_coordinated_team_id(user_email text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT t.id
  FROM public.crm_teams t
  JOIN public.crm_users u ON u.id = t.coordinator_user_id
  WHERE lower(u.email) = lower(user_email)
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_coordinated_team_id(text) IS 'Retorna o team_id da equipe que o usuário coordena.';

-- ============================================================
-- 4. Adicionar coluna team_id na tabela leads
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN team_id uuid REFERENCES public.crm_teams(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_team_id ON public.leads(team_id);

-- ============================================================
-- 5. Adicionar coluna team_id na tabela appointments
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN team_id uuid REFERENCES public.crm_teams(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_team_id ON public.appointments(team_id);

-- ============================================================
-- 6. Adicionar coluna team_id na tabela tasks
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN team_id uuid REFERENCES public.crm_teams(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON public.tasks(team_id);

-- ============================================================
-- 7. Backfill: popular team_id em leads existentes
-- ============================================================
UPDATE public.leads l
SET team_id = public.get_team_id_by_email(l.assigned_to_email)
WHERE l.team_id IS NULL
  AND l.assigned_to_email IS NOT NULL;

-- ============================================================
-- 8. Backfill: popular team_id em appointments existentes
-- ============================================================
UPDATE public.appointments a
SET team_id = public.get_team_id_by_email(a.assigned_to_email)
WHERE a.team_id IS NULL
  AND a.assigned_to_email IS NOT NULL;

-- ============================================================
-- 9. Backfill: popular team_id em tasks existentes
-- ============================================================
UPDATE public.tasks t
SET team_id = public.get_team_id_by_email(t.assigned_to_email)
WHERE t.team_id IS NULL
  AND t.assigned_to_email IS NOT NULL;

-- ============================================================
-- 10. Adicionar photo_url na tabela crm_teams (preparado para upload futuro)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crm_teams' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.crm_teams ADD COLUMN photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crm_teams' AND column_name = 'active'
  ) THEN
    ALTER TABLE public.crm_teams ADD COLUMN active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ============================================================
-- 11. RLS: coordenadores veem leads da própria equipe via policy
-- (aplicação já filtra, mas reforça no nível DB)
-- ============================================================
-- A política atual de leads é permissive (USING true).
-- Não alteramos para não quebrar nada. O filtro é feito na aplicação.
-- Se no futuro quiser RLS restritivo, use esta policy como base:
--
-- CREATE POLICY "leads_select_by_team" ON public.leads FOR SELECT TO authenticated
-- USING (
--   public.is_crm_admin()
--   OR lower(assigned_to_email) = lower(auth.jwt() ->> 'email')
--   OR team_id = public.get_coordinated_team_id(auth.jwt() ->> 'email')
-- );
