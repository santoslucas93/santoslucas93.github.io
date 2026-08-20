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
