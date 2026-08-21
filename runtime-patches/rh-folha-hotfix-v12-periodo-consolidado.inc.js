/* RH & Folha — hotfix v12: período global (ano/mês) com consolidado multi-competência */
var RH_PERIOD={year:'',month:'all',active:[],loading:false};
var _rhPeriodBaseSelectCompetence=selectCompetence;
var _rhPeriodBaseFormatCompetence=formatCompetence;

function rhPeriodDate(c){return String(c&&c.competencia||'').slice(0,10);}
function rhPeriodYear(c){return rhPeriodDate(c).slice(0,4);}
function rhPeriodMonth(c){return rhPeriodDate(c).slice(5,7);}
function rhPeriodLabel(){
  if(!RH_PERIOD.year)return RH_PERIOD.month==='all'?'Todos os períodos':('Mês '+RH_PERIOD.month);
  if(RH_PERIOD.month==='all')return RH_PERIOD.year+' · Todos os meses';
  return RH_PERIOD.month+'/'+RH_PERIOD.year;
}
function rhPeriodSelectedCompetences(){
  return (S.competencias||[]).filter(function(c){
    if(RH_PERIOD.year&&rhPeriodYear(c)!==RH_PERIOD.year)return false;
    if(RH_PERIOD.month!=='all'&&rhPeriodMonth(c)!==RH_PERIOD.month)return false;
    return true;
  }).sort(function(a,b){return rhPeriodDate(a).localeCompare(rhPeriodDate(b));});
}
function rhPeriodSum(items,key){return (items||[]).reduce(function(a,x){return a+(Number(x&&x[key])||0);},0);}
function rhPeriodSumObject(items){
  var out={};(items||[]).forEach(function(obj){Object.keys(obj||{}).forEach(function(k){if(k==='situacoes')return;var v=obj[k];if(typeof v==='number'||(typeof v==='string'&&v!==''&&!isNaN(Number(v))))out[k]=(Number(out[k])||0)+(Number(v)||0);});});return out;
}
function rhPeriodLatest(items){return (items||[]).slice().sort(function(a,b){return rhPeriodDate(a).localeCompare(rhPeriodDate(b));}).pop()||{};}
function rhPeriodUniquePeopleCounts(rows){
  var v={clt:0,estagiario:0,outros:0};(rows||[]).forEach(function(p){var k=typeof rhVinculoCategory==='function'?rhVinculoCategory(p):'outros';v[k]=(v[k]||0)+1;});return v;
}
function rhPeriodDepartments(rows){
  var m={};(rows||[]).forEach(function(p){var k=departmentName(p.departamento);if(!m[k])m[k]={nome:k,proventos:0,descontos:0,liquido:0};m[k].proventos+=Number(p.proventos)||0;m[k].descontos+=Number(p.descontos)||0;m[k].liquido+=Number(p.liquido)||0;});return Object.keys(m).map(function(k){return m[k];}).sort(function(a,b){return b.liquido-a.liquido;});
}
function rhPeriodRubrics(rows){
  var m={};(rows||[]).forEach(function(p){(p.lancamentos||[]).forEach(function(l){var code=l.rubrica_codigo||l.codigo||'',name=l.rubrica_nome||l.nome||'',type=l.tipo||'';var k=code+'|'+name+'|'+type;if(!m[k])m[k]={codigo:code,nome:name,tipo:type,valor:0};m[k].valor+=Number(l.valor)||0;});});return Object.keys(m).map(function(k){return m[k];}).sort(function(a,b){return b.valor-a.valor;});
}
function rhPeriodCostCenters(rows){
  var m={};(rows||[]).forEach(function(p){var k=String(p.centro_custo||'').trim()||'Sem centro de custo';if(!m[k])m[k]={codigo:k,nome:k,proventos:0,descontos:0,liquido:0};m[k].proventos+=Number(p.proventos)||0;m[k].descontos+=Number(p.descontos)||0;m[k].liquido+=Number(p.liquido)||0;});return Object.keys(m).map(function(k){return m[k];});
}
function rhPeriodAggregatePeople(colaboradores,folhas,lancamentos,competencias){
  var meta={},order={},byFolha={},groups={};
  (colaboradores||[]).forEach(function(c){meta[c.id]=c;});
  (competencias||[]).forEach(function(c){order[c.id]=rhPeriodDate(c);});
  (lancamentos||[]).forEach(function(l){(byFolha[l.folha_colaborador_id]||(byFolha[l.folha_colaborador_id]=[])).push(l);});
  (folhas||[]).forEach(function(f){(groups[f.colaborador_id]||(groups[f.colaborador_id]=[])).push(f);});
  return Object.keys(groups).map(function(cid){
    var fs=groups[cid].slice().sort(function(a,b){return String(order[a.competencia_id]||'').localeCompare(String(order[b.competencia_id]||''));}),latest=fs[fs.length-1]||{},p=Object.assign({},meta[cid]||{},latest);
    p.id=cid;p.colaborador_id=cid;p.competencias=fs.map(function(f){return f.competencia_id;});p.folha_ids=fs.map(function(f){return f.id;});
    ['horas_mes','proventos','descontos','liquido','informativa','base_inss','excedente_inss','base_fgts','valor_fgts','base_irrf','valor_irrf'].forEach(function(k){p[k]=rhPeriodSum(fs,k);});
    p.salario=Number(latest.salario)||Number((meta[cid]||{}).salario)||0;
    p.lancamentos=[];fs.forEach(function(f){p.lancamentos=p.lancamentos.concat(byFolha[f.id]||[]);});
    return p;
  }).sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});
}
function rhPeriodAggregateBenefits(rows){
  var m={};(rows||[]).forEach(function(b){var k=String(b.colaborador_id||b.matricula||b.cpf_mascarado||b.cpf||'').trim();if(!k)return;if(!m[k])m[k]=Object.assign({},b,{seguro_vida:0,assistencia_medica:0,assist_medica:0,vr_caixa:0,vale_transporte:0});m[k].seguro_vida+=Number(b.seguro_vida)||0;m[k].assistencia_medica+=Number(b.assistencia_medica||b.assist_medica)||0;m[k].assist_medica=m[k].assistencia_medica;m[k].vr_caixa+=Number(b.vr_caixa)||0;m[k].vale_transporte+=Number(b.vale_transporte)||0;});return Object.keys(m).map(function(k){return m[k];});
}
function rhPeriodValidationRows(comps){
  var out=[];(comps||[]).forEach(function(c){(c.validacoes||[]).forEach(function(v){var x=Object.assign({},v);x.mensagem='['+_rhPeriodBaseFormatCompetence(c.competencia)+'] '+(v.mensagem||v.msg||'Validação');x.msg=x.mensagem;out.push(x);});});return out;
}
function rhPeriodSyntheticCompetence(comps,people){
  var latest=rhPeriodLatest(comps),enc=rhPeriodSumObject((comps||[]).map(function(c){return c.encargos||{};})),links=rhPeriodUniquePeopleCounts(people),proventos=rhPeriodSum(comps,'proventos'),descontos=rhPeriodSum(comps,'descontos'),liquido=rhPeriodSum(comps,'liquido'),baseInss=rhPeriodSum(comps,'base_inss'),baseFgts=rhPeriodSum(comps,'base_fgts'),fgts=rhPeriodSum(comps,'valor_fgts'),baseIrrf=rhPeriodSum(comps,'base_irrf');
  enc.situacoes={empregados:links.clt,estagiarios:links.estagiario,trabalhando:(people||[]).filter(function(p){return !/demit/i.test(p.situacao||'');}).length,demitido:(people||[]).filter(function(p){return /demit/i.test(p.situacao||'');}).length,ferias:(people||[]).filter(function(p){return /f[eé]rias/i.test(p.situacao||'');}).length};
  var resumo={pessoas:(people||[]).length,empregados:links.clt,estagiarios:links.estagiario,trabalhando:enc.situacoes.trabalhando,demitidos:enc.situacoes.demitido,ferias:enc.situacoes.ferias,admissoes:(people||[]).filter(function(p){var ym=String(p.admissao||'').slice(0,7);return (comps||[]).some(function(c){return rhPeriodDate(c).slice(0,7)===ym;});}).length,departamentos:rhPeriodDepartments(people),centros_custo:rhPeriodCostCenters(people),rubricas:rhPeriodRubrics(people),periodo:{ano:RH_PERIOD.year||null,mes:RH_PERIOD.month,competencias:(comps||[]).map(function(c){return c.id;})}};
  return {id:'period:'+String(RH_PERIOD.year||'all')+':'+String(RH_PERIOD.month),competencia:String(RH_PERIOD.year||'0000')+'-00-01',empresa_codigo:latest.empresa_codigo||'',empresa_nome:latest.empresa_nome||'',tipo_calculo:'Consolidado do período',fonte:'consolidado',status:'consolidado',proventos:proventos,descontos:descontos,liquido:liquido,base_inss:baseInss,base_fgts:baseFgts,valor_fgts:fgts,base_irrf:baseIrrf,encargos:enc,resumo:resumo,validacoes:rhPeriodValidationRows(comps),_periodConsolidated:true,_periodCompetencias:comps};
}
function rhPeriodIdsFilter(ids){return 'in.('+ids.join(',')+')';}
async function rhPeriodLoad(){
  if(RH_PERIOD.loading)return;RH_PERIOD.loading=true;
  try{
    var comps=rhPeriodSelectedCompetences();RH_PERIOD.active=comps;
    rhPeriodUpdateBadge(comps);
    if(!comps.length){S.competencia=null;S.pessoas=[];S.folhas=[];S.lancamentos=[];if($('empty-state'))$('empty-state').hidden=false;if($('dashboard'))$('dashboard').hidden=true;renderEmptyTables();return;}
    if(comps.length===1){await _rhPeriodBaseSelectCompetence(comps[0].id);rhPeriodUpdateBadge(comps);rhPeriodAfterRender();return;}
    var ids=comps.map(function(c){return c.id;}),requests=[];
    requests.push(can('ver_nomes')||canAdmin()?api('rh_colaboradores?select=*&order=nome'):Promise.resolve([]));
    requests.push(can('ver_valores_individuais')||canAdmin()?api('rh_folha_colaboradores?competencia_id='+rhPeriodIdsFilter(ids)+'&select=*'):Promise.resolve([]));
    requests.push(can('ver_valores_individuais')||canAdmin()?api('rh_lancamentos?competencia_id='+rhPeriodIdsFilter(ids)+'&select=*&order=valor.desc'):Promise.resolve([]));
    var out=await Promise.all(requests);S.colaboradores=out[0]||[];S.folhas=out[1]||[];S.lancamentos=out[2]||[];S.pessoas=rhPeriodAggregatePeople(S.colaboradores,S.folhas,S.lancamentos,comps);S.beneficios=[];
    try{var ben=await api('beneficios_colaboradores?select=*&competencia_id='+rhPeriodIdsFilter(ids));if(ben&&ben.length)S.beneficios=rhPeriodAggregateBenefits(ben);}catch(e){try{var active=await api('ben_contratos?select=*&is_ativo=eq.true');if(active&&active.length)S.beneficios=active;}catch(ignore){}}
    S.competencia=rhPeriodSyntheticCompetence(comps,S.pessoas);renderAll();rhPeriodAfterRender();
  }finally{RH_PERIOD.loading=false;}
}
function rhPeriodYears(){var m={};(S.competencias||[]).forEach(function(c){var y=rhPeriodYear(c);if(y)m[y]=1;});return Object.keys(m).sort().reverse();}
function rhPeriodMonthsForYear(year){var m={};(S.competencias||[]).forEach(function(c){if(!year||rhPeriodYear(c)===year)m[rhPeriodMonth(c)]=1;});return m;}
function rhPeriodPopulate(){
  var ys=$('rh-period-year'),ms=$('rh-period-month');if(!ys||!ms)return;var years=rhPeriodYears(),prevY=RH_PERIOD.year||ys.value,prevM=RH_PERIOD.month||ms.value||'all';
  if(!prevY&&years.length)prevY=years[0];RH_PERIOD.year=prevY;
  ys.innerHTML=years.map(function(y){return '<option value="'+esc(y)+'">'+esc(y)+'</option>';}).join('');if(prevY)ys.value=prevY;
  var have=rhPeriodMonthsForYear(prevY),names=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  ms.innerHTML='<option value="all">Todos os meses</option>'+names.map(function(n,i){var mm=String(i+1).padStart(2,'0'),disabled=have[mm]?'':' disabled';return '<option value="'+mm+'"'+disabled+'>'+n+'</option>';}).join('');
  if(prevM!=='all'&&!have[prevM])prevM='all';RH_PERIOD.month=prevM;ms.value=prevM;
}
function rhPeriodUpdateBadge(comps){
  var b=$('rh-period-badge');if(b)b.textContent=rhPeriodLabel()+' · '+(comps||[]).length+' competência'+((comps||[]).length===1?'':'s');
  var old=$('competencia-select');if(old&&old.parentElement)old.parentElement.hidden=true;
}
function rhPeriodEnsureUI(){
  if($('rh-period-global'))return;var content=document.querySelector('#app .content');if(!content)return;var bar=document.createElement('div');bar.id='rh-period-global';bar.className='rh-period-global';bar.innerHTML='<div class="rh-period-copy"><span class="eyebrow">PERÍODO GLOBAL</span><strong>Consolidado do RH & Folha</strong><small>O mesmo período é aplicado em todas as telas.</small></div><div class="rh-period-controls"><label>Ano<select id="rh-period-year"></select></label><label>Mês<select id="rh-period-month"><option value="all">Todos os meses</option></select></label><span class="source-badge" id="rh-period-badge">—</span></div>';content.insertBefore(bar,content.firstChild);
  var st=document.createElement('style');st.id='_rh_period_styles';st.textContent='.rh-period-global{position:sticky;top:0;z-index:30;display:flex;justify-content:space-between;align-items:center;gap:18px;padding:12px 16px;margin:-2px 0 18px;border:1px solid var(--line-soft);border-radius:14px;background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(0,0,0,.12)}.rh-period-copy{display:flex;flex-direction:column;gap:2px}.rh-period-copy strong{font-size:.94rem}.rh-period-copy small{color:var(--muted);font-size:.72rem}.rh-period-controls{display:flex;align-items:end;gap:10px;flex-wrap:wrap;justify-content:flex-end}.rh-period-controls label{display:flex;flex-direction:column;gap:4px;color:var(--muted);font-size:.68rem;font-weight:800;text-transform:uppercase}.rh-period-controls select{min-width:142px;padding:8px 32px 8px 10px;border:1px solid var(--line-soft);border-radius:9px;background:var(--surface-2);color:var(--text);font:inherit;text-transform:none}.rh-period-global .source-badge{margin-bottom:1px}@media(max-width:850px){.rh-period-global{position:relative;align-items:flex-start;flex-direction:column}.rh-period-controls{width:100%;justify-content:flex-start}.rh-period-controls label{flex:1}.rh-period-controls select{width:100%}}';document.head.appendChild(st);
  $('rh-period-year').onchange=function(){RH_PERIOD.year=this.value;RH_PERIOD.month='all';rhPeriodPopulate();rhPeriodLoad().catch(function(e){toast('Não foi possível consolidar o período: '+e.message,true);});};
  $('rh-period-month').onchange=function(){RH_PERIOD.month=this.value;rhPeriodLoad().catch(function(e){toast('Não foi possível consolidar o período: '+e.message,true);});};
}
function rhPeriodAfterRender(){
  rhPeriodUpdateBadge(RH_PERIOD.active);
  if(typeof renderHistory==='function'&&S.view==='historico')renderHistory();
  if(typeof renderInsights==='function'&&S.view==='indicadores')renderInsights();
  if(typeof renderDossier==='function'&&S.view==='dossie')renderDossier();
  if(S.competencia&&S.competencia._periodConsolidated){var btn=$('rh-closing-advance'),help=$('rh-closing-help');if(btn){btn.disabled=true;btn.hidden=false;btn.textContent='Selecione um mês para avançar';}if(help)help.textContent='O consolidado é somente leitura para fechamento. Selecione um mês específico no filtro global para conferir, conciliar ou fechar a competência.';}
}

