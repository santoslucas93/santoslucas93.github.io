const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(ok, msg) { if (!ok) throw new Error(`RH regression: ${msg}`); }

const workflow = read('.github/workflows/deploy-staging.yml');
const baseline = read('runtime-patches/rh-folha-stability-baseline.inc.js');
const ui = read('runtime-patches/rh-folha-hotfix-v38-planejamento-ativos-ui.inc.js');

const orderBaseline = workflow.indexOf('rh-folha-stability-baseline.inc.js');
const orderUi = workflow.indexOf('rh-folha-hotfix-v38-planejamento-ativos-ui.inc.js');
assert(orderBaseline >= 0, 'baseline de estabilidade não está no release candidate');
assert(orderUi > orderBaseline, 'baseline precisa ser carregado antes da camada visual v38');
assert(!workflow.includes('rh-folha-hotfix-v37-ativos-cards-provisoes.inc.js'), 'v37 obsoleto ainda está sendo carregado');
assert(!workflow.includes('rh-folha-hotfix-v30-planejamento-tabelas.inc.js'), 'v30 obsoleto não pode voltar ao release');

for (const symbol of ['rhRosterLoad','rhRosterActiveIds','rhRosterIsActive','rhRosterFilter','rhProvisionRefresh','rhBaselineCheck','RH_STABILITY_BASELINE']) {
  assert(baseline.includes(symbol), `fonte única do quadro ativo sem ${symbol}`);
}
assert(!baseline.includes('MutationObserver'), 'baseline de dados não deve observar/re-renderizar DOM');
assert(baseline.includes('transition:none!important'), 'proteção anti-tremedeira dos cards ausente');
assert(baseline.includes("situacao_snapshot"), 'quadro atual não está ancorado no snapshot da competência mais recente');

assert(ui.includes('rhProvisionRefresh'), 'camada visual não recalcula provisões após o filtro de ativos');
assert(ui.includes('rhRosterActiveIds'), 'camada visual não usa a fonte única do quadro atual');
assert(ui.includes('rhBaselineCheck'), 'camada visual não executa verificação do baseline');
assert(ui.includes("centro de custo"), 'regra de remoção do resumo por centro de custo ausente');
assert(ui.includes('rh38-name-list'), 'lista simples de colaboradores não está protegida');
assert((ui.match(/new MutationObserver/g) || []).length === 1, 'deve existir somente um observer visual no planejamento');
assert(ui.includes('V.obs.disconnect()'), 'observer visual precisa ser desconectado durante a própria atualização');
assert(ui.includes('rhProvisionOpenMemory'), 'memória das provisões precisa usar a base remuneratória recalculada');
assert(ui.includes('rhV34TerminationContext'), 'memória das provisões precisa buscar verbas recorrentes no motor remuneratório');
assert(ui.includes('Base remuneratória'), 'memória das provisões precisa exibir a base remuneratória');
assert(ui.includes('Salário-base atual'), 'memória das provisões precisa separar salário-base das verbas recorrentes');
assert(ui.includes('stopImmediatePropagation'), 'clique da lista precisa bloquear a memória antiga baseada somente no salário');

console.log('RH regression baseline: OK');
