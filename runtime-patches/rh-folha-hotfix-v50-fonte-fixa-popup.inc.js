/* RH v50 — Planejamento com fonte fixa, sem espelho concorrente de Próxima Folha */
(function(){
'use strict';
var V50={observer:null,scheduled:false};
var PLAN_VALUES=[
  '#page-planejamento .kpi strong','#page-planejamento .rh47-summary-card strong',
  '#page-planejamento .rh46-total-card strong','#page-planejamento .summary-card strong',
  '#page-planejamento .stat-card strong','#page-planejamento .rh40-guide-card strong',
  '#page-planejamento .rh41-report-card strong','#page-planejamento strong .rh46-card-value'
].join(',');
function E50(id){return document.getElementById(id)}
function norm50(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function styles50(){
  if(E50('_rh50'))return;var s=document.createElement('style');s.id='_rh50';s.textContent=
    '#page-planejamento .kpi strong,#page-planejamento .rh47-summary-card strong,#page-planejamento .rh46-total-card strong,#page-planejamento .summary-card strong,#page-planejamento .stat-card strong,#page-planejamento .rh40-guide-card strong,#page-planejamento .rh41-report-card strong,#page-planejamento strong .rh46-card-value{font-size:28px!important;line-height:32px!important;letter-spacing:-.02em!important;font-variant-numeric:tabular-nums!important;white-space:nowrap!important;transform:none!important;transition:none!important;animation:none!important;opacity:1!important;visibility:visible!important}'+
    '#page-planejamento .kpi,#page-planejamento .rh47-summary-card,#page-planejamento .rh46-total-card,#page-planejamento .summary-card,#page-planejamento .stat-card{transform:none!important;animation:none!important;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease!important}'+
    '.rh50-encbenef-modal,.rh50-encbenef-modal .modal-card,.rh50-encbenef-modal .rh-detail-card,.rh50-encbenef-modal .rh48-modal-card{width:min(1080px,calc(100vw - 48px))!important;max-width:min(1080px,calc(100vw - 48px))!important;overflow:hidden!important}'+
    '.rh50-encbenef-modal table{width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important}'+
    '.rh50-encbenef-modal th,.rh50-encbenef-modal td{padding:11px 14px!important;vertical-align:middle!important;word-break:normal!important;overflow-wrap:break-word!important;hyphens:none!important;transition:none!important;animation:none!important}'+
    '.rh50-encbenef-modal th{font-size:11px!important;letter-spacing:.045em!important}.rh50-encbenef-modal td{font-size:13px!important;line-height:1.3!important}.rh50-encbenef-modal tfoot td{font-weight:900!important;border-top:2px solid var(--line)!important}'+
    '@media(max-width:760px){.rh50-encbenef-modal,.rh50-encbenef-modal .modal-card,.rh50-encbenef-modal .rh-detail-card{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important}}';document.head.appendChild(s)
}
function clearLegacyInline50(el){if(!el||!el.style)return;['font-size','line-height','letter-spacing','transform','transition','animation'].forEach(function(p){try{el.style.removeProperty(p)}catch(e){}});el.dataset.rh50Fixed='28'}
function fixPlanValues50(root){root=root||document;if(root.nodeType===1&&root.matches&&root.matches(PLAN_VALUES))clearLegacyInline50(root);if(root.querySelectorAll)Array.prototype.forEach.call(root.querySelectorAll(PLAN_VALUES),clearLegacyInline50)}
function findEncBenefitModal50(){
  Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,.modal-title,.rh-detail-title,.rh48-modal-head')).forEach(function(h){
    if(norm50(h.textContent).indexOf('encargos + beneficios')<0)return;var a=h,chosen=null;
    while(a&&a!==document.body){if(a.querySelector&&a.querySelector('table')){chosen=a;break}a=a.parentElement}
    if(chosen)chosen.classList.add('rh50-encbenef-modal')
  })
}
function refresh50(root){styles50();fixPlanValues50(root||document);findEncBenefitModal50()}
function schedule50(root){if(V50.scheduled)return;V50.scheduled=true;queueMicrotask(function(){V50.scheduled=false;refresh50(root||document)})}
function observe50(){
  if(V50.observer)return;V50.observer=new MutationObserver(function(ms){var need=false;ms.forEach(function(m){if(m.type==='childList'){Array.prototype.forEach.call(m.addedNodes||[],function(n){if(n&&n.nodeType===1){fixPlanValues50(n);need=true}})}});if(need)schedule50(document)});
  V50.observer.observe(document.body,{subtree:true,childList:true})
}
function init50(){refresh50(document);observe50();var fixed=function(){fixPlanValues50(document)};window.rhFitAllCardValues=fixed;window.rhV42FitCards=fixed;window.rhV43FitAll=fixed;window.rhV45FitAll=fixed;[0,100,400,1000].forEach(function(ms){setTimeout(function(){refresh50(document)},ms)})}
window.RH_FIXED_PLAN_FONT_V50=28;window.rhV50Refresh=refresh50;window.rh50EncBenefitMarker='rh50-encbenef-modal';
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init50);else init50();
})();
