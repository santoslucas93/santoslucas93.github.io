/* RH & Folha — hotfix v8: contraste global por tema + Encargos vermelhos no Custo Real */

/* Chart.js deve ler as variáveis do elemento que recebe a classe do tema (body), não apenas :root. */
chartColors=function(){
  var css=getComputedStyle(document.body),root=getComputedStyle(document.documentElement);
  function v(name,fallback){return (css.getPropertyValue(name)||root.getPropertyValue(name)||fallback||'').trim();}
  return {
    text:v('--chart-text',document.body.classList.contains('light')?'#16324a':'#e7eef7'),
    grid:v('--chart-grid',document.body.classList.contains('light')?'rgba(20,48,74,.22)':'rgba(187,205,225,.16)'),
    gold:v('--gold','#e8b93c'),emerald:v('--emerald','#1fc48d'),red:v('--red','#e53945'),
    blue:v('--blue','#347fd1'),orange:v('--orange','#d56a12'),purple:v('--purple','#7651c9')
  };
};

function rhV8FixCustoRealChart(){
  var ch=S.charts&&S.charts['chart-custo-real'];
  if(!ch||!ch.data||!ch.data.datasets)return;
  var c=chartColors();
  ch.data.datasets.forEach(function(ds){
    var label=cleanSearch(ds.label||'');
    if(label.indexOf('encargos patronais')>=0||label==='encargos')ds.backgroundColor=c.red;
  });
  try{ch.options.plugins.legend.labels.color=c.text;}catch(e){}
  try{ch.options.scales.x.ticks.color=c.text;ch.options.scales.x.grid.color=c.grid;}catch(e){}
  try{ch.options.scales.y.ticks.color=c.text;ch.options.scales.y.grid.color=c.grid;}catch(e){}
  ch.update();
}

var _rhV8RenderCustoReal=renderCustoReal;
renderCustoReal=function(){_rhV8RenderCustoReal();rhV8FixCustoRealChart();};

/* Reforço global de contraste no tema claro. Mantém hierarquia visual sem cinzas lavados. */
var _rhV8SetupUI=setupUI;
setupUI=function(){
  _rhV8SetupUI();
  if(!$('_rh_hotfix_v8_styles')){
    var st=document.createElement('style');st.id='_rh_hotfix_v8_styles';
    st.textContent='body.light{'
      +'--bg:#f4f7f9;--bg-2:#e9eff4;--surface:#ffffff;--surface-2:#edf3f7;--surface-soft:rgba(255,255,255,.98);'
      +'--text:#071a2c;--muted:#29445d;--faint:#49657d;'
      +'--line:rgba(118,82,5,.48);--line-soft:rgba(16,49,78,.24);'
      +'--gold:#6e4a00;--gold-2:#765000;--emerald:#087451;--blue:#145fa7;--red:#b4232e;--orange:#9b4a00;--purple:#57349f;'
      +'--chart-grid:rgba(18,49,76,.22);--chart-text:#102f49;}'
      +'body.light .topbar{background:rgba(244,247,249,.96)!important}'
      +'body.light .sidebar{background:linear-gradient(180deg,#f8fafb,#eef3f6)!important}'
      +'body.light .nav-item{color:#213d56!important}body.light .nav-item span{color:#765000!important}'
      +'body.light .nav-item.active,body.light .nav-item:hover{color:#071a2c!important;background:#e3ebf1!important}'
      +'body.light .page-head p,body.light .brand small,body.light .user-name,body.light .kpi span,body.light .kpi small,body.light .metric-row span,body.light .validation-row span,body.light .row-person small,body.light .sidebar-note span,body.light .settings-card p,body.light .upload-card p,body.light .upload-card small,body.light .reconciliation-item small,body.light .click-hint,body.light .detail-note{color:#29445d!important}'
      +'body.light .eyebrow,body.light .panel-kicker,body.light .sidebar-note b,body.light .text-button,body.light .source-badge{color:#765000!important}'
      +'body.light .kpi,body.light .panel,body.light .table-panel,body.light .settings-card,body.light .upload-card{border-color:rgba(16,49,78,.22)!important;box-shadow:0 10px 28px rgba(22,52,78,.10)!important}'
      +'body.light .kpi strong,body.light h1,body.light h2,body.light h3,body.light td,body.light .metric-row strong,body.light .detail-button,body.light .button{color:#071a2c!important}'
      +'body.light th{background:#dce7ee!important;color:#173851!important;border-color:rgba(16,49,78,.24)!important;font-weight:900!important}'
      +'body.light td{border-color:rgba(16,49,78,.18)!important}'
      +'body.light tbody tr:hover{background:#e4edf3!important}'
      +'body.light .privacy-chip,body.light .status,body.light .source-badge{color:#203e57!important;background:#edf3f7!important;border-color:rgba(16,49,78,.28)!important}'
      +'body.light .head-actions label{color:#29445d!important}body.light .head-actions select,body.light .search{background:#fff!important;color:#071a2c!important;border-color:rgba(16,49,78,.30)!important}'
      +'body.light .detail-button,body.light .icon-button,body.light .button{border-color:rgba(16,49,78,.30)!important;background:#fff!important}'
      +'body.light .chart-wrap{background:transparent!important}body.light canvas{opacity:1!important;filter:none!important}'
      +'body.light .modal-card,body.light .rh-detail-card{background:#fff!important;color:#071a2c!important;border-color:rgba(16,49,78,.28)!important}'
      +'body.light .detail-total-row td{background:#e5edf3!important;color:#071a2c!important;border-top-color:#765000!important}'
      +'body.light .ep-tag{color:#203e57!important;background:#e3ebf1!important}'
      +'body.light .ep-row{border-color:rgba(16,49,78,.18)!important}'
      +'body.light .status.success{color:#066845!important;background:#e1f2eb!important}body.light .status.danger{color:#9f1823!important;background:#fae7e9!important}'
      +'body.light .avatar{color:#5f4100!important;background:linear-gradient(145deg,#f3e8c3,#dcefe8)!important}'
      +'body.light .kpi::before{opacity:.9!important}'
      +'body.light #chart-custo-real,body.light #chart-departamentos,body.light #chart-rateio,body.light #chart-composicao,body.light #chart-vinculos,body.light #chart-rubricas,body.light #chart-encargos{opacity:1!important}';
    document.head.appendChild(st);
  }
  rhEnsureScreenDeptFilters();
};

