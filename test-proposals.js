/**
 * Unit Tests for Proposal Simulator Module
 */

const assert = require('assert');
const { parseBrCurrency, parseBrPercentage, formatBrCurrency, normalizeTableNumber } = require('./lib/server/proposals/normalizer');
const { rankProposals } = require('./lib/server/proposals/ranking');
const { parseProposalPdfText } = require('./lib/server/proposals/pdf-parser');

console.log("=== EXECUTANDO TESTES UNITÁRIOS DO SIMULADOR DE PROPOSTAS ===");

// Test 1: Normalizers
assert.strictEqual(parseBrCurrency("141.058,96"), 141058.96);
assert.strictEqual(parseBrCurrency("R$ 248.263,77"), 248263.77);
assert.strictEqual(parseBrPercentage("27,0000%"), 27.0);
assert.strictEqual(normalizeTableNumber("4739"), "000004739");
console.log("✓ Teste 1: Normalizadores de moeda e percentual OK!");

// Test 2: Ranking Engine (Test case from section 19 of requirements)
const mockOptions = [
  {
    id: "opt-4739",
    table_number: "000004739",
    product_name: "AUTOCON PRIME",
    administrator_name: "Seven Gold",
    valid_until: "2026-12-31",
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
    source_file_name: "Tabela.pdf"
  },
  {
    id: "opt-overbudget",
    table_number: "000009999",
    product_name: "AUTOCON OUT",
    administrator_name: "Seven Gold",
    valid_until: "2026-12-31",
    total_term_months: 180,
    credit_value: 248263.77,
    first_installment: 30000.00, // Exceeds max first inst of 24.000
    temporary_installment_value: 2000.00, // Exceeds max temp inst of 1.850
    final_installment_value: 2000.00,
    source_file_name: "Tabela.pdf"
  }
];

const searchParams = {
  desired_credit: "R$ 250.000,00",
  maximum_first_installment: "R$ 24.000,00",
  maximum_installment: "R$ 1.850,00",
  ranking_priority: "CREDITO_PROXIMO"
};

const results = rankProposals(mockOptions, searchParams);
assert.strictEqual(results.validCount, 1);
assert.strictEqual(results.validProposals[0].table_number, "000004739");
assert.strictEqual(results.nearMatches.length, 1);
assert.strictEqual(results.nearMatches[0].table_number, "000009999");
console.log("✓ Teste 2: Algoritmo de Ranking e Opções Próximas OK!");

// Test 3: PDF Parser & Continuity Validation
const samplePdfText = `
  TABELA: 000003747
  PLANO: AUTOCON PRIME
  VALIDADE: 15/05/2026
  PRAZO: 180 MESES
  Pcls 1 a 1
  Pcls 2 a 9
  Pcls 10 a 180
  R$ 248.263,77   17.900,69   1.866,32   1.866,33
`;

const parsed = parseProposalPdfText(samplePdfText);
assert.strictEqual(parsed.success, true);
assert.strictEqual(parsed.tablesCount, 1);
assert.strictEqual(parsed.proposalRowsCount, 1);
assert.strictEqual(parsed.tables[0].table_number, "000003747");
assert.strictEqual(parsed.tables[0].options[0].first_installment, 17900.69);
console.log("✓ Teste 3: Parser de PDF e Validação de Faixas de Meses OK!");

console.log("\nALL PROPOSAL SIMULATOR TESTS PASSED SUCCESSFULLY! (100% AUDITABLE)\n");
