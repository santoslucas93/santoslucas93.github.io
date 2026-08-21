/* RH v37 — quadro atual no planejamento + provisões estáveis + cards sem loop de reflow */
(function(){
'use strict';
var ST={ids:null,latest:null,loading:null,cache:new Map(),timer:0,scope:0,originalPeople:null};
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function money(v){try{return fmt(n(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}}
function parseMoney(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function d(v){if(!v)return null;var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x)?null:x}
function key(p){return String(p&&p.colaborador_id||p&&p.id||'')}
function inactiveStatus(v){return /demit|deslig|rescind|inativ|transferid/.test(String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())}
function anchor(){var a=(window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(S.competencia?[S.competencia]:[])).slice().sort(function(x,y){return String(x.competencia||'').localeCompare(String(y.competencia||''))}),c=a[a.length-1],x=d(c&&c.competencia);return x?new Date(x.getFullYear(),x.getMonth()+1,0,12):new Date()}
function rates(){var e=(S.competencia&&S.competencia.encargos)||{},b=n(e.base_total_inss);return{inss:b&&n(e.inss_empresa)>0?n(e.inss_empresa)/b:.20,rat:b&&n(e.rat)>0?n(e.rat)/b:.01,terc:b&&n(e.terceiros)>0?n(e.terceiros)/b:.058,fgts:.08,pis:b&&n(e.valor_pis)>0?n(e.valor_pis)/b:.01}}
function currentOnly(list){if(!ST.ids)return list||[];return (list||[]).filter(function(p){return ST.ids.has(key(p))})}
function beginScope(){if(!ST.ids||!window.S||!Array.isArray(S.pessoas))return;ST.scope++;if(ST.scope>1)return;ST.originalPeople=S.pessoas;S.pessoas=currentOnly(S.pessoas)}
function endScopeSoon(){if(!ST.ids||!window.S)return;setTimeout(function(){ST.scope=Math.max(0,ST.scope-1);if(ST.scope===0&&ST.originalPeople){S.pessoas=ST.originalPeople;ST.originalPeople=null}},0)}
function withActive(fn){beginScope();try{return fn()}finally{endScopeSoon()}}
async function loadActive(){
  if(ST.loading)return ST.loading;
  ST.loading=(async function(){
    var comps=await api('rh_competencias?select=id,competencia&order=competencia.desc&limit=1');
    var c=comps&&comps[0];if(!c)return null;
    var rows=await api('rh_folha_colaboradores?competencia_id=eq.'+encodeURIComponent(c.id)+'&select=colaborador_id,situacao_snapshot');
    var ids=new Set();(rows||[]).forEach(function(x){if(x.colaborador_id&&!inactiveStatus(x.situacao_snapshot))ids.add(String(x.colaborador_id))});
    ST.ids=ids;ST.latest={id:c.id,competencia:c.competencia,total:(rows||[]).length,ativos:ids.size};
    window.RH_CURRENT_ACTIVE_IDS=ids;window.RH_CURRENT_ACTIVE_META=ST.latest;
    return ST.latest;
  })().finally(function(){ST.loading=null});
  return ST.loading;
}
function ctx(id,a){var k=id+'|'+a.getFullYear()+'-'+String(a.getMonth()+1).padStart(2,'0');if(ST.cache.has(k))return ST.cache.get(k);if(typeof window.rhV34TerminationContext!=='function')return Promise.resolve(null);var p=Promise.resolve(window.rhV34TerminationContext(id,a));ST.cache.set(k,p);return p}
function base(c){return r2(n(c&&c.latest&&c.latest.salario)+(c&&c.recurring||[]).reduce(function(s,x){return s+n(x.valor)},0)+n(c&&c.variableAvg))}
function setKpi(p,label,val,small){Array.from(p.querySelectorAll('.kpi')).forEach(function(k){var s=k.querySelector('span'),b=k.querySelector('strong'),sm=k.querySelector('small');if(s&&b&&String(s.textContent||'').trim().toLowerCase()===label.toLowerCase()){var nv=money(val);if(b.textContent!==nv)b.textContent=nv;if(sm&&small&&sm.textContent!==small)sm.textContent=small}})}
function removeCcSummary(p){Array.from(p.querySelectorAll('article.table-panel')).forEach(function(article){var t=article.querySelector('table');if(t&&!t.classList.contains('rh26-wide'))article.remove()})}
function simplifyList(p,kind){
  removeCcSummary(p);var table=p.querySelector('table.rh26-wide');if(!table)return;table.classList.add('rh37-name-list');
  var article=table.closest('article.table-panel');if(article){var title=article.querySelector('.panel-head h2'),note=article.querySelector('.detail-note'),want=kind==='13'?'Colaboradores — provisão de 13º':'Colaboradores — provisão de férias';if(title&&title.textContent!==want)title.textContent=want;if(note&&note.textContent!=='Clique no colaborador para abrir a memória de cálculo completa.')note.textContent='Clique no colaborador para abrir a memória de cálculo completa.'}
  var wrap=table.closest('.table-wrap');if(wrap){wrap.classList.remove('rh30-scroll');var prev=wrap.previousElementSibling;if(prev&&prev.classList.contains('rh30-scroll-note'))prev.remove()}
  var thead=table.tHead;if(thead){Array.from(thead.querySelectorAll('.rh30-group-head')).forEach(function(x){x.remove()});var row=thead.rows[0];if(row&&row.cells[0]&&row.cells[0].textContent!=='Colaborador')row.cells[0].textContent='Colaborador'}
  Array.from(table.querySelectorAll('tbody tr.rh26-row')).forEach(function(tr){var first=tr.cells[0];if(!first)return;Array.from(first.querySelectorAll('small')).forEach(function(s){s.style.display='none'});first.title='Clique para ver a memória de cálculo'})
}
async function patch13(){
  var p=document.querySelector('[data-plan-pane="13"]');if(!p)return;var table=p.querySelector('table.rh26-wide');if(!table)return;var a=anchor(),rr=rates(),trs=Array.from(table.querySelectorAll('tbody tr.rh26-row'));
  trs.forEach(function(tr){if(ST.ids&&!ST.ids.has(String(tr.dataset.id||'')))tr.remove()});trs=Array.from(table.querySelectorAll('tbody tr.rh26-row'));
  if(typeof window.rhV34TerminationContext!=='function'){simplifyList(p,'13');return}
  var contexts=await Promise.all(trs.map(function(tr){return ctx(tr.dataset.id,a)})),rows=[];
  trs.forEach(function(tr,i){var c=contexts[i],b=base(c),td=tr.children;if(td.length<16)return;var av=parseInt(String(td[3].textContent||'0'),10)||0,prev=parseMoney(td[4].textContent),pm=av?b/12:0,current=b/12*av,pago=parseMoney(td[7].textContent),adi=parseMoney(td[8].textContent),aj=current-prev-pm,saldo=Math.max(0,current-pago-adi),ei=saldo*rr.inss,er=saldo*rr.rat,et=saldo*rr.terc,ef=saldo*rr.fgts,ep=saldo*rr.pis,enc=ei+er+et+ef+ep,total=saldo+enc;
    var vals=[[2,b],[4,prev],[5,pm],[6,aj],[10,ei],[11,er],[12,et],[13,ef],[14,ep]];vals.forEach(function(q){var nv=money(q[1]);if(td[q[0]].textContent!==nv)td[q[0]].textContent=nv});td[2].title='Base remuneratória: salário vigente + verbas recorrentes + média variável detectada';td[9].innerHTML='<b>'+money(saldo)+'</b>';td[15].innerHTML='<b>'+money(total)+'</b>';rows.push({prev:prev,pm:pm,aj:aj,pago:pago,adi:adi,saldo:saldo,ei:ei,er:er,et:et,ef:ef,ep:ep,enc:enc,total:total})
  });
  var th=table.querySelector('thead th:nth-child(3)');if(th&&th.textContent!=='Base remun.')th.textContent='Base remun.';
  var tf=table.querySelector('tfoot tr');if(tf&&tf.children.length>=16){var sum=function(k){return rows.reduce(function(s,x){return s+n(x[k])},0)};[[4,'prev'],[5,'pm'],[6,'aj'],[7,'pago'],[8,'adi'],[9,'saldo'],[10,'ei'],[11,'er'],[12,'et'],[13,'ef'],[14,'ep'],[15,'total']].forEach(function(q){tf.children[q[0]].innerHTML=(q[0]===9||q[0]===15?'<b>':'')+money(sum(q[1]))+(q[0]===9||q[0]===15?'</b>':'')})}
  setKpi(p,'Saldo provisionado',rows.reduce(function(s,x){return s+x.saldo},0),rows.length+' colaboradores ativos');setKpi(p,'Provisão do mês',rows.reduce(function(s,x){return s+x.pm},0));setKpi(p,'Encargos sobre saldo',rows.reduce(function(s,x){return s+x.enc},0));setKpi(p,'Custo provisionado',rows.reduce(function(s,x){return s+x.total},0));simplifyList(p,'13')
}
async function patchFerias(){
  var p=document.querySelector('[data-plan-pane="ferias"]');if(!p)return;var table=p.querySelector('table.rh26-wide');if(!table)return;var a=anchor(),rr=rates(),trs=Array.from(table.querySelectorAll('tbody tr.rh26-row'));
  trs.forEach(function(tr){if(ST.ids&&!ST.ids.has(String(tr.dataset.id||'')))tr.remove()});trs=Array.from(table.querySelectorAll('tbody tr.rh26-row'));
  if(typeof window.rhV34TerminationContext!=='function'){simplifyList(p,'ferias');return}
  var contexts=await Promise.all(trs.map(function(tr){return ctx(tr.dataset.id,a)})),rows=[];
  trs.forEach(function(tr,i){var c=contexts[i],b=base(c),td=tr.children;if(td.length<19)return;var av=parseInt(String(td[4].textContent||'0'),10)||0,prev=parseMoney(td[5].textContent),pm=b/12*4/3,fer=b/12*av,ter=fer/3,current=fer+ter,goz=parseMoney(td[10].textContent),ind=parseMoney(td[11].textContent),aj=current-prev-pm,saldo=Math.max(0,current-goz-ind),ei=saldo*rr.inss,er=saldo*rr.rat,et=saldo*rr.terc,ef=saldo*rr.fgts,ep=saldo*rr.pis,enc=ei+er+et+ef+ep,total=saldo+enc;
    [[5,prev],[6,pm],[7,aj],[8,fer],[9,ter],[13,ei],[14,er],[15,et],[16,ef],[17,ep]].forEach(function(q){var nv=money(q[1]);if(td[q[0]].textContent!==nv)td[q[0]].textContent=nv});td[12].innerHTML='<b>'+money(saldo)+'</b>';td[18].innerHTML='<b>'+money(total)+'</b>';rows.push({prev:prev,pm:pm,aj:aj,fer:fer,ter:ter,goz:goz,ind:ind,saldo:saldo,ei:ei,er:er,et:et,ef:ef,ep:ep,enc:enc,total:total})
  });
  var tf=table.querySelector('tfoot tr');if(tf&&tf.children.length>=19){var sum=function(k){return rows.reduce(function(s,x){return s+n(x[k])},0)};[[5,'prev'],[6,'pm'],[7,'aj'],[8,'fer'],[9,'ter'],[10,'goz'],[11,'ind'],[12,'saldo'],[13,'ei'],[14,'er'],[15,'et'],[16,'ef'],[17,'ep'],[18,'total']].forEach(function(q){tf.children[q[0]].innerHTML=(q[0]===12||q[0]===18?'<b>':'')+money(sum(q[1]))+(q[0]===12||q[0]===18?'</b>':'')})}
  setKpi(p,'Saldo provisionado',rows.reduce(function(s,x){return s+x.saldo},0),rows.length+' colaboradores ativos');setKpi(p,'Provisão do mês',rows.reduce(function(s,x){return s+x.pm},0));setKpi(p,'Encargos sobre saldo',rows.reduce(function(s,x){return s+x.enc},0));setKpi(p,'Custo provisionado',rows.reduce(function(s,x){return s+x.total},0));simplifyList(p,'ferias')
}
function activeNote(){var p=E('page-planejamento');if(!p||!ST.latest)return;var w=p.querySelector('.rh-plan-warning');if(!w)return;var x=E('rh37-active-note');var comp=String(ST.latest.competencia||'').slice(0,7).split('-').reverse().join('/'),txt='Quadro atual: '+ST.latest.ativos+' colaboradores ativos na competência '+comp+'. Desligados não entram em 13º, férias, próxima folha ou rescisões.';if(!x){x=document.createElement('span');x.id='rh37-active-note';x.className='rh37-active-note';w.appendChild(x)}if(x.textContent!==txt)x.textContent=txt}
function style(){if(E('_rh37'))return;var s=document.createElement('style');s.id='_rh37';s.textContent='\
#page-planejamento table.rh37-name-list{min-width:0!important;width:100%!important;table-layout:auto!important;border-collapse:separate!important;border-spacing:0!important}\
#page-planejamento table.rh37-name-list thead th:not(:first-child),#page-planejamento table.rh37-name-list tbody td:not(:first-child),#page-planejamento table.rh37-name-list tfoot{display:none!important}\
#page-planejamento table.rh37-name-list thead th:first-child{position:static!important;width:100%!important;min-width:0!important;max-width:none!important;padding:11px 18px!important;background:var(--surface-2)!important;box-shadow:none!important;text-align:left!important}\
#page-planejamento table.rh37-name-list tbody td:first-child{position:relative!important;width:100%!important;min-width:0!important;max-width:none!important;padding:15px 48px 15px 18px!important;background:transparent!important;box-shadow:none!important;white-space:normal!important}\
#page-planejamento table.rh37-name-list tbody td:first-child b{font-size:.88rem!important;line-height:1.2!important;display:block!important;color:var(--text)!important}\
#page-planejamento table.rh37-name-list tbody td:first-child small{display:none!important}\
#page-planejamento table.rh37-name-list tbody tr{cursor:pointer!important}#page-planejamento table.rh37-name-list tbody tr:nth-child(even) td:first-child{background:color-mix(in srgb,var(--surface-2) 48%,transparent)!important}#page-planejamento table.rh37-name-list tbody tr:hover td:first-child{background:color-mix(in srgb,var(--gold) 8%,var(--surface))!important}\
#page-planejamento table.rh37-name-list tbody td:first-child:after{content:"›";position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:1.5rem;font-weight:900;color:var(--gold)}\
#page-planejamento .table-wrap:has(table.rh37-name-list){overflow:visible!important;padding-bottom:0!important}\
#rh37-active-note{display:block;margin-left:10px;color:var(--text);font-weight:700}\
.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#custo-real-kpis strong,#payroll-kpis strong,#charges-kpis strong,#movement-kpis strong{animation:none!important;transition:none!important;transform:none!important;font-variant-numeric:tabular-nums!important}\
';document.head.appendChild(s)}
function schedulePatch(){clearTimeout(ST.timer);ST.timer=setTimeout(function(){activeNote();Promise.all([patch13(),patchFerias()]).then(function(){if(typeof window.rhFitAllCardValues==='function')window.rhFitAllCardValues()}).catch(function(e){console.warn('RH v37:',e)})},100)}
function rerenderCurrent(){var p=E('page-planejamento');if(!p)return;withActive(function(){var b=p.querySelector('[data-plan-tab].active');if(b)b.click();else if(typeof window.rhRenderPlanning==='function')window.rhRenderPlanning()});schedulePatch()}
function capture(e){var p=e.target&&e.target.closest&&e.target.closest('#page-planejamento');if(!p||!ST.ids)return;beginScope();endScopeSoon();setTimeout(schedulePatch,20)}
function installHooks(){document.addEventListener('click',capture,true);document.addEventListener('change',capture,true);document.addEventListener('input',capture,true);var old=window.renderAll;if(typeof old==='function'&&!old._rh37){var wrapped=function(){var r=old.apply(this,arguments);setTimeout(function(){if(E('page-planejamento')&&E('page-planejamento').classList.contains('active'))rerenderCurrent();else schedulePatch()},0);return r};wrapped._rh37=1;window.renderAll=wrapped}}
async function init(){style();installHooks();try{await loadActive();activeNote();rerenderCurrent()}catch(e){console.warn('RH v37 ativos:',e)}schedulePatch()}
window.rhV37LoadActiveRoster=loadActive;window.rhV37PatchPlanning=schedulePatch;window.rhV37CurrentOnly=currentOnly;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
