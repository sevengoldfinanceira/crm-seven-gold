-- =====================================================
-- Tabela: company_settings
-- Armazena dados institucionais centrais da empresa
-- =====================================================
CREATE TABLE IF NOT EXISTS public.company_settings (
  id TEXT PRIMARY KEY DEFAULT 'seven_gold',
  razao_social TEXT NOT NULL DEFAULT 'Seven Gold Negócios e Assessoria Financeira Ltda',
  nome_fantasia TEXT NOT NULL DEFAULT 'Seven Gold Financeira',
  cnpj TEXT NOT NULL DEFAULT '12.345.678/0001-90',
  endereco TEXT NOT NULL DEFAULT 'Av. Paulista, 1000 - São Paulo/SP',
  telefone TEXT NOT NULL DEFAULT '(11) 98765-4321',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir dados padrão caso não existam
INSERT INTO public.company_settings (id, razao_social, nome_fantasia, cnpj, endereco, telefone)
VALUES ('seven_gold', 'Seven Gold Negócios e Assessoria Financeira Ltda', 'Seven Gold Financeira', '12.345.678/0001-90', 'Av. Paulista, 1000 - São Paulo/SP', '(11) 98765-4321')
ON CONFLICT (id) DO NOTHING;

-- RLS para company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_settings_select" ON public.company_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "company_settings_all_admin" ON public.company_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.crm_users
      WHERE crm_users.email = auth.email()
      AND crm_users.ativo = true
      AND crm_users.cargo IN ('dono', 'administrador', 'diretor-ceo', 'financeiro')
    )
  );

-- =====================================================
-- Tabela: commission_statements
-- Armazena o cabeçalho do borderô de comissões
-- =====================================================
CREATE TABLE IF NOT EXISTS public.commission_statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_number SERIAL,
  seller_id UUID NOT NULL REFERENCES public.crm_users(id),
  seller_name TEXT NOT NULL,
  seller_email TEXT NOT NULL,
  seller_cargo TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_check', 'approved', 'pending_signature', 'signed', 'paid', 'cancelled')),
  
  total_sales_count INTEGER NOT NULL DEFAULT 0,
  total_credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_commission NUMERIC(14,2) NOT NULL DEFAULT 0,
  pending_commission NUMERIC(14,2) NOT NULL DEFAULT 0,
  approved_commission NUMERIC(14,2) NOT NULL DEFAULT 0,
  
  bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  chargeback_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  positive_adjustments NUMERIC(14,2) NOT NULL DEFAULT 0,
  negative_adjustments NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  
  created_by UUID NOT NULL REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  signed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  signature_name TEXT,
  signature_cpf TEXT,
  signature_ip TEXT,
  signature_image TEXT, -- Representação Base64 da assinatura canvas
  cancellation_reason TEXT
);

-- RLS para commission_statements
ALTER TABLE public.commission_statements ENABLE ROW LEVEL SECURITY;

-- Leitura: Vendedores lêem apenas o próprio; Admin/Financeiro lêem todos
CREATE POLICY "commission_statements_select" ON public.commission_statements
  FOR SELECT USING (
    lower(trim(seller_email)) = lower(nullif(trim(coalesce(auth.jwt() ->> 'email', '')), ''))
    OR EXISTS (
      SELECT 1 FROM public.crm_users
      WHERE crm_users.email = auth.email()
      AND crm_users.ativo = true
      AND crm_users.cargo IN ('dono', 'administrador', 'diretor-ceo', 'financeiro')
    )
  );

-- Escrita/Edição: apenas admin/financeiro/dono
CREATE POLICY "commission_statements_modify" ON public.commission_statements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.crm_users
      WHERE crm_users.email = auth.email()
      AND crm_users.ativo = true
      AND crm_users.cargo IN ('dono', 'administrador', 'diretor-ceo', 'financeiro')
    )
  );

-- Permitir que o próprio vendedor atualize a assinatura (UPDATE)
CREATE POLICY "commission_statements_seller_sign" ON public.commission_statements
  FOR UPDATE USING (
    lower(trim(seller_email)) = lower(nullif(trim(coalesce(auth.jwt() ->> 'email', '')), ''))
  )
  WITH CHECK (
    lower(trim(seller_email)) = lower(nullif(trim(coalesce(auth.jwt() ->> 'email', '')), ''))
  );

