/* RH v36 — simplifica provisões para lista de colaboradores e estabiliza cards */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function simplifyPane(kind){
  var pane=document.querySelector('[data-plan-pane="'+kind+'"]');if(!pane)return;
  /* Remove o resumo por centro de custo: não agrega valor à leitura operacional desta tela. */
  Array.from(pane.querySelectorAll('article.table-panel')).forEach(function(article){
    var t=article.querySelector('table');
    if(t&&!t.classList.contains('rh26-wide'))article.remove();
  });
  var table=pane.querySelector('table.rh26-wide');if(!table)return;
  table.classList.add('rh36-name-list');
  var article=table.closest('article.table-panel');
  if(article){
    var title=article.querySelector('.panel-head h2');if(title)title.textContent=kind==='13'?'Colaboradores — provisão de 13º':'Colaboradores — provisão de férias';
    var note=article.querySelector('.detail-note');if(note)note.textContent='Clique no colaborador para abrir a memória de cálculo completa.';
  }
  var wrap=table.closest('.table-wrap');
  if(wrap){wrap.classList.remove('rh30-scroll');var prev=wrap.previousElementSibling;if(prev&&prev.classList.contains('rh30-scroll-note'))prev.remove();}
  var thead=table.tHead;
  if(thead){
    Array.from(thead.querySelectorAll('.rh30-group-head')).forEach(function(x){x.remove()});
    var row=thead.rows[0];if(row&&row.cells[0])row.cells[0].textContent='Colaborador';
  }
  Array.from(table.querySelectorAll('tbody tr.rh26-row')).forEach(function(tr){
    var first=tr.cells[0];if(!first)return;
    Array.from(first.querySelectorAll('small')).forEach(function(s){s.style.display='none'});
    first.title='Clique para ver a memória de cálculo';
  });
}
function simplify(){simplifyPane('13');simplifyPane('ferias')}
function style(){if(E('_rh36'))return;var s=document.createElement('style');s.id='_rh36';s.textContent='\
#page-planejamento table.rh36-name-list{min-width:0!important;width:100%!important;table-layout:auto!important;border-collapse:separate!important;border-spacing:0!important}\
#page-planejamento table.rh36-name-list thead th:not(:first-child),#page-planejamento table.rh36-name-list tbody td:not(:first-child),#page-planejamento table.rh36-name-list tfoot{display:none!important}\
#page-planejamento table.rh36-name-list thead th:first-child{position:static!important;width:100%!important;min-width:0!important;max-width:none!important;padding:11px 18px!important;background:var(--surface-2)!important;box-shadow:none!important;text-align:left!important}\
#page-planejamento table.rh36-name-list tbody td:first-child{position:relative!important;width:100%!important;min-width:0!important;max-width:none!important;padding:15px 48px 15px 18px!important;background:transparent!important;box-shadow:none!important;white-space:normal!important}\
#page-planejamento table.rh36-name-list tbody td:first-child b{font-size:.88rem!important;line-height:1.2!important;display:block!important;color:var(--text)!important}\
#page-planejamento table.rh36-name-list tbody td:first-child small{display:none!important}\
#page-planejamento table.rh36-name-list tbody tr{cursor:pointer!important}\
#page-planejamento table.rh36-name-list tbody tr:nth-child(even) td:first-child{background:color-mix(in srgb,var(--surface-2) 48%,transparent)!important}\
#page-planejamento table.rh36-name-list tbody tr:hover td:first-child{background:color-mix(in srgb,var(--gold) 8%,var(--surface))!important}\
#page-planejamento table.rh36-name-list tbody td:first-child:after{content:"›";position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:1.5rem;font-weight:900;color:var(--gold)}\
#page-planejamento .table-wrap:has(table.rh36-name-list){overflow:visible!important;padding-bottom:0!important}\
.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#custo-real-kpis strong,#payroll-kpis strong,#charges-kpis strong,#movement-kpis strong{animation:none!important;transition:none!important;transform:none!important;font-variant-numeric:tabular-nums!important}\
';document.head.appendChild(s)}
var timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(function(){style();simplify();if(typeof window.rhFitAllCardValues==='function')window.rhFitAllCardValues()},80)}
var obs=new MutationObserver(schedule);
function init(){style();simplify();obs.observe(document.body,{childList:true,subtree:true});window.addEventListener('resize',schedule)}
window.rhV36SimplifyPlanning=simplify;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
