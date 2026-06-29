-- Migration: adicionar colunas de responsável em sales_reports
-- Execute este arquivo no SQL Editor do Supabase.

-- Adicionar colunas de responsável
ALTER TABLE public.sales_reports
  ADD COLUMN IF NOT EXISTS assigned_to_email text,
  ADD COLUMN IF NOT EXISTS assigned_to_name text;

-- Índice para filtragem por responsável
CREATE INDEX IF NOT EXISTS idx_sales_reports_assigned_to_email
  ON public.sales_reports (assigned_to_email);
