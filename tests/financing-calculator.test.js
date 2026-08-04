const test = require("node:test");
const assert = require("node:assert/strict");
const calc = require("../lib/financing-calculator");

test("converte taxa anual efetiva em mensal equivalente", () => {
  assert.ok(Math.abs(calc.annualToMonthlyRate(12.682503) - 0.01) < 1e-8);
});

test("respeita taxa anual nominal na conversão mensal", () => {
  assert.equal(calc.annualRateToMonthly(12, "NOMINAL"), 0.01);
});

test("SAC reduz a prestação e zera o saldo", () => {
  const result = calc.calculateSAC(120000, 0.01, 120);
  assert.equal(result.schedule.length, 120);
  assert.ok(result.firstPayment > result.lastPayment);
  assert.equal(result.schedule.at(-1).balance, 0);
  assert.equal(result.schedule[0].amortization, 1000);
});

test("Price mantém a prestação base e zera o saldo", () => {
  const result = calc.calculatePrice(200000, 0.008, 240);
  assert.equal(result.schedule.length, 240);
  assert.ok(Math.abs(result.firstPayment - result.lastPayment) <= 0.02);
  assert.equal(result.schedule.at(-1).balance, 0);
});

test("CET estimado sem tarifas converge para a taxa do fluxo", () => {
  const monthlyRate = 0.01;
  const price = calc.calculatePrice(100000, monthlyRate, 120);
  const cet = calc.estimateCet(100000, price.schedule, 0, true);
  assert.equal(cet.available, true);
  assert.ok(Math.abs(cet.monthlyPercent - 1) < 0.00001);
});

test("calcula entrada, financiamento e percentual de forma consistente", () => {
  assert.deepEqual(calc.calculateFinancedValues({ propertyValue: 500000, downPayment: 100000 }), {
    propertyValue: 500000,
    downPayment: 100000,
    financedAmount: 400000,
    financedPercent: 80,
  });
});

test("calcula renda mínima pelo comprometimento", () => {
  assert.equal(calc.calculateMinimumIncome(3000, 30), 10000);
});

test("valida idade máxima ao final e prazo", () => {
  assert.equal(calc.validateAgeAtEnd(60, 240, 80).valid, true);
  assert.equal(calc.validateAgeAtEnd(65, 240, 80).valid, false);
});

test("rejeita prazo acima do máximo do produto", () => {
  const result = calc.validateProductCompatibility({
    propertyValue: 500000, financedAmount: 300000, termMonths: 421, oldestProposerAge: 35,
  }, { max_term_months: 420, max_age_at_end: 80, max_financing_percent: 80 });
  assert.equal(result.compatible, false);
  assert.match(result.reasons.join(" "), /Prazo/);
});

test("rejeita percentual financiado acima do máximo", () => {
  const result = calc.validateProductCompatibility({
    propertyValue: 500000, financedAmount: 450000, termMonths: 360, oldestProposerAge: 35,
  }, { max_term_months: 420, max_age_at_end: 80, max_financing_percent: 80 });
  assert.equal(result.compatible, false);
  assert.match(result.reasons.join(" "), /Percentual/);
});