/* Ao alternar o tema, reconstruir os gráficos já com a paleta/contraste corretos. */
var _rhV8ApplyTheme=applyTheme;
applyTheme=function(){
  _rhV8ApplyTheme();
  if(S.competencia){setTimeout(function(){try{renderCharts();renderCustoReal();}catch(e){}},0);}
};

/* Fechamento global de qualquer popup/modal com Esc. */
if(!window.__lnbRhEscPopupBound){
  window.__lnbRhEscPopupBound=true;
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape'&&e.key!=='Esc')return;
    var open=Array.prototype.slice.call(document.querySelectorAll('.modal')).filter(function(m){return m&&!m.hidden&&getComputedStyle(m).display!=='none';});
    if(open.length){open[open.length-1].hidden=true;e.preventDefault();e.stopPropagation();}
  },true);
}

/* Filtro real e sincronizado de departamento em todas as telas analíticas. */
function rhDeptValue(){var master=$('filter-dept');return master?master.value:'';}
function rhDeptOptions(){
  var seen={},out=[];
  S.pessoas.forEach(function(p){var raw=String(p.departamento==null?'':p.departamento),label=departmentName(p.departamento);if(!raw||seen[raw])return;seen[raw]=1;out.push({value:raw,label:label});});
  return out.sort(function(a,b){return a.label.localeCompare(b.label,'pt-BR',{sensitivity:'base'});});
}
function rhSyncDeptSelects(value,source){
  document.querySelectorAll('[data-rh-dept-filter]').forEach(function(sel){if(sel!==source)sel.value=value;});
  var master=$('filter-dept');if(master&&master!==source)master.value=value;
}
function rhRefreshDeptScope(){
  try{renderKpis();renderPeople();renderPayroll();renderRubrics();renderCharges();renderMovements();renderDepartments();renderCharts();renderCustoReal();}catch(e){console.error('Falha ao atualizar filtro de departamento',e);}
}
function rhCreateDeptFilter(pageId){
  var page=$(pageId);if(!page)return;
  var head=page.querySelector('.page-head');if(!head)return;
  var id='rh-dept-'+pageId.replace('page-','');if($(id))return;
  var actions=head.querySelector('.head-actions');if(!actions){actions=document.createElement('div');actions.className='head-actions';head.appendChild(actions);}
  var label=document.createElement('label');label.innerHTML='Departamento<select id="'+id+'" data-rh-dept-filter><option value="">Todos os departamentos</option></select>';actions.insertBefore(label,actions.firstChild);
  var sel=$(id);sel.onchange=function(){var master=$('filter-dept');if(master)master.value=sel.value;rhSyncDeptSelects(sel.value,sel);rhRefreshDeptScope();};
}
function rhPopulateDeptFilters(){
  var opts=rhDeptOptions(),value=rhDeptValue();
  document.querySelectorAll('[data-rh-dept-filter]').forEach(function(sel){var cur=value;sel.innerHTML='<option value="">Todos os departamentos</option>'+opts.map(function(o){return '<option value="'+esc(o.value)+'">'+esc(o.label)+'</option>';}).join('');sel.value=cur;});
}
function rhEnsureScreenDeptFilters(){
  ['page-colaboradores','page-folha','page-rubricas','page-encargos','page-custoreal'].forEach(rhCreateDeptFilter);
  rhPopulateDeptFilters();
  var master=$('filter-dept');if(master&&!master.__rhGlobalBound){master.__rhGlobalBound=true;master.addEventListener('change',function(){rhSyncDeptSelects(master.value,master);rhRefreshDeptScope();});}
}

