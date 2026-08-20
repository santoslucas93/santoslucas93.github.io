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
