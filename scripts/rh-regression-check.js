const fs = require('fs');

// Release v46b: a composição tributária lê o painel; o cálculo permanece soberano e intocado.
// Invariantes desta release: card/composição compartilham o fechamento; pop-ups não exibem CC e usam um único colgroup.
function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(ok, msg) { if (!ok) throw new Error(`RH regression: ${msg}`); }

const workflow = read('.github/workflows/deploy-staging.yml');
const baseline = read('runtime-patches/rh-folha-stability-baseline.inc.js');
const ui = read('runtime-patches/rh-folha-hotfix-v38-planejamento-ativos-ui.inc.js');
const reports = read('runtime-patches/rh-folha-hotfix-v40-relatorios-executivos.inc.js');
const reportCenter = read('runtime-patches/rh-folha-hotfix-v41-central-relatorios.inc.js');
const stability40 = read('runtime-patches/rh-folha-hotfix-v40a-runtime-stability.inc.js');
const stability41 = read('runtime-patches/rh-folha-hotfix-v41a-report-center-stability.inc.js');

const fit40 = read('runtime-patches/rh-folha-hotfix-v40-relatorios-executivos.inc.js');
const fit41 = read('runtime-patches/rh-folha-hotfix-v41a-report-center-stability.inc.js');
const fit42 = read('runtime-patches/rh-folha-hotfix-v42-relatorios-ajustes.inc.js');
const fit43 = read('runtime-patches/rh-folha-hotfix-v43-correcoes.inc.js');
const stable46 = read('runtime-patches/rh-folha-hotfix-v46-estabilizacao.inc.js');
const taxComposition46b = read('runtime-patches/rh-folha-hotfix-v46b-impostos-composicao.inc.js');
const planningForecast = read('runtime-patches/rh-folha-hotfix-v47-auditoria-integral.inc.js');
const planningDetails = read('runtime-patches/rh-folha-hotfix-v48-estabilidade-popups.inc.js');
const forecast57 = read('runtime-patches/rh-folha-hotfix-v57-base-editavel-proxima-folha.inc.js');
const periodEdit79 = read('runtime-patches/rh-folha-hotfix-v79-edicao-periodos.inc.js');
const officialProvisions80 = read('runtime-patches/rh-folha-hotfix-v80-provisoes-oficiais.inc.js');
const monthlyProvisions92 = read('runtime-patches/rh-folha-hotfix-v92-motor-provisoes.inc.js');
const sourceCards = read('runtime-patches/rh-folha-hotfix-v8.inc.js');
const popupTotals13 = read('runtime-patches/rh-folha-hotfix-v13-cards-popup-totais.inc.js');
const popupGrid20 = read('runtime-patches/rh-folha-hotfix-v20-popup-totals-grid.inc.js');
const interactivity = read('runtime-patches/rh-folha-rc-interactivity.inc.js');
const dp61 = read('runtime-patches/rh-folha-hotfix-v61-cadastro-holerites-ferias.inc.js');
const dp62 = read('runtime-patches/rh-folha-hotfix-v62-fluxos-independentes.inc.js');
const dp63 = read('runtime-patches/rh-folha-hotfix-v63-holerite-email-controles-dp.inc.js');
const exports66 = read('runtime-patches/rh-folha-hotfix-v66-alinhamento-identidade-recibos.inc.js');
const simulator68 = read('runtime-patches/rh-folha-hotfix-v68-simulador-salario.inc.js');
const exportBranding67 = read('runtime-patches/system-export-branding.js');
const spacing61 = read('runtime-patches/system-text-spacing.js');
const worker = read('worker.js');
const styles = read('rh/styles.css');
const wrangler = read('wrangler.jsonc');

