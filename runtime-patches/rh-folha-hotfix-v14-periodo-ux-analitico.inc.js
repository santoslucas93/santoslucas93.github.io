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
