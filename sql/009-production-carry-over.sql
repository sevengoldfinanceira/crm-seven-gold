-- ============================================================
-- Migration: Produção Comercial com Continuidade de Leads
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- 1. Novas colunas na tabela leads para rastreabilidade de carry-over
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS carried_from_lead_id UUID REFERENCES public.leads(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS carried_from_production_id UUID REFERENCES public.commercial_productions(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_carry_over BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS carried_over_at TIMESTAMPTZ;

-- 2. Função atualizada: close_commercial_production
--    Agora faz carry-over automático de leads com chance para a próxima produção.
CREATE OR REPLACE FUNCTION public.close_commercial_production(target_id uuid, actor_id uuid)
RETURNS public.commercial_productions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.commercial_productions%rowtype;
  target_prod public.commercial_productions%rowtype;
  next_prod public.commercial_productions%rowtype;
  next_month integer;
  next_year integer;
  next_starts date;
  next_ends date;
  next_name text;
  month_names text[] := ARRAY['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  copied_count integer := 0;
  skipped_count integer := 0;
  lead_rec record;
BEGIN
  -- Validar que a produção existe e está aberta
  SELECT * INTO target_prod FROM public.commercial_productions WHERE id = target_id AND status = 'open';
  IF target_prod.id IS NULL THEN
    RAISE EXCEPTION 'Produção não encontrada ou já encerrada.';
  END IF;

  -- Calcular próximo mês
  IF target_prod.month = 12 THEN
    next_month := 1;
    next_year := target_prod.year + 1;
  ELSE
    next_month := target_prod.month + 1;
    next_year := target_prod.year;
  END IF;

  next_starts := make_date(next_year, next_month, 1);
  next_ends := (next_starts + interval '1 month - 1 day')::date;
  next_name := month_names[next_month] || '/' || next_year::text;

  -- Criar ou buscar a próxima produção
  SELECT * INTO next_prod FROM public.commercial_productions WHERE year = next_year AND month = next_month;
  IF next_prod.id IS NULL THEN
    INSERT INTO public.commercial_productions (name, month, year, starts_at, ends_at, status, created_by)
    VALUES (next_name, next_month, next_year, next_starts, next_ends, 'open', actor_id)
    RETURNING * INTO next_prod;
  ELSIF next_prod.status = 'closed' THEN
    RAISE EXCEPTION 'A produção seguinte (%) já está encerrada. Não é possível criar carry-over.', next_name;
  END IF;

  -- Carry-over: copiar leads com chance (NÃO cancelado, NÃO venda_fechada)
  FOR lead_rec IN
    SELECT * FROM public.leads
    WHERE production_id = target_id
      AND status NOT IN ('cancelado', 'venda_fechada')
      AND locked_at IS NULL
  LOOP
    -- Verificar duplicidade por telefone na próxima produção
    IF lead_rec.telefone IS NOT NULL AND lead_rec.telefone <> '' THEN
      IF EXISTS (
        SELECT 1 FROM public.leads
        WHERE production_id = next_prod.id
          AND telefone = lead_rec.telefone
      ) THEN
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;
    END IF;

    -- Inserir cópia na próxima produção
    INSERT INTO public.leads (
      name, telefone, origin, note, status, tags,
      assigned_to_email, assigned_to_name,
      property_region, credit_value, down_payment_value, installment_value,
      created_by_email, created_by_name,
      production_id, production_month, production_year,
      original_lead_id, carried_from_lead_id, carried_from_production_id,
      is_carry_over, carried_over_at,
      locked_at, locked_reason,
      created_at
    ) VALUES (
      lead_rec.name, lead_rec.telefone, lead_rec.origin, lead_rec.note,
      lead_rec.status, lead_rec.tags,
      lead_rec.assigned_to_email, lead_rec.assigned_to_name,
      lead_rec.property_region, lead_rec.credit_value,
      lead_rec.down_payment_value, lead_rec.installment_value,
      lead_rec.assigned_to_email, lead_rec.assigned_to_name,
      next_prod.id, next_prod.month, next_prod.year,
      lead_rec.id, lead_rec.id, target_id,
      true, now(),
      NULL, NULL,
      now()
    );

    copied_count := copied_count + 1;
  END LOOP;

  -- Travar TODOS os leads da produção encerrada
  UPDATE public.leads
  SET locked_at = now(), locked_reason = 'Produção comercial encerrada.'
  WHERE production_id = target_id AND locked_at IS NULL;

  -- Fechar a produção
  UPDATE public.commercial_productions
  SET status = 'closed', closed_at = now(), closed_by = actor_id, updated_at = now()
  WHERE id = target_id AND status = 'open'
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'Erro ao encerrar a produção.';
  END IF;

  RETURN result;
END;
$$;

-- Permissões da função
REVOKE ALL ON FUNCTION public.close_commercial_production(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_commercial_production(uuid, uuid) TO service_role;

-- 3. Ajustar o trigger de INSERT para não sobrescrever production_id quando já informado
CREATE OR REPLACE FUNCTION public.assign_open_production_to_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.commercial_productions%rowtype;
BEGIN
  IF new.production_id IS NOT NULL THEN
    RETURN new;
  END IF;
  SELECT * INTO p FROM public.commercial_productions WHERE status = 'open' ORDER BY starts_at DESC LIMIT 1;
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'Não existe produção aberta. Peça ao Diretor-CEO para iniciar uma nova produção.';
  END IF;
  new.production_id := p.id;
  new.production_month := p.month;
  new.production_year := p.year;
  new.locked_at := NULL;
  new.locked_reason := NULL;
  RETURN new;
END $$;
