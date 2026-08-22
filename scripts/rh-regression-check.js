const fs = require('fs');

// Invariantes desta release: card e composição compartilham o mesmo fechamento; pop-ups não exibem CC.
function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(ok, msg) { if (!ok) throw new Error(`RH regression: ${msg}`); }

const workflow = read('.github/workflows/deploy-staging.yml');
const baseline = read('runtime-patches/rh-folha-stability-baseline.inc.js');
const ui = read('runtime-patches/rh-folha-hotfix-v38-planejamento-ativos-ui.inc.js');
const reports = read('runtime-patches/rh-folha-hotfix-v40-relatorios-executivos.inc.js');
const stability40 = read('runtime-patches/rh-folha-hotfix-v40a-runtime-stability.inc.js');
const stability41 = read('runtime-patches/rh-folha-hotfix-v41a-report-center-stability.inc.js');

const fit40 = read('runtime-patches/rh-folha-hotfix-v40-relatorios-executivos.inc.js');
const fit41 = read('runtime-patches/rh-folha-hotfix-v41a-report-center-stability.inc.js');
const fit42 = read('runtime-patches/rh-folha-hotfix-v42-relatorios-ajustes.inc.js');
const fit43 = read('runtime-patches/rh-folha-hotfix-v43-correcoes.inc.js');
const stable46 = read('runtime-patches/rh-folha-hotfix-v46-estabilizacao.inc.js');
const planningForecast = read('runtime-patches/rh-folha-hotfix-v47-auditoria-integral.inc.js');
const planningDetails = read('runtime-patches/rh-folha-hotfix-v48-estabilidade-popups.inc.js');
const sourceCards = read('runtime-patches/rh-folha-hotfix-v8.inc.js');
const popupTotals13 = read('runtime-patches/rh-folha-hotfix-v13-cards-popup-totais.inc.js');
const popupGrid20 = read('runtime-patches/rh-folha-hotfix-v20-popup-totals-grid.inc.js');
const interactivity = read('runtime-patches/rh-folha-rc-interactivity.inc.js');

const orderBaseline = workflow.indexOf('rh-folha-stability-baseline.inc.js');
const orderUi = workflow.indexOf('rh-folha-hotfix-v38-planejamento-ativos-ui.inc.js');
const orderV40 = workflow.indexOf('rh-folha-hotfix-v40-relatorios-executivos.inc.js');
const orderV40a = workflow.indexOf('rh-folha-hotfix-v40a-runtime-stability.inc.js');
assert(orderBaseline >= 0, 'baseline de estabilidade não está no release candidate');
assert(orderUi > orderBaseline, 'baseline precisa ser carregado antes da camada visual v38');
assert(orderV40 > orderUi, 'v40 precisa ser carregado depois da camada visual para assumir o card fit e os relatórios');
assert(orderV40a > orderV40, 'v40a precisa ser carregado após o v40');
assert(workflow.includes('rh-folha-hotfix-v41a-report-center-stability.inc.js'), 'v41a/v42 precisa estar no release candidate');
assert(!workflow.includes('rh-folha-hotfix-v37-ativos-cards-provisoes.inc.js'), 'v37 obsoleto ainda está sendo carregado');
assert(!workflow.includes('rh-folha-hotfix-v30-planejamento-tabelas.inc.js'), 'v30 obsoleto não pode voltar ao release');
assert(!workflow.includes('rh-folha-hotfix-v16-card-fit-canvas.inc.js'), 'card fit v16 com MutationObserver não pode coexistir com o v40');

for (const symbol of ['rhRosterLoad','rhRosterActiveIds','rhRosterIsActive','rhRosterFilter','rhProvisionRefresh','rhBaselineCheck','RH_STABILITY_BASELINE']) {
  assert(baseline.includes(symbol), `fonte única do quadro ativo sem ${symbol}`);
}
assert(!baseline.includes('MutationObserver'), 'baseline de dados não deve observar/re-renderizar DOM');
assert(baseline.includes('transition:none!important'), 'proteção anti-tremedeira dos cards ausente');
assert(baseline.includes('situacao_snapshot'), 'quadro atual não está ancorado no snapshot da competência mais recente');

