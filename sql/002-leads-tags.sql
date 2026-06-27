-- Migration: Tags column for leads - Seven Gold CRM
-- Execute this no SQL Editor do Supabase (uma vez)

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::JSONB;