const orderBaseline = workflow.indexOf('rh-folha-stability-baseline.inc.js');
const orderUi = workflow.indexOf('rh-folha-hotfix-v38-planejamento-ativos-ui.inc.js');
const orderV40 = workflow.indexOf('rh-folha-hotfix-v40-relatorios-executivos.inc.js');
const orderV40a = workflow.indexOf('rh-folha-hotfix-v40a-runtime-stability.inc.js');
const orderTax46b = workflow.indexOf('rh-folha-hotfix-v46b-impostos-composicao.inc.js');
const orderV47 = workflow.indexOf('rh-folha-hotfix-v47-auditoria-integral.inc.js');
assert(orderBaseline >= 0, 'baseline de estabilidade não está no release candidate');
assert(orderUi > orderBaseline, 'baseline precisa ser carregado antes da camada visual v38');
assert(orderV40 > orderUi, 'v40 precisa ser carregado depois da camada visual para assumir o card fit e os relatórios');
assert(orderV40a > orderV40, 'v40a precisa ser carregado após o v40');
assert(orderTax46b > orderV40a && orderTax46b < orderV47, 'composição tributária somente leitura precisa capturar o clique antes do v47');
assert(workflow.indexOf('rh-folha-hotfix-v61-cadastro-holerites-ferias.inc.js') > workflow.indexOf('rh-folha-hotfix-v60-status-cor-desligado.inc.js'), 'v61 precisa ser carregado depois da correção de status v60');
assert(workflow.indexOf('rh-folha-hotfix-v62-fluxos-independentes.inc.js') > workflow.indexOf('rh-folha-hotfix-v61-cadastro-holerites-ferias.inc.js'), 'v62 precisa neutralizar o v61 depois de seu carregamento');
assert(workflow.indexOf('rh-folha-hotfix-v63-holerite-email-controles-dp.inc.js') > workflow.indexOf('rh-folha-hotfix-v62-fluxos-independentes.inc.js'), 'v63 precisa assumir holerites e controles depois do v62');
assert(workflow.indexOf('rh-folha-hotfix-v79-edicao-periodos.inc.js') > workflow.indexOf('rh-folha-hotfix-v73-edicao-completa-colaboradores.inc.js'), 'v79 precisa carregar após a edição cadastral v73');
assert(workflow.indexOf('rh-folha-hotfix-v80-provisoes-oficiais.inc.js') > workflow.indexOf('rh-folha-hotfix-v79-edicao-periodos.inc.js'), 'v80 precisa carregar após o controle de períodos');
assert(workflow.indexOf('rh-folha-hotfix-v92-motor-provisoes.inc.js') > workflow.indexOf('rh-folha-hotfix-v91-ferias-oficiais.inc.js'), 'v92 precisa carregar após a memória oficial v91');
assert(monthlyProvisions92.includes('RH_MONTHLY_PROVISION_ENGINE_V92')&&monthlyProvisions92.includes('rh_reprocessar_provisoes'), 'motor mensal de provisões não está ligado à interface');
assert(!monthlyProvisions92.includes('MutationObserver')&&!monthlyProvisions92.includes('setInterval'), 'motor mensal reintroduz atualização contínua no planejamento');
assert(reportCenter.includes("pane.querySelector('table.rh80-table')"), 'relatórios de provisão não priorizam a composição oficial');
assert(!officialProvisions80.includes('pane.innerHTML=cards80'), 'v80 apaga ferramentas existentes do painel de férias');
assert(officialProvisions80.includes("child.id==='rh70-vacation-simulator'") && officialProvisions80.includes("child.classList.contains('rh41-export-bar')"), 'v80 não preserva simulador e exportações');
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
assert(!ui.includes('MutationObserver'), 'planejamento não deve observar o DOM continuamente');
assert(ui.includes("if(e.target.closest('#page-planejamento [data-plan-tab]'))schedule(0)"), 'planejamento precisa atualizar apenas em eventos conhecidos');
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