assert(ui.includes('rhProvisionRefresh'), 'camada visual não recalcula provisões após o filtro de ativos');
assert(ui.includes('rhRosterActiveIds'), 'camada visual não usa a fonte única do quadro atual');
assert(ui.includes('rhBaselineCheck'), 'camada visual não executa verificação do baseline');
assert(ui.includes('centro de custo'), 'regra de remoção do resumo por centro de custo ausente');
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
assert(!/new\s+MutationObserver\s*\(/.test(reports), 'card fit v40 não pode instanciar MutationObserver');
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

for (const symbol of ['RH_REPORT_FIXES_V42','rhV42FitCards','rhV42ExportForecastPdf','rhV42ExportForecastExcel','rhV42ExportGuide','Próxima folha (estimativa)','Como chegamos ao líquido','Total de proventos','Total de descontos']) {
  assert(stability41.includes(symbol), `v42 sem recurso obrigatório: ${symbol}`);
}
assert(stability41.includes('valor_irrf_folha||e.valor_irrf_mensal'), 'IRRF mensal deve priorizar valor de folha e excluir RPA quando disponível');
assert(stability41.includes('Selecione um único mês'), 'guias não podem somar vários meses como se fossem uma competência');
assert(stability41.includes('ResizeObserver'), 'card fit v42 deve reagir a redimensionamento');
assert(!/new\s+MutationObserver\s*\(/.test(stability41), 'v42 não pode criar novo MutationObserver');

for (const retired of [
  'rh-folha-hotfix-v49-cards-estaveis.inc.js',
  'rh-folha-hotfix-v50-fonte-fixa-popup.inc.js',
  'rh-folha-hotfix-v51-planejamento-layout.inc.js',
  'rh-folha-hotfix-v55-planejamento-consolidado.inc.js',
  'rh-folha-hotfix-v56-proxima-folha-popups.inc.js'
]) {
  assert(!workflow.includes(retired), `camada concorrente de cards/pop-ups ainda ativa: ${retired}`);
}
assert(planningForecast.includes('rh47-forecast-modal'), 'Próxima Folha precisa usar o modal estrutural próprio');
assert(planningForecast.includes('min-height:126px;height:126px'), 'cards da Próxima Folha perderam altura estável');
assert(planningForecast.includes('font-size:28px!important;line-height:32px'), 'cards da Próxima Folha perderam tipografia fixa');
assert(!planningForecast.includes("if(typeof openGenericDetail==='function')openGenericDetail(title,kicker,html)"), 'Próxima Folha voltou a depender do modal genérico');
assert(planningDetails.includes('--rh48-modal-w'), '13º, Férias e Rescisões precisam dimensionar o modal pelo conteúdo');
assert(planningDetails.includes('.rh48-count{'), 'rodapé dos pop-ups precisa informar a quantidade de registros');
assert(!planningDetails.includes("['Colaborador','Departamento','CC','Saldo atual']"), 'CC não pode voltar ao pop-up de saldo provisionado');
assert(!planningDetails.includes("['Colaborador','Departamento','CC','Provisão do mês']"), 'CC não pode voltar ao pop-up de provisão do mês');
assert(planningDetails.includes('#page-planejamento .kpi strong'), 'regra de cards precisa permanecer restrita ao Planejamento');
assert(!planningDetails.includes("'.kpi strong,.rh40-guide-card"), 'Planejamento não pode alterar cards de outras abas');
assert(planningDetails.includes('width:100%!important;max-width:100%!important;min-width:0!important'), 'tabelas dos pop-ups precisam ocupar toda a caixa');
assert(fit42.includes('openGuideCard'), 'cards das guias gerenciais não possuem composição própria');
assert(fit42.includes('bindGuideCards'), 'cards das guias gerenciais não estão vinculados à composição');

for (const [name, source] of [['v40',fit40],['v41',fit41],['v42',fit42],['v43',fit43]]) {
  assert(source.includes("closest('#page-planejamento')"), `${name} ainda permite auto-fit em Planejamento`);
}
assert(stable46.includes("el.closest('#page-planejamento')"), 'v46 ainda encapsula valores dos cards de Planejamento');
assert(!stable46.includes("t.id==='rh-plan-folha-table'"), 'observer v46 ainda reage à tabela da Próxima Folha');
assert(planningForecast.includes("k.hidden=true"), 'grade antiga de quatro cards não está bloqueada na origem');
assert(planningForecast.includes("if(box.innerHTML!==html)box.innerHTML=html"), 'grade auditada ainda é recriada sem mudança de conteúdo');
assert(!planningForecast.includes("syncForecastTable47(t);syncOriginalForecastCards47(t)"), 'grade antiga ainda recebe sincronização');
assert(!planningForecast.includes("installCapture47();observe47();refresh47()"), 'observer v47 ainda recalcula a Próxima Folha');
assert(planningForecast.includes('snapshot:null'), 'Próxima Folha não preserva o fechamento que gerou os cards');
assert(planningForecast.includes('var t=V47.snapshot||auditedForecast47()'), 'pop-up da Próxima Folha voltou a recalcular um total diferente no clique');
assert(planningForecast.includes('data-rh47-value='), 'cards da Próxima Folha não registram o valor exato do fechamento');
assert(planningForecast.includes("prov:r247(sum47(rows,'proventos'))"), 'Próxima Folha não fecha os totalizadores na precisão monetária das linhas');

/* Composições: o rodapé contábil explícito é soberano. */
assert(popupTotals13.includes("tfoot tr:not(.rh-auto-total):not(.rh-v20-total)"), 'v13 ainda pode substituir um total contábil explícito');
assert(popupTotals13.includes(".rh-comp-total:not(.rh-auto-total):not(.rh-v20-total)"), 'v13 ainda pode substituir o total explícito de uma grade');
assert(popupGrid20.includes("table.querySelector('tfoot tr:not(.rh-auto-total):not(.rh-v20-total)')"), 'v20 não preserva o rodapé semântico das tabelas');
assert(popupGrid20.includes("grid.querySelector('.rh-comp-total:not(.rh-auto-total):not(.rh-v20-total)')"), 'v20 não preserva o rodapé semântico das grades');
assert(popupGrid20.includes('function columnWeight(header,index,n)'), 'dimensionamento de colunas não considera o conteúdo do cabeçalho');
assert(!popupGrid20.includes("var n=heads.length,widths=widthsFor(n)"), 'v20 voltou ao dimensionamento genérico apenas pela quantidade de colunas');
assert(popupGrid20.includes('function stripCostCenterTable(table)'), 'tabelas de pop-up não aplicam a regra global de remoção do CC');
assert(popupGrid20.includes('function stripCostCenterGrid(grid)'), 'grades de pop-up não aplicam a regra global de remoção do CC');
assert(popupGrid20.includes("[role=\"dialog\"] table"), 'regra de remoção do CC não cobre todos os diálogos');
assert(popupGrid20.includes("table.querySelectorAll('colgroup')"), 'dimensionamento pode manter dois colgroups e comprimir a tabela do pop-up');
assert(!popupGrid20.includes("table.querySelectorAll('colgroup.rh-v20-cols')"), 'colgroup original ainda pode coexistir com o normalizado');

/* Todos os cards operacionais usam a mesma base da composição e do rateio. */
for (const symbol of ['rhInterBindOverviewAndPayroll','rhInterBindChargeCards','rhInterBindMovementCards','rhInterBindCostCards','rhInterOpenAverageMetric','rhInterCostCenter','COMPOSIÇÃO E RATEIO']) {
  assert(interactivity.includes(symbol), `interatividade sem composição/rateio obrigatório: ${symbol}`);
}
assert(interactivity.includes('rhInterOpenPeriodMonthlyAverage'), 'Visão Geral não possui composição própria para a média mensal');
assert(interactivity.includes('rhInterBindPeriodAverageCards'), 'cards de média mensal não estão vinculados à composição correta');
assert(interactivity.includes('var contribution=value/months'), 'composição mensal não divide cada competência pela quantidade de meses carregados');
assert(interactivity.includes("['MÉDIA DO CARD',months+' competência'"), 'rodapé da média mensal não replica o valor do card');
assert(!interactivity.includes("['Colaborador','Departamento','Centro de custo'"), 'CC voltou às composições compartilhadas');
assert(interactivity.includes('data-rh-authoritative-composition'), 'composições compartilhadas não estão marcadas como autoritativas');
assert(interactivity.includes("['MÉDIA DO CARD'"), 'cards de média ainda encerram com soma em vez da média exibida');
assert(interactivity.includes("['REFERÊNCIA DO CARD',m.competencia]"), 'card de competência do Dossiê ainda pode exibir total incompatível');
assert(interactivity.includes("['TOTAL DO CARD',fmt(latest.custoFolha)]"), 'card histórico de custo não fecha na mesma competência exibida');

/* Custo Real: não depender do rótulo técnico rateado após normalização v47. */
assert(sourceCards.includes("rhEmployerCharges(p).itens.forEach(function(it){var k=cleanSearch(it[0]),v=Number(it[1])||0;if(k==='fgts')tf+=v;else te+=v;})"), 'Custo Real não classifica todos os encargos patronais pela rubrica');
assert(!sourceCards.includes("if(it[2]==='rateado')te+=Number(it[1])||0"), 'Custo Real ainda ignora encargos normalizados que não usam o rótulo rateado');
for (const marker of ['% do total','% do líquido','data-rh-authoritative-composition']) {
  assert(sourceCards.includes(marker), `composições operacionais sem rateio/alinhamento: ${marker}`);
}
assert(sourceCards.includes("['page-visao','page-colaboradores'"), 'filtros de Departamento/Vínculo não foram reposicionados no cabeçalho da Visão Geral');
assert(sourceCards.includes("var legacy=$('painel-filters');if(legacy)legacy.remove()"), 'bloco inferior duplicado de filtros ainda permanece na Visão Geral');

/* Modais estruturais já estabilizados: apenas alinhamento e rateio, sem reativar observadores. */
assert(planningForecast.includes("function numeric(i)"), 'Próxima Folha não alinha cabeçalho e células pela mesma regra');
assert(!planningForecast.includes("'Centro de custo','Valor','% do card'"), 'CC voltou ao pop-up da Próxima Folha');
assert(planningForecast.includes("'Colaborador','Departamento','Valor','% do card'"), 'Próxima Folha perdeu a composição por colaborador e departamento');
assert(planningDetails.includes('data-rh-authoritative-total'), 'provisões não marcam o total contábil como autoritativo');
assert(planningDetails.includes("function moneyCell(i)"), 'provisões não alinham cabeçalho e células pela mesma regra');

console.log('RH regression baseline: OK');
