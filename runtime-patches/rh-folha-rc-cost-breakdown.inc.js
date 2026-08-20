/* RH & Folha — composição clara do Custo Real por departamento */
function rhDepartmentCostPerson(p){
  var out={proventos:Number(p.proventos)||0,fgts:0,inss:0,rat:0,terceiros:0,pis:0,beneficios:0,encargos:0,total:0};
  var employer=typeof rhEmployerCharges==='function'?rhEmployerCharges(p):{itens:[]};
  (employer.itens||[]).forEach(function(it){
    var k=cleanSearch(it[0]),v=Number(it[1])||0;
    if(k==='fgts')out.fgts+=v;
    else if(k.indexOf('inss patronal')>=0)out.inss+=v;
    else if(k==='rat')out.rat+=v;
    else if(k.indexOf('terceiros')>=0)out.terceiros+=v;
    else if(k==='pis')out.pis+=v;
  });
  out.encargos=out.fgts+out.inss+out.rat+out.terceiros+out.pis;
  var custo=custoEmpresa(p);
  (custo.itens||[]).forEach(function(it){if(it[2]==='benefício')out.beneficios+=Number(it[1])||0;});
  out.total=Number(custo.total)||0;
  return out;
}
function rhDepartmentCostTotals(items){
  return items.reduce(function(t,x){
    ['proventos','fgts','inss','rat','terceiros','pis','beneficios','encargos','total'].forEach(function(k){t[k]+=Number(x.cost[k])||0;});
    return t;
  },{proventos:0,fgts:0,inss:0,rat:0,terceiros:0,pis:0,beneficios:0,encargos:0,total:0});
}
function rhOpenDepartmentCostBreakdown(nome){
  var key=rhDeptKey(nome);
  var items=rhScopePeople().filter(function(p){return rhDeptKey(departmentName(p.departamento))===key;}).map(function(p){return {person:p,cost:rhDepartmentCostPerson(p)};}).sort(function(a,b){return b.cost.total-a.cost.total;});
  var t=rhDepartmentCostTotals(items);
  if(!items.length){openGenericDetail(nome,'COMPOSIÇÃO DO CUSTO REAL','<p class="detail-empty">Nenhum colaborador para os filtros selecionados.</p>');return;}
  var summary=[['Proventos',t.proventos],['FGTS',t.fgts],['INSS patronal',t.inss],['RAT',t.rat],['Terceiros',t.terceiros],['PIS',t.pis],['Benefícios',t.beneficios],['Custo Real',t.total]];
  var html='<div class="rh-dept-cost-explain"><b>Como este valor é formado?</b><span>Proventos + FGTS + INSS Patronal + RAT + Terceiros + PIS + Benefícios = Custo Real</span></div>'
    +'<div class="rh-dept-cost-summary">'+summary.map(function(x,i){return '<div class="rh-dept-cost-card'+(i===summary.length-1?' featured':'')+'"><span>'+esc(x[0])+'</span><strong>'+fmt(x[1])+'</strong></div>';}).join('')+'</div>'
    +'<div class="rh-dept-cost-note">Descontos, IRRF e INSS retido do colaborador não são somados ao Custo Real, pois são deduções do colaborador e não encargos patronais.</div>'
    +'<h3 class="rh-dept-cost-title">Composição por colaborador</h3>'
    +'<table class="modal-table-inner responsive-table rh-dept-cost-table"><thead><tr><th>Colaborador</th><th class="money">Proventos</th><th class="money">Encargos</th><th class="money">Benefícios</th><th class="money">Custo Real</th></tr></thead><tbody>'
    +items.map(function(x){return '<tr><td><b>'+esc(x.person.nome)+'</b><small>'+esc(departmentName(x.person.departamento))+'</small></td><td class="money">'+fmt(x.cost.proventos)+'</td><td class="money">'+fmt(x.cost.encargos)+'</td><td class="money">'+fmt(x.cost.beneficios)+'</td><td class="money"><b>'+fmt(x.cost.total)+'</b></td></tr>';}).join('')
    +'</tbody>'+rhFoot(['TOTAL',fmt(t.proventos),fmt(t.encargos),fmt(t.beneficios),fmt(t.total)])+'</table>';
  openGenericDetail('Custo Real — '+nome,'COMPOSIÇÃO DO DEPARTAMENTO',html);
}

/* Nos gráficos de Custo Real por departamento, o clique deve explicar o Custo Real — não apenas proventos/descontos/líquido. */
var _rhDepartmentCostChart=chart;
chart=function(id,type,data,options,clickHandler,fromCache){
  if(id==='chart-insight-dept'||id==='chart-dossier-dept'){
    var labels=data&&data.labels?data.labels.slice():[];
    clickHandler=function(e,els){if(els&&els.length){var label=labels[els[0].index];if(label!=null)rhOpenDepartmentCostBreakdown(label);}};
  }
  return _rhDepartmentCostChart(id,type,data,options,clickHandler,fromCache);
};

if(!$('_rh_department_cost_styles')){
  var st=document.createElement('style');st.id='_rh_department_cost_styles';
  st.textContent='.rh-dept-cost-explain{display:grid;gap:5px;padding:12px 14px;margin-bottom:12px;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2)}.rh-dept-cost-explain b{font-size:.9rem}.rh-dept-cost-explain span{color:var(--muted);font-size:.78rem}.rh-dept-cost-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}.rh-dept-cost-card{min-width:0;border:1px solid var(--line-soft);border-radius:10px;padding:9px 10px;background:var(--surface-2)}.rh-dept-cost-card span{display:block;color:var(--muted);font-size:.62rem;font-weight:850;text-transform:uppercase}.rh-dept-cost-card strong{display:block;margin-top:4px;font-size:.88rem;white-space:nowrap}.rh-dept-cost-card.featured{border-color:var(--gold)}.rh-dept-cost-card.featured strong{color:var(--gold)}.rh-dept-cost-note{font-size:.72rem;color:var(--muted);margin:8px 0 14px}.rh-dept-cost-title{font-size:.84rem;margin:0 0 8px}.rh-dept-cost-table td:first-child small{display:block;color:var(--muted);margin-top:2px}@media(max-width:760px){.rh-dept-cost-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.rh-dept-cost-table th,.rh-dept-cost-table td{font-size:.68rem!important;padding:.42rem .3rem!important}}body.light .rh-dept-cost-explain,body.light .rh-dept-cost-card{border-color:rgba(16,49,78,.22)!important;background:#f7fafc!important}body.light .rh-dept-cost-note,body.light .rh-dept-cost-explain span,body.light .rh-dept-cost-card span{color:#405b73!important}';
  document.head.appendChild(st);
}
