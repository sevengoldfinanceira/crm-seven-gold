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
      errors: ['O arquivo PDF não possui camada de texto legível ou está vazio.'],
      warnings: [],
      tables: [],
    };
  }

  // Regex patterns for dynamic table recognition
  const tableHeaderRegex = /(?:TABELA|TAB)\s*[:\.]?\s*(\d{5,10})/gi;
  const productRegex = /(?:PLANO|PRODUTO|GRUPO)\s*[:\.]?\s*([A-Z0-9\s\-_]{3,40})/gi;
  const validityRegex = /(?:VALIDADE|VIGÊNCIA|VÁLIDO ATÉ)\s*[:\.]?\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/gi;
  const termRegex = /(?:PRAZO|MESES)\s*[:\.]?\s*(\d{2,3})\s*(?:MESES|M)?/gi;

  // Split text into potential table blocks
  const blocks = pdfText.split(/(?=TABELA|TAB\s*\d|PLANO\s*AUTOCON)/gi);

  blocks.forEach((block, idx) => {
    if (block.trim().length < 40) return;

    // Detect Table Number
    const tableMatch = /TABELA\s*[:\.\-]?\s*(\d{5,10})/i.exec(block) || /TAB\s*[:\.\-]?\s*(\d{5,10})/i.exec(block);
    const tableNumber = tableMatch ? normalizeTableNumber(tableMatch[1]) : `00000${4730 + idx}`;

    // Detect Product / Plan Name
    const productMatch = /PLANO\s*[:\.\-]?\s*([A-Z0-9\s\-_]{3,30})/i.exec(block) || /PRODUTO\s*[:\.\-]?\s*([A-Z0-9\s\-_]{3,30})/i.exec(block);
    const productName = productMatch ? productMatch[1].trim() : 'AUTOCON PRIME';

    // Detect Validity Date
    const validMatch = /(\d{2}\/\d{2}\/\d{4})/i.exec(block);
    let validUntil = '2026-12-31';
    if (validMatch) {
      const parts = validMatch[1].split('/');
      validUntil = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // Detect Total Term
    const termMatch = /(\d{2,3})\s*MESES/i.exec(block);
    const totalTermMonths = termMatch ? parseInt(termMatch[1], 10) : 180;

    // Dynamic Installment Range Detection: "Pcls 1 a 1", "Pcls 2 a 9", "Pcls 10 a 180"
    let tempStart = 2, tempEnd = 9, finalStart = 10, finalEnd = totalTermMonths;

    const rangeMatch = /Pcls?\s*(\d+)\s*a\s*(\d+).*?Pcls?\s*(\d+)\s*a\s*(\d+)/i.exec(block);
    if (rangeMatch) {
      tempStart = parseInt(rangeMatch[1], 10);
      tempEnd = parseInt(rangeMatch[2], 10);
      finalStart = parseInt(rangeMatch[3], 10);
      finalEnd = parseInt(rangeMatch[4], 10);
    }

    // Validate Month Continuity Rule
    if (tempStart !== 2) {
      warnings.push(`Tabela ${tableNumber}: A parcela temporária não inicia no mês 2 (detectado: mês ${tempStart}).`);
    }
    if (finalStart !== tempEnd + 1) {
      errors.push(`Tabela ${tableNumber}: Buraco entre faixas de parcelas. Temporária termina no mês ${tempEnd} e final inicia em ${finalStart}.`);
    }
    if (finalEnd !== totalTermMonths) {
      warnings.push(`Tabela ${tableNumber}: Faixa final termina em ${finalEnd} mas o prazo total informado é ${totalTermMonths}.`);
    }

    // Extract Rows (Credit, 1st Inst, Temp Inst, Final Inst)
    const options = [];
    // Match line pattern: "R$ 248.263,77   17.900,69   1.866,32   1.866,33"
    const rowRegex = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g;

    let match;
    while ((match = rowRegex.exec(block)) !== null) {
      const credit = parseBrCurrency(match[1]);
      const firstInst = parseBrCurrency(match[2]);
      const tempInst = parseBrCurrency(match[3]);
      const finalInst = parseBrCurrency(match[4]);

      if (credit > 0 && firstInst > 0 && tempInst > 0 && finalInst > 0) {
        options.push({
          credit_value: credit,
          first_installment: firstInst,
          first_installment_start: 1,
          first_installment_end: 1,
          temporary_installment_value: tempInst,
          temporary_installment_start: tempStart,
          temporary_installment_end: tempEnd,
          final_installment_value: finalInst,
          final_installment_start: finalStart,
          final_installment_end: finalEnd,
          status: 'ACTIVE',
        });
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
            group_code: 'GRUPO AUTOCON PRIME',
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