/* Scope real do filtro: todas as telas abaixo usam somente as pessoas filtradas. */
var _rhV8FilteredPessoas=filteredPessoas;
filteredPessoas=function(){
  var base=_rhV8FilteredPessoas();
  var master=$('filter-dept'),dept=master?master.value:'';
  if(!dept)return base;
  return base.filter(function(p){return String(p.departamento)===String(dept);});
};

var _rhV8RenderKpis=renderKpis;
renderKpis=function(){
  var rows=filteredPessoas(),t={p:0,d:0,l:0},v={clt:0,estagiario:0,outros:0};
  rows.forEach(function(p){t.p+=Number(p.proventos)||0;t.d+=Number(p.descontos)||0;t.l+=Number(p.liquido)||0;var k=rhVinculoCategory(p);v[k]=(v[k]||0)+1;});
  $('kpi-proventos').textContent=fmt(t.p);$('kpi-descontos').textContent=fmt(t.d);$('kpi-liquido').textContent=fmt(t.l);$('kpi-pessoas').textContent=nfmt(rows.length);if($('kpi-vinculos'))$('kpi-vinculos').textContent=v.clt+' CLT · '+v.estagiario+' Estagiários · '+v.outros+' Outros';
  if(typeof rhBindOverviewCards==='function')rhBindOverviewCards();
};

var _rhV8RenderPayroll=renderPayroll;
renderPayroll=function(){
  var rows=filteredPessoas().slice().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});
  var pf=($('payroll-vinculo-filter')&&$('payroll-vinculo-filter').value)||'';if(pf)rows=rows.filter(function(p){return rhVinculoCategory(p)===pf;});
  $('payroll-rows').innerHTML=rows.length?rows.map(function(p){return '<tr><td><b>'+esc(p.nome)+'</b><br><small>'+esc(departmentName(p.departamento))+'</small></td><td class="money">'+fmt(p.salario)+'</td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.descontos)+'</td><td class="money"><b>'+fmt(p.liquido)+'</b></td><td><button class="detail-button" data-person="'+esc(p.id)+'">Detalhar</button></td></tr>';}).join(''):emptyRow(6,'Nenhum colaborador neste departamento.');bindPersonButtons();
};

var _rhV8RenderRubrics=renderRubrics;
renderRubrics=function(){
  var rows=filteredPessoas(),map={};rows.forEach(function(p){(p.lancamentos||[]).forEach(function(x){var k=(x.rubrica_codigo||'')+'|'+x.rubrica_nome+'|'+x.tipo;if(!map[k])map[k]={codigo:x.rubrica_codigo,nome:x.rubrica_nome,tipo:x.tipo,valor:0};map[k].valor+=Number(x.valor)||0;});});
  var a=Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.valor-a.valor;});$('rubric-rows').innerHTML=a.length?a.map(function(x,i){return '<tr class="detail-clickable" data-rubric-scope="'+i+'"><td>'+esc(x.codigo||'—')+'</td><td><b>'+esc(rhFixTextValue(x.nome))+'</b><small class="click-hint">Clique para ver a composição</small></td><td><span class="status">'+esc(x.tipo)+'</span></td><td class="money">'+fmt(x.valor)+'</td></tr>';}).join(''):emptyRow(4,'Sem rubricas neste departamento.');document.querySelectorAll('[data-rubric-scope]').forEach(function(tr){tr.onclick=function(){openRubricBreakdown(a[Number(tr.dataset.rubricScope)]);};});
};

var _rhV8RenderDepartments=renderDepartments;
renderDepartments=function(){
  var m={};filteredPessoas().forEach(function(p){var k=departmentName(p.departamento);if(!m[k])m[k]={nome:k,proventos:0,descontos:0,liquido:0};m[k].proventos+=Number(p.proventos)||0;m[k].descontos+=Number(p.descontos)||0;m[k].liquido+=Number(p.liquido)||0;});var a=Object.keys(m).map(function(k){return m[k];});$('department-rows').innerHTML=a.length?a.map(function(x,i){return '<tr class="detail-clickable" data-dept-scope="'+i+'"><td><b>'+esc(x.nome)+'</b></td><td class="money">'+fmt(x.proventos)+'</td><td class="money">'+fmt(x.descontos)+'</td><td class="money">'+fmt(x.liquido)+'</td></tr>';}).join(''):emptyRow(4,'Sem rateio neste departamento.');document.querySelectorAll('[data-dept-scope]').forEach(function(tr){tr.onclick=function(){openDepartmentBreakdown(a[Number(tr.dataset.deptScope)].nome);};});
};

var _rhV8RenderCharts=renderCharts;
renderCharts=function(){_rhV8RenderCharts();rhPopulateDeptFilters();};

var _rhV8RenderAll=renderAll;
renderAll=function(){_rhV8RenderAll();rhEnsureScreenDeptFilters();};
