/* RH v40a — estabilidade do seletor de relatórios e refit por interação */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}
function comp(v){try{return formatCompetence(v)}catch(e){var p=String(v||'').slice(0,7).split('-');return p.length===2?p[1]+'/'+p[0]:'—'}}
function charges(){var e=S.competencia&&S.competencia.encargos||{},c=S.competencia||{};return[
  {key:'IRRF',base:n(e.base_irrf_mensal||c.resumo&&c.resumo.base_irrf),value:n(e.valor_total_irrf||e.valor_irrf_mensal||e.valor_irrf)},
  {key:'INSS',base:n(e.base_total_inss||c.resumo&&c.resumo.base_inss),value:n(e.total_inss)},
  {key:'PIS',base:n(e.base_pis||c.resumo&&c.resumo.base_inss),value:n(e.valor_pis)},
  {key:'FGTS',base:n(e.base_fgts||c.resumo&&c.resumo.base_fgts),value:n(e.valor_fgts||c.valor_fgts)}
]}
function refreshGuideValues(){charges().forEach(function(x){var b=document.querySelector('[data-rh40-guide="'+x.key+'"]');if(!b)return;var card=b.closest('.rh40-guide-card');if(!card)return;var strong=card.querySelector('strong'),small=card.querySelector('small');if(strong)strong.textContent=money(x.value);if(small)small.textContent='Base '+money(x.base)})}
function refreshSelect(){var sel=E('rh40-comp-select');if(!sel)return;var cur=S.competencia&&S.competencia.id||'';sel.innerHTML=(S.competencias||[]).map(function(c){return '<option value="'+String(c.id).replace(/"/g,'&quot;')+'">'+comp(c.competencia)+'</option>'}).join('');if(cur)sel.value=cur}
function bindSelect(){var sel=E('rh40-comp-select');if(!sel)return;sel.onchange=async function(){var id=this.value,oldTitle=this.title;this.disabled=true;this.title='Carregando competência...';try{await selectCompetence(id);var base=E('competencia-select');if(base)base.value=id;refreshSelect();refreshGuideValues();setTimeout(function(){if(typeof window.rhFitAllCardValues==='function')window.rhFitAllCardValues()},40)}catch(err){try{toast(err.message||String(err),true)}catch(e){}}finally{this.disabled=false;this.title=oldTitle||''}}}
function refit(){setTimeout(function(){if(typeof window.rhFitAllCardValues==='function')window.rhFitAllCardValues()},35)}
function init(){bindSelect();document.addEventListener('change',function(e){if(e.target&&e.target.closest&&e.target.closest('.app'))refit()},true);document.addEventListener('input',function(e){if(e.target&&e.target.closest&&e.target.closest('.app'))refit()},true);document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('.nav-item,[data-go],[data-plan-tab]'))refit()},true);setTimeout(function(){bindSelect();refreshSelect();refreshGuideValues();refit()},900)}
window.RH_V40A_STABILITY=true;
init();
})();
