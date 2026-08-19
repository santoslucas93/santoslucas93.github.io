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

/* v5 — PIS explícito, composição individual só com encargos e filtros CLT/Estagiário */
departmentName=function(v){var map={'1':'Administrativa','2':'Comunicação','3':'Financeiro','4':'Marketing','5':'Técnica','6':'Técnica/Projetos'};return map[String(v)]||v||'—';};
function rhVinculoCategory(p){var v=cleanSearch(p&&p.vinculo||'');if(/estagi/.test(v))return 'estagiario';if(/celet|clt/.test(v))return 'clt';return 'outros';}

rhPisForPerson=function(p){
  var e=(S.competencia&&S.competencia.encargos)||{},total=Number(e.valor_pis)||0;
  if(!total)return 0;
  var rows=S.pessoas.filter(function(x){return Number(x.base_fgts)>0;});
  var allocated=rhAlloc(rows,'base_fgts',total);
  var hit=allocated.find(function(x){return x.p===p||String(x.p.id)===String(p.id);});
  return hit?hit.cents/100:0;
};

rhEmployerCharges=function(p){
  var e=(S.competencia&&S.competencia.encargos)||{},items=[],total=0;
  var fgts=Number(p.valor_fgts)||0,baseInd=Number(p.base_inss)||0;
  var baseRateio=S.pessoas.reduce(function(a,x){return a+(Number(x.base_inss)||0);},0),baseTotal=Number(e.base_total_inss)||0;
  if(fgts){items.push(['FGTS',fgts,'exato']);total+=fgts;}
  if(baseRateio>0&&baseInd>0){
    var sh=baseInd/baseRateio,pat=baseTotal*0.20,rat=Number(e.rat)||(baseTotal*0.01),ter=Number(e.terceiros)||(baseTotal*0.058);
    [['INSS patronal',pat],['RAT',rat],['Terceiros',ter]].forEach(function(x){var val=x[1]*sh;if(val){items.push([x[0],val,'rateado']);total+=val;}});
  }
  var pis=rhPisForPerson(p);if(pis){items.push(['PIS',pis,'rateado']);total+=pis;}
  return {itens:items,total:total};
};

filteredPessoas=function(){
  var fv=($('filter-vinculo')&&$('filter-vinculo').value)||'',fd=($('filter-dept')&&$('filter-dept').value)||'';
  return S.pessoas.filter(function(p){
    if(fv&&fv!=='todos'&&rhVinculoCategory(p)!==fv)return false;
    if(fd&&String(p.departamento)!==String(fd))return false;
    return true;
  });
};

populatePainelFilters=function(){
  var fd=$('filter-dept'),fv=$('filter-vinculo');if(!fd||!fv)return;
  var depts=departments(),curD=fd.value,curV=fv.value;
  fd.innerHTML='<option value="">Todos os departamentos</option>'+depts.map(function(d){var key=Object.keys({'1':'Administrativa','2':'Comunicação','3':'Financeiro','4':'Marketing','5':'Técnica','6':'Técnica/Projetos'}).find(function(k){return departmentName(k)===d.nome;})||d.nome;return '<option value="'+esc(key)+'">'+esc(d.nome)+'</option>';}).join('');
  fv.innerHTML='<option value="">Todos os vínculos</option><option value="clt">CLT</option><option value="estagiario">Estagiário</option><option value="outros">Outros</option>';
  if(curD)fd.value=curD;if(curV)fv.value=curV;
};

