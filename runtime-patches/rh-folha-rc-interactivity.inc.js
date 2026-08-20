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
