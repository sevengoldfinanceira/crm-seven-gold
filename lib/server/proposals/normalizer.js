/**
 * Normalizer Utilities for Proposal Simulator
 * Converts Brazilian currency, percentages, and table numbers correctly.
 */

/**
 * Converts Brazilian currency format string to a Number
 * Example: "141.058,96" -> 141058.96
 * Example: "1.034,68" -> 1034.68
 */
function parseBrCurrency(str) {
  if (typeof str === 'number') return str;
  if (!str || typeof str !== 'string') return 0;

  // Clean currency symbols and spaces
  let cleaned = str.replace(/[R$\s]/g, '').trim();

  // If format is 141.058,96
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Converts Brazilian percentage format string to a Number
 * Example: "27,0000" -> 27.0
 */
function parseBrPercentage(str) {
  if (typeof str === 'number') return str;
  if (!str || typeof str !== 'string') return 0;
  
  let cleaned = str.replace(/[%]/g, '').trim().replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Formats number to Brazilian Real currency format
 * Example: 248263.77 -> "R$ 248.263,77"
 */
function formatBrCurrency(val) {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Preserves leading zeros in table numbers
 * Example: 4739 -> "000004739"
 */
function normalizeTableNumber(str) {
  if (!str) return '000000000';
  const clean = String(str).trim();
  if (clean.length < 9 && /^\d+$/.test(clean)) {
    return clean.padStart(9, '0');
  }
  return clean;
}

module.exports = {
  parseBrCurrency,
  parseBrPercentage,
  formatBrCurrency,
  normalizeTableNumber,
};