openPerson=function(id){
  var p=S.pessoas.find(function(x){return x.id===id;});if(!p)return;
  $('employee-modal-title').textContent=p.nome;
  $('employee-modal-summary').innerHTML=[
    ['Matrícula',p.matricula||'—'],['Cargo',p.cargo||'—'],['Departamento',departmentName(p.departamento)],['Centro de custo',p.centro_custo||'—'],
    ['Vínculo',p.vinculo||'—'],['Admissão',brDate(p.admissao)],['Situação',p.situacao||'—'],['Salário base',fmt(p.salario)]
  ].map(function(x){return '<div><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('');
  var lancs=p.lancamentos||[],provs=lancs.filter(function(x){return x.tipo==='P'||x.tipo==='provento';}),descs=lancs.filter(function(x){return x.tipo==='D'||x.tipo==='desconto';});
  var sumProv=provs.reduce(function(a,x){return a+(Number(x.valor)||0);},0),sumDesc=descs.reduce(function(a,x){return a+(Number(x.valor)||0);},0),liquido=Number(p.liquido)||0,enc=rhEmployerCharges(p);
  function rubrRow(x){return '<tr><td><b>'+esc((x.rubrica_codigo||x.codigo||'')+' '+(x.rubrica_nome||x.nome||''))+'</b></td><td class="money">'+nfmt(x.referencia)+'</td><td></td><td class="money">'+fmt(x.valor)+'</td></tr>';}
  var html='';
  if(lancs.length){
    html+='<tr class="group-head"><td colspan="4">Proventos</td></tr>'+provs.map(rubrRow).join('')+'<tr class="group-total"><td colspan="3"><b>Subtotal proventos</b></td><td class="money"><b>'+fmt(sumProv)+'</b></td></tr>';
    html+='<tr class="group-head"><td colspan="4">Descontos</td></tr>'+descs.map(rubrRow).join('')+'<tr class="group-total"><td colspan="3"><b>Subtotal descontos</b></td><td class="money"><b>'+fmt(sumDesc)+'</b></td></tr>';
    html+='<tr class="group-total destaque"><td colspan="3"><b>Líquido a receber</b></td><td class="money"><b>'+fmt(liquido)+'</b></td></tr>';
    html+='<tr class="group-head"><td colspan="4">Encargos patronais</td></tr>';
    enc.itens.forEach(function(it){html+='<tr><td>'+esc(it[0])+'</td><td></td><td><small>'+esc(it[2])+'</small></td><td class="money">'+fmt(it[1])+'</td></tr>';});
    html+='<tr class="group-total"><td colspan="3"><b>Total encargos patronais</b></td><td class="money"><b>'+fmt(enc.total)+'</b></td></tr>';
  }else html=emptyRow(4,'Sem rubricas individuais disponíveis.');
  $('employee-modal-rows').innerHTML=html;$('employee-modal').hidden=false;rhSweepText($('employee-modal'));
};

renderPayroll=function(){
  var filter=($('payroll-vinculo-filter')&&$('payroll-vinculo-filter').value)||'';
  var rows=S.pessoas.filter(function(p){return !filter||rhVinculoCategory(p)===filter;}).sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});
  $('payroll-rows').innerHTML=rows.length?rows.map(function(p){return '<tr><td><b>'+esc(p.nome)+'</b><br><small>'+esc(departmentName(p.departamento))+'</small></td><td class="money">'+fmt(p.salario)+'</td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.descontos)+'</td><td class="money"><b>'+fmt(p.liquido)+'</b></td><td><button class="detail-button" data-person="'+esc(p.id)+'">Detalhar</button></td></tr>';}).join(''):emptyRow(6,'Nenhum colaborador neste filtro.');
  bindPersonButtons();
};

var _rhV5SetupUI=setupUI;
setupUI=function(){
  _rhV5SetupUI();
  var page=$('page-folha'),table=$('payroll-rows')&&$('payroll-rows').closest('.table-panel');
  if(page&&table&&!$('payroll-vinculo-filter')){
    var bar=document.createElement('div');bar.className='filter-bar payroll-vinculo-bar';
    bar.innerHTML='<label>Vínculo<select id="payroll-vinculo-filter"><option value="">Todos</option><option value="clt">CLT</option><option value="estagiario">Estagiário</option><option value="outros">Outros</option></select></label>';
    table.parentNode.insertBefore(bar,table);
    $('payroll-vinculo-filter').onchange=renderPayroll;
  }
  if(!$('_rh_hotfix_v5_styles')){var st=document.createElement('style');st.id='_rh_hotfix_v5_styles';st.textContent='.payroll-vinculo-bar{display:flex;justify-content:flex-end;margin:0 0 12px}.payroll-vinculo-bar label{display:grid;gap:5px;color:var(--muted);font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.payroll-vinculo-bar select{min-width:180px;height:40px;padding:0 12px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface);color:var(--text)}';document.head.appendChild(st);}
};
