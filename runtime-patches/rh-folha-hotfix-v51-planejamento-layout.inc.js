/* RH v51 consolidada — uma fonte visual na Próxima Folha + popups proporcionais */
(function(){
'use strict';
var V51={observer:null,openWrapped:false};
function E(id){return document.getElementById(id)}
function planningActive(){var p=E('page-planejamento');return !!(p&&p.classList.contains('active'))}
function forecastPane(){return document.querySelector('#page-planejamento [data-plan-pane="folha"]')}
function activePane(){return Array.prototype.find.call(document.querySelectorAll('#page-planejamento [data-plan-pane]'),function(x){return !x.hidden&&getComputedStyle(x).display!=='none'})}
function protectProvisionTables(){
  document.querySelectorAll('#page-planejamento [data-plan-pane="13"] table.rh26-wide,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide').forEach(function(table){table.classList.add('rh51-provision-safe');table.dataset.rh51Structure='preserved'})
}
function singleForecastGrid(){
  var pane=forecastPane();if(!pane)return;
  /* Elimina definitivamente espelhos antigos. A grade v47 auditada passa a ser a própria interface. */
  pane.querySelectorAll('#rh51-forecast-cards,#rh52-forecast-cards').forEach(function(x){x.remove()});
  var legacy=E('rh-plan-folha-kpis');if(legacy)legacy.style.setProperty('display','none','important');
  var summary=E('rh47-forecast-summary'),grid=summary&&summary.querySelector(':scope > .rh47-summary-grid');
  if(summary)summary.style.setProperty('display','block','important');
  if(grid)grid.style.setProperty('display','grid','important')
}
function popupWidth(cols){if(cols<=2)return 620;if(cols===3)return 780;if(cols===4)return 900;if(cols===5)return 1000;if(cols===6)return 1120;if(cols===7)return 1240;return 1360}
function forceBoxSize(box,cols){
  if(!box)return;var max=Math.max(320,window.innerWidth-48),w=Math.min(popupWidth(cols),max)+'px';
  box.style.setProperty('width',w,'important');box.style.setProperty('max-width',w,'important');box.style.setProperty('min-width','0','important');
  box.style.setProperty('margin','auto','important');box.style.setProperty('box-sizing','border-box','important');box.style.setProperty('overflow','hidden','important');box.style.setProperty('max-height','90vh','important')
}
function normalizeTable(table){
  if(!table)return;table.style.setProperty('width','100%','important');table.style.setProperty('max-width','100%','important');table.style.setProperty('min-width','0','important');table.style.setProperty('table-layout','fixed','important');table.style.setProperty('margin','0','important')
}
function sizeGenericPopup(){
  if(!planningActive())return;var modal=E('encargos-popup');if(!modal||modal.hidden)return;
  var table=modal.querySelector('.rh47-popup-table,.modal-table-inner,.rh-comp-table table,table'),box=modal.querySelector('.modal-card');if(!table||!box)return;
  var cols=table.querySelectorAll('thead th').length||3;forceBoxSize(box,cols);box.classList.add('rh51-plan-popup');
  var body=modal.querySelector('.ep-body');if(body){body.style.setProperty('width','100%','important');body.style.setProperty('max-width','100%','important');body.style.setProperty('box-sizing','border-box','important');body.style.setProperty('overflow','auto','important')}
  normalizeTable(table)
}
function sizeDedicatedPopup(){
  if(!planningActive())return;var modal=E('rh48-modal');if(!modal)return;var box=modal.querySelector('.rh48-modal-card'),table=modal.querySelector('.rh48-table');if(!box||!table)return;
  var cols=table.querySelectorAll('thead th').length||2;forceBoxSize(box,cols);box.classList.add('rh51-plan-popup');normalizeTable(table)
}
function wrapGenericOpen(){
  if(V51.openWrapped)return;var original=null;try{original=typeof openGenericDetail==='function'?openGenericDetail:null}catch(e){}if(!original||original._rh51Wrapped)return;
  var wrapped=function(){var out=original.apply(this,arguments);if(planningActive()){sizeGenericPopup();requestAnimationFrame(sizeGenericPopup);setTimeout(sizeGenericPopup,40)}return out};wrapped._rh51Wrapped=true;
  try{openGenericDetail=wrapped}catch(e){}try{window.openGenericDetail=wrapped}catch(e){}V51.openWrapped=true
}
function styles(){
  if(E('_rh51'))return;var s=document.createElement('style');s.id='_rh51';s.textContent=
    '#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis{display:none!important}'+
    '#page-planejamento [data-plan-pane="folha"] #rh51-forecast-cards,#page-planejamento [data-plan-pane="folha"] #rh52-forecast-cards{display:none!important}'+
    '#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary{display:block!important;margin:0 0 18px!important}'+
    '#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary>.rh47-summary-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;margin-bottom:12px!important}'+
    '#page-planejamento [data-plan-pane="folha"] .rh47-summary-card{height:126px!important;min-height:126px!important;box-sizing:border-box!important;overflow:hidden!important;transform:none!important;animation:none!important;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease!important}'+
    '#page-planejamento [data-plan-pane="folha"] .rh47-summary-card strong{font-size:28px!important;line-height:32px!important;letter-spacing:-.02em!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important;transform:none!important;transition:none!important;animation:none!important}'+
    '#encargos-popup{display:grid!important;place-items:center!important;padding:20px!important;box-sizing:border-box!important}#encargos-popup[hidden]{display:none!important}'+
    '#encargos-popup .modal-card.rh51-plan-popup .ep-body{padding:18px 20px!important}'+
    '#encargos-popup .modal-card.rh51-plan-popup .rh47-popup-scroll{width:100%!important;max-width:100%!important;overflow:auto!important}'+
    '#encargos-popup .modal-card.rh51-plan-popup table{width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important;margin:0!important}'+
    '#encargos-popup .modal-card.rh51-plan-popup th,#encargos-popup .modal-card.rh51-plan-popup td{word-break:normal!important;overflow-wrap:break-word!important;hyphens:none!important}'+
    '#encargos-popup .modal-card.rh51-plan-popup th{white-space:normal!important}'+
    '#rh48-modal .rh48-modal-card.rh51-plan-popup .rh48-table-scroll{width:100%!important;max-width:100%!important;overflow:auto!important}'+
    '#rh48-modal .rh48-modal-card.rh51-plan-popup table{width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important}'+
    '#rh48-modal .rh48-modal-card.rh51-plan-popup th,#rh48-modal .rh48-modal-card.rh51-plan-popup td{word-break:normal!important;overflow-wrap:break-word!important;hyphens:none!important}'+
    '#page-planejamento [data-plan-pane="13"] table.rh51-provision-safe thead tr:not(.rh30-group-head) th:nth-child(2),#page-planejamento [data-plan-pane="13"] table.rh51-provision-safe tbody td:nth-child(2),#page-planejamento [data-plan-pane="13"] table.rh51-provision-safe tfoot td:nth-child(2),#page-planejamento [data-plan-pane="ferias"] table.rh51-provision-safe thead tr:not(.rh30-group-head) th:nth-child(2),#page-planejamento [data-plan-pane="ferias"] table.rh51-provision-safe tbody td:nth-child(2),#page-planejamento [data-plan-pane="ferias"] table.rh51-provision-safe tfoot td:nth-child(2){display:none!important}'+
    '@media(max-width:1120px){#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary>.rh47-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}'+
    '@media(max-width:760px){#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary>.rh47-summary-grid{grid-template-columns:1fr!important}#page-planejamento [data-plan-pane="folha"] .rh47-summary-card{height:auto!important;min-height:118px!important}#encargos-popup .modal-card.rh51-plan-popup,#rh48-modal .rh48-modal-card.rh51-plan-popup{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important}}';document.head.appendChild(s)
}
function process(){styles();singleForecastGrid();protectProvisionTables();sizeGenericPopup();sizeDedicatedPopup();wrapGenericOpen()}
function observe(){
  if(V51.observer)return;V51.observer=new MutationObserver(function(ms){var relevant=false;ms.forEach(function(m){if(m.type==='childList'&&m.addedNodes&&m.addedNodes.length)relevant=true;if(m.type==='attributes'&&m.attributeName==='hidden')relevant=true});if(relevant)queueMicrotask(process)});
  V51.observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']})
}
function init(){process();observe();[100,500,1200,2400].forEach(function(ms){setTimeout(process,ms)});document.addEventListener('click',function(e){if(!e.target||!e.target.closest)return;if(e.target.closest('[data-plan-tab],#rh-plan-recalc,#page-planejamento .kpi,#page-planejamento .rh47-summary-card'))setTimeout(process,0)},true);window.addEventListener('resize',function(){setTimeout(function(){sizeGenericPopup();sizeDedicatedPopup()},50)},{passive:true})}
window.RH_PLANNING_LAYOUT_V51=true;window.rhV51RefreshForecast=singleForecastGrid;window.rhV51FixProvisionTables=protectProvisionTables;window.rh51ForecastCompatibilityMarker='rh51-forecast-cards';
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
