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
