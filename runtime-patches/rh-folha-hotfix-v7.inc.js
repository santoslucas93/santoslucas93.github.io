/* RH & Folha — hotfix v7: vínculos, Superintendência e layout de Encargos */
var _rhV7DepartmentName=departmentName;
departmentName=function(v){
  var out=_rhV7DepartmentName(v);
  return cleanSearch(out)==='superintendencia'?'Superintendência':out;
};

function rhLiveVinculoCounts(){
  var c={clt:0,estagiario:0,outros:0};
  S.pessoas.forEach(function(p){
    var k=rhVinculoCategory(p);
    if(k==='clt')c.clt+=1;
    else if(k==='estagiario')c.estagiario+=1;
    else c.outros+=1;
  });
  return c;
}

var _rhV7RenderCharts=renderCharts;
renderCharts=function(){
  _rhV7RenderCharts();
  if(!S.competencia||!window.Chart||!$('chart-vinculos'))return;
  var c=chartColors(),v=rhLiveVinculoCounts();
  chart('chart-vinculos','doughnut',{
    labels:['CLT · '+v.clt,'Estagiários · '+v.estagiario,'Outros · '+v.outros],
    datasets:[{data:[v.clt,v.estagiario,v.outros],backgroundColor:[c.blue,c.gold,c.purple],borderColor:getComputedStyle(document.body).getPropertyValue('--surface'),borderWidth:3}]
  },{cutout:'66%',plugins:{legend:{position:'bottom'}}},function(evt,elements){
    if(elements.length)openVinculoBreakdown(['CLT','Estagiários','Outros'][elements[0].index]);
  });
  $('chart-vinculos').style.cursor='pointer';
};

var _rhV7RenderKpis=renderKpis;
renderKpis=function(){
  _rhV7RenderKpis();
  var v=rhLiveVinculoCounts();
  if($('kpi-vinculos'))$('kpi-vinculos').textContent=v.clt+' CLT · '+v.estagiario+' Estagiários · '+v.outros+' Outros';
};

var _rhV7FilteredPessoas=filteredPessoas;
filteredPessoas=function(){
  var fv=($('filter-vinculo')&&$('filter-vinculo').value)||'',fd=($('filter-dept')&&$('filter-dept').value)||'';
  return S.pessoas.filter(function(p){
    if(fv&&fv!=='todos'&&rhVinculoCategory(p)!==fv)return false;
    if(fd&&rhDeptKey(departmentName(p.departamento))!==rhDeptKey(departmentName(fd)))return false;
    return true;
  });
};

var _rhV7SetupUI=setupUI;
setupUI=function(){
  _rhV7SetupUI();
  if(!$('_rh_hotfix_v7_styles')){
    var st=document.createElement('style');st.id='_rh_hotfix_v7_styles';
    st.textContent='@media(min-width:1200px){#charges-kpis{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:14px!important}#charges-kpis .kpi{min-width:0!important;padding:24px 20px!important}#charges-kpis .kpi strong{font-size:clamp(1.55rem,2.05vw,2.3rem)!important;white-space:nowrap}#charges-kpis .kpi span{font-size:.72rem!important}}'
      +'@media(max-width:1199px){#charges-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}}'
      +'@media(max-width:680px){#charges-kpis{grid-template-columns:1fr!important}}';
    document.head.appendChild(st);
  }
};

/* Custo Real é criado dinamicamente e não possui .page-head; injeta os filtros diretamente no topo da página. */
function rhV7EnsureCustoRealFilters(){
  var page=$('page-custoreal');if(!page)return;
  if(!$('custo-real-scope-filters')){
    var bar=document.createElement('div');bar.id='custo-real-scope-filters';bar.className='filter-bar custo-real-scope-filters';
    bar.innerHTML='<label class="rh-scope-label">Departamento<select id="rh-scope-dept-custoreal" data-rh-scope-dept></select></label>'
      +'<label class="rh-scope-label">Vínculo<select id="rh-scope-vinc-custoreal" data-rh-scope-vinc></select></label>';
    var anchor=$('custo-real-kpis');if(anchor&&anchor.parentNode===page)page.insertBefore(bar,anchor);else page.appendChild(bar);
  }
  if(!$('_rh_v7_custo_filters_style')){
    var st=document.createElement('style');st.id='_rh_v7_custo_filters_style';
    st.textContent='.custo-real-scope-filters{display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap;margin:0 0 16px}.custo-real-scope-filters label{display:grid;gap:5px;color:var(--muted);font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.custo-real-scope-filters select{min-width:190px;height:40px;padding:0 12px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface);color:var(--text)}@media(max-width:680px){.custo-real-scope-filters{justify-content:stretch}.custo-real-scope-filters label,.custo-real-scope-filters select{width:100%;min-width:0}}';
    document.head.appendChild(st);
  }
}
var _rhV7CostSetupUI=setupUI;
setupUI=function(){_rhV7CostSetupUI();rhV7EnsureCustoRealFilters();};
