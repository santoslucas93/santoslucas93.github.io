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
