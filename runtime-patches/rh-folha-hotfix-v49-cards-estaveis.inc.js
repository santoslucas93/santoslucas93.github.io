/* RH v49 — cards estáveis: uma única tipografia no Planejamento & Provisões */
(function(){
'use strict';
var V49={observer:null,resizeObservePatched:false,stylePatched:false};
var VALUE_SELECTOR=[
  '.kpi strong','.rh40-guide-card strong','.rh41-report-card strong','.rh-close-stat strong',
  '.rh-history-metric strong','.metric-row strong','.preview-summary strong','.summary-card strong',
  '.stat-card strong','#charges-kpis strong','#payroll-kpis strong','#movement-kpis strong',
  '#custo-real-kpis strong','#rh-dossier-kpis strong','#rh-insight-kpis strong',
  '.rh46-total-card strong','.rh47-summary-card strong'
].join(',');
var CARD_SELECTOR=[
  '.kpi','.rh40-guide-card','.rh41-report-card','.rh-close-stat','.rh-history-metric',
  '.metric-row','.preview-summary','.summary-card','.stat-card','.rh46-total-card','.rh47-summary-card'
].join(',');
var LOCKED_PROPS=new Set(['font-size','line-height','letter-spacing','white-space','max-width','width','display','overflow','text-overflow','transform','transition','animation']);
var lockedStyles=new WeakSet();
var originalSetProperty=window.CSSStyleDeclaration&&CSSStyleDeclaration.prototype.setProperty;
function E49(id){return document.getElementById(id)}
function stableSize49(el){
  /* Planejamento inteiro usa fonte fixa: nenhuma rotina pode voltar a medir/reduzir. */
  if(el.closest('#page-planejamento'))return '28px';
  if(el.closest('.rh40-guide-card,.rh41-report-card'))return 'clamp(16px,1.15vw,22px)';
  return 'clamp(18px,1.35vw,27px)'
}
function rawSet49(style,prop,val,priority){if(style&&originalSetProperty)originalSetProperty.call(style,prop,val,priority||'important')}
function lockValue49(el){
  if(!el||!el.isConnected)return;var style=el.style;lockedStyles.add(style);
  rawSet49(style,'display','block');rawSet49(style,'width','100%');rawSet49(style,'max-width','100%');
  rawSet49(style,'font-size',stableSize49(el));rawSet49(style,'line-height',el.closest('#page-planejamento')?'32px':'1.08');
  rawSet49(style,'letter-spacing','-.02em');rawSet49(style,'white-space','nowrap');rawSet49(style,'overflow','visible');
  rawSet49(style,'text-overflow','clip');rawSet49(style,'transform','none');rawSet49(style,'transition','none');rawSet49(style,'animation','none');
  el.dataset.rh49Locked='1'
}
function lockTree49(root){
  if(!root)return;if(root.nodeType===1&&root.matches&&root.matches(VALUE_SELECTOR))lockValue49(root);
  if(root.querySelectorAll)Array.prototype.forEach.call(root.querySelectorAll(VALUE_SELECTOR),lockValue49)
}
function lockAll49(){lockTree49(document)}
function patchStyle49(){
  if(V49.stylePatched||!window.CSSStyleDeclaration||!originalSetProperty)return;V49.stylePatched=true;
  CSSStyleDeclaration.prototype.setProperty=function(prop,val,priority){
    var p=String(prop||'').toLowerCase();if(lockedStyles.has(this)&&LOCKED_PROPS.has(p))return;
    return originalSetProperty.call(this,prop,val,priority)
  }
}
function patchResizeObserver49(){
  if(V49.resizeObservePatched||!window.ResizeObserver||!ResizeObserver.prototype.observe)return;V49.resizeObservePatched=true;
  var originalObserve=ResizeObserver.prototype.observe;
  ResizeObserver.prototype.observe=function(target,options){
    try{if(target&&target.matches&&(target.matches(CARD_SELECTOR)||target.matches(VALUE_SELECTOR)))return}catch(e){}
    return originalObserve.call(this,target,options)
  }
}
function styles49(){
  if(E49('_rh49'))return;var s=document.createElement('style');s.id='_rh49';s.textContent=
    '.rh46-card-value{font-size:inherit!important;line-height:inherit!important;letter-spacing:inherit!important;white-space:inherit!important;width:100%!important;max-width:100%!important;overflow:inherit!important;text-overflow:inherit!important;transition:none!important;animation:none!important}'+
    '.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.rh-history-metric,.summary-card,.stat-card,.rh46-total-card,.rh47-summary-card{transform:none!important;animation:none!important;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease!important}'+
    '#page-planejamento .kpi strong,#page-planejamento .rh47-summary-card strong,#page-planejamento .rh46-total-card strong{font-size:28px!important;line-height:32px!important;letter-spacing:-.02em!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important;transform:none!important;transition:none!important;animation:none!important}'+
    '#page-planejamento [data-plan-pane="13"] .kpi,#page-planejamento [data-plan-pane="ferias"] .kpi{min-height:140px!important;height:140px!important;box-sizing:border-box!important}'+
    '#page-planejamento [data-plan-pane="folha"] .rh47-summary-card{min-height:126px!important;height:126px!important;box-sizing:border-box!important}'+
    '@media(max-width:760px){#page-planejamento [data-plan-pane="13"] .kpi,#page-planejamento [data-plan-pane="ferias"] .kpi,#page-planejamento [data-plan-pane="folha"] .rh47-summary-card{height:auto!important;min-height:112px!important}}';
  document.head.appendChild(s)
}
function observe49(){
  if(V49.observer)return;V49.observer=new MutationObserver(function(ms){ms.forEach(function(m){
    if(m.type==='childList')Array.prototype.forEach.call(m.addedNodes,function(n){if(n&&n.nodeType===1)lockTree49(n)});
    if(m.type==='characterData'&&m.target&&m.target.parentElement){var v=m.target.parentElement.closest&&m.target.parentElement.closest(VALUE_SELECTOR);if(v)lockValue49(v)}
  })});V49.observer.observe(document.body,{childList:true,subtree:true,characterData:true})
}
function init49(){styles49();lockAll49();observe49();window.rhFitAllCardValues=lockAll49;window.rhV42FitCards=lockAll49;window.rhV43FitAll=lockAll49;window.rhV45FitAll=lockAll49;[80,260,700,1400].forEach(function(ms){setTimeout(lockAll49,ms)})}
patchStyle49();patchResizeObserver49();styles49();lockAll49();
window.RH_CARD_STABILITY_V49=true;window.rh49Locked=lockAll49;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init49);else init49();
})();