-- =====================================================
-- Tabela: commission_statement_items
-- Armazena a fotografia de cada venda inclusa no borderô
-- =====================================================
CREATE TABLE IF NOT EXISTS public.commission_statement_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_id UUID NOT NULL REFERENCES public.commission_statements(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  sale_date DATE NOT NULL,
  client_name TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  credit_amount NUMERIC(14,2) NOT NULL,
  table_number INTEGER NOT NULL,
  seller_cargo TEXT NOT NULL,
  rule_applied TEXT NOT NULL,
  commission_percentage NUMERIC(6,4) NOT NULL,
  commission_amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL -- 'checked', 'pending_check'
);

-- RLS para commission_statement_items
ALTER TABLE public.commission_statement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_statement_items_select" ON public.commission_statement_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.commission_statements s
      WHERE s.id = statement_id
        AND (
          lower(trim(s.seller_email)) = lower(nullif(trim(coalesce(auth.jwt() ->> 'email', '')), ''))
          OR EXISTS (
            SELECT 1 FROM public.crm_users u
            WHERE u.email = auth.email()
            AND u.ativo = true
            AND u.cargo IN ('dono', 'administrador', 'diretor-ceo', 'financeiro')
          )
        )
    )
  );

CREATE POLICY "commission_statement_items_modify" ON public.commission_statement_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.crm_users
      WHERE crm_users.email = auth.email()
      AND crm_users.ativo = true
      AND crm_users.cargo IN ('dono', 'administrador', 'diretor-ceo', 'financeiro')
    )
  );

-- =====================================================
-- Tabela: commission_adjustments
-- Lançamentos manuais de ajustes (descontos, bônus, etc)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.commission_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_id UUID NOT NULL REFERENCES public.commission_statements(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bonus', 'advance', 'discount', 'chargeback', 'positive', 'negative')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_by_email TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para commission_adjustments
ALTER TABLE public.commission_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_adjustments_select" ON public.commission_adjustments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.commission_statements s
      WHERE s.id = statement_id
        AND (
          lower(trim(s.seller_email)) = lower(nullif(trim(coalesce(auth.jwt() ->> 'email', '')), ''))
          OR EXISTS (
            SELECT 1 FROM public.crm_users u
            WHERE u.email = auth.email()
            AND u.ativo = true
            AND u.cargo IN ('dono', 'administrador', 'diretor-ceo', 'financeiro')
          )
        )
    )
  );

CREATE POLICY "commission_adjustments_modify" ON public.commission_adjustments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.crm_users
      WHERE crm_users.email = auth.email()
      AND crm_users.ativo = true
      AND crm_users.cargo IN ('dono', 'administrador', 'diretor-ceo', 'financeiro')
    )
  );

-- =====================================================
-- Tabela: commission_statement_logs
-- Trilha de auditoria das ações nos borderôs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.commission_statement_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_id UUID NOT NULL REFERENCES public.commission_statements(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para commission_statement_logs
ALTER TABLE public.commission_statement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_statement_logs_select" ON public.commission_statement_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.commission_statements s
      WHERE s.id = statement_id
        AND (
          lower(trim(s.seller_email)) = lower(nullif(trim(coalesce(auth.jwt() ->> 'email', '')), ''))
          OR EXISTS (
            SELECT 1 FROM public.crm_users u
            WHERE u.email = auth.email()
            AND u.ativo = true
            AND u.cargo IN ('dono', 'administrador', 'diretor-ceo', 'financeiro')
          )
        )
    )
  );

CREATE POLICY "commission_statement_logs_modify" ON public.commission_statement_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.crm_users
      WHERE crm_users.email = auth.email()
      AND crm_users.ativo = true
      AND crm_users.cargo IN ('dono', 'administrador', 'diretor-ceo', 'financeiro')
    )
  );

-- =====================================================
-- Triggers para atualização automática de timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_commission_borderos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER trigger_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_commission_borderos_updated_at();

DROP TRIGGER IF EXISTS trigger_commission_statements_updated_at ON public.commission_statements;
CREATE TRIGGER trigger_commission_statements_updated_at
  BEFORE UPDATE ON public.commission_statements
  FOR EACH ROW EXECUTE FUNCTION public.set_commission_borderos_updated_at();
