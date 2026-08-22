/* RH v53 — deduplicação definitiva da Próxima Folha + popups proporcionais */
(function(){'use strict';
var obs=null;
function E(id){return document.getElementById(id)}
function styles(){
  if(E('_rh53'))return;var s=document.createElement('style');s.id='_rh53';s.textContent=
  /* Só a grade v52 fica visível. As camadas v24/v47/v51 permanecem apenas como fonte/compatibilidade. */
  '#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis{display:none!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh51-forecast-cards{display:none!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary .rh47-summary-grid{display:none!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh52-forecast-cards{display:block!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh52-forecast-cards .rh52-grid{display:grid!important}'+
  /* Modal da composição: largura determinada pela quantidade real de colunas. */
  '#encargos-popup .modal-card.rh53-forecast-popup{box-sizing:border-box!important;margin:auto!important;max-height:88vh!important;overflow:hidden!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup.rh53-cols2{width:min(680px,calc(100vw - 40px))!important;max-width:min(680px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup.rh53-cols3{width:min(820px,calc(100vw - 40px))!important;max-width:min(820px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup.rh53-cols4{width:min(960px,calc(100vw - 40px))!important;max-width:min(960px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup.rh53-cols5{width:min(1120px,calc(100vw - 40px))!important;max-width:min(1120px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup.rh53-cols6{width:min(1260px,calc(100vw - 40px))!important;max-width:min(1260px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup .ep-body{max-width:100%!important;overflow:auto!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup .rh47-popup-scroll{width:100%!important;max-width:100%!important;overflow:auto!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup .rh47-popup-table{width:100%!important;max-width:100%!important;table-layout:fixed!important;margin:0!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup.rh53-cols2 .rh47-popup-table,#encargos-popup .modal-card.rh53-forecast-popup.rh53-cols3 .rh47-popup-table{min-width:0!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup.rh53-cols4 .rh47-popup-table{min-width:860px!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup.rh53-cols5 .rh47-popup-table{min-width:1020px!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup.rh53-cols6 .rh47-popup-table{min-width:1160px!important}'+
  '#encargos-popup .modal-card.rh53-forecast-popup .rh47-popup-table th,#encargos-popup .modal-card.rh53-forecast-popup .rh47-popup-table td{word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important}'+
  '@media(max-width:760px){#encargos-popup .modal-card.rh53-forecast-popup{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important;max-height:92vh!important}}';document.head.appendChild(s)
}
function dedup(){
  var pane=document.querySelector('#page-planejamento [data-plan-pane="folha"]');if(!pane)return;
  /* IDs duplicados não deveriam existir, mas removemos qualquer host v52 adicional por segurança. */
  var hosts=Array.prototype.slice.call(pane.querySelectorAll('#rh52-forecast-cards'));hosts.slice(1).forEach(function(x){x.remove()});
  var legacy=E('rh51-forecast-cards');if(legacy)legacy.style.setProperty('display','none','important');
  var old=E('rh-plan-folha-kpis');if(old)old.style.setProperty('display','none','important');
  pane.querySelectorAll('#rh47-forecast-summary .rh47-summary-grid').forEach(function(x){x.style.setProperty('display','none','important')});
  var keep=E('rh52-forecast-cards');if(keep)keep.style.setProperty('display','block','important')
}
function sizePopup(){
  var modal=E('encargos-popup');if(!modal||modal.hidden)return;var table=modal.querySelector('.rh47-popup-table');if(!table)return;
  var card=modal.querySelector('.modal-card');if(!card)return;var cols=table.querySelectorAll('thead th').length||3;cols=Math.max(2,Math.min(6,cols));
  card.classList.add('rh53-forecast-popup');for(var i=2;i<=6;i++)card.classList.toggle('rh53-cols'+i,i===cols);
  /* Neutraliza dimensões inline deixadas por versões anteriores; o CSS v53 é a fonte final. */
  ['width','max-width','min-width'].forEach(function(p){try{card.style.removeProperty(p)}catch(e){}})
}
function process(){styles();dedup();sizePopup()}
function observe(){if(obs)return;obs=new MutationObserver(function(){queueMicrotask(process)});obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','style']})}
function init(){process();observe();[100,400,900,1800,3000].forEach(function(ms){setTimeout(process,ms)});document.addEventListener('click',function(e){if(e.target&&e.target.closest&&(e.target.closest('[data-plan-tab="folha"]')||e.target.closest('#rh-plan-recalc')||e.target.closest('#rh52-forecast-cards')))setTimeout(process,0)},true)}
window.RH_FORECAST_DEDUP_POPUP_V53=true;window.rhV53Process=process;if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();
