/* RH v50 — Planejamento com fonte fixa + popup de Encargos/Benefícios estável */
(function(){
'use strict';

var PLAN_VALUES=[
  '#page-planejamento .kpi strong',
  '#page-planejamento .rh47-summary-card strong',
  '#page-planejamento .rh46-total-card strong',
  '#page-planejamento .summary-card strong',
  '#page-planejamento .stat-card strong',
  '#page-planejamento .rh40-guide-card strong',
  '#page-planejamento .rh41-report-card strong',
  '#page-planejamento strong .rh46-card-value'
].join(',');
var V50={observer:null,scheduled:false};

function E50(id){return document.getElementById(id)}
function norm50(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}

function styles50(){
  if(E50('_rh50'))return;
  var s=document.createElement('style');s.id='_rh50';
  s.textContent=
    '#page-planejamento .kpi strong,'+
    '#page-planejamento .rh47-summary-card strong,'+
    '#page-planejamento .rh46-total-card strong,'+
    '#page-planejamento .summary-card strong,'+
    '#page-planejamento .stat-card strong,'+
    '#page-planejamento .rh40-guide-card strong,'+
    '#page-planejamento .rh41-report-card strong,'+
    '#page-planejamento strong .rh46-card-value{'+
      'font-size:28px!important;line-height:32px!important;letter-spacing:-.02em!important;'+
      'font-variant-numeric:tabular-nums!important;white-space:nowrap!important;'+
      'transform:none!important;transition:none!important;animation:none!important;'+
      'opacity:1!important;visibility:visible!important;'+
    '}'+
    '#page-planejamento .kpi,#page-planejamento .rh47-summary-card,#page-planejamento .rh46-total-card,'+
    '#page-planejamento .summary-card,#page-planejamento .stat-card{'+
      'transform:none!important;animation:none!important;'+
      'transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease!important;'+
    '}'+
    '#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis .kpi{height:156px!important;min-height:156px!important;box-sizing:border-box!important}'+
    '#page-planejamento [data-plan-pane="folha"] .rh47-summary-card{height:126px!important;min-height:126px!important;box-sizing:border-box!important}'+
    '.rh50-encbenef-modal,.rh50-encbenef-modal .modal-card,.rh50-encbenef-modal .rh-detail-card,'+
    '.rh50-encbenef-modal .rh48-modal-card{width:min(1320px,calc(100vw - 56px))!important;max-width:min(1320px,calc(100vw - 56px))!important;overflow:hidden!important}'+
    '.rh50-encbenef-modal table{width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important}'+
    '.rh50-encbenef-modal th,.rh50-encbenef-modal td{padding:11px 14px!important;vertical-align:middle!important;'+
      'word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important;'+
      'transition:none!important;animation:none!important}'+
    '.rh50-encbenef-modal th{white-space:nowrap!important;font-size:11px!important;letter-spacing:.045em!important}'+
    '.rh50-encbenef-modal td{font-size:13px!important;line-height:1.3!important}'+
    '.rh50-encbenef-modal td.money,.rh50-encbenef-modal td:nth-last-child(1){white-space:nowrap!important;font-variant-numeric:tabular-nums!important;text-align:right!important}'+
    '.rh50-encbenef-modal.rh50-cols3 th:nth-child(1),.rh50-encbenef-modal.rh50-cols3 td:nth-child(1){width:52%!important}'+
    '.rh50-encbenef-modal.rh50-cols3 th:nth-child(2),.rh50-encbenef-modal.rh50-cols3 td:nth-child(2){width:22%!important}'+
    '.rh50-encbenef-modal.rh50-cols3 th:nth-child(3),.rh50-encbenef-modal.rh50-cols3 td:nth-child(3){width:26%!important}'+
    '.rh50-encbenef-modal.rh50-cols4 th:nth-child(1),.rh50-encbenef-modal.rh50-cols4 td:nth-child(1){width:36%!important}'+
    '.rh50-encbenef-modal.rh50-cols4 th:nth-child(2),.rh50-encbenef-modal.rh50-cols4 td:nth-child(2){width:18%!important}'+
    '.rh50-encbenef-modal.rh50-cols4 th:nth-child(3),.rh50-encbenef-modal.rh50-cols4 td:nth-child(3){width:18%!important}'+
    '.rh50-encbenef-modal.rh50-cols4 th:nth-child(4),.rh50-encbenef-modal.rh50-cols4 td:nth-child(4){width:28%!important}'+
    '.rh50-encbenef-modal tfoot td{font-weight:900!important;border-top:2px solid var(--line)!important}'+
    '@media(max-width:760px){'+
      '#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis .kpi,#page-planejamento [data-plan-pane="folha"] .rh47-summary-card{height:auto!important;min-height:118px!important}'+
      '.rh50-encbenef-modal,.rh50-encbenef-modal .modal-card,.rh50-encbenef-modal .rh-detail-card{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important}'+
      '.rh50-encbenef-modal table{min-width:860px!important}.rh50-encbenef-modal{overflow-x:auto!important}'+
    '}';
  document.head.appendChild(s)
}
function clearLegacyInline50(el){if(!el||!el.style)return;['font-size','line-height','letter-spacing','transform','transition','animation'].forEach(function(p){try{el.style.removeProperty(p)}catch(e){}});el.dataset.rh50Fixed='28'}
function fixPlanValues50(root){root=root||document;if(root.nodeType===1&&root.matches&&root.matches(PLAN_VALUES))clearLegacyInline50(root);if(root.querySelectorAll)Array.prototype.forEach.call(root.querySelectorAll(PLAN_VALUES),clearLegacyInline50)}
function findEncBenefitModal50(){var heads=Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,.modal-title,.rh-detail-title,.rh48-modal-head'));heads.forEach(function(h){if(norm50(h.textContent).indexOf('encargos + beneficios')<0)return;var a=h,chosen=null;while(a&&a!==document.body){if(a.querySelector&&a.querySelector('table')){chosen=a;break}a=a.parentElement}if(!chosen)return;chosen.classList.add('rh50-encbenef-modal');var table=chosen.querySelector('table'),cols=table&&table.querySelectorAll('thead th').length||0;chosen.classList.toggle('rh50-cols3',cols===3);chosen.classList.toggle('rh50-cols4',cols===4)})}
function refresh50(root){styles50();fixPlanValues50(root||document);findEncBenefitModal50()}
function schedule50(root){if(V50.scheduled)return;V50.scheduled=true;queueMicrotask(function(){V50.scheduled=false;refresh50(root||document)})}
function observe50(){if(V50.observer)return;V50.observer=new MutationObserver(function(ms){var need=false;ms.forEach(function(m){if(m.type==='attributes'){var el=m.target;if(el&&el.closest&&el.closest('#page-planejamento')){clearLegacyInline50(el);need=true}}else if(m.type==='childList'){Array.prototype.forEach.call(m.addedNodes,function(n){if(n&&n.nodeType===1){fixPlanValues50(n);need=true}})}else if(m.type==='characterData')need=true});if(need)schedule50(document)});V50.observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','class']})}
function init50(){refresh50(document);observe50();var fixed=function(){fixPlanValues50(document)};window.rhFitAllCardValues=fixed;window.rhV42FitCards=fixed;window.rhV43FitAll=fixed;window.rhV45FitAll=fixed;[0,60,150,350,800,1600].forEach(function(ms){setTimeout(function(){refresh50(document)},ms)});document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#page-planejamento,[data-plan-tab],#rh-plan-recalc'))setTimeout(function(){refresh50(document)},0)},true)}
window.RH_FIXED_PLAN_FONT_V50=28;window.rhV50Refresh=refresh50;if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init50);else init50();
})();

/* v52 — fonte única visível para Próxima Folha; v47 permanece como motor auditado oculto. */
(function(){'use strict';var timer=0;
function E(id){return document.getElementById(id)}function r(v){v=Number(v)||0;return Math.round((v+Number.EPSILON)*100)/100}function p(v){var s=String(v||'').replace(/R\$/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');return Number(s)||0}function m(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(r(v))}function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]})}
function live(){return document.querySelector('#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary>.rh47-summary-grid')}function card(k){var g=live();return g&&g.querySelector('.rh47-summary-card[data-rh47-key="'+k+'"]')}function val(k){var c=card(k),s=c&&c.querySelector('strong');return r(p(s&&s.textContent))}function txt(k,s,f){var c=card(k),x=c&&c.querySelector(s);return String(x&&x.textContent||f||'').trim()}
function read(){if(!live())return null;var prov=val('prov'),disc=val('disc'),ret=val('ret'),company=val('company'),ben=val('ben');if(!(prov>0))return null;return{prov:prov,disc:disc,liq:r(prov-disc),ret:ret,company:company,ben:ben,tax:r(ret+company),cost:r(prov+company+ben),ref:txt('prov','small','Projeção mensal'),benLabel:txt('ben','span','Benefícios confirmados (parcial)'),benSub:txt('ben','small','fonte parcial')}}function sig(t){return t?[t.prov,t.disc,t.ret,t.company,t.ben].map(function(v){return r(v).toFixed(2)}).join('|'):''}
function one(l,v,s,k,f){return '<button type="button" class="rh47-summary-card rh52-card '+(f?'featured':'')+'" data-rh47-key="'+esc(k)+'"><span>'+esc(l)+'</span><strong>'+m(v)+'</strong><small>'+esc(s)+'</small></button>'}
function render(t){if(!t)return;var old=E('rh51-forecast-cards');if(old)old.remove();var source=E('rh47-forecast-summary');if(!source||!source.parentNode)return;var host=E('rh52-forecast-cards');if(!host){host=document.createElement('section');host.id='rh52-forecast-cards';host.className='rh52-forecast-cards';source.parentNode.insertBefore(host,source)}var s=sig(t);if(host.dataset.sig===s)return;host.dataset.sig=s;host.innerHTML='<div class="rh52-grid">'+one('Proventos previstos',t.prov,t.ref,'prov')+one('Descontos previstos',t.disc,'retenções + demais descontos','disc')+one('Líquido previsto',t.liq,'proventos − descontos','liq',true)+one('Impostos retidos',t.ret,'INSS segurados + IRRF','ret')+one('Encargos empresa',t.company,'INSS patronal + RAT + terceiros + PIS + FGTS','company')+one(t.benLabel,t.ben,t.benSub,'ben')+one('Tributos / recolhimentos',t.tax,'retidos + encargos da empresa','tax')+one('Custo total estimado',t.cost,'proventos + encargos + benefícios','cost',true)+'</div>'}
function settle(delay){clearTimeout(timer);var tries=0,prev='';function step(){tries++;var t=read(),s=sig(t);if(s&&s===prev){render(t);return}prev=s;if(tries<10)timer=setTimeout(step,260);else if(t)render(t)}timer=setTimeout(step,delay||700)}
function styles(){if(E('_rh52'))return;var s=document.createElement('style');s.id='_rh52';s.textContent='#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis{display:none!important}#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary>.rh47-summary-grid{display:none!important}#page-planejamento [data-plan-pane="folha"] #rh51-forecast-cards{display:none!important}.rh52-forecast-cards{margin:0 0 12px!important}.rh52-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.rh52-card{height:126px!important;min-height:126px!important;box-sizing:border-box!important;overflow:hidden!important;transform:none!important;animation:none!important}.rh52-card strong{font-size:28px!important;line-height:32px!important;letter-spacing:-.02em!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important;transition:none!important;animation:none!important;transform:none!important}@media(max-width:1120px){.rh52-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.rh52-grid{grid-template-columns:1fr}.rh52-card{height:auto!important;min-height:118px!important}}';document.head.appendChild(s)}
function init(){styles();var old=E('rh51-forecast-cards');if(old)old.remove();settle(900);setTimeout(function(){if(!E('rh52-forecast-cards'))settle(0)},2400);document.addEventListener('click',function(e){if(e.target&&e.target.closest&&(e.target.closest('#rh-plan-recalc')||e.target.closest('[data-plan-tab="folha"]')))settle(700)},true);new MutationObserver(function(ms){ms.forEach(function(x){Array.prototype.forEach.call(x.addedNodes||[],function(n){if(n&&n.nodeType===1&&n.id==='rh51-forecast-cards')n.remove()})})}).observe(document.body,{childList:true,subtree:true})}
window.RH_FORECAST_SINGLE_SOURCE_V52=true;window.rhV52Refresh=function(){settle(0)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();