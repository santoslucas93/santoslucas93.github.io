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
