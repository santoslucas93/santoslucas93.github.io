/* RH v51 consolidada — espelho estável da Próxima Folha + popups compactos + provisões preservadas */
(function(){
'use strict';
var V={timer:0,observer:null,lastSource:'',stableCount:0};
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function p(v){var s=String(v==null?'':v).replace(/R\$/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');return Number(s)||0}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(r(v))}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pane(){return document.querySelector('#page-planejamento [data-plan-pane="folha"]')}
function sourceBox(){return E('rh47-forecast-summary')}
function sourceGrid(){var b=sourceBox();return b&&b.querySelector('.rh47-summary-grid')}
function sourceCard(key){var g=sourceGrid();return g&&g.querySelector('.rh47-summary-card[data-rh47-key="'+key+'"]')}
function value(key){var c=sourceCard(key),s=c&&c.querySelector('strong');return r(p(s&&s.textContent))}
function text(key,sel,fallback){var c=sourceCard(key),x=c&&c.querySelector(sel);return String(x&&x.textContent||fallback||'').trim()}
function snapshot(){
  var g=sourceGrid();if(!g)return null;
  var prov=value('prov'),disc=value('disc'),ret=value('ret'),company=value('company'),ben=value('ben');
  if(!(prov>0))return null;
  return{prov:prov,disc:disc,liq:r(prov-disc),ret:ret,company:company,ben:ben,tax:r(ret+company),cost:r(prov+company+ben),ref:text('prov','small','Projeção mensal'),benLabel:text('ben','span','Benefícios confirmados (parcial)'),benSub:text('ben','small','fonte parcial')}
}
function signature(t){return t?[t.prov,t.disc,t.ret,t.company,t.ben].map(function(v){return r(v).toFixed(2)}).join('|'):''}
function card(label,v,sub,key,featured){return '<button type="button" class="rh47-summary-card rh51-stable-card '+(featured?'featured':'')+'" data-rh47-key="'+esc(key)+'"><span>'+esc(label)+'</span><strong>'+money(v)+'</strong><small>'+esc(sub||'')+'</small></button>'}
function cardsHtml(t){return '<div class="rh51-summary-grid">'+card('Proventos previstos',t.prov,t.ref,'prov')+card('Descontos previstos',t.disc,'retenções + demais descontos','disc')+card('Líquido previsto',t.liq,'proventos − descontos','liq',true)+card('Impostos retidos',t.ret,'INSS segurados + IRRF','ret')+card('Encargos empresa',t.company,'INSS patronal + RAT + terceiros + PIS + FGTS','company')+card(t.benLabel,t.ben,t.benSub,'ben')+card('Tributos / recolhimentos',t.tax,'retidos + encargos da empresa','tax')+card('Custo total estimado',t.cost,'proventos + encargos + benefícios','cost',true)+'</div>'}
function renderStable(t){
  var b=sourceBox();if(!b||!b.parentNode||!t)return;
  var host=E('rh51-forecast-cards');if(!host){host=document.createElement('section');host.id='rh51-forecast-cards';host.className='rh51-forecast-cards';b.parentNode.insertBefore(host,b)}
  var s=signature(t);if(host.dataset.sig===s)return;host.dataset.sig=s;host.innerHTML=cardsHtml(t)
}
/* Mantém o último valor visível até a fonte auditada ficar estável por 3 leituras. */
function settle(delay){
  clearTimeout(V.timer);V.stableCount=0;V.lastSource='';
  function step(){
    var t=snapshot(),s=signature(t);if(!s){V.timer=setTimeout(step,260);return}
    if(s===V.lastSource)V.stableCount++;else{V.lastSource=s;V.stableCount=1}
    if(V.stableCount>=3){renderStable(t);dedup();return}
    V.timer=setTimeout(step,260)
  }
  V.timer=setTimeout(step,delay==null?450:delay)
}
function dedup(){
  var x=pane();if(!x)return;
  var legacy=E('rh-plan-folha-kpis');if(legacy)legacy.style.setProperty('display','none','important');
  x.querySelectorAll('#rh47-forecast-summary .rh47-summary-grid').forEach(function(g){g.style.setProperty('display','none','important')});
  x.querySelectorAll('#rh52-forecast-cards').forEach(function(h){h.style.setProperty('display','none','important')});
  var hosts=Array.prototype.slice.call(x.querySelectorAll('#rh51-forecast-cards'));hosts.slice(1).forEach(function(h){h.remove()});if(hosts[0])hosts[0].style.setProperty('display','block','important')
}

/* Popups da Próxima Folha: a caixa acompanha a quantidade real de colunas. */
function sizePopup(){
  var modal=E('encargos-popup');if(!modal||modal.hidden)return;
  var table=modal.querySelector('.rh47-popup-table,.modal-table-inner,.rh-comp-table table,table');if(!table)return;
  var box=modal.querySelector('.modal-card');if(!box)return;
  var cols=table.querySelectorAll('thead th').length||3;cols=Math.max(2,Math.min(6,cols));
  box.classList.add('rh51-forecast-popup');for(var i=2;i<=6;i++)box.classList.toggle('rh51-cols'+i,i===cols);
  box.style.removeProperty('width');box.style.removeProperty('max-width');box.style.removeProperty('min-width')
}

/* Férias e 13º: a estrutura continua intacta; CC é somente oculto na apresentação. */
function protectProvisionTables(){
  document.querySelectorAll('#page-planejamento [data-plan-pane="13"] table.rh26-wide,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide').forEach(function(table){table.classList.add('rh51-provision-safe');table.dataset.rh51Structure='preserved'})
}
function styles(){
  if(E('_rh51'))return;var s=document.createElement('style');s.id='_rh51';s.textContent=
  '#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis{display:none!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary .rh47-summary-grid{display:none!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh52-forecast-cards{display:none!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh51-forecast-cards{display:block!important;margin:0 0 14px!important}'+
  '.rh51-summary-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}'+
  '.rh51-stable-card{height:126px!important;min-height:126px!important;box-sizing:border-box!important;overflow:hidden!important;transform:none!important;animation:none!important;transition:none!important}'+
  '.rh51-stable-card strong{font-size:28px!important;line-height:32px!important;letter-spacing:-.02em!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important;transition:none!important;animation:none!important;transform:none!important}'+
  '#encargos-popup{display:grid!important;place-items:center!important;padding:20px!important;box-sizing:border-box!important}#encargos-popup[hidden]{display:none!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup{box-sizing:border-box!important;margin:auto!important;min-width:0!important;max-height:88vh!important;overflow:hidden!important;flex:none!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols2{width:min(620px,calc(100vw - 40px))!important;max-width:min(620px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols3{width:min(780px,calc(100vw - 40px))!important;max-width:min(780px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols4{width:min(960px,calc(100vw - 40px))!important;max-width:min(960px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols5{width:min(1100px,calc(100vw - 40px))!important;max-width:min(1100px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols6{width:min(1240px,calc(100vw - 40px))!important;max-width:min(1240px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup .ep-body{width:100%!important;max-width:100%!important;overflow:auto!important;padding:18px 20px!important;box-sizing:border-box!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup .rh47-popup-scroll{width:100%!important;max-width:100%!important;overflow:auto!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup table{width:100%!important;max-width:100%!important;margin:0!important;table-layout:fixed!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols2 table,#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols3 table{min-width:0!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols4 table{min-width:860px!important}#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols5 table{min-width:1000px!important}#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols6 table{min-width:1140px!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup th,#encargos-popup .modal-card.rh51-forecast-popup td{word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important}'+
  '#page-planejamento [data-plan-pane="13"] table.rh51-provision-safe thead tr:not(.rh30-group-head) th:nth-child(2),#page-planejamento [data-plan-pane="13"] table.rh51-provision-safe tbody td:nth-child(2),#page-planejamento [data-plan-pane="13"] table.rh51-provision-safe tfoot td:nth-child(2),#page-planejamento [data-plan-pane="ferias"] table.rh51-provision-safe thead tr:not(.rh30-group-head) th:nth-child(2),#page-planejamento [data-plan-pane="ferias"] table.rh51-provision-safe tbody td:nth-child(2),#page-planejamento [data-plan-pane="ferias"] table.rh51-provision-safe tfoot td:nth-child(2){display:none!important}'+
  '@media(max-width:1120px){.rh51-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.rh51-summary-grid{grid-template-columns:1fr}.rh51-stable-card{height:auto!important;min-height:118px!important}#encargos-popup .modal-card.rh51-forecast-popup{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important;max-height:92vh!important}}';document.head.appendChild(s)
}
function process(){styles();dedup();sizePopup();protectProvisionTables()}
function sourceChanged(m){var t=m&&m.target;if(!t)return false;var el=t.nodeType===1?t:t.parentElement;return !!(el&&el.closest&&el.closest('#rh47-forecast-summary'))}
function observe(){
  if(V.observer)return;V.observer=new MutationObserver(function(ms){var changed=false,popup=false;ms.forEach(function(m){if(sourceChanged(m))changed=true;if(m.type==='attributes'&&m.target&&m.target.id==='encargos-popup')popup=true;if(m.type==='childList')popup=true});if(changed)settle(420);if(popup)queueMicrotask(function(){dedup();sizePopup();protectProvisionTables()})});
  V.observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']})
}
function init(){styles();process();observe();settle(1500);setTimeout(function(){settle(0)},3200);document.addEventListener('click',function(e){if(!e.target||!e.target.closest)return;if(e.target.closest('#rh-plan-recalc')||e.target.closest('[data-plan-tab="folha"]'))settle(650);if(e.target.closest('#rh51-forecast-cards'))setTimeout(sizePopup,0);if(e.target.closest('[data-plan-tab="13"],[data-plan-tab="ferias"]'))setTimeout(protectProvisionTables,180)},true)}
window.RH_PLANNING_LAYOUT_V51=true;window.rhV51RefreshForecast=function(){settle(0)};window.rhV51FixProvisionTables=protectProvisionTables;if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
