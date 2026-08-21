/* RH v41a — estabilidade do seletor e descoberta da central de relatórios */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function comp(v){try{return formatCompetence(v)}catch(e){var p=String(v||'').slice(0,7).split('-');return p.length===2?p[1]+'/'+p[0]:'—'}}
function refresh(){var sel=E('rh41-comp');if(sel){var cur=S.competencia&&S.competencia.id||'';sel.innerHTML=(S.competencias||[]).map(function(c){return '<option value="'+String(c.id).replace(/"/g,'&quot;')+'">'+comp(c.competencia)+'</option>'}).join('');if(cur)sel.value=cur;sel.onchange=async function(){var id=this.value;this.disabled=true;try{await selectCompetence(id);var base=E('competencia-select');if(base)base.value=id;refresh();if(typeof window.rhFitAllCardValues==='function')setTimeout(window.rhFitAllCardValues,40)}catch(err){try{toast(err.message||String(err),true)}catch(e){}}finally{this.disabled=false}}}var nav=document.querySelector('[data-view="relatorios"]');if(nav&&!nav.dataset.rh41a){nav.dataset.rh41a='1';nav.title='PDFs, Excel e guias gerenciais';nav.addEventListener('click',function(){setTimeout(refresh,80)})}}
function init(){refresh();setTimeout(refresh,700);document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab],.nav-item'))setTimeout(refresh,100)},true)}
window.RH_REPORT_CENTER_V41A=true;
init();
})();