formatCompetence=function(v){if(String(v||'').slice(5,7)==='00')return rhPeriodLabel();return _rhPeriodBaseFormatCompetence(v);};
loadCompetences=async function(){S.competencias=await api('rh_competencias?select=*&order=competencia.desc');rhPeriodPopulate();await rhPeriodLoad();};
selectCompetence=async function(id){var c=(S.competencias||[]).find(function(x){return x.id===id;});if(c){RH_PERIOD.year=rhPeriodYear(c);RH_PERIOD.month=rhPeriodMonth(c);rhPeriodPopulate();await rhPeriodLoad();}else await rhPeriodLoad();};

if(typeof rhHistoryRows==='function')rhHistoryRows=function(){return rhHistoryAllRows().filter(function(x){if(RH_PERIOD.year&&String(x.competencia||'').slice(0,4)!==RH_PERIOD.year)return false;if(RH_PERIOD.month!=='all'&&String(x.competencia||'').slice(5,7)!==RH_PERIOD.month)return false;return true;});};
if(typeof rhHistoryPopulateYears==='function')rhHistoryPopulateYears=function(){var s=$('rh-history-year');if(!s)return;s.innerHTML='<option>'+esc(rhPeriodLabel())+'</option>';s.disabled=true;};

var _rhPeriodSetupUI=setupUI;
setupUI=function(){_rhPeriodSetupUI();rhPeriodEnsureUI();};
