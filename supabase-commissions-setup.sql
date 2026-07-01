-- =====================================================
-- Tabela: commission_rules
-- Armazena regras de comissão por nível e tabela
-- =====================================================

CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'commercial',       -- 'commercial' ou 'strategic'
  level_id TEXT NOT NULL,                             -- 'home-office', 'representante-junior', etc.
  level_name TEXT NOT NULL,                           -- 'Home Office', 'Representante Junior', etc.
  level_sort INTEGER NOT NULL DEFAULT 0,              -- ordem de exibição do nível
  table_index INTEGER NOT NULL,                       -- 0-6 (Tab 01 até Tab 07)
  table_label TEXT NOT NULL,                          -- 'Tab 01', 'Tab 02', etc.
  commission_value TEXT NOT NULL DEFAULT '0,00%',      -- valor principal de comissão/repasse
  adhesion TEXT,                                      -- adesão (usado em estratégicos)
  installments TEXT,                                  -- parcelas (usado em estratégicos)
  total TEXT,                                         -- total (usado em estratégicos)
  extra JSONB,                                        -- campos extras flexíveis
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_commission_rules_category ON commission_rules(category);
CREATE INDEX IF NOT EXISTS idx_commission_rules_level ON commission_rules(level_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_table ON commission_rules(table_index);

-- RLS (Row Level Security)
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado pode ler
CREATE POLICY "commission_rules_select" ON commission_rules
  FOR SELECT USING (auth.role() = 'authenticated');

-- Escrita: apenas admin/dono podem modificar
CREATE POLICY "commission_rules_insert" ON commission_rules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.email = auth.email()
      AND crm_users.ativo = true
      AND crm_users.cargo IN ('dono', 'administrador', 'diretor-ceo')
    )
  );

CREATE POLICY "commission_rules_update" ON commission_rules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.email = auth.email()
      AND crm_users.ativo = true
      AND crm_users.cargo IN ('dono', 'administrador', 'diretor-ceo')
    )
  );

CREATE POLICY "commission_rules_delete" ON commission_rules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.email = auth.email()
      AND crm_users.ativo = true
      AND crm_users.cargo IN ('dono', 'administrador', 'diretor-ceo')
    )
  );

-- =====================================================
-- Dados iniciais: Níveis Comerciais (5 níveis × 7 tabelas)
-- =====================================================

INSERT INTO commission_rules (category, level_id, level_name, level_sort, table_index, table_label, commission_value) VALUES
-- Home Office
('commercial', 'home-office', 'Home Office', 1, 0, 'Tab 01', '0,15%'),
('commercial', 'home-office', 'Home Office', 1, 1, 'Tab 02', '0,25%'),
('commercial', 'home-office', 'Home Office', 1, 2, 'Tab 03', '0,35%'),
('commercial', 'home-office', 'Home Office', 1, 3, 'Tab 04', '0,45%'),
('commercial', 'home-office', 'Home Office', 1, 4, 'Tab 05', '0,55%'),
('commercial', 'home-office', 'Home Office', 1, 5, 'Tab 06', '0,65%'),
('commercial', 'home-office', 'Home Office', 1, 6, 'Tab 07', '0,75%'),

-- Assistente de Vendas
('commercial', 'assistente-vendas', 'Assistente de Vendas', 2, 0, 'Tab 01', '0,10%'),
('commercial', 'assistente-vendas', 'Assistente de Vendas', 2, 1, 'Tab 02', '0,13%'),
('commercial', 'assistente-vendas', 'Assistente de Vendas', 2, 2, 'Tab 03', '0,15%'),
('commercial', 'assistente-vendas', 'Assistente de Vendas', 2, 3, 'Tab 04', '0,17%'),
('commercial', 'assistente-vendas', 'Assistente de Vendas', 2, 4, 'Tab 05', '0,20%'),
('commercial', 'assistente-vendas', 'Assistente de Vendas', 2, 5, 'Tab 06', '0,23%'),
('commercial', 'assistente-vendas', 'Assistente de Vendas', 2, 6, 'Tab 07', '0,25%'),

-- Consultor de Vendas
('commercial', 'consultor-vendas', 'Consultor de Vendas', 3, 0, 'Tab 01', '0,55%'),
('commercial', 'consultor-vendas', 'Consultor de Vendas', 3, 1, 'Tab 02', '1,05%'),
('commercial', 'consultor-vendas', 'Consultor de Vendas', 3, 2, 'Tab 03', '1,55%'),
('commercial', 'consultor-vendas', 'Consultor de Vendas', 3, 3, 'Tab 04', '1,90%'),
('commercial', 'consultor-vendas', 'Consultor de Vendas', 3, 4, 'Tab 05', '2,05%'),
('commercial', 'consultor-vendas', 'Consultor de Vendas', 3, 5, 'Tab 06', '2,30%'),
('commercial', 'consultor-vendas', 'Consultor de Vendas', 3, 6, 'Tab 07', '2,55%'),

-- Coordenador
('commercial', 'coordenador', 'Coordenador', 4, 0, 'Tab 01', '0,15%'),
('commercial', 'coordenador', 'Coordenador', 4, 1, 'Tab 02', '0,25%'),
('commercial', 'coordenador', 'Coordenador', 4, 2, 'Tab 03', '0,35%'),
('commercial', 'coordenador', 'Coordenador', 4, 3, 'Tab 04', '0,45%'),
('commercial', 'coordenador', 'Coordenador', 4, 4, 'Tab 05', '0,55%'),
('commercial', 'coordenador', 'Coordenador', 4, 5, 'Tab 06', '0,65%'),
('commercial', 'coordenador', 'Coordenador', 4, 6, 'Tab 07', '0,75%'),

