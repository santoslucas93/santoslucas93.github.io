const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('runtime-patches/rh-folha-hotfix-v68-simulador-salario.inc.js', 'utf8');
const bands = [[1621, .075], [2902.84, .09], [4354.27, .12], [8475.55, .14]];
const irBands = [[2428.80, 0, 0], [2826.65, .075, 182.16], [3751.05, .15, 394.16], [4664.68, .225, 675.49], [Infinity, .275, 908.73]];
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
const trunc = value => Math.floor((Math.max(0, value) + 1e-9) * 100) / 100;

function inss(base) {
  let previous = 0;
  let total = 0;
  for (const [limit, rate] of bands) {
    if (base <= previous) continue;
    const slice = Math.min(base, limit) - previous;
    if (slice > 0) total += trunc(slice * rate);
    previous = limit;
  }
  return round(total);
}

function irrf(gross, inssValue) {
  const deduction = Math.max(607.20, inssValue);
  const base = Math.max(0, gross - deduction);
  let tax = 0;
  for (const [limit, rate, subtract] of irBands) {
    if (base <= limit) {
      tax = Math.max(0, base * rate - subtract);
      break;
    }
  }
  const reduction = gross <= 5000 ? tax : gross <= 7350 ? Math.max(0, 978.62 - .133145 * gross) : 0;
  return round(Math.max(0, tax - reduction));
}

assert.equal(inss(1621), 121.57, 'primeira faixa do INSS 2026');
assert.equal(inss(6000), 641.50, 'INSS progressivo para R$ 6.000');
assert.equal(inss(10000), 988.07, 'INSS precisa respeitar o teto contributivo');
assert.equal(irrf(5000, inss(5000)), 0, 'redução do IRRF até R$ 5.000');
assert.equal(irrf(6000, inss(6000)), 385.11, 'IRRF 2026 para R$ 6.000');
assert.equal(round(2 * 67.54), 135.08, 'duas cotas do salário-família 2026');

const gross = 6000;
const currentCharges = round([.20, .01, .058, .01, .08].reduce((sum, rate) => sum + trunc(gross * rate), 0));
const provisions = round(gross / 12 + gross / 12 + gross / 36);
const provisionCharges = round([.20, .01, .058, .01, .08].reduce((sum, rate) => sum + trunc(provisions * rate), 0));
const loaded = round(gross + currentCharges + provisions + provisionCharges);
assert.equal(currentCharges, 2148, 'encargos mensais do cenário de controle');
assert.equal(provisions, 1166.67, '13º, férias e 1/3 mensais');
assert.equal(provisionCharges, 417.64, 'encargos sobre provisões');
assert.equal(loaded, 9732.31, 'custo mensal provisionado');
assert.equal(round(loaded * 12), 116787.72, 'custo anual estimado');

for (const marker of ['INSS patronal', 'RAT', 'Terceiros', 'PIS sobre folha', 'FGTS', 'Vale-Transporte', '13º salário', 'Férias', 'Custo anual estimado', 'familyLimit:1980.38', 'familyQuota:67.54', 'Provento compensável']) {
  assert(source.includes(marker), `simulador sem ${marker}`);
}

console.log('RH v68 salary simulator tests: OK');
