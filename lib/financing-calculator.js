(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SevenGoldFinancing = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EPSILON = 1e-9;
  const asNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };
  const roundMoney = (value) => Math.round((asNumber(value) + Number.EPSILON) * 100) / 100;
  const normalizeList = (value) => Array.isArray(value) ? value.map((item) => String(item).toLowerCase()) : [];

  function annualToMonthlyRate(annualPercent) {
    const annualRate = asNumber(annualPercent) / 100;
    if (annualRate <= -1) throw new RangeError("A taxa anual deve ser maior que -100%.");
    return Math.pow(1 + annualRate, 1 / 12) - 1;
  }

  function monthlyToAnnualRate(monthlyRate) {
    const rate = asNumber(monthlyRate);
    if (rate <= -1) throw new RangeError("A taxa mensal deve ser maior que -100%.");
    return Math.pow(1 + rate, 12) - 1;
  }

  function annualRateToMonthly(annualPercent, rateType) {
    return String(rateType || "EFETIVA").toUpperCase() === "NOMINAL"
      ? asNumber(annualPercent) / 1200
      : annualToMonthlyRate(annualPercent);
  }

  function calculateFinancedValues({ propertyValue, downPayment, financedAmount, financedPercent }) {
    const property = Math.max(0, asNumber(propertyValue));
    let entry = Math.max(0, asNumber(downPayment));
    let financed = Math.max(0, asNumber(financedAmount));
    let percent = Math.max(0, asNumber(financedPercent));

    if (property <= 0) return { propertyValue: 0, downPayment: 0, financedAmount: 0, financedPercent: 0 };
    if (financed > 0) {
      financed = Math.min(financed, property);
      entry = property - financed;
      percent = (financed / property) * 100;
    } else if (percent > 0) {
      percent = Math.min(percent, 100);
      financed = property * (percent / 100);
      entry = property - financed;
    } else {
      entry = Math.min(entry, property);
      financed = property - entry;
      percent = (financed / property) * 100;
    }

    return {
      propertyValue: roundMoney(property),
      downPayment: roundMoney(entry),
      financedAmount: roundMoney(financed),
      financedPercent: Math.round(percent * 10000) / 10000,
    };
  }

  function monthlyExtras(balance, options = {}) {
    const fixed = Math.max(0, asNumber(options.monthlyFee)) + Math.max(0, asNumber(options.monthlyInsuranceAmount));
    const insuranceRate = Math.max(0, asNumber(options.monthlyInsurancePercent)) / 100;
    return fixed + balance * insuranceRate;
  }

  function calculateSAC(principal, monthlyRate, termMonths, options = {}) {
    const financed = asNumber(principal);
    const rate = asNumber(monthlyRate);
    const term = Math.trunc(asNumber(termMonths));
    if (financed <= 0 || term <= 0 || rate < 0) throw new RangeError("Valor, prazo e taxa devem ser válidos.");

    const amortization = financed / term;
    let balance = financed;
    const schedule = [];
    for (let month = 1; month <= term; month += 1) {
      const openingBalance = balance;
      const interest = openingBalance * rate;
      const extras = monthlyExtras(openingBalance, options);
      balance = month === term ? 0 : Math.max(0, openingBalance - amortization);
      schedule.push({
        month,
        openingBalance: roundMoney(openingBalance),
        amortization: roundMoney(month === term ? openingBalance : amortization),
        interest: roundMoney(interest),
        extras: roundMoney(extras),
        payment: roundMoney((month === term ? openingBalance : amortization) + interest + extras),
        balance: roundMoney(balance),
      });
    }
    return summarizeSchedule("SAC", financed, rate, term, schedule);
  }

  function calculatePrice(principal, monthlyRate, termMonths, options = {}) {
    const financed = asNumber(principal);
    const rate = asNumber(monthlyRate);
    const term = Math.trunc(asNumber(termMonths));
    if (financed <= 0 || term <= 0 || rate < 0) throw new RangeError("Valor, prazo e taxa devem ser válidos.");

    const basePayment = rate < EPSILON
      ? financed / term
      : financed * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
    let balance = financed;
    const schedule = [];
    for (let month = 1; month <= term; month += 1) {
      const openingBalance = balance;
      const interest = openingBalance * rate;
      const amortization = month === term ? openingBalance : Math.max(0, basePayment - interest);
      const extras = monthlyExtras(openingBalance, options);
      balance = month === term ? 0 : Math.max(0, openingBalance - amortization);
      schedule.push({
        month,
        openingBalance: roundMoney(openingBalance),
        amortization: roundMoney(amortization),
        interest: roundMoney(interest),
        extras: roundMoney(extras),
        payment: roundMoney(amortization + interest + extras),
        balance: roundMoney(balance),
      });
    }
    return summarizeSchedule("PRICE", financed, rate, term, schedule);
  }

  function summarizeSchedule(system, principal, monthlyRate, term, schedule) {
    const totalPaid = schedule.reduce((sum, row) => sum + row.payment, 0);
    const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
    return {
      system,
      principal: roundMoney(principal),
      monthlyRate,
      termMonths: term,
      firstPayment: schedule[0]?.payment || 0,
      lastPayment: schedule[schedule.length - 1]?.payment || 0,
      totalPaid: roundMoney(totalPaid),
      totalInterest: roundMoney(totalInterest),
      schedule,
    };
  }

  function calculateMinimumIncome(payment, commitmentPercent) {
    const ratio = asNumber(commitmentPercent) / 100;
    if (ratio <= 0 || ratio > 1) throw new RangeError("O comprometimento de renda deve estar entre 0% e 100%.");
    return roundMoney(asNumber(payment) / ratio);
  }

  function validateAgeAtEnd(age, termMonths, maxAgeAtEnd) {
    const endAge = asNumber(age) + asNumber(termMonths) / 12;
    return { valid: endAge <= asNumber(maxAgeAtEnd, 999), ageAtEnd: Math.round(endAge * 100) / 100 };
  }

  function validateProductCompatibility(input, product) {
    const reasons = [];
    const propertyValue = asNumber(input.propertyValue);
    const financedAmount = asNumber(input.financedAmount);
    const financedPercent = propertyValue > 0 ? financedAmount / propertyValue * 100 : 0;
    const term = asNumber(input.termMonths);
    const checkRange = (value, min, max, label) => {
      if (min != null && value < asNumber(min)) reasons.push(`${label} abaixo do mínimo permitido.`);
      if (max != null && value > asNumber(max)) reasons.push(`${label} acima do máximo permitido.`);
    };
    checkRange(propertyValue, product.min_property_value, product.max_property_value, "Valor do imóvel");
    checkRange(financedAmount, product.min_financing_value, product.max_financing_value, "Valor financiado");
    checkRange(term, product.min_term_months, product.max_term_months, "Prazo");
    if (product.max_financing_percent != null && financedPercent > asNumber(product.max_financing_percent) + EPSILON) {
      reasons.push("Percentual financiado acima do limite do produto.");
    }
    const ageResult = validateAgeAtEnd(input.oldestProposerAge, term, product.max_age_at_end);
    if (!ageResult.valid) reasons.push("Idade ao final do contrato acima do limite do produto.");

    const eligibilityChecks = [
      ["property_types", input.propertyType, "Tipo de imóvel não atendido."],
      ["property_conditions", input.propertyCondition, "Condição do imóvel não atendida."],
      ["eligible_states", input.state, "Produto indisponível no estado informado."],
    ];
    eligibilityChecks.forEach(([field, selected, message]) => {
      const allowed = normalizeList(product[field]);
      if (allowed.length && selected && !allowed.includes(String(selected).toLowerCase())) reasons.push(message);
    });
    return { compatible: reasons.length === 0, reasons, ageAtEnd: ageResult.ageAtEnd };
  }

  function estimateCet(principal, schedule, upfrontFees, dataComplete) {
    if (!dataComplete) return { available: false, reason: "Custos incompletos para estimar o CET." };
    const netDisbursement = asNumber(principal) - Math.max(0, asNumber(upfrontFees));
    if (netDisbursement <= 0 || !schedule?.length) return { available: false, reason: "Fluxo financeiro insuficiente para estimar o CET." };
    const cashflows = [netDisbursement, ...schedule.map((row) => -asNumber(row.payment))];
    let low = 0;
    let high = 1;
    const npv = (rate) => cashflows.reduce((sum, flow, index) => sum + flow / Math.pow(1 + rate, index), 0);
    while (npv(high) < 0 && high < 100) high *= 2;
    for (let iteration = 0; iteration < 160; iteration += 1) {
      const middle = (low + high) / 2;
      if (npv(middle) < 0) low = middle; else high = middle;
    }
    const monthlyCet = (low + high) / 2;
    return {
      available: true,
      estimated: true,
      monthlyPercent: monthlyCet * 100,
      annualPercent: monthlyToAnnualRate(monthlyCet) * 100,
    };
  }

  function simulateProduct(input, product, amortizationSystem) {
    const compatibility = validateProductCompatibility(input, product);
    if (!compatibility.compatible) return { compatible: false, reasons: compatibility.reasons, product };
    const monthlyRate = annualRateToMonthly(product.annual_interest_rate, product.rate_type);
    const options = {
      monthlyFee: product.monthly_fee,
      monthlyInsuranceAmount: product.monthly_insurance_amount,
      monthlyInsurancePercent: product.monthly_insurance_percent,
    };
    const calculation = String(amortizationSystem).toUpperCase() === "PRICE"
      ? calculatePrice(input.financedAmount, monthlyRate, input.termMonths, options)
      : calculateSAC(input.financedAmount, monthlyRate, input.termMonths, options);
    const minimumIncome = calculateMinimumIncome(calculation.firstPayment, product.income_commitment_percent || 30);
    const upfrontFees = asNumber(product.appraisal_fee) + asNumber(product.registration_fee) + asNumber(product.other_upfront_fees);
    const cet = estimateCet(input.financedAmount, calculation.schedule, upfrontFees, product.cost_data_complete === true);
    return { compatible: true, product, compatibility, calculation, minimumIncome, upfrontFees: roundMoney(upfrontFees), cet };
  }

  return {
    annualToMonthlyRate,
    annualRateToMonthly,
    monthlyToAnnualRate,
    calculateFinancedValues,
    calculateSAC,
    calculatePrice,
    calculateMinimumIncome,
    validateAgeAtEnd,
    validateProductCompatibility,
    estimateCet,
    simulateProduct,
  };
});
