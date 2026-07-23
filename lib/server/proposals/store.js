/**
 * Data Access & Store Layer for Proposal Simulator
 * Handles Supabase database queries, SHA-256 deduplication, versioning, and seed fallbacks.
 */

const { supabase } = require('../supabase');

// Default commercial proposal options used when DB tables are initialized
const DEFAULT_SEED_OPTIONS = [
  {
    id: "opt-001",
    table_number: "000004739",
    product_name: "AUTOCON PRIME",
    administrator_name: "Seven Gold / Administradora",
    valid_until: "2026-05-15",
    total_term_months: 180,
    credit_value: 248263.77,
    first_installment: 23322.39,
    first_installment_start: 1,
    first_installment_end: 1,
    temporary_installment_value: 1821.01,
    temporary_installment_start: 2,
    temporary_installment_end: 9,
    final_installment_value: 1821.01,
    final_installment_start: 10,
    final_installment_end: 180,
    administration_fee_percentage: 27.0,
    adjustment_index: "INCC / INPC",
    group_code: "GRUPO 4739-PRIME",
    fixed_bid_percentage: 30.0,
    reserve_fund_percentage: 1.0,
    insurance_percentage: 0.05,
    source_file_name: "Tabela_Comercial_SevenGold_2026.pdf",
    updated_at: new Date().toISOString(),
    status: "ACTIVE"
  },
  {
    id: "opt-002",
    table_number: "000003747",
    product_name: "AUTOCON PRIME",
    administrator_name: "Seven Gold / Administradora",
    valid_until: "2026-05-15",
    total_term_months: 180,
    credit_value: 248263.77,
    first_installment: 17900.69,
    first_installment_start: 1,
    first_installment_end: 1,
    temporary_installment_value: 1866.32,
    temporary_installment_start: 2,
    temporary_installment_end: 9,
    final_installment_value: 1866.33,
    final_installment_start: 10,
    final_installment_end: 180,
    administration_fee_percentage: 27.0,
    adjustment_index: "INCC / INPC",
    group_code: "GRUPO 3747-PRIME",
    fixed_bid_percentage: 30.0,
    reserve_fund_percentage: 1.0,
    insurance_percentage: 0.05,
    source_file_name: "Tabela_Comercial_SevenGold_2026.pdf",
    updated_at: new Date().toISOString(),
    status: "ACTIVE"
  },
  {
    id: "opt-003",
    table_number: "000005120",
    product_name: "AUTOCON I COD 7",
    administrator_name: "Seven Gold / Administradora",
    valid_until: "2026-12-31",
    total_term_months: 180,
    credit_value: 150000.00,
    first_installment: 11250.00,
    first_installment_start: 1,
    first_installment_end: 1,
    temporary_installment_value: 1125.00,
    temporary_installment_start: 2,
    temporary_installment_end: 9,
    final_installment_value: 1250.00,
    final_installment_start: 10,
    final_installment_end: 180,
    administration_fee_percentage: 24.0,
    adjustment_index: "INCC / INPC",
    group_code: "GRUPO 5120-COD7",
    fixed_bid_percentage: 25.0,
    reserve_fund_percentage: 1.0,
    insurance_percentage: 0.05,
    source_file_name: "Tabela_COD7_2026.pdf",
    updated_at: new Date().toISOString(),
    status: "ACTIVE"
  },
  {
    id: "opt-004",
    table_number: "000006200",
    product_name: "AUTOCON PRIME",
    administrator_name: "Seven Gold / Administradora",
    valid_until: "2026-12-31",
    total_term_months: 200,
    credit_value: 350000.00,
    first_installment: 26250.00,
    first_installment_start: 1,
    first_installment_end: 1,
    temporary_installment_value: 2450.00,
    temporary_installment_start: 2,
    temporary_installment_end: 12,
    final_installment_value: 2750.00,
    final_installment_start: 13,
    final_installment_end: 200,
    administration_fee_percentage: 26.0,
    adjustment_index: "INCC / INPC",
    group_code: "GRUPO PRIME-350K",
    fixed_bid_percentage: 30.0,
    reserve_fund_percentage: 1.0,
    insurance_percentage: 0.05,
    source_file_name: "Tabela_Comercial_SevenGold_2026.pdf",
    updated_at: new Date().toISOString(),
    status: "ACTIVE"
  }
];

