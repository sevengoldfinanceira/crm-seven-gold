-- Migration: Responsavel/vendedor do lead + historico de alteracoes
-- Execute uma vez no SQL Editor do Supabase antes de publicar esta versao.

-- Colunas de atribuicao no lead
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_to_email TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
  ADD COLUMN IF NOT EXISTS created_by_email TEXT,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_by_email TEXT,
  ADD COLUMN IF NOT EXISTS updated_by_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN public.leads.assigned_to_email IS 'E-mail do vendedor responsavel pelo lead';
COMMENT ON COLUMN public.leads.assigned_to_name IS 'Nome do vendedor responsavel pelo lead';
COMMENT ON COLUMN public.leads.created_by_email IS 'E-mail do usuario que criou o lead';
COMMENT ON COLUMN public.leads.created_by_name IS 'Nome do usuario que criou o lead';
COMMENT ON COLUMN public.leads.updated_by_email IS 'E-mail do usuario que atualizou o lead por ultimo';
COMMENT ON COLUMN public.leads.updated_by_name IS 'Nome do usuario que atualizou o lead por ultimo';

-- Tabela de historico de alteracoes do lead
CREATE TABLE IF NOT EXISTS public.lead_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_label TEXT,
  description TEXT,
  performed_by_email TEXT,
  performed_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users"
  ON public.lead_history
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON public.lead_history(lead_id);
