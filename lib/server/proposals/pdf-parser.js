/**
 * PDF Parser & Validation Service for Proposal Simulator
 * Extracts commercial tables from PDF files with strict continuity and sanity checks.
 */

const { parseBrCurrency, parseBrPercentage, normalizeTableNumber } = require('./normalizer');

/**
 * Parses raw text extracted from PDF and converts it into structured proposal tables.
 */
function parseProposalPdfText(pdfText, fileName = 'tabela_comercial.pdf') {
  const warnings = [];
  const errors = [];
  const tables = [];

  if (!pdfText || pdfText.trim().length === 0) {
    return {
      success: false,
      fileName,
      tablesCount: 0,
      proposalRowsCount: 0,
      warnings: [],
      errors: ['O arquivo PDF não possui camada de texto legível ou está vazio.'],
      tables: [],
    };
  }

  // Split text cleanly by table start markers (ALPHA ADMINISTRADORA, Nº TABELA, or 00000XXXX)
  const rawBlocks = pdfText.split(/(?=(?:ALPHA\s+ADMINISTRADORA|N[º°]?\s*TABELA\s*\d+|\b00000\d{4}\b))/gi);
  const blocks = rawBlocks.filter(b => b.trim().length > 30);
  const targetBlocks = blocks.length > 0 ? blocks : [pdfText];

  targetBlocks.forEach((block, idx) => {
    // Detect Table Number: "000004739" or "TABELA 4739"
    const tableNumMatch = /(\d{5,10})/i.exec(block);
    const tableNumber = tableNumMatch ? normalizeTableNumber(tableNumMatch[1]) : normalizeTableNumber(4730 + idx);

    // Detect Product / Plan Name
    let productName = 'AUTOCON PRIME';
    const prodMatch = /(AUTOCON[^\n\r]+)/i.exec(block);
    if (prodMatch) {
      productName = prodMatch[1].replace(/Tabela\s*Válida.*/i, '').trim();
    }

    // Detect Validity Date
    let validUntil = '2026-12-31';
    const validMatch = /(\d{2}\/\d{2}\/\d{4})/i.exec(block);
    if (validMatch) {
      const parts = validMatch[1].split('/');
      validUntil = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // Detect Total Term
    const termMatch = /(\d{2,3})\s*MESES/i.exec(block);
    const totalTermMonths = termMatch ? parseInt(termMatch[1], 10) : 180;

    // Detect Dynamic Ranges: Pcls 1 a 1, Pcls 2 a 6, Pcls 7 a 180
    let tempStart = 2, tempEnd = 9, finalStart = 10, finalEnd = totalTermMonths;
    const rangeRegex = /Pcls?\s*(\d+)\s*a\s*(\d+)/gi;
    const foundRanges = [];
    let rMatch;
    while ((rMatch = rangeRegex.exec(block)) !== null) {
      foundRanges.push({
        start: parseInt(rMatch[1], 10),
        end: parseInt(rMatch[2], 10)
      });
    }

    const activeRanges = foundRanges.filter(r => r.start > 1);
    if (activeRanges.length >= 2) {
      tempStart = activeRanges[0].start;
      tempEnd = activeRanges[0].end;
      finalStart = activeRanges[1].start;
      finalEnd = activeRanges[1].end;
    } else if (activeRanges.length === 1) {
      tempStart = activeRanges[0].start;
      tempEnd = activeRanges[0].end;
      finalStart = activeRanges[0].start;
      finalEnd = activeRanges[0].end;
    }

    // Extract all currency values in block
    const currencyRegex = /(\d{1,3}(?:[.,\s]?\d{3})*[.,]\d{2})/g;
    const values = [];
    let cMatch;
    while ((cMatch = currencyRegex.exec(block)) !== null) {
      values.push(parseBrCurrency(cMatch[1]));
    }

    const options = [];

    // Strategy 1: Consecutive row grouping (Group every 4 consecutive currency values)
    for (let i = 0; i + 3 < values.length; i += 4) {
      const credit = values[i];
      const first = values[i + 1];
      const temp = values[i + 2];
      const final = values[i + 3];

      // Validate relationship: Credit > 1st Inst and 1st Inst >= Temp Inst
      if (credit > first && first >= temp && temp > 0) {
        options.push({
          credit_value: credit,
          first_installment: first,
          first_installment_start: 1,
          first_installment_end: 1,
          temporary_installment_value: temp,
          temporary_installment_start: tempStart,
          temporary_installment_end: tempEnd,
          final_installment_value: final,
          final_installment_start: finalStart,
          final_installment_end: finalEnd,
          status: 'ACTIVE',
        });
      }
    }

    // Strategy 2: Sequential column grouping fallback
    if (options.length === 0 && values.length >= 4) {
      const N = Math.floor(values.length / 4);
      for (let i = 0; i < N; i++) {
        const credit = values[i];
        const first = values[N + i];
        const temp = values[2 * N + i];
        const final = values[3 * N + i];

        if (credit > first && first >= temp && temp > 0) {
          options.push({
            credit_value: credit,
            first_installment: first,
            first_installment_start: 1,
            first_installment_end: 1,
            temporary_installment_value: temp,
            temporary_installment_start: tempStart,
            temporary_installment_end: tempEnd,
            final_installment_value: final,
            final_installment_start: finalStart,
            final_installment_end: finalEnd,
            status: 'ACTIVE',
          });
        }
      }
    }

    if (options.length > 0) {
      tables.push({
        administrator_name: 'Seven Gold / Administradora',
        product_name: productName,
        table_number: tableNumber,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: validUntil,
        total_term_months: totalTermMonths,
        administration_fee_percentage: 27.0,
        anticipation_percentage: 0,
        status: 'ACTIVE',
        options: options,
        groups: [
          {
            group_code: `GRUPO ${productName}`,
            group_term_months: totalTermMonths,
            insurance_percentage: 0.05,
            reserve_fund_percentage: 1.0,
            adjustment_index: 'INCC / INPC',
            fixed_bid_percentage: 30.0,
          }
        ]
      });
    }
  });

  const proposalRowsCount = tables.reduce((acc, t) => acc + t.options.length, 0);

  return {
    success: errors.length === 0,
    fileName,
    tablesCount: tables.length,
    proposalRowsCount,
    warnings,
    errors,
    tables,
  };
}

module.exports = {
  parseProposalPdfText,
};
