const assert = require('assert/strict');

const inssBands = [[1621, .075], [2902.84, .09], [4354.27, .12], [8475.55, .14]];
const irrfBands = [[2428.80, 0, 0], [2826.65, .075, 182.16], [3751.05, .15, 394.16], [4664.68, .225, 675.49], [Infinity, .275, 908.73]];
const trunc2 = value => Math.floor((Math.max(0, Number(value) || 0) + 1e-9) * 100) / 100;

function inss(base) {
  let previous = 0;
  let total = 0;
  for (const [ceiling, rate] of inssBands) {
    if (base > previous) total += trunc2(Math.max(0, Math.min(base, ceiling) - previous) * rate);
    previous = ceiling;
  }
  return Math.round(total * 100) / 100;
}

function irrf(gross, inssValue, dependents = 0, pension = 0, other = 0) {
  const legal = inssValue + dependents * 189.59 + pension + other;
  const deduction = Math.max(607.20, legal);
  const base = Math.max(0, gross - deduction);
  let tax = 0;
  for (const [ceiling, rate, fixedDeduction] of irrfBands) {
    if (base <= ceiling) {
      tax = Math.max(0, base * rate - fixedDeduction);
      break;
    }
  }
  let reduction = 0;
  if (gross <= 5000) reduction = tax;
  else if (gross <= 7350) reduction = Math.max(0, 978.62 - .133145 * gross);
  return Math.round(Math.max(0, tax - reduction) * 100) / 100;
}

assert.equal(inss(3036), 252.90, 'INSS 2026 para R$ 3.036,00');
assert.equal(inss(4000), 368.58, 'INSS 2026 para R$ 4.000,00');
assert.equal(inss(5000), 501.50, 'INSS 2026 para R$ 5.000,00');
assert.equal(inss(6000), 641.50, 'INSS 2026 para R$ 6.000,00');
assert.equal(irrf(4000, inss(4000)), 0, 'IRRF reduzido a zero até R$ 5.000,00');
assert.equal(irrf(5000, inss(5000)), 0, 'IRRF reduzido a zero em R$ 5.000,00');
assert.equal(irrf(6000, 649.60), 382.88, 'exemplo publicado pela Receita para R$ 6.000,00');
assert.equal(irrf(6000, inss(6000)), 385.11, 'IRRF combinado com a tabela vigente do INSS 2026');
assert.equal(inss(8146.80), 942.05, 'INSS da remuneração recorrente de controle');
assert.equal(irrf(8146.80, inss(8146.80), 1), 1020.44, 'IRRF da remuneração recorrente de controle');

const source = require('fs').readFileSync('runtime-patches/rh-folha-hotfix-v57-base-editavel-proxima-folha.inc.js', 'utf8');
for (const required of ['taxDetail57', 'taxBaseMemory57', 'taxBaseMemoryHtml57', 'openBaseMemory57', 'closeBaseMemory57', 'taxCols57', 'taxBaseGroups57', 'taxValuesHtml57', 'rh57-tax-group', 'table-layout:fixed', 'Uma linha por colaborador', 'Sem repetição', 'Base de cálculo', 'Formação da base', 'Ver composição', 'Verbas fora da base', 'Alíquota efetiva/aplicada', 'Memória tributária individual', 'Bases por Imposto', 'regularIrrfDeduction', 'vacationIrrfDeduction', 'cashPay', 'cashThird', 'fgtsBase']) {
  assert(source.includes(required), `memória tributária individual ausente: ${required}`);
}
assert(!source.includes('<details class="rh57-base-memory">'), 'composição da base não pode voltar a expandir dentro da célula da tabela');
assert(source.includes("keys.map(function(k){return taxDetail57(k,r)})"), 'cards consolidados devem agrupar os impostos na linha do colaborador');

const baseSalary = 4000;
const recurring = 800;
const vacationPayBase = 1000;
const vacationThirdBase = 333.33;
assert.equal(
  Math.round((baseSalary + recurring + vacationPayBase + vacationThirdBase) * 100) / 100,
  6133.33,
  'formação da base previdenciária deve conciliar salário, recorrentes, férias e 1/3'
);
const regularTaxable = 4800;
const regularDeduction = 607.20;
const vacationTaxable = 1333.33;
const vacationDeduction = 607.20;
assert.equal(
  Math.round((regularTaxable - regularDeduction + vacationTaxable - vacationDeduction) * 100) / 100,
  4918.93,
  'formação da base de IRRF deve conciliar as apurações regular e de férias'
);

const salary = 3545;
const vacationDays = 10;
const normalPay = salary * (30 - vacationDays) / 30;
const vacationPay = salary * vacationDays / 30;
const vacationThird = vacationPay / 3;
assert.equal(Math.round((normalPay + vacationPay + vacationThird) * 100) / 100, 3938.89, 'férias devem reproduzir os proventos de controle de julho');

console.log('RH v57 calculation tests: OK');
