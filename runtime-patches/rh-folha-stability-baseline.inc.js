/* RH & Folha — stability baseline: quadro atual único, provisões e invariantes aprovados */
(function(){
'use strict';
var B={ids:null,names:new Set(),meta:null,loading:null,ctx:new Map()};
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function inactive(v){return /demit|deslig|rescind|inativ|transferid/.test(norm(v))}
function key(p){return String(p&&p.colaborador_id||p&&p.id||'')}
function d(v){if(!v)return null;var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x.getTime())?null:x}
function money(v){try{return fmt(n(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}}
function parseMoney(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function anchor(){var a=(window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(S.competencia?[S.competencia]:[])).slice().sort(function(x,y){return String(x.competencia||'').localeCompare(String(y.competencia||''))}),c=a[a.length-1],x=d(c&&c.competencia);return x?new Date(x.getFullYear(),x.getMonth()+1,0,12):new Date()}
function rates(){var e=(S.competencia&&S.competencia.encargos)||{},b=n(e.base_total_inss);return{inss:b&&n(e.inss_empresa)>0?n(e.inss_empresa)/b:.20,rat:b&&n(e.rat)>0?n(e.rat)/b:.01,terc:b&&n(e.terceiros)>0?n(e.terceiros)/b:.058,fgts:.08,pis:b&&n(e.valor_pis)>0?n(e.valor_pis)/b:.01}}
async function rhRosterLoad(force){
  if(B.loading)return B.loading;if(B.ids&&!force)return B.meta;
  B.loading=(async function(){
    var comps=await api('rh_competencias?select=id,competencia&order=competencia.desc&limit=1'),c=comps&&comps[0];if(!c)return null;
    var rows=await api('rh_folha_colaboradores?competencia_id=eq.'+encodeURIComponent(c.id)+'&select=colaborador_id,situacao_snapshot');
    var ids=new Set();(rows||[]).forEach(function(x){if(x.colaborador_id&&!inactive(x.situacao_snapshot))ids.add(String(x.colaborador_id))});
    var names=new Set();(S.colaboradores||[]).forEach(function(p){if(ids.has(String(p.id)))names.add(norm(p.nome))});(S.pessoas||[]).forEach(function(p){if(ids.has(key(p)))names.add(norm(p.nome))});
    B.ids=ids;B.names=names;B.meta={id:c.id,competencia:c.competencia,total:(rows||[]).length,ativos:ids.size};
    window.RH_CURRENT_ACTIVE_IDS=ids;window.RH_CURRENT_ACTIVE_META=B.meta;return B.meta;
  })().finally(function(){B.loading=null});return B.loading;
}
function rhRosterActiveIds(){return B.ids||window.RH_CURRENT_ACTIVE_IDS||new Set()}
function rhRosterMeta(){return B.meta||window.RH_CURRENT_ACTIVE_META||null}
function rhRosterIsActive(p){if(!B.ids)return true;var id=key(p);if(id)return B.ids.has(id);return B.names.has(norm(p&&p.nome))}
function rhRosterNameIsActive(name){return !B.ids||B.names.has(norm(name))}
function rhRosterFilter(list){return (list||[]).filter(rhRosterIsActive)}
function rhRosterInvalidate(){B.ids=null;B.names=new Set();B.meta=null;B.ctx.clear()}
function ctx(id,a){var k=id+'|'+a.getFullYear()+'-'+String(a.getMonth()+1).padStart(2,'0');if(B.ctx.has(k))return B.ctx.get(k);if(typeof window.rhV34TerminationContext!=='function')return Promise.resolve(null);var p=Promise.resolve(window.rhV34TerminationContext(id,a));B.ctx.set(k,p);return p}
function base(c){return r2(n(c&&c.latest&&c.latest.salario)+(c&&c.recurring||[]).reduce(function(s,x){return s+n(x.valor)},0)+n(c&&c.variableAvg))}
function setKpi(p,label,val,small){Array.from(p.querySelectorAll('.kpi')).forEach(function(k){var s=k.querySelector('span'),b=k.querySelector('strong'),sm=k.querySelector('small');if(s&&b&&norm(s.textContent)===norm(label)){var nv=money(val);if(b.textContent!==nv)b.textContent=nv;if(sm&&small&&sm.textContent!==small)sm.textContent=small}})}
async function refresh13(){
  var p=document.querySelector('[data-plan-pane="13"]'),table=p&&p.querySelector('table.rh26-wide');if(!table||!B.ids)return;
  var a=anchor(),rr=rates(),trs=Array.from(table.querySelectorAll('tbody tr.rh26-row'));trs.forEach(function(tr){if(!B.ids.has(String(tr.dataset.id||'')))tr.remove()});trs=Array.from(table.querySelectorAll('tbody tr.rh26-row'));
  if(typeof window.rhV34TerminationContext!=='function')return;
  var contexts=await Promise.all(trs.map(function(tr){return ctx(tr.dataset.id,a)})),rows=[];
  trs.forEach(function(tr,i){var c=contexts[i],b=base(c),td=tr.children;if(td.length<16)return;var av=parseInt(String(td[3].textContent||'0'),10)||0,prev=parseMoney(td[4].textContent),pm=av?b/12:0,current=b/12*av,pago=parseMoney(td[7].textContent),adi=parseMoney(td[8].textContent),aj=current-prev-pm,saldo=Math.max(0,current-pago-adi),ei=saldo*rr.inss,er=saldo*rr.rat,et=saldo*rr.terc,ef=saldo*rr.fgts,ep=saldo*rr.pis,enc=ei+er+et+ef+ep,total=saldo+enc;
    [[2,b],[4,prev],[5,pm],[6,aj],[10,ei],[11,er],[12,et],[13,ef],[14,ep]].forEach(function(q){td[q[0]].textContent=money(q[1])});td[9].innerHTML='<b>'+money(saldo)+'</b>';td[15].innerHTML='<b>'+money(total)+'</b>';rows.push({pm:pm,saldo:saldo,enc:enc,total:total})
  });
  setKpi(p,'Saldo provisionado',rows.reduce(function(s,x){return s+x.saldo},0),rows.length+' colaboradores ativos');setKpi(p,'Provisão do mês',rows.reduce(function(s,x){return s+x.pm},0));setKpi(p,'Encargos sobre saldo',rows.reduce(function(s,x){return s+x.enc},0));setKpi(p,'Custo provisionado',rows.reduce(function(s,x){return s+x.total},0));
}
async function refreshFerias(){
  var p=document.querySelector('[data-plan-pane="ferias"]'),table=p&&p.querySelector('table.rh26-wide');if(!table||!B.ids)return;
  var a=anchor(),rr=rates(),trs=Array.from(table.querySelectorAll('tbody tr.rh26-row'));trs.forEach(function(tr){if(!B.ids.has(String(tr.dataset.id||'')))tr.remove()});trs=Array.from(table.querySelectorAll('tbody tr.rh26-row'));
  if(typeof window.rhV34TerminationContext!=='function')return;
  var contexts=await Promise.all(trs.map(function(tr){return ctx(tr.dataset.id,a)})),rows=[];
  trs.forEach(function(tr,i){var c=contexts[i],b=base(c),td=tr.children;if(td.length<19)return;var av=parseInt(String(td[4].textContent||'0'),10)||0,prev=parseMoney(td[5].textContent),pm=b/12*4/3,fer=b/12*av,ter=fer/3,current=fer+ter,goz=parseMoney(td[10].textContent),ind=parseMoney(td[11].textContent),aj=current-prev-pm,saldo=Math.max(0,current-goz-ind),ei=saldo*rr.inss,er=saldo*rr.rat,et=saldo*rr.terc,ef=saldo*rr.fgts,ep=saldo*rr.pis,enc=ei+er+et+ef+ep,total=saldo+enc;
    [[5,prev],[6,pm],[7,aj],[8,fer],[9,ter],[13,ei],[14,er],[15,et],[16,ef],[17,ep]].forEach(function(q){td[q[0]].textContent=money(q[1])});td[12].innerHTML='<b>'+money(saldo)+'</b>';td[18].innerHTML='<b>'+money(total)+'</b>';rows.push({pm:pm,saldo:saldo,enc:enc,total:total})
  });
  setKpi(p,'Saldo provisionado',rows.reduce(function(s,x){return s+x.saldo},0),rows.length+' colaboradores ativos');setKpi(p,'Provisão do mês',rows.reduce(function(s,x){return s+x.pm},0));setKpi(p,'Encargos sobre saldo',rows.reduce(function(s,x){return s+x.enc},0));setKpi(p,'Custo provisionado',rows.reduce(function(s,x){return s+x.total},0));
}
async function rhProvisionRefresh(){await rhRosterLoad(false);await Promise.all([refresh13(),refreshFerias()]);return B.meta}
function rhBaselineCheck(){
  var page=E('page-planejamento'),viol=[];if(!page)return{ok:true,violations:[],scope:'fora-do-planejamento'};
  Array.from(page.querySelectorAll('[data-plan-pane="13"] article.table-panel,[data-plan-pane="ferias"] article.table-panel')).forEach(function(a){var t=norm((a.querySelector('h2')||{}).textContent),k=norm((a.querySelector('.panel-kicker')||{}).textContent);if(t.indexOf('centro de custo')>=0||k==='resumo executivo')viol.push('Resumo por centro de custo reapareceu')});
  if(B.ids){Array.from(page.querySelectorAll('[data-plan-pane="13"] tbody tr[data-id],[data-plan-pane="ferias"] tbody tr[data-id]')).forEach(function(tr){if(!B.ids.has(String(tr.dataset.id||'')))viol.push('Desligado presente em provisão')});Array.from(page.querySelectorAll('[data-plan-pane="rescisao"] select option')).forEach(function(o){if(o.value&&!B.ids.has(String(o.value))&&/^[-0-9a-f]{8,}$/i.test(String(o.value)))viol.push('Desligado presente em rescisão')})}
  var out={ok:viol.length===0,violations:Array.from(new Set(viol)),meta:B.meta,checkedAt:new Date().toISOString()};window.RH_BASELINE_LAST_CHECK=out;return out
}
function style(){if(E('_rh_baseline'))return;var s=document.createElement('style');s.id='_rh_baseline';s.textContent='.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#custo-real-kpis strong,#payroll-kpis strong,#charges-kpis strong,#movement-kpis strong{animation:none!important;transition:none!important;transform:none!important;font-variant-numeric:tabular-nums!important}';document.head.appendChild(s)}
function init(){style();rhRosterLoad(false).catch(function(e){console.warn('RH baseline roster:',e)})}
window.rhRosterLoad=rhRosterLoad;window.rhRosterActiveIds=rhRosterActiveIds;window.rhRosterMeta=rhRosterMeta;window.rhRosterIsActive=rhRosterIsActive;window.rhRosterNameIsActive=rhRosterNameIsActive;window.rhRosterFilter=rhRosterFilter;window.rhRosterInvalidate=rhRosterInvalidate;window.rhProvisionRefresh=rhProvisionRefresh;window.rhBaselineCheck=rhBaselineCheck;
window.RH_STABILITY_BASELINE='2026-08-21-v1';
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
