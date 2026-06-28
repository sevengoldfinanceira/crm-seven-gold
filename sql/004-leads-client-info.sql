-- Migration: Informacoes comerciais do cliente no lead
-- Execute uma vez no SQL Editor do Supabase antes de publicar esta versao.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS property_region TEXT,
  ADD COLUMN IF NOT EXISTS credit_value NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS down_payment_value NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS installment_value NUMERIC(14, 2);

COMMENT ON COLUMN public.leads.property_region IS 'Regiao onde o cliente procura o imovel';
COMMENT ON COLUMN public.leads.credit_value IS 'Valor total de credito desejado';
COMMENT ON COLUMN public.leads.down_payment_value IS 'Valor de entrada desejado';
COMMENT ON COLUMN public.leads.installment_value IS 'Valor de parcela desejado';
