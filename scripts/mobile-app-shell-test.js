'use strict';
const fs = require('fs');
const vm = require('vm');

const workerSource = fs.readFileSync('worker.js', 'utf8');
const css = fs.readFileSync('runtime-patches/mobile-app-shell.css', 'utf8');
const client = fs.readFileSync('runtime-patches/mobile-app-shell.js', 'utf8');
const rh19 = fs.readFileSync('runtime-patches/rh-folha-hotfix-v19-popup-columns.inc.js', 'utf8');
const rh20 = fs.readFileSync('runtime-patches/rh-folha-hotfix-v20-popup-totals-grid.inc.js', 'utf8');
const rh23 = fs.readFileSync('runtime-patches/rh-folha-hotfix-v23-competencia-popup.inc.js', 'utf8');
const rh62 = fs.readFileSync('runtime-patches/rh-folha-hotfix-v62-fluxos-independentes.inc.js', 'utf8');
const rh73 = fs.readFileSync('runtime-patches/rh-folha-hotfix-v73-edicao-completa-colaboradores.inc.js', 'utf8');
const orcado = fs.readFileSync('orcado/index.html', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const executableWorker = workerSource
  .replace('export default {', 'const workerDefault = {')
  .replace('export { applyUnifiedPatch };', '') +
  '\nmodule.exports={workerDefault,isMobileRequest,inferMobileModule,injectMobileAppShell};';
const sandbox = { module: { exports: {} }, exports: {}, Request, Response, Headers, URL, console, fetch };
vm.runInNewContext(executableWorker, sandbox, { filename: 'worker.js' });
const { workerDefault, isMobileRequest, inferMobileModule } = sandbox.module.exports;

assert(isMobileRequest(new Request('https://painel.test/rh/', { headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' } })), 'iPhone deve receber a camada móvel.');
assert(isMobileRequest(new Request('https://painel.test/novo/?lnb_mobile=1')), 'Modo móvel explícito deve funcionar em módulos futuros.');
assert(!isMobileRequest(new Request('https://painel.test/rh/', { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' } })), 'Desktop não pode receber a camada móvel.');
assert(inferMobileModule('/qualquer-modulo/') === 'qualquer-modulo', 'Módulos futuros devem ser inferidos pela rota.');

const html = '<!doctype html><html lang="pt-BR"><head><title>Teste</title></head><body><main>desktop-original</main></body></html>';
const env = { ASSETS: { fetch: async () => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }) } };

(async () => {
  const desktop = await workerDefault.fetch(new Request('https://painel.test/admin/', { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' } }), env);
  const desktopHtml = await desktop.text();
  assert(desktopHtml === html, 'HTML de desktop foi alterado pelo shell móvel.');
  assert(!desktopHtml.includes('mobile-app-shell'), 'Desktop recebeu recurso exclusivo de celular.');

  const mobile = await workerDefault.fetch(new Request('https://painel.test/admin/', { headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' } }), env);
  const mobileHtml = await mobile.text();
  assert(mobileHtml.includes('data-lnb-mobile-shell="v5"'), 'HTML móvel não recebeu o marcador isolado.');
  assert(mobileHtml.includes('/runtime-patches/mobile-app-shell.css?v=5'), 'CSS móvel não foi injetado.');
  assert(mobileHtml.includes('data-lnb-mobile-module="admin"'), 'Módulo móvel não foi identificado.');

  const future = await workerDefault.fetch(new Request('https://painel.test/novo-modulo/', { headers: { 'sec-ch-ua-mobile': '?1' } }), env);
  assert((await future.text()).includes('data-lnb-mobile-module="novo-modulo"'), 'Novo módulo não herdou automaticamente o shell móvel.');

  for (const required of ['hub', 'colaboradores', 'admin', 'beneficios', 'orcado', 'rh']) {
    assert(client.includes(required + ':'), 'Mapeamento móvel ausente: ' + required);
    assert(css.includes('data-lnb-mobile-module="' + required + '"') || required === 'hub', 'CSS móvel ausente: ' + required);
  }
  for (const selector of ['#menu button[data-tela]', '#main-nav .nav-tab[data-tab]', '#nav button[data-v]', '.sidebar .nav-item[data-view]']) {
    assert(client.includes(selector), 'Descoberta de navegação ausente: ' + selector);
  }
  assert(client.includes('MutationObserver'), 'Módulos e funções adicionados dinamicamente não serão descobertos.');
  assert(client.includes("localStorage.getItem('lnb_access_snapshot_v1')"), 'Menu móvel não respeita o retrato de permissões.');
  assert(!client.includes('/rest/v1/') && !client.includes('/auth/v1/'), 'Shell móvel não deve duplicar autenticação nem acessar dados diretamente.');
  assert(css.includes('env(safe-area-inset-top') && css.includes('env(safe-area-inset-bottom'), 'Safe areas de iPhone ausentes.');
  assert(css.includes('.lnb-mobile-table-cards td::before'), 'Tabelas não possuem rótulos móveis.');
  assert(client.includes("host.className = 'lnb-mobile-table-host'"), 'Tabelas ainda podem destruir o card/painel pai.');
  assert(client.includes('lnbMobileLocked') && client.includes("prop === 'min-width'"), 'O bloqueio contra reescrita desktop da largura móvel foi perdido.');
  assert(client.includes("getAttribute('colspan')") && client.includes("'lnb-mobile-cell-wide'"), 'Detalhes colspan ainda podem ser comprimidos em uma coluna parcial.');
  assert(css.includes('.lnb-mobile-cell-wide>*{width:100%'), 'Conteúdo de detalhes colspan não ocupa a largura inteira.');
  assert(client.includes("return 'cards'"), 'Tabelas não estão protegidas pela política de fichas móveis.');
  assert(!client.includes("return 'scroll'"), 'A camada móvel ainda permite tabelas com rolagem lateral.');
  assert(client.includes('adaptRhCompositionGrids'), 'Grades dinâmicas do RH não possuem adaptação móvel.');
  assert(rh19.includes('isRhMobile()') && rh19.includes('if(!grid||isRhMobile())return'), 'RH v19 ainda reaplica a grade desktop no celular.');
  assert(rh20.includes('function mobileTable(') && rh20.includes('function mobileGrid('), 'RH v20 não possui renderização móvel na origem.');
  assert(rh20.includes("if(isRhMobile()){mobileTable(table,heads);return;}"), 'Tabela RH ainda depende de correção tardia do shell.');
  assert(rh20.includes("if(isRhMobile()){mobileGrid(grid,heads,header,rows,total);return;}"), 'Grade RH ainda depende de correção tardia do shell.');
  assert(rh23.includes('html[data-lnb-mobile-shell] #employee-modal table'), 'Modal de competência ainda mantém largura mínima de desktop no celular.');
  assert(rh62.includes("modal62('Carregando colaborador'"), 'Detalhe do colaborador ainda espera a rede antes de exibir o botão Fechar.');
  assert(rh62.includes('inset:var(--lnb-mobile-top) 0 var(--lnb-mobile-bottom)') && rh62.includes('.rh62-form button[type="submit"]{position:sticky'), 'Detalhe funcional ainda pode esconder Fechar ou Salvar atrás das barras móveis.');
  assert(rh73.includes('inset:var(--lnb-mobile-top) 0 var(--lnb-mobile-bottom)') && rh73.includes('#rh73-edit-save{position:sticky'), 'Edição completa ainda pode esconder Fechar ou Salvar atrás das barras móveis.');
  assert(client.includes('adaptCharts'), 'Gráficos não possuem visualização móvel sem recorte lateral.');
  assert(css.includes('.lnb-mobile-chart-list'), 'Lista gráfica móvel não foi estilizada.');
  assert(orcado.includes('function orcadoMobileChart('), 'Orçado ainda renderiza o gráfico desktop antes da adaptação móvel.');
  assert(orcado.includes('if(document.documentElement&&document.documentElement.dataset.lnbMobileShell)return orcadoMobileChart(rows,opt)'), 'Gráficos do Orçado não selecionam a visualização móvel na origem.');
  assert(orcado.includes('class="lnb-mobile-series-list"'), 'Séries mensais do Orçado ainda exigem rolagem lateral.');
  assert(!client.includes("'Detalhe ' +"), 'O shell ainda fabrica rótulos sem significado para tabelas sem cabeçalho.');
  assert(client.includes("'#ia-toggle'"), 'Atalho móvel não reconhece o Chat IA de Orçado e Benefícios.');
  assert(css.includes('body.lnb-mobile-app #ia-pop'), 'Chat IA não possui layout móvel em tela inteira.');
  assert(css.includes('.hub-header'), 'Cabeçalho duplicado da Central ainda aparece no celular.');
  assert(client.includes('Central de Colaboradores'), 'Home móvel não oferece acesso claro à Central de Colaboradores.');
  assert(client.includes("resources: ['colaboradores', 'beneficios', 'rh', 'admin']"), 'Central de Colaboradores não considera todos os perfis autorizados.');
  assert(workerSource.includes('if (!asset.ok || !isMobileRequest(request)) return asset;'), 'Ativo desktop não está protegido por retorno sem alteração.');

  console.log('Shell móvel: isolamento desktop, módulos atuais, expansão futura e tabelas validados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
