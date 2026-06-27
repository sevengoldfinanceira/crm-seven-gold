-- Migration: WhatsApp Integration - Seven Gold CRM
-- Execute this no SQL Editor do Supabase (uma vez)

-- ============================================================
-- 1. Adicionar colunas de WhatsApp na tabela leads existente
-- ============================================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS interesse TEXT,
  ADD COLUMN IF NOT EXISTS opt_in BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS opt_out BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ultima_interacao TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS proximo_followup TIMESTAMPTZ;

-- ============================================================
-- 2. Criar tabela de mensagens
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  telefone TEXT NOT NULL,
  direcao TEXT NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  mensagem TEXT NOT NULL,
  origem TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. Índices para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_messages_telefone    ON public.messages(telefone);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id     ON public.messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at  ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_telefone       ON public.leads(telefone);
CREATE INDEX IF NOT EXISTS idx_leads_ultima_interacao ON public.leads(ultima_interacao DESC);

-- ============================================================
-- 4. Row Level Security
-- ============================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler mensagens
CREATE POLICY "messages_select_authenticated"
  ON public.messages FOR SELECT
  TO authenticated
  USING (true);

-- Usuários autenticados podem inserir mensagens (ex: do frontend)
CREATE POLICY "messages_insert_authenticated"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- A role service_role (usada no backend) tem acesso total (bypass RLS)
