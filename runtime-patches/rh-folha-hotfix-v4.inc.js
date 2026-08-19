/* RH & Folha — hotfix v4: PIS no custo, contraste claro e ordenacao alfabetica */
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