for (const symbol of ['RH_DP_V61','rh_criar_colaborador','rh_sincronizar_cadastros_beneficios','rh61-payslips','data-rh61-status','vacationRows61']) {
  assert(dp61.includes(symbol), `v61 sem recurso obrigatório: ${symbol}`);
}
assert(dp61.includes('Optou por Vale Transporte'), 'cadastro v61 não pergunta a opção de Vale Transporte');
assert(dp61.includes('Documento de conferência'), 'holerite v61 não informa seu caráter de conferência');
assert(dp61.includes('estimados pela data de admissão'), 'alerta de férias v61 precisa declarar a limitação da estimativa');
assert(spacing61.includes('MutationObserver') && spacing61.includes('document.createTextNode'), 'correção global de palavras coladas ausente');
assert(worker.includes('injectSystemTextSpacing') && worker.includes("url.pathname === '/rh/'"), 'Worker não aplica a correção de espaçamento no sistema/RH');
for (const symbol of ['RH_DP_V62','renderCollaborators62','openEmployee62','saveStatus62','generatePayslips62','rh62-new-form','rh62-status-form']) {
  assert(dp62.includes(symbol), `v62 sem recurso obrigatório: ${symbol}`);
}
for (const privateV57 of ['V57.','openModal57','closeModal57','statusModal57','ensurePdf57','money57','parseBr57','esc57']) {
  assert(!dp62.includes(privateV57), `v62 voltou a depender do escopo privado do v57: ${privateV57}`);
}
assert(dp62.includes('data-rh62-slip') && dp62.includes('Holerites em lote'), 'v62 não oferece holerite individual e em lote em Colaboradores');
assert(dp62.includes("desligamento_origem==='ultima_folha'"), 'v62 não identifica data de desligamento inferida pela folha');
assert(dp62.includes('Baixar holerite individual') && dp62.includes('data-rh63-email') && dp62.includes('data-rh63-dp-person'), 'ações individuais não estão concentradas no pop-up do colaborador');
for (const symbol of ['RH_DP_V63','voucher63','postEmail63','batchModal63','dashboard63','employeeDp63','rh_dp_painel','rh_inicializar_controles_colaborador']) {
  assert(dp63.includes(symbol), `v63 sem recurso obrigatório: ${symbol}`);
}
assert(dp63.includes('LIGA NACIONAL DE BASQUETE') && dp63.includes('HOLERITE | RECIBO DE PAGAMENTO') && dp63.includes('Assinatura do colaborador'), 'v65 não reproduz a estrutura executiva do holerite');
assert(dp63.includes("fetch('/rh/lnb-logo.png'") && dp63.includes("doc.addImage(V63.logo,'PNG'"), 'v65 não incorpora o logo oficial da LNB no PDF');
assert(dp63.includes('VIA DO COLABORADOR') && dp63.includes('VIA DA EMPRESA') && dp63.includes('LINHA DE CORTE'), 'v65 não gera as duas vias na mesma folha');
assert(dp63.includes('maxRows=22') && dp63.includes('Math.ceil(all.length/maxRows)') && dp63.includes("'Página '+pageNo+'/'+pageCount"), 'v65 não pagina holerites com muitas rubricas');
assert(dp63.includes('rh63-filter-card') && dp63.includes('Cadastro e quadro') && dp63.includes('Holerites e controles'), 'v65 não distribui filtros e funções em grupos visuais');
assert(dp63.includes("querySelectorAll('.rh62-row-slip,.rh63-row-actions')"), 'atalhos individuais ainda podem quebrar as linhas de Colaboradores');
assert(styles.includes('overflow-y:auto') && styles.includes('@media(max-height:850px)'), 'menu lateral não garante acesso em telas com pouca altura');
assert(wrangler.includes('holerites@liganacionaldebasquete.com.br'), 'remetente de holerites não usa o domínio institucional confirmado');
assert(dp63.includes('/api/rh/holerite-email') && worker.includes("url.pathname === '/api/rh/holerite-email'"), 'envio de holerite não está conectado ao Worker');
assert(worker.includes('rh_pode_enviar_holerite') && worker.includes('rh_registrar_envio_holerite'), 'Worker não valida permissão ou não registra o envio');
assert(worker.includes('RH_EMAIL_CONFIGURED') && !worker.includes('RESEND_API_KEY:'), 'configuração de e-mail deve expor somente o estado, nunca a chave');

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
assert(planningForecast.includes('function activeForecastSource47()'), 'Próxima Folha não reconcilia a tabela com o quadro ativo');
assert(planningForecast.includes('activePeople47(),raw=rawForecastRows47()'), 'quadro ativo precisa ser resolvido antes dos totais da projeção');
assert(planningForecast.includes('reconciled.set(k,Object.assign({},r,{person:p,_activeKey:k}))'), 'linhas históricas/duplicadas não são eliminadas antes da soma');
assert(planningForecast.includes('Array.from(body.rows||[]).forEach(function(tr){if(!retained.has(tr))tr.remove()})'), 'tabela visível ainda conserva pessoas fora do quadro ativo');

