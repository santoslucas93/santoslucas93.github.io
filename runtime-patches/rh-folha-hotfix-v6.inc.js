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
