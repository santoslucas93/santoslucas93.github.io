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
/* RH & Folha — hotfix v3: drill-down responsivo, totais e regras de custo */
S.benefitValidations=[];

function rhFixTextValue(v){var s=String(v==null?'':v),map={'Ã¡':'á','Ã ':'à','Ã¢':'â','Ã£':'ã','Ã©':'é','Ãª':'ê','Ã­':'í','Ã³':'ó','Ã´':'ô','Ãµ':'õ','Ãº':'ú','Ã§':'ç','Ã':'Á','Ã‰':'É','Ã“':'Ó','Ãš':'Ú','Ã‡':'Ç','â':'—','â':'–','â¦':'…','â¶':'▶','Â·':'·','Â ':' '};Object.keys(map).forEach(function(k){s=s.split(k).join(map[k]);});return s;}
function rhSweepText(root){try{var w=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT,null),n;while((n=w.nextNode())){var f=rhFixTextValue(n.nodeValue);if(f!==n.nodeValue)n.nodeValue=f;}}catch(e){}}
function rhDeptKey(v){return cleanSearch(rhFixTextValue(v||'')).replace(/\s+/g,' ').trim();}
function rhPersonBenefit(p){if(!S.beneficios||!S.beneficios.length)return null;return S.beneficios.find(function(b){return String(b.colaborador_id||'')===String(p.colaborador_id||'')||(b.cpf_mascarado&&p.cpf_mascarado&&String(b.cpf_mascarado)===String(p.cpf_mascarado))||(b.matricula&&p.matricula&&String(b.matricula)===String(p.matricula));})||null;}
function rhAlloc(rows,field,total){var base=rows.reduce(function(a,p){return a+(Number(p[field])||0);},0),target=Math.round((Number(total)||0)*100),out=rows.map(function(p){return {p:p,cents:base>0?Math.round(target*((Number(p[field])||0)/base)):0};}),used=out.reduce(function(a,x){return a+x.cents;},0);if(out.length)out[0].cents+=target-used;return out;}
function rhEmployerCharges(p){var e=(S.competencia&&S.competencia.encargos)||{},items=[],total=0,fgts=Number(p.valor_fgts)||0,baseInd=Number(p.base_inss)||0,baseRateio=S.pessoas.reduce(function(a,x){return a+(Number(x.base_inss)||0);},0),baseTotal=Number(e.base_total_inss)||0;if(fgts){items.push(['FGTS',fgts,'exato']);total+=fgts;}if(baseRateio>0&&baseInd>0){var sh=baseInd/baseRateio,pat=baseTotal*0.20,rat=Number(e.rat)||(baseTotal*0.01),ter=Number(e.terceiros)||(baseTotal*0.058);[['INSS patronal',pat],['RAT',rat],['Terceiros',ter]].forEach(function(x){var v=x[1]*sh;if(v){items.push([x[0],v,'rateado']);total+=v;}});}return {itens:items,total:total};}
custoEmpresa=function(p){var items=[],total=0,prov=Number(p.proventos)||0;items.push(['Proventos brutos',prov,'']);total+=prov;var enc=rhEmployerCharges(p);enc.itens.forEach(function(x){items.push(x);total+=x[1];});var b=rhPersonBenefit(p);if(b){[['Seguro de Vida',b.seguro_vida],['Assistência Médica',b.assistencia_medica||b.assist_medica],['VR / VA / Cesta Básica',b.vr_caixa],['Vale Transporte',b.vale_transporte]].forEach(function(x){var v=Number(x[1])||0;if(v>0){items.push([x[0],v,'benefício']);total+=v;}});}return {itens:items,total:total};};

function ensureRhDetailModal(){if($('rh-detail-modal'))return;var m=document.createElement('div');m.id='rh-detail-modal';m.className='modal';m.hidden=true;m.innerHTML='<div class="modal-backdrop" data-close-rh-detail></div><article class="modal-card rh-detail-card" role="dialog"><div class="modal-head"><div><span class="eyebrow rh-detail-kicker">DETALHAMENTO</span><h2 class="rh-detail-title">Composição</h2></div><button class="modal-close" data-close-rh-detail>×</button></div><div class="rh-detail-body"></div></article>';document.body.appendChild(m);m.querySelectorAll('[data-close-rh-detail]').forEach(function(b){b.onclick=function(){m.hidden=true;};});}
function openGenericDetail(titleText,kicker,html){ensureRhDetailModal();var m=$('rh-detail-modal');m.querySelector('.rh-detail-title').textContent=titleText;m.querySelector('.rh-detail-kicker').textContent=kicker||'DETALHAMENTO';m.querySelector('.rh-detail-body').innerHTML=html;m.hidden=false;rhSweepText(m);}
function rhFoot(cols){return '<tfoot><tr class="detail-total-row">'+cols.map(function(c,i){return '<td class="'+(i?'money':'')+'">'+c+'</td>';}).join('')+'</tr></tfoot>';}

function openMetricBreakdown(metric){var labels={proventos:'Proventos',descontos:'Descontos',liquido:'Líquido'},rows=S.pessoas.filter(function(p){return Number(p[metric])!==0;}).sort(function(a,b){return (Number(b[metric])||0)-(Number(a[metric])||0);}),total=rows.reduce(function(a,p){return a+(Number(p[metric])||0);},0);openGenericDetail(labels[metric]||metric,'COMPOSIÇÃO POR COLABORADOR','<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Valor</th></tr></thead><tbody>'+rows.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td>'+esc(departmentName(p.departamento))+'</td><td class="money">'+fmt(p[metric])+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL','',fmt(total)])+'</table>');}
function openVinculoBreakdown(kind){var rows=S.pessoas.filter(function(p){var v=cleanSearch(p.vinculo||'');if(kind==='CLT')return /celet|clt/.test(v);if(kind==='Estagiários')return /estagi/.test(v);return !/celet|clt|estagi/.test(v);}),total=rows.reduce(function(a,p){return a+(Number(p.liquido)||0);},0);openGenericDetail(kind,'COLABORADORES POR VÍNCULO','<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Líquido</th></tr></thead><tbody>'+rows.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td>'+esc(departmentName(p.departamento))+'</td><td class="money">'+fmt(p.liquido)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL ('+rows.length+' pessoas)','',fmt(total)])+'</table>');}
function openRubricBreakdown(x){if(!x)return;var rows=[];S.pessoas.forEach(function(p){var v=(p.lancamentos||[]).filter(function(l){return String(l.rubrica_codigo||'')===String(x.codigo||'')&&String(l.rubrica_nome||'')===String(x.nome||'')&&String(l.tipo||'')===String(x.tipo||'');}).reduce(function(a,l){return a+(Number(l.valor)||0);},0);if(v)rows.push({nome:p.nome,dep:departmentName(p.departamento),valor:v});});rows.sort(function(a,b){return b.valor-a.valor;});var total=rows.reduce(function(a,r){return a+r.valor;},0);openGenericDetail(x.nome||'Rubrica','COMPOSIÇÃO DA RUBRICA',rows.length?'<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Valor</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.nome)+'</td><td>'+esc(r.dep)+'</td><td class="money">'+fmt(r.valor)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL','',fmt(total)])+'</table>':'<p class="detail-empty">Sem composição individual disponível.</p>');}
function openDepartmentBreakdown(nome){var key=rhDeptKey(nome),rows=S.pessoas.filter(function(p){return rhDeptKey(departmentName(p.departamento))===key;}).sort(function(a,b){return (Number(b.proventos)||0)-(Number(a.proventos)||0);}),t={p:0,d:0,l:0};rows.forEach(function(p){t.p+=Number(p.proventos)||0;t.d+=Number(p.descontos)||0;t.l+=Number(p.liquido)||0;});openGenericDetail(nome,'COMPOSIÇÃO DO DEPARTAMENTO',rows.length?'<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th class="money">Proventos</th><th class="money">Descontos</th><th class="money">Líquido</th></tr></thead><tbody>'+rows.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.descontos)+'</td><td class="money">'+fmt(p.liquido)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL',fmt(t.p),fmt(t.d),fmt(t.l)])+'</table>':'<p class="detail-empty">Nenhum colaborador encontrado para este departamento.</p>');}

openInssBreakdown=function(){var modal=$('inss-modal');if(!modal)return;var e=(S.competencia&&S.competencia.encargos)||{},base=Number(e.base_total_inss)||0,totalInss=Number(e.total_inss)||0,pat=base*0.20,rat=Number(e.rat)||(base*0.01),ter=Number(e.terceiros)||(base*0.058),ret=Math.max(0,totalInss-pat-rat-ter),rows=S.pessoas.filter(function(p){return Number(p.base_inss)>0;}),baseRateio=rows.reduce(function(a,p){return a+(Number(p.base_inss)||0);},0),tp=0,tr=0,tt=0;var body=rows.map(function(p){var sh=baseRateio>0?(Number(p.base_inss)||0)/baseRateio:0,pp=pat*sh,rr=rat*sh,te=ter*sh;tp+=pp;tr+=rr;tt+=te;return '<tr><td>'+esc(p.nome)+'</td><td class="money">'+fmt(p.base_inss)+'</td><td class="money">'+fmt(pp)+'</td><td class="money">'+fmt(rr)+'</td><td class="money">'+fmt(te)+'</td></tr>';}).join('');modal.querySelector('.im-total-inss').textContent=fmt(totalInss);modal.querySelector('.im-base').textContent=fmt(base);modal.querySelector('.im-body').innerHTML=[['INSS retido (colaboradores)',ret,'empregados'],['INSS patronal (20% da base)',pat,'empresa'],['RAT (1% da base)',rat,'empresa'],['Terceiros — SESC/SENAI/etc. (5,8%)',ter,'empresa']].map(function(it){return '<div class="ep-row"><span>'+esc(it[0])+'</span><small class="ep-tag">'+it[2]+'</small><strong>'+fmt(it[1])+'</strong></div>';}).join('')+'<div class="ep-row ep-total"><span><b>Total INSS</b></span><strong>'+fmt(totalInss)+'</strong></div><details><summary class="detail-summary-toggle">▶ INSS por colaborador ('+rows.length+')</summary><table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th class="money">Base</th><th class="money">Patronal</th><th class="money">RAT</th><th class="money">Terceiros</th></tr></thead><tbody>'+body+'</tbody>'+rhFoot(['TOTAL',fmt(baseRateio),fmt(tp),fmt(tr),fmt(tt)])+'</table></details>';modal.hidden=false;rhSweepText(modal);};window._openInss=function(){openInssBreakdown();};
openFgtsBreakdown=function(){var modal=$('fgts-modal');if(!modal)return;var e=(S.competencia&&S.competencia.encargos)||{},total=Number(e.valor_fgts||S.competencia.valor_fgts)||0,base=Number(e.base_fgts||S.competencia.base_fgts)||0,rows=S.pessoas.filter(function(p){return Number(p.valor_fgts)>0;}),tb=rows.reduce(function(a,p){return a+(Number(p.base_fgts)||0);},0),tv=rows.reduce(function(a,p){return a+(Number(p.valor_fgts)||0);},0);modal.querySelector('.fgts-total').textContent=fmt(total);modal.querySelector('.fgts-base').textContent=fmt(base);modal.querySelector('.fgts-body').innerHTML='<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th class="money">Base FGTS</th><th class="money">FGTS pago</th></tr></thead><tbody>'+rows.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td class="money">'+fmt(p.base_fgts)+'</td><td class="money">'+fmt(p.valor_fgts)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL',fmt(tb),fmt(tv)])+'</table>';modal.hidden=false;};window._openFgts=function(){openFgtsBreakdown();};
function openPisBreakdown(){var e=(S.competencia&&S.competencia.encargos)||{},total=Number(e.valor_pis)||0,base=Number(e.base_pis)||0,rows=S.pessoas.filter(function(p){return Number(p.base_fgts)>0;}),a=rhAlloc(rows,'base_fgts',total),tb=rows.reduce(function(s,p){return s+(Number(p.base_fgts)||0);},0);openGenericDetail('PIS por Colaborador','DETALHAMENTO PIS','<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th class="money">Base PIS</th><th class="money">PIS atribuído</th></tr></thead><tbody>'+a.map(function(x){return '<tr><td>'+esc(x.p.nome)+'</td><td class="money">'+fmt(x.p.base_fgts)+'</td><td class="money">'+fmt(x.cents/100)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL',fmt(base||tb),fmt(total)])+'</table>');}window._openPis=function(){openPisBreakdown();};
openIrrfBreakdown=function(){var modal=$('irrf-modal');if(!modal)return;var e=(S.competencia&&S.competencia.encargos)||{},official=Number(e.valor_irrf_folha||e.valor_irrf||S.competencia.valor_irrf)||0,rows=S.pessoas.filter(function(p){return Number(p.base_irrf)>0;}).map(function(p){var b=Number(p.base_irrf)||0,c=calcIrrf(b),f=Number(p.valor_irrf)||0;return {n:p.nome,b:b,c:c,f:f,d:c-f};}),tb=0,tc=0,tf=0,td=0;rows.forEach(function(r){tb+=r.b;tc+=r.c;tf+=r.f;td+=r.d;});modal.querySelector('.irrf-total-folha').textContent=fmt(official);modal.querySelector('.irrf-total-calc').textContent=fmt(tc);modal.querySelector('.irrf-body').innerHTML='<div class="irrf-official-note">Valor oficial da folha. RPA permanece fora desta etapa.</div><table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th class="money">Base IRRF</th><th class="money">Calculado</th><th class="money">Folha</th><th class="money">Dif.</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.n)+'</td><td class="money">'+fmt(r.b)+'</td><td class="money">'+fmt(r.c)+'</td><td class="money">'+fmt(r.f)+'</td><td class="money">'+fmt(r.d)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL',fmt(tb),fmt(tc),fmt(tf),fmt(td)])+'</table>';modal.hidden=false;};window._openIrrf=function(){openIrrfBreakdown();};

function openEncargosPopup(id){var p=S.pessoas.find(function(x){return x.id===id;});if(!p)return;var c=rhEmployerCharges(p),m=$('encargos-popup');if(!m)return;m.querySelector('.ep-title').textContent=p.nome;m.querySelector('.ep-body').innerHTML=c.itens.map(function(it){return '<div class="ep-row"><span>'+esc(it[0])+'</span><small class="ep-tag">'+esc(it[2])+'</small><strong>'+fmt(it[1])+'</strong></div>';}).join('')+'<div class="ep-row ep-total"><span><b>Total encargos</b></span><strong>'+fmt(c.total)+'</strong></div>';m.hidden=false;}
renderPeople=function(){var q=cleanSearch($('employee-search').value||''),arr=filteredPessoas().filter(function(p){return !q||cleanSearch([p.nome,p.matricula,p.cargo,p.departamento].join(' ')).indexOf(q)>=0;});$('employee-rows').innerHTML=arr.length?arr.map(function(p){var c=rhEmployerCharges(p);return '<tr><td><div class="row-person"><span class="avatar">'+esc(initials(p.nome))+'</span><span><b class="link-name" data-person="'+esc(p.id)+'">'+esc(p.nome)+'</b><small>'+esc(p.cargo||p.cpf_mascarado||'')+'</small></span></div></td><td>'+esc(p.matricula||'—')+'</td><td>'+esc(p.vinculo||'—')+'</td><td>'+esc(departmentName(p.departamento))+'</td><td><span class="status '+(/demit/i.test(p.situacao||'')?'danger':'success')+'">'+esc(p.situacao||'—')+'</span></td><td class="money">'+fmt(p.proventos)+'</td><td class="money"><button class="detail-button enc-btn" data-encargos="'+esc(p.id)+'">'+fmt(c.total)+'</button></td><td class="money"><b>'+fmt(p.liquido)+'</b></td></tr>';}).join(''):emptyRow(8,'Nenhum registro individual disponível para este perfil.');bindPersonButtons();bindEncargosButtons();};

renderRubrics=function(){var a=rubricGroups();$('rubric-rows').innerHTML=a.length?a.map(function(x,i){return '<tr class="detail-clickable" data-rubric-index="'+i+'"><td>'+esc(x.codigo||'—')+'</td><td><b>'+esc(rhFixTextValue(x.nome))+'</b><small class="click-hint">Clique para ver a composição</small></td><td><span class="status">'+esc(x.tipo)+'</span></td><td class="money">'+fmt(x.valor)+'</td></tr>';}).join(''):emptyRow(4,'Rubricas indisponíveis.');document.querySelectorAll('[data-rubric-index]').forEach(function(tr){tr.onclick=function(){openRubricBreakdown(a[Number(tr.dataset.rubricIndex)]);};});};
renderDepartments=function(){var a=departments();$('department-rows').innerHTML=a.length?a.map(function(x,i){return '<tr class="detail-clickable" data-dept-index="'+i+'"><td><b>'+esc(x.nome)+'</b><small class="click-hint">Clique para ver a composição</small></td><td class="money">'+fmt(x.proventos)+'</td><td class="money">'+fmt(x.descontos)+'</td><td class="money">'+fmt(x.liquido)+'</td></tr>';}).join(''):emptyRow(4,'Sem rateio por departamento.');document.querySelectorAll('[data-dept-index]').forEach(function(tr){tr.onclick=function(){var x=a[Number(tr.dataset.deptIndex)];if(x)openDepartmentBreakdown(x.nome);};});};
chargeData=function(){var e=S.competencia&&S.competencia.encargos||{};return [['INSS total',e.total_inss],['FGTS',e.valor_fgts||S.competencia.valor_fgts],['PIS',e.valor_pis],['IRRF folha',e.valor_irrf_folha||e.valor_irrf]];};
renderCharges=function(){var a=chargeData(),total=a.reduce(function(s,x){return s+(Number(x[1])||0);},0),handlers={'INSS total':window._openInss,'FGTS':window._openFgts,'PIS':window._openPis,'IRRF folha':window._openIrrf};$('charge-list').innerHTML=a.map(function(x,i){return '<button class="metric-row clickable" data-charge="'+i+'"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>clique para detalhar</small></button>';}).join('')+'<div class="metric-row"><span><b>Total recolhimentos</b></span><strong>'+fmt(total)+'</strong></div>';$('charges-kpis').innerHTML=a.map(function(x,i){return '<button class="kpi clickable" data-charge="'+i+'"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>clique para detalhar</small></button>';}).join('')+'<div class="kpi featured"><span>Total recolhimentos</span><strong>'+fmt(total)+'</strong></div>';document.querySelectorAll('[data-charge]').forEach(function(b){b.onclick=function(){var fn=handlers[a[Number(b.dataset.charge)][0]];if(fn)fn();};});};
renderCharts=function(){if(!S.competencia||!window.Chart)return;var c=chartColors(),d=departments(),r=S.competencia.resumo||{},rub=rubricGroups().slice(0,10),charges=chargeData(),fp=filteredPessoas(),fdepts=fp.length&&fp.length<S.pessoas.length?(function(){var m={};fp.forEach(function(p){var k=departmentName(p.departamento);if(!m[k])m[k]={nome:k,liquido:0,proventos:0,descontos:0};m[k].liquido+=Number(p.liquido)||0;m[k].proventos+=Number(p.proventos)||0;m[k].descontos+=Number(p.descontos)||0;});return Object.keys(m).map(function(k){return m[k];});})():d;chart('chart-composicao','bar',{labels:['Proventos','Descontos','Líquido'],datasets:[{label:'Valor',data:[S.competencia.proventos,S.competencia.descontos,S.competencia.liquido],backgroundColor:[c.gold,c.red,c.emerald]}]},{plugins:{legend:{display:false}}},function(e,x){if(x.length)openMetricBreakdown(['proventos','descontos','liquido'][x[0].index]);});chart('chart-departamentos','bar',{labels:fdepts.map(function(x){return x.nome;}),datasets:[{label:'Líquido',data:fdepts.map(function(x){return x.liquido;}),backgroundColor:c.emerald}]},{indexAxis:'y',plugins:{legend:{display:false}}},function(e,x){if(x.length)openDepartmentBreakdown(fdepts[x[0].index].nome);});chart('chart-vinculos','doughnut',{labels:['CLT','Estagiários','Outros'],datasets:[{data:[r.empregados||0,r.estagiarios||0,Math.max(0,(r.pessoas||0)-(r.empregados||0)-(r.estagiarios||0))],backgroundColor:[c.blue,c.gold,c.purple]}]},{cutout:'66%'},function(e,x){if(x.length)openVinculoBreakdown(['CLT','Estagiários','Outros'][x[0].index]);});chart('chart-rubricas','bar',{labels:rub.map(function(x){return rhFixTextValue(x.nome);}),datasets:[{label:'Valor',data:rub.map(function(x){return x.valor;}),backgroundColor:rub.map(function(x){return x.tipo==='D'||x.tipo==='desconto'?c.red:c.gold;})}]},{indexAxis:'y',plugins:{legend:{display:false}}},function(e,x){if(x.length)openRubricBreakdown(rub[x[0].index]);});chart('chart-encargos','bar',{labels:charges.map(function(x){return x[0];}),datasets:[{label:'Valor',data:charges.map(function(x){return Number(x[1])||0;}),backgroundColor:[c.blue,c.gold,c.emerald,c.purple]}]},{plugins:{legend:{display:false}}},function(e,x){if(!x.length)return;var l=charges[x[0].index][0];if(l==='INSS total')openInssBreakdown();else if(l==='FGTS')openFgtsBreakdown();else if(l==='PIS')openPisBreakdown();else openIrrfBreakdown();});chart('chart-rateio','bar',{labels:fdepts.map(function(x){return x.nome;}),datasets:[{label:'Proventos',data:fdepts.map(function(x){return x.proventos;}),backgroundColor:c.gold},{label:'Descontos',data:fdepts.map(function(x){return x.descontos;}),backgroundColor:c.red},{label:'Líquido',data:fdepts.map(function(x){return x.liquido;}),backgroundColor:c.emerald}]},{indexAxis:'y'},function(e,x){if(x.length)openDepartmentBreakdown(fdepts[x[0].index].nome);});['chart-composicao','chart-departamentos','chart-vinculos','chart-rubricas','chart-encargos','chart-rateio'].forEach(function(id){if($(id))$(id).style.cursor='pointer';});};

renderCustoReal=function(){if(!$('custo-real-rows')||!S.competencia)return;var rows=S.pessoas.slice().sort(function(a,b){return custoEmpresa(b).total-custoEmpresa(a).total;}),hasBen=!!(S.beneficios&&S.beneficios.length),tc=0,tp=0,tf=0,te=0,tb=0;rows.forEach(function(p){var c=custoEmpresa(p);tc+=c.total;tp+=Number(p.proventos)||0;tf+=Number(p.valor_fgts)||0;c.itens.forEach(function(it){if(it[2]==='rateado')te+=it[1];if(it[2]==='benefício')tb+=it[1];});});$('custo-real-kpis').innerHTML=[['Custo total LNB',tc],['Salários brutos',tp],['FGTS + Encargos patronais',tf+te]].concat(hasBen?[['Benefícios',tb]]:[]).map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>'+formatCompetence(S.competencia.competencia)+'</small></div>';}).join('');$('custo-real-head').innerHTML='<th>Colaborador</th><th class="money">Proventos</th><th class="money">FGTS</th><th class="money">INSS+RAT+Terc.</th>'+(hasBen?'<th class="money">Benefícios</th>':'')+'<th class="money">Custo total</th>';$('custo-real-rows').innerHTML=rows.map(function(p){var c=custoEmpresa(p),enc=0,ben=0;c.itens.forEach(function(it){if(it[2]==='rateado')enc+=it[1];if(it[2]==='benefício')ben+=it[1];});return '<tr><td><b>'+esc(p.nome)+'</b><small>'+esc(departmentName(p.departamento))+'</small></td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.valor_fgts)+'</td><td class="money">'+fmt(enc)+'</td>'+(hasBen?'<td class="money">'+fmt(ben)+'</td>':'')+'<td class="money"><b>'+fmt(c.total)+'</b></td></tr>';}).join('')+'<tr class="detail-total-row"><td><b>TOTAL</b></td><td class="money">'+fmt(tp)+'</td><td class="money">'+fmt(tf)+'</td><td class="money">'+fmt(te)+'</td>'+(hasBen?'<td class="money">'+fmt(tb)+'</td>':'')+'<td class="money"><b>'+fmt(tc)+'</b></td></tr>';if($('custo-ben-note'))$('custo-ben-note').hidden=true;var vp=$('benefit-validation-panel');if(vp)vp.remove();if(window.Chart&&rows.length){var cc=chartColors(),top=rows.slice(0,15),ds=[{label:'Salários / Proventos',data:top.map(function(p){return Number(p.proventos)||0;}),backgroundColor:cc.blue},{label:'FGTS',data:top.map(function(p){return Number(p.valor_fgts)||0;}),backgroundColor:cc.gold},{label:'Encargos patronais',data:top.map(function(p){var x=rhEmployerCharges(p).total-(Number(p.valor_fgts)||0);return x;}),backgroundColor:cc.orange}];if(hasBen)ds.push({label:'Benefícios',data:top.map(function(p){var b=0;custoEmpresa(p).itens.forEach(function(it){if(it[2]==='benefício')b+=it[1];});return b;}),backgroundColor:cc.purple});chart('chart-custo-real','bar',{labels:top.map(function(p){return p.nome.split(' ')[0];}),datasets:ds},{indexAxis:'y',scales:{x:{stacked:true},y:{stacked:true}}},function(e,x){if(x.length)openPerson(top[x[0].index].id);});}rhSweepText($('page-custoreal'));};

var _rhSetupUI=setupUI;setupUI=function(){_rhSetupUI();ensureRhDetailModal();if(!$('_rh_hotfix_v3_styles')){var st=document.createElement('style');st.id='_rh_hotfix_v3_styles';st.textContent='.detail-clickable{cursor:pointer}.click-hint{display:block;color:var(--muted);font-size:.68rem;margin-top:.15rem}.rh-detail-card,#inss-modal .modal-card,#irrf-modal .modal-card,#fgts-modal .modal-card{width:min(980px,calc(100vw - 24px))!important;max-width:min(980px,calc(100vw - 24px))!important;max-height:92vh!important;overflow-y:auto!important;overflow-x:hidden!important}.rh-detail-body,.im-body,.irrf-body,.fgts-body{overflow-x:hidden!important}.modal-table-inner.responsive-table,.modal-table-inner{width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse}.modal-table-inner th,.modal-table-inner td{white-space:normal!important;overflow-wrap:anywhere;padding:.45rem .5rem}.modal-table-inner .money{white-space:nowrap!important;text-align:right}.detail-total-row td{font-weight:800;border-top:2px solid var(--gold);background:var(--surface-2)}.detail-summary-toggle{cursor:pointer;color:var(--gold);padding:.6rem 0}.metric-row.clickable{width:100%;border:0;background:transparent;color:inherit;text-align:left;font:inherit}.kpi.clickable{cursor:pointer}@media(max-width:720px){.rh-detail-card,#inss-modal .modal-card,#irrf-modal .modal-card,#fgts-modal .modal-card{width:calc(100vw - 10px)!important;max-width:calc(100vw - 10px)!important}.modal-table-inner th,.modal-table-inner td{font-size:.68rem;padding:.35rem .25rem}.modal-table-inner .money{font-size:.66rem}.modal-head{padding:.75rem!important}.rh-detail-body{padding:.65rem!important}}';document.head.appendChild(st);}if($('benefit-validation-panel'))$('benefit-validation-panel').remove();if($('custo-ben-note'))$('custo-ben-note').hidden=true;rhSweepText(document.body);};
var _rhRenderAll=renderAll;renderAll=function(){_rhRenderAll();if($('benefit-validation-panel'))$('benefit-validation-panel').remove();if($('custo-ben-note'))$('custo-ben-note').hidden=true;rhSweepText(document.body);};/* RH & Folha — hotfix v4: PIS no custo, contraste claro e ordenacao alfabetica */
function rhPisForPerson(p){
  var e=(S.competencia&&S.competencia.encargos)||{};
  var total=Number(e.valor_pis)||0;
  if(!total)return 0;
  var baseTotal=S.pessoas.reduce(function(a,x){return a+(Number(x.base_fgts)||0);},0);
  var base=Number(p.base_fgts)||0;
  return baseTotal>0?total*(base/baseTotal):0;
}

rhEmployerCharges=function(p){
  var e=(S.competencia&&S.competencia.encargos)||{},items=[],total=0;
  var fgts=Number(p.valor_fgts)||0;
  var baseInd=Number(p.base_inss)||0;
  var baseRateio=S.pessoas.reduce(function(a,x){return a+(Number(x.base_inss)||0);},0);
  var baseTotal=Number(e.base_total_inss)||0;
  if(fgts){items.push(['FGTS',fgts,'exato']);total+=fgts;}
  if(baseRateio>0&&baseInd>0){
    var sh=baseInd/baseRateio;
    var pat=baseTotal*0.20;
    var rat=Number(e.rat)||(baseTotal*0.01);
    var ter=Number(e.terceiros)||(baseTotal*0.058);
    [['INSS patronal',pat],['RAT',rat],['Terceiros',ter]].forEach(function(x){var v=x[1]*sh;if(v){items.push([x[0],v,'rateado']);total+=v;}});
  }
  var pis=rhPisForPerson(p);
  if(pis){items.push(['PIS',pis,'rateado']);total+=pis;}
  return {itens:items,total:total};
};

renderPayroll=function(){
  var rows=S.pessoas.slice().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});
  $('payroll-rows').innerHTML=rows.length?rows.map(function(p){
    return '<tr><td><b>'+esc(p.nome)+'</b><br><small>'+esc(p.departamento||'')+'</small></td>'
      +'<td class="money">'+fmt(p.salario)+'</td>'
      +'<td class="money">'+fmt(p.proventos)+'</td>'
      +'<td class="money">'+fmt(p.descontos)+'</td>'
      +'<td class="money"><b>'+fmt(p.liquido)+'</b></td>'
      +'<td><button class="detail-button" data-person="'+esc(p.id)+'">Detalhar</button></td></tr>';
  }).join(''):emptyRow(6,'Composição individual protegida.');
  bindPersonButtons();
};

var _rhV4RenderCustoReal=renderCustoReal;
renderCustoReal=function(){
  _rhV4RenderCustoReal();
  var head=$('custo-real-head');
  if(head){Array.prototype.forEach.call(head.querySelectorAll('th'),function(th){if(/INSS\+RAT\+Terc/i.test(th.textContent||''))th.textContent='Encargos patronais';});}
};

var _rhV4SetupUI=setupUI;
setupUI=function(){
  _rhV4SetupUI();
  if(!$('_rh_hotfix_v4_styles')){
    var st=document.createElement('style');st.id='_rh_hotfix_v4_styles';
    st.textContent='body.light{--bg:#edf2f6;--bg-2:#e3eaf0;--surface:#ffffff;--surface-2:#eef3f7;--surface-soft:rgba(255,255,255,.98);--text:#07182b;--muted:#273c52;--faint:#465d73;--line:rgba(87,61,5,.46);--line-soft:rgba(13,37,59,.24);--chart-grid:rgba(13,37,59,.20);--chart-text:#10283e}'
      +'body.light .panel,body.light .kpi,body.light .table-panel{box-shadow:0 10px 28px rgba(18,43,67,.10)}'
      +'body.light th{background:#dfe8ef;color:#17354e;font-weight:900}'
      +'body.light td{color:#07182b}'
      +'body.light .nav-item{color:#263d53}'
      +'body.light .nav-item.active,body.light .nav-item:hover{color:#07182b;background:#e2eaf0}'
      +'body.light .metric-row span,body.light .validation-row span,body.light .kpi span,body.light .kpi small,body.light .row-person small,body.light .page-head p{color:#304a61}'
      +'body.light .status,body.light .privacy-chip,body.light .source-badge{color:#213b51;border-color:rgba(13,37,59,.28)}'
      +'body.light .detail-button,body.light .button,body.light .icon-button{border-color:rgba(13,37,59,.30)}'
      +'body.light tbody tr:hover{background:#e6edf3}'
      +'body.light .chart-wrap canvas{filter:saturate(1.08) contrast(1.04)}';
    document.head.appendChild(st);
  }
};

/* v5 — PIS explícito, composição individual só com encargos e filtros CLT/Estagiário */
departmentName=function(v){var map={'1':'Administrativa','2':'Comunicação','3':'Financeiro','4':'Marketing','5':'Técnica','6':'Técnica/Projetos'};return map[String(v)]||v||'—';};
function rhVinculoCategory(p){var v=cleanSearch(p&&p.vinculo||'');if(/estagi/.test(v))return 'estagiario';if(/celet|clt/.test(v))return 'clt';return 'outros';}

rhPisForPerson=function(p){
  var e=(S.competencia&&S.competencia.encargos)||{},total=Number(e.valor_pis)||0;
  if(!total)return 0;
  var rows=S.pessoas.filter(function(x){return Number(x.base_fgts)>0;});
  var allocated=rhAlloc(rows,'base_fgts',total);
  var hit=allocated.find(function(x){return x.p===p||String(x.p.id)===String(p.id);});
  return hit?hit.cents/100:0;
};

rhEmployerCharges=function(p){
  var e=(S.competencia&&S.competencia.encargos)||{},items=[],total=0;
  var fgts=Number(p.valor_fgts)||0,baseInd=Number(p.base_inss)||0;
  var baseRateio=S.pessoas.reduce(function(a,x){return a+(Number(x.base_inss)||0);},0),baseTotal=Number(e.base_total_inss)||0;
  if(fgts){items.push(['FGTS',fgts,'exato']);total+=fgts;}
  if(baseRateio>0&&baseInd>0){
    var sh=baseInd/baseRateio,pat=baseTotal*0.20,rat=Number(e.rat)||(baseTotal*0.01),ter=Number(e.terceiros)||(baseTotal*0.058);
    [['INSS patronal',pat],['RAT',rat],['Terceiros',ter]].forEach(function(x){var val=x[1]*sh;if(val){items.push([x[0],val,'rateado']);total+=val;}});
  }
  var pis=rhPisForPerson(p);if(pis){items.push(['PIS',pis,'rateado']);total+=pis;}
  return {itens:items,total:total};
};

filteredPessoas=function(){
  var fv=($('filter-vinculo')&&$('filter-vinculo').value)||'',fd=($('filter-dept')&&$('filter-dept').value)||'';
  return S.pessoas.filter(function(p){
    if(fv&&fv!=='todos'&&rhVinculoCategory(p)!==fv)return false;
    if(fd&&String(p.departamento)!==String(fd))return false;
    return true;
  });
};

populatePainelFilters=function(){
  var fd=$('filter-dept'),fv=$('filter-vinculo');if(!fd||!fv)return;
  var depts=departments(),curD=fd.value,curV=fv.value;
  fd.innerHTML='<option value="">Todos os departamentos</option>'+depts.map(function(d){var key=Object.keys({'1':'Administrativa','2':'Comunicação','3':'Financeiro','4':'Marketing','5':'Técnica','6':'Técnica/Projetos'}).find(function(k){return departmentName(k)===d.nome;})||d.nome;return '<option value="'+esc(key)+'">'+esc(d.nome)+'</option>';}).join('');
  fv.innerHTML='<option value="">Todos os vínculos</option><option value="clt">CLT</option><option value="estagiario">Estagiário</option><option value="outros">Outros</option>';
  if(curD)fd.value=curD;if(curV)fv.value=curV;
};

openPerson=function(id){
  var p=S.pessoas.find(function(x){return x.id===id;});if(!p)return;
  $('employee-modal-title').textContent=p.nome;
  $('employee-modal-summary').innerHTML=[
    ['Matrícula',p.matricula||'—'],['Cargo',p.cargo||'—'],['Departamento',departmentName(p.departamento)],['Centro de custo',p.centro_custo||'—'],
    ['Vínculo',p.vinculo||'—'],['Admissão',brDate(p.admissao)],['Situação',p.situacao||'—'],['Salário base',fmt(p.salario)]
  ].map(function(x){return '<div><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('');
  var lancs=p.lancamentos||[],provs=lancs.filter(function(x){return x.tipo==='P'||x.tipo==='provento';}),descs=lancs.filter(function(x){return x.tipo==='D'||x.tipo==='desconto';});
  var sumProv=provs.reduce(function(a,x){return a+(Number(x.valor)||0);},0),sumDesc=descs.reduce(function(a,x){return a+(Number(x.valor)||0);},0),liquido=Number(p.liquido)||0,enc=rhEmployerCharges(p);
  function rubrRow(x){return '<tr><td><b>'+esc((x.rubrica_codigo||x.codigo||'')+' '+(x.rubrica_nome||x.nome||''))+'</b></td><td class="money">'+nfmt(x.referencia)+'</td><td></td><td class="money">'+fmt(x.valor)+'</td></tr>';}
  var html='';
  if(lancs.length){
    html+='<tr class="group-head"><td colspan="4">Proventos</td></tr>'+provs.map(rubrRow).join('')+'<tr class="group-total"><td colspan="3"><b>Subtotal proventos</b></td><td class="money"><b>'+fmt(sumProv)+'</b></td></tr>';
    html+='<tr class="group-head"><td colspan="4">Descontos</td></tr>'+descs.map(rubrRow).join('')+'<tr class="group-total"><td colspan="3"><b>Subtotal descontos</b></td><td class="money"><b>'+fmt(sumDesc)+'</b></td></tr>';
    html+='<tr class="group-total destaque"><td colspan="3"><b>Líquido a receber</b></td><td class="money"><b>'+fmt(liquido)+'</b></td></tr>';
    html+='<tr class="group-head"><td colspan="4">Encargos patronais</td></tr>';
    enc.itens.forEach(function(it){html+='<tr><td>'+esc(it[0])+'</td><td></td><td><small>'+esc(it[2])+'</small></td><td class="money">'+fmt(it[1])+'</td></tr>';});
    html+='<tr class="group-total"><td colspan="3"><b>Total encargos patronais</b></td><td class="money"><b>'+fmt(enc.total)+'</b></td></tr>';
  }else html=emptyRow(4,'Sem rubricas individuais disponíveis.');
  $('employee-modal-rows').innerHTML=html;$('employee-modal').hidden=false;rhSweepText($('employee-modal'));
};

renderPayroll=function(){
  var filter=($('payroll-vinculo-filter')&&$('payroll-vinculo-filter').value)||'';
  var rows=S.pessoas.filter(function(p){return !filter||rhVinculoCategory(p)===filter;}).sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});
  $('payroll-rows').innerHTML=rows.length?rows.map(function(p){return '<tr><td><b>'+esc(p.nome)+'</b><br><small>'+esc(departmentName(p.departamento))+'</small></td><td class="money">'+fmt(p.salario)+'</td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.descontos)+'</td><td class="money"><b>'+fmt(p.liquido)+'</b></td><td><button class="detail-button" data-person="'+esc(p.id)+'">Detalhar</button></td></tr>';}).join(''):emptyRow(6,'Nenhum colaborador neste filtro.');
  bindPersonButtons();
};

var _rhV5SetupUI=setupUI;
setupUI=function(){
  _rhV5SetupUI();
  var page=$('page-folha'),table=$('payroll-rows')&&$('payroll-rows').closest('.table-panel');
  if(page&&table&&!$('payroll-vinculo-filter')){
    var bar=document.createElement('div');bar.className='filter-bar payroll-vinculo-bar';
    bar.innerHTML='<label>Vínculo<select id="payroll-vinculo-filter"><option value="">Todos</option><option value="clt">CLT</option><option value="estagiario">Estagiário</option><option value="outros">Outros</option></select></label>';
    table.parentNode.insertBefore(bar,table);
    $('payroll-vinculo-filter').onchange=renderPayroll;
  }
  if(!$('_rh_hotfix_v5_styles')){var st=document.createElement('style');st.id='_rh_hotfix_v5_styles';st.textContent='.payroll-vinculo-bar{display:flex;justify-content:flex-end;margin:0 0 12px}.payroll-vinculo-bar label{display:grid;gap:5px;color:var(--muted);font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.payroll-vinculo-bar select{min-width:180px;height:40px;padding:0 12px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface);color:var(--text)}';document.head.appendChild(st);}
};
/* RH & Folha — hotfix v6: visão geral, rateio responsivo e custo real auditável */

/* Sempre prioriza o departamento do cadastro mestre e recalcula os totais vivos. */
departments=function(){
  var m={};
  S.pessoas.forEach(function(p){
    var k=departmentName(p.departamento);
    if(!m[k])m[k]={nome:k,proventos:0,descontos:0,liquido:0};
    m[k].proventos+=Number(p.proventos)||0;
    m[k].descontos+=Number(p.descontos)||0;
    m[k].liquido+=Number(p.liquido)||0;
  });
  return Object.keys(m).map(function(k){return m[k];}).sort(function(a,b){return b.liquido-a.liquido;});
};

var _rhV6SelectCompetence=selectCompetence;
selectCompetence=async function(id){
  await _rhV6SelectCompetence(id);
  S.pessoas.forEach(function(p){
    var c=S.colaboradores.find(function(x){return String(x.id)===String(p.colaborador_id);});
    if(c&&c.departamento!=null&&String(c.departamento)!=='')p.departamento=c.departamento;
  });
  renderAll();
  populatePainelFilters();
};

function rhCardAction(el,fn){
  if(!el||!fn)return;
  var card=el.closest('.kpi');if(!card)return;
  card.classList.add('clickable','rh-drill-card');card.setAttribute('role','button');card.tabIndex=0;card.style.cursor='pointer';
  card.onclick=fn;card.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}};
}
function rhOpenPeopleOverview(){
  var rows=S.pessoas.slice().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});
  var html='<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th>Vínculo</th><th>Departamento</th></tr></thead><tbody>'+
    rows.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td>'+esc(p.vinculo||'—')+'</td><td>'+esc(departmentName(p.departamento))+'</td></tr>';}).join('')+
    '</tbody><tfoot><tr class="detail-total-row"><td><b>TOTAL</b></td><td><b>'+nfmt(rows.length)+' pessoas</b></td><td></td></tr></tfoot></table>';
  openGenericDetail('Pessoas na Folha','COMPOSIÇÃO DO QUADRO',html);
}
function rhBindOverviewCards(){
  rhCardAction($('kpi-proventos'),function(){openMetricBreakdown('proventos');});
  rhCardAction($('kpi-descontos'),function(){openMetricBreakdown('descontos');});
  rhCardAction($('kpi-liquido'),function(){openMetricBreakdown('liquido');});
  rhCardAction($('kpi-pessoas'),rhOpenPeopleOverview);
}

var _rhV6RenderKpis=renderKpis;
renderKpis=function(){
  _rhV6RenderKpis();
  var v={clt:0,estagiario:0,outros:0};
  S.pessoas.forEach(function(p){var k=rhVinculoCategory(p);v[k]=(v[k]||0)+1;});
  if($('kpi-pessoas'))$('kpi-pessoas').textContent=nfmt(S.pessoas.length);
  if($('kpi-vinculos'))$('kpi-vinculos').textContent=v.clt+' CLT · '+v.estagiario+' Estagiários · '+v.outros+' Outros';
  rhBindOverviewCards();
};

/* Custo real: proventos + todos os encargos patronais (inclui PIS) + benefícios integrados. */
custoEmpresa=function(p){
  var itens=[],total=0,prov=Number(p.proventos)||0;
  itens.push(['Proventos brutos',prov,'']);total+=prov;
  var enc=rhEmployerCharges(p);
  enc.itens.forEach(function(it){itens.push(it);total+=Number(it[1])||0;});
  var b=rhPersonBenefit(p);
  if(b){
    [['Seguro de Vida',b.seguro_vida],['Assistência Médica',b.assistencia_medica||b.assist_medica],['VR / VA / Cesta Básica',b.vr_caixa],['Vale Transporte',b.vale_transporte]].forEach(function(x){
      var val=Number(x[1])||0;if(val>0){itens.push([x[0],val,'benefício']);total+=val;}
    });
  }
  return {itens:itens,total:total};
};

function rhCostTotals(){
  var t={proventos:0,fgts:0,inss:0,rat:0,terceiros:0,pis:0,beneficios:0,total:0};
  S.pessoas.forEach(function(p){
    t.proventos+=Number(p.proventos)||0;
    rhEmployerCharges(p).itens.forEach(function(it){
      var k=cleanSearch(it[0]),v=Number(it[1])||0;
      if(k==='fgts')t.fgts+=v;else if(k.indexOf('inss patronal')>=0)t.inss+=v;else if(k==='rat')t.rat+=v;else if(k.indexOf('terceiros')>=0)t.terceiros+=v;else if(k==='pis')t.pis+=v;
    });
    var c=custoEmpresa(p);c.itens.forEach(function(it){if(it[2]==='benefício')t.beneficios+=Number(it[1])||0;});t.total+=c.total;
  });
  return t;
}
function rhSimpleComposition(titleText,kicker,rows){
  var total=rows.reduce(function(a,r){return a+(Number(r[1])||0);},0);
  openGenericDetail(titleText,kicker,'<table class="modal-table-inner responsive-table"><thead><tr><th>Componente</th><th class="money">Valor</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r[0])+'</td><td class="money">'+fmt(r[1])+'</td></tr>';}).join('')+'</tbody><tfoot><tr class="detail-total-row"><td><b>TOTAL</b></td><td class="money"><b>'+fmt(total)+'</b></td></tr></tfoot></table>');
}
function rhOpenEmployerCost(){var t=rhCostTotals();rhSimpleComposition('FGTS + Encargos Patronais','COMPOSIÇÃO DOS ENCARGOS',[['FGTS',t.fgts],['INSS patronal',t.inss],['RAT',t.rat],['Terceiros',t.terceiros],['PIS',t.pis]]);}
function rhOpenCostTotal(){var t=rhCostTotals();rhSimpleComposition('Custo Total LNB','COMPOSIÇÃO DO CUSTO',[['Salários / Proventos',t.proventos],['FGTS',t.fgts],['INSS patronal',t.inss],['RAT',t.rat],['Terceiros',t.terceiros],['PIS',t.pis],['Benefícios integrados',t.beneficios]]);}
function rhOpenBenefits(){
  var rows=[],ts=0,tm=0,tvr=0,tvt=0,tt=0,vrAvailable=false;
  S.pessoas.forEach(function(p){
    var b=rhPersonBenefit(p);if(!b)return;
    var s=Number(b.seguro_vida)||0,m=Number(b.assistencia_medica||b.assist_medica)||0,vr=Number(b.vr_caixa)||0,vt=Number(b.vale_transporte)||0,t=s+m+vr+vt;
    if(b.vr_valor_disponivel||vr>0)vrAvailable=true;
    if(t>0)rows.push({nome:p.nome,seg:s,med:m,vr:vr,vt:vt,total:t});
    ts+=s;tm+=m;tvr+=vr;tvt+=vt;tt+=t;
  });
  rows.sort(function(a,b){return b.total-a.total;});
  var html='<table class="modal-table-inner responsive-table benefit-detail-table"><thead><tr><th>Colaborador</th><th class="money">Seguro</th><th class="money">Saúde</th>'+(vrAvailable?'<th class="money">VR/VA/Cesta</th>':'')+'<th class="money">VT</th><th class="money">Total</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.nome)+'</td><td class="money">'+fmt(r.seg)+'</td><td class="money">'+fmt(r.med)+'</td>'+(vrAvailable?'<td class="money">'+fmt(r.vr)+'</td>':'')+'<td class="money">'+fmt(r.vt)+'</td><td class="money"><b>'+fmt(r.total)+'</b></td></tr>';}).join('')+'</tbody><tfoot><tr class="detail-total-row"><td><b>TOTAL</b></td><td class="money">'+fmt(ts)+'</td><td class="money">'+fmt(tm)+'</td>'+(vrAvailable?'<td class="money">'+fmt(tvr)+'</td>':'')+'<td class="money">'+fmt(tvt)+'</td><td class="money"><b>'+fmt(tt)+'</b></td></tr></tfoot></table>';
  if(!vrAvailable)html+='<p class="detail-note">VR / VA / Cesta Básica ainda não possui valor mensal persistido identificado na base integrada; por isso não compõe este total até que essa fonte esteja disponível.</p>';
  openGenericDetail('Benefícios por Colaborador','COMPOSIÇÃO DOS BENEFÍCIOS',html);
}
function rhBindCostCards(){
  var cards=document.querySelectorAll('#custo-real-kpis .kpi');
  Array.prototype.forEach.call(cards,function(card){
    var label=cleanSearch((card.querySelector('span')||{}).textContent||''),fn=null;
    if(label.indexOf('custo total')>=0)fn=rhOpenCostTotal;
    else if(label.indexOf('salarios brutos')>=0)fn=function(){openMetricBreakdown('proventos');};
    else if(label.indexOf('fgts')>=0&&label.indexOf('encargos')>=0)fn=rhOpenEmployerCost;
    else if(label.indexOf('beneficios')>=0)fn=rhOpenBenefits;
    if(fn){card.classList.add('clickable','rh-drill-card');card.setAttribute('role','button');card.tabIndex=0;card.style.cursor='pointer';card.onclick=fn;card.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}};}
  });
}
var _rhV6RenderCustoReal=renderCustoReal;
renderCustoReal=function(){_rhV6RenderCustoReal();rhBindCostCards();};

/* Garante drill-down na Visão Geral e Rateio usando departamentos recalculados. */
var _rhV6RenderCharts=renderCharts;
renderCharts=function(){
  _rhV6RenderCharts();
  if(!S.competencia||!window.Chart)return;
  var c=chartColors(),d=departments();
  chart('chart-departamentos','bar',{labels:d.map(function(x){return x.nome;}),datasets:[{label:'Líquido',data:d.map(function(x){return x.liquido;}),backgroundColor:c.emerald,borderRadius:7}]},{indexAxis:'y',plugins:{legend:{display:false}}},function(evt,elements){if(elements.length&&d[elements[0].index])openDepartmentBreakdown(d[elements[0].index].nome);});
  chart('chart-rateio','bar',{labels:d.map(function(x){return x.nome;}),datasets:[{label:'Proventos',data:d.map(function(x){return x.proventos;}),backgroundColor:c.gold,borderRadius:5},{label:'Descontos',data:d.map(function(x){return x.descontos;}),backgroundColor:c.red,borderRadius:5},{label:'Líquido',data:d.map(function(x){return x.liquido;}),backgroundColor:c.emerald,borderRadius:5}]},{indexAxis:'y'},function(evt,elements){if(elements.length&&d[elements[0].index])openDepartmentBreakdown(d[elements[0].index].nome);});
  if($('chart-departamentos'))$('chart-departamentos').style.cursor='pointer';if($('chart-rateio'))$('chart-rateio').style.cursor='pointer';
};

var _rhV6SetupUI=setupUI;
setupUI=function(){
  _rhV6SetupUI();
  if(!$('_rh_hotfix_v6_styles')){
    var st=document.createElement('style');st.id='_rh_hotfix_v6_styles';
    st.textContent='.rh-drill-card{transition:transform .16s ease,border-color .16s ease}.rh-drill-card:hover{transform:translateY(-2px);border-color:var(--line)}'
      +'.table-wrap{overflow-x:hidden!important}.table-wrap table,.modal-table-inner,.responsive-table{width:100%!important;min-width:0!important;max-width:100%!important;table-layout:fixed!important}'
      +'.table-wrap th,.table-wrap td,.modal-table-inner th,.modal-table-inner td{white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important}'
      +'.table-wrap .money,.modal-table-inner .money{white-space:nowrap!important;text-align:right}'
      +'.modal-card,.rh-detail-card,#employee-modal .modal-card,#inss-modal .modal-card,#irrf-modal .modal-card,#fgts-modal .modal-card{max-width:calc(100vw - 24px)!important;overflow-x:hidden!important}'
      +'.rh-detail-body,.im-body,.irrf-body,.fgts-body{max-width:100%!important;overflow-x:hidden!important}'
      +'.benefit-detail-table th:first-child,.benefit-detail-table td:first-child{width:34%}'
      +'@media(max-width:1050px){.table-wrap th,.table-wrap td,.modal-table-inner th,.modal-table-inner td{padding:.48rem .38rem!important;font-size:.69rem!important}.benefit-detail-table th:first-child,.benefit-detail-table td:first-child{width:30%}}';
    document.head.appendChild(st);
  }
  rhBindOverviewCards();rhBindCostCards();
};

var _rhV6RenderAll=renderAll;
renderAll=function(){_rhV6RenderAll();rhBindOverviewCards();rhBindCostCards();};
/* RH & Folha — hotfix v7: vínculos, Superintendência e layout de Encargos */
var _rhV7DepartmentName=departmentName;
departmentName=function(v){
  var out=_rhV7DepartmentName(v);
  return cleanSearch(out)==='superintendencia'?'Superintendência':out;
};

function rhLiveVinculoCounts(){
  var c={clt:0,estagiario:0,outros:0};
  S.pessoas.forEach(function(p){
    var k=rhVinculoCategory(p);
    if(k==='clt')c.clt+=1;
    else if(k==='estagiario')c.estagiario+=1;
    else c.outros+=1;
  });
  return c;
}

var _rhV7RenderCharts=renderCharts;
renderCharts=function(){
  _rhV7RenderCharts();
  if(!S.competencia||!window.Chart||!$('chart-vinculos'))return;
  var c=chartColors(),v=rhLiveVinculoCounts();
  chart('chart-vinculos','doughnut',{
    labels:['CLT · '+v.clt,'Estagiários · '+v.estagiario,'Outros · '+v.outros],
    datasets:[{data:[v.clt,v.estagiario,v.outros],backgroundColor:[c.blue,c.gold,c.purple],borderColor:getComputedStyle(document.body).getPropertyValue('--surface'),borderWidth:3}]
  },{cutout:'66%',plugins:{legend:{position:'bottom'}}},function(evt,elements){
    if(elements.length)openVinculoBreakdown(['CLT','Estagiários','Outros'][elements[0].index]);
  });
  $('chart-vinculos').style.cursor='pointer';
};

var _rhV7RenderKpis=renderKpis;
renderKpis=function(){
  _rhV7RenderKpis();
  var v=rhLiveVinculoCounts();
  if($('kpi-vinculos'))$('kpi-vinculos').textContent=v.clt+' CLT · '+v.estagiario+' Estagiários · '+v.outros+' Outros';
};

var _rhV7FilteredPessoas=filteredPessoas;
filteredPessoas=function(){
  var fv=($('filter-vinculo')&&$('filter-vinculo').value)||'',fd=($('filter-dept')&&$('filter-dept').value)||'';
  return S.pessoas.filter(function(p){
    if(fv&&fv!=='todos'&&rhVinculoCategory(p)!==fv)return false;
    if(fd&&rhDeptKey(departmentName(p.departamento))!==rhDeptKey(departmentName(fd)))return false;
    return true;
  });
};

var _rhV7SetupUI=setupUI;
setupUI=function(){
  _rhV7SetupUI();
  if(!$('_rh_hotfix_v7_styles')){
    var st=document.createElement('style');st.id='_rh_hotfix_v7_styles';
    st.textContent='@media(min-width:1200px){#charges-kpis{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:14px!important}#charges-kpis .kpi{min-width:0!important;padding:24px 20px!important}#charges-kpis .kpi strong{font-size:clamp(1.55rem,2.05vw,2.3rem)!important;white-space:nowrap}#charges-kpis .kpi span{font-size:.72rem!important}}'
      +'@media(max-width:1199px){#charges-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}}'
      +'@media(max-width:680px){#charges-kpis{grid-template-columns:1fr!important}}';
    document.head.appendChild(st);
  }
};

/* Custo Real é criado dinamicamente e não possui .page-head; injeta os filtros diretamente no topo da página. */
function rhV7EnsureCustoRealFilters(){
  var page=$('page-custoreal');if(!page)return;
  if(!$('custo-real-scope-filters')){
    var bar=document.createElement('div');bar.id='custo-real-scope-filters';bar.className='filter-bar custo-real-scope-filters';
    bar.innerHTML='<label class="rh-scope-label">Departamento<select id="rh-scope-dept-custoreal" data-rh-scope-dept></select></label>'
      +'<label class="rh-scope-label">Vínculo<select id="rh-scope-vinc-custoreal" data-rh-scope-vinc></select></label>';
    var anchor=$('custo-real-kpis');if(anchor&&anchor.parentNode===page)page.insertBefore(bar,anchor);else page.appendChild(bar);
  }
  if(!$('_rh_v7_custo_filters_style')){
    var st=document.createElement('style');st.id='_rh_v7_custo_filters_style';
    st.textContent='.custo-real-scope-filters{display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap;margin:0 0 16px}.custo-real-scope-filters label{display:grid;gap:5px;color:var(--muted);font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.custo-real-scope-filters select{min-width:190px;height:40px;padding:0 12px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface);color:var(--text)}@media(max-width:680px){.custo-real-scope-filters{justify-content:stretch}.custo-real-scope-filters label,.custo-real-scope-filters select{width:100%;min-width:0}}';
    document.head.appendChild(st);
  }
}
var _rhV7CostSetupUI=setupUI;
setupUI=function(){_rhV7CostSetupUI();rhV7EnsureCustoRealFilters();};
/* RH & Folha — hotfix v8 consolidado: contraste, filtros globais Departamento/Vínculo, Esc e Custo Real */

var RH_SCOPE=window.__lnbRhScopeState||(window.__lnbRhScopeState={dept:'',vinculo:''});

chartColors=function(){
  var css=getComputedStyle(document.body),root=getComputedStyle(document.documentElement);
  function v(name,fallback){return (css.getPropertyValue(name)||root.getPropertyValue(name)||fallback||'').trim();}
  return {text:v('--chart-text',document.body.classList.contains('light')?'#102f49':'#e7eef7'),grid:v('--chart-grid',document.body.classList.contains('light')?'rgba(18,49,76,.22)':'rgba(187,205,225,.16)'),gold:v('--gold','#e8b93c'),emerald:v('--emerald','#1fc48d'),red:v('--red','#e53945'),blue:v('--blue','#347fd1'),orange:v('--orange','#d56a12'),purple:v('--purple','#7651c9')};
};

function rhScopeDeptOptions(){
  var seen={},out=[];
  S.pessoas.forEach(function(p){var raw=String(p.departamento==null?'':p.departamento),label=departmentName(p.departamento);if(!raw||seen[raw])return;seen[raw]=1;out.push({value:raw,label:label});});
  return out.sort(function(a,b){return a.label.localeCompare(b.label,'pt-BR',{sensitivity:'base'});});
}
function rhScopePeople(){
  return S.pessoas.filter(function(p){
    if(RH_SCOPE.dept&&String(p.departamento)!==String(RH_SCOPE.dept))return false;
    if(RH_SCOPE.vinculo&&rhVinculoCategory(p)!==RH_SCOPE.vinculo)return false;
    return true;
  });
}
filteredPessoas=function(){return rhScopePeople();};
function rhScopeTotals(rows){var t={proventos:0,descontos:0,liquido:0,fgts:0};(rows||[]).forEach(function(p){t.proventos+=Number(p.proventos)||0;t.descontos+=Number(p.descontos)||0;t.liquido+=Number(p.liquido)||0;t.fgts+=Number(p.valor_fgts)||0;});return t;}
function rhScopeVincCounts(rows){var v={clt:0,estagiario:0,outros:0};(rows||[]).forEach(function(p){var k=rhVinculoCategory(p);v[k]=(v[k]||0)+1;});return v;}
function rhScopeDepartments(rows){var m={};(rows||rhScopePeople()).forEach(function(p){var k=departmentName(p.departamento);if(!m[k])m[k]={nome:k,proventos:0,descontos:0,liquido:0};m[k].proventos+=Number(p.proventos)||0;m[k].descontos+=Number(p.descontos)||0;m[k].liquido+=Number(p.liquido)||0;});return Object.keys(m).map(function(k){return m[k];}).sort(function(a,b){return b.liquido-a.liquido;});}
departments=function(){return rhScopeDepartments();};
function rhScopeRubrics(rows){var map={};(rows||rhScopePeople()).forEach(function(p){(p.lancamentos||[]).forEach(function(x){var k=(x.rubrica_codigo||'')+'|'+(x.rubrica_nome||'')+'|'+(x.tipo||'');if(!map[k])map[k]={codigo:x.rubrica_codigo,nome:x.rubrica_nome,tipo:x.tipo,valor:0};map[k].valor+=Number(x.valor)||0;});});return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.valor-a.valor;});}

function rhDeptOptionsHtml(){return '<option value="">Todos os departamentos</option>'+rhScopeDeptOptions().map(function(o){return '<option value="'+esc(o.value)+'">'+esc(o.label)+'</option>';}).join('');}
function rhVincOptionsHtml(){return '<option value="">Todos os vínculos</option><option value="clt">CLT</option><option value="estagiario">Estagiário</option><option value="outros">Outros</option>';}
function rhSetScope(dept,vinc){RH_SCOPE.dept=dept||'';RH_SCOPE.vinculo=vinc||'';rhSyncScopeControls();rhRefreshScope();}
function rhSyncScopeControls(){
  var md=$('filter-dept'),mv=$('filter-vinculo');if(md)md.value=RH_SCOPE.dept;if(mv)mv.value=RH_SCOPE.vinculo;
  document.querySelectorAll('[data-rh-scope-dept]').forEach(function(s){s.value=RH_SCOPE.dept;});
  document.querySelectorAll('[data-rh-scope-vinc]').forEach(function(s){s.value=RH_SCOPE.vinculo;});
}
function rhPopulateScopeControls(){
  var dh=rhDeptOptionsHtml(),vh=rhVincOptionsHtml(),md=$('filter-dept'),mv=$('filter-vinculo');
  if(md){md.innerHTML=dh;md.value=RH_SCOPE.dept;}if(mv){mv.innerHTML=vh;mv.value=RH_SCOPE.vinculo;}
  document.querySelectorAll('[data-rh-scope-dept]').forEach(function(s){s.innerHTML=dh;s.value=RH_SCOPE.dept;});
  document.querySelectorAll('[data-rh-scope-vinc]').forEach(function(s){s.innerHTML=vh;s.value=RH_SCOPE.vinculo;});
}
function rhCreateScreenFilters(pageId){
  var page=$(pageId);if(!page)return;var head=page.querySelector('.page-head');if(!head)return;
  var actions=head.querySelector('.head-actions');if(!actions){actions=document.createElement('div');actions.className='head-actions';head.appendChild(actions);}
  var key=pageId.replace('page-','');
  if(!page.querySelector('[data-rh-scope-dept]')){var ld=document.createElement('label');ld.className='rh-scope-label';ld.innerHTML='Departamento<select id="rh-scope-dept-'+key+'" data-rh-scope-dept></select>';actions.insertBefore(ld,actions.firstChild);}
  if(!page.querySelector('[data-rh-scope-vinc]')){var lv=document.createElement('label');lv.className='rh-scope-label';lv.innerHTML='Vínculo<select id="rh-scope-vinc-'+key+'" data-rh-scope-vinc></select>';actions.insertBefore(lv,actions.firstChild);}
}
function rhEnsureScopeFilters(){
  ['page-colaboradores','page-folha','page-rubricas','page-encargos','page-movimentacoes','page-rateio','page-custoreal'].forEach(rhCreateScreenFilters);
  var old=document.querySelector('.payroll-vinculo-bar');if(old)old.remove();
  rhPopulateScopeControls();
  var md=$('filter-dept'),mv=$('filter-vinculo');
  if(md)md.onchange=function(){RH_SCOPE.dept=md.value||'';rhSyncScopeControls();rhRefreshScope();};
  if(mv)mv.onchange=function(){RH_SCOPE.vinculo=mv.value||'';rhSyncScopeControls();rhRefreshScope();};
  document.querySelectorAll('[data-rh-scope-dept]').forEach(function(s){s.onchange=function(){RH_SCOPE.dept=s.value||'';rhSyncScopeControls();rhRefreshScope();};});
  document.querySelectorAll('[data-rh-scope-vinc]').forEach(function(s){s.onchange=function(){RH_SCOPE.vinculo=s.value||'';rhSyncScopeControls();rhRefreshScope();};});
  var reset=$('filter-reset');if(reset)reset.onclick=function(){RH_SCOPE.dept='';RH_SCOPE.vinculo='';rhSyncScopeControls();rhRefreshScope();};
}
function rhRefreshScope(){
  try{renderKpis();renderPeople();renderPayroll();renderRubrics();renderCharges();renderMovements();renderDepartments();renderCharts();renderCustoReal();}catch(e){console.error('Falha ao aplicar filtros globais do RH',e);}
}

renderKpis=function(){
  if(!S.competencia)return;var rows=rhScopePeople(),t=rhScopeTotals(rows),v=rhScopeVincCounts(rows);
  if($('kpi-proventos'))$('kpi-proventos').textContent=fmt(t.proventos);if($('kpi-descontos'))$('kpi-descontos').textContent=fmt(t.descontos);if($('kpi-liquido'))$('kpi-liquido').textContent=fmt(t.liquido);if($('kpi-pessoas'))$('kpi-pessoas').textContent=nfmt(rows.length);if($('kpi-vinculos'))$('kpi-vinculos').textContent=v.clt+' CLT · '+v.estagiario+' Estagiários · '+v.outros+' Outros';
  if($('payroll-kpis'))$('payroll-kpis').innerHTML=[['Proventos',t.proventos],['Descontos',t.descontos],['Líquido',t.liquido],['FGTS',t.fgts]].map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>'+formatCompetence(S.competencia.competencia)+'</small></div>';}).join('');
  if(typeof rhBindOverviewCards==='function')rhBindOverviewCards();
};

renderPayroll=function(){
  if(!$('payroll-rows'))return;var rows=rhScopePeople().slice().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});
  $('payroll-rows').innerHTML=rows.length?rows.map(function(p){return '<tr><td><b>'+esc(p.nome)+'</b><br><small>'+esc(departmentName(p.departamento))+'</small></td><td class="money">'+fmt(p.salario)+'</td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.descontos)+'</td><td class="money"><b>'+fmt(p.liquido)+'</b></td><td><button class="detail-button" data-person="'+esc(p.id)+'">Detalhar</button></td></tr>';}).join(''):emptyRow(6,'Nenhum colaborador para os filtros selecionados.');bindPersonButtons();
};

renderRubrics=function(){
  if(!$('rubric-rows'))return;var a=rhScopeRubrics();$('rubric-rows').innerHTML=a.length?a.map(function(x,i){return '<tr class="detail-clickable" data-rh-rubric="'+i+'"><td>'+esc(x.codigo||'—')+'</td><td><b>'+esc(rhFixTextValue(x.nome))+'</b><small class="click-hint">Clique para ver a composição</small></td><td><span class="status">'+esc(x.tipo)+'</span></td><td class="money">'+fmt(x.valor)+'</td></tr>';}).join(''):emptyRow(4,'Sem rubricas para os filtros selecionados.');document.querySelectorAll('[data-rh-rubric]').forEach(function(tr){tr.onclick=function(){openRubricBreakdown(a[Number(tr.dataset.rhRubric)]);};});
};
openRubricBreakdown=function(x){if(!x)return;var rows=[];rhScopePeople().forEach(function(p){var val=(p.lancamentos||[]).filter(function(l){return String(l.rubrica_codigo||'')===String(x.codigo||'')&&String(l.rubrica_nome||'')===String(x.nome||'')&&String(l.tipo||'')===String(x.tipo||'');}).reduce(function(a,l){return a+(Number(l.valor)||0);},0);if(val)rows.push({nome:p.nome,dep:departmentName(p.departamento),valor:val});});rows.sort(function(a,b){return b.valor-a.valor;});var total=rows.reduce(function(a,r){return a+r.valor;},0);openGenericDetail(x.nome||'Rubrica','COMPOSIÇÃO DA RUBRICA',rows.length?'<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Valor</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.nome)+'</td><td>'+esc(r.dep)+'</td><td class="money">'+fmt(r.valor)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL','',fmt(total)])+'</table>':'<p class="detail-empty">Sem composição para os filtros selecionados.</p>');};

renderDepartments=function(){
  if(!$('department-rows'))return;var a=rhScopeDepartments();$('department-rows').innerHTML=a.length?a.map(function(x,i){return '<tr class="detail-clickable" data-rh-dept-row="'+i+'"><td><b>'+esc(x.nome)+'</b></td><td class="money">'+fmt(x.proventos)+'</td><td class="money">'+fmt(x.descontos)+'</td><td class="money">'+fmt(x.liquido)+'</td></tr>';}).join(''):emptyRow(4,'Sem rateio para os filtros selecionados.');document.querySelectorAll('[data-rh-dept-row]').forEach(function(tr){tr.onclick=function(){openDepartmentBreakdown(a[Number(tr.dataset.rhDeptRow)].nome);};});
};
openDepartmentBreakdown=function(nome){var key=rhDeptKey(nome),rows=rhScopePeople().filter(function(p){return rhDeptKey(departmentName(p.departamento))===key;}).sort(function(a,b){return (Number(b.proventos)||0)-(Number(a.proventos)||0);}),t=rhScopeTotals(rows);openGenericDetail(nome,'COMPOSIÇÃO DO DEPARTAMENTO',rows.length?'<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th class="money">Proventos</th><th class="money">Descontos</th><th class="money">Líquido</th></tr></thead><tbody>'+rows.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.descontos)+'</td><td class="money">'+fmt(p.liquido)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL',fmt(t.proventos),fmt(t.descontos),fmt(t.liquido)])+'</table>':'<p class="detail-empty">Nenhum colaborador para os filtros selecionados.</p>');};

function rhScopedCharges(){
  var rows=rhScopePeople(),e=(S.competencia&&S.competencia.encargos)||{},allBase=S.pessoas.reduce(function(a,p){return a+(Number(p.base_inss)||0);},0),selBase=rows.reduce(function(a,p){return a+(Number(p.base_inss)||0);},0),baseTotal=Number(e.base_total_inss)||0,pat=baseTotal*0.20,rat=Number(e.rat)||(baseTotal*0.01),ter=Number(e.terceiros)||(baseTotal*0.058),official=Number(e.total_inss)||0,retAll=Math.max(0,official-pat-rat-ter),ratio=allBase>0?selBase/allBase:0,inss=retAll*ratio,fgts=0,pis=0,irrf=0;
  rows.forEach(function(p){fgts+=Number(p.valor_fgts)||0;pis+=Number(rhPisForPerson(p))||0;irrf+=Number(p.valor_irrf)||0;rhEmployerCharges(p).itens.forEach(function(it){var k=cleanSearch(it[0]);if(k.indexOf('inss patronal')>=0||k==='rat'||k.indexOf('terceiros')>=0)inss+=Number(it[1])||0;});});
  if(!irrf&&Number(e.valor_irrf_folha||e.valor_irrf)>0){var allI=S.pessoas.reduce(function(a,p){return a+(Number(p.base_irrf)||0);},0),selI=rows.reduce(function(a,p){return a+(Number(p.base_irrf)||0);},0);irrf=Number(e.valor_irrf_folha||e.valor_irrf)*(allI>0?selI/allI:0);}
  return {rows:rows,inss:inss,fgts:fgts,pis:pis,irrf:irrf,total:inss+fgts+pis+irrf,baseInss:selBase,retAll:retAll,allBase:allBase};
}
chargeData=function(){var c=rhScopedCharges();return [['INSS total',c.inss],['FGTS',c.fgts],['PIS',c.pis],['IRRF folha',c.irrf]];};
renderCharges=function(){
  if(!$('charges-kpis')||!$('charge-list'))return;var a=chargeData(),total=a.reduce(function(s,x){return s+(Number(x[1])||0);},0),handlers=[openInssBreakdown,openFgtsBreakdown,openPisBreakdown,openIrrfBreakdown];
  $('charge-list').innerHTML=a.map(function(x,i){return '<button class="metric-row clickable" data-rh-charge="'+i+'"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>clique para detalhar</small></button>';}).join('')+'<div class="metric-row"><span><b>Total recolhimentos</b></span><strong>'+fmt(total)+'</strong></div>';
  $('charges-kpis').innerHTML=a.map(function(x,i){return '<button class="kpi clickable" data-rh-charge="'+i+'"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>clique para detalhar</small></button>';}).join('')+'<div class="kpi featured"><span>Total recolhimentos</span><strong>'+fmt(total)+'</strong></div>';
  document.querySelectorAll('[data-rh-charge]').forEach(function(b){b.onclick=function(){var fn=handlers[Number(b.dataset.rhCharge)];if(fn)fn();};});
};

openInssBreakdown=function(){
  var modal=$('inss-modal');if(!modal)return;var sc=rhScopedCharges(),rows=sc.rows.filter(function(p){return Number(p.base_inss)>0;}),scopeBase=rows.reduce(function(a,p){return a+(Number(p.base_inss)||0);},0),retScope=sc.retAll*(sc.allBase>0?sc.baseInss/sc.allBase:0),tp=0,tr=0,tt=0,tret=0;
  var body=rows.map(function(p){var base=Number(p.base_inss)||0,shareScope=scopeBase>0?base/scopeBase:0,ret=retScope*shareScope,pp=0,rr=0,te=0;rhEmployerCharges(p).itens.forEach(function(it){var k=cleanSearch(it[0]);if(k.indexOf('inss patronal')>=0)pp+=Number(it[1])||0;else if(k==='rat')rr+=Number(it[1])||0;else if(k.indexOf('terceiros')>=0)te+=Number(it[1])||0;});tret+=ret;tp+=pp;tr+=rr;tt+=te;return '<tr><td>'+esc(p.nome)+'</td><td class="money">'+fmt(base)+'</td><td class="money">'+fmt(ret)+'</td><td class="money">'+fmt(pp)+'</td><td class="money">'+fmt(rr)+'</td><td class="money">'+fmt(te)+'</td></tr>';}).join('');
  modal.querySelector('.im-total-inss').textContent=fmt(sc.inss);modal.querySelector('.im-base').textContent=fmt(scopeBase);modal.querySelector('.im-body').innerHTML='<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th class="money">Base</th><th class="money">Retido</th><th class="money">Patronal</th><th class="money">RAT</th><th class="money">Terceiros</th></tr></thead><tbody>'+body+'</tbody>'+rhFoot(['TOTAL',fmt(scopeBase),fmt(tret),fmt(tp),fmt(tr),fmt(tt)])+'</table>';modal.hidden=false;rhSweepText(modal);
};window._openInss=function(){openInssBreakdown();};
openFgtsBreakdown=function(){var modal=$('fgts-modal');if(!modal)return;var rows=rhScopePeople().filter(function(p){return Number(p.valor_fgts)>0;}),tb=rows.reduce(function(a,p){return a+(Number(p.base_fgts)||0);},0),tv=rows.reduce(function(a,p){return a+(Number(p.valor_fgts)||0);},0);modal.querySelector('.fgts-total').textContent=fmt(tv);modal.querySelector('.fgts-base').textContent=fmt(tb);modal.querySelector('.fgts-body').innerHTML='<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th class="money">Base FGTS</th><th class="money">FGTS pago</th></tr></thead><tbody>'+rows.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td class="money">'+fmt(p.base_fgts)+'</td><td class="money">'+fmt(p.valor_fgts)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL',fmt(tb),fmt(tv)])+'</table>';modal.hidden=false;};window._openFgts=function(){openFgtsBreakdown();};
openPisBreakdown=function(){var rows=rhScopePeople().filter(function(p){return Number(p.base_fgts)>0;}),tb=0,tp=0;var body=rows.map(function(p){var v=Number(rhPisForPerson(p))||0;tb+=Number(p.base_fgts)||0;tp+=v;return '<tr><td>'+esc(p.nome)+'</td><td class="money">'+fmt(p.base_fgts)+'</td><td class="money">'+fmt(v)+'</td></tr>';}).join('');openGenericDetail('PIS por Colaborador','DETALHAMENTO PIS','<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th class="money">Base PIS</th><th class="money">PIS atribuído</th></tr></thead><tbody>'+body+'</tbody>'+rhFoot(['TOTAL',fmt(tb),fmt(tp)])+'</table>');};window._openPis=function(){openPisBreakdown();};
openIrrfBreakdown=function(){var modal=$('irrf-modal');if(!modal)return;var rows=rhScopePeople().filter(function(p){return Number(p.base_irrf)>0||Number(p.valor_irrf)>0;}).map(function(p){var b=Number(p.base_irrf)||0,c=calcIrrf(b),f=Number(p.valor_irrf)||0;return {n:p.nome,b:b,c:c,f:f,d:c-f};}),tb=0,tc=0,tf=0,td=0;rows.forEach(function(r){tb+=r.b;tc+=r.c;tf+=r.f;td+=r.d;});modal.querySelector('.irrf-total-folha').textContent=fmt(tf);modal.querySelector('.irrf-total-calc').textContent=fmt(tc);modal.querySelector('.irrf-body').innerHTML='<div class="irrf-official-note">Composição restrita aos filtros selecionados. RPA permanece fora desta etapa.</div><table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th class="money">Base IRRF</th><th class="money">Calculado</th><th class="money">Folha</th><th class="money">Dif.</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.n)+'</td><td class="money">'+fmt(r.b)+'</td><td class="money">'+fmt(r.c)+'</td><td class="money">'+fmt(r.f)+'</td><td class="money">'+fmt(r.d)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL',fmt(tb),fmt(tc),fmt(tf),fmt(td)])+'</table>';modal.hidden=false;};window._openIrrf=function(){openIrrfBreakdown();};

openMetricBreakdown=function(metric){var labels={proventos:'Proventos',descontos:'Descontos',liquido:'Líquido'},rows=rhScopePeople().filter(function(p){return Number(p[metric])!==0;}).sort(function(a,b){return (Number(b[metric])||0)-(Number(a[metric])||0);}),total=rows.reduce(function(a,p){return a+(Number(p[metric])||0);},0);openGenericDetail(labels[metric]||metric,'COMPOSIÇÃO POR COLABORADOR','<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Valor</th></tr></thead><tbody>'+rows.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td>'+esc(departmentName(p.departamento))+'</td><td class="money">'+fmt(p[metric])+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL','',fmt(total)])+'</table>');};
openVinculoBreakdown=function(kind){var target=kind==='CLT'?'clt':kind==='Estagiários'?'estagiario':'outros',rows=rhScopePeople().filter(function(p){return rhVinculoCategory(p)===target;}),total=rows.reduce(function(a,p){return a+(Number(p.liquido)||0);},0);openGenericDetail(kind,'COLABORADORES POR VÍNCULO','<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Líquido</th></tr></thead><tbody>'+rows.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td>'+esc(departmentName(p.departamento))+'</td><td class="money">'+fmt(p.liquido)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL ('+rows.length+' pessoas)','',fmt(total)])+'</table>');};
rhOpenPeopleOverview=function(){var rows=rhScopePeople().slice().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});openGenericDetail('Pessoas na Folha','COMPOSIÇÃO DO QUADRO','<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th>Vínculo</th><th>Departamento</th></tr></thead><tbody>'+rows.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td>'+esc(p.vinculo||'—')+'</td><td>'+esc(departmentName(p.departamento))+'</td></tr>';}).join('')+'</tbody><tfoot><tr class="detail-total-row"><td><b>TOTAL</b></td><td><b>'+nfmt(rows.length)+' pessoas</b></td><td></td></tr></tfoot></table>');};

renderMovements=function(){if(!$('movement-rows'))return;var rows=rhScopePeople(),moves=rows.filter(function(p){return /demit/i.test(p.situacao||'')||(p.admissao||'').slice(0,7)===S.competencia.competencia.slice(0,7);}),ad=moves.filter(function(p){return !/demit/i.test(p.situacao||'');}).length,de=moves.filter(function(p){return /demit/i.test(p.situacao||'');}).length,fe=rows.filter(function(p){return /ferias|férias/i.test(p.situacao||'');}).length,tr=Math.max(0,rows.length-de-fe);if($('movement-kpis'))$('movement-kpis').innerHTML=[['Admissões',ad],['Desligamentos',de],['Em férias',fe],['Trabalhando',tr]].map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+nfmt(x[1])+'</strong><small>Nos filtros atuais</small></div>';}).join('');$('movement-rows').innerHTML=moves.length?moves.map(function(p){var dem=/demit/i.test(p.situacao||'');return '<tr><td>'+esc(p.nome)+'</td><td><span class="status '+(dem?'danger':'success')+'">'+(dem?'Desligamento':'Admissão')+'</span></td><td>'+esc(dem?'Na competência':dateBR(p.admissao))+'</td><td>'+esc(departmentName(p.departamento))+'</td></tr>';}).join(''):emptyRow(4,'Nenhuma movimentação nos filtros selecionados.');};

renderCharts=function(){
  if(!S.competencia||!window.Chart)return;var c=chartColors(),rows=rhScopePeople(),t=rhScopeTotals(rows),d=rhScopeDepartments(rows),v=rhScopeVincCounts(rows),rub=rhScopeRubrics(rows).slice(0,10),charges=chargeData();
  chart('chart-composicao','bar',{labels:['Proventos','Descontos','Líquido'],datasets:[{label:'Valor',data:[t.proventos,t.descontos,t.liquido],backgroundColor:[c.gold,c.red,c.emerald],borderRadius:8}]},{plugins:{legend:{display:false}}},function(e,x){if(x.length)openMetricBreakdown(['proventos','descontos','liquido'][x[0].index]);});
  chart('chart-departamentos','bar',{labels:d.map(function(x){return x.nome;}),datasets:[{label:'Líquido',data:d.map(function(x){return x.liquido;}),backgroundColor:c.emerald,borderRadius:7}]},{indexAxis:'y',plugins:{legend:{display:false}}},function(e,x){if(x.length)openDepartmentBreakdown(d[x[0].index].nome);});
  chart('chart-vinculos','doughnut',{labels:['CLT · '+v.clt,'Estagiários · '+v.estagiario,'Outros · '+v.outros],datasets:[{data:[v.clt,v.estagiario,v.outros],backgroundColor:[c.blue,c.gold,c.purple],borderColor:getComputedStyle(document.body).getPropertyValue('--surface'),borderWidth:3}]},{cutout:'66%',plugins:{legend:{position:'bottom'}}},function(e,x){if(x.length)openVinculoBreakdown(['CLT','Estagiários','Outros'][x[0].index]);});
  chart('chart-rubricas','bar',{labels:rub.map(function(x){return rhFixTextValue(x.nome);}),datasets:[{label:'Valor',data:rub.map(function(x){return x.valor;}),backgroundColor:rub.map(function(x){return x.tipo==='D'||x.tipo==='desconto'?c.red:c.gold;})}]},{indexAxis:'y',plugins:{legend:{display:false}}},function(e,x){if(x.length)openRubricBreakdown(rub[x[0].index]);});
  chart('chart-encargos','bar',{labels:charges.map(function(x){return x[0];}),datasets:[{label:'Valor',data:charges.map(function(x){return Number(x[1])||0;}),backgroundColor:[c.blue,c.gold,c.emerald,c.purple]}]},{plugins:{legend:{display:false}}},function(e,x){if(!x.length)return;[openInssBreakdown,openFgtsBreakdown,openPisBreakdown,openIrrfBreakdown][x[0].index]();});
  chart('chart-rateio','bar',{labels:d.map(function(x){return x.nome;}),datasets:[{label:'Proventos',data:d.map(function(x){return x.proventos;}),backgroundColor:c.gold},{label:'Descontos',data:d.map(function(x){return x.descontos;}),backgroundColor:c.red},{label:'Líquido',data:d.map(function(x){return x.liquido;}),backgroundColor:c.emerald}]},{indexAxis:'y'},function(e,x){if(x.length)openDepartmentBreakdown(d[x[0].index].nome);});
  ['chart-composicao','chart-departamentos','chart-vinculos','chart-rubricas','chart-encargos','chart-rateio'].forEach(function(id){if($(id))$(id).style.cursor='pointer';});
};

rhCostTotals=function(){var t={proventos:0,fgts:0,inss:0,rat:0,terceiros:0,pis:0,beneficios:0,total:0};rhScopePeople().forEach(function(p){t.proventos+=Number(p.proventos)||0;rhEmployerCharges(p).itens.forEach(function(it){var k=cleanSearch(it[0]),v=Number(it[1])||0;if(k==='fgts')t.fgts+=v;else if(k.indexOf('inss patronal')>=0)t.inss+=v;else if(k==='rat')t.rat+=v;else if(k.indexOf('terceiros')>=0)t.terceiros+=v;else if(k==='pis')t.pis+=v;});var c=custoEmpresa(p);c.itens.forEach(function(it){if(it[2]==='benefício')t.beneficios+=Number(it[1])||0;});t.total+=c.total;});return t;};
rhOpenBenefits=function(){var rows=[],ts=0,tm=0,tvr=0,tvt=0,tt=0,vrAvailable=false;rhScopePeople().forEach(function(p){var b=rhPersonBenefit(p);if(!b)return;var s=Number(b.seguro_vida)||0,m=Number(b.assistencia_medica||b.assist_medica)||0,vr=Number(b.vr_caixa)||0,vt=Number(b.vale_transporte)||0,t=s+m+vr+vt;if(b.vr_valor_disponivel||vr>0)vrAvailable=true;if(t>0)rows.push({nome:p.nome,seg:s,med:m,vr:vr,vt:vt,total:t});ts+=s;tm+=m;tvr+=vr;tvt+=vt;tt+=t;});rows.sort(function(a,b){return b.total-a.total;});var html='<table class="modal-table-inner responsive-table benefit-detail-table"><thead><tr><th>Colaborador</th><th class="money">Seguro</th><th class="money">Saúde</th>'+(vrAvailable?'<th class="money">VR/VA/Cesta</th>':'')+'<th class="money">VT</th><th class="money">Total</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.nome)+'</td><td class="money">'+fmt(r.seg)+'</td><td class="money">'+fmt(r.med)+'</td>'+(vrAvailable?'<td class="money">'+fmt(r.vr)+'</td>':'')+'<td class="money">'+fmt(r.vt)+'</td><td class="money"><b>'+fmt(r.total)+'</b></td></tr>';}).join('')+'</tbody><tfoot><tr class="detail-total-row"><td><b>TOTAL</b></td><td class="money">'+fmt(ts)+'</td><td class="money">'+fmt(tm)+'</td>'+(vrAvailable?'<td class="money">'+fmt(tvr)+'</td>':'')+'<td class="money">'+fmt(tvt)+'</td><td class="money"><b>'+fmt(tt)+'</b></td></tr></tfoot></table>';openGenericDetail('Benefícios por Colaborador','COMPOSIÇÃO DOS BENEFÍCIOS',html);};

renderCustoReal=function(){
  if(!$('custo-real-rows')||!S.competencia)return;var rows=rhScopePeople().slice().sort(function(a,b){return custoEmpresa(b).total-custoEmpresa(a).total;}),hasBen=rows.some(function(p){var b=rhPersonBenefit(p);return b&&(Number(b.seguro_vida)||Number(b.assistencia_medica||b.assist_medica)||Number(b.vr_caixa)||Number(b.vale_transporte));}),tc=0,tp=0,tf=0,te=0,tb=0;
  rows.forEach(function(p){var c=custoEmpresa(p);tc+=c.total;tp+=Number(p.proventos)||0;tf+=Number(p.valor_fgts)||0;c.itens.forEach(function(it){if(it[2]==='rateado')te+=Number(it[1])||0;if(it[2]==='benefício')tb+=Number(it[1])||0;});});
  $('custo-real-kpis').innerHTML=[['Custo total LNB',tc],['Salários brutos',tp],['FGTS + Encargos patronais',tf+te]].concat(hasBen?[['Benefícios',tb]]:[]).map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>'+formatCompetence(S.competencia.competencia)+'</small></div>';}).join('');
  $('custo-real-head').innerHTML='<th>Colaborador</th><th class="money">Proventos</th><th class="money">FGTS</th><th class="money">Encargos patronais</th>'+(hasBen?'<th class="money">Benefícios</th>':'')+'<th class="money">Custo total</th>';
  $('custo-real-rows').innerHTML=rows.length?rows.map(function(p){var c=custoEmpresa(p),enc=0,ben=0;c.itens.forEach(function(it){if(it[2]==='rateado')enc+=Number(it[1])||0;if(it[2]==='benefício')ben+=Number(it[1])||0;});return '<tr><td><b>'+esc(p.nome)+'</b><small>'+esc(departmentName(p.departamento))+'</small></td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.valor_fgts)+'</td><td class="money">'+fmt(enc)+'</td>'+(hasBen?'<td class="money">'+fmt(ben)+'</td>':'')+'<td class="money"><b>'+fmt(c.total)+'</b></td></tr>';}).join('')+'<tr class="detail-total-row"><td><b>TOTAL</b></td><td class="money">'+fmt(tp)+'</td><td class="money">'+fmt(tf)+'</td><td class="money">'+fmt(te)+'</td>'+(hasBen?'<td class="money">'+fmt(tb)+'</td>':'')+'<td class="money"><b>'+fmt(tc)+'</b></td></tr>':emptyRow(hasBen?6:5,'Nenhum colaborador para os filtros selecionados.');
  if(window.Chart&&rows.length){var cc=chartColors(),top=rows.slice(0,15),ds=[{label:'Salários / Proventos',data:top.map(function(p){return Number(p.proventos)||0;}),backgroundColor:cc.blue},{label:'FGTS',data:top.map(function(p){return Number(p.valor_fgts)||0;}),backgroundColor:cc.gold},{label:'Encargos patronais',data:top.map(function(p){return Math.max(0,rhEmployerCharges(p).total-(Number(p.valor_fgts)||0));}),backgroundColor:cc.red}];if(hasBen)ds.push({label:'Benefícios',data:top.map(function(p){var b=0;custoEmpresa(p).itens.forEach(function(it){if(it[2]==='benefício')b+=Number(it[1])||0;});return b;}),backgroundColor:cc.purple});chart('chart-custo-real','bar',{labels:top.map(function(p){return p.nome.split(' ')[0];}),datasets:ds},{indexAxis:'y',scales:{x:{stacked:true},y:{stacked:true}}},function(e,x){if(x.length)openPerson(top[x[0].index].id);});}
  if(typeof rhBindCostCards==='function')rhBindCostCards();rhSweepText($('page-custoreal'));
};

var _rhV8BaseSetupUI=setupUI;
setupUI=function(){
  _rhV8BaseSetupUI();
  if(!$('_rh_hotfix_v8_styles')){var st=document.createElement('style');st.id='_rh_hotfix_v8_styles';st.textContent='body.light{--bg:#f4f7f9;--bg-2:#e9eff4;--surface:#fff;--surface-2:#edf3f7;--surface-soft:rgba(255,255,255,.98);--text:#071a2c;--muted:#29445d;--faint:#49657d;--line:rgba(118,82,5,.48);--line-soft:rgba(16,49,78,.24);--gold:#6e4a00;--gold-2:#765000;--emerald:#087451;--blue:#145fa7;--red:#b4232e;--orange:#9b4a00;--purple:#57349f;--chart-grid:rgba(18,49,76,.22);--chart-text:#102f49}body.light .topbar{background:rgba(244,247,249,.96)!important}body.light .sidebar{background:linear-gradient(180deg,#f8fafb,#eef3f6)!important}body.light .nav-item{color:#213d56!important}body.light .nav-item.active,body.light .nav-item:hover{color:#071a2c!important;background:#e3ebf1!important}body.light .page-head p,body.light .brand small,body.light .user-name,body.light .kpi span,body.light .kpi small,body.light .metric-row span,body.light .validation-row span,body.light .row-person small,body.light .sidebar-note span,body.light .click-hint,body.light .detail-note{color:#29445d!important}body.light .kpi,body.light .panel,body.light .table-panel{border-color:rgba(16,49,78,.22)!important;box-shadow:0 10px 28px rgba(22,52,78,.10)!important}body.light .kpi strong,body.light h1,body.light h2,body.light h3,body.light td,body.light .metric-row strong,body.light .detail-button,body.light .button{color:#071a2c!important}body.light th{background:#dce7ee!important;color:#173851!important;border-color:rgba(16,49,78,.24)!important;font-weight:900!important}body.light td{border-color:rgba(16,49,78,.18)!important}body.light tbody tr:hover{background:#e4edf3!important}body.light .head-actions label{color:#29445d!important}body.light .head-actions select,body.light .search{background:#fff!important;color:#071a2c!important;border-color:rgba(16,49,78,.30)!important}body.light .modal-card,body.light .rh-detail-card{background:#fff!important;color:#071a2c!important;border-color:rgba(16,49,78,.28)!important}body.light canvas{opacity:1!important;filter:none!important}.rh-scope-label select{min-width:160px}.head-actions{flex-wrap:wrap}@media(min-width:1200px){#charges-kpis{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:14px!important}}';document.head.appendChild(st);}
  rhEnsureScopeFilters();
  if(!window.__lnbRhEscPopupBound){window.__lnbRhEscPopupBound=true;document.addEventListener('keydown',function(e){if(e.key!=='Escape'&&e.key!=='Esc')return;var open=Array.prototype.slice.call(document.querySelectorAll('.modal')).filter(function(m){return m&&!m.hidden&&getComputedStyle(m).display!=='none';});if(open.length){open[open.length-1].hidden=true;e.preventDefault();e.stopPropagation();}},true);}
};

var _rhV8BaseApplyTheme=applyTheme;
applyTheme=function(){_rhV8BaseApplyTheme();if(S.competencia)setTimeout(function(){try{renderCharts();renderCustoReal();}catch(e){}},0);};

renderAll=function(){
  $('empty-state').hidden=true;$('dashboard').hidden=false;
  if(typeof populatePainelFilters==='function')populatePainelFilters();
  rhEnsureScopeFilters();
  renderKpis();renderPeople();renderPayroll();renderRubrics();renderCharges();renderMovements();renderDepartments();renderValidations();renderCharts();renderCustoReal();
};
/* RH & Folha — hotfix v9: fechar popups com tecla Escape */
(function(){
  function closeTopRhPopup(){
    var candidates=Array.prototype.slice.call(document.querySelectorAll('.modal')).filter(function(el){
      if(!el||el.hidden)return false;
      var cs=getComputedStyle(el);
      return cs.display!=='none'&&cs.visibility!=='hidden';
    });
    if(!candidates.length)return false;
    var top=candidates.sort(function(a,b){
      var za=parseInt(getComputedStyle(a).zIndex,10)||0,zb=parseInt(getComputedStyle(b).zIndex,10)||0;
      if(za!==zb)return zb-za;
      return Array.prototype.indexOf.call(document.body.children,b)-Array.prototype.indexOf.call(document.body.children,a);
    })[0];
    if(!top)return false;
    top.hidden=true;
    return true;
  }

  if(!window.__lnbRhEscPopupBound){
    window.__lnbRhEscPopupBound=true;
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape'&&e.key!=='Esc')return;
      if(closeTopRhPopup()){
        e.preventDefault();
        e.stopPropagation();
      }
    },true);
  }
})();
/* RH & Folha — hotfix v10: filtro global real por departamento/vínculo */
function rhScopedPeople(){return filteredPessoas();}
function rhScopedTotals(rows){var t={proventos:0,descontos:0,liquido:0,fgts:0};(rows||[]).forEach(function(p){t.proventos+=Number(p.proventos)||0;t.descontos+=Number(p.descontos)||0;t.liquido+=Number(p.liquido)||0;t.fgts+=Number(p.valor_fgts)||0;});return t;}
function rhScopedVinculos(rows){var v={clt:0,estagiario:0,outros:0};(rows||[]).forEach(function(p){var k=rhVinculoCategory(p);v[k]=(v[k]||0)+1;});return v;}
function rhScopedRubrics(rows){var map={};(rows||[]).forEach(function(p){(p.lancamentos||[]).forEach(function(x){var k=(x.rubrica_codigo||x.codigo||'')+'|'+(x.rubrica_nome||x.nome||'')+'|'+(x.tipo||'');if(!map[k])map[k]={codigo:x.rubrica_codigo||x.codigo,nome:x.rubrica_nome||x.nome,tipo:x.tipo,valor:0};map[k].valor+=Number(x.valor)||0;});});return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.valor-a.valor;});}
function rhScopedChargeData(rows){
  var e=(S.competencia&&S.competencia.encargos)||{},all=S.pessoas.length===(rows||[]).length;
  if(all)return [['INSS total',Number(e.total_inss)||0],['FGTS',Number(e.valor_fgts||S.competencia.valor_fgts)||0],['PIS',Number(e.valor_pis)||0],['IRRF folha',Number(e.valor_irrf_folha||e.valor_irrf||S.competencia.valor_irrf)||0]];
  var fgts=0,pis=0,irrf=0,inssRet=0,pat=0,rat=0,ter=0;
  (rows||[]).forEach(function(p){fgts+=Number(p.valor_fgts)||0;pis+=rhPisForPerson(p);irrf+=Number(p.valor_irrf)||0;var base=Number(p.base_inss)||0;inssRet+=(p.lancamentos||[]).filter(function(l){return String(l.rubrica_codigo||l.codigo||'')==='998';}).reduce(function(a,l){return a+(Number(l.valor)||0);},0);});
  var baseRateio=S.pessoas.reduce(function(a,p){return a+(Number(p.base_inss)||0);},0),selectedBase=(rows||[]).reduce(function(a,p){return a+(Number(p.base_inss)||0);},0),share=baseRateio>0?selectedBase/baseRateio:0,baseTotal=Number(e.base_total_inss)||0;
  pat=(baseTotal*.20)*share;rat=(Number(e.rat)||(baseTotal*.01))*share;ter=(Number(e.terceiros)||(baseTotal*.058))*share;
  return [['INSS total',inssRet+pat+rat+ter],['FGTS',fgts],['PIS',pis],['IRRF folha',irrf]];
}

renderKpis=function(){
  var rows=rhScopedPeople(),t=rhScopedTotals(rows),v=rhScopedVinculos(rows),c=S.competencia;
  $('kpi-proventos').textContent=fmt(t.proventos);$('kpi-descontos').textContent=fmt(t.descontos);$('kpi-liquido').textContent=fmt(t.liquido);$('kpi-pessoas').textContent=nfmt(rows.length);
  if($('kpi-vinculos'))$('kpi-vinculos').textContent=v.clt+' CLT · '+v.estagiario+' Estagiários · '+v.outros+' Outros';
  if($('payroll-kpis'))$('payroll-kpis').innerHTML=[['Proventos',t.proventos],['Descontos',t.descontos],['Líquido',t.liquido],['FGTS',t.fgts]].map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>'+formatCompetence(c.competencia)+'</small></div>';}).join('');
  if(typeof rhBindOverviewCards==='function')rhBindOverviewCards();
};

renderPayroll=function(){
  var pf=($('payroll-vinculo-filter')&&$('payroll-vinculo-filter').value)||'';
  var rows=rhScopedPeople().filter(function(p){return !pf||rhVinculoCategory(p)===pf;}).sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});
  $('payroll-rows').innerHTML=rows.length?rows.map(function(p){return '<tr><td><b>'+esc(p.nome)+'</b><br><small>'+esc(departmentName(p.departamento))+'</small></td><td class="money">'+fmt(p.salario)+'</td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.descontos)+'</td><td class="money"><b>'+fmt(p.liquido)+'</b></td><td><button class="detail-button" data-person="'+esc(p.id)+'">Detalhar</button></td></tr>';}).join(''):emptyRow(6,'Nenhum colaborador neste filtro.');bindPersonButtons();
};

rubricGroups=function(){return rhScopedRubrics(rhScopedPeople());};
renderMovements=function(){var rows=rhScopedPeople(),moves=rows.filter(function(p){return /demit/i.test(p.situacao||'')||(p.admissao||'').slice(0,7)===S.competencia.competencia.slice(0,7);}),adm=moves.filter(function(p){return !/demit/i.test(p.situacao||'');}).length,dem=moves.filter(function(p){return /demit/i.test(p.situacao||'');}).length,fer=rows.filter(function(p){return /ferias|férias/i.test(p.situacao||'');}).length,trab=rows.filter(function(p){return !/demit|ferias|férias/i.test(p.situacao||'');}).length;$('movement-kpis').innerHTML=[['Admissões',adm],['Desligamentos',dem],['Em férias',fer],['Trabalhando',trab]].map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+nfmt(x[1])+'</strong><small>No filtro atual</small></div>';}).join('');$('movement-rows').innerHTML=moves.length?moves.map(function(p){var d=/demit/i.test(p.situacao||'');return '<tr><td>'+esc(p.nome)+'</td><td><span class="status '+(d?'danger':'success')+'">'+(d?'Desligamento':'Admissão')+'</span></td><td>'+esc(d?'Na competência':dateBR(p.admissao))+'</td><td>'+esc(departmentName(p.departamento))+'</td></tr>';}).join(''):emptyRow(4,'Nenhuma movimentação neste filtro.');};

departments=function(){var m={};rhScopedPeople().forEach(function(p){var k=departmentName(p.departamento);if(!m[k])m[k]={nome:k,proventos:0,descontos:0,liquido:0};m[k].proventos+=Number(p.proventos)||0;m[k].descontos+=Number(p.descontos)||0;m[k].liquido+=Number(p.liquido)||0;});return Object.keys(m).map(function(k){return m[k];}).sort(function(a,b){return b.liquido-a.liquido;});};
chargeData=function(){return rhScopedChargeData(rhScopedPeople());};

renderCustoReal=function(){
  if(!$('custo-real-rows')||!S.competencia)return;
  var rows=rhScopedPeople().slice().sort(function(a,b){return custoEmpresa(b).total-custoEmpresa(a).total;}),hasBen=!!(S.beneficios&&S.beneficios.length),tc=0,tp=0,tf=0,te=0,tb=0;
  rows.forEach(function(p){var c=custoEmpresa(p);tc+=c.total;tp+=Number(p.proventos)||0;tf+=Number(p.valor_fgts)||0;c.itens.forEach(function(it){var k=cleanSearch(it[0]);if(it[2]==='rateado'||k==='pis')te+=Number(it[1])||0;if(it[2]==='benefício')tb+=Number(it[1])||0;});});
  $('custo-real-kpis').innerHTML=[['Custo total LNB',tc],['Salários brutos',tp],['FGTS + Encargos patronais',tf+te]].concat(hasBen?[['Benefícios',tb]]:[]).map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>'+formatCompetence(S.competencia.competencia)+'</small></div>';}).join('');
  $('custo-real-head').innerHTML='<th>Colaborador</th><th class="money">Proventos</th><th class="money">FGTS</th><th class="money">Encargos patronais</th>'+(hasBen?'<th class="money">Benefícios</th>':'')+'<th class="money">Custo total</th>';
  $('custo-real-rows').innerHTML=rows.map(function(p){var c=custoEmpresa(p),enc=0,ben=0;c.itens.forEach(function(it){var k=cleanSearch(it[0]);if(it[2]==='rateado'||k==='pis')enc+=Number(it[1])||0;if(it[2]==='benefício')ben+=Number(it[1])||0;});return '<tr><td><b>'+esc(p.nome)+'</b><small>'+esc(departmentName(p.departamento))+'</small></td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.valor_fgts)+'</td><td class="money">'+fmt(enc)+'</td>'+(hasBen?'<td class="money">'+fmt(ben)+'</td>':'')+'<td class="money"><b>'+fmt(c.total)+'</b></td></tr>';}).join('')+(rows.length?'<tr class="detail-total-row"><td><b>TOTAL</b></td><td class="money">'+fmt(tp)+'</td><td class="money">'+fmt(tf)+'</td><td class="money">'+fmt(te)+'</td>'+(hasBen?'<td class="money">'+fmt(tb)+'</td>':'')+'<td class="money"><b>'+fmt(tc)+'</b></td></tr>':'');
  if(window.Chart&&rows.length){var cc=chartColors(),top=rows.slice(0,15),ds=[{label:'Salários / Proventos',data:top.map(function(p){return Number(p.proventos)||0;}),backgroundColor:cc.blue},{label:'FGTS',data:top.map(function(p){return Number(p.valor_fgts)||0;}),backgroundColor:cc.gold},{label:'Encargos patronais',data:top.map(function(p){return Math.max(0,rhEmployerCharges(p).total-(Number(p.valor_fgts)||0));}),backgroundColor:cc.red}];if(hasBen)ds.push({label:'Benefícios',data:top.map(function(p){var b=0;custoEmpresa(p).itens.forEach(function(it){if(it[2]==='benefício')b+=Number(it[1])||0;});return b;}),backgroundColor:cc.purple});chart('chart-custo-real','bar',{labels:top.map(function(p){return p.nome.split(' ')[0];}),datasets:ds},{indexAxis:'y',scales:{x:{stacked:true},y:{stacked:true}}},function(e,x){if(x.length)openPerson(top[x[0].index].id);});}
  if(typeof rhBindCostCards==='function')rhBindCostCards();rhSweepText($('page-custoreal'));
};

renderCharts=function(){
  if(!S.competencia||!window.Chart)return;var rows=rhScopedPeople(),t=rhScopedTotals(rows),v=rhScopedVinculos(rows),c=chartColors(),d=departments(),rub=rhScopedRubrics(rows).slice(0,10),charges=rhScopedChargeData(rows);
  chart('chart-composicao','bar',{labels:['Proventos','Descontos','Líquido'],datasets:[{label:'Valor',data:[t.proventos,t.descontos,t.liquido],backgroundColor:[c.gold,c.red,c.emerald],borderRadius:8}]},{plugins:{legend:{display:false}}},function(e,x){if(x.length)openMetricBreakdown(['proventos','descontos','liquido'][x[0].index]);});
  chart('chart-departamentos','bar',{labels:d.map(function(x){return x.nome;}),datasets:[{label:'Líquido',data:d.map(function(x){return x.liquido;}),backgroundColor:c.emerald,borderRadius:7}]},{indexAxis:'y',plugins:{legend:{display:false}}},function(e,x){if(x.length)openDepartmentBreakdown(d[x[0].index].nome);});
  chart('chart-vinculos','doughnut',{labels:['CLT · '+v.clt,'Estagiários · '+v.estagiario,'Outros · '+v.outros],datasets:[{data:[v.clt,v.estagiario,v.outros],backgroundColor:[c.blue,c.gold,c.purple],borderColor:getComputedStyle(document.body).getPropertyValue('--surface'),borderWidth:3}]},{cutout:'66%',plugins:{legend:{position:'bottom'}}},function(e,x){if(x.length)openVinculoBreakdown(['CLT','Estagiários','Outros'][x[0].index]);});
  chart('chart-rubricas','bar',{labels:rub.map(function(x){return rhFixTextValue(x.nome);}),datasets:[{label:'Valor',data:rub.map(function(x){return x.valor;}),backgroundColor:rub.map(function(x){return x.tipo==='D'||x.tipo==='desconto'?c.red:c.gold;})}]},{indexAxis:'y',plugins:{legend:{display:false}}},function(e,x){if(x.length)openRubricBreakdown(rub[x[0].index]);});
  chart('chart-encargos','bar',{labels:charges.map(function(x){return x[0];}),datasets:[{label:'Valor',data:charges.map(function(x){return Number(x[1])||0;}),backgroundColor:[c.blue,c.gold,c.emerald,c.purple]}]},{plugins:{legend:{display:false}}});
  chart('chart-rateio','bar',{labels:d.map(function(x){return x.nome;}),datasets:[{label:'Proventos',data:d.map(function(x){return x.proventos;}),backgroundColor:c.gold},{label:'Descontos',data:d.map(function(x){return x.descontos;}),backgroundColor:c.red},{label:'Líquido',data:d.map(function(x){return x.liquido;}),backgroundColor:c.emerald}]},{indexAxis:'y'},function(e,x){if(x.length)openDepartmentBreakdown(d[x[0].index].nome);});
  ['chart-composicao','chart-departamentos','chart-vinculos','chart-rubricas','chart-encargos','chart-rateio'].forEach(function(id){if($(id))$(id).style.cursor='pointer';});
};

function rhRefreshFilteredViews(){renderKpis();renderPeople();renderPayroll();renderRubrics();renderCharges();renderMovements();renderDepartments();renderCharts();renderCustoReal();}
var _rhV10SetupUI=setupUI;
setupUI=function(){_rhV10SetupUI();['filter-dept','filter-vinculo'].forEach(function(id){var el=$(id);if(el){el.onchange=function(){rhRefreshFilteredViews();};}});};
/* RH & Folha — hotfix v11: metadados obrigatórios da importação */
function rhImportCompanyCode(comp){
  comp=comp||{};
  var direct=String(comp.empresa_codigo||'').trim();
  if(direct)return direct;
  var sources=[comp.arquivo_nome||'',comp.empresa_nome||''].join(' ').trim();
  var m=sources.match(/^\s*(\d{3,8})\s*(?:[-–—_]|$)/)
    ||sources.match(/\bempresa\s*[:#-]?\s*(\d{3,8})\b/i);
  return m?m[1]:'';
}

var _rhV11BuildRpcPayload=buildRpcPayload;
buildRpcPayload=function(preview){
  var payload=_rhV11BuildRpcPayload(preview),comp=(preview&&preview.competencia)||{};
  payload.meta=payload.meta||{};
  if(!payload.meta.empresa_codigo)payload.meta.empresa_codigo=rhImportCompanyCode(comp);
  if(!payload.meta.tipo_calculo)payload.meta.tipo_calculo='Folha mensal';
  return payload;
};

var _rhV11ShowPreview=showPreview;
showPreview=function(result){
  var comp=result&&result.competencia;
  if(comp&&!comp.empresa_codigo)comp.empresa_codigo=rhImportCompanyCode(comp);
  if(comp&&!comp.empresa_codigo){
    comp.validacoes=comp.validacoes||[];
    if(!comp.validacoes.some(function(v){return cleanSearch(v.msg||v.mensagem||'').indexOf('codigo da empresa')>=0;})){
      comp.validacoes.push({tipo:'erro',msg:'Código da empresa não identificado no PDF nem no nome do arquivo.'});
    }
  }
  _rhV11ShowPreview(result);
  var ok=!!(comp&&comp.competencia&&comp.empresa_codigo),btn=$('confirm-import');
  if(btn)btn.disabled=!ok;
  if($('preview-status')&&!ok)$('preview-status').textContent='Revisar metadados';
};

var _rhV11ConfirmImport=confirmImport;
confirmImport=async function(){
  if(S.preview&&S.preview.competencia&&!S.preview.competencia.empresa_codigo){
    S.preview.competencia.empresa_codigo=rhImportCompanyCode(S.preview.competencia);
  }
  if(!S.preview||!S.preview.competencia||!S.preview.competencia.competencia||!S.preview.competencia.empresa_codigo){
    toast('Não foi possível importar: competência e código da empresa precisam estar identificados.',true);return;
  }
  return _rhV11ConfirmImport();
};
/* RH & Folha — hotfix v12: período global (ano/mês) com consolidado multi-competência */
var RH_PERIOD={year:'',month:'all',active:[],loading:false};
var _rhPeriodBaseSelectCompetence=selectCompetence;
var _rhPeriodBaseFormatCompetence=formatCompetence;

function rhPeriodDate(c){return String(c&&c.competencia||'').slice(0,10);}
function rhPeriodYear(c){return rhPeriodDate(c).slice(0,4);}
function rhPeriodMonth(c){return rhPeriodDate(c).slice(5,7);}
function rhPeriodLabel(){
  if(!RH_PERIOD.year)return RH_PERIOD.month==='all'?'Todos os períodos':('Mês '+RH_PERIOD.month);
  if(RH_PERIOD.month==='all')return RH_PERIOD.year+' · Todos os meses';
  return RH_PERIOD.month+'/'+RH_PERIOD.year;
}
function rhPeriodSelectedCompetences(){
  return (S.competencias||[]).filter(function(c){
    if(RH_PERIOD.year&&rhPeriodYear(c)!==RH_PERIOD.year)return false;
    if(RH_PERIOD.month!=='all'&&rhPeriodMonth(c)!==RH_PERIOD.month)return false;
    return true;
  }).sort(function(a,b){return rhPeriodDate(a).localeCompare(rhPeriodDate(b));});
}
function rhPeriodSum(items,key){return (items||[]).reduce(function(a,x){return a+(Number(x&&x[key])||0);},0);}
function rhPeriodSumObject(items){
  var out={};(items||[]).forEach(function(obj){Object.keys(obj||{}).forEach(function(k){if(k==='situacoes')return;var v=obj[k];if(typeof v==='number'||(typeof v==='string'&&v!==''&&!isNaN(Number(v))))out[k]=(Number(out[k])||0)+(Number(v)||0);});});return out;
}
function rhPeriodLatest(items){return (items||[]).slice().sort(function(a,b){return rhPeriodDate(a).localeCompare(rhPeriodDate(b));}).pop()||{};}
function rhPeriodUniquePeopleCounts(rows){
  var v={clt:0,estagiario:0,outros:0};(rows||[]).forEach(function(p){var k=typeof rhVinculoCategory==='function'?rhVinculoCategory(p):'outros';v[k]=(v[k]||0)+1;});return v;
}
function rhPeriodDepartments(rows){
  var m={};(rows||[]).forEach(function(p){var k=departmentName(p.departamento);if(!m[k])m[k]={nome:k,proventos:0,descontos:0,liquido:0};m[k].proventos+=Number(p.proventos)||0;m[k].descontos+=Number(p.descontos)||0;m[k].liquido+=Number(p.liquido)||0;});return Object.keys(m).map(function(k){return m[k];}).sort(function(a,b){return b.liquido-a.liquido;});
}
function rhPeriodRubrics(rows){
  var m={};(rows||[]).forEach(function(p){(p.lancamentos||[]).forEach(function(l){var code=l.rubrica_codigo||l.codigo||'',name=l.rubrica_nome||l.nome||'',type=l.tipo||'';var k=code+'|'+name+'|'+type;if(!m[k])m[k]={codigo:code,nome:name,tipo:type,valor:0};m[k].valor+=Number(l.valor)||0;});});return Object.keys(m).map(function(k){return m[k];}).sort(function(a,b){return b.valor-a.valor;});
}
function rhPeriodCostCenters(rows){
  var m={};(rows||[]).forEach(function(p){var k=String(p.centro_custo||'').trim()||'Sem centro de custo';if(!m[k])m[k]={codigo:k,nome:k,proventos:0,descontos:0,liquido:0};m[k].proventos+=Number(p.proventos)||0;m[k].descontos+=Number(p.descontos)||0;m[k].liquido+=Number(p.liquido)||0;});return Object.keys(m).map(function(k){return m[k];});
}
function rhPeriodAggregatePeople(colaboradores,folhas,lancamentos,competencias){
  var meta={},order={},byFolha={},groups={};
  (colaboradores||[]).forEach(function(c){meta[c.id]=c;});
  (competencias||[]).forEach(function(c){order[c.id]=rhPeriodDate(c);});
  (lancamentos||[]).forEach(function(l){(byFolha[l.folha_colaborador_id]||(byFolha[l.folha_colaborador_id]=[])).push(l);});
  (folhas||[]).forEach(function(f){(groups[f.colaborador_id]||(groups[f.colaborador_id]=[])).push(f);});
  return Object.keys(groups).map(function(cid){
    var fs=groups[cid].slice().sort(function(a,b){return String(order[a.competencia_id]||'').localeCompare(String(order[b.competencia_id]||''));}),latest=fs[fs.length-1]||{},p=Object.assign({},meta[cid]||{},latest);
    p.id=cid;p.colaborador_id=cid;p.competencias=fs.map(function(f){return f.competencia_id;});p.folha_ids=fs.map(function(f){return f.id;});
    ['horas_mes','proventos','descontos','liquido','informativa','base_inss','excedente_inss','base_fgts','valor_fgts','base_irrf','valor_irrf'].forEach(function(k){p[k]=rhPeriodSum(fs,k);});
    p.salario=Number(latest.salario)||Number((meta[cid]||{}).salario)||0;
    p.lancamentos=[];fs.forEach(function(f){p.lancamentos=p.lancamentos.concat(byFolha[f.id]||[]);});
    return p;
  }).sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});
}
function rhPeriodAggregateBenefits(rows){
  var m={};(rows||[]).forEach(function(b){var k=String(b.colaborador_id||b.matricula||b.cpf_mascarado||b.cpf||'').trim();if(!k)return;if(!m[k])m[k]=Object.assign({},b,{seguro_vida:0,assistencia_medica:0,assist_medica:0,vr_caixa:0,vale_transporte:0});m[k].seguro_vida+=Number(b.seguro_vida)||0;m[k].assistencia_medica+=Number(b.assistencia_medica||b.assist_medica)||0;m[k].assist_medica=m[k].assistencia_medica;m[k].vr_caixa+=Number(b.vr_caixa)||0;m[k].vale_transporte+=Number(b.vale_transporte)||0;});return Object.keys(m).map(function(k){return m[k];});
}
function rhPeriodValidationRows(comps){
  var out=[];(comps||[]).forEach(function(c){(c.validacoes||[]).forEach(function(v){var x=Object.assign({},v);x.mensagem='['+_rhPeriodBaseFormatCompetence(c.competencia)+'] '+(v.mensagem||v.msg||'Validação');x.msg=x.mensagem;out.push(x);});});return out;
}
function rhPeriodSyntheticCompetence(comps,people){
  var latest=rhPeriodLatest(comps),enc=rhPeriodSumObject((comps||[]).map(function(c){return c.encargos||{};})),links=rhPeriodUniquePeopleCounts(people),proventos=rhPeriodSum(comps,'proventos'),descontos=rhPeriodSum(comps,'descontos'),liquido=rhPeriodSum(comps,'liquido'),baseInss=rhPeriodSum(comps,'base_inss'),baseFgts=rhPeriodSum(comps,'base_fgts'),fgts=rhPeriodSum(comps,'valor_fgts'),baseIrrf=rhPeriodSum(comps,'base_irrf');
  enc.situacoes={empregados:links.clt,estagiarios:links.estagiario,trabalhando:(people||[]).filter(function(p){return !/demit/i.test(p.situacao||'');}).length,demitido:(people||[]).filter(function(p){return /demit/i.test(p.situacao||'');}).length,ferias:(people||[]).filter(function(p){return /f[eé]rias/i.test(p.situacao||'');}).length};
  var resumo={pessoas:(people||[]).length,empregados:links.clt,estagiarios:links.estagiario,trabalhando:enc.situacoes.trabalhando,demitidos:enc.situacoes.demitido,ferias:enc.situacoes.ferias,admissoes:(people||[]).filter(function(p){var ym=String(p.admissao||'').slice(0,7);return (comps||[]).some(function(c){return rhPeriodDate(c).slice(0,7)===ym;});}).length,departamentos:rhPeriodDepartments(people),centros_custo:rhPeriodCostCenters(people),rubricas:rhPeriodRubrics(people),periodo:{ano:RH_PERIOD.year||null,mes:RH_PERIOD.month,competencias:(comps||[]).map(function(c){return c.id;})}};
  return {id:'period:'+String(RH_PERIOD.year||'all')+':'+String(RH_PERIOD.month),competencia:String(RH_PERIOD.year||'0000')+'-00-01',empresa_codigo:latest.empresa_codigo||'',empresa_nome:latest.empresa_nome||'',tipo_calculo:'Consolidado do período',fonte:'consolidado',status:'consolidado',proventos:proventos,descontos:descontos,liquido:liquido,base_inss:baseInss,base_fgts:baseFgts,valor_fgts:fgts,base_irrf:baseIrrf,encargos:enc,resumo:resumo,validacoes:rhPeriodValidationRows(comps),_periodConsolidated:true,_periodCompetencias:comps};
}
function rhPeriodIdsFilter(ids){return 'in.('+ids.join(',')+')';}
async function rhPeriodLoad(){
  if(RH_PERIOD.loading)return;RH_PERIOD.loading=true;
  try{
    var comps=rhPeriodSelectedCompetences();RH_PERIOD.active=comps;
    rhPeriodUpdateBadge(comps);
    if(!comps.length){S.competencia=null;S.pessoas=[];S.folhas=[];S.lancamentos=[];if($('empty-state'))$('empty-state').hidden=false;if($('dashboard'))$('dashboard').hidden=true;renderEmptyTables();return;}
    if(comps.length===1){await _rhPeriodBaseSelectCompetence(comps[0].id);rhPeriodUpdateBadge(comps);rhPeriodAfterRender();return;}
    var ids=comps.map(function(c){return c.id;}),requests=[];
    requests.push(can('ver_nomes')||canAdmin()?api('rh_colaboradores?select=*&order=nome'):Promise.resolve([]));
    requests.push(can('ver_valores_individuais')||canAdmin()?api('rh_folha_colaboradores?competencia_id='+rhPeriodIdsFilter(ids)+'&select=*'):Promise.resolve([]));
    requests.push(can('ver_valores_individuais')||canAdmin()?api('rh_lancamentos?competencia_id='+rhPeriodIdsFilter(ids)+'&select=*&order=valor.desc'):Promise.resolve([]));
    var out=await Promise.all(requests);S.colaboradores=out[0]||[];S.folhas=out[1]||[];S.lancamentos=out[2]||[];S.pessoas=rhPeriodAggregatePeople(S.colaboradores,S.folhas,S.lancamentos,comps);S.beneficios=[];
    try{var ben=await api('beneficios_colaboradores?select=*&competencia_id='+rhPeriodIdsFilter(ids));if(ben&&ben.length)S.beneficios=rhPeriodAggregateBenefits(ben);}catch(e){try{var active=await api('ben_contratos?select=*&is_ativo=eq.true');if(active&&active.length)S.beneficios=active;}catch(ignore){}}
    S.competencia=rhPeriodSyntheticCompetence(comps,S.pessoas);renderAll();rhPeriodAfterRender();
  }finally{RH_PERIOD.loading=false;}
}
function rhPeriodYears(){var m={};(S.competencias||[]).forEach(function(c){var y=rhPeriodYear(c);if(y)m[y]=1;});return Object.keys(m).sort().reverse();}
function rhPeriodMonthsForYear(year){var m={};(S.competencias||[]).forEach(function(c){if(!year||rhPeriodYear(c)===year)m[rhPeriodMonth(c)]=1;});return m;}
function rhPeriodPopulate(){
  var ys=$('rh-period-year'),ms=$('rh-period-month');if(!ys||!ms)return;var years=rhPeriodYears(),prevY=RH_PERIOD.year||ys.value,prevM=RH_PERIOD.month||ms.value||'all';
  if(!prevY&&years.length)prevY=years[0];RH_PERIOD.year=prevY;
  ys.innerHTML=years.map(function(y){return '<option value="'+esc(y)+'">'+esc(y)+'</option>';}).join('');if(prevY)ys.value=prevY;
  var have=rhPeriodMonthsForYear(prevY),names=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  ms.innerHTML='<option value="all">Todos os meses</option>'+names.map(function(n,i){var mm=String(i+1).padStart(2,'0'),disabled=have[mm]?'':' disabled';return '<option value="'+mm+'"'+disabled+'>'+n+'</option>';}).join('');
  if(prevM!=='all'&&!have[prevM])prevM='all';RH_PERIOD.month=prevM;ms.value=prevM;
}
function rhPeriodUpdateBadge(comps){
  var b=$('rh-period-badge');if(b)b.textContent=rhPeriodLabel()+' · '+(comps||[]).length+' competência'+((comps||[]).length===1?'':'s');
  var old=$('competencia-select');if(old&&old.parentElement)old.parentElement.hidden=true;
}
function rhPeriodEnsureUI(){
  if($('rh-period-global'))return;var content=document.querySelector('#app .content');if(!content)return;var bar=document.createElement('div');bar.id='rh-period-global';bar.className='rh-period-global';bar.innerHTML='<div class="rh-period-copy"><span class="eyebrow">PERÍODO GLOBAL</span><strong>Consolidado do RH & Folha</strong><small>O mesmo período é aplicado em todas as telas.</small></div><div class="rh-period-controls"><label>Ano<select id="rh-period-year"></select></label><label>Mês<select id="rh-period-month"><option value="all">Todos os meses</option></select></label><span class="source-badge" id="rh-period-badge">—</span></div>';content.insertBefore(bar,content.firstChild);
  var st=document.createElement('style');st.id='_rh_period_styles';st.textContent='.rh-period-global{position:sticky;top:0;z-index:30;display:flex;justify-content:space-between;align-items:center;gap:18px;padding:12px 16px;margin:-2px 0 18px;border:1px solid var(--line-soft);border-radius:14px;background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(0,0,0,.12)}.rh-period-copy{display:flex;flex-direction:column;gap:2px}.rh-period-copy strong{font-size:.94rem}.rh-period-copy small{color:var(--muted);font-size:.72rem}.rh-period-controls{display:flex;align-items:end;gap:10px;flex-wrap:wrap;justify-content:flex-end}.rh-period-controls label{display:flex;flex-direction:column;gap:4px;color:var(--muted);font-size:.68rem;font-weight:800;text-transform:uppercase}.rh-period-controls select{min-width:142px;padding:8px 32px 8px 10px;border:1px solid var(--line-soft);border-radius:9px;background:var(--surface-2);color:var(--text);font:inherit;text-transform:none}.rh-period-global .source-badge{margin-bottom:1px}@media(max-width:850px){.rh-period-global{position:relative;align-items:flex-start;flex-direction:column}.rh-period-controls{width:100%;justify-content:flex-start}.rh-period-controls label{flex:1}.rh-period-controls select{width:100%}}';document.head.appendChild(st);
  $('rh-period-year').onchange=function(){RH_PERIOD.year=this.value;RH_PERIOD.month='all';rhPeriodPopulate();rhPeriodLoad().catch(function(e){toast('Não foi possível consolidar o período: '+e.message,true);});};
  $('rh-period-month').onchange=function(){RH_PERIOD.month=this.value;rhPeriodLoad().catch(function(e){toast('Não foi possível consolidar o período: '+e.message,true);});};
}
function rhPeriodAfterRender(){
  rhPeriodUpdateBadge(RH_PERIOD.active);
  if(typeof renderHistory==='function'&&S.view==='historico')renderHistory();
  if(typeof renderInsights==='function'&&S.view==='indicadores')renderInsights();
  if(typeof renderDossier==='function'&&S.view==='dossie')renderDossier();
  if(S.competencia&&S.competencia._periodConsolidated){var btn=$('rh-closing-advance'),help=$('rh-closing-help');if(btn){btn.disabled=true;btn.hidden=false;btn.textContent='Selecione um mês para avançar';}if(help)help.textContent='O consolidado é somente leitura para fechamento. Selecione um mês específico no filtro global para conferir, conciliar ou fechar a competência.';}
}

formatCompetence=function(v){if(String(v||'').slice(5,7)==='00')return rhPeriodLabel();return _rhPeriodBaseFormatCompetence(v);};
loadCompetences=async function(){S.competencias=await api('rh_competencias?select=*&order=competencia.desc');rhPeriodPopulate();await rhPeriodLoad();};
selectCompetence=async function(id){var c=(S.competencias||[]).find(function(x){return x.id===id;});if(c){RH_PERIOD.year=rhPeriodYear(c);RH_PERIOD.month=rhPeriodMonth(c);rhPeriodPopulate();await rhPeriodLoad();}else await rhPeriodLoad();};

if(typeof rhHistoryRows==='function')rhHistoryRows=function(){return rhHistoryAllRows().filter(function(x){if(RH_PERIOD.year&&String(x.competencia||'').slice(0,4)!==RH_PERIOD.year)return false;if(RH_PERIOD.month!=='all'&&String(x.competencia||'').slice(5,7)!==RH_PERIOD.month)return false;return true;});};
if(typeof rhHistoryPopulateYears==='function')rhHistoryPopulateYears=function(){var s=$('rh-history-year');if(!s)return;s.innerHTML='<option>'+esc(rhPeriodLabel())+'</option>';s.disabled=true;};

var _rhPeriodSetupUI=setupUI;
setupUI=function(){_rhPeriodSetupUI();rhPeriodEnsureUI();};
/* RH & Folha — hotfix v13: ajuste automático dos cards e totais em todos os popups */
function rhFitCardValue(el){
  if(!el||!el.parentElement)return;
  el.style.fontSize='';el.style.whiteSpace='nowrap';
  var base=parseFloat(getComputedStyle(el).fontSize)||28,min=14,size=base,box=el.parentElement;
  while(size>min&&el.scrollWidth>Math.max(20,box.clientWidth-12)){size-=1;el.style.fontSize=size+'px';}
  el.classList.toggle('rh-value-tight',size<base);
}
function rhFitAllCardValues(root){
  root=root||document;
  var sel='.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,.rh-period-bar strong';
  Array.prototype.forEach.call(root.querySelectorAll(sel),rhFitCardValue);
}
function rhPopupNumber(text){
  text=String(text==null?'':text).trim();
  if(!text||text==='—'||text.indexOf('/')>=0&&!/R\$/.test(text))return null;
  var money=/R\$/.test(text),pct=/%/.test(text),clean=text.replace(/[^0-9,.-]/g,'');
  if(!clean)return null;
  var n=Number(clean.replace(/\./g,'').replace(',','.'));if(!isFinite(n))return null;
  return {value:n,money:money,pct:pct};
}
function rhPopupAggregate(values){
  var parsed=values.map(rhPopupNumber).filter(Boolean);if(!parsed.length)return '';
  var money=parsed.some(function(x){return x.money;}),pct=parsed.some(function(x){return x.pct;});
  if(pct){var avg=parsed.reduce(function(a,x){return a+x.value;},0)/parsed.length;return avg.toFixed(1).replace('.',',')+'%';}
  var total=parsed.reduce(function(a,x){return a+x.value;},0);return money?fmt(total):nfmt(total);
}
function rhPopupTotalForColumn(cells,index){
  var vals=cells.map(function(row){return row[index]||'';});return rhPopupAggregate(vals);
}
function rhEnsureHtmlTableTotals(table){
  if(!table||table.dataset.rhTotalsReady==='1')return;
  var heads=Array.prototype.map.call(table.querySelectorAll('thead th'),function(x){return x.textContent.trim();});
  var rows=Array.prototype.map.call(table.querySelectorAll('tbody tr'),function(tr){return Array.prototype.map.call(tr.children,function(td){return td.textContent.trim();});});
  if(!heads.length||!rows.length)return;
  var totals=heads.map(function(h,i){if(i===0)return 'TOTAL';var v=rhPopupTotalForColumn(rows,i);return v||'—';});
  var foot=table.querySelector('tfoot');if(!foot){foot=document.createElement('tfoot');table.appendChild(foot);}
  foot.innerHTML='<tr class="detail-total-row rh-auto-total">'+totals.map(function(v,i){return '<td'+((heads[i]||'').match(/valor|total|provento|desconto|líquido|liquido|fgts|inss|pis|irrf|custo|benef|salário|salario|base|encargo|%/i)?' class="money"':'')+'><b>'+esc(v)+'</b></td>';}).join('')+'</tr>';
  table.dataset.rhTotalsReady='1';
}
function rhEnsureGridTotals(grid){
  if(!grid||grid.dataset.rhTotalsReady==='1')return;
  var header=grid.querySelector('.rh-comp-header');if(!header)return;
  var heads=Array.prototype.map.call(header.children,function(x){return x.textContent.trim();});
  var body=Array.prototype.filter.call(grid.querySelectorAll('.rh-comp-row'),function(r){return !r.classList.contains('rh-comp-header')&&!r.classList.contains('rh-comp-total');});
  var rows=body.map(function(r){return Array.prototype.map.call(r.children,function(c){return c.textContent.trim();});});
  if(!heads.length||!rows.length)return;
  var totals=heads.map(function(h,i){if(i===0)return 'TOTAL';var v=rhPopupTotalForColumn(rows,i);return v||'—';});
  var old=grid.querySelector('.rh-comp-total');if(old)old.remove();
  var total=document.createElement('div');total.className='rh-comp-row rh-comp-total rh-auto-total';
  total.innerHTML=totals.map(function(v,i){return '<div class="rh-comp-cell" data-label="'+esc(heads[i]||'')+'"><b>'+esc(v)+'</b></div>';}).join('');
  grid.appendChild(total);grid.dataset.rhTotalsReady='1';
}
function rhEnsurePopupTotals(root){
  root=root||document;
  Array.prototype.forEach.call(root.querySelectorAll('.modal:not([hidden]) table,.rh-detail-card table,#rh-detail-modal:not([hidden]) table'),rhEnsureHtmlTableTotals);
  Array.prototype.forEach.call(root.querySelectorAll('.modal:not([hidden]) .rh-comp-table,.rh-detail-card .rh-comp-table,#rh-detail-modal:not([hidden]) .rh-comp-table'),rhEnsureGridTotals);
}
function rhPostRenderPolish(){requestAnimationFrame(function(){rhFitAllCardValues(document);rhEnsurePopupTotals(document);});}
if(!document.getElementById('_rh_v13_styles')){
  var _rhV13Style=document.createElement('style');_rhV13Style.id='_rh_v13_styles';
  _rhV13Style.textContent='.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.summary-card strong,.stat-card strong{max-width:100%;display:block;line-height:1.05;overflow:hidden;text-overflow:clip}.rh-value-tight{letter-spacing:-.02em}.rh-auto-total{border-top:2px solid var(--gold)!important;background:color-mix(in srgb,var(--gold) 8%,transparent)!important}.rh-auto-total td,.rh-auto-total .rh-comp-cell{font-weight:800!important}';
  document.head.appendChild(_rhV13Style);
}
var _rhV13RenderAll=renderAll;
renderAll=function(){var r=_rhV13RenderAll.apply(this,arguments);rhPostRenderPolish();return r;};
var _rhV13OpenGeneric=typeof openGenericDetail==='function'?openGenericDetail:null;
if(_rhV13OpenGeneric)openGenericDetail=function(){var r=_rhV13OpenGeneric.apply(this,arguments);rhPostRenderPolish();return r;};
var _rhV13OpenPerson=typeof openPerson==='function'?openPerson:null;
if(_rhV13OpenPerson)openPerson=function(){var r=_rhV13OpenPerson.apply(this,arguments);rhPostRenderPolish();return r;};
['openEncargosPopup','openInssBreakdown','openIrrfBreakdown','openFgtsBreakdown'].forEach(function(name){var fn=window[name];if(typeof fn==='function')window[name]=function(){var r=fn.apply(this,arguments);rhPostRenderPolish();return r;};});
var _rhV13Observer=new MutationObserver(function(muts){var hit=muts.some(function(m){return m.type==='childList'||m.type==='characterData'||(m.type==='attributes'&&m.attributeName==='hidden');});if(hit)rhPostRenderPolish();});
if(document.documentElement)_rhV13Observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
window.addEventListener('resize',function(){rhFitAllCardValues(document);});
/* RH & Folha — hotfix v14: contexto de período, cobertura, médias, comparação e exportação coerente */
function rhV14MonthNames(){return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];}
function rhV14ActiveCompetences(){return (RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:rhPeriodSelectedCompetences()).slice().sort(function(a,b){return rhPeriodDate(a).localeCompare(rhPeriodDate(b));});}
function rhV14PeriodLabel(){return typeof rhPeriodLabel==='function'?rhPeriodLabel():'Período atual';}
function rhV14MonthList(comps){var names=rhV14MonthNames();return (comps||[]).map(function(c){var m=Number(rhPeriodMonth(c));return names[m-1]||rhPeriodMonth(c);});}
function rhV14LatestCompetence(comps){return (comps||[]).slice().sort(function(a,b){return rhPeriodDate(a).localeCompare(rhPeriodDate(b));}).pop()||null;}
function rhV14PreviousCompetence(current){if(!current)return null;var all=(S.competencias||[]).slice().sort(function(a,b){return rhPeriodDate(a).localeCompare(rhPeriodDate(b));}),i=all.findIndex(function(c){return String(c.id)===String(current.id);});return i>0?all[i-1]:null;}
function rhV14CostModel(c){if(!c)return {proventos:0,encargos:0,custo:0,liquido:0};var e=c.encargos||{},base=Number(e.base_total_inss)||0,fgts=Number(e.valor_fgts!=null?e.valor_fgts:c.valor_fgts)||0,pis=Number(e.valor_pis)||0,pat=base*.20,rat=Number(e.rat)||(base*.01),ter=Number(e.terceiros)||(base*.058),prov=Number(c.proventos)||0;return {proventos:prov,encargos:fgts+pis+pat+rat+ter,custo:prov+fgts+pis+pat+rat+ter,liquido:Number(c.liquido)||0};}
function rhV14BenefitTotal(){var t=0;(S.pessoas||[]).forEach(function(p){var c=typeof custoEmpresa==='function'?custoEmpresa(p):{itens:[]};(c.itens||[]).forEach(function(it){if(it[2]==='benefício')t+=Number(it[1])||0;});});return t;}
function rhV14Pct(curr,prev){curr=Number(curr)||0;prev=Number(prev)||0;if(!prev)return null;return (curr-prev)/Math.abs(prev)*100;}
function rhV14DeltaHtml(label,curr,prev){var p=rhV14Pct(curr,prev);if(p==null)return '<span class="rh-v14-delta neutral">'+esc(label)+': sem base anterior</span>';var cls=p>0?'up':(p<0?'down':'neutral'),arrow=p>0?'↑':(p<0?'↓':'→');return '<span class="rh-v14-delta '+cls+'">'+arrow+' '+esc(label)+' '+Math.abs(p).toFixed(1).replace('.',',')+'%</span>';}
function rhV14UniqueLatestCount(latest){if(!latest)return 0;var r=latest.resumo||{},n=Number(r.pessoas)||0;if(n)return n;var e=latest.encargos||{},s=e.situacoes||{};return (Number(s.empregados)||0)+(Number(s.estagiarios)||0)||(Number(s.trabalhando)||0)+(Number(s.demitido)||0);}
function rhV14EnsureUI(){
  var bar=$('rh-period-global');if(!bar)return;
  if(!$('rh-v14-context')){
    var box=document.createElement('section');box.id='rh-v14-context';box.className='rh-v14-context';
    box.innerHTML='<div class="rh-v14-meta"><span class="eyebrow">LEITURA DO PERÍODO</span><strong id="rh-v14-title">—</strong><small id="rh-v14-coverage">—</small></div>'
      +'<div class="rh-v14-stats">'
      +'<div><span>Competências</span><strong id="rh-v14-count">0</strong><small id="rh-v14-months">—</small></div>'
      +'<div><span>Colaboradores únicos</span><strong id="rh-v14-unique">0</strong><small>sem duplicar entre meses</small></div>'
      +'<div><span>Pessoas na última competência</span><strong id="rh-v14-latest">0</strong><small id="rh-v14-latest-label">—</small></div>'
      +'</div><div id="rh-v14-deltas" class="rh-v14-deltas"></div>';
    bar.parentNode.insertBefore(box,bar.nextSibling);
  }
  if(!$('rh-v14-averages')){
    var avg=document.createElement('section');avg.id='rh-v14-averages';avg.className='rh-v14-averages';
    avg.innerHTML='<div class="rh-v14-avg-head"><span class="eyebrow">MÉDIA MENSAL</span><small>Calculada somente sobre as competências carregadas no filtro.</small></div><div class="kpi-grid slim">'
      +'<div class="kpi"><span>Proventos / mês</span><strong id="rh-v14-avg-prov">R$ 0,00</strong><small>média das competências importadas</small></div>'
      +'<div class="kpi"><span>Encargos / mês</span><strong id="rh-v14-avg-enc">R$ 0,00</strong><small>FGTS + patronais + PIS</small></div>'
      +'<div class="kpi"><span>Benefícios / mês</span><strong id="rh-v14-avg-ben">R$ 0,00</strong><small>benefícios integrados no período</small></div>'
      +'<div class="kpi"><span>Custo Real / mês</span><strong id="rh-v14-avg-cost">R$ 0,00</strong><small>folha + encargos + benefícios</small></div>'
      +'</div>';
    var dash=$('dashboard');if(dash)dash.insertBefore(avg,dash.firstChild);
  }
  if(!$('_rh_v14_styles')){var st=document.createElement('style');st.id='_rh_v14_styles';st.textContent='.rh-v14-context{display:grid;grid-template-columns:minmax(230px,.8fr) minmax(520px,1.8fr);gap:14px;align-items:stretch;margin:-6px 0 18px}.rh-v14-meta,.rh-v14-stats>div{border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2);padding:11px 13px}.rh-v14-meta{display:flex;flex-direction:column;gap:3px}.rh-v14-meta strong{font-size:.95rem}.rh-v14-meta small,.rh-v14-stats small,.rh-v14-avg-head small{color:var(--muted);font-size:.69rem}.rh-v14-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.rh-v14-stats span{display:block;color:var(--muted);font-size:.65rem;text-transform:uppercase;font-weight:800}.rh-v14-stats strong{display:block;font-size:1rem;margin:3px 0}.rh-v14-deltas{grid-column:1/-1;display:flex;gap:7px;flex-wrap:wrap}.rh-v14-delta{padding:5px 8px;border-radius:999px;border:1px solid var(--line-soft);background:var(--surface-2);font-size:.68rem;font-weight:800}.rh-v14-delta.up{color:var(--gold)}.rh-v14-delta.down{color:var(--emerald)}.rh-v14-delta.neutral{color:var(--muted)}.rh-v14-averages{margin-bottom:18px}.rh-v14-avg-head{display:flex;justify-content:space-between;gap:10px;align-items:end;margin-bottom:8px}.rh-v14-averages[hidden]{display:none!important}.rh-period-chip-modal{display:inline-flex;align-items:center;margin-top:4px;padding:4px 8px;border-radius:999px;border:1px solid var(--line-soft);background:var(--surface-2);color:var(--muted);font-size:.67rem;font-weight:800}.modal-table-inner tfoot,.responsive-table tfoot{position:sticky;bottom:0;z-index:3;background:var(--surface)}.rh-comp-total{position:sticky;bottom:0;z-index:3;background:var(--surface)!important}@media(max-width:900px){.rh-v14-context{grid-template-columns:1fr}.rh-v14-stats{grid-template-columns:1fr 1fr}.rh-v14-deltas{grid-column:auto}}@media(max-width:560px){.rh-v14-stats{grid-template-columns:1fr}.rh-v14-avg-head{align-items:flex-start;flex-direction:column}}';document.head.appendChild(st);}
}
function rhV14Render(){
  rhV14EnsureUI();var comps=rhV14ActiveCompetences(),count=comps.length,latest=rhV14LatestCompetence(comps),months=rhV14MonthList(comps),unique=(S.pessoas||[]).length,latestCount=rhV14UniqueLatestCount(latest);
  if($('rh-v14-title'))$('rh-v14-title').textContent=rhV14PeriodLabel();
  if($('rh-v14-count'))$('rh-v14-count').textContent=nfmt(count);
  if($('rh-v14-unique'))$('rh-v14-unique').textContent=nfmt(unique);
  if($('rh-v14-latest'))$('rh-v14-latest').textContent=nfmt(latestCount);
  if($('rh-v14-latest-label'))$('rh-v14-latest-label').textContent=latest?formatCompetence(latest.competencia):'—';
  if($('rh-v14-months'))$('rh-v14-months').textContent=months.length?months.join(', '):'Nenhum mês';
  var coverage=count?count+' de 12 competências do ano carregadas':'Nenhuma competência carregada';
  if(RH_PERIOD.month!=='all')coverage=count?'Competência mensal selecionada':'Mês sem importação';
  if($('rh-v14-coverage'))$('rh-v14-coverage').textContent=coverage;
  var totalProv=0,totalEnc=0,totalCost=0;(comps||[]).forEach(function(c){var m=rhV14CostModel(c);totalProv+=m.proventos;totalEnc+=m.encargos;totalCost+=m.custo;});
  var ben=rhV14BenefitTotal(),div=Math.max(1,count);if($('rh-v14-avg-prov'))$('rh-v14-avg-prov').textContent=fmt(totalProv/div);if($('rh-v14-avg-enc'))$('rh-v14-avg-enc').textContent=fmt(totalEnc/div);if($('rh-v14-avg-ben'))$('rh-v14-avg-ben').textContent=fmt(ben/div);if($('rh-v14-avg-cost'))$('rh-v14-avg-cost').textContent=fmt((totalCost+ben)/div);
  if($('rh-v14-averages'))$('rh-v14-averages').hidden=!count;
  var deltas=$('rh-v14-deltas');if(deltas){deltas.innerHTML='';if(RH_PERIOD.month!=='all'&&latest){var prev=rhV14PreviousCompetence(latest),cm=rhV14CostModel(latest),pm=rhV14CostModel(prev);deltas.innerHTML=prev?'<span class="rh-v14-delta neutral">vs '+esc(formatCompetence(prev.competencia))+'</span>'+rhV14DeltaHtml('Líquido',cm.liquido,pm.liquido)+rhV14DeltaHtml('Proventos',cm.proventos,pm.proventos)+rhV14DeltaHtml('Custo folha',cm.custo,pm.custo):'<span class="rh-v14-delta neutral">Primeira competência disponível para comparação</span>';}}
  if(typeof rhFitAllCardValues==='function')rhFitAllCardValues(document);
}
function rhV14StampOpenPopup(){
  requestAnimationFrame(function(){var roots=['#rh-detail-modal:not([hidden])','.modal:not([hidden])'];document.querySelectorAll(roots.join(',')).forEach(function(modal){var head=modal.querySelector('.modal-head,.rh-detail-head,.detail-head');if(!head||head.querySelector('.rh-period-chip-modal'))return;var chip=document.createElement('span');chip.className='rh-period-chip-modal';chip.textContent='Período: '+rhV14PeriodLabel();var target=head.querySelector('div')||head;target.appendChild(chip);});if(typeof rhEnsurePopupTotals==='function')rhEnsurePopupTotals(document);});
}
var _rhV14RenderAll=renderAll;renderAll=function(){var r=_rhV14RenderAll.apply(this,arguments);rhV14Render();return r;};
var _rhV14PeriodLoad=typeof rhPeriodLoad==='function'?rhPeriodLoad:null;if(_rhV14PeriodLoad)rhPeriodLoad=async function(){var r=await _rhV14PeriodLoad.apply(this,arguments);rhV14Render();return r;};
var _rhV14OpenGeneric=typeof openGenericDetail==='function'?openGenericDetail:null;if(_rhV14OpenGeneric)openGenericDetail=function(){var r=_rhV14OpenGeneric.apply(this,arguments);rhV14StampOpenPopup();return r;};
var _rhV14OpenPerson=typeof openPerson==='function'?openPerson:null;if(_rhV14OpenPerson)openPerson=function(){var r=_rhV14OpenPerson.apply(this,arguments);rhV14StampOpenPopup();return r;};
['openEncargosPopup','openInssBreakdown','openIrrfBreakdown','openFgtsBreakdown'].forEach(function(name){var fn=window[name];if(typeof fn==='function')window[name]=function(){var r=fn.apply(this,arguments);rhV14StampOpenPopup();return r;};});
/* Exportações já trabalham sobre S.pessoas/S.competencia, que no v12 representam exatamente o período global ativo. Este selo deixa o contexto explícito também antes da exportação. */
var _rhV14ExportPeople=typeof exportPeople==='function'?exportPeople:null;if(_rhV14ExportPeople)exportPeople=async function(){toast('Exportando o período '+rhV14PeriodLabel()+'…');return _rhV14ExportPeople.apply(this,arguments);};
var _rhV14SetupUI=setupUI;setupUI=function(){var r=_rhV14SetupUI.apply(this,arguments);rhV14EnsureUI();rhV14Render();return r;};
/* RH & Folha — hotfix v15: encaixe robusto e estável de valores nos cards */
(function(){
  var SELECTOR='.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#custo-real-kpis strong,#payroll-kpis strong,#charges-kpis strong,#movement-kpis strong';
  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function isFilteredTotal(el){
    var card=el&&el.closest&&el.closest('.kpi');if(!card)return false;
    var label=card.querySelector('span');return norm(label&&label.textContent).indexOf('custo total filtrado')>=0;
  }
  function fitOne(el){
    if(!el||!el.parentElement)return;
    var box=el.parentElement,filtered=isFilteredTotal(el),text=String(el.textContent||'').trim();
    var width=Math.round(box.clientWidth||0),sig=text+'|'+width+'|'+(filtered?'filtered':'normal');
    if(el.dataset.rhFitSig===sig)return;
    el.style.setProperty('white-space','nowrap','important');
    el.style.setProperty('display','block','important');
    el.style.setProperty('max-width','100%','important');
    el.style.setProperty('overflow','visible','important');

    /* Custo Total Filtrado: tamanho FIXO por faixa de largura. Não mede o próprio texto e não oscila entre frames. */
    if(filtered){
      var fixed=width>=230?21:(width>=200?19:17);
      el.style.setProperty('font-size',fixed+'px','important');
      el.style.setProperty('letter-spacing','0','important');
      el.style.setProperty('font-variant-numeric','tabular-nums','important');
      el.dataset.rhFit='1';el.dataset.rhFitSig=sig;return;
    }

    el.style.setProperty('font-size','', 'important');
    var cs=getComputedStyle(el),base=parseFloat(cs.fontSize)||34;
    var max=Math.min(base,42),min=15;
    var available=Math.max(36,(box.clientWidth-24)*.96);
    var low=min,high=max,best=min;
    for(var i=0;i<10;i++){
      var mid=(low+high)/2;
      el.style.setProperty('font-size',mid+'px','important');
      var fits=el.scrollWidth<=available;
      if(fits){best=mid;low=mid;}else high=mid;
    }
    best=Math.floor(best*2)/2;
    el.style.setProperty('font-size',best+'px','important');
    el.style.setProperty('letter-spacing',best<22?'-.035em':(best<28?'-.025em':'-.015em'),'important');
    el.dataset.rhFit='1';el.dataset.rhFitSig=sig;
  }
  function fitAll(root){root=root||document;Array.prototype.forEach.call(root.querySelectorAll(SELECTOR),fitOne);}
  var scheduled=false;
  function schedule(force){
    if(force)Array.prototype.forEach.call(document.querySelectorAll(SELECTOR),function(el){delete el.dataset.rhFitSig;});
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(function(){requestAnimationFrame(function(){scheduled=false;fitAll(document);});});
  }
  window.rhFitAllCardValues=fitAll;
  if(typeof ResizeObserver!=='undefined'){
    var lastWidths=new WeakMap();
    var ro=new ResizeObserver(function(entries){
      var changed=false;entries.forEach(function(entry){var w=Math.round(entry.contentRect&&entry.contentRect.width||0),old=lastWidths.get(entry.target);if(old==null||Math.abs(w-old)>=8){lastWidths.set(entry.target,w);changed=true;}});if(changed)schedule(true);
    });
    function observe(){Array.prototype.forEach.call(document.querySelectorAll('.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card'),function(x){try{ro.observe(x);}catch(e){}});}
    var mo=new MutationObserver(function(muts){var contentChanged=muts.some(function(m){return m.type==='childList'||m.type==='characterData';});observe();if(contentChanged)schedule(true);});
    mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
    document.addEventListener('DOMContentLoaded',function(){observe();schedule(true);});
  }else{
    var mo2=new MutationObserver(function(){schedule(true);});mo2.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  }
  window.addEventListener('resize',function(){schedule(true);});
  window.addEventListener('load',function(){schedule(true);});
  var prevRenderAll=window.renderAll;
  if(typeof prevRenderAll==='function')window.renderAll=function(){var r=prevRenderAll.apply(this,arguments);schedule(true);return r;};
  if(!document.getElementById('_rh_v15_card_fit_styles')){
    var st=document.createElement('style');st.id='_rh_v15_card_fit_styles';
    st.textContent='.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.summary-card,.stat-card{min-width:0!important;overflow:hidden!important}.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong{width:100%!important;max-width:100%!important;min-width:0!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;line-height:1.02!important}#rh-insight-kpis .kpi:last-child strong{font-variant-numeric:tabular-nums!important;transform:none!important;animation:none!important;transition:none!important}';
    document.head.appendChild(st);
  }
  schedule(true);
})();
/* RH & Folha — hotfix v16: encaixe de valores por medição real do texto */
(function(){
  var SELECTOR='.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#custo-real-kpis strong,#payroll-kpis strong,#charges-kpis strong,#movement-kpis strong';
  var canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  function innerWidth(box){
    var cs=getComputedStyle(box),w=box.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0);return Math.max(48,w-2);
  }
  function textWidth(el,size){
    if(!ctx)return Infinity;var cs=getComputedStyle(el),weight=cs.fontWeight||700,family=cs.fontFamily||'sans-serif';ctx.font=weight+' '+size+'px '+family;return ctx.measureText(String(el.textContent||'').trim()).width;
  }
  function fitOne(el){
    if(!el||!el.parentElement)return;var box=el.closest('.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card')||el.parentElement;
    var txt=String(el.textContent||'').trim();if(!txt)return;
    var available=innerWidth(box),min=12,max=34;
    if(txt.length<=8)max=34;else if(txt.length<=11)max=30;else if(txt.length<=14)max=26;else if(txt.length<=17)max=22;else max=19;
    var lo=min,hi=max,best=min;
    for(var i=0;i<16;i++){var mid=(lo+hi)/2;if(textWidth(el,mid)<=available){best=mid;lo=mid;}else{hi=mid;}}
    var size=Math.max(min,Math.floor(best*100)/100);
    el.style.setProperty('font-size',size+'px','important');
    el.style.setProperty('white-space','nowrap','important');
    el.style.setProperty('display','block','important');
    el.style.setProperty('width','100%','important');
    el.style.setProperty('max-width','100%','important');
    el.style.setProperty('overflow','visible','important');
    el.style.setProperty('text-overflow','clip','important');
    el.style.setProperty('letter-spacing',size<20?'-.045em':(size<25?'-.03em':'-.015em'),'important');
  }
  function fitAll(){Array.prototype.forEach.call(document.querySelectorAll(SELECTOR),fitOne);}
  var timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(function(){requestAnimationFrame(fitAll);},30);}
  window.rhFitAllCardValues=fitAll;
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(schedule);
  var mo=new MutationObserver(schedule);mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('resize',schedule);window.addEventListener('load',schedule);document.addEventListener('DOMContentLoaded',schedule);
  var prev=window.renderAll;if(typeof prev==='function')window.renderAll=function(){var r=prev.apply(this,arguments);schedule();return r;};
  if(!document.getElementById('_rh_v16_card_fit_styles')){var st=document.createElement('style');st.id='_rh_v16_card_fit_styles';st.textContent='.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card{min-width:0!important}.kpi strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#custo-real-kpis strong,#payroll-kpis strong,#charges-kpis strong,#movement-kpis strong{min-width:0!important;width:100%!important;max-width:100%!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;line-height:1.02!important}';document.head.appendChild(st);}
  schedule();
})();
/* RH & Folha — hotfix v16: importação em lote de múltiplos PDFs */
(function(){
  var BATCH={items:[],busy:false};
  function batchInput(){return $('pdf-input');}
  function ensureBatchUI(){
    var input=batchInput();if(input){input.multiple=true;var label=input.closest('label');if(label&&label.firstChild)label.firstChild.nodeValue='Selecionar PDF(s)';}
    if($('rh-pdf-batch'))return;
    var preview=$('import-preview');if(!preview||!preview.parentElement)return;
    var box=document.createElement('article');box.id='rh-pdf-batch';box.className='panel rh-pdf-batch';box.hidden=true;
    box.innerHTML='<div class="panel-head"><div><span class="panel-kicker">IMPORTAÇÃO EM LOTE</span><h2>Arquivos selecionados</h2><p class="rh-batch-help">Valide várias competências de uma só vez e importe somente os arquivos aprovados.</p></div><span class="status" id="rh-batch-status">—</span></div>'+
      '<div class="rh-batch-progress" id="rh-batch-progress" hidden><div id="rh-batch-progress-bar"></div></div>'+
      '<div class="table-wrap"><table class="rh-batch-table"><thead><tr><th>Arquivo</th><th>Empresa</th><th>Competência</th><th class="money">Pessoas</th><th>Status</th><th></th></tr></thead><tbody id="rh-batch-rows"></tbody></table></div>'+
      '<div class="preview-actions"><button class="button ghost" id="rh-batch-clear" type="button">Limpar seleção</button><button class="button primary import-only" id="rh-batch-confirm" type="button">Importar arquivos válidos</button></div>';
    preview.parentElement.insertBefore(box,preview);
    $('rh-batch-clear').onclick=clearBatch;
    $('rh-batch-confirm').onclick=confirmBatch;
    if(!document.getElementById('_rh_v16_batch_styles')){
      var st=document.createElement('style');st.id='_rh_v16_batch_styles';
      st.textContent='.rh-pdf-batch{margin-top:18px}.rh-batch-help{margin:.3rem 0 0;color:var(--muted);font-size:.78rem}.rh-batch-progress{height:6px;border-radius:999px;background:var(--surface-2);overflow:hidden;margin:12px 0 16px}.rh-batch-progress>div{height:100%;width:0;background:var(--gold);transition:width .2s ease}.rh-batch-table td,.rh-batch-table th{vertical-align:middle}.rh-batch-file{font-weight:750}.rh-batch-sub{display:block;color:var(--muted);font-size:.68rem;margin-top:2px}.rh-batch-remove{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:1rem}.rh-batch-remove:hover{color:var(--red)}.rh-batch-row-error{background:color-mix(in srgb,var(--red) 5%,transparent)}.rh-batch-row-ok{background:color-mix(in srgb,var(--emerald) 4%,transparent)}';
      document.head.appendChild(st);
    }
  }
  function setProgress(done,total,label){
    var wrap=$('rh-batch-progress'),bar=$('rh-batch-progress-bar'),status=$('rh-batch-status');
    if(wrap)wrap.hidden=!total;if(bar)bar.style.width=(total?Math.round(done/total*100):0)+'%';if(status)status.textContent=label||((done||0)+' de '+(total||0));
  }
  function itemStatus(it){
    if(it.imported)return {cls:'success',label:'Importado'};
    if(it.importing)return {cls:'',label:'Importando…'};
    if(it.error)return {cls:'error',label:'Revisar'};
    if(it.result)return {cls:'success',label:'Pronto'};
    return {cls:'',label:'Aguardando'};
  }
  function renderBatch(){
    ensureBatchUI();var box=$('rh-pdf-batch'),rows=$('rh-batch-rows'),btn=$('rh-batch-confirm');if(!box||!rows)return;
    box.hidden=!BATCH.items.length;
    rows.innerHTML=BATCH.items.map(function(it,i){var c=it.result&&it.result.competencia||{},s=itemStatus(it);return '<tr class="'+(it.error?'rh-batch-row-error':'rh-batch-row-ok')+'">'+
      '<td><span class="rh-batch-file">'+esc(it.file.name)+'</span><small class="rh-batch-sub">'+(it.file.size/1024/1024).toFixed(1).replace('.',',')+' MB</small></td>'+
      '<td>'+esc(c.empresa_codigo||'—')+'</td><td>'+esc(c.competencia?formatCompetence(c.competencia):'—')+'</td><td class="money">'+(it.result?nfmt((it.result.colaboradores||[]).length):'—')+'</td>'+
      '<td><span class="status '+s.cls+'">'+esc(s.label)+'</span>'+(it.error?'<small class="rh-batch-sub">'+esc(it.error)+'</small>':'')+'</td>'+
      '<td><button class="rh-batch-remove" type="button" data-rh-batch-remove="'+i+'" title="Remover arquivo">×</button></td></tr>';}).join('');
    Array.prototype.forEach.call(rows.querySelectorAll('[data-rh-batch-remove]'),function(b){b.onclick=function(){if(BATCH.busy)return;BATCH.items.splice(Number(this.dataset.rhBatchRemove),1);validateDuplicateCompetences();renderBatch();};});
    var ready=BATCH.items.filter(function(x){return x.result&&!x.error&&!x.imported;}).length;
    if(btn){btn.disabled=BATCH.busy||ready===0;btn.textContent=BATCH.busy?'Importando…':('Importar '+ready+' arquivo'+(ready===1?'':'s')+' válido'+(ready===1?'':'s'));}
    var status=$('rh-batch-status');if(status&&!BATCH.busy){var errors=BATCH.items.filter(function(x){return !!x.error;}).length;status.textContent=ready+' pronto'+(ready===1?'':'s')+(errors?' · '+errors+' revisar':'');status.className='status '+(errors?'':'success');}
  }
  function validateDuplicateCompetences(){
    var counts={};BATCH.items.forEach(function(it){if(it.result&&it.result.competencia&&it.result.competencia.competencia){var k=String(it.result.competencia.competencia).slice(0,7);counts[k]=(counts[k]||0)+1;}});
    BATCH.items.forEach(function(it){if(it._baseError){it.error=it._baseError;return;}var k=it.result&&it.result.competencia&&String(it.result.competencia.competencia||'').slice(0,7);it.error=(k&&counts[k]>1)?'Competência repetida dentro do lote. Mantenha apenas um PDF deste mês.':'';});
  }
  async function parseBatch(files){
    files=Array.prototype.slice.call(files||[]).filter(function(f){return f&&(/\.pdf$/i.test(f.name)||f.type==='application/pdf');});if(!files.length)return;
    ensureBatchUI();BATCH.items=files.map(function(file){return {file:file,result:null,error:'',_baseError:'',imported:false,importing:false};});BATCH.busy=true;renderBatch();
    try{await loadLibrary('pdf');for(var i=0;i<BATCH.items.length;i++){
      var it=BATCH.items[i];setProgress(i,BATCH.items.length,'Lendo '+(i+1)+' de '+BATCH.items.length);
      if(it.file.size>25*1024*1024){it._baseError=it.error='PDF acima do limite de 25 MB.';renderBatch();continue;}
      try{
        var result=await RHParser.extractPdf(it.file),comp=result&&result.competencia||{};comp.arquivo_nome=comp.arquivo_nome||it.file.name;
        if(!comp.empresa_codigo&&typeof rhImportCompanyCode==='function')comp.empresa_codigo=rhImportCompanyCode(comp);
        if(!comp.competencia||!(result.colaboradores||[]).length)throw new Error('Relatório não reconhecido ou sem colaboradores.');
        if(!comp.empresa_codigo)throw new Error('Código da empresa não identificado.');
        it.result=result;
      }catch(e){it._baseError=it.error=e&&e.message||'Falha ao processar PDF.';}
      validateDuplicateCompetences();renderBatch();
    }}finally{BATCH.busy=false;setProgress(BATCH.items.length,BATCH.items.length,'Pré-validação concluída');renderBatch();}
  }
  async function confirmBatch(){
    if(BATCH.busy)return;var ready=BATCH.items.filter(function(x){return x.result&&!x.error&&!x.imported;});if(!ready.length){toast('Nenhum PDF válido para importar.',true);return;}
    BATCH.busy=true;renderBatch();var ok=0,fail=0,lastId=null;
    for(var i=0;i<ready.length;i++){
      var it=ready[i];it.importing=true;renderBatch();setProgress(i,ready.length,'Importando '+(i+1)+' de '+ready.length);
      try{lastId=await rpc('rh_importar_folha',{p_payload:buildRpcPayload(it.result)});it.imported=true;ok++;}
      catch(e){it._baseError=it.error='Falha ao importar: '+(e&&e.message||'erro desconhecido');fail++;}
      finally{it.importing=false;renderBatch();}
    }
    BATCH.busy=false;setProgress(ready.length,ready.length,'Importação concluída');renderBatch();
    try{await loadCompetences(lastId||undefined);}catch(e){}
    if(ok)toast(ok+' competência'+(ok===1?'':'s')+' importada'+(ok===1?'':'s')+' com sucesso.'+(fail?' '+fail+' arquivo(s) precisam de revisão.':''),!!fail);else toast('Nenhum arquivo foi importado. Revise os erros do lote.',true);
    if(ok&&!fail)go('visao');
  }
  function clearBatch(){if(BATCH.busy)return;BATCH.items=[];setProgress(0,0,'—');renderBatch();var input=batchInput();if(input)input.value='';}
  function bindBatchInput(){
    ensureBatchUI();var input=batchInput();if(!input||input.dataset.rhBatchBound==='1')return;input.dataset.rhBatchBound='1';input.multiple=true;
    input.onchange=function(){var files=Array.prototype.slice.call(this.files||[]);this.value='';if(files.length<=1){clearBatch();if(files[0])handlePdf(files[0]);return;}S.preview=null;if($('import-preview'))$('import-preview').hidden=true;parseBatch(files).catch(function(e){BATCH.busy=false;renderBatch();toast('Não foi possível processar o lote: '+e.message,true);});};
  }
  var prevSetup=typeof setupUI==='function'?setupUI:null;if(prevSetup)setupUI=function(){var r=prevSetup.apply(this,arguments);bindBatchInput();return r;};
  document.addEventListener('DOMContentLoaded',bindBatchInput);setTimeout(bindBatchInput,0);
})();
/* RH & Folha — hotfix v18: consolidado global de todos os anos */
(function(){
  var _basePeriodLabel=rhPeriodLabel;
  rhPeriodLabel=function(){
    if(!RH_PERIOD.year){
      if(RH_PERIOD.month==='all')return 'Todos os anos · Todos os meses';
      return 'Todos os anos · mês '+RH_PERIOD.month;
    }
    return _basePeriodLabel();
  };

  rhPeriodPopulate=function(){
    var ys=$('rh-period-year'),ms=$('rh-period-month');if(!ys||!ms)return;
    var years=rhPeriodYears(),prevY=(RH_PERIOD.year!==undefined&&RH_PERIOD.year!==null)?String(RH_PERIOD.year):'',prevM=RH_PERIOD.month||'all';
    ys.innerHTML='<option value="">Todos os anos</option>'+years.map(function(y){return '<option value="'+esc(y)+'">'+esc(y)+'</option>';}).join('');
    ys.value=prevY;
    RH_PERIOD.year=prevY;
    var have=rhPeriodMonthsForYear(prevY),names=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    ms.innerHTML='<option value="all">Todos os meses</option>'+names.map(function(n,i){var mm=String(i+1).padStart(2,'0'),disabled=have[mm]?'':' disabled';return '<option value="'+mm+'"'+disabled+'>'+n+'</option>';}).join('');
    if(prevM!=='all'&&!have[prevM])prevM='all';
    RH_PERIOD.month=prevM;ms.value=prevM;
  };

  var _baseEnsure=rhPeriodEnsureUI;
  rhPeriodEnsureUI=function(){
    _baseEnsure();
    var ys=$('rh-period-year');
    if(ys&&!ys.dataset.rhAllYearsBound){
      ys.dataset.rhAllYearsBound='1';
      ys.onchange=function(){RH_PERIOD.year=this.value;RH_PERIOD.month='all';rhPeriodPopulate();rhPeriodLoad().catch(function(e){toast('Não foi possível consolidar o período: '+e.message,true);});};
    }
  };

  var _baseV14MonthList=typeof rhV14MonthList==='function'?rhV14MonthList:null;
  if(_baseV14MonthList)rhV14MonthList=function(comps){
    if(RH_PERIOD.year)return _baseV14MonthList(comps);
    return (comps||[]).map(function(c){return _rhPeriodBaseFormatCompetence(c.competencia);});
  };

  var _baseV14Render=typeof rhV14Render==='function'?rhV14Render:null;
  if(_baseV14Render)rhV14Render=function(){
    var r=_baseV14Render.apply(this,arguments),comps=rhV14ActiveCompetences(),years={};
    comps.forEach(function(c){var y=rhPeriodYear(c);if(y)years[y]=1;});
    if(!RH_PERIOD.year){
      var yc=Object.keys(years).length,coverage=$('rh-v14-coverage');
      if(coverage)coverage.textContent=comps.length+' competência'+(comps.length===1?'':'s')+' carregada'+(comps.length===1?'':'s')+' em '+yc+' ano'+(yc===1?'':'s');
      var months=$('rh-v14-months');if(months&&comps.length>8)months.textContent=_rhPeriodBaseFormatCompetence(comps[0].competencia)+' → '+_rhPeriodBaseFormatCompetence(comps[comps.length-1].competencia);
    }
    return r;
  };

  var _baseSetup=setupUI;
  setupUI=function(){var r=_baseSetup.apply(this,arguments);rhPeriodEnsureUI();rhPeriodPopulate();return r;};
})();
/* RH & Folha — hotfix v19: alinhamento consistente de colunas e totais em todos os popups */
(function(){
  function isNumericHeader(t){return /valor|total|provento|desconto|líquido|liquido|fgts|inss|pis|irrf|custo|benef|salário|salario|base|encargo|média|media|%|pessoas|quantidade|qtd/i.test(String(t||''));}
  function alignGrid(grid){
    if(!grid)return;var header=grid.querySelector('.rh-comp-header');if(!header)return;
    var heads=Array.prototype.map.call(header.children,function(x){return x.textContent.trim();});
    var template=getComputedStyle(header).gridTemplateColumns;
    if(!template||template==='none')template='repeat('+Math.max(1,heads.length)+',minmax(0,1fr))';
    Array.prototype.forEach.call(grid.querySelectorAll('.rh-comp-row'),function(row){
      row.style.setProperty('display','grid','important');row.style.setProperty('grid-template-columns',template,'important');row.style.setProperty('width','100%','important');row.style.setProperty('align-items','center','important');
      Array.prototype.forEach.call(row.children,function(cell,i){
        cell.style.setProperty('min-width','0','important');cell.style.setProperty('box-sizing','border-box','important');
        cell.style.setProperty('text-align',isNumericHeader(heads[i])?'right':'left','important');
        cell.style.setProperty('justify-self','stretch','important');
      });
    });
  }
  function alignTable(table){
    if(!table)return;var heads=Array.prototype.map.call(table.querySelectorAll('thead th'),function(x){return x.textContent.trim();});if(!heads.length)return;
    Array.prototype.forEach.call(table.querySelectorAll('tr'),function(row){Array.prototype.forEach.call(row.children,function(cell,i){cell.style.setProperty('text-align',isNumericHeader(heads[i])?'right':'left','important');cell.style.setProperty('vertical-align','middle','important');});});
  }
  function alignAll(root){root=root||document;Array.prototype.forEach.call(root.querySelectorAll('.rh-comp-table'),alignGrid);Array.prototype.forEach.call(root.querySelectorAll('.modal table,.rh-detail-card table,#rh-detail-modal table'),alignTable);}
  window.rhAlignPopupColumns=alignAll;
  var oldTotals=window.rhEnsurePopupTotals;if(typeof oldTotals==='function')window.rhEnsurePopupTotals=function(root){var r=oldTotals.apply(this,arguments);requestAnimationFrame(function(){alignAll(root||document);});return r;};
  var oldGeneric=window.openGenericDetail;if(typeof oldGeneric==='function')window.openGenericDetail=function(){var r=oldGeneric.apply(this,arguments);requestAnimationFrame(function(){alignAll(document);});return r;};
  var oldPerson=window.openPerson;if(typeof oldPerson==='function')window.openPerson=function(){var r=oldPerson.apply(this,arguments);requestAnimationFrame(function(){alignAll(document);});return r;};
  var mo=new MutationObserver(function(muts){if(muts.some(function(m){return m.type==='childList'||(m.type==='attributes'&&m.attributeName==='hidden');}))requestAnimationFrame(function(){alignAll(document);});});
  if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  if(!document.getElementById('_rh_v19_popup_columns')){var st=document.createElement('style');st.id='_rh_v19_popup_columns';st.textContent='.rh-comp-table{width:100%!important}.rh-comp-row{column-gap:0!important}.rh-comp-row>div{padding-left:14px!important;padding-right:14px!important}.rh-comp-header>div,.rh-comp-total>div{white-space:nowrap!important}.rh-comp-total{width:100%!important}.rh-comp-total .rh-comp-cell{font-variant-numeric:tabular-nums}';document.head.appendChild(st);}
  requestAnimationFrame(function(){alignAll(document);});
})();
/* RH & Folha — hotfix v20 revisado: uma única grade real para cabeçalho, corpo e totais */
(function(){
  'use strict';
  function arr(x){return Array.prototype.slice.call(x||[]);}
  function txt(el){return String(el&&el.textContent||'').replace(/\s+/g,' ').trim();}
  function numericHeader(h){return /valor|total|provento|desconto|líquido|liquido|fgts|inss|pis|irrf|custo|benef|salário|salario|base|encargo|rat|terceir|patronal|retido|média|media|%|pessoas|quantidade|qtd|ref\.?/i.test(String(h||''));}
  function parseValue(v){
    v=String(v==null?'':v).trim();if(!v||v==='—'||v==='-')return null;
    var money=/R\$/.test(v),pct=/%/.test(v),clean=v.replace(/[^0-9,.-]/g,'');if(!clean)return null;
    var n=Number(clean.replace(/\./g,'').replace(',','.'));if(!isFinite(n))return null;
    return {value:n,money:money,pct:pct};
  }
  function aggregate(values){
    var p=values.map(parseValue).filter(Boolean);if(!p.length)return null;
    if(p.some(function(x){return x.pct;})){
      var avg=p.reduce(function(a,x){return a+x.value;},0)/p.length;
      return 'Média '+avg.toFixed(1).replace('.',',')+'%';
    }
    var total=p.reduce(function(a,x){return a+x.value;},0),money=p.some(function(x){return x.money;});
    return money?fmt(total):nfmt(total);
  }
  function shouldAggregate(header,values){return numericHeader(header)||(values||[]).some(function(v){return /R\$|%/.test(String(v||''));});}
  function visibleCells(row){return arr(row&&row.children).filter(function(c){return getComputedStyle(c).display!=='none';});}
  function tableRows(table){
    return arr(table.querySelectorAll('tbody tr')).filter(function(row){
      if(row.classList.contains('group-total')||row.classList.contains('rh-auto-total')||row.classList.contains('rh-v20-total'))return false;
      var cells=visibleCells(row);if(!cells.length)return false;
      return !cells.some(function(c){return Number(c.getAttribute('colspan')||1)>1;});
    });
  }
  function widthsFor(n){
    if(n>=7)return [30].concat(Array(n-1).fill(70/(n-1)));
    if(n===6)return [31,13.8,13.8,13.8,13.8,13.8];
    if(n===5)return [34,16.5,16.5,16.5,16.5];
    if(n===4)return [40,20,20,20];
    if(n===3)return [44,28,28];
    if(n===2)return [58,42];
    return [100];
  }
  function tableSignature(table,heads,rows){return heads.join('|')+'::'+rows.map(function(r){return visibleCells(r).map(txt).join('|');}).join('||');}
  function setTableGrid(table,heads){
    var n=heads.length,widths=widthsFor(n);
    table.style.setProperty('width','100%','important');
    table.style.setProperty('table-layout','fixed','important');
    table.style.setProperty('border-collapse','collapse','important');
    if(n>=5)table.style.setProperty('min-width',Math.max(900,n*150)+'px','important');else table.style.removeProperty('min-width');
    arr(table.querySelectorAll('colgroup.rh-v20-cols')).forEach(function(x){x.remove();});
    var cg=document.createElement('colgroup');cg.className='rh-v20-cols';
    widths.forEach(function(w){var col=document.createElement('col');col.style.width=w+'%';cg.appendChild(col);});
    table.insertBefore(cg,table.firstChild);
    arr(table.querySelectorAll('tr')).forEach(function(row){
      var cells=visibleCells(row);cells.forEach(function(cell,i){
        cell.style.setProperty('width','auto','important');cell.style.setProperty('min-width','0','important');cell.style.setProperty('box-sizing','border-box','important');cell.style.setProperty('vertical-align','middle','important');
        cell.style.setProperty('padding-left','12px','important');cell.style.setProperty('padding-right','12px','important');
        cell.style.setProperty('text-align',(i>0&&numericHeader(heads[i]))?'right':'left','important');
        if(i>0&&numericHeader(heads[i]))cell.style.setProperty('font-variant-numeric','tabular-nums','important');
      });
    });
    var card=table.closest('.modal-card,.rh-detail-card');if(card){var width=n>=6?'min(1420px,98vw)':(n>=5?'min(1240px,98vw)':'min(980px,96vw)');card.style.setProperty('width',width,'important');card.style.setProperty('max-width',width,'important');}
  }
  function rebuildTable(table){
    if(!table)return;var headCells=arr(table.querySelectorAll('thead tr:first-child th')).filter(function(c){return getComputedStyle(c).display!=='none';});
    var heads=headCells.map(txt);if(!heads.length)return;var rows=tableRows(table);if(!rows.length){setTableGrid(table,heads);return;}
    var sig=tableSignature(table,heads,rows),existing=table.querySelector('tfoot.rh-v20-foot');
    if(table.dataset.rhV20Signature===sig&&existing){setTableGrid(table,heads);return;}
    table.dataset.rhV20Signature=sig;arr(table.querySelectorAll('tfoot')).forEach(function(x){x.remove();});
    var foot=document.createElement('tfoot');foot.className='rh-v20-foot';var tr=document.createElement('tr');tr.className='rh-v20-total';
    heads.forEach(function(h,i){var td=document.createElement('td');if(i===0){td.innerHTML='<b>TOTAL</b><small>'+rows.length+' linha'+(rows.length===1?'':'s')+'</small>';}
      else{var values=rows.map(function(r){return txt(visibleCells(r)[i]);}),ag=shouldAggregate(h,values)?aggregate(values):null;td.innerHTML='<b>'+(ag?esc(ag):'—')+'</b>';}
      tr.appendChild(td);});
    foot.appendChild(tr);table.appendChild(foot);setTableGrid(table,heads);
  }
  function gridRows(grid){return arr(grid.querySelectorAll('.rh-comp-row')).filter(function(r){return !r.classList.contains('rh-comp-header')&&!r.classList.contains('rh-comp-total')&&!r.classList.contains('rh-v20-total');});}
  function gridSignature(heads,rows){return heads.join('|')+'::'+rows.map(function(r){return visibleCells(r).map(txt).join('|');}).join('||');}
  function rebuildGrid(grid){
    if(!grid)return;var header=grid.querySelector('.rh-comp-header');if(!header)return;var headCells=visibleCells(header),heads=headCells.map(txt),n=heads.length;if(!n)return;
    var widths=widthsFor(n),template=widths.map(function(w){return 'minmax(0,'+w+'fr)';}).join(' '),rows=gridRows(grid);if(!rows.length)return;
    var sig=gridSignature(heads,rows),total=grid.querySelector('.rh-v20-total');
    if(grid.dataset.rhV20Signature!==sig||!total){
      grid.dataset.rhV20Signature=sig;arr(grid.querySelectorAll('.rh-comp-total,.rh-v20-total')).forEach(function(x){x.remove();});
      total=document.createElement('div');total.className='rh-comp-row rh-comp-total rh-v20-total';
      heads.forEach(function(h,i){var c=document.createElement('div');c.className='rh-comp-cell';if(i===0)c.innerHTML='<b>TOTAL</b><small>'+rows.length+' linha'+(rows.length===1?'':'s')+'</small>';else{var vals=rows.map(function(r){return txt(visibleCells(r)[i]);}),ag=shouldAggregate(h,vals)?aggregate(vals):null;c.innerHTML='<b>'+(ag?esc(ag):'—')+'</b>';}total.appendChild(c);});grid.appendChild(total);
    }
    var all=[header].concat(rows,[total]);all.forEach(function(row){
      row.style.setProperty('display','grid','important');row.style.setProperty('grid-template-columns',template,'important');row.style.setProperty('column-gap','0','important');row.style.setProperty('width','100%','important');row.style.setProperty('box-sizing','border-box','important');
      visibleCells(row).forEach(function(c,i){c.style.setProperty('width','auto','important');c.style.setProperty('min-width','0','important');c.style.setProperty('box-sizing','border-box','important');c.style.setProperty('padding-left','12px','important');c.style.setProperty('padding-right','12px','important');c.style.setProperty('text-align',(i>0&&numericHeader(heads[i]))?'right':'left','important');if(i>0&&numericHeader(heads[i]))c.style.setProperty('font-variant-numeric','tabular-nums','important');});
    });
    var card=grid.closest('.modal-card,.rh-detail-card');if(card){var width=n>=6?'min(1420px,98vw)':(n>=5?'min(1240px,98vw)':'min(980px,96vw)');card.style.setProperty('width',width,'important');card.style.setProperty('max-width',width,'important');}
  }
  function fixAll(root){root=root||document;arr(root.querySelectorAll('.modal:not([hidden]) table,#rh-detail-modal:not([hidden]) table,.rh-detail-card table')).forEach(rebuildTable);arr(root.querySelectorAll('.modal:not([hidden]) .rh-comp-table,#rh-detail-modal:not([hidden]) .rh-comp-table,.rh-detail-card .rh-comp-table')).forEach(rebuildGrid);}
  window.rhV20FixAllPopupTotals=fixAll;
  var queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;fixAll(document);});}
  var mo=new MutationObserver(function(ms){if(ms.some(function(m){return m.type==='childList'||(m.type==='attributes'&&m.attributeName==='hidden');}))schedule();});
  if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  document.addEventListener('click',function(){setTimeout(schedule,0);},true);
  if(!document.getElementById('_rh_v20_popup_totals')){var st=document.createElement('style');st.id='_rh_v20_popup_totals';st.textContent='\
.modal table tfoot,.modal-table-inner tfoot,.responsive-table tfoot,.rh-detail-card table tfoot{position:static!important;display:table-footer-group!important;width:auto!important}\
.modal table tfoot td,.modal-table-inner tfoot td,.rh-detail-card table tfoot td{position:static!important;background:var(--surface)!important;border-top:2px solid var(--gold)!important;box-shadow:none!important;white-space:nowrap!important}\
.rh-v20-total td small,.rh-v20-total .rh-comp-cell small{display:block!important;color:var(--muted)!important;font-size:9px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.04em!important;margin-top:2px!important}\
.rh-v20-total td b,.rh-v20-total .rh-comp-cell b{display:block!important;font-variant-numeric:tabular-nums!important;white-space:nowrap!important}\
.rh-comp-table{overflow-x:auto!important;width:100%!important}.rh-comp-header,.rh-comp-row{column-gap:0!important}.rh-comp-header>div,.rh-comp-row>div{min-width:0!important;box-sizing:border-box!important}\
';document.head.appendChild(st);}
  schedule();
})();
/* RH & Folha — hotfix v21 revisado: mês apenas para competência única; múltiplas competências = Consolidado */
(function(){
  'use strict';
  function active(){return (window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(typeof rhPeriodSelectedCompetences==='function'?rhPeriodSelectedCompetences():[])).slice();}
  function compLabel(c){try{return _rhPeriodBaseFormatCompetence?_rhPeriodBaseFormatCompetence(c.competencia):formatCompetence(c.competencia);}catch(e){return String(c&&c.competencia||'').slice(0,7);}}
  function referenceLabel(){var a=active();if(a.length===1)return compLabel(a[0]);if(a.length>1)return 'Consolidado';return '—';}
  function stamp(modal){
    if(!modal||modal.hidden)return;var card=modal.querySelector('.modal-card,.rh-detail-card')||modal,head=card.querySelector('.modal-head,.rh-detail-head,.detail-head');if(!head)return;
    var oldBand=card.querySelector('.rh-v21-period-band');if(oldBand)oldBand.style.display='none';
    var chip=head.querySelector('.rh-period-chip-modal');if(!chip){chip=document.createElement('span');chip.className='rh-period-chip-modal';var target=head.querySelector('div')||head;target.appendChild(chip);}var text='Referência: '+referenceLabel();if(chip.textContent!==text)chip.textContent=text;
  }
  function fix(root){root=root||document;Array.prototype.forEach.call(root.querySelectorAll('.modal:not([hidden]),#rh-detail-modal:not([hidden])'),stamp);if(typeof window.rhV20FixAllPopupTotals==='function')window.rhV20FixAllPopupTotals(root);}
  window.rhV21ApplyPopupPeriodReferences=fix;
  var queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;fix(document);});}
  var mo=new MutationObserver(function(m){if(m.some(function(x){return x.type==='childList'||(x.type==='attributes'&&x.attributeName==='hidden');}))schedule();});
  if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  document.addEventListener('click',function(){setTimeout(schedule,0);},true);
  if(!document.getElementById('_rh_v21_period_refs')){var st=document.createElement('style');st.id='_rh_v21_period_refs';st.textContent='.rh-v21-period-band,.rh-v21-ref-head,.rh-v21-ref-cell{display:none!important}.rh-period-chip-modal{white-space:nowrap}';document.head.appendChild(st);}
  schedule();
})();
/* RH & Folha — hotfix v22: composição individual consolidada com referência explícita de competência */
(function(){
  'use strict';
  function compMap(){var m={};(S.competencias||[]).forEach(function(c){m[String(c.id)]=c;});return m;}
  function compLabelById(id){var c=compMap()[String(id)];if(!c)return '—';try{return _rhPeriodBaseFormatCompetence(c.competencia);}catch(e){try{return formatCompetence(c.competencia);}catch(_){return String(c.competencia||'').slice(0,7);}}}
  function isMulti(){return !!(window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length>1);}
  function typeIs(x,t){var v=String(x&&x.tipo||'').toLowerCase();return t==='P'?(v==='p'||v==='provento'):(v==='d'||v==='desconto');}
  function sortLancs(a,b){var ca=String(a.competencia_id||''),cb=String(b.competencia_id||'');var ma=compMap()[ca],mb=compMap()[cb],da=String(ma&&ma.competencia||''),db=String(mb&&mb.competencia||'');if(da!==db)return da.localeCompare(db);return String(a.rubrica_codigo||a.codigo||'').localeCompare(String(b.rubrica_codigo||b.codigo||''));}
  function groupByComp(rows){var g={};(rows||[]).forEach(function(x){var k=String(x.competencia_id||'');(g[k]||(g[k]=[])).push(x);});return g;}
  function sum(rows){return (rows||[]).reduce(function(a,x){return a+(Number(x.valor)||0);},0);}
  function monthRows(rows,kind){var groups=groupByComp(rows),ids=Object.keys(groups).sort(function(a,b){var ca=compMap()[a],cb=compMap()[b];return String(ca&&ca.competencia||'').localeCompare(String(cb&&cb.competencia||''));}),html='';ids.forEach(function(cid){var rs=groups[cid].slice().sort(sortLancs),label=compLabelById(cid),sub=sum(rs);html+='<tr class="group-head rh-v22-month-head"><td colspan="5"><b>'+esc(label)+'</b><span>'+esc(kind)+'</span><strong>'+fmt(sub)+'</strong></td></tr>';rs.forEach(function(x){html+='<tr><td><span class="rh-v22-comp">'+esc(label)+'</span></td><td><b>'+esc((x.rubrica_codigo||x.codigo||'')+' '+(x.rubrica_nome||x.nome||''))+'</b></td><td class="money">'+nfmt(x.referencia)+'</td><td>'+esc(x.nota||x.observacao||'')+'</td><td class="money">'+fmt(x.valor)+'</td></tr>';});});return html;}
  function monthlyPayrollForPerson(p){var rows=(S.folhas||[]).filter(function(f){return String(f.colaborador_id)===String(p.id||p.colaborador_id);});var cm=compMap();return rows.slice().sort(function(a,b){return String(cm[a.competencia_id]&&cm[a.competencia_id].competencia||'').localeCompare(String(cm[b.competencia_id]&&cm[b.competencia_id].competencia||''));});}
  function monthlySummaryRows(p){var fs=monthlyPayrollForPerson(p);if(!fs.length)return '';return '<section class="rh-v22-month-summary"><div class="rh-v22-summary-title"><b>Resumo por competência</b><small>Valores que formam o consolidado individual</small></div><div class="table-wrap"><table class="modal-table-inner rh-v22-summary-table"><thead><tr><th>Competência</th><th class="money">Proventos</th><th class="money">Descontos</th><th class="money">Líquido</th><th class="money">Base INSS</th><th class="money">FGTS</th><th class="money">IRRF</th></tr></thead><tbody>'+fs.map(function(f){return '<tr><td><b>'+esc(compLabelById(f.competencia_id))+'</b></td><td class="money">'+fmt(f.proventos)+'</td><td class="money">'+fmt(f.descontos)+'</td><td class="money">'+fmt(f.liquido)+'</td><td class="money">'+fmt(f.base_inss)+'</td><td class="money">'+fmt(f.valor_fgts)+'</td><td class="money">'+fmt(f.valor_irrf)+'</td></tr>';}).join('')+'</tbody></table></div></section>';}
  var previous=window.openPerson;if(typeof previous!=='function')return;
  window.openPerson=function(id){var p=S.pessoas.find(function(x){return String(x.id)===String(id);});if(!p)return previous.apply(this,arguments);previous.apply(this,arguments);if(!isMulti())return;var modal=$('employee-modal'),tbody=$('employee-modal-rows');if(!modal||!tbody)return;var table=tbody.closest('table'),thead=table&&table.querySelector('thead tr');if(!thead)return;thead.innerHTML='<th>Competência</th><th>Rubrica</th><th class="money">Ref.</th><th>Nota</th><th class="money">Valor</th>';var lancs=(p.lancamentos||[]).slice(),provs=lancs.filter(function(x){return typeIs(x,'P');}),descs=lancs.filter(function(x){return typeIs(x,'D');});var html='';if(lancs.length){html+='<tr class="group-head rh-v22-section"><td colspan="5">PROVENTOS — TOTAL '+fmt(sum(provs))+'</td></tr>'+monthRows(provs,'Proventos');html+='<tr class="group-total"><td colspan="4"><b>Total de proventos no período</b></td><td class="money"><b>'+fmt(sum(provs))+'</b></td></tr>';html+='<tr class="group-head rh-v22-section"><td colspan="5">DESCONTOS — TOTAL '+fmt(sum(descs))+'</td></tr>'+monthRows(descs,'Descontos');html+='<tr class="group-total"><td colspan="4"><b>Total de descontos no período</b></td><td class="money"><b>'+fmt(sum(descs))+'</b></td></tr>';html+='<tr class="group-total destaque"><td colspan="4"><b>Líquido consolidado do período</b></td><td class="money"><b>'+fmt(Number(p.liquido)||0)+'</b></td></tr>';}else html=emptyRow(5,'Sem rubricas individuais disponíveis.');tbody.innerHTML=html;var old=modal.querySelector('.rh-v22-month-summary');if(old)old.remove();var summary=document.createElement('div');summary.innerHTML=monthlySummaryRows(p);if(summary.firstChild){var target=table.closest('.table-wrap')||table;target.parentNode.insertBefore(summary.firstChild,target);}if(typeof window.rhV21ApplyPopupPeriodReferences==='function')window.rhV21ApplyPopupPeriodReferences(modal);if(typeof window.rhV20FixAllPopupTotals==='function')window.rhV20FixAllPopupTotals(modal);};
  if(!document.getElementById('_rh_v22_person_months')){var st=document.createElement('style');st.id='_rh_v22_person_months';st.textContent='.rh-v22-month-summary{padding:14px 16px 4px;border-top:1px solid var(--line-soft);background:color-mix(in srgb,var(--surface-2) 78%,transparent)}.rh-v22-summary-title{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:8px}.rh-v22-summary-title small{color:var(--muted)}.rh-v22-summary-table{min-width:820px!important}.rh-v22-month-head td{display:grid!important;grid-template-columns:110px 1fr auto;align-items:center;gap:12px;background:color-mix(in srgb,var(--gold) 7%,var(--surface-2))!important}.rh-v22-month-head span{color:var(--muted);font-size:10px;text-transform:uppercase}.rh-v22-month-head strong{text-align:right}.rh-v22-comp{display:inline-flex;padding:3px 7px;border-radius:999px;border:1px solid var(--line-soft);color:var(--gold-2);font-weight:800;white-space:nowrap}.rh-v22-section td{color:var(--gold-2)!important;font-weight:900!important;letter-spacing:.04em}#employee-modal table{min-width:900px!important}';document.head.appendChild(st);}
})();
/* RH & Folha — hotfix v23: competência por rubrica nos popups de Colaboradores e Folha Mensal */
(function(){
  'use strict';
  function compById(id){return (S.competencias||[]).find(function(c){return String(c.id)===String(id);})||null;}
  function activeComps(){return (window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(typeof rhPeriodSelectedCompetences==='function'?rhPeriodSelectedCompetences():[])).slice();}
  function compLabel(id){
    var c=compById(id),a=activeComps();if(!c&&a.length===1)c=a[0];
    if(!c)return a.length>1?'Consolidado':'—';
    try{return _rhPeriodBaseFormatCompetence?_rhPeriodBaseFormatCompetence(c.competencia):formatCompetence(c.competencia);}catch(e){return String(c.competencia||'').slice(0,7);}
  }
  function detailView(){return S.view==='colaboradores'||S.view==='folha';}
  function rowType(x,t){var v=String(x&&x.tipo||'').toLowerCase();return t==='P'?(v==='p'||v==='provento'):(v==='d'||v==='desconto');}
  function rubrRow(x){
    return '<tr class="rh-v23-rubric-row"><td><b>'+esc((x.rubrica_codigo||x.codigo||'')+' '+(x.rubrica_nome||x.nome||''))+'</b></td>'
      +'<td class="rh-v23-comp"><span>'+esc(compLabel(x.competencia_id))+'</span></td>'
      +'<td class="money">'+nfmt(x.referencia)+'</td><td>'+esc(x.nota||x.observacao||'')+'</td><td class="money">'+fmt(x.valor)+'</td></tr>';
  }
  function rebuild(id){
    if(!detailView())return;var p=(S.pessoas||[]).find(function(x){return String(x.id)===String(id)||String(x.colaborador_id)===String(id);});if(!p)return;
    var tbody=$('employee-modal-rows'),modal=$('employee-modal');if(!tbody||!modal||modal.hidden)return;var table=tbody.closest('table'),thead=table&&table.querySelector('thead tr');if(!thead)return;
    thead.innerHTML='<th>Rubrica</th><th>Competência</th><th class="money">Ref.</th><th>Nota</th><th class="money">Valor</th>';
    var lancs=(p.lancamentos||[]).slice(),provs=lancs.filter(function(x){return rowType(x,'P');}),descs=lancs.filter(function(x){return rowType(x,'D');});
    var sumProv=provs.reduce(function(a,x){return a+(Number(x.valor)||0);},0),sumDesc=descs.reduce(function(a,x){return a+(Number(x.valor)||0);},0),liquido=Number(p.liquido)||0,enc=typeof rhEmployerCharges==='function'?rhEmployerCharges(p):{itens:[],total:0};
    var ref=activeComps().length===1?compLabel(activeComps()[0].id):'Consolidado',html='';
    if(lancs.length){
      html+='<tr class="group-head"><td colspan="5">Proventos</td></tr>'+provs.map(rubrRow).join('')
        +'<tr class="group-total"><td colspan="4"><b>Subtotal proventos</b></td><td class="money"><b>'+fmt(sumProv)+'</b></td></tr>';
      html+='<tr class="group-head"><td colspan="5">Descontos</td></tr>'+descs.map(rubrRow).join('')
        +'<tr class="group-total"><td colspan="4"><b>Subtotal descontos</b></td><td class="money"><b>'+fmt(sumDesc)+'</b></td></tr>';
      html+='<tr class="group-total destaque"><td colspan="4"><b>Líquido a receber</b></td><td class="money"><b>'+fmt(liquido)+'</b></td></tr>';
      html+='<tr class="group-head"><td colspan="5">Encargos patronais</td></tr>';
      (enc.itens||[]).forEach(function(it){html+='<tr><td>'+esc(it[0])+'</td><td class="rh-v23-comp"><span>'+esc(ref)+'</span></td><td></td><td><small>'+esc(it[2]||'')+'</small></td><td class="money">'+fmt(it[1])+'</td></tr>';});
      html+='<tr class="group-total"><td colspan="4"><b>Total encargos patronais</b></td><td class="money"><b>'+fmt(enc.total||0)+'</b></td></tr>';
    }else html=emptyRow(5,'Sem rubricas individuais disponíveis.');
    tbody.innerHTML=html;
    if(typeof window.rhV20FixAllPopupTotals==='function')window.rhV20FixAllPopupTotals(modal);
    if(typeof window.rhV21ApplyPopupPeriodReferences==='function')window.rhV21ApplyPopupPeriodReferences(modal);
  }
  var previous=window.openPerson;if(typeof previous==='function')window.openPerson=function(id){var r=previous.apply(this,arguments);setTimeout(function(){rebuild(id);},0);return r;};
  if(!document.getElementById('_rh_v23_comp_popup')){var st=document.createElement('style');st.id='_rh_v23_comp_popup';st.textContent='.rh-v23-comp span{display:inline-flex;padding:3px 7px;border:1px solid var(--line-soft);border-radius:999px;color:var(--muted);font-size:10px;font-weight:800;white-space:nowrap}#employee-modal table{min-width:920px!important}';document.head.appendChild(st);}
})();
/* RH & Folha — hotfix v24: Planejamento & Provisões (13º, férias, próxima folha e rescisões) */
(function(){
  'use strict';
  var PLAN={lastTermination:null};
  function arr(x){return Array.prototype.slice.call(x||[]);}
  function asDate(v){if(!v)return null;var d=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(d.getTime())?null:d;}
  function iso(d){return d?d.toISOString().slice(0,10):'';}
  function money(v){return typeof fmt==='function'?fmt(v):new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);}
  function num(v){return typeof nfmt==='function'?nfmt(v):new Intl.NumberFormat('pt-BR').format(Number(v)||0);}
  function clt(p){try{return rhVinculoCategory(p)==='clt';}catch(e){return /clt|celet/i.test(String(p&&p.vinculo||''));}}
  function currentActive(){return (window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(S.competencia?[S.competencia]:[])).slice().sort(function(a,b){return String(a.competencia||'').localeCompare(String(b.competencia||''));});}
  function latestComp(){var a=currentActive();return a[a.length-1]||null;}
  function anchorDate(){var c=latestComp(),d=asDate(c&&c.competencia);if(d){d=new Date(d.getFullYear(),d.getMonth()+1,0,12);return d;}return new Date();}
  function nextCompetence(){var d=anchorDate(),n=new Date(d.getFullYear(),d.getMonth()+1,1,12);return String(n.getMonth()+1).padStart(2,'0')+'/'+n.getFullYear();}
  function personKey(p){return String(p&&p.colaborador_id||p&&p.id||'');}
  function latestPayrollRows(){
    var comps=currentActive(),order={};comps.forEach(function(c){order[String(c.id)]=String(c.competencia||'');});var by={};
    (S.folhas||[]).forEach(function(f){var k=String(f.colaborador_id||''),cur=by[k],d=order[String(f.competencia_id)]||'';if(!cur||d>(order[String(cur.competencia_id)]||''))by[k]=f;});
    return by;
  }
  function planPeople(){
    var latest=latestPayrollRows(),meta={};(S.colaboradores||[]).forEach(function(c){meta[String(c.id)]=c;});
    var src=(S.pessoas||[]),seen={};return src.map(function(p){var k=personKey(p),f=latest[k],m=meta[k]||{};var out=Object.assign({},m,p,f||{});out.id=k;out.colaborador_id=k;seen[k]=1;return out;}).filter(function(p){return p.id;});
  }
  function rates(){
    var e=(S.competencia&&S.competencia.encargos)||{},base=Number(e.base_total_inss)||0;
    var rat=base>0&&Number(e.rat)>0?Number(e.rat)/base:.01;
    var third=base>0&&Number(e.terceiros)>0?Number(e.terceiros)/base:.058;
    var pis=base>0&&Number(e.valor_pis)>0?Number(e.valor_pis)/base:.01;
    return {fgts:.08,inss:.20,rat:rat,terceiros:third,pis:pis,total:.08+.20+rat+third+pis};
  }
  function fullMonthsWith15Days(year,adm,dem,throughMonth){
    var count=0;adm=asDate(adm);dem=asDate(dem);throughMonth=Math.max(1,Math.min(12,throughMonth||12));
    for(var m=0;m<throughMonth;m++){
      var start=new Date(year,m,1,12),end=new Date(year,m+1,0,12),s=start,e=end;if(adm&&adm>s)s=adm;if(dem&&dem<e)e=dem;if(e<s)continue;var days=Math.floor((e-s)/86400000)+1;if(days>=15)count++;
    }return count;
  }
  function serviceYears(adm,end){adm=asDate(adm);end=asDate(end);if(!adm||!end||end<adm)return 0;var y=end.getFullYear()-adm.getFullYear();var ann=new Date(end.getFullYear(),adm.getMonth(),adm.getDate(),12);if(end<ann)y--;return Math.max(0,y);}
  function vacationAvo(adm,end){
    adm=asDate(adm);end=asDate(end);if(!adm||!end||end<adm)return 0;var ann=new Date(end.getFullYear(),adm.getMonth(),adm.getDate(),12);if(ann>end)ann.setFullYear(ann.getFullYear()-1);if(ann<adm)ann=adm;var count=0,cursor=new Date(ann.getFullYear(),ann.getMonth(),ann.getDate(),12);
    while(cursor<=end&&count<12){var next=new Date(cursor.getFullYear(),cursor.getMonth()+1,cursor.getDate(),12),periodEnd=new Date(next.getTime()-86400000);if(periodEnd>end)periodEnd=end;var days=Math.floor((periodEnd-cursor)/86400000)+1;if(days>=15)count++;cursor=next;}return Math.min(12,count);
  }
  function thirteenthPaid(p,year){
    var sum=0;(p.lancamentos||[]).forEach(function(l){var name=String((l.rubrica_codigo||l.codigo||'')+' '+(l.rubrica_nome||l.nome||''));if(!/13.?\s*(sal|sal[aá]rio)|d[eé]cimo\s*terceiro/i.test(name))return;var cid=String(l.competencia_id||''),c=(S.competencias||[]).find(function(x){return String(x.id)===cid;});if(c&&String(c.competencia||'').slice(0,4)!==String(year))return;if(String(l.tipo||'').toLowerCase()==='d'||String(l.tipo||'').toLowerCase()==='desconto')return;sum+=Number(l.valor)||0;});return sum;
  }
  function calc13(){
    var a=anchorDate(),year=a.getFullYear(),month=a.getMonth()+1,r=rates();return planPeople().filter(clt).map(function(p){var sal=Number(p.salario)||0,avos=fullMonthsWith15Days(year,p.admissao,p.demissao||p.desligamento,month),gross=sal/12*avos,monthly=sal/12,paid=thirteenthPaid(p,year),balance=Math.max(0,gross-paid),charges=balance*r.total;return {id:p.id,nome:p.nome||'—',departamento:departmentName(p.departamento),salario:sal,avos:avos,mensal:monthly,provisionado:gross,pago:paid,saldo:balance,encargos:charges,total:balance+charges};}).sort(function(a,b){return b.total-a.total;});
  }
  function calcVacations(){
    var a=anchorDate(),r=rates();return planPeople().filter(clt).map(function(p){var sal=Number(p.salario)||0,avos=vacationAvo(p.admissao,a),base=sal/12*avos,third=base/3,gross=base+third,charges=gross*r.total;return {id:p.id,nome:p.nome||'—',departamento:departmentName(p.departamento),salario:sal,avos:avos,base:base,terco:third,provisao:gross,encargos:charges,total:gross+charges};}).sort(function(a,b){return b.total-a.total;});
  }
  function benefitFor(p){try{var b=rhPersonBenefit(p)||{};return (Number(b.seguro_vida)||0)+(Number(b.assistencia_medica||b.assist_medica)||0)+(Number(b.vr_caixa)||0)+(Number(b.vale_transporte)||0);}catch(e){return 0;}}
  function forecastRows(){
    var pct=Number(($('rh-plan-adjust')||{}).value)||0,mult=1+pct/100,r=rates();return planPeople().map(function(p){var prov=(Number(p.proventos)||Number(p.salario)||0)*mult,disc=Number(p.descontos)||0,liq=Math.max(0,prov-disc),base=Number(p.base_inss)||prov,fgts=(Number(p.valor_fgts)||base*.08)*mult,enc=base*mult*(r.inss+r.rat+r.terceiros+r.pis),ben=benefitFor(p),cost=prov+fgts+enc+ben;return {id:p.id,nome:p.nome||'—',departamento:departmentName(p.departamento),proventos:prov,descontos:disc,liquido:liq,encargos:fgts+enc,beneficios:ben,custo:cost};}).sort(function(a,b){return b.custo-a.custo;});
  }
  function sumRows(rows,key){return rows.reduce(function(a,x){return a+(Number(x[key])||0);},0);}
  function kpi(label,value,small,cls){return '<div class="kpi '+(cls||'')+'"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(small||'')+'</small></div>';}
  function table13(rows){return '<div class="table-wrap"><table><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Salário</th><th class="money">Avos</th><th class="money">Provisão acumulada</th><th class="money">Já pago</th><th class="money">Saldo</th><th class="money">Encargos estimados</th><th class="money">Custo provisionado</th></tr></thead><tbody>'+rows.map(function(x){return '<tr><td><b>'+esc(x.nome)+'</b></td><td>'+esc(x.departamento)+'</td><td class="money">'+money(x.salario)+'</td><td class="money">'+x.avos+'/12</td><td class="money">'+money(x.provisionado)+'</td><td class="money">'+money(x.pago)+'</td><td class="money"><b>'+money(x.saldo)+'</b></td><td class="money">'+money(x.encargos)+'</td><td class="money"><b>'+money(x.total)+'</b></td></tr>';}).join('')+'</tbody><tfoot><tr><td><b>TOTAL</b></td><td></td><td></td><td></td><td class="money"><b>'+money(sumRows(rows,'provisionado'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'pago'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'saldo'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'encargos'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'total'))+'</b></td></tr></tfoot></table></div>';}
  function tableVac(rows){return '<div class="table-wrap"><table><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Avos estimados</th><th class="money">Férias</th><th class="money">1/3</th><th class="money">Provisão</th><th class="money">Encargos estimados</th><th class="money">Custo provisionado</th></tr></thead><tbody>'+rows.map(function(x){return '<tr><td><b>'+esc(x.nome)+'</b></td><td>'+esc(x.departamento)+'</td><td class="money">'+x.avos+'/12</td><td class="money">'+money(x.base)+'</td><td class="money">'+money(x.terco)+'</td><td class="money">'+money(x.provisao)+'</td><td class="money">'+money(x.encargos)+'</td><td class="money"><b>'+money(x.total)+'</b></td></tr>';}).join('')+'</tbody><tfoot><tr><td><b>TOTAL</b></td><td></td><td></td><td class="money"><b>'+money(sumRows(rows,'base'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'terco'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'provisao'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'encargos'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'total'))+'</b></td></tr></tfoot></table></div>';}
  function tableForecast(rows){return '<div class="table-wrap"><table><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Proventos previstos</th><th class="money">Descontos base</th><th class="money">Líquido previsto</th><th class="money">Encargos</th><th class="money">Benefícios</th><th class="money">Custo previsto</th></tr></thead><tbody>'+rows.map(function(x){return '<tr><td><b>'+esc(x.nome)+'</b></td><td>'+esc(x.departamento)+'</td><td class="money">'+money(x.proventos)+'</td><td class="money">'+money(x.descontos)+'</td><td class="money">'+money(x.liquido)+'</td><td class="money">'+money(x.encargos)+'</td><td class="money">'+money(x.beneficios)+'</td><td class="money"><b>'+money(x.custo)+'</b></td></tr>';}).join('')+'</tbody><tfoot><tr><td><b>TOTAL</b></td><td></td><td class="money"><b>'+money(sumRows(rows,'proventos'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'descontos'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'liquido'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'encargos'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'beneficios'))+'</b></td><td class="money"><b>'+money(sumRows(rows,'custo'))+'</b></td></tr></tfoot></table></div>';}
  function ensurePage(){
    if($('page-planejamento'))return;
    var nav=$('nav'),cfg=nav&&nav.querySelector('[data-view="configuracoes"]'),btn=document.createElement('button');btn.className='nav-item';btn.dataset.view='planejamento';btn.innerHTML='<span>◫</span>Planejamento & Provisões';if(nav)nav.insertBefore(btn,cfg||null);
    var main=document.querySelector('#app main.content');if(!main)return;var page=document.createElement('section');page.className='page';page.id='page-planejamento';page.innerHTML='\
      <div class="page-head"><div><span class="eyebrow">PLANEJAMENTO FINANCEIRO DE PESSOAS</span><h1>Planejamento & Provisões</h1><p>Antecipe 13º, férias, próxima folha e cenários de desligamento com base no histórico importado.</p></div><div class="head-actions"><button class="button ghost export-only" id="rh-plan-export">Exportar planejamento</button></div></div>\
      <div class="rh-plan-warning"><b>Estimativa gerencial</b><span>As simulações não substituem o cálculo oficial da folha, a conferência contábil ou a validação trabalhista. Parâmetros devem ser revisados antes de qualquer pagamento.</span></div>\
      <div class="rh-plan-tabs"><button class="active" data-plan-tab="13">13º salário</button><button data-plan-tab="ferias">Férias</button><button data-plan-tab="folha">Próxima folha</button><button data-plan-tab="rescisao">Rescisões</button></div>\
      <section class="rh-plan-pane active" data-plan-pane="13"><div id="rh-plan-13-kpis" class="kpi-grid slim"></div><article class="panel table-panel"><div class="panel-head"><div><span class="panel-kicker">PROVISÃO DO ANO</span><h2>13º salário por colaborador</h2></div><span class="source-badge" id="rh-plan-13-ref">—</span></div><div id="rh-plan-13-table"></div></article></section>\
      <section class="rh-plan-pane" data-plan-pane="ferias"><div id="rh-plan-ferias-kpis" class="kpi-grid slim"></div><article class="panel table-panel"><div class="panel-head"><div><span class="panel-kicker">PROVISÃO ESTIMADA</span><h2>Férias + 1/3 por colaborador</h2></div><span class="source-badge">Base salarial atual</span></div><div id="rh-plan-ferias-table"></div><p class="detail-note">O saldo de férias é uma estimativa pelo tempo transcorrido no período aquisitivo. Férias gozadas/pagas que não estejam estruturadas na base podem exigir ajuste.</p></article></section>\
      <section class="rh-plan-pane" data-plan-pane="folha"><div class="rh-plan-forecast-controls"><label>Ajuste geral de proventos (%)<input id="rh-plan-adjust" type="number" step="0.1" value="0"></label><button class="button secondary" id="rh-plan-recalc">Recalcular previsão</button></div><div id="rh-plan-folha-kpis" class="kpi-grid slim"></div><article class="panel table-panel"><div class="panel-head"><div><span class="panel-kicker">PROJEÇÃO</span><h2 id="rh-plan-next-title">Próxima folha</h2></div><span class="source-badge">Última competência importada</span></div><div id="rh-plan-folha-table"></div></article></section>\
      <section class="rh-plan-pane" data-plan-pane="rescisao"><div class="grid two rh-plan-res-grid"><article class="panel"><div class="panel-head"><div><span class="panel-kicker">SIMULADOR</span><h2>Rescisão individual</h2></div></div><div class="rh-plan-form"><label>Colaborador<select id="rh-res-person"></select></label><label>Data de desligamento<input id="rh-res-date" type="date"></label><label>Modalidade<select id="rh-res-type"><option value="sem_justa">Sem justa causa</option><option value="justa">Justa causa</option><option value="acordo">Acordo entre as partes</option><option value="pedido">Pedido de demissão</option></select></label><label>Aviso prévio<select id="rh-res-notice"><option value="indenizado">Indenizado</option><option value="trabalhado">Trabalhado</option><option value="desconto">Desconto do empregado</option><option value="na">Não aplicável</option></select></label><label>Períodos de férias vencidas<input id="rh-res-overdue" type="number" min="0" step="1" value="0"></label><label>Saldo FGTS conhecido<input id="rh-res-fgts" inputmode="decimal" placeholder="0,00"></label><label>Outros créditos<input id="rh-res-credits" inputmode="decimal" placeholder="0,00"></label><label>Outros descontos<input id="rh-res-discounts" inputmode="decimal" placeholder="0,00"></label><button class="button primary" id="rh-res-calc">Calcular cenário</button></div></article><article class="panel" id="rh-res-result"><div class="empty-state"><h2>Selecione um cenário</h2><p>A memória de cálculo aparecerá aqui.</p></div></article></div></section>';
    var importPage=$('page-importacao');main.insertBefore(page,importPage||null);
    btn.onclick=function(){go('planejamento');renderPlanning();};
    page.querySelectorAll('[data-plan-tab]').forEach(function(b){b.onclick=function(){page.querySelectorAll('[data-plan-tab]').forEach(function(x){x.classList.toggle('active',x===b);});page.querySelectorAll('[data-plan-pane]').forEach(function(x){x.classList.toggle('active',x.dataset.planPane===b.dataset.planTab);});};});
    $('rh-plan-recalc').onclick=renderForecast;$('rh-res-calc').onclick=renderTermination;$('rh-plan-export').onclick=exportPlanning;
    addStyles();
  }
  function render13(){var rows=calc13(),a=anchorDate();$('rh-plan-13-ref').textContent='Até '+String(a.getMonth()+1).padStart(2,'0')+'/'+a.getFullYear();$('rh-plan-13-kpis').innerHTML=kpi('Provisão acumulada',money(sumRows(rows,'provisionado')),rows.length+' CLT')+kpi('Já pago identificado',money(sumRows(rows,'pago')),'rubricas de 13º detectadas')+kpi('Saldo a provisionar',money(sumRows(rows,'saldo')),'antes de encargos','featured')+kpi('Custo provisionado',money(sumRows(rows,'total')),'saldo + encargos estimados');$('rh-plan-13-table').innerHTML=rows.length?table13(rows):'<div class="empty-state"><p>Nenhum vínculo CLT disponível no período.</p></div>';}
  function renderVac(){var rows=calcVacations();$('rh-plan-ferias-kpis').innerHTML=kpi('Férias provisionadas',money(sumRows(rows,'base')),rows.length+' CLT')+kpi('1/3 constitucional',money(sumRows(rows,'terco')),'estimativa acumulada')+kpi('Encargos estimados',money(sumRows(rows,'encargos')),'sobre férias + 1/3')+kpi('Custo provisionado',money(sumRows(rows,'total')),'estimativa gerencial','featured');$('rh-plan-ferias-table').innerHTML=rows.length?tableVac(rows):'<div class="empty-state"><p>Nenhum vínculo CLT disponível no período.</p></div>';}
  function renderForecast(){var rows=forecastRows();$('rh-plan-next-title').textContent='Previsão da folha · '+nextCompetence();$('rh-plan-folha-kpis').innerHTML=kpi('Proventos previstos',money(sumRows(rows,'proventos')),nextCompetence())+kpi('Líquido previsto',money(sumRows(rows,'liquido')),'antes de novas variáveis')+kpi('Encargos + benefícios',money(sumRows(rows,'encargos')+sumRows(rows,'beneficios')),'estimativa patronal')+kpi('Custo previsto',money(sumRows(rows,'custo')),'próxima competência','featured');$('rh-plan-folha-table').innerHTML=rows.length?tableForecast(rows):'<div class="empty-state"><p>Importe ao menos uma competência para projetar a próxima folha.</p></div>';}
  function parseBR(v){v=String(v||'').trim().replace(/R\$\s?/g,'').replace(/\./g,'').replace(',','.');var n=Number(v);return isFinite(n)?n:0;}
  function terminationCalc(){
    var id=String(($('rh-res-person')||{}).value||''),p=planPeople().find(function(x){return String(x.id)===id;});if(!p)return null;var end=asDate(($('rh-res-date')||{}).value)||anchorDate(),type=$('rh-res-type').value,notice=$('rh-res-notice').value,sal=Number(p.salario)||0,day=Math.min(30,end.getDate()),saldo=sal/30*day,year=end.getFullYear(),avos13=fullMonthsWith15Days(year,p.admissao,end,end.getMonth()+1),decimo=sal/12*avos13,avosFer=vacationAvo(p.admissao,end),ferBase=sal/12*avosFer,ferProp=ferBase+ferBase/3,overdue=Math.max(0,Number($('rh-res-overdue').value)||0),ferVenc=sal*4/3*overdue,years=serviceYears(p.admissao,end),noticeDays=Math.min(90,30+3*years),noticeVal=sal/30*noticeDays,noticeCredit=0,noticeDiscount=0;
    if(notice==='indenizado'){if(type==='sem_justa')noticeCredit=noticeVal;else if(type==='acordo')noticeCredit=noticeVal*.5;}else if(notice==='desconto'&&type==='pedido')noticeDiscount=sal;
    if(type==='justa'){decimo=0;ferProp=0;}var fgts=parseBR($('rh-res-fgts').value),fine=type==='sem_justa'?fgts*.40:(type==='acordo'?fgts*.20:0),credits=parseBR($('rh-res-credits').value),discounts=parseBR($('rh-res-discounts').value)+noticeDiscount,total=saldo+decimo+ferProp+ferVenc+noticeCredit+fine+credits-discounts;
    return {p:p,end:end,type:type,notice:notice,salario:sal,saldo:saldo,avos13:avos13,decimo:decimo,avosFer:avosFer,ferProp:ferProp,ferVenc:ferVenc,noticeDays:noticeDays,noticeCredit:noticeCredit,noticeDiscount:noticeDiscount,fgts:fgts,fine:fine,credits:credits,discounts:discounts,total:total};
  }
  function modeLabel(v){return {sem_justa:'Sem justa causa',justa:'Justa causa',acordo:'Acordo entre as partes',pedido:'Pedido de demissão'}[v]||v;}
  function renderTermination(){var x=terminationCalc(),box=$('rh-res-result');if(!x||!box)return;PLAN.lastTermination=x;var rows=[['Saldo de salário',x.saldo],['13º proporcional ('+x.avos13+'/12)',x.decimo],['Férias proporcionais + 1/3 ('+x.avosFer+'/12)',x.ferProp],['Férias vencidas + 1/3',x.ferVenc],['Aviso prévio indenizado',x.noticeCredit],['Multa sobre FGTS',x.fine],['Outros créditos',x.credits],['Descontos',-x.discounts]].filter(function(r){return Math.abs(r[1])>.004;});box.innerHTML='<div class="panel-head"><div><span class="panel-kicker">MEMÓRIA ESTIMADA</span><h2>'+esc(x.p.nome||'Colaborador')+'</h2><p>'+esc(modeLabel(x.type))+' · '+brDate(iso(x.end))+'</p></div><button class="button ghost" id="rh-res-print">Imprimir / PDF</button></div><div class="rh-res-meta"><span>Salário base <b>'+money(x.salario)+'</b></span><span>Aviso-base <b>'+x.noticeDays+' dias</b></span><span>FGTS informado <b>'+money(x.fgts)+'</b></span></div><div class="rh-res-lines">'+rows.map(function(r){return '<div><span>'+esc(r[0])+'</span><b class="'+(r[1]<0?'negative':'')+'">'+money(r[1])+'</b></div>';}).join('')+'<div class="total"><span>Total estimado bruto</span><strong>'+money(x.total)+'</strong></div></div><p class="detail-note">Não inclui automaticamente INSS/IRRF rescisórios, médias variáveis, estabilidade, convenção coletiva, indenizações específicas ou outras particularidades. Use como cenário gerencial e valide o cálculo oficial antes do pagamento.</p>';$('rh-res-print').onclick=printTermination;}
  function populateTerminationPeople(){var sel=$('rh-res-person');if(!sel)return;var cur=sel.value,rows=planPeople().filter(clt).sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR');});sel.innerHTML=rows.map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.nome||'—')+'</option>';}).join('');if(cur&&rows.some(function(p){return String(p.id)===String(cur);}))sel.value=cur;if(!$('rh-res-date').value)$('rh-res-date').value=iso(anchorDate());}
  function renderPlanning(){ensurePage();render13();renderVac();renderForecast();populateTerminationPeople();if(typeof rhFitAllCardValues==='function')rhFitAllCardValues($('page-planejamento'));}
  function printTermination(){var x=PLAN.lastTermination;if(!x)return;var w=window.open('','_blank','width=900,height=700');if(!w)return;var html=$('rh-res-result').innerHTML;w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Relatório de Rescisão - '+esc(x.p.nome||'')+'</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}button{display:none}.panel-head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px}.rh-res-meta{display:flex;gap:24px;flex-wrap:wrap;margin:20px 0}.rh-res-lines>div{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #ddd}.rh-res-lines .total{font-size:20px;border-top:2px solid #111;margin-top:10px}.detail-note{font-size:11px;color:#555;margin-top:24px}</style></head><body><h1>LNB · Simulação de Rescisão</h1>'+html+'</body></html>');w.document.close();setTimeout(function(){w.print();},250);}
  async function exportPlanning(){try{await loadLibrary('xlsx');var wb=XLSX.utils.book_new(),r13=calc13(),rv=calcVacations(),rf=forecastRows();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(r13.map(function(x){return {'Colaborador':x.nome,'Departamento':x.departamento,'Salário':x.salario,'Avos':x.avos,'Provisão acumulada':x.provisionado,'Já pago':x.pago,'Saldo':x.saldo,'Encargos':x.encargos,'Custo':x.total};})),'13o');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rv.map(function(x){return {'Colaborador':x.nome,'Departamento':x.departamento,'Avos':x.avos,'Férias':x.base,'1/3':x.terco,'Provisão':x.provisao,'Encargos':x.encargos,'Custo':x.total};})),'Ferias');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rf.map(function(x){return {'Colaborador':x.nome,'Departamento':x.departamento,'Proventos previstos':x.proventos,'Descontos base':x.descontos,'Líquido previsto':x.liquido,'Encargos':x.encargos,'Benefícios':x.beneficios,'Custo previsto':x.custo};})),'Proxima Folha');if(PLAN.lastTermination)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([PLAN.lastTermination].map(function(x){return {'Colaborador':x.p.nome,'Modalidade':modeLabel(x.type),'Data':iso(x.end),'Salário':x.salario,'Saldo salário':x.saldo,'13º proporcional':x.decimo,'Férias proporcionais':x.ferProp,'Férias vencidas':x.ferVenc,'Aviso':x.noticeCredit,'Multa FGTS':x.fine,'Total estimado':x.total};})),'Rescisao');XLSX.writeFile(wb,'LNB_Planejamento_RH_'+iso(anchorDate())+'.xlsx');toast('Planejamento exportado.');}catch(e){toast('Não foi possível exportar: '+e.message,true);}}
  function addStyles(){if($('_rh_plan_v24'))return;var st=document.createElement('style');st.id='_rh_plan_v24';st.textContent='\
.rh-plan-warning{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;margin-bottom:14px;border:1px solid color-mix(in srgb,var(--gold) 45%,var(--line-soft));border-radius:12px;background:color-mix(in srgb,var(--gold) 7%,var(--surface));font-size:.72rem}.rh-plan-warning b{color:var(--gold-2);white-space:nowrap}.rh-plan-warning span{color:var(--muted)}\
.rh-plan-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}.rh-plan-tabs button{border:1px solid var(--line-soft);background:var(--surface-2);color:var(--muted);border-radius:10px;padding:9px 13px;font-weight:850;cursor:pointer}.rh-plan-tabs button.active{color:var(--text);border-color:var(--gold);background:color-mix(in srgb,var(--gold) 10%,var(--surface-2))}.rh-plan-pane{display:none}.rh-plan-pane.active{display:block}.rh-plan-pane table{min-width:1080px}.rh-plan-pane tfoot td{border-top:2px solid var(--gold);background:var(--surface-2)}\
.rh-plan-forecast-controls{display:flex;justify-content:flex-end;gap:10px;align-items:end;margin-bottom:12px}.rh-plan-forecast-controls label,.rh-plan-form label{display:grid;gap:5px;color:var(--muted);font-size:.68rem;font-weight:850;text-transform:uppercase}.rh-plan-forecast-controls input,.rh-plan-form input,.rh-plan-form select{height:40px;border:1px solid var(--line-soft);border-radius:9px;background:var(--surface-2);color:var(--text);padding:0 10px}.rh-plan-forecast-controls input{width:150px}\
.rh-plan-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.rh-plan-form .button{grid-column:1/-1}.rh-res-meta{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.rh-res-meta span{padding:7px 9px;border:1px solid var(--line-soft);border-radius:8px;color:var(--muted);font-size:.7rem}.rh-res-meta b{color:var(--text)}.rh-res-lines>div{display:flex;justify-content:space-between;gap:12px;padding:9px 2px;border-bottom:1px solid var(--line-soft)}.rh-res-lines .negative{color:var(--red)}.rh-res-lines .total{margin-top:10px;padding-top:14px;border-top:2px solid var(--gold);border-bottom:0}.rh-res-lines .total strong{font-size:1.3rem;color:var(--gold-2)}\
@media(max-width:850px){.rh-plan-res-grid{grid-template-columns:1fr!important}.rh-plan-form{grid-template-columns:1fr}.rh-plan-forecast-controls{align-items:stretch;flex-direction:column}.rh-plan-forecast-controls input{width:100%}}';document.head.appendChild(st);}
  var oldSetup=setupUI;setupUI=function(){var r=oldSetup.apply(this,arguments);ensurePage();renderPlanning();return r;};
  var oldRenderAll=renderAll;renderAll=function(){var r=oldRenderAll.apply(this,arguments);if($('page-planejamento'))renderPlanning();return r;};
  window.rhRenderPlanning=renderPlanning;window.rhPlanTermination=terminationCalc;
})();
/* RH & Folha — hotfix v25: garante que Planejamento & Provisões entre no menu e abra corretamente */
(function(){
  'use strict';
  var recovering=false, attempts=0;
  function byId(id){return document.getElementById(id);}
  function planPage(){return byId('page-planejamento');}
  function planButton(){return document.querySelector('#nav [data-view="planejamento"]');}
  function nav(){return byId('nav')||document.querySelector('.sidebar nav');}
  function moveNearPeople(btn){
    var n=nav();if(!n||!btn)return;
    var mov=n.querySelector('[data-view="movimentacoes"]');
    if(mov&&mov.nextSibling!==btn)n.insertBefore(btn,mov.nextSibling);
  }
  function openPlanning(){
    if(!planPage())recoverPage();
    var page=planPage();
    if(!page){if(typeof toast==='function')toast('Planejamento & Provisões ainda está carregando. Tente novamente em instantes.',true);return;}
    if(typeof go==='function')go('planejamento');
    if(typeof window.rhRenderPlanning==='function')window.rhRenderPlanning();
  }
  function ensureButton(){
    var n=nav();if(!n)return null;
    var btn=planButton();
    if(!btn){
      btn=document.createElement('button');btn.type='button';btn.className='nav-item';btn.dataset.view='planejamento';btn.innerHTML='<span>◫</span>Planejamento & Provisões';n.appendChild(btn);
    }
    btn.hidden=false;btn.removeAttribute('hidden');btn.style.removeProperty('display');btn.onclick=openPlanning;
    btn.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openPlanning();}};
    moveNearPeople(btn);return btn;
  }
  function recoverPage(){
    if(planPage()||recovering)return;var app=byId('app');if(!app||app.hidden)return;
    if(typeof setupUI!=='function')return;
    recovering=true;
    try{setupUI();}catch(e){console.error('Falha ao recuperar Planejamento & Provisões:',e);}finally{recovering=false;}
  }
  function ensure(){
    attempts++;
    var app=byId('app');
    if(!app||app.hidden){if(attempts<24)setTimeout(ensure,350);return;}
    if(!planPage())recoverPage();
    var btn=ensureButton();
    if(planPage()&&btn){
      planPage().dataset.rhPlanningReady='1';
      if(typeof window.rhRenderPlanning==='function'){try{window.rhRenderPlanning();}catch(e){console.error('Falha ao renderizar Planejamento & Provisões:',e);}}
      return;
    }
    if(attempts<24)setTimeout(ensure,350);
  }
  window.rhEnsurePlanningEntry=ensure;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(ensure,0);},{once:true});else setTimeout(ensure,0);
  window.addEventListener('load',function(){setTimeout(ensure,250);},{once:true});
  var mo=new MutationObserver(function(ms){
    if(ms.some(function(m){return m.type==='childList';}))setTimeout(function(){if(byId('app')&&!byId('app').hidden)ensureButton();},0);
  });
  var root=byId('app')||document.body;if(root)mo.observe(root,{subtree:true,childList:true});
  if(!byId('_rh_v25_planning_entry_styles')){
    var st=document.createElement('style');st.id='_rh_v25_planning_entry_styles';
    st.textContent='#nav [data-view="planejamento"]{display:flex!important;visibility:visible!important;opacity:1!important}';document.head.appendChild(st);
  }
})();
/* RH v26 — provisões e rescisões conforme modelos contábeis anexados */
(function(){
'use strict';
var V={term:null};
function E(id){return document.getElementById(id)}
function h(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function m(v){try{return fmt(Number(v)||0)}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0)}}
function d(v){if(!v)return null;var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x)?null:x}
function db(v){var x=v instanceof Date?v:d(v);return x?String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0')+'/'+x.getFullYear():'—'}
function anchor(){var a=(window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(S.competencia?[S.competencia]:[])).slice().sort(function(a,b){return String(a.competencia||'').localeCompare(String(b.competencia||''))}),c=a[a.length-1],x=d(c&&c.competencia);return x?new Date(x.getFullYear(),x.getMonth()+1,0,12):new Date()}
function key(p){return String(p&&p.colaborador_id||p&&p.id||'')}
function clt(p){try{return rhVinculoCategory(p)==='clt'}catch(e){return /clt|celet/i.test(String(p&&p.vinculo||''))}}
function cc(p){return String(p&&p.centro_custo||p&&p.cc||p&&p.centro_de_custo||'Sem CC')}
function dept(p){try{return departmentName(p.departamento)}catch(e){return String(p.departamento||'—')}}
function people(){var z={},meta={};(S.colaboradores||[]).forEach(function(x){meta[String(x.id)]=x});(S.pessoas||[]).forEach(function(p){var k=key(p);if(k)z[k]=Object.assign({},meta[k]||{},p,{id:k,colaborador_id:k})});return Object.keys(z).map(function(k){return z[k]})}
function rates(){var e=(S.competencia&&S.competencia.encargos)||{},b=Number(e.base_total_inss)||0;return{inss:b&&Number(e.inss_empresa)>0?Number(e.inss_empresa)/b:.20,rat:b&&Number(e.rat)>0?Number(e.rat)/b:.01,terc:b&&Number(e.terceiros)>0?Number(e.terceiros)/b:.058,fgts:.08,pis:b&&Number(e.valor_pis)>0?Number(e.valor_pis)/b:.01}}
function charges(base,r){return{inss:base*r.inss,rat:base*r.rat,terc:base*r.terc,fgts:base*r.fgts,pis:base*r.pis}}
function ct(e){return e.inss+e.rat+e.terc+e.fgts+e.pis}
function avos13(y,adm,dem,through){adm=d(adm);dem=d(dem);var n=0;for(var i=0;i<Math.min(12,through);i++){var s=new Date(y,i,1,12),e=new Date(y,i+1,0,12),a=s,b=e;if(adm&&adm>a)a=adm;if(dem&&dem<b)b=dem;if(b>=a&&Math.floor((b-a)/86400000)+1>=15)n++}return n}
function avosFerias(adm,end){adm=d(adm);if(!adm||end<adm)return 0;var a=new Date(end.getFullYear(),adm.getMonth(),adm.getDate(),12);if(a>end)a.setFullYear(a.getFullYear()-1);if(a<adm)a=adm;var n=0,c=new Date(a);while(c<=end&&n<12){var nx=new Date(c.getFullYear(),c.getMonth()+1,c.getDate(),12),pe=new Date(nx-86400000);if(pe>end)pe=end;if(Math.floor((pe-c)/86400000)+1>=15)n++;c=nx}return Math.min(12,n)}
function years(adm,end){adm=d(adm);if(!adm)return 0;var y=end.getFullYear()-adm.getFullYear(),a=new Date(end.getFullYear(),adm.getMonth(),adm.getDate(),12);if(end<a)y--;return Math.max(0,y)}
function due(adm,end){adm=d(adm);if(!adm)return null;var x=new Date(end.getFullYear(),adm.getMonth(),adm.getDate()-1,12);if(x<end)x.setFullYear(x.getFullYear()+1);return x}
function lname(l){return String((l.rubrica_codigo||l.codigo||'')+' '+(l.rubrica_nome||l.nome||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function lsum(p,re,discount){var s=0;(p.lancamentos||[]).forEach(function(l){if(!re.test(lname(l)))return;var t=String(l.tipo||'').toLowerCase(),isD=t==='d'||/desconto/.test(t);if(discount===true&&!isD)return;if(discount===false&&isD)return;s+=Number(l.valor)||0});return s}
function rows13(){var a=anchor(),y=a.getFullYear(),mo=a.getMonth()+1,r=rates();return people().filter(clt).map(function(p){var sal=Number(p.salario)||0,av=avos13(y,p.admissao,p.demissao||p.desligamento,mo),prev=Math.max(0,av-1)*sal/12,pm=av?sal/12:0,at=av*sal/12,pago=lsum(p,/13.*sal|decimo.*terceiro/i,false),adi=lsum(p,/adiant.*13|13.*adiant/i,false),est=lsum(p,/estorn.*13|13.*estorn/i,false),saldo=Math.max(0,at-pago-adi-est),e=charges(saldo,r);return{id:key(p),nome:p.nome||'—',dep:dept(p),cc:cc(p),adm:p.admissao,sal:sal,av:av,prev:prev,pm:pm,aj:at-prev-pm,at:at,pago:pago,adi:adi,est:est,saldo:saldo,e:e,total:saldo+ct(e)}}).sort(function(a,b){return a.cc.localeCompare(b.cc)||a.nome.localeCompare(b.nome)})}
function rowsFerias(){var a=anchor(),r=rates();return people().filter(clt).map(function(p){var sal=Number(p.salario)||0,av=avosFerias(p.admissao,a),fer=sal/12*av,ter=fer/3,prev=Math.max(0,av-1)*sal/12*4/3,pm=sal/12*4/3,goz=lsum(p,/ferias.*goz|gozo.*ferias/i,false),ind=lsum(p,/ferias.*inden|inden.*ferias/i,false),est=lsum(p,/estorn.*ferias|ferias.*estorn/i,false),saldo=Math.max(0,fer+ter-goz-ind-est),e=charges(saldo,r);return{id:key(p),nome:p.nome||'—',dep:dept(p),cc:cc(p),adm:p.admissao,venc:due(p.admissao,a),vencidas:Math.max(0,years(p.admissao,a)-1),sal:sal,av:av,prev:prev,pm:pm,aj:fer+ter-prev-pm,fer:fer,ter:ter,goz:goz,ind:ind,est:est,saldo:saldo,e:e,total:saldo+ct(e)}}).sort(function(a,b){return a.cc.localeCompare(b.cc)||a.nome.localeCompare(b.nome)})}
function sum(a,k){return a.reduce(function(s,x){var v=x;k.split('.').forEach(function(q){v=v&&v[q]});return s+(Number(v)||0)},0)}
function cards(a){return '<div class="kpi-grid slim rh26-kpis">'+a.map(function(x){return '<div class="kpi '+(x[3]||'')+'"><span>'+h(x[0])+'</span><strong>'+h(x[1])+'</strong><small>'+h(x[2]||'')+'</small></div>'}).join('')+'</div>'}
function ccTable(rows,title){var g={};rows.forEach(function(x){if(!g[x.cc])g[x.cc]={cc:x.cc,n:0,s:0,e:0,t:0};g[x.cc].n++;g[x.cc].s+=x.saldo;g[x.cc].e+=ct(x.e);g[x.cc].t+=x.total});var a=Object.keys(g).map(function(k){return g[k]}).sort(function(x,y){return y.t-x.t});return '<article class="panel table-panel"><div class="panel-head"><div><span class="panel-kicker">RESUMO EXECUTIVO</span><h2>'+h(title)+' por centro de custo</h2></div></div><div class="table-wrap"><table><thead><tr><th>Centro de custo</th><th class="money">Pessoas</th><th class="money">Saldo</th><th class="money">Encargos</th><th class="money">Total</th></tr></thead><tbody>'+a.map(function(x){return '<tr><td><b>'+h(x.cc)+'</b></td><td class="money">'+x.n+'</td><td class="money">'+m(x.s)+'</td><td class="money">'+m(x.e)+'</td><td class="money"><b>'+m(x.t)+'</b></td></tr>'}).join('')+'</tbody><tfoot><tr><td><b>TOTAL</b></td><td class="money">'+rows.length+'</td><td class="money"><b>'+m(sum(rows,'saldo'))+'</b></td><td class="money"><b>'+m(a.reduce(function(s,x){return s+x.e},0))+'</b></td><td class="money"><b>'+m(sum(rows,'total'))+'</b></td></tr></tfoot></table></div></article>'}
function table13(rows){return '<article class="panel table-panel"><div class="panel-head"><div><span class="panel-kicker">COMPOSIÇÃO POR COLABORADOR</span><h2>Detalhamento da provisão de 13º</h2><p class="detail-note">Clique na linha para abrir a memória de cálculo.</p></div></div><div class="table-wrap"><table class="rh26-wide"><thead><tr><th>Colaborador</th><th>CC</th><th class="money">Salário</th><th class="money">Avos</th><th class="money">Saldo anterior</th><th class="money">Provisão mês</th><th class="money">Ajuste</th><th class="money">Pago</th><th class="money">Adiant.</th><th class="money">Saldo atual</th><th class="money">INSS Emp.</th><th class="money">RAT</th><th class="money">Terceiros</th><th class="money">FGTS</th><th class="money">PIS</th><th class="money">Total</th></tr></thead><tbody>'+rows.map(function(x){return '<tr class="rh26-row" data-k="13" data-id="'+h(x.id)+'"><td><b>'+h(x.nome)+'</b><small>'+h(x.dep)+'</small></td><td>'+h(x.cc)+'</td><td class="money">'+m(x.sal)+'</td><td class="money">'+x.av+'/12</td><td class="money">'+m(x.prev)+'</td><td class="money">'+m(x.pm)+'</td><td class="money">'+m(x.aj)+'</td><td class="money">'+m(x.pago)+'</td><td class="money">'+m(x.adi)+'</td><td class="money"><b>'+m(x.saldo)+'</b></td><td class="money">'+m(x.e.inss)+'</td><td class="money">'+m(x.e.rat)+'</td><td class="money">'+m(x.e.terc)+'</td><td class="money">'+m(x.e.fgts)+'</td><td class="money">'+m(x.e.pis)+'</td><td class="money"><b>'+m(x.total)+'</b></td></tr>'}).join('')+'</tbody><tfoot><tr><td><b>TOTAL</b></td><td></td><td></td><td></td><td class="money">'+m(sum(rows,'prev'))+'</td><td class="money">'+m(sum(rows,'pm'))+'</td><td class="money">'+m(sum(rows,'aj'))+'</td><td class="money">'+m(sum(rows,'pago'))+'</td><td class="money">'+m(sum(rows,'adi'))+'</td><td class="money"><b>'+m(sum(rows,'saldo'))+'</b></td><td class="money">'+m(sum(rows,'e.inss'))+'</td><td class="money">'+m(sum(rows,'e.rat'))+'</td><td class="money">'+m(sum(rows,'e.terc'))+'</td><td class="money">'+m(sum(rows,'e.fgts'))+'</td><td class="money">'+m(sum(rows,'e.pis'))+'</td><td class="money"><b>'+m(sum(rows,'total'))+'</b></td></tr></tfoot></table></div></article>'}
function tableFerias(rows){return '<article class="panel table-panel"><div class="panel-head"><div><span class="panel-kicker">COMPOSIÇÃO POR COLABORADOR</span><h2>Detalhamento da provisão de férias</h2><p class="detail-note">Férias vencidas são estimadas quando não houver histórico estruturado de gozo. Clique na linha para a memória.</p></div></div><div class="table-wrap"><table class="rh26-wide"><thead><tr><th>Colaborador</th><th>CC</th><th>Vencimento</th><th class="money">Vencidas*</th><th class="money">Avos</th><th class="money">Saldo anterior</th><th class="money">Provisão mês</th><th class="money">Ajuste</th><th class="money">Férias atual</th><th class="money">1/3 atual</th><th class="money">Gozadas</th><th class="money">Indenizadas</th><th class="money">Saldo atual</th><th class="money">INSS Emp.</th><th class="money">RAT</th><th class="money">Terceiros</th><th class="money">FGTS</th><th class="money">PIS</th><th class="money">Total</th></tr></thead><tbody>'+rows.map(function(x){return '<tr class="rh26-row" data-k="ferias" data-id="'+h(x.id)+'"><td><b>'+h(x.nome)+'</b><small>'+h(x.dep)+'</small></td><td>'+h(x.cc)+'</td><td>'+db(x.venc)+'</td><td class="money">'+x.vencidas+'</td><td class="money">'+x.av+'/12</td><td class="money">'+m(x.prev)+'</td><td class="money">'+m(x.pm)+'</td><td class="money">'+m(x.aj)+'</td><td class="money">'+m(x.fer)+'</td><td class="money">'+m(x.ter)+'</td><td class="money">'+m(x.goz)+'</td><td class="money">'+m(x.ind)+'</td><td class="money"><b>'+m(x.saldo)+'</b></td><td class="money">'+m(x.e.inss)+'</td><td class="money">'+m(x.e.rat)+'</td><td class="money">'+m(x.e.terc)+'</td><td class="money">'+m(x.e.fgts)+'</td><td class="money">'+m(x.e.pis)+'</td><td class="money"><b>'+m(x.total)+'</b></td></tr>'}).join('')+'</tbody><tfoot><tr><td><b>TOTAL</b></td><td></td><td></td><td></td><td></td><td class="money">'+m(sum(rows,'prev'))+'</td><td class="money">'+m(sum(rows,'pm'))+'</td><td class="money">'+m(sum(rows,'aj'))+'</td><td class="money">'+m(sum(rows,'fer'))+'</td><td class="money">'+m(sum(rows,'ter'))+'</td><td class="money">'+m(sum(rows,'goz'))+'</td><td class="money">'+m(sum(rows,'ind'))+'</td><td class="money"><b>'+m(sum(rows,'saldo'))+'</b></td><td class="money">'+m(sum(rows,'e.inss'))+'</td><td class="money">'+m(sum(rows,'e.rat'))+'</td><td class="money">'+m(sum(rows,'e.terc'))+'</td><td class="money">'+m(sum(rows,'e.fgts'))+'</td><td class="money">'+m(sum(rows,'e.pis'))+'</td><td class="money"><b>'+m(sum(rows,'total'))+'</b></td></tr></tfoot></table></div></article>'}
function memory(k,id){var x=(k==='13'?rows13():rowsFerias()).find(function(q){return q.id===id});if(!x)return;var a=k==='13'?[['Admissão',db(x.adm)],['Salário atual',m(x.sal)],['Avos',x.av+'/12'],['Saldo prov. anterior',m(x.prev)],['Provisão do mês',m(x.pm)],['Ajuste no mês',m(x.aj)],['Valor 13º atual',m(x.at)],['13º pago identificado',m(x.pago)],['Adiantamento identificado',m(x.adi)],['Estorno identificado',m(x.est)],['Saldo atual',m(x.saldo)]]:[['Admissão',db(x.adm)],['Vencimento estimado',db(x.venc)],['Férias vencidas (estim.)',x.vencidas],['Férias proporcionais',x.av+'/12'],['Saldo prov. anterior',m(x.prev)],['Provisão do mês',m(x.pm)],['Ajuste no mês',m(x.aj)],['Valor férias atual',m(x.fer)],['1/3 férias atual',m(x.ter)],['Gozadas identificadas',m(x.goz)],['Indenizadas identificadas',m(x.ind)],['Saldo atual',m(x.saldo)]];document.body.insertAdjacentHTML('beforeend','<div class="rh26-modal" id="rh26-modal"><div class="rh26-card"><button id="rh26-close">×</button><span class="eyebrow">MEMÓRIA DE CÁLCULO</span><h2>'+h(x.nome)+'</h2><p>'+h(x.cc)+' · '+h(x.dep)+'</p><div class="rh26-memory">'+a.map(function(q){return '<div><span>'+h(q[0])+'</span><b>'+h(q[1])+'</b></div>'}).join('')+'</div><h3>Encargos</h3><div class="rh26-memory"><div><span>INSS Empresa</span><b>'+m(x.e.inss)+'</b></div><div><span>RAT</span><b>'+m(x.e.rat)+'</b></div><div><span>Terceiros</span><b>'+m(x.e.terc)+'</b></div><div><span>FGTS</span><b>'+m(x.e.fgts)+'</b></div><div><span>PIS</span><b>'+m(x.e.pis)+'</b></div><div class="total"><span>Custo provisionado</span><b>'+m(x.total)+'</b></div></div><p class="detail-note">Estimativa gerencial. Faltas, afastamentos, médias e movimentos não estruturados devem ser conferidos com a folha oficial.</p></div></div>');E('rh26-close').onclick=function(){E('rh26-modal').remove()}}
function bind(p){p.querySelectorAll('.rh26-row').forEach(function(tr){tr.onclick=function(){memory(tr.dataset.k,tr.dataset.id)}})}
function render13(){var p=document.querySelector('[data-plan-pane="13"]');if(!p)return;var r=rows13(),a=anchor();p.innerHTML=cards([['Saldo provisionado',m(sum(r,'saldo')),r.length+' CLT'],['Provisão do mês',m(sum(r,'pm')),String(a.getMonth()+1).padStart(2,'0')+'/'+a.getFullYear()],['Encargos sobre saldo',m(r.reduce(function(s,x){return s+ct(x.e)},0)),'INSS Emp. + RAT + Terceiros + FGTS + PIS'],['Custo provisionado',m(sum(r,'total')),'saldo + encargos','featured']])+ccTable(r,'13º salário')+table13(r);bind(p)}
function renderFerias(){var p=document.querySelector('[data-plan-pane="ferias"]');if(!p)return;var r=rowsFerias();p.innerHTML=cards([['Saldo provisionado',m(sum(r,'saldo')),r.length+' CLT'],['Provisão do mês',m(sum(r,'pm')),'férias + 1/3'],['Encargos sobre saldo',m(r.reduce(function(s,x){return s+ct(x.e)},0)),'INSS Emp. + RAT + Terceiros + FGTS + PIS'],['Custo provisionado',m(sum(r,'total')),'saldo + encargos','featured']])+ccTable(r,'Férias')+tableFerias(r);bind(p)}
function pbr(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function calcTerm(){var p=people().filter(clt).find(function(x){return key(x)===String(E('rh26-person').value)});if(!p)return null;var x=d(E('rh26-date').value)||new Date(),t=E('rh26-type').value,n=E('rh26-notice').value,s=Number(p.salario)||0,ds=Math.min(30,x.getDate()),saldo=s/30*ds,a13=avos13(x.getFullYear(),p.admissao,x,x.getMonth()+1),v13=s/12*a13,avf=avosFerias(p.admissao,x),vf=s/12*avf,ven=Math.max(0,Number(E('rh26-over').value)||0)*s,ter=(vf+ven)/3,yd=years(p.admissao,x),nd=Math.min(90,30+yd*3),aviso=t==='empregador'&&n==='indenizado'?s/30*nd:0,av13=aviso?s/12:0,avfut=aviso?s/12:0,cct=pbr(E('rh26-cct').value),cred=pbr(E('rh26-cred').value),od=pbr(E('rh26-disc').value),fg=pbr(E('rh26-fgts').value),inssRate=Number(p.valor_inss||0)&&Number(p.base_inss||0)?Math.min(.14,Number(p.valor_inss)/Number(p.base_inss)):0,irrfRate=Number(p.valor_irrf||0)&&Number(p.base_irrf||0)?Math.min(.275,Number(p.valor_irrf)/Number(p.base_irrf)):0,inss=saldo*inssRate,inss13=v13*inssRate,irrf=Math.max(0,(saldo-inss)*irrfRate),irrf13=Math.max(0,(v13-inss13)*irrfRate),avDisc=t==='pedido'&&n==='desconto'?s:0,bruto=saldo+v13+vf+ven+ter+aviso+av13+avfut+cct+cred,ded=inss+inss13+irrf+irrf13+avDisc+od,multa=t==='empregador'?fg*.4:0;return{p:p,date:x,type:t,s:s,ds:ds,saldo:saldo,a13:a13,v13:v13,avf:avf,vf:vf,ven:ven,ter:ter,nd:nd,aviso:aviso,av13:av13,avfut:avfut,cct:cct,cred:cred,inss:inss,inss13:inss13,irrf:irrf,irrf13:irrf13,avDisc:avDisc,od:od,bruto:bruto,ded:ded,liq:bruto-ded,fg:fg,fgm:saldo*.08,fg13:(v13+av13)*.08,fgav:aviso*.08,multa:multa,custo:bruto+saldo*.08+(v13+av13)*.08+aviso*.08+multa}}
function lines(a){return '<div class="rh-res-lines">'+a.filter(function(x){return Math.abs(x[1])>.004}).map(function(x){return '<div><span>'+h(x[0])+'</span><b>'+m(x[1])+'</b></div>'}).join('')+'</div>'}
function renderTerm(){var x=calcTerm();if(!x)return;V.term=x;E('rh26-result').innerHTML='<div class="panel-head"><div><span class="panel-kicker">RELATÓRIO ANALÍTICO</span><h2>'+h(x.p.nome)+'</h2><p>'+(x.type==='empregador'?'Despedida sem justa causa pelo empregador':'Pedido de demissão sem justa causa')+' · '+db(x.date)+'</p></div></div>'+cards([['Total bruto',m(x.bruto),'verbas rescisórias'],['Deduções estimadas',m(x.ded),'INSS/IRRF + outros'],['Líquido estimado',m(x.liq),'a pagar','featured'],['Custo empregador',m(x.custo),'bruto + FGTS/multa']])+'<div class="rh26-term"><div><h3>Verbas rescisórias</h3>'+lines([['Saldo de salário',x.saldo],['13º proporcional '+x.a13+'/12',x.v13],['Férias proporcionais '+x.avf+'/12',x.vf],['Férias vencidas',x.ven],['1/3 constitucional',x.ter],['Aviso-prévio indenizado '+x.nd+' dias',x.aviso],['13º sobre aviso',x.av13],['Férias sobre aviso',x.avfut],['Indenização CCT',x.cct],['Outros créditos',x.cred]])+'</div><div><h3>Deduções</h3>'+lines([['INSS sobre rescisão (estim.)',x.inss],['INSS 13º (estim.)',x.inss13],['IRRF mensal (estim.)',x.irrf],['IRRF 13º (estim.)',x.irrf13],['Aviso descontado',x.avDisc],['Outros descontos',x.od]])+'</div></div><article class="panel rh26-base"><h3>Base de cálculo e FGTS</h3><div class="rh26-memory"><div><span>Saldo FGTS informado</span><b>'+m(x.fg)+'</b></div><div><span>FGTS mensal</span><b>'+m(x.fgm)+'</b></div><div><span>FGTS 13º</span><b>'+m(x.fg13)+'</b></div><div><span>FGTS aviso</span><b>'+m(x.fgav)+'</b></div><div><span>Multa FGTS</span><b>'+m(x.multa)+'</b></div><div><span>Base INSS mensal</span><b>'+m(x.saldo)+'</b></div><div><span>Base INSS 13º</span><b>'+m(x.v13)+'</b></div></div></article><div class="rh-plan-warning"><b>Estimativa gerencial</b><span>Estrutura baseada nos modelos anexados. Validar incidências, médias, CCT, estabilidade e cálculo oficial antes do pagamento.</span></div>'}
function buildTerm(){var p=document.querySelector('[data-plan-pane="rescisao"]');if(!p)return;var ps=people().filter(clt).sort(function(a,b){return String(a.nome).localeCompare(String(b.nome))}),a=anchor();p.innerHTML='<div class="grid two rh-plan-res-grid"><article class="panel"><div class="panel-head"><div><span class="panel-kicker">SIMULADOR BASEADO NOS MODELOS</span><h2>Rescisão individual</h2></div></div><div class="rh-plan-form"><label>Colaborador<select id="rh26-person">'+ps.map(function(x){return '<option value="'+h(key(x))+'">'+h(x.nome)+'</option>'}).join('')+'</select></label><label>Data de desligamento<input id="rh26-date" type="date" value="'+a.toISOString().slice(0,10)+'"></label><label>Modalidade<select id="rh26-type"><option value="pedido">Pedido do empregado — sem justa causa</option><option value="empregador">Sem justa causa — empregador</option></select></label><label>Aviso prévio<select id="rh26-notice"><option value="indenizado">Indenizado</option><option value="trabalhado">Trabalhado</option><option value="desconto">Desconto do empregado</option><option value="na">Não aplicável</option></select></label><label>Períodos de férias vencidas<input id="rh26-over" type="number" min="0" value="0"></label><label>Saldo FGTS conhecido<input id="rh26-fgts" inputmode="decimal" placeholder="0,00"></label><label>Indenização CCT / outra verba<input id="rh26-cct" inputmode="decimal" placeholder="0,00"></label><label>Outros créditos<input id="rh26-cred" inputmode="decimal" placeholder="0,00"></label><label>Outros descontos<input id="rh26-disc" inputmode="decimal" placeholder="0,00"></label><button class="button primary" id="rh26-calc">Gerar relatório analítico</button></div></article><article class="panel" id="rh26-result"><div class="empty-state"><h2>Selecione um cenário</h2><p>O relatório mostrará verbas, deduções, líquido e bases de FGTS/INSS/IRRF.</p></div></article></div>';E('rh26-calc').onclick=renderTerm}
function enhance(){var p=E('page-planejamento');if(!p)return false;if(p.dataset.v26==='1')return true;p.dataset.v26='1';render13();renderFerias();buildTerm();p.querySelectorAll('[data-plan-tab]').forEach(function(b){var old=b.onclick;b.onclick=function(e){if(old)old.call(this,e);setTimeout(function(){if(b.dataset.planTab==='13')render13();if(b.dataset.planTab==='ferias')renderFerias();if(b.dataset.planTab==='rescisao')buildTerm()},0)}});return true}
function style(){if(E('_rh26'))return;var s=document.createElement('style');s.id='_rh26';s.textContent='.rh26-wide{min-width:1800px!important}.rh26-wide td small{display:block;color:var(--muted);margin-top:3px}.rh26-row{cursor:pointer}.rh26-kpis{margin-bottom:14px}.rh26-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.68);display:grid;place-items:center;padding:24px}.rh26-card{width:min(820px,96vw);max-height:90vh;overflow:auto;background:var(--surface);border:1px solid var(--line-soft);border-radius:18px;padding:24px;position:relative}.rh26-card>button{position:absolute;right:16px;top:16px;width:42px;height:42px;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2);color:var(--text);font-size:24px}.rh26-memory{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:14px 0}.rh26-memory>div{display:flex;justify-content:space-between;gap:10px;padding:10px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface-2)}.rh26-memory span{color:var(--muted)}.rh26-memory .total{grid-column:1/-1;border-color:var(--gold)}.rh26-term{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:16px}.rh26-term>div{padding:14px;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2)}.rh26-base{margin-top:16px}@media(max-width:900px){.rh26-memory,.rh26-term{grid-template-columns:1fr}}';document.head.appendChild(s)}
var su=setupUI;setupUI=function(){var r=su.apply(this,arguments);style();setTimeout(enhance,0);return r};
var ra=renderAll;renderAll=function(){var r=ra.apply(this,arguments);if(E('page-planejamento')){if(E('page-planejamento').dataset.v26==='1'){render13();renderFerias()}else enhance()}return r};
window.rhV26EnhancePlanning=enhance;window.rhV26RenderTermination=renderTerm;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){style();setTimeout(enhance,350)});else{style();setTimeout(enhance,350)}
})();
/* RH & Folha — hotfix v27: renovação automática de JWT em importações e chamadas Supabase */
(function(){
  'use strict';
  var rhV27RefreshPromise=null;
  var rhV27BaseApi=api;

  function rhV27JwtExpiryMs(token){
    try{
      var part=String(token||'').split('.')[1];
      if(!part)return 0;
      part=part.replace(/-/g,'+').replace(/_/g,'/');
      while(part.length%4)part+='=';
      var payload=JSON.parse(atob(part));
      return Number(payload&&payload.exp||0)*1000;
    }catch(e){return 0;}
  }

  function rhV27SessionExpiryMs(s){
    if(!s)return 0;
    var v=Number(s.expires_at||0);
    if(v>0&&v<100000000000)v*=1000;
    return v||rhV27JwtExpiryMs(s.access_token);
  }

  function rhV27NeedsRefresh(s){
    if(!s||!s.access_token)return true;
    var exp=rhV27SessionExpiryMs(s);
    return !!exp&&exp-Date.now()<90000;
  }

  function rhV27IsAuthError(err){
    var msg=String(err&&err.message||err||'').toLowerCase();
    return /jwt\s*expired|token\s*expired|expired\s*jwt|invalid\s*jwt|jwt.*expir|pgrst301|unauthori[sz]ed|invalid\s*token/.test(msg);
  }

  async function rhEnsureFreshSession(force){
    if(!SES){
      var stored=loadSession();
      if(stored)SES=stored;
    }
    if(!SES||!SES.access_token)throw new Error('Sessão não encontrada. Entre novamente no Painel LNB.');
    if(!force&&!rhV27NeedsRefresh(SES))return SES;
    if(!SES.refresh_token)throw new Error('Sua sessão expirou e não pôde ser renovada automaticamente. Entre novamente no Painel LNB.');
    if(!rhV27RefreshPromise){
      rhV27RefreshPromise=(async function(){
        var renewed=await refresh(SES);
        if(!renewed||!renewed.access_token)throw new Error('Sua sessão expirou e não pôde ser renovada automaticamente. Entre novamente no Painel LNB.');
        SES=renewed;
        saveSession(renewed);
        return renewed;
      })().finally(function(){rhV27RefreshPromise=null;});
    }
    return rhV27RefreshPromise;
  }

  api=async function(path,options){
    try{
      await rhEnsureFreshSession(false);
      return await rhV27BaseApi(path,options);
    }catch(err){
      if(!rhV27IsAuthError(err))throw err;
      await rhEnsureFreshSession(true);
      try{return await rhV27BaseApi(path,options);}
      catch(retryErr){
        if(rhV27IsAuthError(retryErr))throw new Error('Sua sessão expirou. Atualize o acesso ao Painel LNB e tente novamente; os PDFs selecionados não foram gravados.');
        throw retryErr;
      }
    }
  };

  rpc=function(name,body){return api('rpc/'+name,{method:'POST',body:body||{}});};
  window.rhEnsureFreshSession=rhEnsureFreshSession;
})();
/* RH & Folha — hotfix v28: compatibilidade entre consolidação de período e Planejamento v26 */
(function(){
  'use strict';

  var rhV28LegacyPlanning=window.rhRenderPlanning;
  var rhV28BaseRenderAll=renderAll;
  var RH_V28_LEGACY_IDS=[
    'rh-plan-13-ref','rh-plan-13-kpis','rh-plan-13-table',
    'rh-plan-ferias-kpis','rh-plan-ferias-table',
    'rh-plan-next-title','rh-plan-folha-kpis','rh-plan-folha-table'
  ];

  function rhV28PlanningPage(){return document.getElementById('page-planejamento');}
  function rhV28NeedsBridge(){var p=rhV28PlanningPage();return !!(p&&p.dataset&&p.dataset.v26==='1');}

  function rhV28CreateLegacySinks(){
    if(!rhV28NeedsBridge())return null;
    var page=rhV28PlanningPage(),box=document.createElement('div'),created=0;
    box.id='rh-v28-legacy-sinks';box.hidden=true;box.setAttribute('aria-hidden','true');
    RH_V28_LEGACY_IDS.forEach(function(id){
      if(document.getElementById(id))return;
      var el=document.createElement(id==='rh-plan-13-ref'?'span':'div');el.id=id;box.appendChild(el);created++;
    });
    if(!created)return null;
    page.appendChild(box);return box;
  }

  function rhV28RemoveLegacySinks(box){try{if(box&&box.parentNode)box.parentNode.removeChild(box);}catch(e){}}

  function rhV28RunWithBridge(fn,ctx,args){
    var sink=rhV28CreateLegacySinks();
    try{return fn&&fn.apply(ctx,args||[]);}finally{rhV28RemoveLegacySinks(sink);}
  }

  /* O v24 ainda atualiza a aba Próxima folha, enquanto o v26 substitui as abas de 13º e Férias.
     Os elementos invisíveis abaixo mantêm o renderizador legado compatível sem alterar o layout atual. */
  renderAll=function(){return rhV28RunWithBridge(rhV28BaseRenderAll,this,arguments);};

  window.rhRenderPlanning=function(){
    var result=rhV28RunWithBridge(rhV28LegacyPlanning,this,arguments);
    var p=rhV28PlanningPage();
    if(p&&p.dataset.v26!=='1'&&typeof window.rhV26EnhancePlanning==='function')window.rhV26EnhancePlanning();
    return result;
  };

  window.rhV28PlanningPeriodBridge=rhV28RunWithBridge;
})();
/* RH & Folha — hotfix v29: RPA/autônomos fora do consolidado da folha + integridade */
(function(){
  'use strict';

  function rhV29Num(v){var n=Number(v);return isFinite(n)?n:0;}
  function rhV29Round(v){return Math.round((rhV29Num(v)+Number.EPSILON)*100)/100;}
  function rhV29IsRpaRubric(r){
    var code=String(r&&r.codigo||r&&r.rubrica_codigo||'').trim();
    var name=String(r&&r.nome||r&&r.rubrica_nome||'').toUpperCase();
    return code==='9384'||code==='857'||code==='858'||name.indexOf('AUTONOM')>=0||name.indexOf('RPA')>=0;
  }
  function rhV29RpaBreakdown(rubrics){
    var out={proventos:0,descontos:0,inss:0,irrf:0,rubricas:[]};
    (rubrics||[]).forEach(function(r){
      if(!rhV29IsRpaRubric(r))return;
      var code=String(r&&r.codigo||r&&r.rubrica_codigo||'').trim();
      var name=String(r&&r.nome||r&&r.rubrica_nome||'').toUpperCase();
      var type=String(r&&r.tipo||'').toLowerCase();
      var value=rhV29Num(r&&r.valor);
      out.rubricas.push(r);
      if(type==='provento'||type==='p')out.proventos+=value;
      if(type==='desconto'||type==='d')out.descontos+=value;
      if(code==='858'||name.indexOf('INSS AUTONOM')>=0)out.inss+=value;
      if(code==='857'||name.indexOf('IRRF AUTONOM')>=0)out.irrf+=value;
    });
    out.proventos=rhV29Round(out.proventos);out.descontos=rhV29Round(out.descontos);out.inss=rhV29Round(out.inss);out.irrf=rhV29Round(out.irrf);
    return out;
  }
  function rhV29PeopleTotals(result){
    var out={proventos:0,descontos:0,liquido:0,baseInss:0,excedenteInss:0,baseIrrf:0};
    (result&&result.colaboradores||[]).forEach(function(c){var f=c&&c.folha||{};out.proventos+=rhV29Num(f.proventos);out.descontos+=rhV29Num(f.descontos);out.liquido+=rhV29Num(f.liquido);out.baseInss+=rhV29Num(f.base_inss);out.excedenteInss+=rhV29Num(f.excedente_inss);out.baseIrrf+=rhV29Num(f.base_irrf);});
    Object.keys(out).forEach(function(k){out[k]=rhV29Round(out[k]);});return out;
  }
  function rhV29Close(a,b){return Math.abs(rhV29Num(a)-rhV29Num(b))<=0.02;}
  function rhV29NormalizeResult(result){
    if(!result||!result.competencia)return result;
    var comp=result.competencia,resumo=comp.resumo||(comp.resumo={}),integrity=resumo.integridade_rpa||{};
    if(integrity.normalizado)return result;
    var rubrics=(resumo.rubricas||[]).slice(),rpa=rhV29RpaBreakdown(rubrics);
    if(!rpa.proventos&&!rpa.descontos)return result;

    var raw={proventos:rhV29Num(comp.proventos),descontos:rhV29Num(comp.descontos),liquido:rhV29Num(comp.liquido),base_inss:rhV29Num(comp.base_inss),base_irrf:rhV29Num(comp.base_irrf)};
    var folha={
      proventos:rhV29Round(raw.proventos-rpa.proventos),
      descontos:rhV29Round(raw.descontos-rpa.descontos)
    };
    folha.liquido=rhV29Round(folha.proventos-folha.descontos);
    var people=rhV29PeopleTotals(result),reconciled=rhV29Close(folha.proventos,people.proventos)&&rhV29Close(folha.descontos,people.descontos)&&rhV29Close(folha.liquido,people.liquido);
    var enc=comp.encargos||(comp.encargos={});
    var payrollBase=rhV29Num(enc.sal_contrib_empregados)+rhV29Num(enc.excedente_inss);
    if(!payrollBase&&people.baseInss)payrollBase=people.baseInss+people.excedenteInss;
    payrollBase=rhV29Round(payrollBase);
    var segurados=rhV29Round(Math.max(0,rhV29Num(enc.segurados)-rpa.inss));
    var totalInss=rhV29Round(segurados+payrollBase*.20+rhV29Num(enc.rat)+rhV29Num(enc.terceiros));
    var totalIrrfRaw=rhV29Num(enc.valor_total_irrf!=null?enc.valor_total_irrf:enc.valor_irrf),totalIrrf=rhV29Round(Math.max(0,totalIrrfRaw-rpa.irrf));

    comp.proventos=resumo.proventos=folha.proventos;
    comp.descontos=resumo.descontos=folha.descontos;
    comp.liquido=resumo.liquido=folha.liquido;
    if(payrollBase>0){comp.base_inss=resumo.base_inss=payrollBase;enc.base_total_inss=payrollBase;}
    if(reconciled&&people.baseIrrf>0){comp.base_irrf=resumo.base_irrf=people.baseIrrf;}
    enc.segurados=segurados;if(payrollBase>0)enc.total_inss=totalInss;enc.valor_total_irrf=totalIrrf;enc.valor_irrf=totalIrrf;
    resumo.rubricas=rubrics.filter(function(r){return !rhV29IsRpaRubric(r);});
    resumo.integridade_rpa={
      normalizado:true,
      regra:'RPA/autônomos excluídos do consolidado RH & Folha',
      pdf_geral:raw,
      rpa_excluido:{proventos:rpa.proventos,descontos:rpa.descontos,inss:rpa.inss,irrf:rpa.irrf},
      folha:{proventos:folha.proventos,descontos:folha.descontos,liquido:folha.liquido},
      reconciliado_com_colaboradores:reconciled
    };
    var vals=(comp.validacoes||[]).filter(function(v){var msg=String(v&&v.msg||v&&v.mensagem||'').toLowerCase();return !(reconciled&&msg.indexOf('proventos calculados')>=0&&msg.indexOf('divergem')>=0);});
    vals.push({tipo:reconciled?'ok':'aviso',msg:reconciled?'Consolidado RH reconciliado: RPA/autônomos excluídos.':'RPA/autônomos excluídos; permanecem diferenças entre o resumo e as linhas individuais para revisão.'});
    comp.validacoes=vals;
    return result;
  }

  function rhV29WrapParser(){
    if(!window.RHParser||RHParser.__rhV29Wrapped)return;
    RHParser.__rhV29Wrapped=true;
    ['extractPdf','parseExcel'].forEach(function(name){var base=RHParser[name];if(typeof base!=='function')return;RHParser[name]=async function(){return rhV29NormalizeResult(await base.apply(this,arguments));};});
  }

  var baseBuild=typeof buildRpcPayload==='function'?buildRpcPayload:null;
  if(baseBuild)buildRpcPayload=function(preview){preview=rhV29NormalizeResult(preview);var payload=baseBuild(preview),meta=preview&&preview.competencia&&preview.competencia.resumo&&preview.competencia.resumo.integridade_rpa;if(meta&&meta.normalizado){payload.resumo.integridade_rpa=meta;}return payload;};

  window.rhNormalizePayrollRpa=rhV29NormalizeResult;
  window.rhRpaBreakdown=rhV29RpaBreakdown;
  rhV29WrapParser();
  document.addEventListener('DOMContentLoaded',rhV29WrapParser);
  setTimeout(rhV29WrapParser,0);
})();
/* RH & Folha — hotfix v30: leitura organizada das tabelas de Planejamento & Provisões */
(function(){
  'use strict';
  function E(id){return document.getElementById(id);}
  function rhV30Kind(table){
    var t=String(table&&table.textContent||'').toLowerCase();
    if(t.indexOf('vencimento')>=0&&t.indexOf('férias')>=0)return 'ferias';
    if(t.indexOf('salário')>=0&&t.indexOf('adiant')>=0)return '13';
    return '';
  }
  function rhV30GroupRow(kind){
    var tr=document.createElement('tr');tr.className='rh30-group-head';
    if(kind==='ferias')tr.innerHTML='<th colspan="5">Colaborador e período</th><th colspan="8">Movimentação da provisão</th><th colspan="6">Encargos e custo</th>';
    else tr.innerHTML='<th colspan="4">Colaborador e base</th><th colspan="6">Movimentação da provisão</th><th colspan="6">Encargos e custo</th>';
    return tr;
  }
  function rhV30MarkColumns(table,kind){
    var starts=kind==='ferias'?[1,6,14]:[1,5,11];
    table.querySelectorAll('thead tr:not(.rh30-group-head),tbody tr,tfoot tr').forEach(function(tr){
      Array.from(tr.children).forEach(function(cell,i){
        cell.classList.toggle('rh30-group-start',starts.indexOf(i+1)>=0);
        if(i>0)cell.classList.add('rh30-no-wrap');
      });
    });
  }
  function rhV30DecorateTable(table){
    if(!table||!table.classList.contains('rh26-wide'))return;
    var kind=rhV30Kind(table);if(!kind)return;
    table.classList.add('rh30-readable','rh30-'+kind);
    table.dataset.rh30=kind;
    var thead=table.tHead;
    if(thead&&!thead.querySelector('.rh30-group-head'))thead.insertBefore(rhV30GroupRow(kind),thead.firstChild);
    rhV30MarkColumns(table,kind);
    var wrap=table.closest('.table-wrap');
    if(wrap){
      wrap.classList.add('rh30-scroll');
      if(!wrap.previousElementSibling||!wrap.previousElementSibling.classList.contains('rh30-scroll-note')){
        var note=document.createElement('div');note.className='rh30-scroll-note';
        note.innerHTML='<span>↔</span><b>Visualização detalhada</b><span>Role horizontalmente para consultar todas as colunas. Colaborador e CC permanecem fixos.</span>';
        wrap.parentNode.insertBefore(note,wrap);
      }
    }
  }
  function rhV30DecoratePlanningTables(root){
    root=root||E('page-planejamento');if(!root)return;
    root.querySelectorAll('table.rh26-wide').forEach(rhV30DecorateTable);
  }
  function rhV30Styles(){
    if(E('_rh30'))return;
    var s=document.createElement('style');s.id='_rh30';s.textContent='\
#page-planejamento .rh30-scroll-note{display:flex;align-items:center;gap:9px;margin:0 18px 10px;padding:8px 11px;border:1px solid var(--line-soft);border-radius:10px;background:color-mix(in srgb,var(--surface-2) 84%,transparent);font-size:.68rem;color:var(--muted)}\
#page-planejamento .rh30-scroll-note>b{color:var(--text);font-size:.7rem;white-space:nowrap}#page-planejamento .rh30-scroll-note>span:first-child{color:var(--gold);font-size:1rem;font-weight:900}\
#page-planejamento .rh30-scroll{overflow-x:auto!important;overflow-y:visible;scrollbar-gutter:stable;overscroll-behavior-x:contain;padding-bottom:8px}\
#page-planejamento table.rh30-readable{table-layout:fixed!important;border-collapse:separate!important;border-spacing:0!important;font-size:.76rem!important}\
#page-planejamento table.rh30-ferias{min-width:2380px!important}#page-planejamento table.rh30-13{min-width:2050px!important}\
#page-planejamento table.rh30-readable thead th{padding:10px 9px!important;line-height:1.15!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important;vertical-align:middle!important;background:var(--surface-2)!important}\
#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th{border-bottom:1px solid var(--line-soft)!important}\
#page-planejamento table.rh30-readable .rh30-group-head th{height:34px!important;padding:7px 10px!important;text-align:left!important;color:var(--gold-2)!important;font-size:.64rem!important;font-weight:900!important;letter-spacing:.09em!important;text-transform:uppercase!important;border-bottom:1px solid color-mix(in srgb,var(--gold) 28%,var(--line-soft))!important;background:color-mix(in srgb,var(--gold) 6%,var(--surface-2))!important}\
#page-planejamento table.rh30-readable tbody td,#page-planejamento table.rh30-readable tfoot td{padding:12px 9px!important;vertical-align:middle!important;line-height:1.25!important;border-bottom:1px solid var(--line-soft)!important}\
#page-planejamento table.rh30-readable tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--surface-2) 48%,transparent)}#page-planejamento table.rh30-readable tbody tr:hover td{background:color-mix(in srgb,var(--gold) 7%,var(--surface))!important}\
#page-planejamento table.rh30-readable td:first-child,#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:first-child{width:220px!important;min-width:220px!important;max-width:220px!important;white-space:normal!important;word-break:normal!important;overflow-wrap:break-word!important}\
#page-planejamento table.rh30-readable td:first-child b{display:block;line-height:1.2!important;font-size:.78rem!important}#page-planejamento table.rh30-readable td:first-child small{font-size:.67rem!important;line-height:1.2!important}\
#page-planejamento table.rh30-readable td:nth-child(2),#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:nth-child(2){width:86px!important;min-width:86px!important;max-width:86px!important}\
#page-planejamento table.rh30-ferias td:nth-child(3),#page-planejamento table.rh30-ferias thead tr:not(.rh30-group-head) th:nth-child(3){width:110px!important;min-width:110px!important}#page-planejamento table.rh30-ferias td:nth-child(4),#page-planejamento table.rh30-ferias th:nth-child(4){width:76px!important}#page-planejamento table.rh30-ferias td:nth-child(5),#page-planejamento table.rh30-ferias th:nth-child(5){width:68px!important}\
#page-planejamento table.rh30-readable .money,#page-planejamento table.rh30-readable .rh30-no-wrap{white-space:nowrap!important;word-break:normal!important;overflow-wrap:normal!important}#page-planejamento table.rh30-readable .money{text-align:right!important;font-variant-numeric:tabular-nums}\
#page-planejamento table.rh30-readable .rh30-group-start{border-left:2px solid color-mix(in srgb,var(--gold) 28%,var(--line-soft))!important}\
#page-planejamento table.rh30-readable tbody td:first-child,#page-planejamento table.rh30-readable tfoot td:first-child,#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:first-child{position:sticky;left:0;z-index:4;background:var(--surface)!important;box-shadow:8px 0 14px -14px rgba(0,0,0,.7)}\
#page-planejamento table.rh30-readable tbody td:nth-child(2),#page-planejamento table.rh30-readable tfoot td:nth-child(2),#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:nth-child(2){position:sticky;left:220px;z-index:3;background:var(--surface)!important;box-shadow:8px 0 14px -14px rgba(0,0,0,.7)}\
#page-planejamento table.rh30-readable tbody tr:nth-child(even) td:first-child,#page-planejamento table.rh30-readable tbody tr:nth-child(even) td:nth-child(2){background:color-mix(in srgb,var(--surface-2) 82%,var(--surface))!important}\
#page-planejamento table.rh30-readable tbody tr:hover td:first-child,#page-planejamento table.rh30-readable tbody tr:hover td:nth-child(2){background:color-mix(in srgb,var(--gold) 9%,var(--surface))!important}\
#page-planejamento table.rh30-readable tfoot td{position:sticky;bottom:0;z-index:5;background:var(--surface-2)!important;border-top:2px solid var(--gold)!important;font-weight:850!important}#page-planejamento table.rh30-readable tfoot td:first-child{z-index:7;background:var(--surface-2)!important}#page-planejamento table.rh30-readable tfoot td:nth-child(2){z-index:6;background:var(--surface-2)!important}\
#page-planejamento table.rh30-readable::-webkit-scrollbar{height:10px}\
@media(max-width:900px){#page-planejamento .rh30-scroll-note{margin-left:10px;margin-right:10px;align-items:flex-start;flex-wrap:wrap}#page-planejamento table.rh30-readable td:first-child,#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:first-child{width:190px!important;min-width:190px!important;max-width:190px!important}#page-planejamento table.rh30-readable tbody td:nth-child(2),#page-planejamento table.rh30-readable tfoot td:nth-child(2),#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:nth-child(2){left:190px}}';
    document.head.appendChild(s);
  }
  var oldSetup=typeof setupUI==='function'?setupUI:null;
  if(oldSetup)setupUI=function(){var r=oldSetup.apply(this,arguments);rhV30Styles();setTimeout(rhV30DecoratePlanningTables,0);return r;};
  var oldRender=typeof renderAll==='function'?renderAll:null;
  if(oldRender)renderAll=function(){var r=oldRender.apply(this,arguments);setTimeout(rhV30DecoratePlanningTables,0);return r;};
  rhV30Styles();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(rhV30DecoratePlanningTables,400);});else setTimeout(rhV30DecoratePlanningTables,400);
  window.rhV30DecoratePlanningTables=rhV30DecoratePlanningTables;
})();
/* RH v31 — rescisão calibrada com histórico importado e deduções reais quando disponíveis */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function floor2(v){return Math.floor((n(v)+1e-9)*100)/100}
function esc2(v){try{return esc(String(v==null?'':v))}catch(e){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}}
function money(v){try{return fmt(n(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}}
function date(v){if(!v)return null;var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x)?null:x}
function brdate(v){var x=v instanceof Date?v:date(v);return x?String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0')+'/'+x.getFullYear():'—'}
function parseBR(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function pid(p){return String(p&&p.colaborador_id||p&&p.id||'')}
function person(id){var p=(S.pessoas||[]).find(function(x){return pid(x)===String(id)});if(p)return p;var c=(S.colaboradores||[]).find(function(x){return String(x.id)===String(id)});return c||null}
function avos13(y,adm,dem,through){adm=date(adm);dem=date(dem);var q=0;for(var i=0;i<Math.min(12,through);i++){var s=new Date(y,i,1,12),e=new Date(y,i+1,0,12),a=s,b=e;if(adm&&adm>a)a=adm;if(dem&&dem<b)b=dem;if(b>=a&&Math.floor((b-a)/86400000)+1>=15)q++}return q}
function avosFerias(adm,end){adm=date(adm);if(!adm||end<adm)return 0;var a=new Date(end.getFullYear(),adm.getMonth(),adm.getDate(),12);if(a>end)a.setFullYear(a.getFullYear()-1);if(a<adm)a=adm;var q=0,c=new Date(a);while(c<=end&&q<12){var nx=new Date(c.getFullYear(),c.getMonth()+1,c.getDate(),12),pe=new Date(nx-86400000);if(pe>end)pe=end;if(Math.floor((pe-c)/86400000)+1>=15)q++;c=nx}return Math.min(12,q)}
function years(adm,end){adm=date(adm);if(!adm)return 0;var y=end.getFullYear()-adm.getFullYear(),a=new Date(end.getFullYear(),adm.getMonth(),adm.getDate(),12);if(end<a)y--;return Math.max(0,y)}
function inssBands(dt){var y=dt.getFullYear();if(y>=2026)return [[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]];if(y===2025)return [[1518,.075],[2793.88,.09],[4190.83,.12],[8157.41,.14]];if(y===2024)return [[1412,.075],[2666.68,.09],[4000.03,.12],[7786.02,.14]];if(y===2023)return [[1320,.075],[2571.29,.09],[3856.94,.12],[7507.49,.14]];return [[1412,.075],[2666.68,.09],[4000.03,.12],[7786.02,.14]]}
function inss(base,dt){base=Math.max(0,n(base));var b=inssBands(dt),prev=0,total=0;for(var i=0;i<b.length&&base>prev;i++){var top=b[i][0],rate=b[i][1],slice=Math.min(base,top)-prev;if(slice>0)total+=slice*rate;prev=top}return floor2(total)}
function irrfCfg(dt){var y=dt.getFullYear(),m=dt.getMonth()+1;if(y>=2026||y===2025&&m>=5)return [[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]];if(y===2025||y===2024)return [[2259.20,0,0],[2826.65,.075,169.44],[3751.05,.15,381.44],[4664.68,.225,662.77],[Infinity,.275,896.00]];if(y===2023&&m>=5)return [[2112,0,0],[2826.65,.075,158.40],[3751.05,.15,370.40],[4664.68,.225,651.73],[Infinity,.275,884.96]];return [[1903.98,0,0],[2826.65,.075,142.80],[3751.05,.15,354.80],[4664.68,.225,636.13],[Infinity,.275,869.36]]}
function irrf(gross,inssVal,dt){var base=Math.max(0,n(gross)-n(inssVal)),cfg=irrfCfg(dt),tax=0;for(var i=0;i<cfg.length;i++){if(base<=cfg[i][0]){tax=Math.max(0,base*cfg[i][1]-cfg[i][2]);break}}if(dt.getFullYear()>=2026){var rend=n(gross),red=0;if(rend<=5000)red=tax;else if(rend<=7350)red=Math.max(0,978.62-(.133145*rend));tax=Math.max(0,tax-red)}return floor2(tax)}
function isNetMarker(l){var c=String(l&&l.rubrica_codigo||l&&l.codigo||'').trim(),nm=String(l&&l.rubrica_nome||l&&l.nome||'').toUpperCase();return c==='51'||c==='8517'||nm.indexOf('LIQUIDO RESCISAO')>=0}
function termSpecific(l){var c=String(l&&l.rubrica_codigo||l&&l.codigo||'').trim(),nm=String(l&&l.rubrica_nome||l&&l.nome||'').toUpperCase();return ['9180','8550','29','8169','9591','9592','826','989','828','51','379'].indexOf(c)>=0||/RESCISAO|AVISO PREVIO|FERIAS PROPORCIONAIS/.test(nm)}
async function history(personId,dt){
  try{
    var comp=String(dt.getFullYear())+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-01';
    var cs=await api('rh_competencias?competencia=eq.'+comp+'&select=id,competencia');if(!cs||!cs.length)return null;
    var fs=await api('rh_folha_colaboradores?competencia_id=eq.'+cs[0].id+'&colaborador_id=eq.'+encodeURIComponent(personId)+'&select=*');if(!fs||!fs.length)return null;
    var f=fs[0],ls=await api('rh_lancamentos?folha_colaborador_id=eq.'+f.id+'&select=*&order=valor.desc');ls=ls||[];if(!ls.some(termSpecific))return null;
    var out={folha:f,lancamentos:ls,gross:0,discounts:0,net:0,inss:0,inss13:0,irrf:0,irrf13:0,other:0,fgts:n(f.valor_fgts)};
    var marker=0;
    ls.forEach(function(l){var type=String(l.tipo||'').toLowerCase(),v=n(l.valor),c=String(l.rubrica_codigo||'').trim(),nm=String(l.rubrica_nome||'').toUpperCase();if(type==='provento')out.gross+=v;if(type==='desconto'){if(isNetMarker(l)){marker+=v;return}out.discounts+=v;if(c==='826'||/INSS SOBRE RESCISAO/.test(nm))out.inss+=v;else if(c==='989'||/INSS 13/.test(nm))out.inss13+=v;else if(c==='828'||/IRRF SOBRE RESCISAO/.test(nm))out.irrf+=v;else if(/IRRF.*13/.test(nm))out.irrf13+=v;else out.other+=v;}});
    out.gross=r2(out.gross);out.discounts=r2(out.discounts);out.net=r2(marker||out.gross-out.discounts);out.inss=r2(out.inss);out.inss13=r2(out.inss13);out.irrf=r2(out.irrf);out.irrf13=r2(out.irrf13);out.other=r2(out.other);return out;
  }catch(e){return null}
}
function lines(a){return '<div class="rh-res-lines">'+a.filter(function(x){return Math.abs(n(x[1]))>.004}).map(function(x){return '<div><span>'+esc2(x[0])+'</span><b>'+money(x[1])+'</b></div>'}).join('')+'</div>'}
function cards(a){return '<div class="kpi-grid slim rh26-kpis">'+a.map(function(x){return '<div class="kpi '+(x[3]||'')+'"><span>'+esc2(x[0])+'</span><strong>'+esc2(x[1])+'</strong><small>'+esc2(x[2]||'')+'</small></div>'}).join('')+'</div>'}
function compareRows(sim,hist){if(!hist)return '';var rows=[['Total bruto',sim.bruto,hist.gross],['Deduções',sim.ded,hist.discounts],['Líquido',sim.liq,hist.net],['FGTS da rescisão',sim.fgTotal,hist.fgts]];return '<article class="panel rh31-compare"><div class="panel-head"><div><span class="panel-kicker">CONFERÊNCIA COM HISTÓRICO IMPORTADO</span><h3>Simulado x Rescisão real</h3><p>Valores importados da competência do desligamento, sem tratar “Líquido Rescisão” como desconto.</p></div></div><div class="table-wrap"><table><thead><tr><th>Item</th><th class="money">Simulado</th><th class="money">Real importado</th><th class="money">Diferença</th></tr></thead><tbody>'+rows.map(function(x){var d=r2(x[1]-x[2]),ok=Math.abs(d)<=.02;return '<tr><td>'+esc2(x[0])+'</td><td class="money">'+money(x[1])+'</td><td class="money">'+money(x[2])+'</td><td class="money '+(ok?'rh31-ok':'rh31-warn')+'"><b>'+money(d)+'</b></td></tr>'}).join('')+'</tbody></table></div></article>'}
async function calc(){
  var p=person(E('rh26-person')&&E('rh26-person').value);if(!p)return null;var dt=date(E('rh26-date')&&E('rh26-date').value)||new Date(),type=E('rh26-type')?E('rh26-type').value:'pedido',notice=E('rh26-notice')?E('rh26-notice').value:'na',hist=await history(pid(p),dt),salary=n(hist&&hist.folha&&hist.folha.salario)||n(p.salario),days=Math.min(30,dt.getDate()),saldo=salary/30*days,a13=avos13(dt.getFullYear(),p.admissao,dt,dt.getMonth()+1),v13=salary/12*a13,avf=avosFerias(p.admissao,dt),vf=salary/12*avf,ven=Math.max(0,n(E('rh26-over')&&E('rh26-over').value))*salary,ter=(vf+ven)/3,yd=years(p.admissao,dt),noticeDays=Math.min(90,30+yd*3),aviso=type==='empregador'&&notice==='indenizado'?salary/30*noticeDays:0,av13=aviso?salary/12:0,avfut=aviso?salary/12:0,cct=parseBR(E('rh26-cct')&&E('rh26-cct').value),cred=parseBR(E('rh26-cred')&&E('rh26-cred').value),manualDisc=parseBR(E('rh26-disc')&&E('rh26-disc').value),fg=parseBR(E('rh26-fgts')&&E('rh26-fgts').value),inssM=hist?hist.inss:inss(saldo,dt),inss13=hist?hist.inss13:inss(v13,dt),irrfM=hist?hist.irrf:irrf(saldo,inssM,dt),irrf13=hist?hist.irrf13:irrf(v13,inss13,dt),operational=manualDisc>0?manualDisc:(hist?hist.other:0),noticeDisc=type==='pedido'&&notice==='desconto'?salary:0,bruto=saldo+v13+vf+ven+ter+aviso+av13+avfut+cct+cred,ded=inssM+inss13+irrfM+irrf13+operational+noticeDisc,fgm=saldo*.08,fg13=(v13+av13)*.08,fgav=aviso*.08,multa=type==='empregador'?fg*.4:0,fgTotal=fgm+fg13+fgav;
  return{p:p,date:dt,type:type,notice:notice,hist:hist,salary:salary,days:days,saldo:r2(saldo),a13:a13,v13:r2(v13),avf:avf,vf:r2(vf),ven:r2(ven),ter:r2(ter),noticeDays:noticeDays,aviso:r2(aviso),av13:r2(av13),avfut:r2(avfut),cct:r2(cct),cred:r2(cred),inss:r2(inssM),inss13:r2(inss13),irrf:r2(irrfM),irrf13:r2(irrf13),operational:r2(operational),noticeDisc:r2(noticeDisc),bruto:r2(bruto),ded:r2(ded),liq:r2(bruto-ded),fg:r2(fg),fgm:r2(fgm),fg13:r2(fg13),fgav:r2(fgav),fgTotal:r2(fgTotal),multa:r2(multa),custo:r2(bruto+fgTotal+multa)}
}
async function render(){
  var box=E('rh26-result');if(!box)return;box.innerHTML='<div class="empty-state"><h2>Calculando...</h2><p>Conferindo histórico e bases da rescisão.</p></div>';
  var x=await calc();if(!x)return;window.rhV31TerminationResult=x;var hist=x.hist,mode=hist?'Conferência histórica':'Estimativa gerencial',taxLabel=hist?'histórico importado':'estimado pelas tabelas da competência';
  box.innerHTML='<div class="panel-head"><div><span class="panel-kicker">RELATÓRIO ANALÍTICO · '+esc2(mode.toUpperCase())+'</span><h2>'+esc2(x.p.nome||'Colaborador')+'</h2><p>'+(x.type==='empregador'?'Despedida sem justa causa pelo empregador':'Pedido de demissão')+' · '+brdate(x.date)+' · salário-base '+money(x.salary)+'</p></div></div>'+cards([['Total bruto',money(x.bruto),'verbas rescisórias'],['Deduções',money(x.ded),hist?'impostos + descontos reais identificados':'impostos estimados + descontos informados'],['Líquido',money(x.liq),'a pagar','featured'],['Custo empregador',money(x.custo),'bruto + FGTS/multa']])+'<div class="rh26-term"><div><h3>Verbas rescisórias</h3>'+lines([['Saldo de salário',x.saldo],['13º proporcional '+x.a13+'/12',x.v13],['Férias proporcionais '+x.avf+'/12',x.vf],['Férias vencidas',x.ven],['1/3 constitucional',x.ter],['Aviso-prévio indenizado '+x.noticeDays+' dias',x.aviso],['13º sobre aviso',x.av13],['Férias sobre aviso',x.avfut],['Indenização CCT',x.cct],['Outros créditos',x.cred]])+'</div><div><h3>Deduções</h3>'+lines([['INSS sobre rescisão ('+taxLabel+')',x.inss],['INSS 13º ('+taxLabel+')',x.inss13],['IRRF sobre rescisão ('+taxLabel+')',x.irrf],['IRRF 13º ('+taxLabel+')',x.irrf13],['Descontos operacionais / benefícios',x.operational],['Aviso descontado',x.noticeDisc]])+'</div></div><article class="panel rh26-base"><h3>Base de cálculo e FGTS</h3><div class="rh26-memory"><div><span>Saldo FGTS informado</span><b>'+money(x.fg)+'</b></div><div><span>FGTS mensal</span><b>'+money(x.fgm)+'</b></div><div><span>FGTS 13º</span><b>'+money(x.fg13)+'</b></div><div><span>FGTS aviso</span><b>'+money(x.fgav)+'</b></div><div><span>Multa FGTS</span><b>'+money(x.multa)+'</b></div><div><span>Base INSS mensal</span><b>'+money(x.saldo)+'</b></div><div><span>Base INSS 13º</span><b>'+money(x.v13)+'</b></div></div></article>'+compareRows(x,hist)+'<div class="rh-plan-warning"><b>'+esc2(mode)+'</b><span>'+(hist?'Foi encontrada uma rescisão importada na mesma competência. Impostos e descontos operacionais do histórico foram usados para calibrar a conferência.':'Sem rescisão histórica na competência: INSS/IRRF são estimados e benefícios/VR, médias, CCT, estabilidade e outros descontos devem ser informados ou integrados antes do cálculo oficial.')+'</span></div>';
}
function bind(){
  var btn=E('rh26-calc');if(!btn||btn.dataset.v31==='1')return false;btn.dataset.v31='1';btn.onclick=function(e){if(e)e.preventDefault();render().catch(function(err){try{toast('Não foi possível calcular a rescisão: '+err.message,true)}catch(ignore){}})};
  var type=E('rh26-type'),notice=E('rh26-notice');if(type&&notice){var sync=function(){if(type.value==='pedido'&&notice.value==='indenizado')notice.value='na'};type.addEventListener('change',sync);sync()}
  var form=btn.closest('.rh-plan-form');if(form&&!E('rh31-calibration-note')){var note=document.createElement('div');note.id='rh31-calibration-note';note.className='rh31-calibration-note';note.innerHTML='<b>Conferência automática</b><span>Se já existir rescisão importada para o colaborador na competência escolhida, o sistema compara a simulação com o histórico real e separa “Líquido Rescisão” dos descontos.</span>';form.insertBefore(note,btn)}
  return true;
}
function style(){if(E('_rh31'))return;var s=document.createElement('style');s.id='_rh31';s.textContent='.rh31-calibration-note{grid-column:1/-1;display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface-2);font-size:.75rem}.rh31-calibration-note b{color:var(--gold);white-space:nowrap}.rh31-calibration-note span{color:var(--muted)}.rh31-compare{margin-top:16px}.rh31-compare table{min-width:620px!important}.rh31-ok{color:var(--emerald,#41d6a3)!important}.rh31-warn{color:var(--red,#ff7676)!important}';document.head.appendChild(s)}
var oldRenderAll=renderAll;renderAll=function(){var out=oldRenderAll.apply(this,arguments);style();setTimeout(bind,0);return out};
var obs=new MutationObserver(function(){style();bind()});
function init(){style();bind();obs.observe(document.body,{childList:true,subtree:true})}
window.rhV31RenderTermination=render;window.rhV31HistoricalTermination=history;window.rhV31CalcTermination=calc;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
/* RH v32 — corrige contagem de avos de 13º quando o desligamento ocorre antes de 15 dias no mês */
(function(){
'use strict';
var oldRender=window.rhV31RenderTermination;
if(typeof oldRender!=='function')return;
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function d(v){if(!v)return null;if(v instanceof Date)return new Date(v.getTime());var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x)?null:x}
function money(v){try{return fmt(n(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}}
function avos13(y,adm,dem,through){adm=d(adm);dem=d(dem);var q=0;for(var i=0;i<Math.min(12,through);i++){var s=new Date(y,i,1,12),e=new Date(y,i+1,0,12),a=s,b=e;if(adm&&adm>a)a=adm;if(dem&&dem<b)b=dem;if(b>=a&&Math.floor((b-a)/86400000)+1>=15)q++}return q}
function inssBands(dt){var y=dt.getFullYear();if(y>=2026)return [[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]];if(y===2025)return [[1518,.075],[2793.88,.09],[4190.83,.12],[8157.41,.14]];if(y===2024)return [[1412,.075],[2666.68,.09],[4000.03,.12],[7786.02,.14]];if(y===2023)return [[1320,.075],[2571.29,.09],[3856.94,.12],[7507.49,.14]];return [[1412,.075],[2666.68,.09],[4000.03,.12],[7786.02,.14]]}
function inss(base,dt){base=Math.max(0,n(base));var b=inssBands(dt),prev=0,total=0;for(var i=0;i<b.length&&base>prev;i++){var top=b[i][0],rate=b[i][1],slice=Math.min(base,top)-prev;if(slice>0)total+=slice*rate;prev=top}return Math.floor((total+1e-9)*100)/100}
function irrfCfg(dt){var y=dt.getFullYear(),m=dt.getMonth()+1;if(y>=2026||y===2025&&m>=5)return [[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]];if(y===2025||y===2024)return [[2259.20,0,0],[2826.65,.075,169.44],[3751.05,.15,381.44],[4664.68,.225,662.77],[Infinity,.275,896.00]];if(y===2023&&m>=5)return [[2112,0,0],[2826.65,.075,158.40],[3751.05,.15,370.40],[4664.68,.225,651.73],[Infinity,.275,884.96]];return [[1903.98,0,0],[2826.65,.075,142.80],[3751.05,.15,354.80],[4664.68,.225,636.13],[Infinity,.275,869.36]]}
function irrf(gross,inssVal,dt){var base=Math.max(0,n(gross)-n(inssVal)),cfg=irrfCfg(dt),tax=0;for(var i=0;i<cfg.length;i++){if(base<=cfg[i][0]){tax=Math.max(0,base*cfg[i][1]-cfg[i][2]);break}}if(dt.getFullYear()>=2026){var rend=n(gross),red=0;if(rend<=5000)red=tax;else if(rend<=7350)red=Math.max(0,978.62-(.133145*rend));tax=Math.max(0,tax-red)}return Math.floor((tax+1e-9)*100)/100}
function correct(x){
  if(!x||!x.p||!x.date)return x;
  var dt=d(x.date);if(!dt)return x;
  var correctAvos=avos13(dt.getFullYear(),x.p.admissao,dt,dt.getMonth()+1);
  if(correctAvos===x.a13)return x;
  x.a13=correctAvos;
  x.v13=r2(n(x.salary)/12*correctAvos);
  if(!x.hist){x.inss13=r2(inss(x.v13,dt));x.irrf13=r2(irrf(x.v13,x.inss13,dt));}
  x.bruto=r2(n(x.saldo)+n(x.v13)+n(x.vf)+n(x.ven)+n(x.ter)+n(x.aviso)+n(x.av13)+n(x.avfut)+n(x.cct)+n(x.cred));
  x.ded=r2(n(x.inss)+n(x.inss13)+n(x.irrf)+n(x.irrf13)+n(x.operational)+n(x.noticeDisc));
  x.liq=r2(x.bruto-x.ded);
  x.fg13=r2((n(x.v13)+n(x.av13))*.08);
  x.fgTotal=r2(n(x.fgm)+n(x.fg13)+n(x.fgav));
  x.custo=r2(x.bruto+x.fgTotal+n(x.multa));
  return x;
}
function setCard(box,label,value){Array.from(box.querySelectorAll('.kpi')).forEach(function(card){var s=card.querySelector('span'),b=card.querySelector('strong');if(s&&b&&String(s.textContent||'').trim().toLowerCase()===label.toLowerCase())b.textContent=money(value)})}
function setLine(root,prefix,newLabel,value){if(!root)return;Array.from(root.children).forEach(function(row){var s=row.querySelector('span'),b=row.querySelector('b');if(!s||!b)return;var t=String(s.textContent||'').trim();if(t.toLowerCase().indexOf(prefix.toLowerCase())===0){s.textContent=newLabel||t;b.textContent=money(value)}})}
function setBase(box,label,value){Array.from(box.querySelectorAll('.rh26-base .rh26-memory>div')).forEach(function(row){var s=row.querySelector('span'),b=row.querySelector('b');if(s&&b&&String(s.textContent||'').trim().toLowerCase()===label.toLowerCase())b.textContent=money(value)})}
function patchCompare(box,x){if(!x.hist)return;var vals={'Total bruto':[x.bruto,x.hist.gross],'Deduções':[x.ded,x.hist.discounts],'Líquido':[x.liq,x.hist.net],'FGTS da rescisão':[x.fgTotal,x.hist.fgts]};var table=box.querySelector('.rh31-compare table');if(!table)return;Array.from(table.querySelectorAll('tbody tr')).forEach(function(tr){var td=tr.children;if(td.length<4)return;var item=String(td[0].textContent||'').trim(),v=vals[item];if(!v)return;var diff=r2(v[0]-v[1]);td[1].textContent=money(v[0]);td[2].textContent=money(v[1]);td[3].innerHTML='<b>'+money(diff)+'</b>';td[3].classList.toggle('rh31-ok',Math.abs(diff)<=.02);td[3].classList.toggle('rh31-warn',Math.abs(diff)>.02)})}
function patch(x){var box=E('rh26-result');if(!box||!x)return;setCard(box,'Total bruto',x.bruto);setCard(box,'Deduções',x.ded);setCard(box,'Líquido',x.liq);setCard(box,'Custo empregador',x.custo);var blocks=box.querySelectorAll('.rh26-term .rh-res-lines');setLine(blocks[0],'13º proporcional','13º proporcional '+x.a13+'/12',x.v13);setLine(blocks[1],'INSS 13º',null,x.inss13);setLine(blocks[1],'IRRF 13º',null,x.irrf13);setBase(box,'FGTS 13º',x.fg13);setBase(box,'Base INSS 13º',x.v13);patchCompare(box,x)}
async function render(){await oldRender();var x=correct(window.rhV31TerminationResult);window.rhV31TerminationResult=x;patch(x);return x}
function bind(){var btn=E('rh26-calc');if(!btn||btn.dataset.v32==='1')return;btn.dataset.v32='1';btn.onclick=function(e){if(e)e.preventDefault();render().catch(function(err){try{toast('Não foi possível calcular a rescisão: '+err.message,true)}catch(ignore){}})}}
var obs=new MutationObserver(function(){bind()});function init(){bind();obs.observe(document.body,{childList:true,subtree:true})}
window.rhV32RenderTermination=render;window.rhV32CorrectTermination=correct;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
/* RH v33 — garante aplicação visual e lógica da correção de avos no simulador de rescisão */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function d(v){if(!v)return null;if(v instanceof Date)return new Date(v.getTime());var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x)?null:x}
function money(v){try{return fmt(n(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}}
function avos13(y,adm,dem,through){adm=d(adm);dem=d(dem);var q=0;for(var i=0;i<Math.min(12,through);i++){var s=new Date(y,i,1,12),e=new Date(y,i+1,0,12),a=s,b=e;if(adm&&adm>a)a=adm;if(dem&&dem<b)b=dem;if(b>=a&&Math.floor((b-a)/86400000)+1>=15)q++}return q}
function isPedido(){var s=E('rh26-type');if(!s)return false;var txt=String((s.selectedOptions&&s.selectedOptions[0]&&s.selectedOptions[0].textContent)||s.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return /pedido.*empregado|pedido.*demissao|pedido do empregado/.test(txt)||String(s.value||'').toLowerCase().indexOf('pedido')>=0}
function syncNotice(){var s=E('rh26-notice');if(!s||!isPedido())return;var na=Array.from(s.options||[]).find(function(o){var t=String(o.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return /nao aplicavel/.test(t)||String(o.value||'').toLowerCase()==='na'});if(na)s.value=na.value}
function correct(){var x=window.rhV31TerminationResult;if(!x||!x.p||!x.date)return null;var dt=d(x.date);if(!dt)return null;var adm=x.p.admissao||x.p.data_admissao||x.p.admission_date||null;var a=avos13(dt.getFullYear(),adm,dt,dt.getMonth()+1);if(a!==x.a13){x.a13=a;x.v13=r2(n(x.salary)/12*a);x.bruto=r2(n(x.saldo)+n(x.v13)+n(x.vf)+n(x.ven)+n(x.ter)+n(x.aviso)+n(x.av13)+n(x.avfut)+n(x.cct)+n(x.cred));x.ded=r2(n(x.inss)+n(x.inss13)+n(x.irrf)+n(x.irrf13)+n(x.operational)+n(x.noticeDisc));x.liq=r2(x.bruto-x.ded);x.fg13=r2((n(x.v13)+n(x.av13))*.08);x.fgTotal=r2(n(x.fgm)+n(x.fg13)+n(x.fgav));x.custo=r2(x.bruto+x.fgTotal+n(x.multa));window.rhV31TerminationResult=x}return x}
function setCard(box,label,value){Array.from(box.querySelectorAll('.kpi')).forEach(function(card){var s=card.querySelector('span'),b=card.querySelector('strong');if(s&&b&&String(s.textContent||'').trim().toLowerCase()===label.toLowerCase())b.textContent=money(value)})}
function patchLine(root,prefix,label,value){if(!root)return;Array.from(root.children).forEach(function(row){var s=row.querySelector('span'),b=row.querySelector('b');if(!s||!b)return;var t=String(s.textContent||'').trim();if(t.toLowerCase().indexOf(prefix.toLowerCase())===0){s.textContent=label||t;b.textContent=money(value)}})}
function patchBase(box,label,value){Array.from(box.querySelectorAll('.rh26-base .rh26-memory>div')).forEach(function(row){var s=row.querySelector('span'),b=row.querySelector('b');if(s&&b&&String(s.textContent||'').trim().toLowerCase()===label.toLowerCase())b.textContent=money(value)})}
function patchCompare(box,x){if(!x.hist)return;var vals={'Total bruto':[x.bruto,x.hist.gross],'Deduções':[x.ded,x.hist.discounts],'Líquido':[x.liq,x.hist.net],'FGTS da rescisão':[x.fgTotal,x.hist.fgts]};Array.from(box.querySelectorAll('.rh31-compare tbody tr')).forEach(function(tr){var td=tr.children;if(td.length<4)return;var item=String(td[0].textContent||'').trim(),v=vals[item];if(!v)return;var diff=r2(v[0]-v[1]);td[1].textContent=money(v[0]);td[2].textContent=money(v[1]);td[3].innerHTML='<b>'+money(diff)+'</b>';td[3].classList.toggle('rh31-ok',Math.abs(diff)<=.02);td[3].classList.toggle('rh31-warn',Math.abs(diff)>.02)})}
var busy=false;
function apply(){if(busy)return;var box=E('rh26-result');if(!box)return;var x=correct();if(!x)return;busy=true;try{syncNotice();setCard(box,'Total bruto',x.bruto);setCard(box,'Deduções',x.ded);setCard(box,'Líquido',x.liq);setCard(box,'Custo empregador',x.custo);var blocks=box.querySelectorAll('.rh26-term .rh-res-lines');patchLine(blocks[0],'13º proporcional','13º proporcional '+x.a13+'/12',x.v13);patchBase(box,'FGTS 13º',x.fg13);patchBase(box,'Base INSS 13º',x.v13);patchCompare(box,x)}finally{setTimeout(function(){busy=false},0)}}
function schedule(){[0,60,180,400].forEach(function(ms){setTimeout(apply,ms)})}
function bind(){var btn=E('rh26-calc');if(btn&&!btn.dataset.v33){btn.dataset.v33='1';btn.addEventListener('click',schedule,true)}var type=E('rh26-type');if(type&&!type.dataset.v33){type.dataset.v33='1';type.addEventListener('change',function(){syncNotice();schedule()})}syncNotice()}
var obs=new MutationObserver(function(){bind();schedule()});
function init(){bind();obs.observe(document.body,{childList:true,subtree:true})}
window.rhV33ApplyTermination=apply;window.rhV33CorrectTermination=correct;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
/* RH v34 — motor remuneratório, férias adquiridas, histórico FGTS e custo rescisório completo */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function d(v){if(!v)return null;if(v instanceof Date)return new Date(v.getTime());var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x)?null:x}
function br(v){var x=d(v);return x?String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0')+'/'+x.getFullYear():'—'}
function money(v){try{return fmt(n(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}}
function esc2(v){try{return esc(String(v==null?'':v))}catch(e){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}}
function pbr(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function key(p){return String(p&&p.colaborador_id||p&&p.id||'')}
function person(id){var p=(S.pessoas||[]).find(function(x){return key(x)===String(id)});if(p)return p;return (S.colaboradores||[]).find(function(x){return String(x.id)===String(id)})||null}
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function isProvento(l){return String(l&&l.tipo||'').toLowerCase()==='provento'}
function lname(l){return norm(String(l&&l.rubrica_codigo||l&&l.codigo||'')+' '+String(l&&l.rubrica_nome||l&&l.nome||''))}
function recurringLine(l){var x=lname(l);if(!isProvento(l))return false;if(/FERIAS|13O|13º|DECIMO|RESCISAO|AVISO|ABONO|ADIANTAMENTO|SALARIO MATERNIDADE/.test(x))return false;return /ADICIONAL.*FUNCAO|DUPLA FUNCAO|GRATIFICACAO.*FUNCAO|INSALUBRIDADE|PERICULOSIDADE/.test(x)}
function variableLine(l){var x=lname(l);if(!isProvento(l)||recurringLine(l))return false;if(/FERIAS|13O|13º|DECIMO|RESCISAO|AVISO|ABONO|ADIANTAMENTO/.test(x))return false;return /HORA EXTRA|HORAS EXTRAS|COMISSAO|ADICIONAL NOTURNO|DSR|PREMIO|GRATIFICACAO VARIAVEL/.test(x)}
function monthDiff(a,b){a=d(a);b=d(b);if(!a||!b)return 0;return Math.max(0,(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth())}
function years(adm,end){adm=d(adm);end=d(end);if(!adm||!end)return 0;var y=end.getFullYear()-adm.getFullYear(),ann=new Date(end.getFullYear(),adm.getMonth(),adm.getDate(),12);if(end<ann)y--;return Math.max(0,y)}
function avos13(y,adm,end,through){adm=d(adm);end=d(end);var q=0;for(var i=0;i<Math.min(12,through);i++){var s=new Date(y,i,1,12),e=new Date(y,i+1,0,12),a=s,b=e;if(adm&&adm>a)a=adm;if(end&&end<b)b=end;if(b>=a&&Math.floor((b-a)/86400000)+1>=15)q++}return q}
function avosFerias(adm,end){adm=d(adm);end=d(end);if(!adm||!end||end<adm)return 0;var start=new Date(end.getFullYear(),adm.getMonth(),adm.getDate(),12);if(start>end)start.setFullYear(start.getFullYear()-1);if(start<adm)start=adm;var q=0,c=new Date(start);while(c<=end&&q<12){var nx=new Date(c.getFullYear(),c.getMonth()+1,c.getDate(),12),pe=new Date(nx-86400000);if(pe>end)pe=end;if(Math.floor((pe-c)/86400000)+1>=15)q++;c=nx}return Math.min(12,q)}
function noticeProjection(dt,days){var x=d(dt);if(!x)return null;return new Date(x.getTime()+days*86400000)}
function inssBands(dt){var y=dt.getFullYear();if(y>=2026)return [[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]];if(y===2025)return [[1518,.075],[2793.88,.09],[4190.83,.12],[8157.41,.14]];if(y===2024)return [[1412,.075],[2666.68,.09],[4000.03,.12],[7786.02,.14]];if(y===2023)return [[1320,.075],[2571.29,.09],[3856.94,.12],[7507.49,.14]];return [[1412,.075],[2666.68,.09],[4000.03,.12],[7786.02,.14]]}
function inss(base,dt){base=Math.max(0,n(base));var b=inssBands(dt),prev=0,total=0;for(var i=0;i<b.length&&base>prev;i++){var top=b[i][0],rate=b[i][1],slice=Math.min(base,top)-prev;if(slice>0)total+=slice*rate;prev=top}return Math.floor((total+1e-9)*100)/100}
function irrfCfg(dt){var y=dt.getFullYear(),m=dt.getMonth()+1;if(y>=2026||y===2025&&m>=5)return [[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]];if(y===2025||y===2024)return [[2259.20,0,0],[2826.65,.075,169.44],[3751.05,.15,381.44],[4664.68,.225,662.77],[Infinity,.275,896.00]];if(y===2023&&m>=5)return [[2112,0,0],[2826.65,.075,158.40],[3751.05,.15,370.40],[4664.68,.225,651.73],[Infinity,.275,884.96]];return [[1903.98,0,0],[2826.65,.075,142.80],[3751.05,.15,354.80],[4664.68,.225,636.13],[Infinity,.275,869.36]]}
function irrf(gross,inssVal,dt){var base=Math.max(0,n(gross)-n(inssVal)),cfg=irrfCfg(dt),tax=0;for(var i=0;i<cfg.length;i++){if(base<=cfg[i][0]){tax=Math.max(0,base*cfg[i][1]-cfg[i][2]);break}}if(dt.getFullYear()>=2026){var rend=n(gross),red=0;if(rend<=5000)red=tax;else if(rend<=7350)red=Math.max(0,978.62-(.133145*rend));tax=Math.max(0,tax-red)}return Math.floor((tax+1e-9)*100)/100}
function rates(){var e=(S.competencia&&S.competencia.encargos)||{},b=n(e.base_total_inss);return{inss:b&&n(e.inss_empresa)>0?n(e.inss_empresa)/b:.20,rat:b&&n(e.rat)>0?n(e.rat)/b:.01,terc:b&&n(e.terceiros)>0?n(e.terceiros)/b:.058,pis:b&&n(e.valor_pis)>0?n(e.valor_pis)/b:.01}}
async function getContext(pid,dt){
  var from='1900-01-01',p=person(pid);if(p&&p.admissao)from=String(p.admissao).slice(0,7)+'-01';
  var until=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-01';
  var comps=await api('rh_competencias?competencia=gte.'+from+'&competencia=lte.'+until+'&select=id,competencia&order=competencia.asc');
  comps=comps||[];if(!comps.length)return{rows:[],latest:null,latestLaunches:[],recurring:[],variableAvg:0,fgtsKnown:0,first:null,last:null,gaps:0,salaryHistory:[]};
  var ids=comps.map(function(c){return c.id});
  var fs=await api('rh_folha_colaboradores?colaborador_id=eq.'+encodeURIComponent(pid)+'&competencia_id=in.('+ids.join(',')+')&select=id,competencia_id,salario,proventos,descontos,liquido,base_inss,base_fgts,valor_fgts');
  fs=fs||[];var cm={};comps.forEach(function(c){cm[String(c.id)]=c.competencia});fs.forEach(function(f){f._comp=cm[String(f.competencia_id)]||''});
  fs.sort(function(a,b){return String(a._comp).localeCompare(String(b._comp))});
  var latest=fs[fs.length-1]||null,last12=fs.slice(-12),launches=[];
  if(last12.length){var fids=last12.map(function(f){return f.id});launches=await api('rh_lancamentos?folha_colaborador_id=in.('+fids.join(',')+')&select=*')||[]}
  var fm={};last12.forEach(function(f){fm[String(f.id)]=f._comp});launches.forEach(function(l){l._comp=fm[String(l.folha_colaborador_id)]||''});
  var latestLaunches=latest?launches.filter(function(l){return String(l.folha_colaborador_id)===String(latest.id)}):[];
  var recurring=latestLaunches.filter(recurringLine).map(function(l){return{codigo:String(l.rubrica_codigo||l.codigo||''),nome:String(l.rubrica_nome||l.nome||'Verba recorrente'),valor:n(l.valor)}});
  var monthSums={};launches.filter(variableLine).forEach(function(l){var k=l._comp||'sem';monthSums[k]=(monthSums[k]||0)+n(l.valor)});
  var represented=Math.max(1,last12.length),variableAvg=Object.keys(monthSums).reduce(function(s,k){return s+monthSums[k]},0)/represented;
  var fgtsKnown=fs.reduce(function(s,f){return s+n(f.valor_fgts)},0),first=fs.length?fs[0]._comp:null,last=fs.length?fs[fs.length-1]._comp:null,gaps=0;
  if(p&&p.admissao&&first)gaps=monthDiff(String(p.admissao).slice(0,7)+'-01',first);
  var salaryHistory=[],lastSal=null;fs.forEach(function(f){var sal=n(f.salario);if(lastSal===null||Math.abs(sal-lastSal)>.004){salaryHistory.push({competencia:f._comp,salario:sal});lastSal=sal}});
  return{rows:fs,latest:latest,latestLaunches:latestLaunches,recurring:recurring,variableAvg:r2(variableAvg),fgtsKnown:r2(fgtsKnown),first:first,last:last,gaps:gaps,salaryHistory:salaryHistory};
}
async function historicalTermination(pid,dt){try{if(typeof window.rhV31HistoricalTermination==='function')return await window.rhV31HistoricalTermination(pid,dt)}catch(e){}return null}
function ensureForm(){
  var pane=document.querySelector('[data-plan-pane="rescisao"]');if(!pane)return false;
  var over=E('rh26-over');if(over){var lab=over.closest('label');if(lab){var text=lab.childNodes[0];if(text&&text.nodeType===3)text.nodeValue='Períodos adquiridos e não gozados';else lab.insertAdjacentText('afterbegin','Períodos adquiridos e não gozados')}}
  var fg=E('rh26-fgts');if(fg){var fl=fg.closest('label');if(fl){var ft=fl.childNodes[0];if(ft&&ft.nodeType===3)ft.nodeValue='Saldo/Base FGTS oficial (opcional)'}}
  var form=E('rh26-calc')&&E('rh26-calc').closest('.rh-plan-form');if(!form)return false;
  if(!E('rh34-double')){var lbl=document.createElement('label');lbl.innerHTML='Períodos fora do prazo concessivo<input id="rh34-double" type="number" min="0" value="0">';var anchor=over&&over.closest('label');if(anchor)anchor.insertAdjacentElement('afterend',lbl);else form.insertBefore(lbl,E('rh26-calc'))}
  if(!E('rh34-varavg')){var lbl2=document.createElement('label');lbl2.innerHTML='Média variável para reflexos (opcional)<input id="rh34-varavg" inputmode="decimal" placeholder="Automática">';var cct=E('rh26-cct')&&E('rh26-cct').closest('label');if(cct)cct.insertAdjacentElement('beforebegin',lbl2);else form.insertBefore(lbl2,E('rh26-calc'))}
  if(!E('rh34-base-preview')){var note=document.createElement('div');note.id='rh34-base-preview';note.className='rh34-base-preview';note.innerHTML='<b>Base remuneratória</b><span>Ao gerar, o sistema busca salário vigente, verbas salariais recorrentes, médias variáveis e histórico de FGTS.</span>';form.insertBefore(note,E('rh26-calc'))}
  var btn=E('rh26-calc');if(btn&&!btn.dataset.v34){var clone=btn.cloneNode(true);clone.dataset.v31='1';clone.dataset.v32='1';clone.dataset.v33='1';clone.dataset.v34='1';btn.replaceWith(clone);clone.onclick=function(e){if(e)e.preventDefault();render().catch(function(err){try{toast('Não foi possível calcular a rescisão: '+err.message,true)}catch(ignore){}})}}
  var type=E('rh26-type'),notice=E('rh26-notice');if(type&&notice&&!type.dataset.v34){type.dataset.v34='1';type.addEventListener('change',function(){var t=String(type.value||'');if(t==='pedido'){var op=Array.from(notice.options).find(function(o){return o.value==='na'});if(op)notice.value=op.value}})}
  return true;
}
function cards(a){return '<div class="kpi-grid slim rh26-kpis">'+a.map(function(x){return '<div class="kpi '+(x[3]||'')+'"><span>'+esc2(x[0])+'</span><strong>'+esc2(x[1])+'</strong><small>'+esc2(x[2]||'')+'</small></div>'}).join('')+'</div>'}
function lines(a){return '<div class="rh-res-lines">'+a.filter(function(x){return Math.abs(n(x[1]))>.004}).map(function(x){return '<div><span>'+esc2(x[0])+'</span><b>'+money(x[1])+'</b></div>'}).join('')+'</div>'}
function compareRows(x,h){if(!h)return '';var rows=[['Total bruto',x.bruto,h.gross],['Deduções',x.ded,h.discounts],['Líquido',x.liq,h.net],['FGTS da rescisão',x.fgNew,h.fgts]];return '<article class="panel rh31-compare"><div class="panel-head"><div><span class="panel-kicker">CONFERÊNCIA COM HISTÓRICO IMPORTADO</span><h3>Simulado x Rescisão real</h3></div></div><div class="table-wrap"><table><thead><tr><th>Item</th><th class="money">Simulado</th><th class="money">Real importado</th><th class="money">Diferença</th></tr></thead><tbody>'+rows.map(function(q){var diff=r2(q[1]-q[2]);return '<tr><td>'+esc2(q[0])+'</td><td class="money">'+money(q[1])+'</td><td class="money">'+money(q[2])+'</td><td class="money '+(Math.abs(diff)<=.02?'rh31-ok':'rh31-warn')+'"><b>'+money(diff)+'</b></td></tr>'}).join('')+'</tbody></table></div></article>'}
function salaryHistory(ctx){if(!ctx.salaryHistory.length)return '';return '<article class="panel rh34-history"><div class="panel-head"><div><span class="panel-kicker">HISTÓRICO SALARIAL</span><h3>Evolução do salário-base</h3><p>Os reajustes anteriores ficam no histórico; a rescisão fixa usa o salário vigente na data.</p></div></div><div class="rh34-history-grid">'+ctx.salaryHistory.slice(-8).map(function(x){return '<div><span>'+esc2(String(x.competencia||'').slice(5,7)+'/'+String(x.competencia||'').slice(0,4))+'</span><b>'+money(x.salario)+'</b></div>'}).join('')+'</div></article>'}
async function calc(){
  var p=person(E('rh26-person')&&E('rh26-person').value);if(!p)throw new Error('Colaborador não encontrado.');
  var dt=d(E('rh26-date')&&E('rh26-date').value)||new Date(),type=E('rh26-type')?E('rh26-type').value:'pedido',notice=E('rh26-notice')?E('rh26-notice').value:'na';
  if(type==='pedido'&&notice==='indenizado')notice='na';
  var ctx=await getContext(key(p),dt),hist=await historicalTermination(key(p),dt),salary=n(ctx.latest&&ctx.latest.salario)||n(p.salario);
  var recurringTotal=r2(ctx.recurring.reduce(function(s,x){return s+n(x.valor)},0)),manualAvg=pbr(E('rh34-varavg')&&E('rh34-varavg').value),avg=manualAvg>0?manualAvg:ctx.variableAvg;
  var fixedBase=r2(salary+recurringTotal),reflectionBase=r2(fixedBase+avg),days=Math.min(30,dt.getDate()),saldo=r2(fixedBase/30*days);
  var yd=years(p.admissao,dt),noticeDays=Math.min(90,30+yd*3),aviso=type==='empregador'&&notice==='indenizado'?r2(reflectionBase/30*noticeDays):0,proj=aviso?noticeProjection(dt,noticeDays):dt;
  var a13=avos13(dt.getFullYear(),p.admissao,dt,dt.getMonth()+1),a13Proj=avos13(dt.getFullYear(),p.admissao,proj,proj.getMonth()+1),extra13=Math.max(0,a13Proj-a13),v13=r2(reflectionBase/12*a13),v13Aviso=r2(reflectionBase/12*extra13);
  var avf=avosFerias(p.admissao,dt),avfProj=avosFerias(p.admissao,proj),extraFerias=Math.max(0,avfProj-avf),vf=r2(reflectionBase/12*avf),vfAviso=r2(reflectionBase/12*extraFerias);
  var acquired=Math.max(0,n(E('rh26-over')&&E('rh26-over').value)),overdue=Math.max(0,n(E('rh34-double')&&E('rh34-double').value)),feriasAdq=r2(reflectionBase*acquired),ter=r2((feriasAdq+vf+vfAviso)/3),dobroExtra=r2(reflectionBase*4/3*overdue);
  var cct=pbr(E('rh26-cct')&&E('rh26-cct').value),cred=pbr(E('rh26-cred')&&E('rh26-cred').value),manualDisc=pbr(E('rh26-disc')&&E('rh26-disc').value),officialFg=pbr(E('rh26-fgts')&&E('rh26-fgts').value);
  var inssM=hist?hist.inss:inss(saldo,dt),inss13=hist?hist.inss13:inss(v13+v13Aviso,dt),irrfM=hist?hist.irrf:irrf(saldo,inssM,dt),irrf13=hist?hist.irrf13:irrf(v13+v13Aviso,inss13,dt),operational=manualDisc>0?manualDisc:(hist?hist.other:0),noticeDisc=type==='pedido'&&notice==='desconto'?fixedBase:0;
  var bruto=r2(saldo+v13+v13Aviso+vf+vfAviso+feriasAdq+ter+dobroExtra+aviso+cct+cred),ded=r2(inssM+inss13+irrfM+irrf13+operational+noticeDisc),liq=r2(bruto-ded);
  var fgm=r2(saldo*.08),fg13=r2((v13+v13Aviso)*.08),fgav=r2(aviso*.08),fgNew=r2(fgm+fg13+fgav),fgHist=officialFg>0?officialFg:ctx.fgtsKnown,multaBase=r2(fgHist+fgNew),multa=type==='empregador'?r2(multaBase*.40):0;
  var rr=rates(),patBase=r2(saldo+v13+v13Aviso),patInss=r2(patBase*rr.inss),patRat=r2(patBase*rr.rat),patTerc=r2(patBase*rr.terc),patPis=r2(patBase*rr.pis),patTotal=r2(patInss+patRat+patTerc+patPis),custo=r2(bruto+fgNew+multa+patTotal);
  return{p:p,date:dt,type:type,notice:notice,ctx:ctx,hist:hist,salary:salary,recurringTotal:recurringTotal,avg:avg,fixedBase:fixedBase,reflectionBase:reflectionBase,days:days,saldo:saldo,noticeDays:noticeDays,proj:proj,aviso:aviso,a13:a13,extra13:extra13,v13:v13,v13Aviso:v13Aviso,avf:avf,extraFerias:extraFerias,vf:vf,vfAviso:vfAviso,acquired:acquired,overdue:overdue,feriasAdq:feriasAdq,ter:ter,dobroExtra:dobroExtra,cct:cct,cred:cred,inss:inssM,inss13:inss13,irrf:irrfM,irrf13:irrf13,operational:operational,noticeDisc:noticeDisc,bruto:bruto,ded:ded,liq:liq,fgOfficial:officialFg,fgHist:fgHist,fgm:fgm,fg13:fg13,fgav:fgav,fgNew:fgNew,multaBase:multaBase,multa:multa,patBase:patBase,patInss:patInss,patRat:patRat,patTerc:patTerc,patPis:patPis,patTotal:patTotal,custo:custo};
}
async function render(){
  ensureForm();var box=E('rh26-result');if(!box)return;box.innerHTML='<div class="empty-state"><h2>Calculando...</h2><p>Buscando remuneração vigente, médias, histórico de FGTS e incidências.</p></div>';
  var x=await calc();window.rhV34TerminationResult=x;
  var recur=x.ctx.recurring.length?x.ctx.recurring.map(function(v){return '<div><span>'+esc2(v.nome)+'</span><b>'+money(v.valor)+'</b></div>'}).join(''):'<div><span>Verbas recorrentes adicionais</span><b>'+money(0)+'</b></div>';
  var fgNote=x.fgOfficial>0?'Saldo oficial informado manualmente.':(x.ctx.gaps>0?'Estimativa mínima: faltam '+x.ctx.gaps+' competência(s) anteriores à primeira folha importada.':'Histórico importado cobre o vínculo conhecido.');
  box.innerHTML=
    '<div class="panel-head"><div><span class="panel-kicker">RELATÓRIO ANALÍTICO · '+(x.hist?'CONFERÊNCIA HISTÓRICA':'ESTIMATIVA GERENCIAL')+'</span><h2>'+esc2(x.p.nome||'Colaborador')+'</h2><p>'+(x.type==='empregador'?'Despedida sem justa causa pelo empregador':'Pedido de demissão')+' · '+br(x.date)+'</p></div></div>'+
    cards([['Total bruto',money(x.bruto),'verbas rescisórias'],['Deduções',money(x.ded),x.hist?'impostos + descontos históricos':'impostos estimados + descontos'],['Líquido',money(x.liq),'estimativa a pagar','featured'],['Custo empregador',money(x.custo),'bruto + FGTS + multa + encargos']])+
    '<article class="panel rh34-rem"><div class="panel-head"><div><span class="panel-kicker">BASE REMUNERATÓRIA</span><h3>Remuneração usada nos reflexos</h3><p>Salários antigos ficam no histórico e não reduzem a base fixa atual.</p></div></div><div class="rh26-memory"><div><span>Salário-base vigente</span><b>'+money(x.salary)+'</b></div>'+recur+'<div><span>Média variável '+(pbr(E('rh34-varavg')&&E('rh34-varavg').value)>0?'informada':'detectada')+'</span><b>'+money(x.avg)+'</b></div><div class="total"><span>Base para aviso / 13º / férias</span><b>'+money(x.reflectionBase)+'</b></div></div></article>'+
    '<div class="rh26-term"><div><h3>Verbas rescisórias</h3>'+lines([['Saldo de salário '+x.days+' dias',x.saldo],['13º proporcional '+x.a13+'/12',x.v13],['13º sobre projeção do aviso '+x.extra13+'/12',x.v13Aviso],['Férias proporcionais '+x.avf+'/12',x.vf],['Férias sobre projeção do aviso '+x.extraFerias+'/12',x.vfAviso],['Período(s) adquirido(s) e não gozado(s)',x.feriasAdq],['1/3 constitucional',x.ter],['Adicional por férias fora do prazo (estim.)',x.dobroExtra],['Aviso-prévio indenizado '+x.noticeDays+' dias',x.aviso],['Indenização CCT / outra verba',x.cct],['Outros créditos',x.cred]])+'</div><div><h3>Deduções</h3>'+lines([['INSS mensal',x.inss],['INSS 13º',x.inss13],['IRRF mensal',x.irrf],['IRRF 13º',x.irrf13],['Descontos operacionais / benefícios',x.operational],['Aviso descontado',x.noticeDisc]])+'</div></div>'+
    '<article class="panel rh26-base"><h3>FGTS e multa rescisória</h3><div class="rh26-memory"><div><span>FGTS histórico conhecido</span><b>'+money(x.fgHist)+'</b></div><div><span>FGTS do mês</span><b>'+money(x.fgm)+'</b></div><div><span>FGTS 13º</span><b>'+money(x.fg13)+'</b></div><div><span>FGTS aviso</span><b>'+money(x.fgav)+'</b></div><div><span>Novo FGTS da rescisão</span><b>'+money(x.fgNew)+'</b></div><div><span>Base conhecida para multa</span><b>'+money(x.multaBase)+'</b></div><div class="total"><span>Multa de 40% '+(x.fgOfficial>0?'':'(mínima estimada)')+'</span><b>'+money(x.multa)+'</b></div></div><p class="detail-note">'+esc2(fgNote)+(x.ctx.first?' · Histórico: '+esc2(String(x.ctx.first).slice(5,7)+'/'+String(x.ctx.first).slice(0,4))+' a '+esc2(String(x.ctx.last).slice(5,7)+'/'+String(x.ctx.last).slice(0,4)):'')+'</p></article>'+
    '<article class="panel rh34-patronal"><h3>Encargos e custo do empregador</h3><div class="rh26-memory"><div><span>Base patronal estimada</span><b>'+money(x.patBase)+'</b></div><div><span>INSS patronal</span><b>'+money(x.patInss)+'</b></div><div><span>RAT</span><b>'+money(x.patRat)+'</b></div><div><span>Terceiros</span><b>'+money(x.patTerc)+'</b></div><div><span>PIS folha</span><b>'+money(x.patPis)+'</b></div><div><span>FGTS novo</span><b>'+money(x.fgNew)+'</b></div><div><span>Multa FGTS</span><b>'+money(x.multa)+'</b></div><div class="total"><span>Custo total estimado</span><b>'+money(x.custo)+'</b></div></div></article>'+
    salaryHistory(x.ctx)+compareRows(x,x.hist)+
    '<div class="rh-plan-warning"><b>Estimativa gerencial</b><span>O cálculo usa a remuneração vigente, adiciona verbas salariais recorrentes detectadas, médias variáveis quando identificadas, diferencia férias adquiridas de férias fora do prazo e estima a multa de FGTS com o histórico disponível. Para pagamento oficial, conferir FGTS Digital, CCT, médias, estabilidade e incidências da folha.</span></div>';
  var prev=E('rh34-base-preview');if(prev)prev.innerHTML='<b>Base remuneratória atual</b><span>'+money(x.salary)+' salário + '+money(x.recurringTotal)+' recorrentes + '+money(x.avg)+' média = <strong>'+money(x.reflectionBase)+'</strong></span>';
  try{if(typeof rhFitAllCardValues==='function')setTimeout(rhFitAllCardValues,0)}catch(ignore){}
}
function style(){if(E('_rh34'))return;var s=document.createElement('style');s.id='_rh34';s.textContent='.rh34-base-preview{grid-column:1/-1;display:flex;gap:10px;align-items:center;padding:11px 12px;border:1px solid var(--line-soft);border-radius:11px;background:var(--surface-2);font-size:.78rem}.rh34-base-preview b{color:var(--gold);white-space:nowrap}.rh34-base-preview span{color:var(--muted)}.rh34-rem,.rh34-patronal,.rh34-history{margin-top:16px}.rh34-history-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.rh34-history-grid>div{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface-2)}.rh34-history-grid span{color:var(--muted)}.rh34-history-grid b{white-space:nowrap}@media(max-width:900px){.rh34-base-preview{align-items:flex-start;flex-direction:column}}';document.head.appendChild(s)}
var obs=new MutationObserver(function(){style();ensureForm()});
function init(){style();ensureForm();obs.observe(document.body,{childList:true,subtree:true})}
window.rhV34TerminationContext=getContext;window.rhV34CalcTermination=calc;window.rhV34RenderTermination=render;window.rhV34EnsureTerminationForm=ensureForm;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();/* RH v35 — aplica a base remuneratória vigente às provisões de 13º e férias */
(function(){
'use strict';
var cache=new Map(),busy=false,timer=0;
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function money(v){try{return fmt(n(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}}
function parse(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function esc2(v){try{return esc(String(v==null?'':v))}catch(e){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}}
function d(v){if(!v)return null;var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x)?null:x}
function anchor(){var a=(window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(S.competencia?[S.competencia]:[])).slice().sort(function(x,y){return String(x.competencia||'').localeCompare(String(y.competencia||''))}),c=a[a.length-1],x=d(c&&c.competencia);return x?new Date(x.getFullYear(),x.getMonth()+1,0,12):new Date()}
function rates(){var e=(S.competencia&&S.competencia.encargos)||{},b=n(e.base_total_inss);return{inss:b&&n(e.inss_empresa)>0?n(e.inss_empresa)/b:.20,rat:b&&n(e.rat)>0?n(e.rat)/b:.01,terc:b&&n(e.terceiros)>0?n(e.terceiros)/b:.058,fgts:.08,pis:b&&n(e.valor_pis)>0?n(e.valor_pis)/b:.01}}
function ctx(id,a){var k=id+'|'+a.getFullYear()+'-'+String(a.getMonth()+1).padStart(2,'0');if(cache.has(k))return cache.get(k);var p=Promise.resolve(window.rhV34TerminationContext(id,a));cache.set(k,p);return p}
function base(c){return r2(n(c&&c.latest&&c.latest.salario)+(c&&c.recurring||[]).reduce(function(s,x){return s+n(x.valor)},0)+n(c&&c.variableAvg))}
function setKpi(p,label,val,small){Array.from(p.querySelectorAll('.kpi')).forEach(function(k){var s=k.querySelector('span'),b=k.querySelector('strong'),sm=k.querySelector('small');if(s&&b&&String(s.textContent||'').trim().toLowerCase()===label.toLowerCase()){b.textContent=money(val);if(sm&&small)sm.textContent=small}})}
function updateCc(panel,detailRows){var tables=panel.querySelectorAll('table'),t=tables.length>1?tables[0]:null;if(!t)return;var g={};detailRows.forEach(function(x){if(!g[x.cc])g[x.cc]={cc:x.cc,n:0,s:0,e:0,t:0};g[x.cc].n++;g[x.cc].s+=x.saldo;g[x.cc].e+=x.enc;g[x.cc].t+=x.total});var arr=Object.keys(g).map(function(k){return g[k]}).sort(function(a,b){return b.t-a.t});var tb=t.querySelector('tbody');if(tb)tb.innerHTML=arr.map(function(x){return '<tr><td><b>'+esc2(x.cc)+'</b></td><td class="money">'+x.n+'</td><td class="money">'+money(x.s)+'</td><td class="money">'+money(x.e)+'</td><td class="money"><b>'+money(x.t)+'</b></td></tr>'}).join('');var tf=t.querySelector('tfoot tr');if(tf&&tf.children.length>=5){tf.children[1].textContent=detailRows.length;tf.children[2].innerHTML='<b>'+money(detailRows.reduce(function(s,x){return s+x.saldo},0))+'</b>';tf.children[3].innerHTML='<b>'+money(detailRows.reduce(function(s,x){return s+x.enc},0))+'</b>';tf.children[4].innerHTML='<b>'+money(detailRows.reduce(function(s,x){return s+x.total},0))+'</b>'}}
async function patch13(){
  var p=document.querySelector('[data-plan-pane="13"]');if(!p||typeof window.rhV34TerminationContext!=='function')return;
  var table=p.querySelector('table.rh26-wide');if(!table)return;var a=anchor(),rr=rates(),trs=Array.from(table.querySelectorAll('tbody tr.rh26-row'));
  var contexts=await Promise.all(trs.map(function(tr){return ctx(tr.dataset.id,a)})),rows=[];
  trs.forEach(function(tr,i){var c=contexts[i],b=base(c),td=tr.children;if(td.length<16)return;var av=parseInt(String(td[3].textContent||'0'),10)||0,prev=parse(td[4].textContent),pm=av?b/12:0,current=b/12*av,pago=parse(td[7].textContent),adi=parse(td[8].textContent),aj=current-prev-pm,saldo=Math.max(0,current-pago-adi),ei=saldo*rr.inss,er=saldo*rr.rat,et=saldo*rr.terc,ef=saldo*rr.fgts,ep=saldo*rr.pis,enc=ei+er+et+ef+ep,total=saldo+enc,cc=String(td[1].textContent||'Sem CC').trim();
    td[2].textContent=money(b);td[2].title='Base remuneratória: salário vigente + verbas recorrentes + média variável detectada';
    td[4].textContent=money(prev);td[5].textContent=money(pm);td[6].textContent=money(aj);td[9].innerHTML='<b>'+money(saldo)+'</b>';td[10].textContent=money(ei);td[11].textContent=money(er);td[12].textContent=money(et);td[13].textContent=money(ef);td[14].textContent=money(ep);td[15].innerHTML='<b>'+money(total)+'</b>';
    var sm=td[0].querySelector('small');if(sm&&!td[0].querySelector('.rh35-base'))td[0].insertAdjacentHTML('beforeend','<small class="rh35-base">Base remun.: '+money(b)+'</small>');
    rows.push({cc:cc,prev:prev,pm:pm,aj:aj,pago:pago,adi:adi,saldo:saldo,ei:ei,er:er,et:et,ef:ef,ep:ep,enc:enc,total:total})
  });
  var th=table.querySelector('thead th:nth-child(3)');if(th)th.textContent='Base remun.';
  var tf=table.querySelector('tfoot tr');if(tf&&tf.children.length>=16){var sum=function(k){return rows.reduce(function(s,x){return s+n(x[k])},0)};[[4,'prev'],[5,'pm'],[6,'aj'],[7,'pago'],[8,'adi'],[9,'saldo'],[10,'ei'],[11,'er'],[12,'et'],[13,'ef'],[14,'ep'],[15,'total']].forEach(function(q){tf.children[q[0]].innerHTML=(q[0]===9||q[0]===15?'<b>':'')+money(sum(q[1]))+(q[0]===9||q[0]===15?'</b>':'')})}
  setKpi(p,'Saldo provisionado',rows.reduce(function(s,x){return s+x.saldo},0));setKpi(p,'Provisão do mês',rows.reduce(function(s,x){return s+x.pm},0));setKpi(p,'Encargos sobre saldo',rows.reduce(function(s,x){return s+x.enc},0));setKpi(p,'Custo provisionado',rows.reduce(function(s,x){return s+x.total},0));
  updateCc(p,rows);p.dataset.rh35='1';
}
async function patchFerias(){
  var p=document.querySelector('[data-plan-pane="ferias"]');if(!p||typeof window.rhV34TerminationContext!=='function')return;
  var table=p.querySelector('table.rh26-wide');if(!table)return;var a=anchor(),rr=rates(),trs=Array.from(table.querySelectorAll('tbody tr.rh26-row')),contexts=await Promise.all(trs.map(function(tr){return ctx(tr.dataset.id,a)})),rows=[];
  trs.forEach(function(tr,i){var c=contexts[i],b=base(c),td=tr.children;if(td.length<19)return;var av=parseInt(String(td[4].textContent||'0'),10)||0,prev=parse(td[5].textContent),pm=b/12*4/3,fer=b/12*av,ter=fer/3,current=fer+ter,goz=parse(td[10].textContent),ind=parse(td[11].textContent),aj=current-prev-pm,saldo=Math.max(0,current-goz-ind),ei=saldo*rr.inss,er=saldo*rr.rat,et=saldo*rr.terc,ef=saldo*rr.fgts,ep=saldo*rr.pis,enc=ei+er+et+ef+ep,total=saldo+enc,cc=String(td[1].textContent||'Sem CC').trim();
    td[5].textContent=money(prev);td[6].textContent=money(pm);td[7].textContent=money(aj);td[8].textContent=money(fer);td[9].textContent=money(ter);td[12].innerHTML='<b>'+money(saldo)+'</b>';td[13].textContent=money(ei);td[14].textContent=money(er);td[15].textContent=money(et);td[16].textContent=money(ef);td[17].textContent=money(ep);td[18].innerHTML='<b>'+money(total)+'</b>';
    if(!td[0].querySelector('.rh35-base'))td[0].insertAdjacentHTML('beforeend','<small class="rh35-base">Base remun.: '+money(b)+'</small>');
    rows.push({cc:cc,prev:prev,pm:pm,aj:aj,fer:fer,ter:ter,goz:goz,ind:ind,saldo:saldo,ei:ei,er:er,et:et,ef:ef,ep:ep,enc:enc,total:total})
  });
  var tf=table.querySelector('tfoot tr');if(tf&&tf.children.length>=19){var sum=function(k){return rows.reduce(function(s,x){return s+n(x[k])},0)};[[5,'prev'],[6,'pm'],[7,'aj'],[8,'fer'],[9,'ter'],[10,'goz'],[11,'ind'],[12,'saldo'],[13,'ei'],[14,'er'],[15,'et'],[16,'ef'],[17,'ep'],[18,'total']].forEach(function(q){tf.children[q[0]].innerHTML=(q[0]===12||q[0]===18?'<b>':'')+money(sum(q[1]))+(q[0]===12||q[0]===18?'</b>':'')})}
  setKpi(p,'Saldo provisionado',rows.reduce(function(s,x){return s+x.saldo},0));setKpi(p,'Provisão do mês',rows.reduce(function(s,x){return s+x.pm},0));setKpi(p,'Encargos sobre saldo',rows.reduce(function(s,x){return s+x.enc},0));setKpi(p,'Custo provisionado',rows.reduce(function(s,x){return s+x.total},0));
  updateCc(p,rows);p.dataset.rh35='1';
}
async function run(){if(busy)return;busy=true;try{await patch13();await patchFerias()}catch(e){console.warn('RH v35:',e)}finally{busy=false}}
function schedule(){clearTimeout(timer);timer=setTimeout(run,180)}
function style(){if(E('_rh35'))return;var s=document.createElement('style');s.id='_rh35';s.textContent='.rh35-base{display:block!important;color:var(--gold)!important;font-size:.68rem!important;margin-top:5px!important}.rh26-wide td:nth-child(n+3){white-space:nowrap}';document.head.appendChild(s)}
var obs=new MutationObserver(function(){style();schedule()});
function init(){style();schedule();obs.observe(document.body,{childList:true,subtree:true})}
window.rhV35ApplyProvisionRemuneration=run;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();/* RH v36 — simplifica provisões para lista de colaboradores e estabiliza cards */
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
/* RH v38 — Planejamento: UI aprovada + quadro ativo da stability baseline */
(function(){
'use strict';
var V={obs:null,timer:0};
function E(id){return document.getElementById(id)}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function parseMoney(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function money(v){try{return fmt(Number(v)||0)}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0)}}
function setText(el,v){if(el&&el.textContent!==v)el.textContent=v}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function date(v){if(!v)return null;if(v instanceof Date)return new Date(v.getTime());var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x.getTime())?null:x}
function br(v){var x=date(v);return x?String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0')+'/'+x.getFullYear():'—'}
function ids(){return typeof window.rhRosterActiveIds==='function'?window.rhRosterActiveIds():(window.RH_CURRENT_ACTIVE_IDS||new Set())}
function isActiveRow(tr){var set=ids();if(!set||!set.size)return true;var id=String(tr.dataset.id||tr.dataset.colaboradorId||'');if(id)return set.has(id);var td=tr.cells&&tr.cells[0],name=td&&td.textContent;return typeof window.rhRosterNameIsActive==='function'?window.rhRosterNameIsActive(name):true}
function person(id){var p=(S.pessoas||[]).find(function(x){return String(x.colaborador_id||x.id||'')===String(id)});if(p)return p;return (S.colaboradores||[]).find(function(x){return String(x.id||'')===String(id)})||null}
function contextDate(){var a=(window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(S.competencia?[S.competencia]:[])).slice().sort(function(x,y){return String(x.competencia||'').localeCompare(String(y.competencia||''))}),c=a[a.length-1],x=date(c&&c.competencia);if(x)return new Date(x.getFullYear(),x.getMonth()+1,0,12);var m=typeof window.rhRosterMeta==='function'?window.rhRosterMeta():window.RH_CURRENT_ACTIVE_META,y=date(m&&m.competencia);return y?new Date(y.getFullYear(),y.getMonth()+1,0,12):new Date()}
function removeExecutiveSummary(pane){Array.from(pane.querySelectorAll('article.table-panel')).forEach(function(article){var table=article.querySelector('table'),title=norm((article.querySelector('h2')||{}).textContent),kick=norm((article.querySelector('.panel-kicker')||{}).textContent);if((table&&!table.classList.contains('rh26-wide'))||title.indexOf('centro de custo')>=0||kick==='resumo executivo')article.remove()})}
function makeNameOnly(kind){
  var pane=document.querySelector('[data-plan-pane="'+kind+'"]');if(!pane)return;removeExecutiveSummary(pane);var table=pane.querySelector('table.rh26-wide');if(!table)return;table.classList.add('rh38-name-list');
  Array.from(table.querySelectorAll('tbody tr')).forEach(function(tr){if(!isActiveRow(tr))tr.remove()});var thead=table.tHead;if(thead){Array.from(thead.querySelectorAll('.rh30-group-head')).forEach(function(x){x.remove()});if(thead.rows[0]&&thead.rows[0].cells[0])setText(thead.rows[0].cells[0],'Colaborador')}
  var article=table.closest('article.table-panel');if(article){setText(article.querySelector('.panel-head h2'),kind==='13'?'Colaboradores — provisão de 13º':'Colaboradores — provisão de férias');setText(article.querySelector('.detail-note'),'Clique no colaborador para abrir a memória de cálculo completa.')}
  var wrap=table.closest('.table-wrap');if(wrap){wrap.classList.remove('rh30-scroll');var prev=wrap.previousElementSibling;if(prev&&prev.classList.contains('rh30-scroll-note'))prev.remove()}
  Array.from(table.querySelectorAll('tbody tr')).forEach(function(tr){var first=tr.cells&&tr.cells[0];if(!first)return;Array.from(first.querySelectorAll('small')).forEach(function(s){s.style.display='none'});first.title='Clique para abrir a memória de cálculo'});
}
function filterForecast(){
  var pane=document.querySelector('[data-plan-pane="folha"]'),set=ids();if(!pane||!set||!set.size)return;var table=pane.querySelector('table');if(!table)return;Array.from(table.querySelectorAll('tbody tr')).forEach(function(tr){if(!isActiveRow(tr))tr.remove()});
  var rows=Array.from(table.querySelectorAll('tbody tr')),sum={prov:0,disc:0,liq:0,enc:0,ben:0,custo:0};rows.forEach(function(tr){var c=tr.cells||[];if(c.length>=8){sum.prov+=parseMoney(c[2].textContent);sum.disc+=parseMoney(c[3].textContent);sum.liq+=parseMoney(c[4].textContent);sum.enc+=parseMoney(c[5].textContent);sum.ben+=parseMoney(c[6].textContent);sum.custo+=parseMoney(c[7].textContent)}});
  Array.from(pane.querySelectorAll('.kpi')).forEach(function(card){var label=norm((card.querySelector('span')||{}).textContent),strong=card.querySelector('strong'),small=card.querySelector('small');if(!strong)return;if(label.indexOf('proventos previstos')>=0)setText(strong,money(sum.prov));else if(label.indexOf('liquido previsto')>=0)setText(strong,money(sum.liq));else if(label.indexOf('encargos + beneficios')>=0)setText(strong,money(sum.enc+sum.ben));else if(label.indexOf('custo previsto')>=0)setText(strong,money(sum.custo));if(small&&label.indexOf('proventos previstos')>=0)small.title=rows.length+' colaboradores ativos considerados'});
  var tf=table.querySelector('tfoot tr');if(tf&&tf.cells.length>=8){tf.cells[2].innerHTML='<b>'+money(sum.prov)+'</b>';tf.cells[3].innerHTML='<b>'+money(sum.disc)+'</b>';tf.cells[4].innerHTML='<b>'+money(sum.liq)+'</b>';tf.cells[5].innerHTML='<b>'+money(sum.enc)+'</b>';tf.cells[6].innerHTML='<b>'+money(sum.ben)+'</b>';tf.cells[7].innerHTML='<b>'+money(sum.custo)+'</b>'}
}
function filterTerminationSelect(){var set=ids();if(!set||!set.size)return;['rh26-person','rh-res-person'].forEach(function(id){var sel=E(id);if(!sel)return;var selected=sel.value;Array.from(sel.options).forEach(function(o){if(o.value&&!set.has(String(o.value)))o.remove()});if(!set.has(String(selected))&&sel.options.length)sel.selectedIndex=0});document.querySelectorAll('[data-plan-pane="rescisao"] select').forEach(function(sel){if(!/colaborador/i.test(String((sel.closest('label')||{}).textContent||'')))return;var selected=sel.value;Array.from(sel.options).forEach(function(o){if(o.value&&!set.has(String(o.value)))o.remove()});if(!set.has(String(selected))&&sel.options.length)sel.selectedIndex=0})}
function activeNote(){var page=E('page-planejamento'),m=typeof window.rhRosterMeta==='function'?window.rhRosterMeta():window.RH_CURRENT_ACTIVE_META;if(!page||!m)return;var warn=page.querySelector('.rh-plan-warning');if(!warn)return;var el=E('rh38-active-note');if(!el){el=document.createElement('span');el.id='rh38-active-note';warn.appendChild(el)}var comp=String(m.competencia||'').slice(0,7).split('-').reverse().join('/');setText(el,'Quadro atual: '+m.ativos+' colaboradores ativos em '+comp+'. Quem já foi desligado não entra em 13º, férias, próxima folha ou rescisões.')}
function memLine(label,value,cls){return '<div'+(cls?' class="'+cls+'"':'')+'><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>'}
async function rhProvisionOpenMemory(tr){
  if(!tr)return;var kind=tr.dataset.k,id=String(tr.dataset.id||''),p=person(id),c=tr.cells||[];
  if(typeof window.rhProvisionRefresh==='function')await window.rhProvisionRefresh();
  var ctx=typeof window.rhV34TerminationContext==='function'?await window.rhV34TerminationContext(id,contextDate()):null;
  var salary=Number(ctx&&ctx.latest&&ctx.latest.salario)||Number(p&&p.salario)||0,rec=(ctx&&ctx.recurring||[]),variable=Number(ctx&&ctx.variableAvg)||0,base=salary+rec.reduce(function(s,x){return s+(Number(x.valor)||0)},0)+variable;
  var first=tr.cells&&tr.cells[0],name=(first&&first.querySelector('b')&&first.querySelector('b').textContent)||(p&&p.nome)||'Colaborador',dep=(first&&first.querySelector('small')&&first.querySelector('small').textContent)||'',cc=(c[1]&&c[1].textContent)||'';
  var html='';html+=memLine('Admissão',br(p&&p.admissao));html+=memLine('Salário-base atual',money(salary));rec.forEach(function(x){html+=memLine(x.nome||'Verba recorrente',money(x.valor))});if(Math.abs(variable)>.004)html+=memLine('Média de verbas variáveis',money(variable));html+=memLine('Base remuneratória',money(base),'rh38-base-total');
  var enc='';
  if(kind==='13'){
    var av=(c[3]&&c[3].textContent)||'0/12',q=parseInt(av,10)||0,current=base*q/12;
    html+=memLine('Avos',av)+memLine('Saldo prov. anterior',c[4]?c[4].textContent:money(0))+memLine('Provisão do mês',c[5]?c[5].textContent:money(base/12))+memLine('Ajuste no mês',c[6]?c[6].textContent:money(0))+memLine('Valor 13º atual',money(current))+memLine('13º pago identificado',c[7]?c[7].textContent:money(0))+memLine('Adiantamento identificado',c[8]?c[8].textContent:money(0))+memLine('Saldo atual',c[9]?c[9].textContent:money(current));
    enc+=memLine('INSS Empresa',c[10]?c[10].textContent:money(0))+memLine('RAT',c[11]?c[11].textContent:money(0))+memLine('Terceiros',c[12]?c[12].textContent:money(0))+memLine('FGTS',c[13]?c[13].textContent:money(0))+memLine('PIS',c[14]?c[14].textContent:money(0))+memLine('Custo provisionado',c[15]?c[15].textContent:money(0),'total');
  }else{
    html+=memLine('Vencimento estimado',c[2]?c[2].textContent:'—')+memLine('Férias proporcionais',c[4]?c[4].textContent:'0/12')+memLine('Saldo prov. anterior',c[5]?c[5].textContent:money(0))+memLine('Provisão do mês',c[6]?c[6].textContent:money(base/12*4/3))+memLine('Ajuste no mês',c[7]?c[7].textContent:money(0))+memLine('Valor férias atual',c[8]?c[8].textContent:money(0))+memLine('1/3 férias atual',c[9]?c[9].textContent:money(0))+memLine('Gozadas identificadas',c[10]?c[10].textContent:money(0))+memLine('Indenizadas identificadas',c[11]?c[11].textContent:money(0))+memLine('Saldo atual',c[12]?c[12].textContent:money(0));
    enc+=memLine('INSS Empresa',c[13]?c[13].textContent:money(0))+memLine('RAT',c[14]?c[14].textContent:money(0))+memLine('Terceiros',c[15]?c[15].textContent:money(0))+memLine('FGTS',c[16]?c[16].textContent:money(0))+memLine('PIS',c[17]?c[17].textContent:money(0))+memLine('Custo provisionado',c[18]?c[18].textContent:money(0),'total');
  }
  var old=E('rh26-modal');if(old)old.remove();document.body.insertAdjacentHTML('beforeend','<div class="rh26-modal" id="rh26-modal"><div class="rh26-card"><button id="rh26-close">×</button><span class="eyebrow">MEMÓRIA DE CÁLCULO</span><h2>'+esc(name)+'</h2><p>'+esc(cc)+(dep?' · '+esc(dep):'')+'</p><div class="rh26-memory">'+html+'</div><h3>Encargos</h3><div class="rh26-memory">'+enc+'</div><p class="detail-note">Base remuneratória = salário vigente + verbas salariais recorrentes + médias variáveis aplicáveis. Valores históricos de salário não reduzem a base atual.</p></div></div>');var close=E('rh26-close');if(close)close.onclick=function(){var modal=E('rh26-modal');if(modal)modal.remove()}
}
async function enforceNow(){var page=E('page-planejamento');if(!page)return;if(V.obs)V.obs.disconnect();try{if(typeof window.rhProvisionRefresh==='function')await window.rhProvisionRefresh();makeNameOnly('13');makeNameOnly('ferias');filterForecast();filterTerminationSelect();activeNote();if(typeof window.rhFitAllCardValues==='function')window.rhFitAllCardValues();if(typeof window.rhBaselineCheck==='function')window.rhBaselineCheck()}finally{observePage()}}
function schedule(delay){clearTimeout(V.timer);V.timer=setTimeout(function(){Promise.resolve(typeof window.rhRosterLoad==='function'?window.rhRosterLoad(false):null).then(enforceNow).catch(function(e){console.warn('RH v38:',e)})},delay==null?35:delay)}
function observePage(){var page=E('page-planejamento');if(!page)return;if(!V.obs)V.obs=new MutationObserver(function(muts){if(muts.some(function(m){return m.type==='childList'}))schedule(25)});try{V.obs.observe(page,{childList:true,subtree:true})}catch(e){}}
function styles(){if(E('_rh38'))return;var s=document.createElement('style');s.id='_rh38';s.textContent='\
#page-planejamento [data-plan-pane="13"] article.table-panel:has(table:not(.rh26-wide)),#page-planejamento [data-plan-pane="ferias"] article.table-panel:has(table:not(.rh26-wide)){display:none!important}\
#page-planejamento [data-plan-pane="13"] .rh30-scroll-note,#page-planejamento [data-plan-pane="ferias"] .rh30-scroll-note,#page-planejamento [data-plan-pane="13"] .rh30-group-head,#page-planejamento [data-plan-pane="ferias"] .rh30-group-head{display:none!important}\
#page-planejamento [data-plan-pane="13"] table.rh26-wide,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide{min-width:0!important;width:100%!important;table-layout:auto!important;border-collapse:separate!important;border-spacing:0!important}\
#page-planejamento [data-plan-pane="13"] table.rh26-wide th:not(:first-child),#page-planejamento [data-plan-pane="13"] table.rh26-wide td:not(:first-child),#page-planejamento [data-plan-pane="13"] table.rh26-wide tfoot,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide th:not(:first-child),#page-planejamento [data-plan-pane="ferias"] table.rh26-wide td:not(:first-child),#page-planejamento [data-plan-pane="ferias"] table.rh26-wide tfoot{display:none!important}\
#page-planejamento [data-plan-pane="13"] table.rh26-wide th:first-child,#page-planejamento [data-plan-pane="13"] table.rh26-wide td:first-child,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide th:first-child,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide td:first-child{position:relative!important;left:auto!important;width:100%!important;min-width:0!important;max-width:none!important;white-space:normal!important;box-shadow:none!important}\
#page-planejamento [data-plan-pane="13"] table.rh26-wide tbody td:first-child,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide tbody td:first-child{padding:15px 48px 15px 18px!important;background:transparent!important}\
#page-planejamento [data-plan-pane="13"] table.rh26-wide tbody td:first-child small,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide tbody td:first-child small{display:none!important}\
#page-planejamento [data-plan-pane="13"] table.rh26-wide tbody td:first-child:after,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide tbody td:first-child:after{content:"›";position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:1.5rem;font-weight:900;color:var(--gold)}\
#page-planejamento [data-plan-pane="13"] .table-wrap:has(table.rh26-wide),#page-planejamento [data-plan-pane="ferias"] .table-wrap:has(table.rh26-wide){overflow:visible!important;padding-bottom:0!important}\
#rh38-active-note{display:block;margin-left:10px;color:var(--text);font-weight:750}\
#rh26-modal .rh38-base-total{border-color:color-mix(in srgb,var(--gold) 55%,transparent)!important;background:color-mix(in srgb,var(--gold) 7%,transparent)!important}\
#rh26-modal .rh38-base-total span,#rh26-modal .rh38-base-total b{color:var(--gold)!important}\
';document.head.appendChild(s)}
function init(){styles();schedule(0);document.addEventListener('click',function(e){if(!e.target||!e.target.closest)return;var tr=e.target.closest('#page-planejamento .rh38-name-list tbody tr.rh26-row');if(tr){e.preventDefault();e.stopImmediatePropagation();rhProvisionOpenMemory(tr).catch(function(err){console.warn('RH memória provisão:',err)});return}if(e.target.closest('#page-planejamento [data-plan-tab]')){schedule(0);schedule(80)}},true);var old=window.renderAll;if(typeof old==='function'&&!old._rh38){var wrapped=function(){var r=old.apply(this,arguments);schedule(0);return r};wrapped._rh38=1;window.renderAll=wrapped}setTimeout(observePage,200)}
window.rhV38LoadRoster=function(){return typeof window.rhRosterLoad==='function'?window.rhRosterLoad(false):Promise.resolve(null)};window.rhV38EnforcePlanningUI=function(){schedule(0)};window.rhProvisionOpenMemory=rhProvisionOpenMemory;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
/* RH v39 — roteador definitivo da memória de provisões */
(function(){
'use strict';
function findRow(target){
  if(!target||!target.closest)return null;
  return target.closest('#page-planejamento [data-plan-pane="13"] tr.rh26-row[data-id],#page-planejamento [data-plan-pane="ferias"] tr.rh26-row[data-id]');
}
function route(tr,e){
  if(!tr)return false;
  if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}
  if(typeof window.rhProvisionOpenMemory==='function'){
    Promise.resolve(window.rhProvisionOpenMemory(tr)).catch(function(err){console.warn('RH v39 memória provisão:',err)});
    return true;
  }
  console.warn('RH v39: rhProvisionOpenMemory indisponível');
  return false;
}
function bindRows(){
  document.querySelectorAll('#page-planejamento [data-plan-pane="13"] tr.rh26-row[data-id],#page-planejamento [data-plan-pane="ferias"] tr.rh26-row[data-id]').forEach(function(tr){
    if(tr.dataset.rh39Bound==='1')return;
    tr.dataset.rh39Bound='1';
    tr.onclick=function(e){route(tr,e)};
  });
}
function init(){
  window.RH_PROVISION_MEMORY_ROUTER='v39';
  document.addEventListener('click',function(e){var tr=findRow(e.target);if(tr)route(tr,e)},true);
  bindRows();
  var old=window.rhV38EnforcePlanningUI;
  if(typeof old==='function'&&!old._rh39){
    var wrapped=function(){var r=old.apply(this,arguments);setTimeout(bindRows,40);setTimeout(bindRows,140);return r};
    wrapped._rh39=1;window.rhV38EnforcePlanningUI=wrapped;
  }
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#page-planejamento [data-plan-tab]')){setTimeout(bindRows,60);setTimeout(bindRows,180)}},false);
}
window.rhV39BindProvisionMemory=bindRows;
window.rhV39RouteProvisionMemory=route;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
/* RH v40 — relatórios executivos, guias gerenciais e encaixe estável de cards */
(function(){
'use strict';
var V={fitTimer:0,resize:null,ui:false};
var GOLD='#f2c94c',NAVY='#071a2c',NAVY2='#0d2b42',BLUE='#1f6f9f',EMERALD='#1f9d7a',RED='#d75858',MUTED='#6b7d90',LIGHT='#eef4f8',LINE='#d7e1e8';
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function esc40(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function brMoney(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}
function compLabel(v){try{return formatCompetence(v)}catch(e){if(!v)return '—';var p=String(v).slice(0,7).split('-');return p[1]+'/'+p[0]}}
function compSlug(v){var x=compLabel(v).replace('/','-');return x==='—'?'sem-competencia':x}
function filename(base,ext){return base+'_'+compSlug(S.competencia&&S.competencia.competencia)+'.'+ext}
function companyName(){return String(S.competencia&&S.competencia.empresa_nome||'LIGA NACIONAL DE BASQUETE')}
function companyCode(){return String(S.competencia&&S.competencia.empresa_codigo||'2038')}
function currentPeople(){return (S.pessoas||[]).slice().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR')})}
function chargeObject(){return S.competencia&&S.competencia.encargos||{}}
function chargeRows(){var e=chargeObject(),c=S.competencia||{};return[
  {key:'IRRF',label:'IRRF',base:n(e.base_irrf_mensal||c.resumo&&c.resumo.base_irrf),value:n(e.valor_total_irrf||e.valor_irrf_mensal||e.valor_irrf)},
  {key:'INSS',label:'INSS',base:n(e.base_total_inss||c.resumo&&c.resumo.base_inss),value:n(e.total_inss)},
  {key:'PIS',label:'PIS sobre folha',base:n(e.base_pis||c.resumo&&c.resumo.base_inss),value:n(e.valor_pis)},
  {key:'FGTS',label:'FGTS',base:n(e.base_fgts||c.resumo&&c.resumo.base_fgts),value:n(e.valor_fgts||c.valor_fgts)}
]}
function depRows(){var map={};currentPeople().forEach(function(p){var d=String(p.departamento||p.departamento_snapshot||'Sem departamento'),name;try{name=departmentName(d)}catch(e){name=d}if(!map[name])map[name]={departamento:name,pessoas:0,proventos:0,descontos:0,liquido:0,fgts:0};var x=map[name];x.pessoas++;x.proventos+=n(p.proventos);x.descontos+=n(p.descontos);x.liquido+=n(p.liquido);x.fgts+=n(p.valor_fgts)});return Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return b.liquido-a.liquido})}
function rubricRows(){var map={};(S.lancamentos||[]).forEach(function(l){var k=String(l.rubrica_codigo||'')+'|'+String(l.rubrica_nome||l.nome||'')+'|'+String(l.tipo||'');if(!map[k])map[k]={codigo:String(l.rubrica_codigo||''),nome:String(l.rubrica_nome||l.nome||'—'),tipo:String(l.tipo||'—'),valor:0};map[k].valor+=n(l.valor)});return Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return b.valor-a.valor})}
function ccRows(){var map={};currentPeople().forEach(function(p){var cc=String(p.centro_custo||p.centro_custo_snapshot||'Sem CC');if(!map[cc])map[cc]={cc:cc,pessoas:0,proventos:0,descontos:0,liquido:0};var x=map[cc];x.pessoas++;x.proventos+=n(p.proventos);x.descontos+=n(p.descontos);x.liquido+=n(p.liquido)});return Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return b.liquido-a.liquido})}
function totals(){var c=S.competencia||{},charges=chargeRows(),totalCharges=charges.reduce(function(s,x){return s+x.value},0);return{proventos:n(c.proventos),descontos:n(c.descontos),liquido:n(c.liquido),fgts:n(c.valor_fgts||chargeObject().valor_fgts),pessoas:currentPeople().length,encargos:totalCharges}}

/* encaixe estável: sem MutationObserver e sem reflow contínuo */
var FIT_SELECTOR='.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#custo-real-kpis strong,#payroll-kpis strong,#charges-kpis strong,#movement-kpis strong';
var fitCanvas=document.createElement('canvas'),fitCtx=fitCanvas.getContext('2d');
function fitTextWidth(el,size){if(!fitCtx)return 999999;var cs=getComputedStyle(el);fitCtx.font=(cs.fontWeight||700)+' '+size+'px '+(cs.fontFamily||'sans-serif');return fitCtx.measureText(String(el.textContent||'').trim()).width}
function fitAvailable(el){var box=el.closest('.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card')||el.parentElement;if(!box)return 0;var bcs=getComputedStyle(box),w=box.clientWidth-(parseFloat(bcs.paddingLeft)||0)-(parseFloat(bcs.paddingRight)||0);var ecs=getComputedStyle(el),ml=parseFloat(ecs.marginLeft)||0,mr=parseFloat(ecs.marginRight)||0;return Math.max(56,w-ml-mr-10)}
function fitOne(el){if(!el||!el.isConnected)return;var text=String(el.textContent||'').trim();if(!text)return;var av=fitAvailable(el);if(!av)return;var max=36,min=10;if(text.length>10)max=31;if(text.length>14)max=27;if(text.length>18)max=23;if(text.length>22)max=20;var lo=min,hi=max,best=min;for(var i=0;i<18;i++){var mid=(lo+hi)/2;if(fitTextWidth(el,mid)<=av){best=mid;lo=mid}else hi=mid}var size=Math.max(min,Math.floor(best*10)/10);el.style.setProperty('font-size',size+'px','important');el.style.setProperty('letter-spacing',size<18?'-.055em':size<23?'-.04em':'-.02em','important');el.style.setProperty('white-space','nowrap','important');el.style.setProperty('overflow','hidden','important');el.style.setProperty('text-overflow','clip','important');el.style.setProperty('max-width','100%','important');el.style.setProperty('width','100%','important')}
function fitAll(){Array.prototype.forEach.call(document.querySelectorAll(FIT_SELECTOR),fitOne)}
function scheduleFit(delay){clearTimeout(V.fitTimer);V.fitTimer=setTimeout(function(){requestAnimationFrame(fitAll)},delay==null?50:delay)}
window.rhFitAllCardValues=fitAll;
function installFit(){if(!E('_rh40_fit')){var st=document.createElement('style');st.id='_rh40_fit';st.textContent='.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card{min-width:0!important;overflow:hidden!important}.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong{display:block!important;min-width:0!important;max-width:100%!important;line-height:1.02!important;transition:none!important;animation:none!important}';document.head.appendChild(st)}if(window.ResizeObserver){V.resize=new ResizeObserver(function(){scheduleFit(70)});document.querySelectorAll('.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card').forEach(function(x){try{V.resize.observe(x)}catch(e){}})}window.addEventListener('resize',function(){scheduleFit(80)});if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){scheduleFit(0)});scheduleFit(0)}

/* bibliotecas para relatórios */
LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};
LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)}};
LIBRARIES.exceljs={url:'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',ready:function(){return !!window.ExcelJS}};
async function ensurePdf(){await loadLibrary('jspdf');await loadLibrary('autotable')}
async function ensureExcel(){await loadLibrary('exceljs')}
function downloadBlob(blob,name){var a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},1000)}
async function imageData(url){try{var r=await fetch(url);if(!r.ok)return null;var b=await r.blob();return await new Promise(function(res){var fr=new FileReader();fr.onload=function(){res(fr.result)};fr.onerror=function(){res(null)};fr.readAsDataURL(b)})}catch(e){return null}}
function hexRgb(hex){hex=String(hex).replace('#','');return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]}
function setFill(doc,hex){var r=hexRgb(hex);doc.setFillColor(r[0],r[1],r[2])}
function setText(doc,hex){var r=hexRgb(hex);doc.setTextColor(r[0],r[1],r[2])}
function pdfHeader(doc,title,subtitle,logo){var w=doc.internal.pageSize.getWidth();setFill(doc,NAVY);doc.rect(0,0,w,31,'F');if(logo)try{doc.addImage(logo,'PNG',12,6,22,18)}catch(e){}setText(doc,'#ffffff');doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,40,13);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text(subtitle||'',40,20);setText(doc,GOLD);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('LIGA NACIONAL DE BASQUETE',40,26)}
function pdfFooter(doc){var pages=doc.internal.getNumberOfPages();for(var i=1;i<=pages;i++){doc.setPage(i);var w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();setText(doc,MUTED);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.text('Uso restrito - Diretoria | RH & Folha | '+compLabel(S.competencia&&S.competencia.competencia),12,h-7);doc.text('Página '+i+' de '+pages,w-12,h-7,{align:'right'})}}
function pdfKpis(doc,y,items){var w=doc.internal.pageSize.getWidth(),gap=4,x=12,cardW=(w-24-gap*(items.length-1))/items.length;items.forEach(function(it,idx){var xx=x+idx*(cardW+gap);setFill(doc,idx===items.length-1?NAVY2:'#eef4f8');doc.roundedRect(xx,y,cardW,24,3,3,'F');setText(doc,idx===items.length-1?'#ffffff':MUTED);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text(String(it[0]).toUpperCase(),xx+4,y+7);setText(doc,idx===items.length-1?GOLD:NAVY);doc.setFontSize(12);doc.text(String(it[1]),xx+4,y+17,{maxWidth:cardW-8})});return y+30}
function deptChart(){var a=depRows().slice(0,8),cv=document.createElement('canvas');cv.width=1000;cv.height=Math.max(260,a.length*54+70);var x=cv.getContext('2d'),max=Math.max.apply(null,a.map(function(d){return d.liquido}).concat([1]));x.fillStyle='#ffffff';x.fillRect(0,0,cv.width,cv.height);x.font='700 23px Segoe UI, Arial';x.fillStyle=NAVY;x.fillText('Líquido por departamento',28,36);a.forEach(function(d,i){var y=70+i*54,w=(cv.width-360)*(d.liquido/max);x.font='600 19px Segoe UI, Arial';x.fillStyle='#334b5f';x.fillText(d.departamento,28,y+19);x.fillStyle='#dce8ef';x.fillRect(260,y,cv.width-350,26);x.fillStyle=i===0?GOLD:BLUE;x.fillRect(260,y,w,26);x.fillStyle=NAVY;x.font='700 18px Segoe UI, Arial';x.textAlign='right';x.fillText(brMoney(d.liquido),cv.width-25,y+20);x.textAlign='left'});return cv.toDataURL('image/png')}

async function exportPayrollPdf(){if(!S.competencia)throw new Error('Selecione uma competência.');await ensurePdf();var jsPDF=window.jspdf.jsPDF,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true}),logo=await imageData('/rh/lnb-logo.png'),t=totals(),e=chargeObject(),subtitle='Relatório Executivo da Folha - '+compLabel(S.competencia.competencia)+' | Empresa '+companyCode();pdfHeader(doc,'Folha de Pagamento - Relatório Executivo',subtitle,logo);var y=37;y=pdfKpis(doc,y,[['Proventos',brMoney(t.proventos)],['Descontos',brMoney(t.descontos)],['Líquido',brMoney(t.liquido)],['Pessoas',String(t.pessoas)],['FGTS',brMoney(t.fgts)]]);
  var chart=deptChart();try{doc.addImage(chart,'PNG',12,y,128,46)}catch(ignore){}
  doc.autoTable({startY:y,margin:{left:148,right:12},head:[['Obrigação','Base','Valor']],body:chargeRows().map(function(r){return[r.label,brMoney(r.base),brMoney(r.value)]}),foot:[['Total','',''+brMoney(chargeRows().reduce(function(s,r){return s+r.value},0))]],theme:'grid',styles:{font:'helvetica',fontSize:8,cellPadding:2.5,textColor:hexRgb(NAVY)},headStyles:{fillColor:hexRgb(NAVY2),textColor:[255,255,255],fontStyle:'bold'},footStyles:{fillColor:hexRgb(LIGHT),textColor:hexRgb(NAVY),fontStyle:'bold'},columnStyles:{1:{halign:'right'},2:{halign:'right',fontStyle:'bold'}}});
  y=Math.max(y+51,doc.lastAutoTable.finalY+5);doc.autoTable({startY:y,head:[['Departamento','Pessoas','Proventos','Descontos','Líquido','FGTS']],body:depRows().map(function(r){return[r.departamento,r.pessoas,brMoney(r.proventos),brMoney(r.descontos),brMoney(r.liquido),brMoney(r.fgts)]}),theme:'striped',styles:{font:'helvetica',fontSize:7.7,cellPadding:2.3,textColor:hexRgb(NAVY)},headStyles:{fillColor:hexRgb(NAVY2),textColor:[255,255,255]},alternateRowStyles:{fillColor:[247,250,252]},columnStyles:{1:{halign:'center'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right',fontStyle:'bold'},5:{halign:'right'}}});
  doc.addPage('a4','landscape');pdfHeader(doc,'Composição Individual da Folha','Competência '+compLabel(S.competencia.competencia)+' | '+companyName(),logo);doc.autoTable({startY:36,margin:{left:10,right:10,bottom:14},head:[['Matr.','Colaborador','Vínculo','Situação','Departamento','CC','Salário','Proventos','Descontos','Líquido','FGTS']],body:currentPeople().map(function(p){var dep;try{dep=departmentName(p.departamento||p.departamento_snapshot)}catch(e2){dep=p.departamento||p.departamento_snapshot||'—'}return[p.matricula||'—',p.nome||'—',p.vinculo||p.vinculo_snapshot||'—',p.situacao||p.situacao_snapshot||'—',dep,p.centro_custo||p.centro_custo_snapshot||'—',brMoney(p.salario),brMoney(p.proventos),brMoney(p.descontos),brMoney(p.liquido),brMoney(p.valor_fgts)]}),theme:'striped',styles:{font:'helvetica',fontSize:6.5,cellPadding:1.8,textColor:hexRgb(NAVY)},headStyles:{fillColor:hexRgb(NAVY2),textColor:[255,255,255],fontStyle:'bold'},alternateRowStyles:{fillColor:[247,250,252]},columnStyles:{6:{halign:'right'},7:{halign:'right'},8:{halign:'right'},9:{halign:'right',fontStyle:'bold'},10:{halign:'right'}}});
  doc.addPage('a4','landscape');pdfHeader(doc,'Rubricas e Bases de Encargos','Competência '+compLabel(S.competencia.competencia),logo);doc.autoTable({startY:36,margin:{left:12,right:150},head:[['Código','Rubrica','Tipo','Valor']],body:rubricRows().map(function(r){return[r.codigo||'—',r.nome,r.tipo,brMoney(r.valor)]}),theme:'striped',styles:{font:'helvetica',fontSize:7,cellPadding:2,textColor:hexRgb(NAVY)},headStyles:{fillColor:hexRgb(NAVY2),textColor:[255,255,255]},columnStyles:{3:{halign:'right',fontStyle:'bold'}}});var start=36;doc.autoTable({startY:start,margin:{left:155,right:12},head:[['Indicador','Valor']],body:[['Base INSS',brMoney(e.base_total_inss||0)],['Base FGTS',brMoney(e.base_fgts||0)],['Base PIS',brMoney(e.base_pis||0)],['Base IRRF',brMoney(e.base_irrf_mensal||0)],['INSS total',brMoney(e.total_inss||0)],['FGTS',brMoney(e.valor_fgts||0)],['PIS',brMoney(e.valor_pis||0)],['IRRF',brMoney(e.valor_total_irrf||e.valor_irrf||0)]],theme:'grid',styles:{font:'helvetica',fontSize:8,cellPadding:2.5,textColor:hexRgb(NAVY)},headStyles:{fillColor:hexRgb(NAVY2),textColor:[255,255,255]},columnStyles:{1:{halign:'right',fontStyle:'bold'}}});
  pdfFooter(doc);doc.save(filename('LNB_Folha_Executiva','pdf'))}

function guideInfo(kind){var all=chargeRows(),r=all.find(function(x){return x.key===kind});if(!r)throw new Error('Encargo não encontrado.');var note='Valor extraído da folha importada. Esta guia é uma memória gerencial e não substitui DARF, DCTFWeb, FGTS Digital ou documento oficial de arrecadação.';return{key:r.key,label:r.label,base:r.base,value:r.value,note:note}}
async function buildGuidePdf(kinds,save){await ensurePdf();var jsPDF=window.jspdf.jsPDF,doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),logo=await imageData('/rh/lnb-logo.png');for(var z=0;z<kinds.length;z++){if(z)doc.addPage();var g=guideInfo(kinds[z]),w=doc.internal.pageSize.getWidth();pdfHeader(doc,'Guia Gerencial - '+g.label,'Competência '+compLabel(S.competencia.competencia)+' | Empresa '+companyCode(),logo);setFill(doc,'#f7fafc');doc.roundedRect(12,40,w-24,46,4,4,'F');setText(doc,MUTED);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('VALOR PARA CONFERÊNCIA',18,51);setText(doc,NAVY);doc.setFontSize(24);doc.text(brMoney(g.value),18,66);setText(doc,MUTED);doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text('Base informada: '+brMoney(g.base),18,78);doc.autoTable({startY:96,margin:{left:12,right:12},head:[['Campo','Informação']],body:[['Empresa',companyName()],['Código da empresa',companyCode()],['Competência',compLabel(S.competencia.competencia)],['Obrigação',g.label],['Base',brMoney(g.base)],['Valor',brMoney(g.value)],['Origem','RH & Folha - competência importada']],theme:'grid',styles:{font:'helvetica',fontSize:9,cellPadding:3,textColor:hexRgb(NAVY)},headStyles:{fillColor:hexRgb(NAVY2),textColor:[255,255,255]},columnStyles:{0:{fontStyle:'bold',cellWidth:48},1:{}}});var yy=doc.lastAutoTable.finalY+10;setFill(doc,'#fff8df');doc.roundedRect(12,yy,w-24,30,3,3,'F');setText(doc,'#7a5d00');doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('ATENÇÃO',18,yy+9);doc.setFont('helvetica','normal');doc.setFontSize(8.3);doc.text(doc.splitTextToSize(g.note,w-36),18,yy+16);setText(doc,MUTED);doc.setFontSize(7.5);doc.text('Gerado em '+new Date().toLocaleString('pt-BR')+' | Uso interno e restrito',12,280)}pdfFooter(doc);if(save!==false)doc.save(filename(kinds.length===1?'LNB_Guia_'+kinds[0]:'LNB_Pacote_Guias','pdf'));return doc}
async function exportGuide(kind){if(!S.competencia)throw new Error('Selecione uma competência.');return buildGuidePdf([kind],true)}
async function exportGuidePack(){if(!S.competencia)throw new Error('Selecione uma competência.');return buildGuidePdf(['IRRF','INSS','PIS','FGTS'],true)}

function xStyleHeader(cell){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0D2B42'}};cell.font={name:'Aptos',bold:true,color:{argb:'FFFFFFFF'},size:10};cell.alignment={vertical:'middle',horizontal:'center'};cell.border={bottom:{style:'thin',color:{argb:'FFF2C94C'}}}}
function xMoney(cell){cell.numFmt='R$ #,##0.00;[Red]-R$ #,##0.00';cell.alignment={horizontal:'right'}}
function xAutoWidth(ws,max){ws.columns.forEach(function(col){var m=10;col.eachCell({includeEmpty:true},function(c){var v=c.value;if(v&&typeof v==='object'&&v.richText)v=v.richText.map(function(x){return x.text}).join('');m=Math.max(m,String(v==null?'':v).length+2)});col.width=Math.min(max||34,Math.max(10,m))})}
function xTitle(ws,title,subtitle,lastCol){ws.mergeCells(1,1,2,lastCol);var c=ws.getCell(1,1);c.value=title;c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF071A2C'}};c.font={name:'Aptos Display',bold:true,size:22,color:{argb:'FFF2C94C'}};c.alignment={vertical:'middle',horizontal:'left'};ws.getRow(1).height=28;ws.getRow(2).height=8;ws.mergeCells(3,1,3,lastCol);var s=ws.getCell(3,1);s.value=subtitle;s.font={name:'Aptos',size:10,color:{argb:'FF5F7486'},italic:true};ws.getRow(3).height=20}
async function exportPayrollExcel(){if(!S.competencia)throw new Error('Selecione uma competência.');await ensureExcel();var wb=new ExcelJS.Workbook();wb.creator='LNB - RH & Folha';wb.company='Liga Nacional de Basquete';wb.subject='Relatório executivo da folha';wb.created=new Date();var t=totals(),e=chargeObject();
  var ws=wb.addWorksheet('Resumo Executivo',{views:[{showGridLines:false,state:'frozen',ySplit:5}]});xTitle(ws,'LNB | FOLHA DE PAGAMENTO','Relatório Executivo - '+compLabel(S.competencia.competencia)+' | '+companyName()+' | Empresa '+companyCode(),8);var labels=[['Proventos',t.proventos],['Descontos',t.descontos],['Líquido',t.liquido],['Pessoas',t.pessoas],['FGTS',t.fgts],['Encargos',t.encargos]];labels.forEach(function(it,i){var col=i+1,lab=ws.getCell(5,col),val=ws.getCell(6,col);lab.value=it[0].toUpperCase();lab.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0D2B42'}};lab.font={bold:true,color:{argb:'FFFFFFFF'},size:9};lab.alignment={horizontal:'center'};val.value=it[1];val.fill={type:'pattern',pattern:'solid',fgColor:{argb:i===2?'FFFFF5D6':'FFF0F5F8'}};val.font={bold:true,color:{argb:'FF071A2C'},size:13};val.alignment={horizontal:'center'};if(i!==3)xMoney(val)});ws.getRow(6).height=26;
  ws.getCell('A9').value='OBRIGAÇÕES';ws.getCell('A9').font={bold:true,color:{argb:'FFF2C94C'},size:12};ws.getCell('A10').value='Obrigação';ws.getCell('B10').value='Base';ws.getCell('C10').value='Valor';['A10','B10','C10'].forEach(function(a){xStyleHeader(ws.getCell(a))});chargeRows().forEach(function(r,i){var row=11+i;ws.getCell(row,1).value=r.label;ws.getCell(row,2).value=r.base;ws.getCell(row,3).value=r.value;xMoney(ws.getCell(row,2));xMoney(ws.getCell(row,3))});
  var ds=18;ws.getCell(ds,1).value='DISTRIBUIÇÃO POR DEPARTAMENTO';ws.getCell(ds,1).font={bold:true,color:{argb:'FFF2C94C'},size:12};var dh=['Departamento','Pessoas','Proventos','Descontos','Líquido','FGTS'];dh.forEach(function(h,i){ws.getCell(ds+1,i+1).value=h;xStyleHeader(ws.getCell(ds+1,i+1))});depRows().forEach(function(r,i){var row=ds+2+i,vals=[r.departamento,r.pessoas,r.proventos,r.descontos,r.liquido,r.fgts];vals.forEach(function(v,j){ws.getCell(row,j+1).value=v;if(j>=2)xMoney(ws.getCell(row,j+1))});if(i%2)for(var j=1;j<=6;j++)ws.getCell(row,j).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7FAFC'}}});xAutoWidth(ws,28);

  var wf=wb.addWorksheet('Folha por Colaborador',{views:[{state:'frozen',ySplit:5,xSplit:2,showGridLines:false}]});xTitle(wf,'FOLHA POR COLABORADOR','Competência '+compLabel(S.competencia.competencia)+' | Valores individuais',14);var headers=['Matrícula','Colaborador','Vínculo','Situação','Cargo','Departamento','Centro de Custo','Salário','Proventos','Descontos','Líquido','Base INSS','FGTS','Base IRRF'];headers.forEach(function(h,i){wf.getCell(5,i+1).value=h;xStyleHeader(wf.getCell(5,i+1))});currentPeople().forEach(function(p,i){var row=6+i,dep;try{dep=departmentName(p.departamento||p.departamento_snapshot)}catch(er){dep=p.departamento||p.departamento_snapshot||'—'};var vals=[p.matricula||'',p.nome||'',p.vinculo||p.vinculo_snapshot||'',p.situacao||p.situacao_snapshot||'',p.cargo||p.cargo_snapshot||'',dep,p.centro_custo||p.centro_custo_snapshot||'',n(p.salario),n(p.proventos),n(p.descontos),n(p.liquido),n(p.base_inss),n(p.valor_fgts),n(p.base_irrf)];vals.forEach(function(v,j){var c=wf.getCell(row,j+1);c.value=v;if(j>=7)xMoney(c);if(i%2)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7FAFC'}}})});var fr=6+currentPeople().length;wf.getCell(fr,1).value='TOTAL';wf.mergeCells(fr,1,fr,7);wf.getCell(fr,1).font={bold:true,color:{argb:'FFFFFFFF'}};wf.getCell(fr,1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0D2B42'}};[8,9,10,11,12,13,14].forEach(function(col){var c=wf.getCell(fr,col),letter=wf.getColumn(col).letter;c.value={formula:'SUM('+letter+'6:'+letter+(fr-1)+')'};xMoney(c);c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0D2B42'}}});wf.autoFilter={from:{row:5,column:1},to:{row:5,column:14}};xAutoWidth(wf,34);

  var wr=wb.addWorksheet('Rubricas',{views:[{state:'frozen',ySplit:5,showGridLines:false}]});xTitle(wr,'RUBRICAS','Consolidação da competência '+compLabel(S.competencia.competencia),5);['Código','Rubrica','Tipo','Valor','% dos Proventos'].forEach(function(h,i){wr.getCell(5,i+1).value=h;xStyleHeader(wr.getCell(5,i+1))});rubricRows().forEach(function(r,i){var row=6+i;wr.getCell(row,1).value=r.codigo;wr.getCell(row,2).value=r.nome;wr.getCell(row,3).value=r.tipo;wr.getCell(row,4).value=r.valor;xMoney(wr.getCell(row,4));wr.getCell(row,5).value=t.proventos?r.valor/t.proventos:0;wr.getCell(row,5).numFmt='0.00%';if(i%2)for(var j=1;j<=5;j++)wr.getCell(row,j).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7FAFC'}}});wr.autoFilter={from:{row:5,column:1},to:{row:5,column:5}};xAutoWidth(wr,42);

  var we=wb.addWorksheet('Encargos',{views:[{showGridLines:false}]});xTitle(we,'ENCARGOS E RECOLHIMENTOS','Bases e valores extraídos da competência '+compLabel(S.competencia.competencia),4);['Obrigação','Base','Valor','Observação'].forEach(function(h,i){we.getCell(5,i+1).value=h;xStyleHeader(we.getCell(5,i+1))});chargeRows().forEach(function(r,i){var row=6+i;we.getCell(row,1).value=r.label;we.getCell(row,2).value=r.base;we.getCell(row,3).value=r.value;we.getCell(row,4).value='Conferir com documento oficial de arrecadação';xMoney(we.getCell(row,2));xMoney(we.getCell(row,3))});var extras=[['RAT',n(e.rat)],['Terceiros',n(e.terceiros)],['Segurados INSS',n(e.segurados)],['Base total INSS',n(e.base_total_inss)]];extras.forEach(function(r,i){var row=12+i;we.getCell(row,1).value=r[0];we.getCell(row,3).value=r[1];xMoney(we.getCell(row,3))});xAutoWidth(we,42);

  var wc=wb.addWorksheet('Rateio',{views:[{state:'frozen',ySplit:5,showGridLines:false}]});xTitle(wc,'RATEIO DA FOLHA','Departamento e centro de custo - '+compLabel(S.competencia.competencia),6);['Centro de Custo','Pessoas','Proventos','Descontos','Líquido','% do Líquido'].forEach(function(h,i){wc.getCell(5,i+1).value=h;xStyleHeader(wc.getCell(5,i+1))});ccRows().forEach(function(r,i){var row=6+i;wc.getCell(row,1).value=r.cc;wc.getCell(row,2).value=r.pessoas;wc.getCell(row,3).value=r.proventos;wc.getCell(row,4).value=r.descontos;wc.getCell(row,5).value=r.liquido;wc.getCell(row,6).value=t.liquido?r.liquido/t.liquido:0;[3,4,5].forEach(function(col){xMoney(wc.getCell(row,col))});wc.getCell(row,6).numFmt='0.00%';if(i%2)for(var j=1;j<=6;j++)wc.getCell(row,j).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7FAFC'}}});xAutoWidth(wc,30);

  var wq=wb.addWorksheet('Conferência',{views:[{showGridLines:false}]});xTitle(wq,'CONFERÊNCIA','Reconciliação automática dos valores - '+compLabel(S.competencia.competencia),5);['Indicador','Total oficial','Soma individual','Diferença','Status'].forEach(function(h,i){wq.getCell(5,i+1).value=h;xStyleHeader(wq.getCell(5,i+1))});var ps=currentPeople(),checks=[['Proventos',t.proventos,ps.reduce(function(s,p){return s+n(p.proventos)},0)],['Descontos',t.descontos,ps.reduce(function(s,p){return s+n(p.descontos)},0)],['Líquido',t.liquido,ps.reduce(function(s,p){return s+n(p.liquido)},0)],['FGTS',t.fgts,ps.reduce(function(s,p){return s+n(p.valor_fgts)},0)]];checks.forEach(function(q,i){var row=6+i,d=q[1]-q[2];wq.getCell(row,1).value=q[0];wq.getCell(row,2).value=q[1];wq.getCell(row,3).value=q[2];wq.getCell(row,4).value=d;wq.getCell(row,5).value=Math.abs(d)<0.02?'OK':'REVISAR';[2,3,4].forEach(function(col){xMoney(wq.getCell(row,col))});wq.getCell(row,5).font={bold:true,color:{argb:Math.abs(d)<0.02?'FF1F7A5B':'FFC34242'}}});xAutoWidth(wq,28);

  var buf=await wb.xlsx.writeBuffer();downloadBlob(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename('LNB_Folha_Executiva','xlsx'))}

function guideCardsHtml(){return chargeRows().map(function(r){return '<div class="rh40-guide-card"><span>'+esc40(r.label)+'</span><strong>'+esc40(brMoney(r.value))+'</strong><small>Base '+esc40(brMoney(r.base))+'</small><button type="button" class="button ghost export-only" data-rh40-guide="'+r.key+'">Gerar PDF</button></div>'}).join('')}
function installUi(){if(V.ui)return;V.ui=true;var folha=E('page-folha'),enc=E('page-encargos');if(folha){var head=folha.querySelector('.page-head');if(head&&!E('rh40-report-actions')){var a=document.createElement('div');a.className='head-actions rh40-actions';a.id='rh40-report-actions';a.innerHTML='<label>Competência<select id="rh40-comp-select"></select></label><button class="button primary export-only" id="rh40-pdf" type="button">PDF Executivo</button><button class="button secondary export-only" id="rh40-xlsx" type="button">Excel Executivo</button><button class="button ghost export-only" id="rh40-guides" type="button">Pacote de Guias</button>';head.appendChild(a)}}if(enc&&!E('rh40-guides-panel')){var panel=document.createElement('article');panel.className='panel rh40-guide-panel';panel.id='rh40-guides-panel';panel.innerHTML='<div class="panel-head"><div><span class="panel-kicker">RELATÓRIOS PARA PAGAMENTO</span><h2>Guias gerenciais da competência</h2><p class="detail-note">IRRF, INSS, PIS e FGTS com bases e valores extraídos da folha. Para pagamento, confronte com o documento oficial do respectivo portal.</p></div><button type="button" class="button primary export-only" id="rh40-guides-pack">Gerar pacote PDF</button></div><div class="rh40-guide-grid" id="rh40-guide-grid"></div>';var k=enc.querySelector('#charges-kpis');if(k)k.insertAdjacentElement('afterend',panel);else enc.appendChild(panel)}
  var st=document.createElement('style');st.id='_rh40_reports';st.textContent='.rh40-actions{display:flex!important;gap:8px!important;align-items:flex-end!important;flex-wrap:wrap!important}.rh40-actions label{min-width:135px}.rh40-guide-panel{margin:16px 0 18px}.rh40-guide-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.rh40-guide-card{border:1px solid var(--line-soft);border-radius:14px;background:var(--surface-2);padding:16px;min-width:0;overflow:hidden}.rh40-guide-card span{display:block;color:var(--muted);font-size:.72rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.rh40-guide-card strong{display:block;margin:7px 0 3px;font-size:1.35rem;color:var(--text);white-space:nowrap}.rh40-guide-card small{display:block;color:var(--muted);margin-bottom:12px}.rh40-guide-card .button{width:100%}@media(max-width:1100px){.rh40-guide-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.rh40-guide-grid{grid-template-columns:1fr}.rh40-actions{width:100%}.rh40-actions>*{flex:1 1 160px}}';document.head.appendChild(st);
  bindUi();syncUi()}
function syncUi(){var sel=E('rh40-comp-select');if(sel){var cur=S.competencia&&S.competencia.id||'';sel.innerHTML=(S.competencias||[]).map(function(c){return '<option value="'+esc40(c.id)+'">'+esc40(compLabel(c.competencia))+'</option>'}).join('');if(cur)sel.value=cur}var grid=E('rh40-guide-grid');if(grid)grid.innerHTML=guideCardsHtml();scheduleFit(20);if(typeof setupPermissions==='function')try{setupPermissions()}catch(e){}}
function busy(btn,label,fn){if(!btn)return;var old=btn.textContent;btn.disabled=true;btn.textContent=label;Promise.resolve().then(fn).catch(function(err){try{toast(err.message||String(err),true)}catch(e){alert(err.message||String(err))}}).finally(function(){btn.disabled=false;btn.textContent=old})}
function bindUi(){var sel=E('rh40-comp-select');if(sel)sel.onchange=function(){var id=this.value;busy(this,'Carregando...',async function(){await selectCompetence(id);syncUi()})};var p=E('rh40-pdf');if(p)p.onclick=function(){busy(p,'Gerando PDF...',exportPayrollPdf)};var x=E('rh40-xlsx');if(x)x.onclick=function(){busy(x,'Gerando Excel...',exportPayrollExcel)};var g=E('rh40-guides');if(g)g.onclick=function(){busy(g,'Gerando guias...',exportGuidePack)};var gp=E('rh40-guides-pack');if(gp)gp.onclick=function(){busy(gp,'Gerando pacote...',exportGuidePack)};document.addEventListener('click',function(ev){var b=ev.target&&ev.target.closest&&ev.target.closest('[data-rh40-guide]');if(!b)return;ev.preventDefault();var k=b.dataset.rh40Guide;busy(b,'Gerando...',function(){return exportGuide(k)})})}

function init(){installFit();installUi();var baseSel=E('competencia-select');if(baseSel)baseSel.addEventListener('change',function(){setTimeout(syncUi,100)});var nav=E('nav');if(nav)nav.addEventListener('click',function(){setTimeout(function(){syncUi();scheduleFit(10)},80)});setTimeout(syncUi,600);setTimeout(function(){scheduleFit(0)},900)}
window.rhV40ExportPayrollPdf=exportPayrollPdf;window.rhV40ExportPayrollExcel=exportPayrollExcel;window.rhV40ExportGuide=exportGuide;window.rhV40ExportGuidePack=exportGuidePack;window.RH_EXECUTIVE_REPORTS_V40=true;
init();
})();
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
/* RH v41 — Central de Relatórios & Documentos */
(function(){
'use strict';
var NAVY='#071a2c',NAVY2='#0d2b42',GOLD='#f2c94c',MUTED='#6b7d90',LIGHT='#eef4f8';
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function esc41(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}
function comp(v){try{return formatCompetence(v)}catch(e){var p=String(v||'').slice(0,7).split('-');return p.length===2?p[1]+'/'+p[0]:'—'}}
function slug(v){return comp(v).replace('/','-')}
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
function allowed(){try{return !!(canAdmin()||can('exportar'))}catch(e){return false}}
function guard(){if(allowed())return true;try{toast('Seu perfil não possui permissão para exportar relatórios.',true)}catch(e){}return false}
function dl(blob,name){var a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},1200)}
function rgb(hex){hex=String(hex).replace('#','');return[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]}
async function ensurePdf(){if(!LIBRARIES.jspdf)LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};if(!LIBRARIES.autotable)LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)}};await loadLibrary('jspdf');await loadLibrary('autotable')}
async function ensureExcel(){if(!LIBRARIES.exceljs)LIBRARIES.exceljs={url:'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',ready:function(){return !!window.ExcelJS}};await loadLibrary('exceljs')}
async function logo(){try{var r=await fetch('/rh/lnb-logo.png');if(!r.ok)return null;var b=await r.blob();return await new Promise(function(res){var f=new FileReader();f.onload=function(){res(f.result)};f.onerror=function(){res(null)};f.readAsDataURL(b)})}catch(e){return null}}
function pdfHead(doc,title,sub,lg){var w=doc.internal.pageSize.getWidth();doc.setFillColor.apply(doc,rgb(NAVY));doc.rect(0,0,w,31,'F');if(lg)try{doc.addImage(lg,'PNG',12,6,22,18)}catch(e){}doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,40,13);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text(sub||'',40,20);doc.setTextColor.apply(doc,rgb(GOLD));doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('LIGA NACIONAL DE BASQUETE',40,26)}
function pdfFoot(doc){for(var i=1;i<=doc.internal.getNumberOfPages();i++){doc.setPage(i);var w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();doc.setTextColor.apply(doc,rgb(MUTED));doc.setFontSize(7.4);doc.setFont('helvetica','normal');doc.text('Uso restrito — Diretoria | RH & Folha | '+comp(S.competencia&&S.competencia.competencia),12,h-7);doc.text('Página '+i+' de '+doc.internal.getNumberOfPages(),w-12,h-7,{align:'right'})}}
async function planningReady(kind){try{if(typeof window.rhRenderPlanning==='function')window.rhRenderPlanning()}catch(e){}try{if(typeof window.rhProvisionRefresh==='function')await window.rhProvisionRefresh()}catch(e){}try{if(typeof window.rhV38EnforcePlanningUI==='function')window.rhV38EnforcePlanningUI()}catch(e){}await new Promise(function(r){setTimeout(r,180)});var pane=document.querySelector('[data-plan-pane="'+kind+'"]');if(!pane)throw new Error('O quadro de planejamento ainda não está disponível. Abra Planejamento & Provisões e tente novamente.');return pane}
function tableData(pane){var tables=Array.from(pane.querySelectorAll('table')).filter(function(t){return t.tBodies&&t.tBodies[0]&&t.tBodies[0].rows.length});if(!tables.length)return null;tables.sort(function(a,b){return b.tBodies[0].rows.length-a.tBodies[0].rows.length});var t=tables[0],head=t.tHead&&t.tHead.rows.length?t.tHead.rows[t.tHead.rows.length-1]:null,headers=head?Array.from(head.cells).map(function(c){return clean(c.textContent)}):[];var rows=Array.from(t.tBodies[0].rows).map(function(tr){return Array.from(tr.cells).map(function(td,i){if(i===0){var b=td.querySelector('b');if(b)return clean(b.textContent)}return clean(td.textContent)})});return{headers:headers,rows:rows,table:t}}
function tableTotal(data){if(!data||!data.table||!data.table.tFoot)return[];return Array.from(data.table.tFoot.rows).map(function(r){return Array.from(r.cells).map(function(c){return clean(c.textContent)})})}
async function provisionData(kind){var pane=await planningReady(kind),d=tableData(pane);if(!d||!d.rows.length)throw new Error('Não há colaboradores ativos para este relatório.');return{pane:pane,data:d,totals:tableTotal(d)}}
async function exportProvisionPdf(kind){if(!guard())return;await ensurePdf();var pack=await provisionData(kind),title=kind==='13'?'Provisão de 13º Salário':'Provisão de Férias',doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true}),lg=await logo();pdfHead(doc,title+' — Relatório Executivo','Competência '+comp(S.competencia&&S.competencia.competencia)+' | Quadro atual de colaboradores ativos',lg);doc.autoTable({startY:38,head:[pack.data.headers],body:pack.data.rows,foot:pack.totals.length?pack.totals:undefined,theme:'striped',styles:{font:'helvetica',fontSize:6.7,cellPadding:2,textColor:rgb(NAVY)},headStyles:{fillColor:rgb(NAVY2),textColor:[255,255,255],fontStyle:'bold'},footStyles:{fillColor:rgb(LIGHT),textColor:rgb(NAVY),fontStyle:'bold'},alternateRowStyles:{fillColor:[248,250,252]},didParseCell:function(h){if(h.section!=='head'&&h.column.index>0)h.cell.styles.halign='right'}});pdfFoot(doc);doc.save('LNB_'+(kind==='13'?'Provisao_13o':'Provisao_Ferias')+'_'+slug(S.competencia&&S.competencia.competencia)+'.pdf')}
function xHeader(ws,title,sub,cols){ws.views=[{showGridLines:false,state:'frozen',ySplit:5}];ws.mergeCells(1,1,1,cols);var c=ws.getCell(1,1);c.value=title;c.font={bold:true,size:20,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF071A2C'}};c.alignment={vertical:'middle'};ws.getRow(1).height=34;ws.mergeCells(2,1,2,cols);var s=ws.getCell(2,1);s.value=sub;s.font={size:10,color:{argb:'FFDCE7F3'}};s.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF071A2C'}};ws.getRow(2).height=20;ws.mergeCells(3,1,3,cols);var k=ws.getCell(3,1);k.value='LIGA NACIONAL DE BASQUETE · RH & FOLHA · USO RESTRITO';k.font={bold:true,size:9,color:{argb:'FFF2C94C'}};k.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF071A2C'}};ws.getRow(3).height=18}
function xStyleRow(r){r.eachCell(function(c){c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0D2B42'}};c.alignment={vertical:'middle'};c.border={bottom:{style:'thin',color:{argb:'FFBFCBD5'}}}});r.height=22}
function xWidth(ws){ws.columns.forEach(function(col){var m=10;col.eachCell({includeEmpty:true},function(c){m=Math.max(m,String(c.value==null?'':c.value).length+2)});col.width=Math.min(42,m)})}
async function exportProvisionExcel(kind){if(!guard())return;await ensureExcel();var pack=await provisionData(kind),wb=new ExcelJS.Workbook(),title=kind==='13'?'Provisão de 13º Salário':'Provisão de Férias',ws=wb.addWorksheet(kind==='13'?'Provisão 13º':'Provisão Férias');xHeader(ws,title,'Competência '+comp(S.competencia&&S.competencia.competencia)+' | Quadro atual de colaboradores ativos',Math.max(1,pack.data.headers.length));var hr=ws.addRow(pack.data.headers);xStyleRow(hr);pack.data.rows.forEach(function(r,i){var row=ws.addRow(r);if(i%2)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF5F8FA'}}});pack.totals.forEach(function(r){var row=ws.addRow(r);row.font={bold:true,color:{argb:'FF071A2C'}};row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF5D6'}}});ws.autoFilter={from:{row:4,column:1},to:{row:4,column:pack.data.headers.length}};xWidth(ws);var buf=await wb.xlsx.writeBuffer();dl(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'LNB_'+(kind==='13'?'Provisao_13o':'Provisao_Ferias')+'_'+slug(S.competencia&&S.competencia.competencia)+'.xlsx')}
function terminationData(){var pane=document.querySelector('[data-plan-pane="rescisao"]');if(!pane)throw new Error('Abra Planejamento & Provisões > Rescisões e gere o relatório analítico primeiro.');var cards=Array.from(pane.querySelectorAll('.kpi')).map(function(k){return[clean((k.querySelector('span')||{}).textContent),clean((k.querySelector('strong')||{}).textContent),clean((k.querySelector('small')||{}).textContent)]}).filter(function(x){return x[0]&&x[1]});var lines=Array.from(pane.querySelectorAll('.rh-res-lines > div,.rh26-memory > div')).map(function(r){return[clean((r.querySelector('span')||{}).textContent),clean((r.querySelector('b')||{}).textContent)]}).filter(function(x){return x[0]&&x[1]});if(!cards.length&&!lines.length)throw new Error('Gere o relatório analítico da rescisão antes de exportar.');var sel=E('rh26-person')||E('rh-res-person'),name=sel&&sel.options[sel.selectedIndex]?clean(sel.options[sel.selectedIndex].textContent):'Colaborador',date=E('rh26-date')&&E('rh26-date').value||'';return{name:name,date:date,cards:cards,lines:lines}}
async function exportTerminationPdf(){if(!guard())return;await ensurePdf();var d=terminationData(),doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),lg=await logo();pdfHead(doc,'Rescisão — Relatório Executivo',d.name+(d.date?' | Desligamento '+d.date.split('-').reverse().join('/'):'')+' | Competência '+comp(S.competencia&&S.competencia.competencia),lg);var y=38;if(d.cards.length){doc.autoTable({startY:y,head:[['Indicador','Valor','Observação']],body:d.cards,theme:'grid',styles:{font:'helvetica',fontSize:8,cellPadding:2.6},headStyles:{fillColor:rgb(NAVY2),textColor:[255,255,255]},columnStyles:{1:{halign:'right',fontStyle:'bold'}}});y=doc.lastAutoTable.finalY+7}if(d.lines.length)doc.autoTable({startY:y,head:[['Composição','Valor']],body:d.lines,theme:'striped',styles:{font:'helvetica',fontSize:8,cellPadding:2.5},headStyles:{fillColor:rgb(NAVY2),textColor:[255,255,255]},columnStyles:{1:{halign:'right',fontStyle:'bold'}}});pdfFoot(doc);doc.save('LNB_Rescisao_'+d.name.replace(/[^A-Za-z0-9]+/g,'_')+'_'+slug(S.competencia&&S.competencia.competencia)+'.pdf')}
async function exportTerminationExcel(){if(!guard())return;await ensureExcel();var d=terminationData(),wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Rescisão');xHeader(ws,'RESCISÃO — RELATÓRIO EXECUTIVO',d.name+(d.date?' | Desligamento '+d.date.split('-').reverse().join('/'):'')+' | Competência '+comp(S.competencia&&S.competencia.competencia),3);var h=ws.addRow(['Indicador','Valor','Observação']);xStyleRow(h);d.cards.forEach(function(r){ws.addRow(r)});ws.addRow([]);var h2=ws.addRow(['Composição','Valor','']);xStyleRow(h2);d.lines.forEach(function(r){ws.addRow([r[0],r[1],''])});xWidth(ws);var buf=await wb.xlsx.writeBuffer();dl(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'LNB_Rescisao_'+d.name.replace(/[^A-Za-z0-9]+/g,'_')+'_'+slug(S.competencia&&S.competencia.competencia)+'.xlsx')}
function card(icon,title,desc,buttons){return '<article class="rh41-report-card"><div class="rh41-icon">'+icon+'</div><div class="rh41-card-copy"><h3>'+esc41(title)+'</h3><p>'+esc41(desc)+'</p></div><div class="rh41-card-actions">'+buttons+'</div></article>'}
function btn(id,label,primary){return '<button type="button" class="button '+(primary?'primary':'ghost')+'" id="'+id+'">'+label+'</button>'}
function installPage(){if(E('page-relatorios'))return;var main=document.querySelector('main.content'),nav=E('nav');if(!main||!nav)return;var b=document.createElement('button');b.className='nav-item';b.dataset.view='relatorios';b.innerHTML='<span>▣</span>Relatórios & Documentos';var cfg=nav.querySelector('[data-view="configuracoes"]');if(cfg)nav.insertBefore(b,cfg);else nav.appendChild(b);var s=document.createElement('section');s.className='page';s.id='page-relatorios';s.innerHTML='<div class="page-head"><div><span class="eyebrow">CENTRAL EXECUTIVA</span><h1>Relatórios & Documentos</h1><p>PDFs e planilhas executivas por competência, além das guias gerenciais para conferência e pagamento.</p></div><div class="head-actions"><label>Competência<select id="rh41-comp"></select></label></div></div><div class="rh41-notice"><b>Apresentação à Diretoria</b><span>Relatórios com identidade visual LNB, totais, memória de cálculo e composição detalhada. As guias são gerenciais e não substituem DARF, DCTFWeb ou FGTS Digital.</span></div><div class="rh41-grid">'+card('▤','Folha mensal','Relatório executivo completo da competência, com composição individual, rubricas, encargos, rateio e conferência.',btn('rh41-folha-pdf','PDF Executivo',true)+btn('rh41-folha-xlsx','Excel Executivo'))+card('◫','Provisão de 13º','Quadro atual de colaboradores ativos com base remuneratória, avos, provisões e encargos.',btn('rh41-13-pdf','PDF',true)+btn('rh41-13-xlsx','Excel'))+card('◩','Provisão de férias','Relatório executivo da provisão de férias e 1/3, somente para o quadro ativo.',btn('rh41-ferias-pdf','PDF',true)+btn('rh41-ferias-xlsx','Excel'))+card('◆','Rescisão','Exporta a simulação analítica atualmente gerada em Planejamento & Provisões > Rescisões.',btn('rh41-res-pdf','PDF',true)+btn('rh41-res-xlsx','Excel'))+card('IR','Guia gerencial — IRRF','Memória para conferência do IRRF da folha da competência selecionada.',btn('rh41-irrf','Gerar PDF',true))+card('IN','Guia gerencial — INSS','Base previdenciária e valor total do INSS para conferência.',btn('rh41-inss','Gerar PDF',true))+card('PI','Guia gerencial — PIS','Base e valor de PIS sobre folha para conferência.',btn('rh41-pis','Gerar PDF',true))+card('FG','Guia gerencial — FGTS','Base e valor de FGTS da folha; não inclui automaticamente multa rescisória de 40%.',btn('rh41-fgts','Gerar PDF',true))+card('▦','Pacote de guias','Gera IRRF, INSS, PIS e FGTS em um único pacote PDF gerencial.',btn('rh41-guides','Gerar pacote PDF',true))+'</div>';main.appendChild(s);var st=document.createElement('style');st.id='_rh41';st.textContent='.rh41-notice{display:flex;gap:14px;align-items:flex-start;padding:14px 16px;margin-bottom:16px;border:1px solid color-mix(in srgb,var(--gold) 40%,var(--line-soft));border-radius:14px;background:color-mix(in srgb,var(--gold) 7%,var(--surface-1))}.rh41-notice b{color:var(--gold);white-space:nowrap}.rh41-notice span{color:var(--muted)}.rh41-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.rh41-report-card{display:grid;grid-template-columns:48px 1fr;grid-template-rows:1fr auto;gap:12px 14px;padding:18px;border:1px solid var(--line-soft);border-radius:16px;background:var(--surface-1);min-width:0}.rh41-icon{grid-row:1/3;width:46px;height:46px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--gold) 12%,var(--surface-2));border:1px solid color-mix(in srgb,var(--gold) 35%,var(--line-soft));color:var(--gold);font-weight:950}.rh41-card-copy{min-width:0}.rh41-card-copy h3{margin:0 0 6px;font-size:1rem;color:var(--text)}.rh41-card-copy p{margin:0;color:var(--muted);font-size:.78rem;line-height:1.45}.rh41-card-actions{display:flex;gap:8px;flex-wrap:wrap}.rh41-card-actions .button{flex:1 1 110px}.rh41-export-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0;padding:12px 14px;border:1px solid var(--line-soft);border-radius:13px;background:var(--surface-2)}.rh41-export-bar b{margin-right:auto;color:var(--text)}@media(max-width:1150px){.rh41-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.rh41-grid{grid-template-columns:1fr}.rh41-notice{flex-direction:column}}';document.head.appendChild(st)}
function installPlanningButtons(){[['13','13º salário','rh41-inline-13-pdf','rh41-inline-13-xlsx'],['ferias','Férias','rh41-inline-ferias-pdf','rh41-inline-ferias-xlsx'],['rescisao','Rescisão','rh41-inline-res-pdf','rh41-inline-res-xlsx']].forEach(function(x){var pane=document.querySelector('[data-plan-pane="'+x[0]+'"]');if(!pane||pane.querySelector('.rh41-export-bar'))return;var bar=document.createElement('div');bar.className='rh41-export-bar';bar.innerHTML='<b>Exportar '+x[1]+'</b>'+btn(x[2],'PDF Executivo',true)+btn(x[3],'Excel Executivo');pane.insertBefore(bar,pane.firstChild)})}
function sync(){var sel=E('rh41-comp');if(sel){var cur=S.competencia&&S.competencia.id||'';sel.innerHTML=(S.competencias||[]).map(function(c){return '<option value="'+esc41(c.id)+'">'+esc41(comp(c.competencia))+'</option>'}).join('');if(cur)sel.value=cur}installPlanningButtons();if(typeof window.rhFitAllCardValues==='function')setTimeout(window.rhFitAllCardValues,30)}
function busy(id,fn){var b=typeof id==='string'?E(id):id;if(!b)return;var old=b.textContent;b.disabled=true;b.textContent='Gerando...';Promise.resolve().then(fn).catch(function(e){try{toast(e.message||String(e),true)}catch(x){alert(e.message||String(e))}}).finally(function(){b.disabled=false;b.textContent=old})}
function bind(){var c=E('rh41-comp');if(c)c.onchange=function(){var id=this.value;busy(this,async function(){await selectCompetence(id);sync()})};[['rh41-folha-pdf',function(){if(guard())return window.rhV40ExportPayrollPdf()}],['rh41-folha-xlsx',function(){if(guard())return window.rhV40ExportPayrollExcel()}],['rh41-13-pdf',function(){return exportProvisionPdf('13')}],['rh41-13-xlsx',function(){return exportProvisionExcel('13')}],['rh41-ferias-pdf',function(){return exportProvisionPdf('ferias')}],['rh41-ferias-xlsx',function(){return exportProvisionExcel('ferias')}],['rh41-res-pdf',exportTerminationPdf],['rh41-res-xlsx',exportTerminationExcel],['rh41-irrf',function(){if(guard())return window.rhV40ExportGuide('IRRF')}],['rh41-inss',function(){if(guard())return window.rhV40ExportGuide('INSS')}],['rh41-pis',function(){if(guard())return window.rhV40ExportGuide('PIS')}],['rh41-fgts',function(){if(guard())return window.rhV40ExportGuide('FGTS')}],['rh41-guides',function(){if(guard())return window.rhV40ExportGuidePack()}],['rh41-inline-13-pdf',function(){return exportProvisionPdf('13')}],['rh41-inline-13-xlsx',function(){return exportProvisionExcel('13')}],['rh41-inline-ferias-pdf',function(){return exportProvisionPdf('ferias')}],['rh41-inline-ferias-xlsx',function(){return exportProvisionExcel('ferias')}],['rh41-inline-res-pdf',exportTerminationPdf],['rh41-inline-res-xlsx',exportTerminationExcel]].forEach(function(x){var b=E(x[0]);if(b)b.onclick=function(){busy(b,x[1])}})}
function init(){installPage();installPlanningButtons();sync();bind();var nav=E('nav');if(nav)nav.addEventListener('click',function(){setTimeout(function(){installPlanningButtons();sync();bind()},120)});var base=E('competencia-select');if(base)base.addEventListener('change',function(){setTimeout(sync,120)})}
window.rhV41ExportProvisionPdf=exportProvisionPdf;window.rhV41ExportProvisionExcel=exportProvisionExcel;window.rhV41ExportTerminationPdf=exportTerminationPdf;window.rhV41ExportTerminationExcel=exportTerminationExcel;window.RH_REPORT_CENTER_V41=true;
init();
})();
/* RH v41a/v42 — estabilidade da central, cards, rescisão, próxima folha e guias */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function comp(v){try{return formatCompetence(v)}catch(e){var p=String(v||'').slice(0,7).split('-');return p.length===2?p[1]+'/'+p[0]:'—'}}
function parseMoney(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
var V={mode:'mes',fitTimer:0,ro:null};

function refreshReportCenter(){
  var sel=E('rh41-comp');
  if(sel){
    var cur=S.competencia&&S.competencia.id||'';
    sel.innerHTML=(S.competencias||[]).map(function(c){return '<option value="'+esc(c.id)+'">'+comp(c.competencia)+'</option>'}).join('');
    if(cur)sel.value=cur;
    sel.onchange=async function(){
      var id=this.value;this.disabled=true;
      try{await selectCompetence(id);var base=E('competencia-select');if(base)base.value=id;refreshAll()}
      catch(err){try{toast(err.message||String(err),true)}catch(e){}}
      finally{this.disabled=false}
    };
  }
  var nav=document.querySelector('[data-view="relatorios"]');
  if(nav&&!nav.dataset.rh41a){nav.dataset.rh41a='1';nav.title='PDFs, Excel e guias gerenciais';nav.addEventListener('click',function(){setTimeout(refreshAll,80)})}
}

/* card fit sem MutationObserver */
var FIT='.kpi strong,.rh40-guide-card strong,.rh41-report-card strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#charges-kpis strong,#payroll-kpis strong,#movement-kpis strong,#custo-real-kpis strong,#rh-dossier-kpis strong,#rh-insight-kpis strong';
function fitOne(el){
  if(!el||!el.isConnected||!String(el.textContent||'').trim())return;
  var box=el.closest('.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card')||el.parentElement;
  if(!box)return;
  var cs=getComputedStyle(box),avail=box.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0)-10;
  if(avail<40)return;
  var size=el.closest('.rh40-guide-card')?24:el.closest('.rh41-report-card')?26:36,min=10;
  el.style.setProperty('font-size',size+'px','important');
  el.style.setProperty('white-space','nowrap','important');
  el.style.setProperty('display','block','important');
  el.style.setProperty('max-width','100%','important');
  el.style.setProperty('overflow','hidden','important');
  for(var i=0;i<10;i++){
    var r=document.createRange();r.selectNodeContents(el);var w=r.getBoundingClientRect().width;
    if(w<=avail||size<=min)break;
    size=Math.max(min,Math.floor(size*(avail/w)*.95*10)/10);
    el.style.setProperty('font-size',size+'px','important');
  }
  el.style.setProperty('letter-spacing',size<18?'-.05em':size<24?'-.035em':'-.015em','important');
}
function rhV42FitCards(){Array.prototype.forEach.call(document.querySelectorAll(FIT),fitOne)}
function scheduleFit(delay){clearTimeout(V.fitTimer);V.fitTimer=setTimeout(function(){requestAnimationFrame(rhV42FitCards)},delay==null?30:delay)}
window.rhFitAllCardValues=rhV42FitCards;
window.rhV42FitCards=rhV42FitCards;

function monthlyComp(){var a=(window.RH_PERIOD&&RH_PERIOD.active)||[];if(a.length===1&&!a[0]._periodConsolidated)return a[0];if(S.competencia&&!S.competencia._periodConsolidated)return S.competencia;return null}
function encRowsFrom(c){var e=c&&c.encargos||{};return[
  {key:'IRRF',label:'IRRF folha',base:n(e.base_irrf_mensal||c&&c.base_irrf),value:n(e.valor_irrf_folha||e.valor_irrf_mensal||e.valor_total_irrf||e.valor_irrf)},
  {key:'INSS',label:'INSS total',base:n(e.base_total_inss||c&&c.base_inss),value:n(e.total_inss)},
  {key:'PIS',label:'PIS sobre folha',base:n(e.base_pis||c&&c.base_inss),value:n(e.valor_pis)},
  {key:'FGTS',label:'FGTS',base:n(e.base_fgts||c&&c.base_fgts),value:n(e.valor_fgts||c&&c.valor_fgts)}
]}
function forecastPane(){return document.querySelector('[data-plan-pane="folha"]')}
function forecastTotals(){var pane=forecastPane(),table=pane&&pane.querySelector('table'),rows=table?Array.from(table.querySelectorAll('tbody tr')):[],sum={prov:0,disc:0,liq:0,enc:0,ben:0,custo:0};rows.forEach(function(tr){var c=tr.cells||[];if(c.length>=8){sum.prov+=parseMoney(c[2].textContent);sum.disc+=parseMoney(c[3].textContent);sum.liq+=parseMoney(c[4].textContent);sum.enc+=parseMoney(c[5].textContent);sum.ben+=parseMoney(c[6].textContent);sum.custo+=parseMoney(c[7].textContent)}});return sum}
function latestActual(){var a=(S.competencias||[]).filter(function(c){return c&&!c._periodConsolidated}).slice().sort(function(x,y){return String(x.competencia||'').localeCompare(String(y.competencia||''))});return a[a.length-1]||monthlyComp()}
function nextGuideRows(){var base=latestActual(),f=forecastTotals(),real=encRowsFrom(base),factor=base&&n(base.proventos)>0?f.prov/n(base.proventos):1;return real.map(function(r){return{key:r.key,label:r.label,base:r.base*factor,value:r.value*factor,estimated:true}})}
function guideRows(){return V.mode==='proxima'?nextGuideRows():encRowsFrom(monthlyComp())}
function guideLabel(){if(V.mode==='proxima')return 'Próxima folha (estimativa)';var c=monthlyComp();return c?'Competência '+comp(c.competencia):'Selecione um único mês'}
function guideCardsHtml(){if(V.mode==='mes'&&!monthlyComp())return '<div class="rh42-guide-empty">Selecione um único mês no filtro global para visualizar e gerar as guias daquela competência.</div>';return guideRows().map(function(r){return '<div class="rh40-guide-card"><span>'+esc(r.label)+'</span><strong>'+esc(money(r.value))+'</strong><small>Base '+esc(money(r.base))+(r.estimated?' · estimativa':'')+'</small><button type="button" class="button ghost export-only" data-rh42-guide="'+r.key+'">Gerar PDF</button></div>'}).join('')}

async function ensurePdf(){if(!LIBRARIES.jspdf)LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};if(!LIBRARIES.autotable)LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)}};await loadLibrary('jspdf');await loadLibrary('autotable')}
async function ensureExcel(){if(!LIBRARIES.exceljs)LIBRARIES.exceljs={url:'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',ready:function(){return !!window.ExcelJS}};await loadLibrary('exceljs')}
function dl(blob,name){var a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},1000)}
function rgb(h){h=String(h).replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function pdfHead(doc,title,sub){var w=doc.internal.pageSize.getWidth();doc.setFillColor.apply(doc,rgb('#071a2c'));doc.rect(0,0,w,31,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,12,13);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text(sub||'',12,20);doc.setTextColor.apply(doc,rgb('#f2c94c'));doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('LIGA NACIONAL DE BASQUETE · RH & FOLHA',12,26)}
async function rhV42ExportGuide(kind){if(V.mode==='mes'&&!monthlyComp())throw new Error('Selecione um único mês no filtro global.');await ensurePdf();var r=guideRows().find(function(x){return x.key===kind});if(!r)throw new Error('Encargo não encontrado.');var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'}),label=guideLabel();pdfHead(doc,'Guia Gerencial — '+r.label,label);doc.setFillColor.apply(doc,rgb('#eef4f8'));doc.roundedRect(12,40,186,43,4,4,'F');doc.setTextColor.apply(doc,rgb('#071a2c'));doc.setFont('helvetica','bold');doc.setFontSize(23);doc.text(money(r.value),18,61);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text('Base: '+money(r.base),18,75);doc.autoTable({startY:94,head:[['Campo','Informação']],body:[['Referência',label],['Obrigação',r.label],['Base',money(r.base)],['Valor',money(r.value)],['Natureza',r.estimated?'Estimativa gerencial sobre a próxima folha':'Valor da competência mensal selecionada'],['Observação',r.estimated?'Estimativa proporcional baseada na última competência fechada e no total projetado da próxima folha.':'IRRF da folha prioriza o código de folha e exclui RPA quando essa separação está disponível.']],theme:'grid',styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:rgb('#0d2b42'),textColor:[255,255,255]}});doc.save('LNB_Guia_'+kind+'_'+(V.mode==='proxima'?'Proxima_Folha':String(monthlyComp().competencia||'').slice(0,7))+'.pdf')}

function installGuideMode(){var panel=E('rh40-guides-panel');if(!panel)return;var head=panel.querySelector('.panel-head');if(head&&!E('rh42-guide-mode')){var wrap=document.createElement('div');wrap.className='rh42-guide-mode';wrap.innerHTML='<label>Referência das guias<select id="rh42-guide-mode"><option value="mes">Mês selecionado</option><option value="proxima">Próxima folha (estimativa)</option></select></label><span id="rh42-guide-ref"></span>';head.appendChild(wrap)}var sel=E('rh42-guide-mode');if(sel){sel.value=V.mode;sel.onchange=function(){V.mode=this.value;syncGuides()}}syncGuides()}
function syncGuides(){var grid=E('rh40-guide-grid');if(grid)grid.innerHTML=guideCardsHtml();var ref=E('rh42-guide-ref');if(ref)ref.textContent=guideLabel();scheduleFit(20)}

function tablePack(pane){if(!pane)return null;var tables=Array.from(pane.querySelectorAll('table')).filter(function(t){return t.tBodies&&t.tBodies[0]&&t.tBodies[0].rows.length});if(!tables.length)return null;tables.sort(function(a,b){return b.tBodies[0].rows.length-a.tBodies[0].rows.length});var t=tables[0],head=t.tHead&&t.tHead.rows.length?t.tHead.rows[t.tHead.rows.length-1]:null,headers=head?Array.from(head.cells).map(function(c){return String(c.textContent||'').trim()}):[],rows=Array.from(t.tBodies[0].rows).map(function(tr){return Array.from(tr.cells).map(function(td){return String(td.textContent||'').replace(/\s+/g,' ').trim()})});return{headers:headers,rows:rows}}
async function rhV42ExportForecastPdf(){var p=tablePack(forecastPane());if(!p)throw new Error('A projeção da próxima folha ainda não está disponível.');await ensurePdf();var doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});pdfHead(doc,'Próxima Folha — Relatório Executivo','Projeção gerencial do quadro ativo');doc.autoTable({startY:38,head:[p.headers],body:p.rows,theme:'striped',styles:{fontSize:6.8,cellPadding:2},headStyles:{fillColor:rgb('#0d2b42'),textColor:[255,255,255]}});doc.save('LNB_Proxima_Folha_Executiva.pdf')}
async function rhV42ExportForecastExcel(){var p=tablePack(forecastPane());if(!p)throw new Error('A projeção da próxima folha ainda não está disponível.');await ensureExcel();var wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Próxima Folha');ws.views=[{showGridLines:false,state:'frozen',ySplit:4}];ws.addRow(['PRÓXIMA FOLHA — RELATÓRIO EXECUTIVO']);ws.addRow([]);ws.addRow([]);var hr=ws.addRow(p.headers);hr.eachCell(function(x){x.font={bold:true,color:{argb:'FFFFFFFF'}};x.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0D2B42'}}});p.rows.forEach(function(r){ws.addRow(r)});ws.columns.forEach(function(col){var m=10;col.eachCell({includeEmpty:true},function(x){m=Math.max(m,String(x.value==null?'':x.value).length+2)});col.width=Math.min(38,m)});var buf=await wb.xlsx.writeBuffer();dl(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'LNB_Proxima_Folha_Executiva.xlsx')}

function activeKind(){var pane=Array.from(document.querySelectorAll('#page-planejamento [data-plan-pane]')).find(function(x){return !x.hidden&&getComputedStyle(x).display!=='none'});return pane&&pane.dataset.planPane||'13'}
function runPlanExport(type){var k=activeKind(),fn=null;if(k==='13')fn=type==='pdf'?function(){return window.rhV41ExportProvisionPdf('13')}:function(){return window.rhV41ExportProvisionExcel('13')};else if(k==='ferias')fn=type==='pdf'?function(){return window.rhV41ExportProvisionPdf('ferias')}:function(){return window.rhV41ExportProvisionExcel('ferias')};else if(k==='folha')fn=type==='pdf'?rhV42ExportForecastPdf:rhV42ExportForecastExcel;else if(k==='rescisao')fn=type==='pdf'?window.rhV41ExportTerminationPdf:window.rhV41ExportTerminationExcel;if(fn)Promise.resolve().then(fn).catch(function(e){try{toast(e.message||String(e),true)}catch(x){}})}
function installPlanningToolbar(){var page=E('page-planejamento');if(!page)return;var bar=E('rh42-plan-export');if(!bar){bar=document.createElement('div');bar.id='rh42-plan-export';bar.className='rh42-plan-export';bar.innerHTML='<div><b id="rh42-plan-title">Exportar planejamento</b><small id="rh42-plan-sub">PDF e Excel executivo</small></div><div class="rh42-plan-actions"><button class="button primary export-only" id="rh42-plan-pdf" type="button">PDF Executivo</button><button class="button secondary export-only" id="rh42-plan-xlsx" type="button">Excel Executivo</button></div>';var head=page.querySelector('.page-head');if(head)head.insertAdjacentElement('afterend',bar);else page.insertBefore(bar,page.firstChild)}var map={'13':'13º salário','ferias':'Férias','folha':'Próxima folha','rescisao':'Rescisão'},k=activeKind(),title=E('rh42-plan-title');if(title)title.textContent='Exportar '+(map[k]||'planejamento');E('rh42-plan-pdf').onclick=function(){runPlanExport('pdf')};E('rh42-plan-xlsx').onclick=function(){runPlanExport('xlsx')}}

function enhanceTermination(){var pane=document.querySelector('[data-plan-pane="rescisao"]'),term=pane&&pane.querySelector('.rh26-term'),kpis=pane&&pane.querySelector('.rh26-kpis');if(!term||!kpis)return;var cols=term.children;if(cols[0]&&cols[0].querySelector('h3'))cols[0].querySelector('h3').textContent='Proventos';if(cols[1]&&cols[1].querySelector('h3'))cols[1].querySelector('h3').textContent='Descontos';var cards=Array.from(kpis.querySelectorAll('.kpi')),gross=0,ded=0,liq=0;cards.forEach(function(c){var l=norm((c.querySelector('span')||{}).textContent),v=parseMoney((c.querySelector('strong')||{}).textContent);if(l.indexOf('total bruto')>=0)gross=v;else if(l.indexOf('dedu')>=0)ded=v;else if(l.indexOf('liquido')>=0)liq=v});if(cols[0]&&!cols[0].querySelector('.rh42-term-total'))cols[0].insertAdjacentHTML('beforeend','<div class="rh42-term-total"><span>Total de proventos</span><b>'+money(gross)+'</b></div>');if(cols[1]&&!cols[1].querySelector('.rh42-term-total'))cols[1].insertAdjacentHTML('beforeend','<div class="rh42-term-total"><span>Total de descontos</span><b>'+money(ded)+'</b></div>');var f=E('rh42-term-formula');if(!f){f=document.createElement('div');f.id='rh42-term-formula';f.className='rh42-term-formula';kpis.insertAdjacentElement('afterend',f)}f.innerHTML='<b>Como chegamos ao líquido</b><span>'+money(gross)+' de proventos − '+money(ded)+' de descontos = <strong>'+money(liq)+'</strong></span>'}

function styles(){if(E('_rh42'))return;var s=document.createElement('style');s.id='_rh42';s.textContent='.rh42-plan-export{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;margin:-4px 0 14px;border:1px solid var(--line-soft);border-radius:13px;background:var(--surface-2)}.rh42-plan-actions{display:flex;gap:8px;flex-wrap:wrap}.rh42-guide-mode{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-left:auto}.rh42-guide-mode label{display:flex;flex-direction:column;gap:4px;color:var(--muted);font-size:.68rem;font-weight:800;text-transform:uppercase}.rh42-guide-mode select{padding:8px 30px 8px 10px;border:1px solid var(--line-soft);border-radius:9px;background:var(--surface-2);color:var(--text)}#rh42-guide-ref{font-size:.76rem;color:var(--muted);font-weight:800}.rh42-guide-empty{grid-column:1/-1;padding:18px;border:1px dashed var(--line-soft);border-radius:12px;color:var(--muted);text-align:center}.rh42-term-formula{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:13px 16px;margin:12px 0;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2)}.rh42-term-total{display:flex!important;justify-content:space-between!important;gap:10px;padding-top:10px!important;margin-top:8px!important;border-top:1px solid var(--line-soft)!important;font-weight:900}.kpi strong,.rh40-guide-card strong{overflow:hidden!important;text-overflow:clip!important;max-width:100%!important;min-width:0!important}@media(max-width:800px){.rh42-plan-export,.rh42-term-formula{align-items:flex-start;flex-direction:column}}';document.head.appendChild(s)}
function refreshAll(){styles();refreshReportCenter();installGuideMode();installPlanningToolbar();enhanceTermination();scheduleFit(20)}
function init(){refreshAll();setTimeout(refreshAll,500);setTimeout(refreshAll,1200);document.addEventListener('click',function(e){var g=e.target&&e.target.closest&&e.target.closest('[data-rh42-guide]');if(g){e.preventDefault();rhV42ExportGuide(g.dataset.rh42Guide).catch(function(err){try{toast(err.message||String(err),true)}catch(x){}});return}if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab],.nav-item')){setTimeout(refreshAll,80)}},true);window.addEventListener('resize',function(){scheduleFit(60)});if(window.ResizeObserver){V.ro=new ResizeObserver(function(){scheduleFit(50)});document.querySelectorAll('.kpi,.rh40-guide-card').forEach(function(x){try{V.ro.observe(x)}catch(e){}})}}

window.rhV42ExportForecastPdf=rhV42ExportForecastPdf;
window.rhV42ExportForecastExcel=rhV42ExportForecastExcel;
window.rhV42ExportGuide=rhV42ExportGuide;
window.RH_REPORT_CENTER_V41A=true;
window.RH_REPORT_FIXES_V42=true;
init();
})();
/* RH v42 — ajustes de cards, rescisão, próxima folha e guias */
(function(){
'use strict';
var V={timer:0,resize:null,mode:'mes'};
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function comp(v){try{return formatCompetence(v)}catch(e){var p=String(v||'').slice(0,7).split('-');return p.length===2?p[1]+'/'+p[0]:'—'}}
function parseMoney(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function allowed(){try{return !!(canAdmin()||can('exportar'))}catch(e){return false}}
function guard(){if(allowed())return true;try{toast('Seu perfil não possui permissão para exportar relatórios.',true)}catch(e){}return false}

/* card fit: mede o texto real e reduz somente o necessário */
var FIT='.kpi strong,.rh40-guide-card strong,.rh41-report-card strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#charges-kpis strong,#payroll-kpis strong,#movement-kpis strong,#custo-real-kpis strong,#rh-dossier-kpis strong,#rh-insight-kpis strong';
function fitOne(el){
  if(!el||!el.isConnected||!String(el.textContent||'').trim())return;
  var box=el.closest('.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card')||el.parentElement;if(!box)return;
  var bcs=getComputedStyle(box),av=box.clientWidth-(parseFloat(bcs.paddingLeft)||0)-(parseFloat(bcs.paddingRight)||0)-8;if(av<40)return;
  var max=el.closest('.rh40-guide-card')?24:el.closest('.rh41-report-card')?26:36,min=10,size=max;
  el.style.setProperty('font-size',size+'px','important');el.style.setProperty('white-space','nowrap','important');el.style.setProperty('max-width','100%','important');el.style.setProperty('display','block','important');el.style.setProperty('overflow','hidden','important');
  for(var i=0;i<8;i++){var r=document.createRange();try{r.selectNodeContents(el)}catch(e){break}var w=r.getBoundingClientRect().width;if(w<=av||size<=min)break;size=Math.max(min,Math.floor((size*(av/w)*.96)*10)/10);el.style.setProperty('font-size',size+'px','important')}
  el.style.setProperty('letter-spacing',size<18?'-.05em':size<24?'-.035em':'-.015em','important');
}
function fitAll(){Array.prototype.forEach.call(document.querySelectorAll(FIT),fitOne)}
function scheduleFit(d){clearTimeout(V.timer);V.timer=setTimeout(function(){requestAnimationFrame(fitAll)},d==null?35:d)}
window.rhFitAllCardValues=fitAll;window.rhV42FitCards=fitAll;

function monthlyComp(){
  var a=(window.RH_PERIOD&&RH_PERIOD.active)||[];
  if(a.length===1&&!a[0]._periodConsolidated)return a[0];
  if(S.competencia&&!S.competencia._periodConsolidated)return S.competencia;
  return null;
}
function encRowsFrom(c){var e=c&&c.encargos||{};return[
  {key:'IRRF',label:'IRRF folha',base:n(e.base_irrf_mensal||c&&c.base_irrf),value:n(e.valor_irrf_folha||e.valor_irrf_mensal||e.valor_total_irrf||e.valor_irrf)},
  {key:'INSS',label:'INSS total',base:n(e.base_total_inss||c&&c.base_inss),value:n(e.total_inss)},
  {key:'PIS',label:'PIS sobre folha',base:n(e.base_pis||c&&c.base_inss),value:n(e.valor_pis)},
  {key:'FGTS',label:'FGTS',base:n(e.base_fgts||c&&c.base_fgts),value:n(e.valor_fgts||c&&c.valor_fgts)}
]}
function forecastPane(){return document.querySelector('[data-plan-pane="folha"]')}
function forecastTotals(){
  var pane=forecastPane(),table=pane&&pane.querySelector('table'),rows=table?Array.from(table.querySelectorAll('tbody tr')):[],sum={prov:0,disc:0,liq:0,enc:0,ben:0,custo:0};
  rows.forEach(function(tr){var c=tr.cells||[];if(c.length>=8){sum.prov+=parseMoney(c[2].textContent);sum.disc+=parseMoney(c[3].textContent);sum.liq+=parseMoney(c[4].textContent);sum.enc+=parseMoney(c[5].textContent);sum.ben+=parseMoney(c[6].textContent);sum.custo+=parseMoney(c[7].textContent)}});return sum;
}
function latestActual(){var a=(window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(S.competencias||[])).filter(function(c){return c&&!c._periodConsolidated&&String(c.competencia||'').slice(5,7)!=='00'}).slice().sort(function(x,y){return String(x.competencia||'').localeCompare(String(y.competencia||''))});return a[a.length-1]||monthlyComp()}
function nextGuideRows(){
  var base=latestActual(),f=forecastTotals(),real=encRowsFrom(base),factor=base&&n(base.proventos)>0?f.prov/n(base.proventos):1;
  return real.map(function(r){return{key:r.key,label:r.label,base:r.base*factor,value:r.value*factor,estimated:true}})
}
function guideRows(){return V.mode==='proxima'?nextGuideRows():encRowsFrom(monthlyComp())}
function guideLabel(){if(V.mode==='proxima')return 'Próxima folha · estimativa';var c=monthlyComp();return c?'Competência '+comp(c.competencia):'Selecione um único mês'}
function guideCards(){
  if(V.mode==='mes'&&!monthlyComp())return '<div class="rh42-guide-empty">Selecione um único mês no filtro global para visualizar e gerar as guias daquela competência.</div>';
  return guideRows().map(function(r){return '<div class="rh40-guide-card"><span>'+esc(r.label)+'</span><strong>'+esc(money(r.value))+'</strong><small>Base '+esc(money(r.base))+(r.estimated?' · estimativa':'')+'</small><button type="button" class="button ghost export-only" data-rh42-guide="'+r.key+'">Gerar PDF</button></div>'}).join('')
}
async function ensurePdf(){if(!LIBRARIES.jspdf)LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};if(!LIBRARIES.autotable)LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)}};await loadLibrary('jspdf');await loadLibrary('autotable')}
async function ensureExcel(){if(!LIBRARIES.exceljs)LIBRARIES.exceljs={url:'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',ready:function(){return !!window.ExcelJS}};await loadLibrary('exceljs')}
function dl(blob,name){var a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},1000)}
function rgb(hex){hex=String(hex).replace('#','');return[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]}
function pdfHead(doc,title,sub){var w=doc.internal.pageSize.getWidth();doc.setFillColor.apply(doc,rgb('#071a2c'));doc.rect(0,0,w,31,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,12,13);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text(sub||'',12,20);doc.setTextColor.apply(doc,rgb('#f2c94c'));doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('LIGA NACIONAL DE BASQUETE · RH & FOLHA',12,26)}
async function exportGuide(kind){
  if(!guard())return;if(V.mode==='mes'&&!monthlyComp())throw new Error('Selecione um único mês no filtro global.');await ensurePdf();var r=guideRows().find(function(x){return x.key===kind});if(!r)throw new Error('Encargo não encontrado.');var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),label=guideLabel();pdfHead(doc,'Guia Gerencial — '+r.label,label);doc.setFillColor.apply(doc,rgb('#eef4f8'));doc.roundedRect(12,40,186,43,4,4,'F');doc.setTextColor.apply(doc,rgb('#071a2c'));doc.setFont('helvetica','bold');doc.setFontSize(23);doc.text(money(r.value),18,61);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text('Base: '+money(r.base),18,75);doc.autoTable({startY:94,head:[['Campo','Informação']],body:[['Referência',label],['Obrigação',r.label],['Base',money(r.base)],['Valor',money(r.value)],['Natureza',r.estimated?'Estimativa gerencial sobre a próxima folha':'Valor da competência mensal selecionada'],['Observação',r.estimated?'Estimativa proporcional baseada na última competência fechada e no total projetado da próxima folha.':'IRRF da folha prioriza o código de folha e exclui RPA quando essa separação está disponível.']],theme:'grid',styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:rgb('#0d2b42'),textColor:[255,255,255]}});doc.save('LNB_Guia_'+kind+'_'+(V.mode==='proxima'?'Proxima_Folha':String(monthlyComp().competencia||'').slice(0,7))+'.pdf')
}
async function exportGuidePack(){for(var i=0;i<['IRRF','INSS','PIS','FGTS'].length;i++)await exportGuide(['IRRF','INSS','PIS','FGTS'][i])}

function installGuideMode(){
  var panel=E('rh40-guides-panel');if(!panel)return;var head=panel.querySelector('.panel-head');if(head&&!E('rh42-guide-mode')){var wrap=document.createElement('div');wrap.className='rh42-guide-mode';wrap.innerHTML='<label>Referência das guias<select id="rh42-guide-mode"><option value="mes">Mês selecionado</option><option value="proxima">Próxima folha (estimativa)</option></select></label><span id="rh42-guide-ref"></span>';head.appendChild(wrap)}
  var sel=E('rh42-guide-mode');if(sel){sel.value=V.mode;sel.onchange=function(){V.mode=this.value;syncGuides()}}
  var old=E('rh40-guides-pack');if(old){old.onclick=function(){exportGuidePack().catch(function(e){try{toast(e.message,true)}catch(x){}})}}
  syncGuides();
}
function syncGuides(){var grid=E('rh40-guide-grid');if(grid)grid.innerHTML=guideCards();var ref=E('rh42-guide-ref');if(ref)ref.textContent=guideLabel();scheduleFit(20)}

function tablePack(pane){
  if(!pane)return null;var tables=Array.from(pane.querySelectorAll('table')).filter(function(t){return t.tBodies&&t.tBodies[0]&&t.tBodies[0].rows.length});if(!tables.length)return null;tables.sort(function(a,b){return b.tBodies[0].rows.length-a.tBodies[0].rows.length});var t=tables[0],head=t.tHead&&t.tHead.rows.length?t.tHead.rows[t.tHead.rows.length-1]:null,headers=head?Array.from(head.cells).map(function(c){return String(c.textContent||'').trim()}):[],rows=Array.from(t.tBodies[0].rows).map(function(tr){return Array.from(tr.cells).map(function(td){return String(td.textContent||'').replace(/\s+/g,' ').trim()})});return{headers:headers,rows:rows}}
async function exportForecastPdf(){if(!guard())return;var p=tablePack(forecastPane());if(!p)throw new Error('A projeção da próxima folha ainda não está disponível.');await ensurePdf();var doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});pdfHead(doc,'Próxima Folha — Relatório Executivo','Projeção gerencial do quadro ativo');doc.autoTable({startY:38,head:[p.headers],body:p.rows,theme:'striped',styles:{fontSize:6.8,cellPadding:2},headStyles:{fillColor:rgb('#0d2b42'),textColor:[255,255,255]}});doc.save('LNB_Proxima_Folha_Executiva.pdf')}
async function exportForecastExcel(){if(!guard())return;var p=tablePack(forecastPane());if(!p)throw new Error('A projeção da próxima folha ainda não está disponível.');await ensureExcel();var wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Próxima Folha');ws.views=[{showGridLines:false,state:'frozen',ySplit:4}];ws.mergeCells(1,1,1,Math.max(1,p.headers.length));var c=ws.getCell(1,1);c.value='PRÓXIMA FOLHA — RELATÓRIO EXECUTIVO';c.font={bold:true,size:18,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF071A2C'}};var hr=ws.addRow([]);hr=ws.addRow([]);hr=ws.addRow(p.headers);hr.eachCell(function(x){x.font={bold:true,color:{argb:'FFFFFFFF'}};x.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0D2B42'}}});p.rows.forEach(function(r,i){var row=ws.addRow(r);if(i%2)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF5F8FA'}}});ws.columns.forEach(function(col){var m=10;col.eachCell({includeEmpty:true},function(x){m=Math.max(m,String(x.value==null?'':x.value).length+2)});col.width=Math.min(38,m)});var buf=await wb.xlsx.writeBuffer();dl(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'LNB_Proxima_Folha_Executiva.xlsx')}

function activeKind(){var pane=Array.from(document.querySelectorAll('#page-planejamento [data-plan-pane]')).find(function(x){return !x.hidden&&getComputedStyle(x).display!=='none'});return pane&&pane.dataset.planPane||'13'}
function installPlanningToolbar(){
  var page=E('page-planejamento');if(!page)return;var bar=E('rh42-plan-export');if(!bar){bar=document.createElement('div');bar.id='rh42-plan-export';bar.className='rh42-plan-export';bar.innerHTML='<div><b id="rh42-plan-title">Exportar planejamento</b><small id="rh42-plan-sub">PDF e Excel executivo</small></div><div class="rh42-plan-actions"><button class="button primary export-only" id="rh42-plan-pdf" type="button">PDF Executivo</button><button class="button secondary export-only" id="rh42-plan-xlsx" type="button">Excel Executivo</button></div>';var head=page.querySelector('.page-head');if(head)head.insertAdjacentElement('afterend',bar);else page.insertBefore(bar,page.firstChild)}
  syncPlanningToolbar();
  E('rh42-plan-pdf').onclick=function(){runPlanExport('pdf')};E('rh42-plan-xlsx').onclick=function(){runPlanExport('xlsx')};
}
function syncPlanningToolbar(){var k=activeKind(),map={'13':'13º salário','ferias':'Férias','folha':'Próxima folha','rescisao':'Rescisão'},t=E('rh42-plan-title');if(t)t.textContent='Exportar '+(map[k]||'planejamento');var s=E('rh42-plan-sub');if(s)s.textContent=k==='folha'?'Projeção gerencial do quadro ativo':'PDF e Excel executivo'}
function runPlanExport(type){var k=activeKind(),fn=null;if(k==='13')fn=type==='pdf'?window.rhV41ExportProvisionPdf&&function(){return window.rhV41ExportProvisionPdf('13')}:window.rhV41ExportProvisionExcel&&function(){return window.rhV41ExportProvisionExcel('13')};else if(k==='ferias')fn=type==='pdf'?window.rhV41ExportProvisionPdf&&function(){return window.rhV41ExportProvisionPdf('ferias')}:window.rhV41ExportProvisionExcel&&function(){return window.rhV41ExportProvisionExcel('ferias')};else if(k==='folha')fn=type==='pdf'?exportForecastPdf:exportForecastExcel;else if(k==='rescisao')fn=type==='pdf'?window.rhV41ExportTerminationPdf:window.rhV41ExportTerminationExcel;if(!fn){try{toast('Exportação indisponível para esta opção.',true)}catch(e){}return}Promise.resolve().then(fn).catch(function(e){try{toast(e.message||String(e),true)}catch(x){}})}

function enhanceTermination(){
  var pane=document.querySelector('[data-plan-pane="rescisao"]'),term=pane&&pane.querySelector('.rh26-term'),kpis=pane&&pane.querySelector('.rh26-kpis');if(!term||!kpis)return;
  var cols=term.children;if(cols[0]&&cols[0].querySelector('h3'))cols[0].querySelector('h3').textContent='Proventos';if(cols[1]&&cols[1].querySelector('h3'))cols[1].querySelector('h3').textContent='Descontos';
  var cards=Array.from(kpis.querySelectorAll('.kpi')),gross=0,ded=0,liq=0;cards.forEach(function(c){var l=norm((c.querySelector('span')||{}).textContent),v=parseMoney((c.querySelector('strong')||{}).textContent);if(l.indexOf('total bruto')>=0)gross=v;else if(l.indexOf('dedu')>=0)ded=v;else if(l.indexOf('liquido')>=0)liq=v});
  if(cols[0]&&!cols[0].querySelector('.rh42-term-total'))cols[0].insertAdjacentHTML('beforeend','<div class="rh42-term-total"><span>Total de proventos</span><b>'+money(gross)+'</b></div>');
  if(cols[1]&&!cols[1].querySelector('.rh42-term-total'))cols[1].insertAdjacentHTML('beforeend','<div class="rh42-term-total"><span>Total de descontos</span><b>'+money(ded)+'</b></div>');
  var f=E('rh42-term-formula');if(!f){f=document.createElement('div');f.id='rh42-term-formula';f.className='rh42-term-formula';f.innerHTML='<b>Como chegamos ao líquido</b><span>'+money(gross)+' de proventos − '+money(ded)+' de descontos = <strong>'+money(liq)+'</strong></span>';kpis.insertAdjacentElement('afterend',f)}else f.innerHTML='<b>Como chegamos ao líquido</b><span>'+money(gross)+' de proventos − '+money(ded)+' de descontos = <strong>'+money(liq)+'</strong></span>';
  var rem=pane.querySelector('.rh34-rem');if(rem&&term.previousElementSibling!==kpis&&term!==kpis.nextElementSibling)kpis.insertAdjacentElement('afterend',term);
}

function styles(){if(E('_rh42'))return;var s=document.createElement('style');s.id='_rh42';s.textContent='.rh42-plan-export{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;margin:-4px 0 14px;border:1px solid var(--line-soft);border-radius:13px;background:var(--surface-2)}.rh42-plan-export>div:first-child{display:flex;flex-direction:column}.rh42-plan-export small{color:var(--muted)}.rh42-plan-actions{display:flex;gap:8px;flex-wrap:wrap}.rh42-guide-mode{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-left:auto}.rh42-guide-mode label{display:flex;flex-direction:column;gap:4px;color:var(--muted);font-size:.68rem;font-weight:800;text-transform:uppercase}.rh42-guide-mode select{padding:8px 30px 8px 10px;border:1px solid var(--line-soft);border-radius:9px;background:var(--surface-2);color:var(--text)}#rh42-guide-ref{font-size:.76rem;color:var(--muted);font-weight:800}.rh42-guide-empty{grid-column:1/-1;padding:18px;border:1px dashed var(--line-soft);border-radius:12px;color:var(--muted);text-align:center}.rh42-term-formula{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:13px 16px;margin:12px 0;border:1px solid color-mix(in srgb,var(--gold) 35%,var(--line-soft));border-radius:12px;background:color-mix(in srgb,var(--gold) 7%,var(--surface-1))}.rh42-term-formula span{color:var(--muted)}.rh42-term-formula strong{color:var(--gold);font-size:1.08rem}.rh42-term-total{display:flex!important;justify-content:space-between!important;gap:10px;padding-top:10px!important;margin-top:8px!important;border-top:1px solid var(--line-soft)!important;font-weight:900}.rh26-term{margin-top:12px!important}.kpi strong,.rh40-guide-card strong{overflow:hidden!important;text-overflow:clip!important;max-width:100%!important;min-width:0!important}@media(max-width:800px){.rh42-plan-export,.rh42-term-formula{align-items:flex-start;flex-direction:column}.rh42-plan-actions{width:100%}.rh42-plan-actions .button{flex:1}.rh42-guide-mode{margin-left:0}}';document.head.appendChild(s)}

function refresh(){styles();installGuideMode();installPlanningToolbar();enhanceTermination();scheduleFit(10)}
function wrapRender(){if(typeof window.renderAll==='function'&&!window.renderAll._rh42){var base=window.renderAll;var w=function(){var r=base.apply(this,arguments);setTimeout(refresh,0);setTimeout(refresh,80);setTimeout(refresh,220);return r};w._rh42=true;window.renderAll=w}}
function init(){styles();wrapRender();refresh();setTimeout(refresh,500);setTimeout(refresh,1200);document.addEventListener('click',function(e){var g=e.target&&e.target.closest&&e.target.closest('[data-rh42-guide]');if(g){e.preventDefault();exportGuide(g.dataset.rh42Guide).catch(function(err){try{toast(err.message||String(err),true)}catch(x){}});return}if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab],.nav-item')){setTimeout(refresh,60);setTimeout(refresh,180)}} ,true);['rh-period-year','rh-period-month'].forEach(function(id){var x=E(id);if(x)x.addEventListener('change',function(){setTimeout(refresh,160)})});window.addEventListener('resize',function(){scheduleFit(60)});if(window.ResizeObserver){V.resize=new ResizeObserver(function(){scheduleFit(50)});document.querySelectorAll('.kpi,.rh40-guide-card').forEach(function(x){try{V.resize.observe(x)}catch(e){}})}}
window.rhV42ExportForecastPdf=exportForecastPdf;window.rhV42ExportForecastExcel=exportForecastExcel;window.rhV42ExportGuide=exportGuide;window.RH_REPORT_FIXES_V42=true;
init();
})();/* RH v43 — correcoes: aviso previo, cards, PDF rescisao agrupado, Joel duplicado */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}
function norm(v){return String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function rgb(hex){hex=String(hex).replace('#','');return[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]}
function dl(blob,name){var a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},1000)}
function parseMoney(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function allowed(){try{return !!(canAdmin()||can('exportar'))}catch(e){return false}}
function guard(){if(allowed())return true;try{toast('Seu perfil não possui permissão para exportar relatórios.',true)}catch(e){}return false}

/* ─── BUG 1: aviso previo – filtro de selects destruindo opcoes de tipo/aviso ─── */
/* filterTerminationSelect (v38) removia opcoes cujo value nao estava no set de IDs
   ativos — mas os selects rh26-type e rh26-notice tambem ficam dentro do mesmo <label>
   "Colaborador" no form e tinham suas opcoes ('empregador','indenizado',...) removidas.
   Correcao: so remover opcoes cujo value parece um UUID / ID de colaborador. */
function isCollaboratorId(val){
  return Boolean(val) && val.length >= 20 && /^[0-9a-f\-]{20,}$/i.test(val)
}
function safeFilterSelect(sel,activeSet){
  if(!sel)return;
  var selected=sel.value;
  Array.from(sel.options).forEach(function(o){
    if(isCollaboratorId(o.value) && !activeSet.has(String(o.value)))o.remove()
  });
  if(selected && isCollaboratorId(selected) && !activeSet.has(String(selected)) && sel.options.length)sel.selectedIndex=0
}
function patchFilterTermination(){
  /* sobrescreve a logica da funcao interna de v38 */
  var ids=typeof window.rhRosterActiveIds==='function'?window.rhRosterActiveIds():(window.RH_CURRENT_ACTIVE_IDS||new Set());
  if(!ids||!ids.size)return;
  ['rh26-person','rh-res-person'].forEach(function(id){safeFilterSelect(E(id),ids)});
  document.querySelectorAll('[data-plan-pane="rescisao"] select').forEach(function(sel){
    var labelText=String(((sel.closest('label')||{}).textContent)||'');
    if(!/colaborador/i.test(labelText))return;
    safeFilterSelect(sel,ids);
  });
}
/* Instala novo filterTerminationSelect seguro e substitui chamadas do v38 */
window.rhV43SafeFilterTermination=patchFilterTermination;

/* Tambem reforcar no calc: ler tipo com deteccao por texto para robustez */
function readType(){
  var s=E('rh26-type');if(!s)return 'pedido';
  var val=String(s.value||'').toLowerCase();
  if(val)return val;
  var txt=norm((s.selectedOptions&&s.selectedOptions[0]&&s.selectedOptions[0].textContent)||'');
  if(/empregador|dispens|sem.*causa/.test(txt))return 'empregador';
  return 'pedido'
}
function readNotice(){
  var s=E('rh26-notice');if(!s)return 'na';
  var val=String(s.value||'').toLowerCase();
  if(val)return val;
  var txt=norm((s.selectedOptions&&s.selectedOptions[0]&&s.selectedOptions[0].textContent)||'');
  if(/indenizado/.test(txt))return 'indenizado';
  if(/desconto|trabalhado/.test(txt))return 'desconto';
  return 'na'
}

/* Intercepta o botao Calcular para validar/logar o aviso */
function installAvisoGuard(){
  var btn=E('rh26-calc');
  if(!btn||btn.dataset.v43)return;
  btn.dataset.v43='1';
  btn.addEventListener('click',function(){
    setTimeout(function(){
      var x=window.rhV31TerminationResult;
      if(!x)return;
      var type=readType(),notice=readNotice();
      /* se o tipo indica empregador mas o aviso saiu 0, recalcular e corrigir */
      if((type==='empregador'||type.indexOf('empregador')>=0)&&notice==='indenizado'&&x.aviso===0){
        var salary=n(x.salary),nd=n(x.noticeDays)||30;
        x.aviso=r2(salary/30*nd);
        x.av13=r2(salary/12);
        x.avfut=r2(salary/12);
        x.bruto=r2(n(x.saldo)+n(x.v13)+n(x.vf)+n(x.ven)+n(x.ter)+x.aviso+x.av13+x.avfut+n(x.cct)+n(x.cred));
        x.fgav=r2(x.aviso*.08);
        x.fgTotal=r2(n(x.fgm)+n(x.fg13)+x.fgav);
        x.multa=r2(n(x.fg)*.4);
        x.ded=r2(n(x.inss)+n(x.inss13)+n(x.irrf)+n(x.irrf13)+n(x.operational)+n(x.noticeDisc));
        x.liq=r2(x.bruto-x.ded);
        x.custo=r2(x.bruto+x.fgTotal+x.multa);
        window.rhV31TerminationResult=x;
        /* patchar os cards */
        var box=E('rh26-result');if(!box)return;
        ['Total bruto','Deduções','Líquido','Custo empregador'].forEach(function(label){
          Array.from(box.querySelectorAll('.kpi')).forEach(function(k){
            var s=k.querySelector('span'),b=k.querySelector('strong');
            if(s&&b&&String(s.textContent||'').trim()===label){
              var vals={'Total bruto':x.bruto,'Deduções':x.ded,'Líquido':x.liq,'Custo empregador':x.custo};
              b.textContent=money(vals[label]||0)
            }
          })
        });
        /* inserir linha do aviso se nao existe */
        var blocks=box.querySelectorAll('.rh26-term .rh-res-lines');
        if(blocks[0]){
          var hasAviso=Array.from(blocks[0].children).some(function(row){
            return norm((row.querySelector('span')||{}).textContent).indexOf('aviso')>=0
          });
          if(!hasAviso){
            var div=document.createElement('div');
            div.innerHTML='<span>Aviso-prévio indenizado '+n(x.noticeDays||30)+' dias</span><b>'+money(x.aviso)+'</b>';
            blocks[0].appendChild(div);
            var div2=document.createElement('div');div2.innerHTML='<span>13º sobre aviso</span><b>'+money(x.av13)+'</b>';blocks[0].appendChild(div2);
            var div3=document.createElement('div');div3.innerHTML='<span>Férias sobre aviso</span><b>'+money(x.avfut)+'</b>';blocks[0].appendChild(div3)
          }
        }
        /* atualizar formula v42 se existir */
        var f=E('rh42-term-formula');
        if(f)f.innerHTML='<b>Como chegamos ao líquido</b><span>'+money(x.bruto)+' de proventos − '+money(x.ded)+' de descontos = <strong>'+money(x.liq)+'</strong></span>';
        try{toast('Aviso indenizado corrigido: '+money(x.aviso),false)}catch(e){}
      }
    },300)
  },false)
}

/* ─── BUG 2: cards – melhorar fit com delays maiores e dedup de chamadas ─── */
var FIT_SEL='.kpi strong,.rh40-guide-card strong,.rh41-report-card strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#charges-kpis strong,#payroll-kpis strong,#movement-kpis strong,#custo-real-kpis strong,#rh-dossier-kpis strong,#rh-insight-kpis strong';
var _fitTimer=0;
function fitOneV43(el){
  if(!el||!el.isConnected||!String(el.textContent||'').trim())return;
  var box=el.closest('.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card')||el.parentElement;
  if(!box)return;
  /* se a caixa nao tem largura ainda (escondida), tentar via parentElement */
  var bw=box.clientWidth;
  if(bw===0){var pb=box.parentElement;bw=pb?pb.clientWidth:0}
  if(bw===0)return;
  var bcs=getComputedStyle(box),av=bw-(parseFloat(bcs.paddingLeft)||0)-(parseFloat(bcs.paddingRight)||0)-8;
  if(av<32)return;
  var isGuide=el.closest('.rh40-guide-card'),isReport=el.closest('.rh41-report-card');
  var max=isGuide?24:isReport?26:36,min=9,size=max;
  el.style.setProperty('font-size',size+'px','important');
  el.style.setProperty('white-space','nowrap','important');
  el.style.setProperty('max-width','100%','important');
  el.style.setProperty('display','block','important');
  el.style.setProperty('overflow','hidden','important');
  el.style.setProperty('text-overflow','ellipsis','important');
  for(var i=0;i<10;i++){
    var r=document.createRange();
    try{r.selectNodeContents(el)}catch(e){break}
    var w=r.getBoundingClientRect().width;
    if(w<=av||size<=min)break;
    size=Math.max(min,Math.floor(size*(av/w)*.95*10)/10);
    el.style.setProperty('font-size',size+'px','important')
  }
  el.style.setProperty('letter-spacing',size<16?'-.07em':size<22?'-.04em':'-.015em','important')
}
function fitAllV43(){
  Array.prototype.forEach.call(document.querySelectorAll(FIT_SEL),fitOneV43)
}
function scheduleFitV43(d){
  clearTimeout(_fitTimer);
  _fitTimer=setTimeout(function(){requestAnimationFrame(fitAllV43)},d==null?40:d)
}
/* sobrescreve as funcoes globais de fit */
window.rhFitAllCardValues=fitAllV43;
window.rhV42FitCards=fitAllV43;
window.rhV43FitAll=fitAllV43;

/* ─── BUG 3: PDF rescisao agrupado por PROVENTOS / DESCONTOS / ENCARGOS / LIQUIDO / CUSTO ─── */
var NAVY='#071a2c',NAVY2='#0d2b42',GOLD='#f2c94c';
async function ensurePdfV43(){
  if(!window.LIBRARIES)return;
  if(!window.LIBRARIES.jspdf)window.LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};
  if(!window.LIBRARIES.autotable)window.LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)}};
  if(typeof loadLibrary==='function'){await loadLibrary('jspdf');await loadLibrary('autotable')}
}
function pdfHeadV43(doc,title,sub){
  var w=doc.internal.pageSize.getWidth();
  doc.setFillColor.apply(doc,rgb(NAVY));doc.rect(0,0,w,31,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,12,13);
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text(sub||'',12,20);
  doc.setTextColor.apply(doc,rgb(GOLD));doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('LIGA NACIONAL DE BASQUETE · RH & FOLHA',12,26)
}
function pdfFootV43(doc,nome){
  for(var i=1;i<=doc.internal.getNumberOfPages();i++){
    doc.setPage(i);var w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
    doc.setTextColor.apply(doc,rgb('#8899aa'));doc.setFontSize(7);doc.setFont('helvetica','normal');
    doc.text('Uso restrito — RH & Folha | '+nome,12,h-7);doc.text('Página '+i+' de '+doc.internal.getNumberOfPages(),w-12,h-7,{align:'right'})
  }
}
function sectionTable(doc,y,title,rows,subtotal,isMinus){
  var w=doc.internal.pageSize.getWidth();
  doc.setFillColor.apply(doc,rgb(NAVY2));doc.rect(12,y,w-24,8,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(9);
  doc.text(title,14,y+5.5);
  doc.autoTable({
    startY:y+8,
    body:rows,
    theme:'striped',
    styles:{font:'helvetica',fontSize:8.5,cellPadding:[2,3,2,3],textColor:rgb(NAVY)},
    alternateRowStyles:{fillColor:[247,250,253]},
    columnStyles:{1:{halign:'right',fontStyle:'bold'}},
    margin:{left:12,right:12}
  });
  var fy=doc.lastAutoTable.finalY;
  /* linha de total da secao */
  doc.setFillColor.apply(doc,rgb('#f0f4f8'));doc.rect(12,fy,w-24,9,'F');
  doc.setTextColor.apply(doc,rgb(NAVY));doc.setFont('helvetica','bold');doc.setFontSize(8.5);
  doc.text(isMinus?'(−) Total de descontos':'Subtotal',14,fy+6);
  doc.text(money(subtotal),w-12,fy+6,{align:'right'});
  return fy+9+6
}

async function exportTerminationPdfV43(){
  if(!guard())return;
  var x=window.rhV31TerminationResult;
  if(!x||!x.p)throw new Error('Gere o relatório analítico da rescisão antes de exportar.');
  await ensurePdfV43();
  if(!window.jspdf||!window.jspdf.jsPDF)throw new Error('Biblioteca de PDF não carregou. Tente novamente.');
  var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  var w=doc.internal.pageSize.getWidth(),nome=String(x.p.nome||'Colaborador');
  var tipoLabel=n(x.type||'').indexOf('empregador')>=0?'Dispensa sem justa causa':'Pedido de demissão';
  var dt=x.date instanceof Date?x.date:new Date();
  var dtBR=String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0')+'/'+dt.getFullYear();
  pdfHeadV43(doc,'Rescisão — Relatório Executivo',nome+' | '+tipoLabel+' | '+dtBR);

  /* ── KPIs resumo ── */
  var y=38;
  var kpiW=(w-24)/4,kpiH=22;
  [['Proventos',x.bruto,NAVY2],['Descontos',x.ded,'#c0392b'],['Líquido',x.liq,'#0d6e4e'],['Custo total',x.custo,NAVY]].forEach(function(k,i){
    var kx=12+i*kpiW;
    doc.setFillColor.apply(doc,rgb(k[2]));doc.roundedRect(kx,y,kpiW-3,kpiH,2,2,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.text(k[0],kx+3,y+4);
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(money(k[1]),kx+kpiW/2-1.5,y+14,{align:'center'})
  });
  y+=kpiH+6;

  /* ── PROVENTOS ── */
  var provRows=[];
  function addProv(label,val){if(Math.abs(n(val))>.004)provRows.push([label,money(val)])}
  addProv('Saldo de salário ('+Math.min(30,dt.getDate())+' dias)',x.saldo);
  addProv('13º proporcional '+n(x.a13)+'/12',x.v13);
  addProv('Férias proporcionais '+n(x.avf)+'/12',x.vf);
  addProv('Férias vencidas',x.ven);
  addProv('1/3 constitucional',x.ter);
  if(n(x.aviso)>.004){
    addProv('Aviso-prévio indenizado '+n(x.noticeDays||30)+' dias',x.aviso);
    addProv('13º sobre aviso prévio',x.av13);
    addProv('Férias sobre aviso prévio',x.avfut)
  }
  addProv('Indenização CCT',x.cct);addProv('Outros créditos',x.cred);
  y=sectionTable(doc,y,'PROVENTOS',provRows,x.bruto,false);

  /* ── DESCONTOS ── */
  var dedRows=[];
  function addDed(label,val){if(Math.abs(n(val))>.004)dedRows.push([label,money(val)])}
  var taxLabel=x.hist?'histórico importado':'estimado';
  addDed('INSS sobre rescisão ('+taxLabel+')',x.inss);
  addDed('INSS sobre 13º ('+taxLabel+')',x.inss13);
  addDed('IRRF sobre rescisão ('+taxLabel+')',x.irrf);
  addDed('IRRF sobre 13º ('+taxLabel+')',x.irrf13);
  addDed('Descontos operacionais / benefícios',x.operational);
  addDed('Aviso descontado (pedido)',x.noticeDisc);
  y=sectionTable(doc,y,'DESCONTOS',dedRows,x.ded,true);

  /* ── VALOR LÍQUIDO ── */
  doc.setFillColor.apply(doc,rgb('#0d6e4e'));doc.rect(12,y,w-24,14,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(10);
  doc.text('VALOR LÍQUIDO',14,y+5.5);
  doc.text(money(x.liq),w-12,y+5.5,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);
  doc.text(money(x.bruto)+' proventos  −  '+money(x.ded)+' descontos',14,y+11);
  y+=14+8;

  /* ── ENCARGOS / FGTS ── */
  var encRows=[];
  function addEnc(label,val){if(Math.abs(n(val))>.004)encRows.push([label,money(val)])}
  addEnc('Saldo FGTS (informado)',x.fg);
  addEnc('FGTS sobre saldo mensal',x.fgm);
  addEnc('FGTS sobre 13º',x.fg13);
  addEnc('FGTS sobre aviso prévio',x.fgav);
  if(n(x.multa)>.004)addEnc('Multa de 40% do FGTS (ônus do empregador)',x.multa);
  if(encRows.length){
    var encTotal=n(x.fgm)+n(x.fg13)+n(x.fgav)+n(x.multa);
    y=sectionTable(doc,y,'ENCARGOS — FGTS E MULTA (fora do líquido do colaborador)',encRows,encTotal,false)
  }

  /* ── CUSTO TOTAL ESTIMADO ── */
  doc.setFillColor.apply(doc,rgb(NAVY));doc.rect(12,y,w-24,16,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(10);
  doc.text('CUSTO TOTAL ESTIMADO PARA O EMPREGADOR',14,y+6);
  doc.text(money(x.custo),w-12,y+6,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);
  doc.text(money(x.bruto)+' proventos  +  '+money(n(x.fgTotal))+'FGTS  +  '+money(n(x.multa))+' multa',14,y+12);
  y+=16+6;

  /* ── NOTA DE RODAPÉ ── */
  doc.setTextColor.apply(doc,rgb('#8899aa'));doc.setFont('helvetica','normal');doc.setFontSize(7);
  var nota=x.hist?'Impostos e descontos com base em histórico importado da competência de desligamento.':'Estimativa gerencial: INSS/IRRF calculados pelas tabelas da competência. Benefícios, médias e outras deduções devem ser informados antes do cálculo oficial.';
  doc.text(nota,12,y,{maxWidth:w-24});
  pdfFootV43(doc,nome);

  var slug=nome.replace(/[^A-Za-z0-9]+/g,'_');
  doc.save('LNB_Rescisao_'+slug+'_'+dtBR.replace(/\//g,'-')+'.pdf')
}
window.rhV43ExportTerminationPdf=exportTerminationPdfV43;
/* Substituir referências do v41 e v42 */
window.rhV41ExportTerminationPdf=exportTerminationPdfV43;

/* ─── BUG 4: Joel duas vezes – deduplicar filterForecast ─── */
function deduplicateForecast(){
  var pane=document.querySelector('[data-plan-pane="folha"]');if(!pane)return;
  var table=pane.querySelector('table');if(!table)return;
  var seen=new Set();
  Array.from(table.querySelectorAll('tbody tr')).forEach(function(tr){
    var id=String(tr.dataset.id||tr.dataset.colaboradorId||'');
    if(!id){
      /* sem id: tentar pelo nome */
      var nm=String((tr.cells&&tr.cells[0]&&tr.cells[0].textContent)||'').replace(/\s+/g,' ').trim();
      if(!nm)return;
      if(seen.has('name:'+nm))tr.remove();else seen.add('name:'+nm);
    }else{
      if(seen.has(id))tr.remove();else seen.add(id)
    }
  })
}
window.rhV43DeduplicateForecast=deduplicateForecast;

/* Reaplica filterForecast com dedup toda vez que enforceNow rodar */
var _origEnforceNow=null;
function patchEnforceNow(){
  if(typeof window.rhV38EnforcePlanningUI==='function'&&!window.rhV38EnforcePlanningUI._v43){
    var origTrigger=window.rhV38EnforcePlanningUI;
    window.rhV38EnforcePlanningUI=function(){
      var result=origTrigger.apply(this,arguments);
      setTimeout(deduplicateForecast,120);
      return result
    };
    window.rhV38EnforcePlanningUI._v43=true
  }
}

/* ─── CSS: fallback overflow para cards, garantia de corte ─── */
function injectStyles(){
  if(E('_rh43'))return;
  var s=document.createElement('style');s.id='_rh43';
  s.textContent=[
    /* Cards: garantia de clip quando font fit nao roda a tempo */
    '.kpi strong,.rh40-guide-card strong,.rh41-report-card strong,.stat-card strong,.summary-card strong{',
    '  display:block!important;overflow:hidden!important;text-overflow:ellipsis!important;',
    '  white-space:nowrap!important;max-width:100%!important;min-width:0!important;',
    '  font-variant-numeric:tabular-nums!important}',
    /* Containers não deixam vazar */
    '.kpi,.rh40-guide-card,.rh41-report-card,.stat-card,.summary-card{min-width:0!important;overflow:hidden!important}'
  ].join('');
  document.head.appendChild(s)
}

/* ─── Inicialização ─── */
function init(){
  injectStyles();
  installAvisoGuard();
  patchEnforceNow();
  /* fit inicial com delays escalonados para garantir layout */
  [60,250,600,1200].forEach(function(ms){setTimeout(fitAllV43,ms)});
  /* dedup inicial */
  setTimeout(deduplicateForecast,400);
  /* refit em toda interacao de navegacao */
  document.addEventListener('click',function(e){
    if(!e.target||!e.target.closest)return;
    if(e.target.closest('[data-plan-tab],[data-go],.nav-item')){
      setTimeout(fitAllV43,80);setTimeout(fitAllV43,280)
    }
  },true);
  /* dedup ao abrir proxima folha */
  document.addEventListener('click',function(e){
    if(!e.target||!e.target.closest)return;
    var tab=e.target.closest('[data-plan-tab]');
    if(tab&&String(tab.dataset.planTab||'').indexOf('folha')>=0){
      setTimeout(deduplicateForecast,200);setTimeout(deduplicateForecast,600)
    }
  },true);
  /* wrapper do renderAll para refit e dedup */
  if(typeof window.renderAll==='function'&&!window.renderAll._rh43){
    var base=window.renderAll;
    window.renderAll=function(){
      var r=base.apply(this,arguments);
      setTimeout(fitAllV43,80);
      setTimeout(deduplicateForecast,150);
      return r
    };
    window.renderAll._rh43=true
  }
  /* reaplica filterTermination seguro em cada chamada do v38 */
  var _v38Enforce=window.rhV38EnforcePlanningUI;
  if(typeof _v38Enforce==='function'&&!_v38Enforce._v43safe){
    window.rhV38EnforcePlanningUI=function(){
      patchFilterTermination();
      var r=_v38Enforce.apply(this,arguments);
      setTimeout(deduplicateForecast,120);
      return r
    };
    window.rhV38EnforcePlanningUI._v43safe=true
  }
  /* ResizeObserver em cards novos */
  if(window.ResizeObserver){
    var ro=new ResizeObserver(function(){scheduleFitV43(50)});
    function observeCards(){document.querySelectorAll('.kpi,.rh40-guide-card,.rh41-report-card').forEach(function(el){try{ro.observe(el)}catch(e){}})}
    observeCards();setTimeout(observeCards,800)
  }
}
window.RH_CORRECOES_V43=true;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
/* RH & Folha — Release Candidate: auditoria e fechamento da competência */
function rhMoneyDiff(a,b){return Math.round(((Number(a)||0)-(Number(b)||0))*100)/100;}
function rhAuditStatus(v){v=String(v||'').toLowerCase();if(v==='processado')return'importado';if(v==='arquivado')return'fechado';return v||'importado';}
function rhAuditStatusLabel(v){return {importado:'Importado',conferido:'Conferido',conciliado:'Conciliado',fechado:'Fechado'}[rhAuditStatus(v)]||'Importado';}
function rhAuditNextStatus(v){return {importado:'conferido',conferido:'conciliado',conciliado:'fechado'}[rhAuditStatus(v)]||null;}
function rhAuditNextLabel(v){return {conferido:'Marcar como Conferido',conciliado:'Marcar como Conciliado',fechado:'Fechar competência'}[v]||'';}
function rhAuditCheck(id,label,expected,actual,opts){
  opts=opts||{};var numeric=opts.numeric!==false,diff=numeric?rhMoneyDiff(actual,expected):0,ok=numeric?Math.abs(diff)<=Number(opts.tolerance==null?.02:opts.tolerance):!!opts.ok;
  return {id:id,label:label,expected:expected,actual:actual,diff:diff,ok:ok,blocking:!!opts.blocking,severity:ok?'ok':(opts.blocking?'error':'warn'),note:opts.note||''};
}
function rhAuditChecks(){
  if(!S.competencia)return[];
  var c=S.competencia,e=c.encargos||{},r=c.resumo||{},rows=S.pessoas||[];
  var sums={proventos:0,descontos:0,liquido:0,baseFgts:0,fgts:0,baseIrrf:0,irrf:0};
  rows.forEach(function(p){sums.proventos+=Number(p.proventos)||0;sums.descontos+=Number(p.descontos)||0;sums.liquido+=Number(p.liquido)||0;sums.baseFgts+=Number(p.base_fgts)||0;sums.fgts+=Number(p.valor_fgts)||0;sums.baseIrrf+=Number(p.base_irrf)||0;sums.irrf+=Number(p.valor_irrf)||0;});
  var checks=[];
  checks.push(rhAuditCheck('proventos','Proventos — consolidado × colaboradores',c.proventos,sums.proventos,{blocking:true}));
  checks.push(rhAuditCheck('descontos','Descontos — consolidado × colaboradores',c.descontos,sums.descontos,{blocking:true}));
  checks.push(rhAuditCheck('liquido','Líquido — consolidado × colaboradores',c.liquido,sums.liquido,{blocking:true}));
  var expectedPeople=Number(r.pessoas)||rows.length;
  checks.push(rhAuditCheck('headcount','Pessoas na folha — resumo × composição',expectedPeople,rows.length,{numeric:false,ok:expectedPeople===rows.length,blocking:true,note:expectedPeople+' esperadas · '+rows.length+' encontradas'}));
  checks.push(rhAuditCheck('base_fgts','Base FGTS — oficial × composição',Number(e.base_fgts||c.base_fgts)||0,sums.baseFgts,{blocking:true}));
  checks.push(rhAuditCheck('fgts','FGTS — oficial × composição individual',Number(e.valor_fgts||c.valor_fgts)||0,sums.fgts,{blocking:true}));
  var pisOfficial=Number(e.valor_pis)||0,pisAllocated=0;rows.forEach(function(p){pisAllocated+=Number(rhPisForPerson(p))||0;});
  checks.push(rhAuditCheck('pis','PIS — total oficial × rateio individual',pisOfficial,pisAllocated,{blocking:pisOfficial>0,note:pisOfficial?'Rateio preserva o total oficial.':'Valor oficial de PIS não informado.'}));
  var baseTotal=Number(e.base_total_inss)||0,expectedPat=baseTotal*.20,expectedRat=Number(e.rat)||(baseTotal*.01),expectedTer=Number(e.terceiros)||(baseTotal*.058),actualPat=0;
  rows.forEach(function(p){rhEmployerCharges(p).itens.forEach(function(it){var k=cleanSearch(it[0]);if(k.indexOf('inss patronal')>=0||k==='rat'||k.indexOf('terceiros')>=0)actualPat+=Number(it[1])||0;});});
  checks.push(rhAuditCheck('patronais','INSS patronal + RAT + Terceiros',expectedPat+expectedRat+expectedTer,actualPat,{blocking:baseTotal>0,tolerance:.05,note:'Composição patronal da competência.'}));
  var irrfOfficial=Number(e.valor_irrf_folha||e.valor_irrf)||0;
  checks.push(rhAuditCheck('irrf','IRRF folha — oficial × colaboradores',irrfOfficial,sums.irrf,{blocking:irrfOfficial>0,tolerance:.02,note:'RPA permanece fora desta conferência.'}));
  var missingDept=rows.filter(function(p){return !String(p.departamento||'').trim();}).length;
  checks.push(rhAuditCheck('departamentos','Departamentos — cadastro completo',0,missingDept,{numeric:false,ok:missingDept===0,blocking:true,note:missingDept?missingDept+' colaborador(es) sem departamento.':'Todos os colaboradores possuem departamento.'}));
  var benRows=0,hasVr=false,benTotal=0;
  rows.forEach(function(p){var b=rhPersonBenefit(p);if(!b)return;var s=Number(b.seguro_vida)||0,m=Number(b.assistencia_medica||b.assist_medica)||0,vr=Number(b.vr_caixa)||0,vt=Number(b.vale_transporte)||0,t=s+m+vr+vt;if(t>0)benRows++;if(vr>0||b.vr_valor_disponivel)hasVr=true;benTotal+=t;});
  checks.push({id:'beneficios',label:'Benefícios — Gestão de Benefícios',expected:null,actual:benTotal,diff:0,ok:benRows>0,severity:benRows>0?(hasVr?'ok':'warn'):'warn',blocking:false,note:benRows?(benRows+' colaborador(es) com benefício integrado'+(hasVr?'.':'. VR/VA/Cesta ainda sem valor mensal persistido.')):'Nenhum benefício monetário integrado nesta competência.'});
  return checks;
}
function rhAuditBlockers(){return rhAuditChecks().filter(function(x){return x.blocking&&!x.ok;});}
function rhAuditFmt(v){return typeof v==='number'?fmt(v):esc(v==null?'—':v);}

function rhEnsureClosingUI(){
  var page=$('page-conciliacao');if(!page)return;
  var panel=page.querySelector('.panel');if(!panel)return;
  if(!$('rh-closing-panel')){
    var wrap=document.createElement('article');wrap.id='rh-closing-panel';wrap.className='panel rh-closing-panel';
    wrap.innerHTML='<div class="panel-head"><div><span class="panel-kicker">FECHAMENTO DA COMPETÊNCIA</span><h2>Fluxo de conferência</h2></div><span class="status" id="rh-closing-status">—</span></div><div class="rh-closing-flow" id="rh-closing-flow"></div><div class="rh-closing-summary" id="rh-closing-summary"></div><div class="rh-closing-actions"><button class="button primary admin-only" id="rh-closing-advance" type="button"></button><small id="rh-closing-help"></small></div>';
    panel.parentNode.insertBefore(wrap,panel);
  }
  if(!$('_rh_closing_styles')){var st=document.createElement('style');st.id='_rh_closing_styles';st.textContent='.rh-closing-panel{margin-bottom:18px}.rh-closing-flow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0 16px}.rh-flow-step{padding:10px 12px;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2);color:var(--muted);font-size:.76rem;font-weight:800;text-align:center}.rh-flow-step.done{border-color:rgba(31,196,141,.42);color:var(--emerald)}.rh-flow-step.current{outline:2px solid var(--gold);color:var(--text)}.rh-closing-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.rh-close-stat{padding:12px;border:1px solid var(--line-soft);border-radius:12px}.rh-close-stat span{display:block;color:var(--muted);font-size:.7rem;text-transform:uppercase;font-weight:800}.rh-close-stat strong{display:block;margin-top:4px;font-size:1.05rem}.rh-closing-actions{display:flex;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap}.rh-closing-actions small{color:var(--muted)}.reconciliation-item.rh-warn .check{color:var(--gold)}.reconciliation-item.rh-error .check{color:var(--red)}.reconciliation-item .rh-audit-values{margin-top:3px;color:var(--muted);font-size:.72rem}.reconciliation-item .rh-audit-values b{color:var(--text)}@media(max-width:760px){.rh-closing-flow{grid-template-columns:repeat(2,1fr)}.rh-closing-summary{grid-template-columns:1fr}}';document.head.appendChild(st);}
}
function rhRenderClosing(){
  rhEnsureClosingUI();if(!S.competencia)return;
  var status=rhAuditStatus(S.competencia.status),steps=['importado','conferido','conciliado','fechado'],idx=steps.indexOf(status),checks=rhAuditChecks(),blockers=checks.filter(function(x){return x.blocking&&!x.ok;}),warns=checks.filter(function(x){return x.severity==='warn';}),next=rhAuditNextStatus(status);
  $('rh-closing-status').textContent=rhAuditStatusLabel(status);$('rh-closing-status').className='status '+(status==='fechado'?'success':'');
  $('rh-closing-flow').innerHTML=steps.map(function(s,i){return '<div class="rh-flow-step '+(i<idx?'done ':'')+(i===idx?'current':'')+'">'+rhAuditStatusLabel(s)+'</div>';}).join('');
  $('rh-closing-summary').innerHTML='<div class="rh-close-stat"><span>Checagens</span><strong>'+checks.length+'</strong></div><div class="rh-close-stat"><span>Bloqueios</span><strong>'+blockers.length+'</strong></div><div class="rh-close-stat"><span>Avisos</span><strong>'+warns.length+'</strong></div>';
  var btn=$('rh-closing-advance'),help=$('rh-closing-help');
  if(btn){btn.hidden=!canAdmin()||!next;btn.disabled=blockers.length>0;btn.textContent=rhAuditNextLabel(next);btn.onclick=function(){rhAdvanceClosing(next);};}
  if(status==='fechado')help.textContent='Competência fechada e protegida contra nova importação ou exclusão.';
  else if(blockers.length)help.textContent='Resolva '+blockers.length+' divergência(s) bloqueante(s) antes de avançar.';
  else if(next==='fechado')help.textContent='Ao fechar, a competência ficará protegida contra sobrescrita.';
  else help.textContent='Sem divergências bloqueantes para a próxima etapa.';
}
async function rhAdvanceClosing(next){
  if(!S.competencia||!next)return;var blockers=rhAuditBlockers();if(blockers.length){toast('Existem divergências bloqueantes na auditoria.',true);return;}
  if(next==='fechado'&&!window.confirm('Fechar esta competência? Depois do fechamento, uma nova importação da mesma competência será bloqueada.'))return;
  var btn=$('rh-closing-advance');if(btn)btn.disabled=true;
  try{await rpc('rh_atualizar_status_competencia',{p_competencia_id:S.competencia.id,p_status:next});toast('Status atualizado para '+rhAuditStatusLabel(next)+'.');await loadCompetences(S.competencia.id);go('conciliacao');}
  catch(e){toast('Não foi possível atualizar o fechamento: '+e.message,true);}
  finally{if(btn)btn.disabled=false;}
}

renderValidations=function(){
  if(!S.competencia)return;var checks=rhAuditChecks();
  if($('validation-list'))$('validation-list').innerHTML=checks.slice(0,4).map(function(x){return '<div class="validation-row '+(x.severity==='ok'?'':'warn')+'"><i>'+(x.severity==='ok'?'✓':'!')+'</i><span>'+esc(x.label)+(x.severity==='ok'?' conciliado.':' requer revisão.')+'</span></div>';}).join('');
  if($('reconciliation-list'))$('reconciliation-list').innerHTML=checks.map(function(x){var cls=x.severity==='ok'?'':(x.severity==='error'?'rh-error':'rh-warn'),badge=x.severity==='ok'?'Conciliado':(x.severity==='error'?'Bloqueia fechamento':'Atenção'),values='';if(x.expected!=null&&x.actual!=null){values='<div class="rh-audit-values">Esperado: <b>'+rhAuditFmt(x.expected)+'</b> · Encontrado: <b>'+rhAuditFmt(x.actual)+'</b>'+(typeof x.diff==='number'&&Math.abs(x.diff)>.001?' · Dif.: <b>'+fmt(x.diff)+'</b>':'')+'</div>';}return '<div class="reconciliation-item '+cls+'"><span class="check">'+(x.severity==='ok'?'✓':'!')+'</span><span><b>'+esc(x.label)+'</b><small>'+esc(x.note||'Conferência automática da competência inteira.')+'</small>'+values+'</span><span class="status '+(x.severity==='ok'?'success':(x.severity==='error'?'danger':''))+'">'+badge+'</span></div>';}).join('');
  rhRenderClosing();
};

var _rhAuditSetupUI=setupUI;
setupUI=function(){_rhAuditSetupUI();rhEnsureClosingUI();};
/* RH & Folha — Release Candidate: modos de gráfico globais + ranking em quadro */
S.rhChartModes=S.rhChartModes||{};
S.rhUniversalChartArgs=S.rhUniversalChartArgs||{};

function rhUniversalClone(v){
  if(Array.isArray(v))return v.map(rhUniversalClone);
  if(v&&typeof v==='object'){
    var o={};Object.keys(v).forEach(function(k){o[k]=rhUniversalClone(v[k]);});return o;
  }
  return v;
}
function rhUniversalModeOptions(){
  return [['auto','Automático'],['columns','Colunas'],['bars','Barras'],['ranking','Ranking'],['line','Linha'],['pie','Pizza']];
}
function rhUniversalEnsureSelector(id){
  var canvas=$(id);if(!canvas)return null;
  var panel=canvas.closest('.panel');if(!panel)return null;
  var head=panel.querySelector('.panel-head');if(!head)return null;
  var sid='rh-mode-'+id,sel=$(sid);
  if(sel){sel.value=S.rhChartModes[id]||sel.value||'auto';return sel;}
  var wrap=document.createElement('label');wrap.className='rh-chart-mode rh-chart-mode-global';
  wrap.innerHTML='<span>Gráfico</span><select id="'+esc(sid)+'">'+rhUniversalModeOptions().map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>';}).join('')+'</select>';
  head.appendChild(wrap);sel=$(sid);sel.value=S.rhChartModes[id]||'auto';
  sel.onchange=function(){S.rhChartModes[id]=sel.value;rhUniversalRenderCached(id);};
  return sel;
}
function rhUniversalScore(data,index){
  return (data.datasets||[]).reduce(function(total,ds){var n=Number(ds&&ds.data&&ds.data[index]);return total+(isFinite(n)?n:0);},0);
}
function rhUniversalSortArray(arr,order){
  if(!Array.isArray(arr)||arr.length!==order.length)return arr;
  return order.map(function(i){return arr[i];});
}
function rhUniversalRanking(data){
  var labels=(data.labels||[]).slice(),order=labels.map(function(_,i){return i;});
  order.sort(function(a,b){var d=rhUniversalScore(data,b)-rhUniversalScore(data,a);return d||a-b;});
  var out=rhUniversalClone(data);
  out.labels=order.map(function(i,rank){return (rank+1)+'º · '+String(labels[i]==null?'—':labels[i]);});
  (out.datasets||[]).forEach(function(ds,di){
    var src=(data.datasets||[])[di]||{};
    ds.data=rhUniversalSortArray(src.data||[],order);
    if(Array.isArray(src.backgroundColor))ds.backgroundColor=rhUniversalSortArray(src.backgroundColor,order);
    if(Array.isArray(src.borderColor))ds.borderColor=rhUniversalSortArray(src.borderColor,order);
  });
  return {data:out,order:order};
}
function rhUniversalClickMap(handler,order){
  if(!handler||!order)return handler;
  return function(e,els){
    var mapped=(els||[]).map(function(el){var copy={};Object.keys(el).forEach(function(k){copy[k]=el[k];});copy.index=order[el.index];return copy;});
    return handler(e,mapped);
  };
}
function rhUniversalLineDatasets(data){
  (data.datasets||[]).forEach(function(ds){
    if(!ds.borderColor){var bg=ds.backgroundColor;ds.borderColor=Array.isArray(bg)?bg[0]:bg;}
    ds.fill=false;if(ds.tension==null)ds.tension=.25;if(ds.pointRadius==null)ds.pointRadius=3;
  });
}
function rhUniversalPieDatasets(data){
  var pal=typeof rhInterPalette==='function'?rhInterPalette():[chartColors().blue,chartColors().gold,chartColors().emerald,chartColors().red,chartColors().purple,chartColors().orange];
  var n=(data.labels||[]).length;
  (data.datasets||[]).forEach(function(ds){
    if(!Array.isArray(ds.backgroundColor)||ds.backgroundColor.length!==n)ds.backgroundColor=(data.labels||[]).map(function(_,i){return pal[i%pal.length];});
    ds.borderWidth=1;
  });
}
function rhUniversalTransform(id,type,data,options,clickHandler){
  var mode=S.rhChartModes[id]||'auto',d=rhUniversalClone(data||{}),o=rhUniversalClone(options||{}),t=type,h=clickHandler;
  if(mode==='auto'||mode==='ranking')return {type:t,data:d,options:o,clickHandler:h};
  if(mode==='columns'){
    t='bar';delete o.indexAxis;
  }else if(mode==='bars'){
    t='bar';o.indexAxis='y';
  }else if(mode==='line'){
    t='line';delete o.indexAxis;rhUniversalLineDatasets(d);
  }else if(mode==='pie'){
    t='doughnut';delete o.indexAxis;o.cutout='0%';o.scales={};rhUniversalPieDatasets(d);
  }
  return {type:t,data:d,options:o,clickHandler:h};
}
function rhUniversalRenderCached(id){
  var a=S.rhUniversalChartArgs[id];if(!a)return;
  chart(id,a.type,a.data,a.options,a.clickHandler,true);
}

function rhUniversalRankingScoreRule(data){
  var sets=data.datasets||[],preferred=-1;
  sets.some(function(ds,i){var k=cleanSearch(ds&&ds.label||'');if(/(^|\s)(total|custo real|custo total)(\s|$)/.test(k)){preferred=i;return true;}return false;});
  if(preferred<0)sets.some(function(ds,i){var k=cleanSearch(ds&&ds.label||'');if(k.indexOf('provent')>=0){preferred=i;return true;}return false;});
  return {datasetIndex:preferred,sum:preferred<0&&sets.length>1};
}
function rhUniversalRankingScoreAt(data,index,rule){
  if(rule.datasetIndex>=0){var v=Number(data.datasets[rule.datasetIndex]&&data.datasets[rule.datasetIndex].data&&data.datasets[rule.datasetIndex].data[index]);return isFinite(v)?v:0;}
  return rhUniversalScore(data,index);
}
function rhUniversalIsCountSeries(ds){
  var key=cleanSearch(ds&&ds.label||''),vals=(ds&&ds.data||[]).map(Number).filter(function(n){return isFinite(n);});
  if(/pessoas|headcount|corridas|quantidade|qtd|colaboradores|funcionarios/.test(key))return true;
  if(/valor|custo|provento|desconto|liquido|fgts|inss|pis|irrf|encargo|salario|beneficio|patronal|recolhimento|folha/.test(key))return false;
  return vals.length>0&&vals.every(function(n){return Math.floor(n)===n;})&&Math.max.apply(Math,vals)<=500;
}
function rhUniversalRankingValue(ds,v){
  var n=Number(v)||0,key=cleanSearch(ds&&ds.label||'');
  if(/%|percent/.test(key))return n.toFixed(1).replace('.',',')+'%';
  if(rhUniversalIsCountSeries(ds))return nfmt(n);
  return fmt(n);
}
function rhUniversalRankingHost(id){
  var canvas=$(id);if(!canvas)return null;
  var wrap=canvas.closest('.chart-wrap')||canvas.parentNode;if(!wrap)return null;
  var rid='rh-ranking-'+id,host=$(rid);
  if(!host){host=document.createElement('div');host.id=rid;host.className='rh-ranking-view';host.hidden=true;wrap.appendChild(host);}
  return host;
}
function rhUniversalHideRanking(id){
  var canvas=$(id),host=$('rh-ranking-'+id),wrap=canvas&&(canvas.closest('.chart-wrap')||canvas.parentNode);
  if(host)host.hidden=true;if(canvas)canvas.hidden=false;if(wrap)wrap.classList.remove('rh-ranking-active');
}
function rhUniversalRenderRanking(id,data,clickHandler){
  var canvas=$(id),host=rhUniversalRankingHost(id);if(!canvas||!host)return;
  if(S.charts[id]){try{S.charts[id].destroy();}catch(e){}delete S.charts[id];}
  var wrap=canvas.closest('.chart-wrap')||canvas.parentNode;canvas.hidden=true;host.hidden=false;if(wrap)wrap.classList.add('rh-ranking-active');
  var labels=(data.labels||[]).slice(),sets=(data.datasets||[]).filter(function(ds){return Array.isArray(ds.data);}),rule=rhUniversalRankingScoreRule(data),order=labels.map(function(_,i){return i;});
  order.sort(function(a,b){var d=rhUniversalRankingScoreAt(data,b,rule)-rhUniversalRankingScoreAt(data,a,rule);return d||a-b;});
  var addTotal=rule.sum,cols=2+sets.length+(addTotal?1:0);
  var header='<div class="rh-rank-row rh-rank-head" style="--rh-rank-cols:'+cols+'"><div>#</div><div>Categoria</div>'+sets.map(function(ds){return '<div>'+esc(ds.label||'Valor')+'</div>';}).join('')+(addTotal?'<div>Total</div>':'')+'</div>';
  var body=order.map(function(originalIndex,rank){
    var total=rhUniversalScore(data,originalIndex),cells=sets.map(function(ds){return '<div class="rh-rank-value">'+esc(rhUniversalRankingValue(ds,ds.data[originalIndex]))+'</div>';}).join('');
    return '<button type="button" class="rh-rank-row rh-rank-item" style="--rh-rank-cols:'+cols+'" data-rh-rank-index="'+originalIndex+'"><div class="rh-rank-pos">'+(rank+1)+'º</div><div class="rh-rank-name"><b>'+esc(labels[originalIndex]==null?'—':labels[originalIndex])+'</b><small>posição no ranking</small></div>'+cells+(addTotal?'<div class="rh-rank-total">'+esc(fmt(total))+'</div>':'')+'</button>';
  }).join('');
  var totals=sets.map(function(ds){var t=(ds.data||[]).reduce(function(a,v){var n=Number(v);return a+(isFinite(n)?n:0);},0);return '<div class="rh-rank-value">'+esc(rhUniversalRankingValue(ds,t))+'</div>';}).join('');
  var grand=labels.reduce(function(a,_,i){return a+rhUniversalScore(data,i);},0);
  var foot='<div class="rh-rank-row rh-rank-foot" style="--rh-rank-cols:'+cols+'"><div></div><div>TOTAL</div>'+totals+(addTotal?'<div class="rh-rank-total">'+esc(fmt(grand))+'</div>':'')+'</div>';
  host.innerHTML='<div class="rh-rank-table">'+header+body+foot+'</div>';
  Array.prototype.forEach.call(host.querySelectorAll('[data-rh-rank-index]'),function(row){row.onclick=function(){if(!clickHandler)return;var oi=Number(row.dataset.rhRankIndex),di=rule.datasetIndex>=0?rule.datasetIndex:0;clickHandler(null,[{index:oi,datasetIndex:di}]);};});
}

var _rhUniversalChartBase=chart;
chart=function(id,type,data,options,clickHandler,fromCache){
  if(!fromCache)S.rhUniversalChartArgs[id]={type:type,data:rhUniversalClone(data||{}),options:rhUniversalClone(options||{}),clickHandler:clickHandler};
  rhUniversalEnsureSelector(id);
  if((S.rhChartModes[id]||'auto')==='ranking'){rhUniversalRenderRanking(id,data||{},clickHandler);return null;}
  rhUniversalHideRanking(id);
  var t=rhUniversalTransform(id,type,data,options,clickHandler);
  return _rhUniversalChartBase(id,t.type,t.data,t.options,t.clickHandler);
};

if(!$('_rh_universal_chart_styles')){
  var _rhucs=document.createElement('style');_rhucs.id='_rh_universal_chart_styles';
  _rhucs.textContent='.rh-chart-mode-global{margin-left:auto}.rh-chart-mode select{min-width:118px}.chart-wrap.rh-ranking-active{height:auto!important;min-height:260px;overflow:hidden!important}.rh-ranking-view{width:100%;max-height:430px;overflow-y:auto;overflow-x:hidden;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2)}.rh-rank-table{width:100%;min-width:0}.rh-rank-row{display:grid;grid-template-columns:42px minmax(135px,1.55fr) repeat(calc(var(--rh-rank-cols) - 2),minmax(74px,1fr));align-items:center;width:100%;min-width:0;border:0;border-bottom:1px solid var(--line-soft);background:transparent;color:var(--text);text-align:left;padding:0}.rh-rank-row>div{min-width:0;padding:10px 9px;overflow:hidden;text-overflow:ellipsis}.rh-rank-head{position:sticky;top:0;z-index:2;background:var(--surface);font-size:.67rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.rh-rank-head>div:not(:nth-child(-n+2)){text-align:right}.rh-rank-item{cursor:pointer;font:inherit}.rh-rank-item:hover{background:rgba(255,255,255,.045)}.rh-rank-pos{font-weight:900;text-align:center}.rh-rank-name b{display:block;white-space:normal;line-height:1.15}.rh-rank-name small{display:block;margin-top:3px;color:var(--muted);font-size:.68rem;font-weight:600}.rh-rank-value,.rh-rank-total{text-align:right;white-space:nowrap;font-weight:750}.rh-rank-total{font-weight:950}.rh-rank-foot{position:sticky;bottom:0;background:var(--surface);font-weight:950;border-bottom:0;border-top:2px solid var(--gold)}body.light .rh-ranking-view{border-color:rgba(16,49,78,.24)!important;background:#fff!important}body.light .rh-rank-head,body.light .rh-rank-foot{background:#eef4f8!important;color:#213b55!important}body.light .rh-rank-item:hover{background:#f3f7fa!important}@media(max-width:760px){.rh-rank-row{grid-template-columns:38px minmax(110px,1.4fr) repeat(calc(var(--rh-rank-cols) - 2),minmax(0,1fr))}.rh-rank-row>div{padding:8px 6px;font-size:.72rem}.rh-rank-name small{display:none}}';
  document.head.appendChild(_rhucs);
}
/* RH & Folha — composição sincronizada do Custo Real por departamento */
function rhDepartmentCostPerson(p){
  var out={proventos:Number(p.proventos)||0,fgts:0,inss:0,rat:0,terceiros:0,pis:0,beneficios:0,encargos:0,total:0};
  var employer=typeof rhEmployerCharges==='function'?rhEmployerCharges(p):{itens:[],total:0};
  (employer.itens||[]).forEach(function(it){
    var k=cleanSearch(it[0]),v=Number(it[1])||0;
    out.encargos+=v;
    if(k==='fgts')out.fgts+=v;
    else if(k.indexOf('inss patronal')>=0)out.inss+=v;
    else if(k==='rat')out.rat+=v;
    else if(k.indexOf('terceiros')>=0)out.terceiros+=v;
    else if(k==='pis')out.pis+=v;
  });
  var b=typeof rhPersonBenefit==='function'?rhPersonBenefit(p):null;
  if(b){
    out.beneficios=(Number(b.seguro_vida)||0)
      +(Number(b.assistencia_medica||b.assist_medica)||0)
      +(Number(b.vr_caixa)||0)
      +(Number(b.vale_transporte)||0);
  }else{
    var custo=typeof custoEmpresa==='function'?custoEmpresa(p):{itens:[]};
    (custo.itens||[]).forEach(function(it){if(it[2]==='benefício')out.beneficios+=Number(it[1])||0;});
  }
  out.total=out.proventos+out.encargos+out.beneficios;
  return out;
}
function rhDepartmentCostTotals(items){
  return items.reduce(function(t,x){
    ['proventos','fgts','inss','rat','terceiros','pis','beneficios','encargos','total'].forEach(function(k){t[k]+=Number(x.cost[k])||0;});
    return t;
  },{proventos:0,fgts:0,inss:0,rat:0,terceiros:0,pis:0,beneficios:0,encargos:0,total:0});
}
function rhDepartmentCostModel(nome){
  var key=rhDeptKey(nome),source=typeof rhScopePeople==='function'?rhScopePeople():S.pessoas;
  var items=source.filter(function(p){return rhDeptKey(departmentName(p.departamento))===key;})
    .map(function(p){return {person:p,cost:rhDepartmentCostPerson(p)};})
    .sort(function(a,b){return b.cost.total-a.cost.total;});
  return {nome:nome,items:items,totals:rhDepartmentCostTotals(items)};
}
function rhOpenDepartmentCostBreakdown(nome){
  var model=rhDepartmentCostModel(nome),items=model.items,t=model.totals;
  if(!items.length){openGenericDetail(nome,'COMPOSIÇÃO DO CUSTO REAL','<p class="detail-empty">Nenhum colaborador para os filtros selecionados.</p>');return;}
  var summary=[['Proventos',t.proventos],['FGTS',t.fgts],['INSS patronal',t.inss],['RAT',t.rat],['Terceiros',t.terceiros],['PIS',t.pis],['Benefícios',t.beneficios],['Custo Real',t.total]];
  var html='<div class="rh-dept-cost-explain"><b>Como este valor é formado?</b><span>Proventos + FGTS + INSS Patronal + RAT + Terceiros + PIS + Benefícios = Custo Real</span></div>'
    +'<div class="rh-dept-cost-summary">'+summary.map(function(x,i){return '<div class="rh-dept-cost-card'+(i===summary.length-1?' featured':'')+'"><span>'+esc(x[0])+'</span><strong>'+fmt(x[1])+'</strong></div>';}).join('')+'</div>'
    +'<div class="rh-dept-cost-note">O total acima é exatamente a mesma base usada no gráfico. Descontos, IRRF e INSS retido do colaborador não entram no Custo Real porque são deduções do colaborador, e não custo patronal da LNB.</div>'
    +'<h3 class="rh-dept-cost-title">Composição por colaborador</h3>'
    +'<table class="modal-table-inner responsive-table rh-dept-cost-table"><thead><tr><th>Colaborador</th><th class="money">Proventos</th><th class="money">Encargos</th><th class="money">Benefícios</th><th class="money">Custo Real</th></tr></thead><tbody>'
    +items.map(function(x){return '<tr><td><b>'+esc(x.person.nome)+'</b><small>'+esc(departmentName(x.person.departamento))+'</small></td><td class="money">'+fmt(x.cost.proventos)+'</td><td class="money">'+fmt(x.cost.encargos)+'</td><td class="money">'+fmt(x.cost.beneficios)+'</td><td class="money"><b>'+fmt(x.cost.total)+'</b></td></tr>';}).join('')
    +'</tbody>'+rhFoot(['TOTAL',fmt(t.proventos),fmt(t.encargos),fmt(t.beneficios),fmt(t.total)])+'</table>';
  openGenericDetail(nome,'COMPOSIÇÃO DO CUSTO REAL',html);
}
function rhSyncDepartmentCostChartData(data){
  if(!data||!Array.isArray(data.labels)||!Array.isArray(data.datasets))return data;
  var out=typeof rhUniversalClone==='function'?rhUniversalClone(data):JSON.parse(JSON.stringify(data));
  var target=-1;
  (out.datasets||[]).some(function(ds,i){if(cleanSearch(ds&&ds.label||'').indexOf('custo real')>=0){target=i;return true;}return false;});
  if(target<0&&out.datasets.length===1)target=0;
  if(target>=0){
    out.datasets[target].data=out.labels.map(function(label){return rhDepartmentCostModel(label).totals.total;});
  }
  return out;
}

/* Indicadores e Dossiê usam a MESMA fonte para desenhar o valor e abrir sua composição. */
var _rhDepartmentCostChart=chart;
chart=function(id,type,data,options,clickHandler,fromCache){
  if(id==='chart-insight-dept'||id==='chart-dossier-dept'){
    var synced=rhSyncDepartmentCostChartData(data),labels=synced&&synced.labels?synced.labels.slice():[];
    clickHandler=function(e,els){if(els&&els.length){var label=labels[els[0].index];if(label!=null)rhOpenDepartmentCostBreakdown(label);}};
    return _rhDepartmentCostChart(id,type,synced,options,clickHandler,fromCache);
  }
  return _rhDepartmentCostChart(id,type,data,options,clickHandler,fromCache);
};

if(!$('_rh_department_cost_styles')){
  var st=document.createElement('style');st.id='_rh_department_cost_styles';
  st.textContent='.rh-dept-cost-explain{display:grid;gap:5px;padding:12px 14px;margin-bottom:12px;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2)}.rh-dept-cost-explain b{font-size:.9rem}.rh-dept-cost-explain span{color:var(--muted);font-size:.78rem}.rh-dept-cost-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}.rh-dept-cost-card{min-width:0;border:1px solid var(--line-soft);border-radius:10px;padding:9px 10px;background:var(--surface-2)}.rh-dept-cost-card span{display:block;color:var(--muted);font-size:.62rem;font-weight:850;text-transform:uppercase}.rh-dept-cost-card strong{display:block;margin-top:4px;font-size:.88rem;white-space:nowrap}.rh-dept-cost-card.featured{border-color:var(--gold)}.rh-dept-cost-card.featured strong{color:var(--gold)}.rh-dept-cost-note{font-size:.72rem;color:var(--muted);margin:8px 0 14px}.rh-dept-cost-title{font-size:.84rem;margin:0 0 8px}.rh-dept-cost-table td:first-child small{display:block;color:var(--muted);margin-top:2px}@media(max-width:760px){.rh-dept-cost-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.rh-dept-cost-table th,.rh-dept-cost-table td{font-size:.68rem!important;padding:.42rem .3rem!important}}body.light .rh-dept-cost-explain,body.light .rh-dept-cost-card{border-color:rgba(16,49,78,.22)!important;background:#f7fafc!important}body.light .rh-dept-cost-note,body.light .rh-dept-cost-explain span,body.light .rh-dept-cost-card span{color:#405b73!important}';
  document.head.appendChild(st);
}
/* RH & Folha — Release Candidate: Dossiê Executivo */
function rhDossierRows(){return typeof rhScopePeople==='function'?rhScopePeople():S.pessoas;}
function rhDossierModel(){
  var rows=rhDossierRows(),base=rhScopeTotals(rows),cost={total:0,beneficios:0,fgts:0,inss:0,rat:0,terceiros:0,pis:0},deps={},benef={seguro:0,saude:0,vr:0,vt:0,total:0};
  rows.forEach(function(p){var c=custoEmpresa(p);cost.total+=c.total;c.itens.forEach(function(it){var k=cleanSearch(it[0]),v=Number(it[1])||0;if(k==='fgts')cost.fgts+=v;else if(k.indexOf('inss patronal')>=0)cost.inss+=v;else if(k==='rat')cost.rat+=v;else if(k.indexOf('terceiros')>=0)cost.terceiros+=v;else if(k==='pis')cost.pis+=v;if(it[2]==='benefício')cost.beneficios+=v;});var b=rhPersonBenefit(p),s=b?Number(b.seguro_vida)||0:0,m=b?Number(b.assistencia_medica||b.assist_medica)||0:0,vr=b?Number(b.vr_caixa)||0:0,vt=b?Number(b.vale_transporte)||0:0;benef.seguro+=s;benef.saude+=m;benef.vr+=vr;benef.vt+=vt;benef.total+=s+m+vr+vt;var dep=departmentName(p.departamento);if(!deps[dep])deps[dep]={departamento:dep,pessoas:0,proventos:0,descontos:0,liquido:0,custo:0};deps[dep].pessoas++;deps[dep].proventos+=Number(p.proventos)||0;deps[dep].descontos+=Number(p.descontos)||0;deps[dep].liquido+=Number(p.liquido)||0;deps[dep].custo+=c.total;});
  return {rows:rows,base:base,cost:cost,benef:benef,departamentos:Object.keys(deps).map(function(k){return deps[k];}).sort(function(a,b){return b.custo-a.custo;}),movimentos:typeof rhMovementEvents==='function'?rhMovementEvents():[],status:rhAuditStatusLabel(S.competencia&&S.competencia.status),competencia:formatCompetence(S.competencia&&S.competencia.competencia),scope:{departamento:RH_SCOPE&&RH_SCOPE.dept?departmentName(RH_SCOPE.dept):'Todos',vinculo:RH_SCOPE&&RH_SCOPE.vinculo?({clt:'CLT',estagiario:'Estagiário',outros:'Outros'}[RH_SCOPE.vinculo]||RH_SCOPE.vinculo):'Todos'}};
}
function rhDossierEnsureUI(){
  var nav=$('nav');if(nav&&!document.querySelector('[data-view="dossie"]')){var b=document.createElement('button');b.className='nav-item';b.dataset.view='dossie';b.innerHTML='<span>▤</span>Dossiê';var anchor=document.querySelector('[data-view="indicadores"]');if(anchor&&anchor.nextSibling)nav.insertBefore(b,anchor.nextSibling);else nav.appendChild(b);b.onclick=function(){go('dossie');renderDossier();};}
  if(!$('page-dossie')){var page=document.createElement('section');page.className='page';page.id='page-dossie';page.innerHTML='<div class="page-head"><div><span class="eyebrow">RELATÓRIO EXECUTIVO</span><h1>Dossiê da Folha</h1><p>Resumo consolidado da competência para conferência, Diretoria e Financeiro.</p></div><div class="head-actions"><button class="button ghost export-only" id="rh-dossier-xlsx">Exportar Excel</button><button class="button primary export-only" id="rh-dossier-pdf">Gerar PDF</button></div></div><div class="kpi-grid" id="rh-dossier-kpis"></div><div class="grid two"><article class="panel"><div class="panel-head"><div><span class="panel-kicker">RESUMO</span><h2>Leitura executiva</h2></div><span class="status" id="rh-dossier-status">—</span></div><div id="rh-dossier-summary" class="metric-list"></div></article><article class="panel"><div class="panel-head"><div><span class="panel-kicker">BENEFÍCIOS</span><h2>Composição integrada</h2></div></div><div id="rh-dossier-benefits" class="metric-list"></div></article></div><article class="panel table-panel"><div class="panel-head"><div><span class="panel-kicker">RATEIO</span><h2>Custo por departamento</h2></div></div><div class="table-wrap"><table><thead><tr><th>Departamento</th><th class="money">Pessoas</th><th class="money">Proventos</th><th class="money">Descontos</th><th class="money">Líquido</th><th class="money">Custo Real</th></tr></thead><tbody id="rh-dossier-depts"></tbody></table></div></article><article class="panel"><div class="panel-head"><div><span class="panel-kicker">MOVIMENTAÇÕES</span><h2>Eventos da competência</h2></div></div><div id="rh-dossier-movements" class="reconciliation-list"></div></article></section>';var content=document.querySelector('#app .content')||document.querySelector('#app main')||$('app');content.appendChild(page);if(typeof rhCreateScreenFilters==='function'){rhCreateScreenFilters('page-dossie');rhPopulateScopeControls();rhEnsureScopeFilters();}$('rh-dossier-xlsx').onclick=rhExportDossierExcel;$('rh-dossier-pdf').onclick=rhPrintDossier;}
  if(!$('_rh_dossier_styles')){var st=document.createElement('style');st.id='_rh_dossier_styles';st.textContent='#rh-dossier-kpis{grid-template-columns:repeat(6,minmax(0,1fr))}#page-dossie .table-wrap{overflow-x:hidden!important}#page-dossie table{table-layout:fixed!important;width:100%!important}@media(max-width:1200px){#rh-dossier-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:680px){#rh-dossier-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}';document.head.appendChild(st);}
}
function renderDossier(){
  rhDossierEnsureUI();if(!S.competencia)return;var m=rhDossierModel();$('rh-dossier-status').textContent=m.status;$('rh-dossier-status').className='status '+(cleanSearch(m.status)==='fechado'?'success':'');$('rh-dossier-kpis').innerHTML=[['Competência',m.competencia],['Pessoas',nfmt(m.rows.length)],['Proventos',fmt(m.base.proventos)],['Líquido',fmt(m.base.liquido)],['Encargos',fmt(m.cost.fgts+m.cost.inss+m.cost.rat+m.cost.terceiros+m.cost.pis)],['Custo Real',fmt(m.cost.total)]].map(function(x){return '<div class="kpi"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('');$('rh-dossier-summary').innerHTML=[['Departamento',m.scope.departamento],['Vínculo',m.scope.vinculo],['Descontos',fmt(m.base.descontos)],['FGTS',fmt(m.cost.fgts)],['INSS patronal',fmt(m.cost.inss)],['RAT',fmt(m.cost.rat)],['Terceiros',fmt(m.cost.terceiros)],['PIS',fmt(m.cost.pis)],['Custo médio / pessoa',fmt(rhAvg(m.cost.total,m.rows.length))]].map(function(x){return '<div class="metric-row"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('');$('rh-dossier-benefits').innerHTML=[['Seguro de Vida',m.benef.seguro],['Assistência Médica',m.benef.saude],['VR / VA / Cesta Básica',m.benef.vr],['Vale Transporte',m.benef.vt],['Total Benefícios',m.benef.total]].map(function(x){return '<div class="metric-row"><span>'+esc(x[0])+'</span><strong>'+fmt(x[1])+'</strong></div>';}).join('');$('rh-dossier-depts').innerHTML=m.departamentos.length?m.departamentos.map(function(d){return '<tr><td><b>'+esc(d.departamento)+'</b></td><td class="money">'+nfmt(d.pessoas)+'</td><td class="money">'+fmt(d.proventos)+'</td><td class="money">'+fmt(d.descontos)+'</td><td class="money">'+fmt(d.liquido)+'</td><td class="money"><b>'+fmt(d.custo)+'</b></td></tr>';}).join(''):emptyRow(6,'Sem dados para os filtros selecionados.');$('rh-dossier-movements').innerHTML=m.movimentos.length?m.movimentos.slice(0,20).map(function(ev){return '<div class="reconciliation-item"><span class="check">•</span><span><b>'+esc(ev.tipo)+' — '+esc(ev.person.nome||'')+'</b><small>'+esc(ev.detalhe||ev.dep||'')+'</small></span><span class="status '+esc(ev.classe||'')+'">'+esc(ev.dep)+'</span></div>';}).join(''):'<div class="reconciliation-item"><span class="check">✓</span><span><b>Sem movimentações</b><small>Nenhum evento identificado nesta competência/escopo.</small></span><span class="status success">Estável</span></div>';setupPermissions();
}
async function rhExportDossierExcel(){
  if(!S.competencia)return;try{toast('Preparando Dossiê em Excel…');await loadLibrary('xlsx');var m=rhDossierModel(),wb=XLSX.utils.book_new();var resumo=[{Indicador:'Competência',Valor:m.competencia},{Indicador:'Status',Valor:m.status},{Indicador:'Departamento',Valor:m.scope.departamento},{Indicador:'Vínculo',Valor:m.scope.vinculo},{Indicador:'Pessoas',Valor:m.rows.length},{Indicador:'Proventos',Valor:m.base.proventos},{Indicador:'Descontos',Valor:m.base.descontos},{Indicador:'Líquido',Valor:m.base.liquido},{Indicador:'FGTS',Valor:m.cost.fgts},{Indicador:'INSS patronal',Valor:m.cost.inss},{Indicador:'RAT',Valor:m.cost.rat},{Indicador:'Terceiros',Valor:m.cost.terceiros},{Indicador:'PIS',Valor:m.cost.pis},{Indicador:'Benefícios',Valor:m.benef.total},{Indicador:'Custo Real',Valor:m.cost.total}];XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(resumo),'Resumo Executivo');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(m.departamentos.map(function(d){return {Departamento:d.departamento,Pessoas:d.pessoas,Proventos:d.proventos,Descontos:d.descontos,Liquido:d.liquido,Custo_Real:d.custo};})),'Departamentos');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(m.rows.map(function(p){var c=rhInsightCost(p);return {Colaborador:p.nome,Matricula:p.matricula,Vinculo:p.vinculo,Departamento:departmentName(p.departamento),Proventos:p.proventos,Descontos:p.descontos,Liquido:p.liquido,Encargos:c.encargos,Beneficios:c.beneficios,Custo_Real:c.total};})),'Colaboradores');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(m.movimentos.map(function(ev){return {Colaborador:ev.person.nome,Movimentacao:ev.tipo,Departamento:ev.dep,Vinculo:ev.vinc,Detalhe:ev.detalhe};})),'Movimentacoes');XLSX.writeFile(wb,'Dossie_RH_Folha_'+m.competencia.replace('/','_')+'.xlsx');toast('Dossiê Excel gerado.');}catch(e){toast('Não foi possível gerar o Excel: '+e.message,true);}
}
function rhPrintDossier(){
  if(!S.competencia)return;var m=rhDossierModel(),w=window.open('','_blank','noopener,noreferrer');if(!w){toast('Permita pop-ups para gerar o PDF.',true);return;}var css='body{font-family:Arial,sans-serif;color:#13253a;margin:24px}h1{margin:0 0 4px}h2{margin-top:26px;font-size:16px}.meta{color:#52667b;margin-bottom:20px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{border:1px solid #cbd5df;border-radius:10px;padding:12px}.card span{display:block;font-size:10px;text-transform:uppercase;color:#66788a}.card b{display:block;margin-top:4px;font-size:16px}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}th,td{border-bottom:1px solid #d9e1e8;padding:7px;text-align:left}th{text-transform:uppercase;font-size:9px;color:#52667b}.num{text-align:right}.foot{margin-top:28px;font-size:9px;color:#6b7b8d}@page{size:A4 landscape;margin:12mm}';var html='<html><head><title>Dossiê RH '+esc(m.competencia)+'</title><style>'+css+'</style></head><body><h1>Dossiê RH & Folha — LNB</h1><div class="meta">Competência '+esc(m.competencia)+' · '+esc(m.status)+' · Departamento: '+esc(m.scope.departamento)+' · Vínculo: '+esc(m.scope.vinculo)+'</div><div class="cards">'+[['Pessoas',nfmt(m.rows.length)],['Proventos',fmt(m.base.proventos)],['Descontos',fmt(m.base.descontos)],['Líquido',fmt(m.base.liquido)],['Benefícios',fmt(m.benef.total)],['Custo Real',fmt(m.cost.total)]].map(function(x){return '<div class="card"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>';}).join('')+'</div><h2>Encargos</h2><table><tr><th>FGTS</th><th>INSS patronal</th><th>RAT</th><th>Terceiros</th><th>PIS</th></tr><tr><td>'+fmt(m.cost.fgts)+'</td><td>'+fmt(m.cost.inss)+'</td><td>'+fmt(m.cost.rat)+'</td><td>'+fmt(m.cost.terceiros)+'</td><td>'+fmt(m.cost.pis)+'</td></tr></table><h2>Custo por departamento</h2><table><thead><tr><th>Departamento</th><th class="num">Pessoas</th><th class="num">Proventos</th><th class="num">Líquido</th><th class="num">Custo Real</th></tr></thead><tbody>'+m.departamentos.map(function(d){return '<tr><td>'+esc(d.departamento)+'</td><td class="num">'+nfmt(d.pessoas)+'</td><td class="num">'+fmt(d.proventos)+'</td><td class="num">'+fmt(d.liquido)+'</td><td class="num">'+fmt(d.custo)+'</td></tr>';}).join('')+'</tbody></table><h2>Movimentações</h2><table><thead><tr><th>Colaborador</th><th>Movimentação</th><th>Departamento</th><th>Detalhe</th></tr></thead><tbody>'+m.movimentos.map(function(ev){return '<tr><td>'+esc(ev.person.nome||'')+'</td><td>'+esc(ev.tipo)+'</td><td>'+esc(ev.dep)+'</td><td>'+esc(ev.detalhe||'')+'</td></tr>';}).join('')+'</tbody></table><div class="foot">Painel LNB · RH & Folha · Relatório gerado a partir da competência selecionada.</div><script>window.onload=function(){setTimeout(function(){window.print();},250)};<\/script></body></html>';w.document.open();w.document.write(html);w.document.close();
}
var _rhDossierRefreshScope=rhRefreshScope;rhRefreshScope=function(){_rhDossierRefreshScope();if(S.view==='dossie')renderDossier();};
var _rhDossierRenderAll=renderAll;renderAll=function(){_rhDossierRenderAll();rhDossierEnsureUI();if(S.view==='dossie')renderDossier();};
var _rhDossierSetup=setupUI;setupUI=function(){_rhDossierSetup();rhDossierEnsureUI();};
/* RH & Folha — Release Candidate: histórico comparativo entre competências */
function rhHistoryNum(v){return Number(v)||0;}
function rhHistoryHeadcount(c){
  var r=c&&c.resumo||{},e=c&&c.encargos||{},s=e.situacoes||{};
  var direct=Number(r.pessoas)||0;if(direct)return direct;
  var byLink=(Number(s.empregados)||0)+(Number(s.estagiarios)||0);if(byLink)return byLink;
  return (Number(r.trabalhando)||0)+(Number(r.demitidos)||0);
}
function rhHistoryBenefitSnapshot(c){
  var r=c&&c.resumo||{};
  if(r.beneficios_total!=null)return Number(r.beneficios_total)||0;
  if(r.beneficios&&typeof r.beneficios==='object'&&r.beneficios.total!=null)return Number(r.beneficios.total)||0;
  return null;
}
function rhHistoryModel(c){
  var e=c&&c.encargos||{},base=Number(e.base_total_inss)||0;
  var fgts=Number(e.valor_fgts!=null?e.valor_fgts:c.valor_fgts)||0;
  var pis=Number(e.valor_pis)||0;
  var irrf=Number(e.valor_irrf_folha!=null?e.valor_irrf_folha:e.valor_irrf)||0;
  var inssPat=base*.20,rat=Number(e.rat)||(base*.01),ter=Number(e.terceiros)||(base*.058),patronais=inssPat+rat+ter;
  var proventos=Number(c.proventos)||0,descontos=Number(c.descontos)||0,liquido=Number(c.liquido)||0;
  var beneficios=rhHistoryBenefitSnapshot(c),custoFolha=proventos+fgts+patronais+pis;
  return {id:c.id,competencia:c.competencia,status:rhAuditStatus(c.status),fonte:c.fonte||'—',pessoas:rhHistoryHeadcount(c),proventos:proventos,descontos:descontos,liquido:liquido,fgts:fgts,patronais:patronais,pis:pis,irrf:irrf,beneficios:beneficios,custoFolha:custoFolha,custoReal:beneficios==null?null:custoFolha+beneficios,raw:c};
}
function rhHistoryAllRows(){return (S.competencias||[]).slice().sort(function(a,b){return String(a.competencia).localeCompare(String(b.competencia));}).map(rhHistoryModel);}
function rhHistoryRows(){var y=$('rh-history-year')&&$('rh-history-year').value||'';return rhHistoryAllRows().filter(function(x){return !y||String(x.competencia||'').slice(0,4)===y;});}
function rhHistoryDelta(curr,prev,key){if(!prev)return null;return (Number(curr[key])||0)-(Number(prev[key])||0);}
function rhHistoryPct(curr,prev,key){if(!prev)return null;var p=Number(prev[key])||0;if(!p)return null;return ((Number(curr[key])||0)-p)/Math.abs(p)*100;}
function rhHistoryDeltaHtml(curr,prev,key,label){
  var d=rhHistoryDelta(curr,prev,key),p=rhHistoryPct(curr,prev,key);if(d==null)return '<span class="rh-history-delta neutral">'+esc(label)+': base inicial</span>';
  var cls=d>0?'up':(d<0?'down':'neutral'),arrow=d>0?'↑':(d<0?'↓':'→');
  return '<span class="rh-history-delta '+cls+'">'+arrow+' '+esc(label)+': '+fmt(Math.abs(d))+(p==null?'':' · '+Math.abs(p).toFixed(1).replace('.',',')+'%')+'</span>';
}
function rhHistoryMoneyMaybe(v){return v==null?'Não versionado':fmt(v);}
function rhHistoryStatusClass(v){return v==='fechado'?'success':(v==='conciliado'?'success':'');}
function rhHistoryYears(){var seen={};rhHistoryAllRows().forEach(function(x){var y=String(x.competencia||'').slice(0,4);if(y)seen[y]=1;});return Object.keys(seen).sort().reverse();}
function rhHistoryPopulateYears(){var s=$('rh-history-year');if(!s)return;var cur=s.value,years=rhHistoryYears();s.innerHTML='<option value="">Todos os anos</option>'+years.map(function(y){return '<option value="'+esc(y)+'">'+esc(y)+'</option>';}).join('');if(cur&&years.indexOf(cur)>=0)s.value=cur;}

function rhEnsureHistoryUI(){
  var nav=$('nav');
  if(nav&&!document.querySelector('[data-view="historico"]')){
    var btn=document.createElement('button');btn.className='nav-item';btn.dataset.view='historico';btn.innerHTML='<span>▥</span>Histórico';
    var anchor=document.querySelector('[data-view="importacao"]');if(anchor)nav.insertBefore(btn,anchor);else nav.appendChild(btn);
    btn.onclick=function(){go('historico');renderHistory();};
  }
  if(!$('page-historico')){
    var page=document.createElement('section');page.className='page';page.id='page-historico';
    page.innerHTML='<div class="page-head"><div><span class="eyebrow">HISTÓRICO & EVOLUÇÃO</span><h1>Histórico comparativo</h1><p>Evolução mensal da folha e dos encargos da competência inteira.</p></div><div class="head-actions"><label>Ano<select id="rh-history-year"><option value="">Todos os anos</option></select></label></div></div>'
      +'<div class="kpi-grid" id="rh-history-kpis"></div>'
      +'<div class="validation-row warn" id="rh-history-base-note" hidden><i>i</i><span></span></div>'
      +'<div class="grid two rh-history-charts"><article class="panel"><div class="panel-head"><div><span class="panel-kicker">EVOLUÇÃO FINANCEIRA</span><h2>Proventos, descontos e líquido</h2></div></div><div class="chart-wrap tall"><canvas id="chart-history-finance"></canvas></div></article>'
      +'<article class="panel"><div class="panel-head"><div><span class="panel-kicker">ENCARGOS</span><h2>FGTS, patronais, PIS e IRRF</h2></div></div><div class="chart-wrap tall"><canvas id="chart-history-charges"></canvas></div></article></div>'
      +'<article class="panel"><div class="panel-head"><div><span class="panel-kicker">COMPETÊNCIAS</span><h2>Resumo mês a mês</h2></div><span class="source-badge">Clique no mês para detalhar</span></div><div id="rh-history-months" class="rh-history-months"></div></article>'
      +'<div class="validation-row" id="rh-history-benefit-note"><i>i</i><span>Benefícios históricos só entram quando houver snapshot mensal. O valor atual da Gestão de Benefícios não é replicado retroativamente.</span></div>';
    var content=document.querySelector('#app .content')||document.querySelector('#app main')||$('app');content.appendChild(page);
    $('rh-history-year').onchange=renderHistory;
  }
  if(!$('_rh_history_styles')){
    var st=document.createElement('style');st.id='_rh_history_styles';st.textContent='.rh-history-months{display:grid;gap:12px}.rh-history-month{border:1px solid var(--line-soft);border-radius:14px;background:var(--surface-2);padding:14px;cursor:pointer;transition:transform .15s ease,border-color .15s ease}.rh-history-month:hover{transform:translateY(-1px);border-color:var(--line)}.rh-history-month-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}.rh-history-month-head span{display:block;color:var(--muted);font-size:.68rem;text-transform:uppercase;font-weight:800}.rh-history-month-head strong{display:block;font-size:1.05rem;margin-top:2px}.rh-history-month-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.rh-history-metric{min-width:0;padding:9px 10px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface)}.rh-history-metric span{display:block;color:var(--muted);font-size:.65rem;font-weight:800;text-transform:uppercase}.rh-history-metric strong{display:block;margin-top:3px;font-size:.84rem;white-space:nowrap}.rh-history-month-foot{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.rh-history-delta{padding:5px 8px;border-radius:999px;font-size:.68rem;font-weight:800;background:var(--surface)}.rh-history-delta.up{color:var(--gold)}.rh-history-delta.down{color:var(--blue)}.rh-history-delta.neutral{color:var(--muted)}.rh-history-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.rh-history-detail-grid>div{border:1px solid var(--line-soft);border-radius:10px;padding:10px;background:var(--surface-2)}.rh-history-detail-grid span{display:block;color:var(--muted);font-size:.65rem;text-transform:uppercase;font-weight:800}.rh-history-detail-grid strong{display:block;margin-top:4px;font-size:.9rem}.rh-history-detail-actions{margin-top:14px;display:flex;justify-content:flex-end}@media(max-width:1100px){.rh-history-month-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:680px){.rh-history-month-metrics,.rh-history-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rh-history-charts{grid-template-columns:1fr!important}}body.light .rh-history-month,body.light .rh-history-metric,body.light .rh-history-detail-grid>div{border-color:rgba(16,49,78,.22)!important}';document.head.appendChild(st);
  }
}
function rhHistoryOpenDetail(row,prev){
  var ben=row.beneficios==null?'Não versionado':fmt(row.beneficios),real=row.custoReal==null?'Aguardando benefício histórico':fmt(row.custoReal);
  var html='<div class="rh-history-detail-grid">'
    +[['Status',rhAuditStatusLabel(row.status)],['Pessoas',nfmt(row.pessoas)],['Fonte',row.fonte],['Proventos',fmt(row.proventos)],['Descontos',fmt(row.descontos)],['Líquido',fmt(row.liquido)],['FGTS',fmt(row.fgts)],['Encargos patronais',fmt(row.patronais)],['PIS',fmt(row.pis)],['IRRF folha',fmt(row.irrf)],['Benefícios históricos',ben],['Custo folha + encargos',fmt(row.custoFolha)],['Custo Real',real]].map(function(x){return '<div><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('')+'</div>'
    +'<div class="rh-history-month-foot">'+rhHistoryDeltaHtml(row,prev,'liquido','Variação do líquido')+rhHistoryDeltaHtml(row,prev,'custoFolha','Variação do custo')+'</div>'
    +'<div class="rh-history-detail-actions"><button class="button primary" type="button" data-rh-history-open="'+esc(row.id)+'">Abrir competência</button></div>';
  openGenericDetail('Competência '+formatCompetence(row.competencia),'HISTÓRICO COMPARATIVO',html);
  var b=document.querySelector('[data-rh-history-open="'+CSS.escape(String(row.id))+'"]');if(b)b.onclick=async function(){try{await selectCompetence(row.id);var m=$('rh-detail-modal');if(m)m.hidden=true;go('visao');}catch(e){toast(e.message,true);}};
}
function renderHistory(){
  rhEnsureHistoryUI();rhHistoryPopulateYears();var rows=rhHistoryRows(),k=$('rh-history-kpis'),months=$('rh-history-months'),note=$('rh-history-base-note');if(!k||!months)return;
  if(!rows.length){k.innerHTML='';months.innerHTML='<div class="detail-empty">Nenhuma competência disponível para o período selecionado.</div>';if(note)note.hidden=true;return;}
  var latest=rows[rows.length-1],benefitSnapshots=rows.filter(function(x){return x.beneficios!=null;}).length;
  k.innerHTML=[['Competências',rows.length,'no período'],['Última competência',formatCompetence(latest.competencia),rhAuditStatusLabel(latest.status)],['Pessoas',nfmt(latest.pessoas),'na última competência'],['Custo folha + encargos',fmt(latest.custoFolha),'sem benefício não versionado']].map(function(x){return '<div class="kpi"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong><small>'+esc(x[2])+'</small></div>';}).join('');
  if(note){note.hidden=rows.length>1;note.querySelector('span').textContent=rows.length===1?'O histórico já registra '+formatCompetence(rows[0].competencia)+'. A comparação de variação começa automaticamente na segunda competência.':'';}
  months.innerHTML=rows.slice().reverse().map(function(row,revIndex){var ascIndex=rows.length-1-revIndex,prev=ascIndex>0?rows[ascIndex-1]:null;return '<article class="rh-history-month" role="button" tabindex="0" data-rh-history-index="'+ascIndex+'"><div class="rh-history-month-head"><div><span>Competência</span><strong>'+esc(formatCompetence(row.competencia))+'</strong></div><span class="status '+rhHistoryStatusClass(row.status)+'">'+esc(rhAuditStatusLabel(row.status))+'</span></div><div class="rh-history-month-metrics">'+[['Pessoas',nfmt(row.pessoas)],['Proventos',fmt(row.proventos)],['Descontos',fmt(row.descontos)],['Líquido',fmt(row.liquido)],['Encargos patronais',fmt(row.patronais+row.fgts+row.pis)],['Custo folha',fmt(row.custoFolha)]].map(function(x){return '<div class="rh-history-metric"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('')+'</div><div class="rh-history-month-foot">'+rhHistoryDeltaHtml(row,prev,'liquido','Líquido')+rhHistoryDeltaHtml(row,prev,'custoFolha','Custo')+'</div></article>';}).join('');
  document.querySelectorAll('[data-rh-history-index]').forEach(function(el){var open=function(){var i=Number(el.dataset.rhHistoryIndex),row=rows[i],prev=i>0?rows[i-1]:null;if(row)rhHistoryOpenDetail(row,prev);};el.onclick=open;el.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});
  if($('rh-history-benefit-note'))$('rh-history-benefit-note').hidden=benefitSnapshots===rows.length;
  if(window.Chart){var c=chartColors(),labels=rows.map(function(x){return formatCompetence(x.competencia);});
    chart('chart-history-finance','line',{labels:labels,datasets:[{label:'Proventos',data:rows.map(function(x){return x.proventos;}),borderColor:c.gold,backgroundColor:c.gold,tension:.25,pointRadius:4},{label:'Descontos',data:rows.map(function(x){return x.descontos;}),borderColor:c.red,backgroundColor:c.red,tension:.25,pointRadius:4},{label:'Líquido',data:rows.map(function(x){return x.liquido;}),borderColor:c.emerald,backgroundColor:c.emerald,tension:.25,pointRadius:4}]},{plugins:{legend:{display:true,position:'top'}}},function(e,els){if(els.length){var r=rows[els[0].index];if(r)rhHistoryOpenDetail(r,els[0].index>0?rows[els[0].index-1]:null);}});
    chart('chart-history-charges','bar',{labels:labels,datasets:[{label:'FGTS',data:rows.map(function(x){return x.fgts;}),backgroundColor:c.blue},{label:'Patronais',data:rows.map(function(x){return x.patronais;}),backgroundColor:c.red},{label:'PIS',data:rows.map(function(x){return x.pis;}),backgroundColor:c.emerald},{label:'IRRF folha',data:rows.map(function(x){return x.irrf;}),backgroundColor:c.purple}]},{plugins:{legend:{display:true,position:'top'}}},function(e,els){if(els.length){var r=rows[els[0].index];if(r)rhHistoryOpenDetail(r,els[0].index>0?rows[els[0].index-1]:null);}});
    if($('chart-history-finance'))$('chart-history-finance').style.cursor='pointer';if($('chart-history-charges'))$('chart-history-charges').style.cursor='pointer';
  }
}

var _rhHistorySetupUI=setupUI;
setupUI=function(){_rhHistorySetupUI();rhEnsureHistoryUI();};
var _rhHistoryRenderAll=renderAll;
renderAll=function(){_rhHistoryRenderAll();renderHistory();};
var _rhHistoryApplyTheme=applyTheme;
applyTheme=function(){_rhHistoryApplyTheme();if(S.competencias&&S.competencias.length)setTimeout(function(){try{renderHistory();}catch(e){}},0);};
/* RH & Folha — estabilização da RC de insights */
rhEnsurePersonHistoryUI=function(){
  var page=$('page-historico');
  if(!page&&typeof _rhInsightEnsureHistory==='function'){_rhInsightEnsureHistory();page=$('page-historico');}
  if(!page||$('rh-person-history-panel'))return;
  var panel=document.createElement('article');panel.id='rh-person-history-panel';panel.className='panel';
  panel.innerHTML='<div class="panel-head"><div><span class="panel-kicker">HISTÓRICO INDIVIDUAL</span><h2>Evolução por colaborador</h2></div><label class="rh-scope-label">Colaborador<select id="rh-person-history-select"><option value="">Selecione</option></select></label></div><div id="rh-person-history-empty" class="detail-empty">Selecione um colaborador para acompanhar salário, líquido, encargos, benefícios, custo e movimentações mês a mês.</div><div id="rh-person-history-content" hidden><div class="kpi-grid slim" id="rh-person-history-kpis"></div><div class="chart-wrap tall"><canvas id="chart-person-history"></canvas></div><div id="rh-person-history-months" class="rh-history-months"></div></div>';
  var note=$('rh-history-benefit-note');if(note&&note.parentNode)note.parentNode.insertBefore(panel,note);else page.appendChild(panel);
  var s=$('rh-person-history-select');s.onchange=function(){renderPersonHistory(s.value);};
};

openVinculoBreakdown=function(kind){
  var source=typeof rhScopePeople==='function'?rhScopePeople():S.pessoas;
  var rows=source.filter(function(p){var k=rhVinculoCategory(p);if(kind==='CLT')return k==='clt';if(kind==='Estagiários')return k==='estagiario';return k==='outros';});
  var total=rows.reduce(function(a,p){return a+(Number(p.liquido)||0);},0);
  openGenericDetail(kind,'COLABORADORES POR VÍNCULO','<table class="modal-table-inner responsive-table"><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Líquido</th></tr></thead><tbody>'+rows.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td>'+esc(departmentName(p.departamento))+'</td><td class="money">'+fmt(p.liquido)+'</td></tr>';}).join('')+'</tbody>'+rhFoot(['TOTAL ('+rows.length+' pessoas)','',fmt(total)])+'</table>');
};

rhMovementEvents=function(){
  var rows=(typeof rhScopePeople==='function'?rhScopePeople():S.pessoas).slice(),prev=rhPrevByColaborador(),month=rhMovementCurrentMonth(),events=[];
  rows.forEach(function(p){
    var dep=rhMovementDept(p),vinc=rhMovementVinc(p),cargo=rhMovementCargo(p),sit=rhMovementSituacao(p),adm=rhMovementAdmission(p),base={person:p,dep:dep,vinc:vinc,cargo:cargo,sit:sit};
    var isDismiss=/demit|deslig|rescis/.test(cleanSearch(sit));
    if(adm&&rhMovementMonth(adm)===month)events.push(Object.assign({},base,{tipo:'Admissão',classe:'success',data:adm,detalhe:'Entrada na competência'}));
    if(isDismiss)events.push(Object.assign({},base,{tipo:'Desligamento',classe:'danger',data:S.competencia.competencia,detalhe:'Situação: '+sit}));
    var rub=(p.lancamentos||[]).map(function(x){return cleanSearch(x.rubrica_nome||x.nome||'');}).join(' | ');
    var regularVacation=/(dias ferias|adiantamento de ferias|inss ferias|irrf ferias|dias abono pecuniario|1\/3 do abono ferias)/.test(rub);
    if(/ferias/.test(cleanSearch(sit))||regularVacation)events.push(Object.assign({},base,{tipo:'Férias',classe:'',data:S.competencia.competencia,detalhe:'Identificado pela situação/rubricas regulares da competência'}));
    if(/afast|licenca|auxilio doenca|auxilio-doenca/.test(cleanSearch(sit)))events.push(Object.assign({},base,{tipo:'Afastamento',classe:'',data:S.competencia.competencia,detalhe:'Situação: '+sit}));
    var old=prev[String(p.colaborador_id||'')];
    if(old){
      var oldDep=departmentName(rhFolhaSnap(old,'departamento','—')),oldVinc=rhFolhaSnap(old,'vinculo','—')||'—',oldCargo=rhFolhaSnap(old,'cargo','—')||'—',changes=[];
      if(rhDeptKey(oldDep)!==rhDeptKey(dep))changes.push('Departamento: '+oldDep+' → '+dep);
      if(cleanSearch(oldVinc)!==cleanSearch(vinc))changes.push('Vínculo: '+oldVinc+' → '+vinc);
      if(cleanSearch(oldCargo)!==cleanSearch(cargo))changes.push('Cargo: '+oldCargo+' → '+cargo);
      if(changes.length)events.push(Object.assign({},base,{tipo:'Transferência / Alteração',classe:'',data:S.competencia.competencia,detalhe:changes.join(' · ')}));
    }
  });
  var order={'Desligamento':0,'Admissão':1,'Férias':2,'Afastamento':3,'Transferência / Alteração':4};
  return events.sort(function(a,b){var oa=Object.prototype.hasOwnProperty.call(order,a.tipo)?order[a.tipo]:9,ob=Object.prototype.hasOwnProperty.call(order,b.tipo)?order[b.tipo]:9,x=oa-ob;return x||String(a.person.nome||'').localeCompare(String(b.person.nome||''),'pt-BR',{sensitivity:'base'});});
};
/* RH & Folha — Release Candidate: indicadores executivos, variações e histórico individual */
S.rhHistoryFolhas=S.rhHistoryFolhas||[];
S.rhHistoryFolhasLoaded=false;
S.rhPersonBenefitsHistory={};

function rhInsightCost(p){var c=custoEmpresa(p),benef=0,charges=0;c.itens.forEach(function(it){if(it[2]==='benefício')benef+=Number(it[1])||0;else if(cleanSearch(it[0])!=='proventos brutos')charges+=Number(it[1])||0;});return {total:c.total,beneficios:benef,encargos:charges,proventos:Number(p.proventos)||0};}
function rhInsightRows(){return typeof rhScopePeople==='function'?rhScopePeople():S.pessoas;}
function rhInsightAggregate(rows){var t={pessoas:rows.length,proventos:0,encargos:0,beneficios:0,total:0,clt:{n:0,total:0},estagiario:{n:0,total:0},outros:{n:0,total:0}};rows.forEach(function(p){var c=rhInsightCost(p),k=rhVinculoCategory(p);t.proventos+=c.proventos;t.encargos+=c.encargos;t.beneficios+=c.beneficios;t.total+=c.total;t[k].n++;t[k].total+=c.total;});return t;}
function rhPct(n,d){return d?((Number(n)||0)/(Number(d)||0)*100):0;}
function rhAvg(total,n){return n?(Number(total)||0)/n:0;}
function rhVarLabel(key){return {proventos:'Proventos',descontos:'Descontos',liquido:'Líquido',fgts:'FGTS',patronais:'Encargos patronais',pis:'PIS',irrf:'IRRF',pessoas:'Headcount',custoFolha:'Custo folha + encargos'}[key]||key;}
function rhVarianceSummary(){var rows=typeof rhHistoryAllRows==='function'?rhHistoryAllRows():[];if(rows.length<2)return[];var cur=rows[rows.length-1],prev=rows[rows.length-2],keys=['proventos','descontos','liquido','fgts','patronais','pis','irrf','pessoas','custoFolha'];return keys.map(function(k){var a=Number(cur[k])||0,b=Number(prev[k])||0,d=a-b,p=b?d/Math.abs(b)*100:null;return {key:k,label:rhVarLabel(k),atual:a,anterior:b,diff:d,pct:p};}).sort(function(a,b){var aa=a.pct==null?Math.abs(a.diff):Math.abs(a.pct),bb=b.pct==null?Math.abs(b.diff):Math.abs(b.pct);return bb-aa;});}

async function rhLoadHistoryFolhas(){
  if(S.rhHistoryFolhasLoaded)return S.rhHistoryFolhas;
  if(!(can('ver_valores_individuais')||canAdmin()))return[];
  try{S.rhHistoryFolhas=await api('rh_folha_colaboradores?select=*');S.rhHistoryFolhasLoaded=true;}catch(e){S.rhHistoryFolhas=[];}
  return S.rhHistoryFolhas;
}
function rhFolhasByComp(){var m={};(S.rhHistoryFolhas||[]).forEach(function(f){(m[String(f.competencia_id)]||(m[String(f.competencia_id)]=[])).push(f);});return m;}
function rhDepartmentVariance(){var hist=typeof rhHistoryAllRows==='function'?rhHistoryAllRows():[],by=rhFolhasByComp();if(hist.length<2||!S.rhHistoryFolhasLoaded)return null;var cur=hist[hist.length-1],prev=hist[hist.length-2];function agg(id){var m={};(by[String(id)]||[]).forEach(function(f){var dep=departmentName(rhFolhaSnap(f,'departamento','—'));m[dep]=(m[dep]||0)+(Number(f.proventos)||0);});return m;}var a=agg(cur.id),b=agg(prev.id),names={};Object.keys(a).concat(Object.keys(b)).forEach(function(n){names[n]=1;});var list=Object.keys(names).map(function(n){var av=a[n]||0,bv=b[n]||0;return {nome:n,diff:av-bv,atual:av,anterior:bv};}).sort(function(x,y){return Math.abs(y.diff)-Math.abs(x.diff);});return list[0]||null;}

function rhEnsureInsightsUI(){
  var nav=$('nav');if(nav&&!document.querySelector('[data-view="indicadores"]')){var b=document.createElement('button');b.className='nav-item';b.dataset.view='indicadores';b.innerHTML='<span>◆</span>Indicadores';var anchor=document.querySelector('[data-view="historico"]');if(anchor&&anchor.nextSibling)nav.insertBefore(b,anchor.nextSibling);else nav.appendChild(b);b.onclick=function(){go('indicadores');renderInsights();};}
  if(!$('page-indicadores')){var page=document.createElement('section');page.className='page';page.id='page-indicadores';page.innerHTML='<div class="page-head"><div><span class="eyebrow">GESTÃO DE PESSOAS</span><h1>Indicadores executivos</h1><p>Custo médio, encargos, benefícios, vínculos e variações relevantes.</p></div></div><div class="kpi-grid" id="rh-insight-kpis"></div><div class="grid two"><article class="panel"><div class="panel-head"><div><span class="panel-kicker">DEPARTAMENTOS</span><h2>Custo Real por departamento</h2></div></div><div class="chart-wrap tall"><canvas id="chart-insight-dept"></canvas></div></article><article class="panel"><div class="panel-head"><div><span class="panel-kicker">VÍNCULOS</span><h2>Custo médio por vínculo</h2></div></div><div class="chart-wrap tall"><canvas id="chart-insight-vinc"></canvas></div></article></div><article class="panel"><div class="panel-head"><div><span class="panel-kicker">VARIAÇÕES</span><h2>Principais mudanças contra a competência anterior</h2></div><span class="source-badge" id="rh-variance-period">—</span></div><div id="rh-variance-list" class="reconciliation-list"></div></article></section>';var content=document.querySelector('#app .content')||document.querySelector('#app main')||$('app');content.appendChild(page);if(typeof rhCreateScreenFilters==='function'){rhCreateScreenFilters('page-indicadores');rhPopulateScopeControls();rhEnsureScopeFilters();}}
  if(!$('_rh_insights_style')){var st=document.createElement('style');st.id='_rh_insights_style';st.textContent='#rh-insight-kpis{grid-template-columns:repeat(6,minmax(0,1fr))}.rh-variance-value{font-weight:900;white-space:nowrap}.rh-variance-up{color:var(--gold)}.rh-variance-down{color:var(--blue)}@media(max-width:1250px){#rh-insight-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:680px){#rh-insight-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}';document.head.appendChild(st);}
}
function renderInsights(){
  rhEnsureInsightsUI();if(!S.competencia)return;var rows=rhInsightRows(),t=rhInsightAggregate(rows),k=$('rh-insight-kpis');if(!k)return;
  var chargesPct=rhPct(t.encargos,t.proventos),benefPct=rhPct(t.beneficios,t.total);
  k.innerHTML=[['Custo médio / pessoa',fmt(rhAvg(t.total,t.pessoas)),t.pessoas+' pessoas'],['Encargos / proventos',chargesPct.toFixed(1).replace('.',',')+'%','FGTS + patronais + PIS'],['Benefícios / custo',benefPct.toFixed(1).replace('.',',')+'%',S.rhBenefitSnapshotActive?'snapshot mensal':'base integrada atual'],['Média CLT',fmt(rhAvg(t.clt.total,t.clt.n)),t.clt.n+' pessoas'],['Média Estagiário',fmt(rhAvg(t.estagiario.total,t.estagiario.n)),t.estagiario.n+' pessoas'],['Custo total filtrado',fmt(t.total),'competência '+formatCompetence(S.competencia.competencia)]].map(function(x){return '<div class="kpi"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong><small>'+esc(x[2])+'</small></div>';}).join('');
  var dm={},vm={clt:{label:'CLT',n:0,total:0},estagiario:{label:'Estagiários',n:0,total:0},outros:{label:'Outros',n:0,total:0}};rows.forEach(function(p){var dep=departmentName(p.departamento),c=rhInsightCost(p),v=rhVinculoCategory(p);if(!dm[dep])dm[dep]={nome:dep,total:0};dm[dep].total+=c.total;vm[v].n++;vm[v].total+=c.total;});var deps=Object.keys(dm).map(function(x){return dm[x];}).sort(function(a,b){return b.total-a.total;});
  if(window.Chart){var c=chartColors();chart('chart-insight-dept','bar',{labels:deps.map(function(x){return x.nome;}),datasets:[{label:'Custo Real',data:deps.map(function(x){return x.total;}),backgroundColor:c.emerald,borderRadius:7}]},{indexAxis:'y',plugins:{legend:{display:false}}},function(e,els){if(els.length&&deps[els[0].index])openDepartmentBreakdown(deps[els[0].index].nome);});var vv=[vm.clt,vm.estagiario,vm.outros];chart('chart-insight-vinc','bar',{labels:vv.map(function(x){return x.label;}),datasets:[{label:'Custo médio',data:vv.map(function(x){return rhAvg(x.total,x.n);}),backgroundColor:[c.blue,c.gold,c.purple],borderRadius:7}]},{plugins:{legend:{display:false}}},function(e,els){if(els.length)openVinculoBreakdown(['CLT','Estagiários','Outros'][els[0].index]);});}
  var vars=rhVarianceSummary(),list=$('rh-variance-list'),period=$('rh-variance-period'),hist=typeof rhHistoryAllRows==='function'?rhHistoryAllRows():[];
  if(hist.length<2){period.textContent='A partir da 2ª competência';list.innerHTML='<div class="reconciliation-item"><span class="check">i</span><span><b>Junho é a competência-base</b><small>As variações aparecem automaticamente após a próxima importação.</small></span><span class="status">Base inicial</span></div>';}
  else{period.textContent=formatCompetence(hist[hist.length-2].competencia)+' → '+formatCompetence(hist[hist.length-1].competencia);var dv=rhDepartmentVariance(),show=vars.slice(0,5);if(dv)show.push({label:'Departamento com maior variação',diff:dv.diff,pct:dv.anterior?dv.diff/Math.abs(dv.anterior)*100:null,detail:dv.nome});list.innerHTML=show.map(function(v){var up=v.diff>0,down=v.diff<0,cls=up?'rh-variance-up':(down?'rh-variance-down':''),pct=v.pct==null?'':(' · '+Math.abs(v.pct).toFixed(1).replace('.',',')+'%');return '<div class="reconciliation-item"><span class="check">'+(up?'↑':(down?'↓':'→'))+'</span><span><b>'+esc(v.label)+'</b><small>'+esc(v.detail||'Comparação contra a competência anterior')+'</small></span><span class="rh-variance-value '+cls+'">'+(v.key==='pessoas'?nfmt(Math.abs(v.diff)):fmt(Math.abs(v.diff)))+pct+'</span></div>';}).join('');}
}

function rhEnsurePersonHistoryUI(){
  if(typeof rhEnsureHistoryUI==='function')rhEnsureHistoryUI();var page=$('page-historico');if(!page||$('rh-person-history-panel'))return;var panel=document.createElement('article');panel.id='rh-person-history-panel';panel.className='panel';panel.innerHTML='<div class="panel-head"><div><span class="panel-kicker">HISTÓRICO INDIVIDUAL</span><h2>Evolução por colaborador</h2></div><label class="rh-scope-label">Colaborador<select id="rh-person-history-select"><option value="">Selecione</option></select></label></div><div id="rh-person-history-empty" class="detail-empty">Selecione um colaborador para acompanhar salário, líquido, encargos, benefícios, custo e movimentações mês a mês.</div><div id="rh-person-history-content" hidden><div class="kpi-grid slim" id="rh-person-history-kpis"></div><div class="chart-wrap tall"><canvas id="chart-person-history"></canvas></div><div id="rh-person-history-months" class="rh-history-months"></div></div>';var note=$('rh-history-benefit-note');if(note&&note.parentNode)note.parentNode.insertBefore(panel,note);else page.appendChild(panel);var s=$('rh-person-history-select');s.onchange=function(){renderPersonHistory(s.value);};
}
function rhPopulatePersonHistory(){rhEnsurePersonHistoryUI();var s=$('rh-person-history-select');if(!s)return;var cur=s.value,people=(S.colaboradores||[]).slice().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});s.innerHTML='<option value="">Selecione</option>'+people.map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.nome)+'</option>';}).join('');if(cur&&people.some(function(p){return String(p.id)===String(cur);}))s.value=cur;}
async function rhPersonBenefitHistory(id){if(S.rhPersonBenefitsHistory[id])return S.rhPersonBenefitsHistory[id];try{var rows=await api('rh_beneficios_snapshots?colaborador_id=eq.'+encodeURIComponent(id)+'&select=*');S.rhPersonBenefitsHistory[id]=rows||[];}catch(e){S.rhPersonBenefitsHistory[id]=[];}return S.rhPersonBenefitsHistory[id];}
async function renderPersonHistory(id){
  var empty=$('rh-person-history-empty'),content=$('rh-person-history-content');if(!id){empty.hidden=false;content.hidden=true;return;}empty.hidden=true;content.hidden=false;await rhLoadHistoryFolhas();var ben=await rhPersonBenefitHistory(id),bmap={};ben.forEach(function(x){bmap[String(x.competencia_id)]=x;});var compMap={};(S.competencias||[]).forEach(function(c){compMap[String(c.id)]=c;});var byComp=rhFolhasByComp(),rows=(S.rhHistoryFolhas||[]).filter(function(f){return String(f.colaborador_id)===String(id);}).map(function(f){var c=compMap[String(f.competencia_id)]||{},all=byComp[String(f.competencia_id)]||[],baseAll=all.reduce(function(a,x){return a+(Number(x.base_inss)||0);},0),fgAll=all.reduce(function(a,x){return a+(Number(x.base_fgts)||0);},0),e=c.encargos||{},baseTotal=Number(e.base_total_inss)||0,patTotal=baseTotal*.20+(Number(e.rat)||(baseTotal*.01))+(Number(e.terceiros)||(baseTotal*.058)),pat=baseAll?patTotal*(Number(f.base_inss)||0)/baseAll:0,pisTotal=Number(e.valor_pis)||0,pis=fgAll?pisTotal*(Number(f.base_fgts)||0)/fgAll:0,b=bmap[String(f.competencia_id)],benef=b?Number(b.total)||0:0,total=(Number(f.proventos)||0)+(Number(f.valor_fgts)||0)+pat+pis+benef;return {f:f,c:c,benef:b?benef:null,total:total,encargos:(Number(f.valor_fgts)||0)+pat+pis};}).sort(function(a,b){return String(a.c.competencia||'').localeCompare(String(b.c.competencia||''));});
  if(!rows.length){empty.hidden=false;empty.textContent='Sem histórico individual disponível para este colaborador.';content.hidden=true;return;}var last=rows[rows.length-1];$('rh-person-history-kpis').innerHTML=[['Competências',rows.length],['Último provento',fmt(last.f.proventos)],['Último líquido',fmt(last.f.liquido)],['Último custo',fmt(last.total)]].map(function(x){return '<div class="kpi"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('');
  if(window.Chart){var cc=chartColors();chart('chart-person-history','line',{labels:rows.map(function(x){return formatCompetence(x.c.competencia);}),datasets:[{label:'Proventos',data:rows.map(function(x){return Number(x.f.proventos)||0;}),borderColor:cc.gold,backgroundColor:cc.gold,tension:.25},{label:'Líquido',data:rows.map(function(x){return Number(x.f.liquido)||0;}),borderColor:cc.emerald,backgroundColor:cc.emerald,tension:.25},{label:'Custo',data:rows.map(function(x){return x.total;}),borderColor:cc.red,backgroundColor:cc.red,tension:.25}]},{plugins:{legend:{display:true,position:'top'}}},function(e,els){if(els.length){var r=rows[els[0].index];if(r){selectCompetence(r.c.id).then(function(){go('custoreal');});}}});}
  $('rh-person-history-months').innerHTML=rows.slice().reverse().map(function(x){return '<div class="rh-history-month"><div class="rh-history-month-head"><div><span>Competência</span><strong>'+esc(formatCompetence(x.c.competencia))+'</strong></div><span class="status">'+esc(rhAuditStatusLabel(x.c.status))+'</span></div><div class="rh-history-month-metrics">'+[['Departamento',departmentName(rhFolhaSnap(x.f,'departamento','—'))],['Vínculo',rhFolhaSnap(x.f,'vinculo','—')],['Proventos',fmt(x.f.proventos)],['Líquido',fmt(x.f.liquido)],['Encargos',fmt(x.encargos)],['Benefícios',x.benef==null?'Não versionado':fmt(x.benef)],['Custo total',fmt(x.total)]].map(function(m){return '<div class="rh-history-metric"><span>'+esc(m[0])+'</span><strong>'+esc(m[1])+'</strong></div>';}).join('')+'</div></div>';}).join('');
}

var _rhInsightEnsureHistory=rhEnsureHistoryUI;
rhEnsureHistoryUI=function(){_rhInsightEnsureHistory();rhEnsurePersonHistoryUI();rhPopulatePersonHistory();};
var _rhInsightRenderHistory=renderHistory;
renderHistory=function(){_rhInsightRenderHistory();rhPopulatePersonHistory();rhLoadHistoryFolhas().then(function(){if(S.view==='indicadores')renderInsights();});};
var _rhInsightRefreshScope=rhRefreshScope;
rhRefreshScope=function(){_rhInsightRefreshScope();if(S.view==='indicadores')renderInsights();};
var _rhInsightRenderAll=renderAll;
renderAll=function(){_rhInsightRenderAll();rhEnsureInsightsUI();if(S.view==='indicadores')renderInsights();rhPopulatePersonHistory();};
var _rhInsightSetup=setupUI;
setupUI=function(){_rhInsightSetup();rhEnsureInsightsUI();rhEnsurePersonHistoryUI();rhLoadHistoryFolhas();};
/* RH & Folha — Release Candidate: interatividade executiva e modos de gráficos */
S.rhChartModes=S.rhChartModes||{};

function rhInterModeOptions(){
  return [
    ['auto','Automático'],
    ['columns','Colunas'],
    ['bars','Barras'],
    ['ranking','Ranking'],
    ['line','Linha'],
    ['pie','Pizza']
  ];
}
function rhInterEnsureMode(canvasId,onchange){
  var canvas=$(canvasId);if(!canvas)return null;
  var panel=canvas.closest('.panel');if(!panel)return null;
  var head=panel.querySelector('.panel-head');if(!head)return null;
  var id='rh-mode-'+canvasId,sel=$(id);
  if(!sel){
    var wrap=document.createElement('label');
    wrap.className='rh-chart-mode';
    wrap.innerHTML='<span>Gráfico</span><select id="'+esc(id)+'">'+rhInterModeOptions().map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>';}).join('')+'</select>';
    head.appendChild(wrap);sel=$(id);
  }
  sel.value=S.rhChartModes[canvasId]||'auto';
  sel.onchange=function(){S.rhChartModes[canvasId]=sel.value;if(onchange)onchange();};
  return sel;
}
function rhInterResolvedMode(canvasId,autoMode){
  var m=S.rhChartModes[canvasId]||'auto';return m==='auto'?autoMode:m;
}
function rhInterPalette(){
  var c=chartColors();return [c.blue,c.gold,c.emerald,c.red,c.purple,c.orange,'#0ea5e9','#14b8a6','#f97316','#8b5cf6','#ec4899','#64748b'];
}
function rhInterOpen(title,kicker,headers,rows,footer,subtitle){
  rows=rows||[];headers=headers||[];
  var cols=headers.length||2;
  var tpl=cols===1?'1fr':(cols===2?'minmax(0,1fr) minmax(120px,.45fr)':('repeat('+cols+',minmax(0,1fr))'));
  var html=(subtitle?'<p class="rh-comp-sub">'+esc(subtitle)+'</p>':'')
    +'<div class="rh-comp-table" style="--rh-comp-cols:'+tpl+'">'
    +'<div class="rh-comp-row rh-comp-header">'+headers.map(function(h){return '<div>'+esc(h)+'</div>';}).join('')+'</div>'
    +(rows.length?rows.map(function(r){return '<div class="rh-comp-row">'+r.map(function(v,i){return '<div class="rh-comp-cell" data-label="'+esc(headers[i]||'')+'">'+esc(v==null?'—':v)+'</div>';}).join('')+'</div>';}).join(''):'<div class="detail-empty">Sem dados para a composição selecionada.</div>')
    +(footer?'<div class="rh-comp-row rh-comp-total">'+footer.map(function(v,i){return '<div class="rh-comp-cell" data-label="'+esc(headers[i]||'')+'">'+esc(v==null?'':v)+'</div>';}).join('')+'</div>':'')
    +'</div>';
  openGenericDetail(title,kicker||'COMPOSIÇÃO',html);
}
function rhInterCardify(container,handlers){
  var box=$(container);if(!box)return;
  Array.prototype.forEach.call(box.querySelectorAll('.kpi'),function(card,i){
    var fn=handlers[i];if(!fn)return;
    card.classList.add('rh-clickable-kpi');card.setAttribute('role','button');card.setAttribute('tabindex','0');
    card.onclick=fn;card.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}};
    var small=card.querySelector('small');
    if(small&&!small.querySelector('.rh-click-hint'))small.innerHTML+=' <span class="rh-click-hint">· clique para composição</span>';
  });
}
function rhInterPersonRows(rows,kind){
  return (rows||[]).slice().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});}).map(function(p){
    var c=rhInsightCost(p),dept=departmentName(p.departamento),vinc=rhVinculoCategory(p);
    var vlabel={clt:'CLT',estagiario:'Estagiário',outros:'Outros'}[vinc]||vinc;
    if(kind==='proventos')return [p.nome,dept,fmt(p.proventos)];
    if(kind==='liquido')return [p.nome,dept,fmt(p.liquido)];
    if(kind==='encargos')return [p.nome,dept,fmt(c.encargos)];
    if(kind==='beneficios')return [p.nome,dept,fmt(c.beneficios)];
    return [p.nome,dept+' · '+vlabel,fmt(c.total)];
  });
}
function rhInterSum(rows,key){
  return (rows||[]).reduce(function(a,p){var c=rhInsightCost(p);if(key==='proventos')return a+(Number(p.proventos)||0);if(key==='liquido')return a+(Number(p.liquido)||0);if(key==='encargos')return a+c.encargos;if(key==='beneficios')return a+c.beneficios;return a+c.total;},0);
}
function rhInterOpenPeopleMetric(title,rows,kind,subtitle){
  var total=rhInterSum(rows,kind);
  rhInterOpen(title,'COMPOSIÇÃO POR COLABORADOR',['Colaborador','Departamento / vínculo','Valor'],rhInterPersonRows(rows,kind),['TOTAL',rows.length+' pessoas',fmt(total)],subtitle);
}
function rhInterOpenRatio(title,rows,leftKey,rightKey,labelLeft,labelRight){
  var out=[],a=0,b=0;
  (rows||[]).slice().sort(function(x,y){return String(x.nome||'').localeCompare(String(y.nome||''),'pt-BR',{sensitivity:'base'});}).forEach(function(p){
    var c=rhInsightCost(p),lv=leftKey==='proventos'?(Number(p.proventos)||0):(leftKey==='beneficios'?c.beneficios:(leftKey==='encargos'?c.encargos:c.total));
    var rv=rightKey==='proventos'?(Number(p.proventos)||0):(rightKey==='beneficios'?c.beneficios:(rightKey==='encargos'?c.encargos:c.total));
    a+=lv;b+=rv;out.push([p.nome,fmt(lv),fmt(rv),rv?(lv/rv*100).toFixed(1).replace('.',',')+'%':'—']);
  });
  rhInterOpen(title,'COMPOSIÇÃO E CONFERÊNCIA',['Colaborador',labelLeft,labelRight,'%'],out,['TOTAL',fmt(a),fmt(b),b?(a/b*100).toFixed(1).replace('.',',')+'%':'—']);
}

/* Histórico */
function rhInterHistoryCards(){
  var rows=rhHistoryRows();if(!rows.length)return;var latest=rows[rows.length-1];
  rhInterCardify('rh-history-kpis',[
    function(){
      rhInterOpen('Competências do período','HISTÓRICO',['Competência','Status','Pessoas','Custo folha'],rows.map(function(r){return [formatCompetence(r.competencia),rhAuditStatusLabel(r.status),nfmt(r.pessoas),fmt(r.custoFolha)];}),['TOTAL',rows.length+' competências','—',fmt(rows.reduce(function(a,r){return a+r.custoFolha;},0))]);
    },
    function(){
      var vals=[['Proventos',fmt(latest.proventos)],['Descontos',fmt(latest.descontos)],['Líquido',fmt(latest.liquido)],['FGTS',fmt(latest.fgts)],['Encargos patronais',fmt(latest.patronais)],['PIS',fmt(latest.pis)],['IRRF folha',fmt(latest.irrf)],['Benefícios históricos',rhHistoryMoneyMaybe(latest.beneficios)]];
      rhInterOpen('Competência '+formatCompetence(latest.competencia),'RESUMO DA COMPETÊNCIA',['Indicador','Valor'],vals,['TOTAL CUSTO FOLHA + ENCARGOS',fmt(latest.custoFolha)]);
    },
    function(){
      rhInterOpen('Pessoas por competência','HEADCOUNT',['Competência','Pessoas'],rows.map(function(r){return [formatCompetence(r.competencia),nfmt(r.pessoas)];}),['ÚLTIMA COMPETÊNCIA',nfmt(latest.pessoas)],'O total final representa o headcount da competência mais recente, evitando somar a mesma pessoa em meses diferentes.');
    },
    function(){
      rhInterOpen('Custo folha + encargos','COMPOSIÇÃO HISTÓRICA',['Competência','Proventos','FGTS + patronais + PIS','Custo'],rows.map(function(r){return [formatCompetence(r.competencia),fmt(r.proventos),fmt(r.fgts+r.patronais+r.pis),fmt(r.custoFolha)];}),['TOTAL DO PERÍODO','—','—',fmt(rows.reduce(function(a,r){return a+r.custoFolha;},0))]);
    }
  ]);
}
function rhInterRenderHistoryCharts(){
  if(!window.Chart)return;var rows=rhHistoryRows();if(!rows.length)return;
  rhInterEnsureMode('chart-history-finance',function(){rhInterRenderHistoryCharts();});
  rhInterEnsureMode('chart-history-charges',function(){rhInterRenderHistoryCharts();});
  var c=chartColors();
  var financeMode=rhInterResolvedMode('chart-history-finance','line');
  if(financeMode==='pie'){
    var r=rows[rows.length-1];
    chart('chart-history-finance','doughnut',{labels:['Líquido','Descontos'],datasets:[{label:'Composição dos proventos',data:[r.liquido,r.descontos],backgroundColor:[c.emerald,c.red]}]},{plugins:{legend:{display:true,position:'top'}}},function(){rhHistoryOpenDetail(r,rows.length>1?rows[rows.length-2]:null);});
  }else{
    var frows=rows.slice(),ftype=financeMode==='line'?'line':'bar';
    if(financeMode==='ranking')frows.sort(function(a,b){return b.proventos-a.proventos;});
    var fdata={labels:frows.map(function(x){return formatCompetence(x.competencia);}),datasets:[
      {label:'Proventos',data:frows.map(function(x){return x.proventos;}),borderColor:c.gold,backgroundColor:c.gold,tension:.25,pointRadius:4,borderRadius:6},
      {label:'Descontos',data:frows.map(function(x){return x.descontos;}),borderColor:c.red,backgroundColor:c.red,tension:.25,pointRadius:4,borderRadius:6},
      {label:'Líquido',data:frows.map(function(x){return x.liquido;}),borderColor:c.emerald,backgroundColor:c.emerald,tension:.25,pointRadius:4,borderRadius:6}
    ]};
    var fopt={plugins:{legend:{display:true,position:'top'}}};if(financeMode==='bars'||financeMode==='ranking')fopt.indexAxis='y';
    chart('chart-history-finance',ftype,fdata,fopt,function(e,els){if(els.length){var rr=frows[els[0].index],i=rows.indexOf(rr);rhHistoryOpenDetail(rr,i>0?rows[i-1]:null);}});
  }
  var chargeMode=rhInterResolvedMode('chart-history-charges','columns');
  if(chargeMode==='pie'){
    var cr=rows[rows.length-1];
    chart('chart-history-charges','doughnut',{labels:['FGTS','Patronais','PIS','IRRF folha'],datasets:[{label:'Recolhimentos',data:[cr.fgts,cr.patronais,cr.pis,cr.irrf],backgroundColor:[c.blue,c.red,c.emerald,c.gold]}]},{plugins:{legend:{display:true,position:'top'}}},function(){rhHistoryOpenDetail(cr,rows.length>1?rows[rows.length-2]:null);});
  }else{
    var crows=rows.slice(),ctype=chargeMode==='line'?'line':'bar';if(chargeMode==='ranking')crows.sort(function(a,b){return (b.fgts+b.patronais+b.pis+b.irrf)-(a.fgts+a.patronais+a.pis+a.irrf);});
    var cd={labels:crows.map(function(x){return formatCompetence(x.competencia);}),datasets:[
      {label:'FGTS',data:crows.map(function(x){return x.fgts;}),backgroundColor:c.blue,borderColor:c.blue,borderRadius:6},
      {label:'Patronais',data:crows.map(function(x){return x.patronais;}),backgroundColor:c.red,borderColor:c.red,borderRadius:6},
      {label:'PIS',data:crows.map(function(x){return x.pis;}),backgroundColor:c.emerald,borderColor:c.emerald,borderRadius:6},
      {label:'IRRF folha',data:crows.map(function(x){return x.irrf;}),backgroundColor:c.gold,borderColor:c.gold,borderRadius:6}
    ]};
    var co={plugins:{legend:{display:true,position:'top'}}};if(chargeMode==='bars'||chargeMode==='ranking')co.indexAxis='y';
    chart('chart-history-charges',ctype,cd,co,function(e,els){if(els.length){var rr=crows[els[0].index],i=rows.indexOf(rr);rhHistoryOpenDetail(rr,i>0?rows[i-1]:null);}});
  }
}
var _rhInterRenderHistory=renderHistory;
renderHistory=function(){_rhInterRenderHistory();rhInterHistoryCards();rhInterRenderHistoryCharts();};

/* Indicadores */
function rhInterIndicatorCards(){
  var rows=rhInsightRows(),t=rhInsightAggregate(rows);
  var clt=rows.filter(function(p){return rhVinculoCategory(p)==='clt';}),est=rows.filter(function(p){return rhVinculoCategory(p)==='estagiario';});
  rhInterCardify('rh-insight-kpis',[
    function(){rhInterOpenPeopleMetric('Custo médio por pessoa',rows,'total','Média: '+fmt(rhAvg(t.total,t.pessoas)));},
    function(){rhInterOpenRatio('Encargos / proventos',rows,'encargos','proventos','Encargos','Proventos');},
    function(){rhInterOpenRatio('Benefícios / Custo Real',rows,'beneficios','total','Benefícios','Custo Real');},
    function(){rhInterOpenPeopleMetric('Média CLT',clt,'total','Média: '+fmt(rhAvg(t.clt.total,t.clt.n)));},
    function(){rhInterOpenPeopleMetric('Média Estagiário',est,'total','Média: '+fmt(rhAvg(t.estagiario.total,t.estagiario.n)));},
    function(){rhInterOpenPeopleMetric('Custo total filtrado',rows,'total','Departamento e vínculo ativos são respeitados nesta composição.');}
  ]);
}
function rhInterRenderInsightsCharts(){
  if(!window.Chart)return;var rows=rhInsightRows(),dm={},vm={clt:{label:'CLT',n:0,total:0},estagiario:{label:'Estagiários',n:0,total:0},outros:{label:'Outros',n:0,total:0}};
  rows.forEach(function(p){var dep=departmentName(p.departamento),co=rhInsightCost(p),v=rhVinculoCategory(p);if(!dm[dep])dm[dep]={nome:dep,total:0};dm[dep].total+=co.total;vm[v].n++;vm[v].total+=co.total;});
  var deps=Object.keys(dm).map(function(k){return dm[k];}),vv=[vm.clt,vm.estagiario,vm.outros],pal=rhInterPalette(),c=chartColors();
  rhInterEnsureMode('chart-insight-dept',function(){rhInterRenderInsightsCharts();});
  rhInterEnsureMode('chart-insight-vinc',function(){rhInterRenderInsightsCharts();});
  var dmde=rhInterResolvedMode('chart-insight-dept','ranking'),depRows=deps.slice();
  if(dmde==='ranking')depRows.sort(function(a,b){return b.total-a.total;});
  if(dmde==='pie'){
    chart('chart-insight-dept','doughnut',{labels:depRows.map(function(x){return x.nome;}),datasets:[{label:'Custo Real',data:depRows.map(function(x){return x.total;}),backgroundColor:depRows.map(function(x,i){return pal[i%pal.length];})}]},{plugins:{legend:{display:true,position:'top'}}},function(e,els){if(els.length)openDepartmentBreakdown(depRows[els[0].index].nome);});
  }else{
    var dt=dmde==='line'?'line':'bar',dop={plugins:{legend:{display:false}}};if(dmde==='bars'||dmde==='ranking')dop.indexAxis='y';
    chart('chart-insight-dept',dt,{labels:depRows.map(function(x){return x.nome;}),datasets:[{label:'Custo Real',data:depRows.map(function(x){return x.total;}),backgroundColor:c.emerald,borderColor:c.emerald,borderRadius:7,tension:.2}]},dop,function(e,els){if(els.length)openDepartmentBreakdown(depRows[els[0].index].nome);});
  }
  var vmde=rhInterResolvedMode('chart-insight-vinc','columns'),vrows=vv.slice();if(vmde==='ranking')vrows.sort(function(a,b){return rhAvg(b.total,b.n)-rhAvg(a.total,a.n);});
  if(vmde==='pie'){
    chart('chart-insight-vinc','doughnut',{labels:vrows.map(function(x){return x.label;}),datasets:[{label:'Custo médio',data:vrows.map(function(x){return rhAvg(x.total,x.n);}),backgroundColor:vrows.map(function(x,i){return pal[i%pal.length];})}]},{plugins:{legend:{display:true,position:'top'}}},function(e,els){if(els.length)openVinculoBreakdown(vrows[els[0].index].label);});
  }else{
    var vt=vmde==='line'?'line':'bar',vop={plugins:{legend:{display:false}}};if(vmde==='bars'||vmde==='ranking')vop.indexAxis='y';
    chart('chart-insight-vinc',vt,{labels:vrows.map(function(x){return x.label;}),datasets:[{label:'Custo médio',data:vrows.map(function(x){return rhAvg(x.total,x.n);}),backgroundColor:[c.blue,c.gold,c.purple],borderColor:c.blue,borderRadius:7,tension:.2}]},vop,function(e,els){if(els.length)openVinculoBreakdown(vrows[els[0].index].label);});
  }
}
var _rhInterRenderInsights=renderInsights;
renderInsights=function(){_rhInterRenderInsights();rhInterIndicatorCards();rhInterRenderInsightsCharts();};

/* Dossiê */
function rhInterEnsureDossierCharts(){
  if($('rh-dossier-chart-grid'))return;
  var k=$('rh-dossier-kpis');if(!k||!k.parentNode)return;
  var wrap=document.createElement('div');wrap.id='rh-dossier-chart-grid';wrap.className='grid two rh-dossier-chart-grid';
  wrap.innerHTML='<article class="panel"><div class="panel-head"><div><span class="panel-kicker">DEPARTAMENTOS</span><h2>Custo Real por departamento</h2></div></div><div class="chart-wrap tall"><canvas id="chart-dossier-dept"></canvas></div></article>'
    +'<article class="panel"><div class="panel-head"><div><span class="panel-kicker">COMPOSIÇÃO</span><h2>Composição do Custo Real</h2></div></div><div class="chart-wrap tall"><canvas id="chart-dossier-cost"></canvas></div></article>';
  k.parentNode.insertBefore(wrap,k.nextSibling);
}
function rhInterDossierCards(){
  var m=rhDossierModel(),rows=m.rows;
  rhInterCardify('rh-dossier-kpis',[
    function(){
      rhInterOpen('Competência '+m.competencia,'DOSSIÊ EXECUTIVO',['Indicador','Valor'],[['Status',m.status],['Departamento',m.scope.departamento],['Vínculo',m.scope.vinculo],['Pessoas',nfmt(rows.length)],['Proventos',fmt(m.base.proventos)],['Descontos',fmt(m.base.descontos)],['Líquido',fmt(m.base.liquido)]],['TOTAL CUSTO REAL',fmt(m.cost.total)]);
    },
    function(){
      rhInterOpen('Pessoas da competência','COMPOSIÇÃO DE PESSOAS',['Colaborador','Departamento','Vínculo'],rows.slice().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});}).map(function(p){var v=rhVinculoCategory(p);return [p.nome,departmentName(p.departamento),{clt:'CLT',estagiario:'Estagiário',outros:'Outros'}[v]||v];}),['TOTAL',nfmt(rows.length)+' pessoas','']);
    },
    function(){rhInterOpenPeopleMetric('Proventos',rows,'proventos');},
    function(){rhInterOpenPeopleMetric('Líquido',rows,'liquido');},
    function(){rhInterOpenPeopleMetric('Encargos',rows,'encargos');},
    function(){rhInterOpenPeopleMetric('Custo Real',rows,'total');}
  ]);
}
function rhInterOpenDossierCostComponent(label,m){
  var key=label==='Proventos'?'proventos':(label==='Benefícios'?'beneficios':'encargos');
  rhInterOpenPeopleMetric(label,m.rows,key);
}
function rhInterRenderDossierCharts(){
  if(!window.Chart)return;rhInterEnsureDossierCharts();var m=rhDossierModel(),deps=m.departamentos.slice(),pal=rhInterPalette(),c=chartColors();
  rhInterEnsureMode('chart-dossier-dept',function(){rhInterRenderDossierCharts();});
  rhInterEnsureMode('chart-dossier-cost',function(){rhInterRenderDossierCharts();});
  var dm=rhInterResolvedMode('chart-dossier-dept','ranking');if(dm==='ranking')deps.sort(function(a,b){return b.custo-a.custo;});
  if(dm==='pie'){
    chart('chart-dossier-dept','doughnut',{labels:deps.map(function(x){return x.departamento;}),datasets:[{label:'Custo Real',data:deps.map(function(x){return x.custo;}),backgroundColor:deps.map(function(x,i){return pal[i%pal.length];})}]},{plugins:{legend:{display:true,position:'top'}}},function(e,els){if(els.length)openDepartmentBreakdown(deps[els[0].index].departamento);});
  }else{
    var dt=dm==='line'?'line':'bar',dop={plugins:{legend:{display:false}}};if(dm==='bars'||dm==='ranking')dop.indexAxis='y';
    chart('chart-dossier-dept',dt,{labels:deps.map(function(x){return x.departamento;}),datasets:[{label:'Custo Real',data:deps.map(function(x){return x.custo;}),backgroundColor:c.emerald,borderColor:c.emerald,borderRadius:7,tension:.2}]},dop,function(e,els){if(els.length)openDepartmentBreakdown(deps[els[0].index].departamento);});
  }
  var enc=m.cost.fgts+m.cost.inss+m.cost.rat+m.cost.terceiros+m.cost.pis,components=[{nome:'Proventos',valor:m.base.proventos},{nome:'Encargos',valor:enc},{nome:'Benefícios',valor:m.benef.total}],cm=rhInterResolvedMode('chart-dossier-cost','pie'),ct=cm==='pie'?'doughnut':(cm==='line'?'line':'bar'),cop={plugins:{legend:{display:cm==='pie',position:'top'}}};
  if(cm==='ranking')components.sort(function(a,b){return b.valor-a.valor;});if(cm==='bars'||cm==='ranking')cop.indexAxis='y';
  chart('chart-dossier-cost',ct,{labels:components.map(function(x){return x.nome;}),datasets:[{label:'Custo',data:components.map(function(x){return x.valor;}),backgroundColor:[c.blue,c.red,c.gold],borderColor:c.blue,borderRadius:7,tension:.2}]},cop,function(e,els){if(els.length)rhInterOpenDossierCostComponent(components[els[0].index].nome,m);});
}
var _rhInterRenderDossier=renderDossier;
renderDossier=function(){_rhInterRenderDossier();rhInterEnsureDossierCharts();rhInterDossierCards();rhInterRenderDossierCharts();};

/* Tema: recria também gráficos das novas telas */
var _rhInterApplyTheme=applyTheme;
applyTheme=function(){
  _rhInterApplyTheme();
  setTimeout(function(){
    if(S.view==='historico')renderHistory();
    else if(S.view==='indicadores')renderInsights();
    else if(S.view==='dossie')renderDossier();
  },0);
};

if(!$('_rh_interactive_exec_styles')){
  var _rhInterStyle=document.createElement('style');_rhInterStyle.id='_rh_interactive_exec_styles';
  _rhInterStyle.textContent='.rh-clickable-kpi{cursor:pointer;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}.rh-clickable-kpi:hover,.rh-clickable-kpi:focus{transform:translateY(-1px);border-color:var(--gold)!important;box-shadow:0 10px 28px rgba(0,0,0,.12);outline:none}.rh-click-hint{font-size:.62rem;font-weight:800;color:var(--gold)}.rh-chart-mode{margin-left:auto;display:flex;align-items:center;gap:7px;color:var(--muted);font-size:.68rem;font-weight:800;text-transform:uppercase}.rh-chart-mode select{min-width:112px;background:var(--surface-2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:6px 8px;font:inherit;text-transform:none}.rh-comp-sub{margin:0 0 12px;color:var(--muted);font-size:.78rem}.rh-comp-table{display:grid;gap:0;border:1px solid var(--line-soft);border-radius:12px;overflow:hidden}.rh-comp-row{display:grid;grid-template-columns:var(--rh-comp-cols);align-items:center;border-bottom:1px solid var(--line-soft)}.rh-comp-row:last-child{border-bottom:0}.rh-comp-row>div{min-width:0;padding:9px 10px;overflow-wrap:anywhere}.rh-comp-header{background:var(--surface-2);color:var(--muted);font-size:.66rem;font-weight:900;text-transform:uppercase}.rh-comp-cell{font-size:.78rem;color:var(--text)}.rh-comp-total{background:var(--surface-2);font-weight:900;color:var(--text)}.rh-dossier-chart-grid{margin-top:14px;margin-bottom:14px}body.light .rh-comp-table,body.light .rh-comp-row{border-color:rgba(16,49,78,.22)!important}body.light .rh-chart-mode select{background:#fff!important;color:#102f4c!important;border-color:rgba(16,49,78,.28)!important}@media(max-width:760px){.rh-chart-mode{width:100%;justify-content:flex-end;margin-top:8px}.rh-comp-header{display:none}.rh-comp-row{grid-template-columns:1fr!important;padding:6px 0}.rh-comp-row>div{display:grid;grid-template-columns:minmax(100px,.42fr) 1fr;gap:8px;padding:5px 10px}.rh-comp-cell:before{content:attr(data-label);color:var(--muted);font-size:.63rem;font-weight:900;text-transform:uppercase}.rh-comp-total>div:before{content:attr(data-label);color:var(--muted);font-size:.63rem;font-weight:900;text-transform:uppercase}.rh-dossier-chart-grid{grid-template-columns:1fr!important}}';
  document.head.appendChild(_rhInterStyle);
}
/* RH & Folha — Release Candidate: movimentações históricas + snapshot mensal de benefícios */
S.rhPrevFolhas=[];
S.rhBenefitSnapshotActive=false;

function rhFolhaSnap(p,field,fallback){var k=field+'_snapshot';return p&&p[k]!=null&&String(p[k])!==''?p[k]:(p&&p[field]!=null?p[field]:fallback);}
function rhMovementMonth(v){return String(v||'').slice(0,7);}
function rhMovementCurrentMonth(){return S.competencia?String(S.competencia.competencia||'').slice(0,7):'';}
function rhMovementDept(p){return departmentName(rhFolhaSnap(p,'departamento','—'));}
function rhMovementVinc(p){return rhFolhaSnap(p,'vinculo','—')||'—';}
function rhMovementCargo(p){return rhFolhaSnap(p,'cargo','—')||'—';}
function rhMovementSituacao(p){return rhFolhaSnap(p,'situacao','—')||'—';}
function rhMovementAdmission(p){return rhFolhaSnap(p,'admissao','')||'';}
function rhPrevByColaborador(){var m={};(S.rhPrevFolhas||[]).forEach(function(f){m[String(f.colaborador_id||'')]=f;});return m;}

async function rhLoadMovementContext(){
  S.rhPrevFolhas=[];
  if(!S.competencia||!(can('ver_valores_individuais')||canAdmin()))return;
  var asc=(S.competencias||[]).slice().sort(function(a,b){return String(a.competencia).localeCompare(String(b.competencia));});
  var idx=asc.findIndex(function(c){return String(c.id)===String(S.competencia.id);});
  if(idx<=0)return;
  var prev=asc[idx-1];
  try{S.rhPrevFolhas=await api('rh_folha_colaboradores?competencia_id=eq.'+encodeURIComponent(prev.id)+'&select=*');}catch(e){S.rhPrevFolhas=[];}
}

function rhMovementEvents(){
  var rows=(typeof rhScopePeople==='function'?rhScopePeople():S.pessoas).slice(),prev=rhPrevByColaborador(),month=rhMovementCurrentMonth(),events=[];
  rows.forEach(function(p){
    var dep=rhMovementDept(p),vinc=rhMovementVinc(p),cargo=rhMovementCargo(p),sit=rhMovementSituacao(p),adm=rhMovementAdmission(p),base={person:p,dep:dep,vinc:vinc,cargo:cargo,sit:sit};
    if(adm&&rhMovementMonth(adm)===month)events.push(Object.assign({},base,{tipo:'Admissão',classe:'success',data:adm,detalhe:'Entrada na competência'}));
    if(/demit|deslig|rescis/i.test(cleanSearch(sit)))events.push(Object.assign({},base,{tipo:'Desligamento',classe:'danger',data:S.competencia.competencia,detalhe:'Situação: '+sit}));
    var rub=(p.lancamentos||[]).map(function(x){return cleanSearch(x.rubrica_nome||x.nome||'');}).join(' | ');
    if(/ferias/.test(cleanSearch(sit))||/(dias ferias|ferias proporcionais|1\/3.*ferias|abono.*ferias)/.test(rub))events.push(Object.assign({},base,{tipo:'Férias',classe:'',data:S.competencia.competencia,detalhe:'Identificado pela situação/rubricas da competência'}));
    if(/afast|licenca|auxilio doenca|auxilio-doenca/.test(cleanSearch(sit)))events.push(Object.assign({},base,{tipo:'Afastamento',classe:'',data:S.competencia.competencia,detalhe:'Situação: '+sit}));
    var old=prev[String(p.colaborador_id||'')];
    if(old){
      var oldDep=departmentName(rhFolhaSnap(old,'departamento','—')),oldVinc=rhFolhaSnap(old,'vinculo','—')||'—',oldCargo=rhFolhaSnap(old,'cargo','—')||'—',changes=[];
      if(rhDeptKey(oldDep)!==rhDeptKey(dep))changes.push('Departamento: '+oldDep+' → '+dep);
      if(cleanSearch(oldVinc)!==cleanSearch(vinc))changes.push('Vínculo: '+oldVinc+' → '+vinc);
      if(cleanSearch(oldCargo)!==cleanSearch(cargo))changes.push('Cargo: '+oldCargo+' → '+cargo);
      if(changes.length)events.push(Object.assign({},base,{tipo:'Transferência / Alteração',classe:'',data:S.competencia.competencia,detalhe:changes.join(' · ')}));
    }
  });
  var order={'Desligamento':0,'Admissão':1,'Férias':2,'Afastamento':3,'Transferência / Alteração':4};
  return events.sort(function(a,b){var x=(order[a.tipo]||9)-(order[b.tipo]||9);return x||String(a.person.nome||'').localeCompare(String(b.person.nome||''),'pt-BR',{sensitivity:'base'});});
}

function rhOpenMovement(ev){
  if(!ev)return;var p=ev.person;
  var html='<div class="rh-history-detail-grid">'+[
    ['Colaborador',p.nome||'—'],['Movimentação',ev.tipo],['Competência',formatCompetence(S.competencia.competencia)],['Departamento',ev.dep],['Vínculo',ev.vinc],['Cargo',ev.cargo],['Situação',ev.sit],['Detalhe',ev.detalhe||'—']
  ].map(function(x){return '<div><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('')+'</div>';
  openGenericDetail(p.nome||'Movimentação','MOVIMENTAÇÃO DA COMPETÊNCIA',html);
}

renderMovements=function(){
  if(!$('movement-kpis')||!$('movement-rows')||!S.competencia)return;
  var events=rhMovementEvents(),counts={admissao:0,desligamento:0,ferias:0,afastamento:0,transferencia:0};
  events.forEach(function(e){var k=cleanSearch(e.tipo);if(k.indexOf('admiss')>=0)counts.admissao++;else if(k.indexOf('deslig')>=0)counts.desligamento++;else if(k.indexOf('ferias')>=0)counts.ferias++;else if(k.indexOf('afast')>=0)counts.afastamento++;else if(k.indexOf('transfer')>=0)counts.transferencia++;});
  $('movement-kpis').innerHTML=[['Admissões',counts.admissao],['Desligamentos',counts.desligamento],['Férias',counts.ferias],['Afastamentos',counts.afastamento],['Transferências / alterações',counts.transferencia]].map(function(x){return '<div class="kpi"><span>'+esc(x[0])+'</span><strong>'+nfmt(x[1])+'</strong><small>'+formatCompetence(S.competencia.competencia)+'</small></div>';}).join('');
  var table=$('movement-rows').closest('table'),head=table&&table.querySelector('thead tr');if(head)head.innerHTML='<th>Colaborador</th><th>Movimentação</th><th>Data / competência</th><th>Departamento</th><th>Detalhe</th>';
  $('movement-rows').innerHTML=events.length?events.map(function(e,i){return '<tr class="detail-clickable" data-rh-movement="'+i+'"><td><b>'+esc(e.person.nome||'—')+'</b><br><small>'+esc(e.vinc)+'</small></td><td><span class="status '+esc(e.classe||'')+'">'+esc(e.tipo)+'</span></td><td>'+esc(e.data&&String(e.data).length>=10?dateBR(String(e.data)):formatCompetence(S.competencia.competencia))+'</td><td>'+esc(e.dep)+'</td><td>'+esc(e.detalhe||'—')+'</td></tr>';}).join(''):emptyRow(5,'Nenhuma movimentação identificada para os filtros selecionados.');
  document.querySelectorAll('[data-rh-movement]').forEach(function(tr){tr.onclick=function(){rhOpenMovement(events[Number(tr.dataset.rhMovement)]);};});
};

function rhMapBenefitSnapshot(x){return {colaborador_id:x.colaborador_id,matricula:x.matricula,nome:x.nome,seguro_vida:Number(x.seguro_vida)||0,assistencia_medica:Number(x.assistencia_medica)||0,assist_medica:Number(x.assistencia_medica)||0,vr_caixa:Number(x.vr_va_cesta)||0,vale_transporte:Number(x.vale_transporte)||0,vr_valor_disponivel:!!x.completo,__snapshot:true};}
async function rhLoadSavedBenefitSnapshot(){
  S.rhBenefitSnapshotActive=false;
  if(!S.competencia)return;
  try{var rows=await api('rh_beneficios_snapshots?competencia_id=eq.'+encodeURIComponent(S.competencia.id)+'&select=*');if(rows&&rows.length){S.beneficios=rows.map(rhMapBenefitSnapshot);S.rhBenefitSnapshotActive=true;}}catch(e){}
}
function rhBuildBenefitSnapshot(){
  var items=[],vrSource=false;
  S.pessoas.forEach(function(p){var b=rhPersonBenefit(p),seg=b?Number(b.seguro_vida)||0:0,med=b?Number(b.assistencia_medica||b.assist_medica)||0:0,vr=b?Number(b.vr_caixa)||0:0,vt=b?Number(b.vale_transporte)||0:0;if(b&&(b.vr_valor_disponivel||vr>0))vrSource=true;items.push({matricula:p.matricula||String(p.colaborador_id||p.id||''),nome:p.nome||'Não identificado',seguro_vida:seg,assistencia_medica:med,vr_va_cesta:vr,vale_transporte:vt,total:seg+med+vr+vt,detalhes:{departamento:departmentName(p.departamento),vinculo:p.vinculo||'',origem:'Gestão de Benefícios'}});});
  return {items:items,completo:vrSource};
}

var _rhMovSelectCompetence=selectCompetence;
selectCompetence=async function(id){
  await _rhMovSelectCompetence(id);
  await Promise.all([rhLoadMovementContext(),rhLoadSavedBenefitSnapshot()]);
  renderMovements();
  if(S.rhBenefitSnapshotActive){renderCustoReal();renderValidations();if(S.view==='historico'&&typeof renderHistory==='function')renderHistory();}
};

var _rhMovAdvanceClosing=rhAdvanceClosing;
rhAdvanceClosing=async function(next){
  if((next==='conciliado'||next==='fechado')&&S.competencia&&canAdmin()){
    var blockers=typeof rhAuditBlockers==='function'?rhAuditBlockers():[];if(!blockers.length){
      try{var pack=rhBuildBenefitSnapshot();var total=await rpc('rh_salvar_snapshot_beneficios',{p_competencia_id:S.competencia.id,p_itens:pack.items,p_completo:pack.completo});S.competencia.resumo=S.competencia.resumo||{};S.competencia.resumo.beneficios_total=Number(total)||0;S.competencia.resumo.beneficios={total:Number(total)||0,completo:pack.completo};toast('Snapshot de benefícios salvo para '+formatCompetence(S.competencia.competencia)+'.');}
      catch(e){toast('Não foi possível registrar o snapshot mensal de benefícios: '+e.message,true);return;}
    }
  }
  return _rhMovAdvanceClosing(next);
};

var _rhMovSetupUI=setupUI;
setupUI=function(){_rhMovSetupUI();if(!$('_rh_movements_styles')){var st=document.createElement('style');st.id='_rh_movements_styles';st.textContent='@media(min-width:1180px){#movement-kpis{grid-template-columns:repeat(5,minmax(0,1fr))!important}}#page-movimentacoes .table-wrap table{table-layout:fixed!important}#page-movimentacoes th:nth-child(1){width:22%}#page-movimentacoes th:nth-child(2){width:17%}#page-movimentacoes th:nth-child(3){width:14%}#page-movimentacoes th:nth-child(4){width:17%}#page-movimentacoes th:nth-child(5){width:30%}@media(max-width:760px){#movement-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}}';document.head.appendChild(st);}};
/* RH & Folha — ranking em quadro, responsivo e sem rolagem lateral */
function rhRankingAggregateValue(sets,total){
  var allCount=sets.length&&sets.every(function(ds){return rhUniversalIsCountSeries(ds);});
  return allCount?nfmt(total):fmt(total);
}
function rhRankingColumnTemplate(valueCols){
  return '42px minmax(135px,1.55fr) repeat('+Math.max(1,valueCols)+',minmax(0,1fr))';
}
function rhRankingApplyTemplate(host,valueCols){
  var tpl=rhRankingColumnTemplate(valueCols);
  Array.prototype.forEach.call(host.querySelectorAll('.rh-rank-row'),function(row){row.style.gridTemplateColumns=tpl;});
}
rhUniversalRenderRanking=function(id,data,clickHandler){
  var canvas=$(id),host=rhUniversalRankingHost(id);if(!canvas||!host)return;
  if(S.charts[id]){try{S.charts[id].destroy();}catch(e){}delete S.charts[id];}
  var wrap=canvas.closest('.chart-wrap')||canvas.parentNode;
  canvas.hidden=true;host.hidden=false;if(wrap)wrap.classList.add('rh-ranking-active');

  var labels=(data.labels||[]).slice();
  var sets=(data.datasets||[]).filter(function(ds){return Array.isArray(ds.data);});
  var rule=rhUniversalRankingScoreRule(data);
  var order=labels.map(function(_,i){return i;});
  order.sort(function(a,b){var d=rhUniversalRankingScoreAt(data,b,rule)-rhUniversalRankingScoreAt(data,a,rule);return d||a-b;});

  var addTotal=rule.sum;
  var valueCols=sets.length+(addTotal?1:0);
  var header='<div class="rh-rank-row rh-rank-head"><div>#</div><div>Categoria</div>'
    +sets.map(function(ds){return '<div>'+esc(ds.label||'Valor')+'</div>';}).join('')
    +(addTotal?'<div>Total</div>':'')+'</div>';

  var body=order.map(function(originalIndex,rank){
    var total=rhUniversalScore(data,originalIndex);
    var cells=sets.map(function(ds){return '<div class="rh-rank-value">'+esc(rhUniversalRankingValue(ds,ds.data[originalIndex]))+'</div>';}).join('');
    return '<button type="button" class="rh-rank-row rh-rank-item" data-rh-rank-index="'+originalIndex+'">'
      +'<div class="rh-rank-pos">'+(rank+1)+'º</div>'
      +'<div class="rh-rank-name"><b>'+esc(labels[originalIndex]==null?'—':labels[originalIndex])+'</b></div>'
      +cells
      +(addTotal?'<div class="rh-rank-total">'+esc(rhRankingAggregateValue(sets,total))+'</div>':'')
      +'</button>';
  }).join('');

  var totals=sets.map(function(ds){
    var total=(ds.data||[]).reduce(function(a,v){var n=Number(v);return a+(isFinite(n)?n:0);},0);
    return '<div class="rh-rank-value">'+esc(rhUniversalRankingValue(ds,total))+'</div>';
  }).join('');
  var grand=labels.reduce(function(a,_,i){return a+rhUniversalScore(data,i);},0);
  var foot='<div class="rh-rank-row rh-rank-foot"><div></div><div>TOTAL</div>'+totals
    +(addTotal?'<div class="rh-rank-total">'+esc(rhRankingAggregateValue(sets,grand))+'</div>':'')+'</div>';

  host.innerHTML='<div class="rh-rank-table">'+header+body+foot+'</div>';
  rhRankingApplyTemplate(host,valueCols);

  Array.prototype.forEach.call(host.querySelectorAll('[data-rh-rank-index]'),function(row){
    row.onclick=function(){
      if(!clickHandler)return;
      var originalIndex=Number(row.dataset.rhRankIndex);
      var datasetIndex=rule.datasetIndex>=0?rule.datasetIndex:0;
      clickHandler(null,[{index:originalIndex,datasetIndex:datasetIndex}]);
    };
  });
};

if(!$('_rh_ranking_table_fix_styles')){
  var st=document.createElement('style');st.id='_rh_ranking_table_fix_styles';
  st.textContent='.rh-ranking-view{max-height:430px!important;overflow-y:auto!important;overflow-x:hidden!important}.rh-rank-head{box-shadow:0 1px 0 var(--line-soft)}.rh-rank-pos{font-size:.8rem}.rh-rank-name b{font-weight:850}.rh-rank-value,.rh-rank-total{font-variant-numeric:tabular-nums}.rh-rank-foot{z-index:2}@media(max-width:760px){.rh-rank-row>div{padding:8px 5px!important;font-size:.7rem!important}.rh-rank-name b{font-size:.72rem}}';
  document.head.appendChild(st);
}