/* Impostos: composição estritamente derivada dos números já renderizados. */
for (const symbol of ['RH_TAX_COMPOSITION_READONLY_V46B','readDisplayedTotals46b','allocateCents46b','forecastPeople46b','reconciledRows46b']) {
  assert(taxComposition46b.includes(symbol), `composição tributária somente leitura sem ${symbol}`);
}
for (const key of ['INSS_EMP','IRRF','INSS_PAT','RAT','TERC','PIS','FGTS']) {
  assert(taxComposition46b.includes(key), `composição por colaborador ausente para ${key}`);
}
assert(taxComposition46b.includes('e.stopImmediatePropagation'), 'clique no imposto ainda pode alcançar o recálculo do v47');
assert(taxComposition46b.includes('readDisplayedTotals46b(button)'), 'pop-up não usa o valor visível como fonte autoritativa');
assert(taxComposition46b.includes('data-rh-authoritative-total="1"'), 'total visível do imposto não está protegido como fechamento autoritativo');
assert(taxComposition46b.includes('<th>Colaborador</th><th>Departamento</th>'), 'composição tributária perdeu colaborador/departamento');
assert(!taxComposition46b.includes('Centro de custo') && !taxComposition46b.includes('>CC<'), 'CC voltou ao pop-up dos impostos');
assert(!taxComposition46b.includes('MutationObserver'), 'composição tributária não pode observar ou re-renderizar o painel');
assert(!taxComposition46b.includes("button.querySelector('strong').textContent=") && !taxComposition46b.includes('S.competencia='), 'composição tributária não pode substituir valores existentes do painel');

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
assert(forecast57.includes('tableWidth:281') && forecast57.includes("0:{cellWidth:76}") && forecast57.includes("7:{cellWidth:33,halign:'right'}"), 'PDF da Próxima Folha perdeu a grade fixa das oito colunas');
assert(forecast57.includes("if(data.column.index>=2)data.cell.styles.halign='right'"), 'cabeçalho, corpo e total da Próxima Folha não compartilham o alinhamento numérico');
assert(exportBranding67.includes("fetch('/rh/lnb-logo.png'") && exportBranding67.includes('hookPdf') && exportBranding67.includes('hookExcel') && exportBranding67.includes('hookSheetJs'), 'a identidade LNB não cobre PDF, ExcelJS e SheetJS no sistema');
assert(worker.includes('injectSystemExportBranding') && worker.includes('system-export-branding.js?v=67'), 'o Worker não injeta a identidade LNB nos módulos');
assert(wrangler.includes('"/revisao-ids"') && wrangler.includes('"/revisao-ids.html"'), 'a ferramenta de revisão não passa pela identidade global de exportação');
assert(exports66.includes('RECIBO DE VERBAS RESCISÓRIAS') && exports66.includes('AVISO E RECIBO DE FÉRIAS') && exports66.includes('Assinatura do colaborador'), 'v66 não oferece documentos individuais assináveis de rescisão e férias');
assert(exports66.includes("document.querySelector('[data-plan-pane=\"rescisao\"] .rh41-export-bar')||document.querySelector('[data-plan-pane=\"rescisao\"] #rh26-result .panel-head')"), 'recibo de rescisão não possui fallback para o cabeçalho do resultado atual');
assert(exports66.includes("document.querySelector('[data-plan-pane=\"ferias\"] .rh41-export-bar')||document.querySelector('[data-plan-pane=\"ferias\"] article.table-panel .panel-head')"), 'recibo de férias não possui fallback para o cabeçalho do painel atual');
assert(dp63.includes('data-rh66-vac-doc') && exports66.includes('rhV57CalculateVacationReceipt'), 'o cadastro individual não oferece o documento oficial de férias');
for (const employerOnly of ['x.patInss','x.patRat','x.patTerc','x.patPis','x.multa','x.fgm','x.fg13','x.fgav']) assert(!exports66.includes(employerOnly), `recibo do colaborador inclui encargo patronal: ${employerOnly}`);
assert(planningDetails.includes('data-rh-authoritative-total'), 'provisões não marcam o total contábil como autoritativo');
assert(planningDetails.includes("function moneyCell(i)"), 'provisões não alinham cabeçalho e células pela mesma regra');

