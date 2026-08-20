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