-- Supervisor
('commercial', 'supervisor', 'Supervisor', 5, 0, 'Tab 01', '0,20%'),
('commercial', 'supervisor', 'Supervisor', 5, 1, 'Tab 02', '0,30%'),
('commercial', 'supervisor', 'Supervisor', 5, 2, 'Tab 03', '0,40%'),
('commercial', 'supervisor', 'Supervisor', 5, 3, 'Tab 04', '0,50%'),
('commercial', 'supervisor', 'Supervisor', 5, 4, 'Tab 05', '0,65%'),
('commercial', 'supervisor', 'Supervisor', 5, 5, 'Tab 06', '0,75%'),
('commercial', 'supervisor', 'Supervisor', 5, 6, 'Tab 07', '0,85%');

-- =====================================================
-- Dados iniciais: Níveis Estratégicos
-- =====================================================

-- Representante Junior
INSERT INTO commission_rules (category, level_id, level_name, level_sort, table_index, table_label, commission_value, adhesion, installments, total, extra) VALUES
('strategic', 'representante-junior', 'Representante Junior', 1, 0, 'Tab 01', '2,65%', '0,40%', '4,50%', '5,30%', '{"total_junior":"2,65%","total_pleno":"5,30%"}'),
('strategic', 'representante-junior', 'Representante Junior', 1, 1, 'Tab 02', '2,50%', '0,70%', '3,60%', '5,00%', '{"total_junior":"2,50%","total_pleno":"5,00%"}'),
('strategic', 'representante-junior', 'Representante Junior', 1, 2, 'Tab 03', '2,50%', '1,25%', '2,50%', '5,00%', '{"total_junior":"2,50%","total_pleno":"5,00%"}'),
('strategic', 'representante-junior', 'Representante Junior', 1, 3, 'Tab 04', '2,45%', '1,35%', '2,20%', '4,90%', '{"total_junior":"2,45%","total_pleno":"4,90%"}'),
('strategic', 'representante-junior', 'Representante Junior', 1, 4, 'Tab 05', '2,40%', '1,50%', '1,80%', '4,80%', '{"total_junior":"2,40%","total_pleno":"4,80%"}'),
('strategic', 'representante-junior', 'Representante Junior', 1, 5, 'Tab 06', '2,35%', '1,75%', '1,20%', '4,70%', '{"total_junior":"2,35%","total_pleno":"4,70%"}'),
('strategic', 'representante-junior', 'Representante Junior', 1, 6, 'Tab 07', '2,25%', '2,00%', '0,50%', '4,50%', '{"total_junior":"2,25%","total_pleno":"4,50%"}'),

-- Representante Pleno
('strategic', 'representante-pleno', 'Representante Pleno', 2, 0, 'Tab 01', '5,30%', '0,80%', '4,50%', '5,30%', NULL),
('strategic', 'representante-pleno', 'Representante Pleno', 2, 1, 'Tab 02', '5,00%', '1,40%', '3,60%', '5,00%', NULL),
('strategic', 'representante-pleno', 'Representante Pleno', 2, 2, 'Tab 03', '5,00%', '2,50%', '2,50%', '5,00%', NULL),
('strategic', 'representante-pleno', 'Representante Pleno', 2, 3, 'Tab 04', '4,90%', '2,70%', '2,20%', '4,90%', NULL),
('strategic', 'representante-pleno', 'Representante Pleno', 2, 4, 'Tab 05', '4,80%', '3,00%', '1,80%', '4,80%', NULL),
('strategic', 'representante-pleno', 'Representante Pleno', 2, 5, 'Tab 06', '4,70%', '3,50%', '1,20%', '4,70%', NULL),
('strategic', 'representante-pleno', 'Representante Pleno', 2, 6, 'Tab 07', '4,50%', '4,00%', '0,50%', '4,50%', NULL),

-- Submaster
('strategic', 'submaster', 'Submaster', 3, 0, 'Tab 01', '0,50%', NULL, NULL, NULL, '{"when":"Venda fechada na tabela 1","observation":"Imposto 10% sobre comissão"}'),
('strategic', 'submaster', 'Submaster', 3, 1, 'Tab 02', '1,00%', NULL, NULL, NULL, '{"when":"Venda fechada na tabela 2","observation":"Imposto 10% sobre comissão"}'),
('strategic', 'submaster', 'Submaster', 3, 2, 'Tab 03', '1,50%', NULL, NULL, NULL, '{"when":"Venda fechada na tabela 3","observation":"Imposto 10% sobre comissão"}'),
('strategic', 'submaster', 'Submaster', 3, 3, 'Tab 04', '1,85%', NULL, NULL, NULL, '{"when":"Venda fechada na tabela 4","observation":"Imposto 10% sobre comissão"}'),
('strategic', 'submaster', 'Submaster', 3, 4, 'Tab 05', '2,00%', NULL, NULL, NULL, '{"when":"Venda fechada na tabela 5","observation":"Imposto 10% sobre comissão"}'),
('strategic', 'submaster', 'Submaster', 3, 5, 'Tab 06', '2,25%', NULL, NULL, NULL, '{"when":"Venda fechada na tabela 6","observation":"Imposto 10% sobre comissão"}'),
('strategic', 'submaster', 'Submaster', 3, 6, 'Tab 07', '2,50%', NULL, NULL, NULL, '{"when":"Venda fechada na tabela 7","observation":"Imposto 10% sobre comissão"}');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_commission_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_commission_rules_updated_at
  BEFORE UPDATE ON commission_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_rules_updated_at();