/* Próxima Folha v57: camada separada, editável e auditável. */
assert(workflow.includes('rh-folha-hotfix-v57-base-editavel-proxima-folha.inc.js'), 'v57 não está no release candidate');
assert(workflow.indexOf('rh-folha-hotfix-v57-base-editavel-proxima-folha.inc.js') > workflow.indexOf('rh-folha-hotfix-v54-provisoes-seguras.inc.js'), 'v57 precisa ser a última camada do RH');
for (const symbol of ['RH_FORECAST_V57','rhV57HandleCapture','rhV57Refresh','rh57-salary-edit','rh_atualizar_salario_folha','rh_atualizar_status_colaborador','rh_salvar_parametros_projecao','TAX57','simplificado:607.20','dependente:189.59']) {
  assert(forecast57.includes(symbol), `v57 sem recurso obrigatório: ${symbol}`);
}
assert(forecast57.includes('[[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]]'), 'v57 sem tabela progressiva INSS 2026');
assert(forecast57.includes('[[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]]'), 'v57 sem tabela mensal IRRF 2026');
assert(forecast57.includes("if(gross<=5000)reduction=tax;else if(gross<=7350)"), 'v57 sem redução mensal do IRRF 2026');
assert(forecast57.includes('var deduction=Math.max(TAX57.simplificado,legal)'), 'v57 não escolhe a dedução de IRRF mais vantajosa');
assert(forecast57.includes('ctx.latestLaunches.some(isVacation57)'), 'v57 não detecta férias na competência-base');
assert(forecast57.includes("/FERIAS|13 |13O|13º|DECIMO|RESCISAO|AVISO|ABONO|ADIANTAMENTO|DIAS NORMAIS|BOLSA AUXILIO/"), 'v57 pode repetir verbas não recorrentes');
assert(forecast57.includes('proventos:gross') && forecast57.includes('descontos:discounts') && forecast57.includes('liquido:net'), 'v57 não fecha a projeção por colaborador');
assert(!forecast57.includes('benefit57') && !forecast57.includes('beneficios:') && !forecast57.includes("['Benefícios'"), 'Próxima Folha ainda considera Benefícios');
assert(planningForecast.includes('if(window.RH_FORECAST_V57){installAiResize47();return}'), 'v47 ainda pode sobrescrever a projeção v57');
assert(forecast57.includes('vacationGross+cashGross-vacationInss-vacationIrrf.value'), 'v57 sem adiantamento líquido de férias');
assert(forecast57.includes('employerBase=hasInss?contributionBase:0'), 'v57 inclui abono indevidamente na base patronal');
assert(forecast57.includes("taxGroupModal57('Impostos retidos',['INSS_EMP','IRRF'],t.retained") && forecast57.includes("taxGroupModal57('Tributos / recolhimentos',TAX_KEYS57,t.taxTotal"), 'pop-ups tributários v57 não conciliam com os cards');
assert(forecast57.includes('taxDetail57') && forecast57.includes('Base de cálculo') && forecast57.includes('Memória tributária individual') && forecast57.includes('Bases por Imposto'), 'v57 não expõe a memória de base individual nos pop-ups e relatórios');
assert(forecast57.includes('taxBaseMemory57') && forecast57.includes('taxBaseMemoryHtml57') && forecast57.includes('Formação da base') && forecast57.includes('Ver composição') && forecast57.includes('Fora da base'), 'v57 não explica a formação individual das bases nos pop-ups e relatórios');
assert(forecast57.includes('regularIrrfDeduction') && forecast57.includes('vacationIrrfDeduction'), 'v57 não separa as deduções da folha e das férias na formação da base do IRRF');
assert(forecast57.includes('openBaseMemory57') && forecast57.includes('taxCols57') && forecast57.includes('table-layout:fixed'), 'v57 não protege as colunas tributárias contra sobreposição');
assert(!forecast57.includes('<details class="rh57-base-memory">'), 'v57 voltou a expandir a composição dentro da célula e pode sobrepor a alíquota');
assert(forecast57.includes('taxBaseGroups57') && forecast57.includes('Uma linha por colaborador') && forecast57.includes('Sem repetição'), 'v57 voltou a repetir a mesma base em várias linhas do mesmo colaborador');
for (const marker of ['RH_PERIOD_EDIT_V79','editar_folha_importada','editar_proxima_folha','encerrar_periodo','reabrir_periodo','rh_editar_folha_colaborador','rh_reabrir_competencia','rh_atualizar_status_projecao']) assert(periodEdit79.includes(marker), `v79 sem controle obrigatório: ${marker}`);
assert(!periodEdit79.includes('MutationObserver'), 'v79 não deve observar continuamente o DOM');
for (const marker of ['RH_OFFICIAL_PROVISIONS_V80','rh_provisoes_oficiais','COMPOSIÇÃO OFICIAL POR COLABORADOR','Conciliado com o Domínio']) assert(officialProvisions80.includes(marker), `v80 sem parâmetro oficial obrigatório: ${marker}`);
const vacationOfficial91=fs.readFileSync('runtime-patches/rh-folha-hotfix-v91-ferias-oficiais.inc.js','utf8');
for (const marker of ['RH_VACATION_OFFICIAL_MEMORY_V91','rhV91OpenVacationMemory','demonstrativo oficial']) assert(vacationOfficial91.includes(marker), `v91 sem parâmetro de férias obrigatório: ${marker}`);
assert(!officialProvisions80.includes('MutationObserver'), 'v80 não deve criar observador contínuo');

