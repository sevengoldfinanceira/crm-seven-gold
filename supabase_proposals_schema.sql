-- =========================================================
-- MIGRATION: SIMULADOR DE PROPOSTAS - CRM SEVEN GOLD
-- PostgreSQL Schema for Supabase
-- =========================================================

-- 1. Tabela de Importações de Tabelas Comerciais (PDF / Drive)
CREATE TABLE IF NOT EXISTS proposal_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL DEFAULT 'UPLOAD', -- UPLOAD, GOOGLE_DRIVE
    source_file_name VARCHAR(255) NOT NULL,
    source_drive_file_id VARCHAR(255),
    source_drive_folder_id VARCHAR(255),
    file_hash VARCHAR(64) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    page_count INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW', -- PROCESSING, PENDING_REVIEW, VALIDATED, ACTIVE, REJECTED, ARCHIVED, FAILED
    version VARCHAR(50) NOT NULL,
    valid_tables_count INT NOT NULL DEFAULT 0,
    proposal_rows_count INT NOT NULL DEFAULT 0,
    warning_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    error_details JSONB DEFAULT '[]'::jsonb,
    raw_metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_by VARCHAR(255),
    reviewed_by VARCHAR(255),
    activated_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Tabelas Comerciais (Header do Produto)
CREATE TABLE IF NOT EXISTS proposal_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID REFERENCES proposal_imports(id) ON DELETE CASCADE,
    administrator_name VARCHAR(255) NOT NULL DEFAULT 'Seven Gold / Administradora',
    product_name VARCHAR(255) NOT NULL,
    table_number VARCHAR(50) NOT NULL,
    valid_from DATE,
    valid_until DATE NOT NULL,
    total_term_months INT NOT NULL,
    administration_fee_percentage NUMERIC(8, 4) DEFAULT 0,
    anticipation_percentage NUMERIC(8, 4) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, ARCHIVED, EXPIRED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Opções de Crédito e Parcelamento por Tabela
CREATE TABLE IF NOT EXISTS proposal_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_table_id UUID REFERENCES proposal_tables(id) ON DELETE CASCADE,
    credit_value NUMERIC(15, 2) NOT NULL,
    first_installment NUMERIC(15, 2) NOT NULL,
    first_installment_start INT NOT NULL DEFAULT 1,
    first_installment_end INT NOT NULL DEFAULT 1,
    temporary_installment_value NUMERIC(15, 2) NOT NULL,
    temporary_installment_start INT NOT NULL DEFAULT 2,
    temporary_installment_end INT NOT NULL DEFAULT 9,
    final_installment_value NUMERIC(15, 2) NOT NULL,
    final_installment_start INT NOT NULL DEFAULT 10,
    final_installment_end INT NOT NULL DEFAULT 180,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabela de Grupos e Condições Adicionais
CREATE TABLE IF NOT EXISTS proposal_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_table_id UUID REFERENCES proposal_tables(id) ON DELETE CASCADE,
    group_code VARCHAR(100) NOT NULL,
    group_term_months INT NOT NULL,
    insurance_percentage NUMERIC(8, 4) DEFAULT 0,
    reserve_fund_percentage NUMERIC(8, 4) DEFAULT 0,
    adjustment_index VARCHAR(50) DEFAULT 'INCC / INPC',
    fixed_bid_percentage NUMERIC(8, 4) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabela de Histórico de Simulações e Propostas Selecionadas
CREATE TABLE IF NOT EXISTS proposal_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    attendance_id VARCHAR(255),
    lead_id VARCHAR(255),
    desired_credit NUMERIC(15, 2),
    minimum_credit NUMERIC(15, 2),
    maximum_credit NUMERIC(15, 2),
    maximum_first_installment NUMERIC(15, 2),
    maximum_temporary_installment NUMERIC(15, 2),
    maximum_final_installment NUMERIC(15, 2),
    ranking_priority VARCHAR(100) DEFAULT 'EQUILIBRIO',
    filters JSONB DEFAULT '{}'::jsonb,
    result_count INT DEFAULT 0,
    selected_proposal_option_id UUID REFERENCES proposal_options(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDICES DE DESEMPENHO E BUSCA RAPIDA
CREATE INDEX IF NOT EXISTS idx_proposal_options_credit ON proposal_options(credit_value);
CREATE INDEX IF NOT EXISTS idx_proposal_options_first_inst ON proposal_options(first_installment);
CREATE INDEX IF NOT EXISTS idx_proposal_options_temp_inst ON proposal_options(temporary_installment_value);
CREATE INDEX IF NOT EXISTS idx_proposal_options_final_inst ON proposal_options(final_installment_value);
CREATE INDEX IF NOT EXISTS idx_proposal_tables_table_num ON proposal_tables(table_number);
CREATE INDEX IF NOT EXISTS idx_proposal_tables_valid_until ON proposal_tables(valid_until);
CREATE INDEX IF NOT EXISTS idx_proposal_tables_status ON proposal_tables(status);
CREATE INDEX IF NOT EXISTS idx_proposal_imports_hash ON proposal_imports(file_hash);
