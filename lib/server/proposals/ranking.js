/**
 * Deterministic Ranking & Scoring Engine for Proposal Simulator
 * Evaluates options mathematically based on user constraints and priority settings.
 */

const { parseBrCurrency } = require('./normalizer');

// Centralized configuration weights for "Melhor Equilíbrio" priority (no magic numbers)
const RANKING_WEIGHTS = {
  CREDIT_MATCH: 0.35,         // Closeness to desired credit
  FIRST_INST_REDUCTION: 0.20,  // Low 1st installment
  TEMP_INST_REDUCTION: 0.20,   // Low temporary installment
  FINAL_INST_REDUCTION: 0.15,   // Low final installment
  TEMP_TERM_LENGTH: 0.10,      // More months with reduced temporary installment
};

/**
 * Ranks proposals according to mathematical criteria and user filters.
 */
function rankProposals(allOptions, params) {
  const desiredCredit = params.desired_credit ? parseBrCurrency(params.desired_credit) : null;
  const hasDesiredCredit = desiredCredit !== null && desiredCredit > 0;
  
  const minCredit = params.minimum_credit ? parseBrCurrency(params.minimum_credit) : null;
  const maxCredit = params.maximum_credit ? parseBrCurrency(params.maximum_credit) : null;
  
  const maxFirstInst = parseBrCurrency(params.maximum_first_installment || params.max_first_installment || Infinity);
  const maxInst = parseBrCurrency(params.maximum_installment || params.max_installment || Infinity);

  const priority = (params.ranking_priority || 'EQUILIBRIO').toUpperCase();
  const allowExpired = params.allow_expired === true || params.allow_expired === 'true';
  const today = new Date().toISOString().split('T')[0];

  const validProposals = [];
  const nearMatches = [];

  allOptions.forEach((option) => {
    // Expiration check unless explicit admin override
    if (!allowExpired && option.valid_until && option.valid_until < today) {
      return; // Skip expired option
    }

    const credit = Number(option.credit_value);
    const firstInst = Number(option.first_installment);
    const finalInst = Number(option.final_installment_value);
    const finalInstReduced = finalInst * 0.5; // Apply 50% reduction for budget matching

    // Calculate budget excesses (based on entry and 50% reduced final installment)
    const firstExcess = firstInst > maxFirstInst ? firstInst - maxFirstInst : 0;
    const instExcess = finalInstReduced > maxInst ? finalInstReduced - maxInst : 0;

    let isCreditValid = true;
    if (minCredit !== null && credit < minCredit) isCreditValid = false;
    if (maxCredit !== null && credit > maxCredit) isCreditValid = false;

    const totalExcess = firstExcess + instExcess;
    const marginForNear = hasDesiredCredit ? (desiredCredit * 0.15) : 10000;

    if (isCreditValid && totalExcess === 0) {
      // Perfectly within strict limits
      validProposals.push({
        ...option,
        credit_diff: hasDesiredCredit ? Math.abs(credit - desiredCredit) : 0,
        temp_months: (option.temporary_installment_end - option.temporary_installment_start + 1) || 0,
      });
    } else if (isCreditValid && totalExcess > 0 && totalExcess <= marginForNear) {
      // Near match: exceeded limits slightly
      const excessMessages = [];
      if (firstExcess > 0) excessMessages.push(`Ultrapassa a entrada/1ª parcela em R$ ${firstExcess.toFixed(2).replace('.', ',')}`);
      if (instExcess > 0) excessMessages.push(`Ultrapassa a meia parcela em R$ ${instExcess.toFixed(2).replace('.', ',')}`);

      nearMatches.push({
        ...option,
        credit_diff: hasDesiredCredit ? Math.abs(credit - desiredCredit) : 0,
        excess_amount: totalExcess,
        excess_reason: excessMessages.join(' | '),
      });
    }
  });

  // Sort valid proposals according to selected priority
  if (priority === 'MAIOR_CREDITO') {
    validProposals.sort((a, b) => b.credit_value - a.credit_value || a.first_installment - b.first_installment);
  } else if (priority === 'CREDITO_PROXIMO') {
    if (hasDesiredCredit) {
      validProposals.sort((a, b) => a.credit_diff - b.credit_diff || a.first_installment - b.first_installment);
    } else {
      validProposals.sort((a, b) => b.credit_value - a.credit_value || a.first_installment - b.first_installment);
    }
  } else if (priority === 'MENOR_ENTRADA') {
    validProposals.sort((a, b) => a.first_installment - b.first_installment || b.credit_value - a.credit_value);
  } else if (priority === 'MENOR_TEMPORARIA') {
    validProposals.sort((a, b) => a.temporary_installment_value - b.temporary_installment_value || b.credit_value - a.credit_value);
  } else if (priority === 'MENOR_POSTERIOR') {
    validProposals.sort((a, b) => a.final_installment_value - b.final_installment_value || b.credit_value - a.credit_value);
  } else if (priority === 'MAIS_MESES_REDUZIDOS') {
    validProposals.sort((a, b) => b.temp_months - a.temp_months || a.temporary_installment_value - b.temporary_installment_value);
  } else {
    // Default: MELHOR_EQUILIBRIO (Normalized Multi-Attribute Scoring)
    const maxCreditDiff = Math.max(...validProposals.map(p => p.credit_diff), 1);
    const maxFirst = Math.max(...validProposals.map(p => p.first_installment), 1);
    const maxTemp = Math.max(...validProposals.map(p => p.temporary_installment_value), 1);
    const maxFinal = Math.max(...validProposals.map(p => p.final_installment_value), 1);
    const maxCreditVal = Math.max(...validProposals.map(p => p.credit_value), 1);
    validProposals.forEach(p => {
      const creditScore = hasDesiredCredit
        ? (1 - (p.credit_diff / maxCreditDiff)) * RANKING_WEIGHTS.CREDIT_MATCH
        : (p.credit_value / maxCreditVal) * RANKING_WEIGHTS.CREDIT_MATCH;
      const firstScore = (1 - (p.first_installment / maxFirst)) * RANKING_WEIGHTS.FIRST_INST_REDUCTION;
      const tempScore = (1 - (p.temporary_installment_value / maxTemp)) * RANKING_WEIGHTS.TEMP_INST_REDUCTION;
      const finalScore = (1 - (p.final_installment_value / maxFinal)) * RANKING_WEIGHTS.FINAL_INST_REDUCTION;
      const termScore = (p.temp_months / 180) * RANKING_WEIGHTS.TEMP_TERM_LENGTH;

      p.total_score = creditScore + firstScore + tempScore + finalScore + termScore;
    });

    validProposals.sort((a, b) => b.total_score - a.total_score);
  }

  // Sort near matches by smallest excess amount
  nearMatches.sort((a, b) => a.excess_amount - b.excess_amount);

  // Apply badges to top items
  if (validProposals.length > 0) {
    validProposals[0].badge = "Melhor opção";
    
    // Find min entry item
    let minEntryItem = validProposals[0];
    let minTempItem = validProposals[0];
    let maxCredItem = validProposals[0];

    validProposals.forEach(p => {
      if (p.first_installment < minEntryItem.first_installment) minEntryItem = p;
      if (p.temporary_installment_value < minTempItem.temporary_installment_value) minTempItem = p;
      if (p.credit_value > maxCredItem.credit_value) maxCredItem = p;
    });

    if (!minEntryItem.badge) minEntryItem.badge = "Menor entrada";
    if (!minTempItem.badge) minTempItem.badge = "Menor parcela";
    if (!maxCredItem.badge) maxCredItem.badge = "Maior crédito";
  }

  return {
    validProposals,
    nearMatches,
    totalEvaluated: allOptions.length,
    validCount: validProposals.length,
  };
}

module.exports = {
  rankProposals,
  RANKING_WEIGHTS,
};
