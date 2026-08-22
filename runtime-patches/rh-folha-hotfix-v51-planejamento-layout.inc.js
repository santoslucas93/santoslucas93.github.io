/* RH v51 — Planejamento: cards estáveis, popups proporcionais e provisões sem CC */
(function(){
'use strict';

var V51={observer:null,forecastTimer:0};
function E51(id){return document.getElementById(id)}
function n51(v){var x=Number(v);return isFinite(x)?x:0}
function r251(v){return Math.round((n51(v)+Number.EPSILON)*100)/100}
function norm51(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function parseMoney51(v){var s=String(v==null?'':v).replace(/R\$/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');return Number(s)||0}
function money51(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(r251(v))}
function esc51(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

/* ───────── Próxima folha: uma única camada visível de cards ───────── */
function forecastPane51(){return document.querySelector('#page-planejamento [data-plan-pane="folha"]')}
function readForecastTotals51(){
  var pane=forecastPane51(),table=pane&&pane.querySelector('table'),foot=table&&table.tFoot&&table.tFoot.rows&&table.tFoot.rows[0],c=foot&&foot.cells;
  var live=E51('rh47-forecast-summary');
  function liveValue(key){var card=live&&live.querySelector('.rh47-summary-card[data-rh47-key="'+key+'"] strong');return parseMoney51(card&&card.textContent)}
  var prov=c&&c.length>=8?parseMoney51(c[2].textContent):liveValue('prov');
  var disc=c&&c.length>=8?parseMoney51(c[3].textContent):liveValue('disc');
  var company=c&&c.length>=8?parseMoney51(c[5].textContent):liveValue('company');
  var ben=c&&c.length>=8?parseMoney51(c[6].textContent):liveValue('ben');
  var retained=0;
  if(live){
    live.querySelectorAll('.rh47-tax-line[data-rh47-tax="INSS_EMP"] strong,.rh47-tax-line[data-rh47-tax="IRRF"] strong').forEach(function(el){retained+=parseMoney51(el.textContent)})
  }
  if(!retained)retained=liveValue('ret');
  prov=r251(prov);disc=r251(disc);company=r251(company);ben=r251(ben);retained=r251(retained);
  var liq=r251(prov-disc),tax=r251(retained+company),cost=r251(prov+company+ben);
  return{prov:prov,disc:disc,liq:liq,ret:retained,company:company,ben:ben,tax:tax,cost:cost}
}
function card51(label,value,sub,key,featured){
  return '<button type="button" class="rh47-summary-card rh51-stable-card '+(featured?'featured':'')+'" data-rh47-key="'+esc51(key)+'"><span>'+esc51(label)+'</span><strong>'+money51(value)+'</strong><small>'+esc51(sub||'')+'</small></button>'
}
function stableForecastHtml51(t){
  return '<div class="rh51-summary-grid">'+
    card51('Proventos previstos',t.prov,'08/2026','prov')+
    card51('Descontos previstos',t.disc,'retenções + demais descontos','disc')+
    card51('Líquido previsto',t.liq,'proventos − descontos','liq',true)+
    card51('Impostos retidos',t.ret,'INSS segurados + IRRF','ret')+
    card51('Encargos empresa',t.company,'INSS patronal + RAT + terceiros + PIS + FGTS','company')+
    card51('Benefícios confirmados (parcial)',t.ben,'fonte integrada disponível na competência-base','ben')+
    card51('Tributos / recolhimentos',t.tax,'retidos + encargos da empresa','tax')+
    card51('Custo total estimado',t.cost,'proventos + encargos + benefícios','cost',true)+
  '</div>'
}
function ensureStableForecast51(force){
  var pane=forecastPane51(),live=E51('rh47-forecast-summary');if(!pane||!live)return;
  var legacy=E51('rh-plan-folha-kpis');if(legacy)legacy.classList.add('rh51-legacy-hidden');
  var liveGrid=live.querySelector('.rh47-summary-grid');if(liveGrid)liveGrid.classList.add('rh51-live-hidden');
  var mirror=E51('rh51-forecast-cards');
  if(!mirror){mirror=document.createElement('section');mirror.id='rh51-forecast-cards';mirror.className='rh51-forecast-cards';live.parentNode.insertBefore(mirror,live)}
  var t=readForecastTotals51(),sig=[t.prov,t.disc,t.liq,t.ret,t.company,t.ben,t.tax,t.cost].map(function(v){return r251(v).toFixed(2)}).join('|');
  if(!force&&mirror.dataset.sig===sig)return;
  mirror.dataset.sig=sig;mirror.innerHTML=stableForecastHtml51(t)
}
function scheduleForecast51(ms,force){clearTimeout(V51.forecastTimer);V51.forecastTimer=setTimeout(function(){ensureStableForecast51(!!force)},ms==null?650:ms)}

/* ───────── Popups da Próxima Folha proporcionais ao número de colunas ───────── */
function modalCardForTable51(table){
  var a=table&&table.parentElement,candidate=null;
  while(a&&a!==document.body){
    var cls=String(a.className||'');
    if(/modal-card|detail-card|rh48-modal-card|modal-content/i.test(cls))return a;
    if(a.querySelector&&a.querySelector('h1,h2,h3,.modal-title,.rh-detail-title')&&a.querySelector('button')&&a.querySelector('table'))candidate=a;
    a=a.parentElement
  }
  return candidate||table&&table.parentElement
}
function tagForecastPopup51(root){
  root=root||document;
  var tables=[];
  if(root.nodeType===1&&root.matches&&root.matches('.rh47-popup-table'))tables.push(root);
  if(root.querySelectorAll)tables=tables.concat(Array.prototype.slice.call(root.querySelectorAll('.rh47-popup-table')));
  tables.forEach(function(table){
    if(table.dataset.rh51Popup==='1')return;
    var cols=table.querySelectorAll('thead th').length||3,card=modalCardForTable51(table);if(!card)return;
    table.dataset.rh51Popup='1';table.classList.add('rh51-popup-table');
    card.classList.add('rh51-forecast-popup','rh51-popup-cols-'+cols);card.dataset.rh51Cols=String(cols)
  })
}

/* ───────── 13º e férias: retirar CC e realinhar grupos/totais ───────── */
function kind51(table){var p=table&&table.closest('[data-plan-pane]');return p&&p.dataset.planPane==='13'?'13':p&&p.dataset.planPane==='ferias'?'ferias':''}
function groupHead51(kind){
  var tr=document.createElement('tr');tr.className='rh30-group-head rh51-group-head';
  if(kind==='ferias')tr.innerHTML='<th colspan="4">Colaborador e período</th><th colspan="8">Movimentação da provisão</th><th colspan="6">Encargos e custo</th>';
  else tr.innerHTML='<th colspan="3">Colaborador e base</th><th colspan="6">Movimentação da provisão</th><th colspan="6">Encargos e custo</th>';
  return tr
}
function markGroups51(table,kind){
  var starts=kind==='ferias'?[1,5,13]:[1,4,10];
  table.querySelectorAll('thead tr:not(.rh30-group-head),tbody tr,tfoot tr').forEach(function(tr){
    Array.prototype.forEach.call(tr.children,function(cell,i){cell.classList.toggle('rh30-group-start',starts.indexOf(i+1)>=0)})
  })
}
function stripCc51(table){
  if(!table||table.dataset.rh51NoCc==='1')return;var kind=kind51(table);if(!kind)return;
  var head=table.tHead&&Array.prototype.slice.call(table.tHead.rows).find(function(r){return !r.classList.contains('rh30-group-head')});
  if(!head||head.cells.length<2||!/^cc$|centro de custo/.test(norm51(head.cells[1].textContent)))return;
  [table.tHead,table.tBodies&&table.tBodies[0],table.tFoot].forEach(function(sec){if(!sec)return;Array.prototype.forEach.call(sec.rows,function(tr){if(tr.classList.contains('rh30-group-head'))return;if(tr.cells.length>1)tr.deleteCell(1)})});
  if(table.tHead){var old=table.tHead.querySelector('.rh30-group-head');if(old)old.remove();table.tHead.insertBefore(groupHead51(kind),table.tHead.firstChild)}
  table.dataset.rh51NoCc='1';table.classList.add('rh51-no-cc');markGroups51(table,kind);
  var wrap=table.closest('.table-wrap'),note=wrap&&wrap.previousElementSibling;if(note&&note.classList.contains('rh30-scroll-note'))note.innerHTML='<span>↔</span><b>Visualização detalhada</b><span>Role horizontalmente para consultar todas as colunas. O colaborador permanece fixo.</span>'
}
function fixProvisionTables51(root){
  root=root||document;var tables=[];
  if(root.nodeType===1&&root.matches&&root.matches('#page-planejamento [data-plan-pane="13"] table.rh26-wide,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide'))tables.push(root);
  if(root.querySelectorAll)tables=tables.concat(Array.prototype.slice.call(root.querySelectorAll('#page-planejamento [data-plan-pane="13"] table.rh26-wide,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide')));
  tables.forEach(stripCc51)
}

function styles51(){
  if(E51('_rh51'))return;var s=document.createElement('style');s.id='_rh51';s.textContent=
  /* redundância removida: os quatro cards legados não são mais exibidos */
  '#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis.rh51-legacy-hidden{display:none!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary>.rh47-summary-grid.rh51-live-hidden{display:none!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary{margin-top:12px!important}'+
  '.rh51-forecast-cards{margin:0 0 12px!important}.rh51-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}'+
  '.rh51-stable-card{height:126px!important;min-height:126px!important;box-sizing:border-box!important;overflow:hidden!important}'+
  '.rh51-stable-card strong{font-size:28px!important;line-height:32px!important;letter-spacing:-.02em!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important;transition:none!important;animation:none!important;transform:none!important}'+
  /* Popups proporcionais */
  '.rh51-forecast-popup{margin-left:auto!important;margin-right:auto!important;box-sizing:border-box!important;max-height:calc(100vh - 40px)!important;overflow:auto!important}'+
  '.rh51-forecast-popup.rh51-popup-cols-2{width:min(760px,calc(100vw - 48px))!important;max-width:min(760px,calc(100vw - 48px))!important}'+
  '.rh51-forecast-popup.rh51-popup-cols-3{width:min(920px,calc(100vw - 48px))!important;max-width:min(920px,calc(100vw - 48px))!important}'+
  '.rh51-forecast-popup.rh51-popup-cols-4{width:min(1040px,calc(100vw - 48px))!important;max-width:min(1040px,calc(100vw - 48px))!important}'+
  '.rh51-forecast-popup.rh51-popup-cols-5{width:min(1220px,calc(100vw - 48px))!important;max-width:min(1220px,calc(100vw - 48px))!important}'+
  '.rh51-forecast-popup.rh51-popup-cols-6{width:min(1320px,calc(100vw - 48px))!important;max-width:min(1320px,calc(100vw - 48px))!important}'+
  '.rh51-forecast-popup .rh47-popup-scroll{width:100%!important;max-width:100%!important;overflow:auto!important}'+
  '.rh51-forecast-popup .rh51-popup-table{width:100%!important;table-layout:fixed!important;margin:0 auto!important}'+
  '.rh51-forecast-popup.rh51-popup-cols-2 .rh51-popup-table,.rh51-forecast-popup.rh51-popup-cols-3 .rh51-popup-table{min-width:0!important}'+
  '.rh51-forecast-popup.rh51-popup-cols-4 .rh51-popup-table{min-width:900px!important}.rh51-forecast-popup.rh51-popup-cols-5 .rh51-popup-table{min-width:1050px!important}.rh51-forecast-popup.rh51-popup-cols-6 .rh51-popup-table{min-width:1160px!important}'+
  '.rh51-forecast-popup .rh51-popup-table th,.rh51-forecast-popup .rh51-popup-table td{word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important}'+
  /* Provisões sem CC */
  '#page-planejamento table.rh51-no-cc.rh30-13{min-width:1960px!important}#page-planejamento table.rh51-no-cc.rh30-ferias{min-width:2290px!important}'+
  '#page-planejamento table.rh51-no-cc tbody td:nth-child(2),#page-planejamento table.rh51-no-cc tfoot td:nth-child(2),#page-planejamento table.rh51-no-cc thead tr:not(.rh30-group-head) th:nth-child(2){position:static!important;left:auto!important;z-index:auto!important;box-shadow:none!important;background:inherit!important}'+
  '#page-planejamento table.rh51-no-cc.rh30-13 td:nth-child(2),#page-planejamento table.rh51-no-cc.rh30-13 thead tr:not(.rh30-group-head) th:nth-child(2){width:112px!important;min-width:112px!important;max-width:112px!important}'+
  '#page-planejamento table.rh51-no-cc.rh30-ferias td:nth-child(2),#page-planejamento table.rh51-no-cc.rh30-ferias thead tr:not(.rh30-group-head) th:nth-child(2){width:112px!important;min-width:112px!important;max-width:112px!important}'+
  '#page-planejamento table.rh51-no-cc tfoot td{white-space:nowrap!important;font-variant-numeric:tabular-nums!important}'+
  '@media(max-width:1120px){.rh51-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}'+
  '@media(max-width:760px){.rh51-summary-grid{grid-template-columns:1fr}.rh51-stable-card{height:auto!important;min-height:118px!important}.rh51-forecast-popup{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important}}';document.head.appendChild(s)
}

function process51(root){styles51();tagForecastPopup51(root||document);fixProvisionTables51(root||document)}
function observe51(){
  if(V51.observer)return;V51.observer=new MutationObserver(function(ms){
    ms.forEach(function(m){if(m.type==='childList')Array.prototype.forEach.call(m.addedNodes,function(n){if(n&&n.nodeType===1)process51(n)})})
  });V51.observer.observe(document.body,{childList:true,subtree:true})
}
function init51(){
  styles51();process51(document);observe51();
  /* Primeiro espelho só depois da projeção terminar de renderizar. Depois, só atualiza em ações explícitas. */
  [700,1400,2400].forEach(function(ms,i){setTimeout(function(){ensureStableForecast51(i===2)},ms)});
  document.addEventListener('click',function(e){
    var rec=e.target&&e.target.closest&&e.target.closest('#rh-plan-recalc');if(rec){scheduleForecast51(700,true);return}
    var tab=e.target&&e.target.closest&&e.target.closest('[data-plan-tab="folha"]');if(tab){scheduleForecast51(850,true);return}
    var ptab=e.target&&e.target.closest&&e.target.closest('[data-plan-tab="13"],[data-plan-tab="ferias"]');if(ptab)setTimeout(function(){fixProvisionTables51(document)},250)
  },true)
}

window.RH_PLANNING_LAYOUT_V51=true;
window.rhV51RefreshForecast=function(){ensureStableForecast51(true)};
window.rhV51FixProvisionTables=function(){fixProvisionTables51(document)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init51);else init51();
})();