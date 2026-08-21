const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(ok, msg) { if (!ok) throw new Error(`RH regression: ${msg}`); }

const workflow = read('.github/workflows/deploy-staging.yml');
const baseline = read('runtime-patches/rh-folha-stability-baseline.inc.js');
const ui = read('runtime-patches/rh-folha-hotfix-v38-planejamento-ativos-ui.inc.js');
const reports = read('runtime-patches/rh-folha-hotfix-v40-relatorios-executivos.inc.js');
const stability40 = read('runtime-patches/rh-folha-hotfix-v40a-runtime-stability.inc.js');
const center41 = read('runtime-patches/rh-folha-hotfix-v41-central-relatorios.inc.js');

const orderBaseline = workflow.indexOf('rh-folha-stability-baseline.inc.js');
const orderUi = workflow.indexOf('rh-folha-hotfix-v38-planejamento-ativos-ui.inc.js');
const orderV40 = workflow.indexOf('rh-folha-hotfix-v40-relatorios-executivos.inc.js');
const orderV40a = workflow.indexOf('rh-folha-hotfix-v40a-runtime-stability.inc.js');
const orderV41 = workflow.indexOf('rh-folha-hotfix-v41-central-relatorios.inc.js');
assert(orderBaseline >= 0, 'baseline de estabilidade não está no release candidate');
assert(orderUi > orderBaseline, 'baseline precisa ser carregado antes da camada visual v38');
assert(orderV40 > orderUi, 'v40 precisa ser carregado depois da camada visual para assumir o card fit e os relatórios');
assert(orderV40a > orderV40, 'v40a precisa ser carregado após o v40');
assert(orderV41 > orderV40a, 'central v41 precisa ser carregada após os exports v40');
assert(!workflow.includes('rh-folha-hotfix-v37-ativos-cards-provisoes.inc.js'), 'v37 obsoleto ainda está sendo carregado');
assert(!workflow.includes('rh-folha-hotfix-v30-planejamento-tabelas.inc.js'), 'v30 obsoleto não pode voltar ao release');
assert(!workflow.includes('rh-folha-hotfix-v16-card-fit-canvas.inc.js'), 'card fit v16 com MutationObserver não pode coexistir com o v40');

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

for (const symbol of ['rhV40ExportPayrollPdf','rhV40ExportPayrollExcel','rhV40ExportGuide','rhV40ExportGuidePack','RH_EXECUTIVE_REPORTS_V40','rhFitAllCardValues']) {
  assert(reports.includes(symbol), `v40 sem recurso obrigatório: ${symbol}`);
}
assert(!reports.includes('MutationObserver'), 'card fit v40 não pode usar MutationObserver');
assert(reports.includes('ResizeObserver'), 'card fit v40 precisa reagir a resize sem re-render contínuo');
assert(reports.includes('jspdf') && reports.includes('autotable'), 'PDF executivo precisa carregar jsPDF e autoTable');
assert(reports.includes('ExcelJS'), 'Excel executivo precisa usar ExcelJS para manter o layout premium');
assert(reports.includes('Guia Gerencial'), 'v40 precisa gerar guias gerenciais de encargos');
assert(reports.includes('não substitui DARF'), 'guias gerenciais precisam deixar claro que não são documentos oficiais');
assert(reports.includes('Conferência'), 'Excel executivo precisa trazer aba de conferência');

assert(stability40.includes('RH_V40A_STABILITY'), 'v40a sem marcador de estabilidade');
assert(stability40.includes('selectCompetence'), 'seletor executivo precisa carregar a competência escolhida');
assert(stability40.includes('rhFitAllCardValues'), 'interações precisam reaplicar o encaixe dos cards');
assert(!stability40.includes("busy(this,'Carregando...'"), 'select não pode ser tratado como botão e perder suas opções');

for (const symbol of ['RH_REPORT_CENTER_V41','rhV41ExportProvisionPdf','rhV41ExportProvisionExcel','rhV41ExportTerminationPdf','rhV41ExportTerminationExcel','Relatórios & Documentos','Guia gerencial — IRRF','Guia gerencial — INSS','Guia gerencial — PIS','Guia gerencial — FGTS']) {
  assert(center41.includes(symbol), `central v41 sem recurso obrigatório: ${symbol}`);
}
assert(center41.includes("data-plan-pane=\"13\""), 'v41 precisa exportar provisão de 13º');
assert(center41.includes("data-plan-pane=\"ferias\""), 'v41 precisa exportar provisão de férias');
assert(center41.includes("data-plan-pane=\"rescisao\""), 'v41 precisa exportar rescisão');
assert(center41.includes('canAdmin()') && center41.includes("can('exportar')"), 'v41 precisa respeitar permissão de exportação');
assert(center41.includes('não substituem DARF, DCTFWeb ou FGTS Digital'), 'central precisa distinguir guia gerencial de documento oficial');

console.log('RH regression baseline: OK');