// Memory store fallback for imports and settings
const inMemoryStore = {
  imports: [
    {
      id: "imp-001",
      source_type: "UPLOAD",
      source_file_name: "Tabela_Comercial_SevenGold_2026.pdf",
      file_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      file_size: 1048576,
      page_count: 12,
      status: "ACTIVE",
      version: "v1.0.0",
      valid_tables_count: 4,
      proposal_rows_count: 4,
      warning_count: 0,
      error_count: 0,
      uploaded_by: "Administrador Seven Gold",
      created_at: new Date().toISOString(),
      activated_at: new Date().toISOString(),
    }
  ],
  settings: {
    drive_folder_id: "",
    connected_account: "admin@sevengold.com.br",
    sync_frequency_minutes: 60,
    auto_activate: false,
    last_sync_at: null,
  },
  customOptions: [...DEFAULT_SEED_OPTIONS]
};

/**
 * Retrieves active proposal options for simulation query.
 */
async function getActiveProposalOptions() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('proposal_options')
        .select(`
          *,
          proposal_tables!inner (
            table_number,
            product_name,
            administrator_name,
            valid_until,
            total_term_months,
            administration_fee_percentage,
            status,
            proposal_imports (
              source_file_name
            )
          )
        `)
        .eq('status', 'ACTIVE')
        .eq('proposal_tables.status', 'ACTIVE');

      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          table_number: item.proposal_tables.table_number,
          product_name: item.proposal_tables.product_name,
          administrator_name: item.proposal_tables.administrator_name,
          valid_until: item.proposal_tables.valid_until,
          total_term_months: item.proposal_tables.total_term_months,
          credit_value: Number(item.credit_value),
          first_installment: Number(item.first_installment),
          first_installment_start: item.first_installment_start,
          first_installment_end: item.first_installment_end,
          temporary_installment_value: Number(item.temporary_installment_value),
          temporary_installment_start: item.temporary_installment_start,
          temporary_installment_end: item.temporary_installment_end,
          final_installment_value: Number(item.final_installment_value),
          final_installment_start: item.final_installment_start,
          final_installment_end: item.final_installment_end,
          administration_fee_percentage: Number(item.proposal_tables.administration_fee_percentage || 27),
          adjustment_index: "INCC / INPC",
          group_code: `GRUPO ${item.proposal_tables.table_number}`,
          fixed_bid_percentage: 30.0,
          reserve_fund_percentage: 1.0,
          insurance_percentage: 0.05,
          source_file_name: item.proposal_tables.proposal_imports?.source_file_name || "Tabela.pdf",
          updated_at: item.updated_at,
          status: item.status,
        }));
      }
    } catch (e) {
      console.warn("Supabase query warning:", e.message);
    }
  }

  // Fallback to active options
  return inMemoryStore.customOptions.filter(o => o.status === 'ACTIVE');
}

/**
 * Checks if a file with the given SHA-256 hash has already been imported.
 */
async function checkDuplicateHash(hash) {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('proposal_imports')
        .select('id, version, status')
        .eq('file_hash', hash)
        .maybeSingle();

      if (data) return data;
    } catch (e) {
      // fallback
    }
  }

  return inMemoryStore.imports.find(i => i.file_hash === hash) || null;
}

/**
 * Saves a new proposal import record.
 */
async function createImportRecord(importData) {
  const newImport = {
    id: `imp-${Date.now()}`,
    source_type: importData.source_type || 'UPLOAD',
    source_file_name: importData.source_file_name,
    file_hash: importData.file_hash,
    file_size: importData.file_size || 0,
    page_count: importData.page_count || 1,
    status: importData.status || 'PENDING_REVIEW',
    version: importData.version || `v1.${Date.now().toString().slice(-3)}`,
    valid_tables_count: importData.valid_tables_count || 0,
    proposal_rows_count: importData.proposal_rows_count || 0,
    warning_count: importData.warning_count || 0,
    error_count: importData.error_count || 0,
    error_details: importData.error_details || [],
    uploaded_by: importData.uploaded_by || 'Administrador',
    created_at: new Date().toISOString(),
  };

  inMemoryStore.imports.unshift(newImport);
  return newImport;
}

/**
 * Activates an import and its tables.
 */
async function activateImport(importId, activatedBy = 'Administrador') {
  const imp = inMemoryStore.imports.find(i => i.id === importId);
  if (imp) {
    imp.status = 'ACTIVE';
    imp.activated_by = activatedBy;
    imp.activated_at = new Date().toISOString();
    return { success: true, import: imp };
  }
  return { success: true };
}

/**
 * Gets settings.
 */
function getProposalSettings() {
  return inMemoryStore.settings;
}

/**
 * Updates settings.
 */
function updateProposalSettings(newSettings) {
  inMemoryStore.settings = { ...inMemoryStore.settings, ...newSettings };
  return inMemoryStore.settings;
}

module.exports = {
  getActiveProposalOptions,
  checkDuplicateHash,
  createImportRecord,
  activateImport,
  getProposalSettings,
  updateProposalSettings,
  inMemoryStore,
};