/* Simulador de salário v68: candidato separado do quadro e custo integral auditável. */
assert(workflow.includes('rh-folha-hotfix-v68-simulador-salario.inc.js'), 'v68 não está no release candidate');
assert(workflow.indexOf('rh-folha-hotfix-v68-simulador-salario.inc.js') > workflow.indexOf('rh-folha-hotfix-v66-alinhamento-identidade-recibos.inc.js'), 'v68 precisa carregar depois dos documentos v66');
for (const marker of ['RH_SALARY_SIMULATOR_V68','rhV68CalculateSalary','Simulador de salário','Custo mensal provisionado','Custo anual estimado','Exportar PDF','Exportar Excel']) assert(simulator68.includes(marker), `simulador v68 sem recurso: ${marker}`);
assert(simulator68.includes('[[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]]'), 'simulador sem tabela progressiva INSS 2026');
assert(simulator68.includes('[[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]]'), 'simulador sem tabela mensal IRRF 2026');
assert(simulator68.includes("gross<=7350") && simulator68.includes('978.62-.133145*gross'), 'simulador sem redução mensal IRRF 2026');
assert(simulator68.includes('familyLimit:1980.38') && simulator68.includes('familyQuota:67.54'), 'simulador sem salário-família 2026');
assert(simulator68.includes('gross+familySalary-employeeDeductions') && !simulator68.includes('cashCost=r68(gross+familySalary'), 'salário-família precisa aumentar o líquido sem virar custo patronal');
assert(simulator68.includes('Math.min(vtTotal,r68(salary*.06))'), 'simulador não limita o desconto de VT a 6%');
assert(simulator68.includes("type==='aprendiz'?.02:(type==='clt'?.08:0)"), 'simulador não diferencia FGTS de CLT e aprendiz');
for (const cost of ['patInss','rat','third','pis','fgts','employerBenefits','thirteenth','vacation','vacationThird','provisionCharges','loadedCost','annual']) assert(simulator68.includes(cost), `simulador sem componente de custo: ${cost}`);

console.log('RH regression baseline: OK');
