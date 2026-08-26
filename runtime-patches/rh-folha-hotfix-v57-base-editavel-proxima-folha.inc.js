/* RH v57 — salário mensal editável, quadro atual e Próxima Folha tributária 2026 */
(function(){
'use strict';

var V57={
  loaded:false,loading:null,rendering:false,latest:null,competences:[],contexts:[],params:new Map(),
  snapshot:null,target:'',timer:0,roster:[]
};
var TAX57={
  versao:'2026.1',vigencia:'01/2026',dependente:189.59,simplificado:607.20,
  inss:[[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]],
  irrf:[[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]]
};

function E57(id){return document.getElementById(id)}
function n57(v){var x=Number(v);return isFinite(x)?x:0}
function r257(v){return Math.round((n57(v)+Number.EPSILON)*100)/100}
function trunc257(v){return Math.floor((Math.max(0,n57(v))+1e-9)*100)/100}
function norm57(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim()}
function esc57(v){try{return esc(String(v==null?'':v))}catch(e){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}}
function money57(v){try{return fmt(n57(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n57(v))}}
function pct57(v){return new Intl.NumberFormat('pt-BR',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2}).format(n57(v))}
function parseBr57(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function comp57(v){if(!v)return '—';var p=String(v).slice(0,7).split('-');return p[1]+'/'+p[0]}
function nextDate57(v){var d=new Date(String(v).slice(0,10)+'T12:00:00');return new Date(d.getFullYear(),d.getMonth()+1,1,12)}
function isoMonth57(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01'}
function sum57(rows,key){return r257(rows.reduce(function(s,x){return s+n57(x[key])},0))}
function personKey57(p){return String(p&&p.colaborador_id||p&&p.id||'')}
function isMonthly57(c){return /FOLHA MENSAL/.test(norm57(c&&c.tipo_calculo))}
function isDismissed57(v){return /DEMIT|DESLIG|RESCIND|INATIV|TRANSFERID/.test(norm57(v))}
function isVacation57(l){var x=norm57((l&&l.rubrica_codigo||'')+' '+(l&&l.rubrica_nome||''));return /FERIAS/.test(x)&&!/RESCISAO|PROPORCIONAIS|VENCIDAS/.test(x)}
function isTermination57(l){return /RESCISAO|SALDO DE SALARIO|FERIAS PROPORCIONAIS|FERIAS VENCIDAS/.test(norm57((l&&l.rubrica_codigo||'')+' '+(l&&l.rubrica_nome||'')))}
function isClt57(p){return /CELET|\bCLT\b/.test(norm57(p&&p.vinculo_snapshot||p&&p.vinculo))}
function isIntern57(p){return /ESTAG/.test(norm57(p&&p.vinculo_snapshot||p&&p.vinculo))}
function isApprentice57(p){return /APRENDIZ/.test(norm57(p&&p.vinculo_snapshot||p&&p.vinculo))}
function activePlan57(){var p=Array.from(document.querySelectorAll('#page-planejamento [data-plan-pane]')).find(function(x){return !x.hidden&&getComputedStyle(x).display!=='none'});return p&&p.dataset.planPane||''}
function allowedAdmin57(){try{return canAdmin()}catch(e){return false}}
function warning57(msg){try{toast(msg,true)}catch(e){alert(msg)}}
function ok57(msg){try{toast(msg)}catch(e){}}

function latestCompetences57(){
  return (S.competencias||[]).filter(isMonthly57).slice().sort(function(a,b){return String(b.competencia||'').localeCompare(String(a.competencia||''))}).slice(0,6)
}
function latestActual57(){return latestCompetences57()[0]||null}
function target57(){var c=V57.latest||latestActual57();return c?isoMonth57(nextDate57(c.competencia)):''}

async function load57(force){
  var latest=latestActual57();if(!latest)return;
  var target=isoMonth57(nextDate57(latest.competencia));
  if(!force&&V57.loaded&&V57.latest&&String(V57.latest.id)===String(latest.id)&&V57.target===target)return;
  if(V57.loading&&!force)return V57.loading;
  V57.loading=(async function(){
    var comps=latestCompetences57(),ids=comps.map(function(c){return c.id});
    var inIds='('+ids.join(',')+')';
    var responses=await Promise.all([
      api('rh_colaboradores?select=*'),
      api('rh_folha_colaboradores?competencia_id=in.'+inIds+'&select=*'),
      api('rh_lancamentos?competencia_id=in.'+inIds+'&select=*'),
      api('rh_projecao_parametros?competencia=eq.'+encodeURIComponent(target)+'&select=*').catch(function(){return []})
    ]);
    var people=responses[0]||[],folhas=responses[1]||[],launches=responses[2]||[],params=responses[3]||[];
    var byPerson={},byComp={},byFolha={},compMap={};
    people.forEach(function(p){byPerson[String(p.id)]=p});comps.forEach(function(c){compMap[String(c.id)]=c});
    launches.forEach(function(l){(byFolha[String(l.folha_colaborador_id)]||(byFolha[String(l.folha_colaborador_id)]=[])).push(l)});
    folhas.forEach(function(f){f._comp=(compMap[String(f.competencia_id)]||{}).competencia||'';f._launches=byFolha[String(f.id)]||[];(byComp[String(f.colaborador_id)]||(byComp[String(f.colaborador_id)]=[])).push(f)});
    Object.keys(byComp).forEach(function(k){byComp[k].sort(function(a,b){return String(b._comp).localeCompare(String(a._comp))})});
    var latestRows=folhas.filter(function(f){return String(f.competencia_id)===String(latest.id)}),contexts=[];
    latestRows.forEach(function(f){
      var c=byPerson[String(f.colaborador_id)]||{},p=Object.assign({},c,f),sit=p.situacao_snapshot||c.situacao||'';
      if(isDismissed57(sit))return;
      contexts.push({person:p,latest:f,history:byComp[String(f.colaborador_id)]||[],latestLaunches:f._launches||[]})
    });
    V57.params=new Map();params.forEach(function(p){V57.params.set(String(p.colaborador_id),p)});
    V57.latest=latest;V57.competences=comps;V57.contexts=contexts;V57.target=target;V57.loaded=true
  })().finally(function(){V57.loading=null});
  return V57.loading
}

function rates57(){
  var c=V57.latest||{},e=c.encargos||{},base=n57(e.base_total_inss||e.sal_contrib_empregados||c.base_inss);
  function safe(v,min,max,fallback){var r=base>0?n57(v)/base:0;return r>=min&&r<=max?r:fallback}
  return{inssPat:.20,rat:safe(e.rat,.005,.04,.01),terceiros:safe(e.terceiros,.01,.10,.058),pis:safe(e.valor_pis,.005,.02,.01)}
}
function inss57(base){
  base=Math.max(0,n57(base));var prev=0,total=0;
  TAX57.inss.forEach(function(b){if(base<=prev)return;var slice=Math.min(base,b[0])-prev;if(slice>0)total+=trunc257(slice*b[1]);prev=b[0]});
  return r257(total)
}
function irrf57(gross,inssValue,dependents,pension,otherDeduct){
  gross=Math.max(0,n57(gross));var legal=n57(inssValue)+Math.max(0,n57(dependents))*TAX57.dependente+n57(pension)+n57(otherDeduct);
  var deduction=Math.max(TAX57.simplificado,legal),base=Math.max(0,gross-deduction),tax=0;
  for(var i=0;i<TAX57.irrf.length;i++){var b=TAX57.irrf[i];if(base<=b[0]){tax=Math.max(0,base*b[1]-b[2]);break}}
  var reduction=0;if(gross<=5000)reduction=tax;else if(gross<=7350)reduction=Math.max(0,978.62-.133145*gross);
  return{value:r257(Math.max(0,tax-reduction)),base:r257(base),deduction:r257(deduction),legal:r257(legal),simplified:deduction===TAX57.simplificado,reduction:r257(Math.min(tax,reduction))}
}
function launchName57(l){return norm57((l&&l.rubrica_codigo||'')+' '+(l&&l.rubrica_nome||''))}
function actualInss57(row){
  var l=(row&&row._launches||[]).find(function(x){var n=launchName57(x);return x.tipo==='desconto'&&/(^| )I\.??N\.??S\.??S\.??$| 998 /.test(' '+n+' ')&&!/FERIAS|13|RESCISAO|DIFERENCA/.test(n)});
  return n57(l&&l.valor)
}
function regularRow57(ctx){
  return ctx.history.find(function(f){return !(f._launches||[]).some(isVacation57)&&!(f._launches||[]).some(isTermination57)&&n57(f.salario)>0})||ctx.latest
}
function inferredDependents57(ctx){
  var f=regularRow57(ctx),gross=n57(f.proventos)||n57(f.salario),ded=r257(gross-n57(f.base_irrf)),ins=actualInss57(f);
  if(Math.abs(ded-TAX57.simplificado)<=.08)return 0;
  var q=Math.round(Math.max(0,ded-ins)/TAX57.dependente);
  return q>=0&&q<=20&&Math.abs(ded-(ins+q*TAX57.dependente))<=1?q:0
}
function recurringEarnings57(ctx,salary,workRatio){
  var rows=[];
  for(var i=0;i<ctx.history.length;i++){
    rows=(ctx.history[i]._launches||[]).filter(function(l){var x=launchName57(l);if(l.tipo!=='provento'||/FERIAS|13 |13O|13º|DECIMO|RESCISAO|AVISO|ABONO|ADIANTAMENTO|DIAS NORMAIS|BOLSA AUXILIO/.test(x))return false;return /ADICIONAL.*FUNCAO|DUPLA FUNCAO|GRATIFICACAO.*FUNCAO|INSALUBRIDADE|PERICULOSIDADE/.test(x)});
    if(rows.length)break
  }
  return rows.map(function(l){var ref=n57(l.referencia),name=l.rubrica_nome||'Verba recorrente',value=(ref>0&&ref<=100&&(/%/.test(name)||/FUNCAO/.test(norm57(name))))?salary*workRatio*ref/100:n57(l.valor)*workRatio;return{name:name,value:r257(value),reference:ref}})
}
function operationalDiscounts57(ctx,discountBase,workRatio){
  var allowed=/CONTRIBUICAO ASSISTENCIAL|VALE TRANSPORTE|PLANO DE SAUDE|MENSALIDADE|CONVENIO|EMPRESTIMO|SEGURO/;
  var candidates=[],seen={};
  ctx.history.forEach(function(f){(f._launches||[]).forEach(function(l){var x=launchName57(l);if(l.tipo!=='desconto'||!allowed.test(x)||/INSS|IMPOSTO DE RENDA|IRRF|FERIAS|RESCISAO|13 |ADIANTAMENTO/.test(x))return;var k=norm57(l.rubrica_nome);if(!seen[k]){seen[k]=1;candidates.push(l)}})});
  return candidates.map(function(l){
    var x=launchName57(l),ref=n57(l.referencia),value=n57(l.valor);
    if(ref>0&&ref<=100&&(/%/.test(l.rubrica_nome)||/VALE TRANSPORTE|CONTRIBUICAO ASSISTENCIAL/.test(x))){
      value=discountBase*ref/100;
      if(/CONTRIBUICAO ASSISTENCIAL/.test(x)){
        var cap=0;ctx.history.forEach(function(f){(f._launches||[]).forEach(function(q){if(norm57(q.rubrica_nome)===norm57(l.rubrica_nome))cap=Math.max(cap,n57(q.valor))})});if(cap>0)value=Math.min(value,cap)
      }
    }else if(/PLANO DE SAUDE|MENSALIDADE|CONVENIO|EMPRESTIMO|SEGURO/.test(x))value=n57(l.valor);else value*=workRatio;
    return{name:l.rubrica_nome||'Desconto recorrente',value:r257(value),reference:ref}
  })
}
function row57(ctx){
  var p=ctx.person,param=V57.params.get(personKey57(p))||{},salary=n57(p.salario),vacDays=Math.max(0,Math.min(30,n57(param.dias_ferias_proxima))),cashDays=Math.max(0,Math.min(10,n57(param.dias_abono_proxima))),workRatio=(30-vacDays)/30;
  var adjust=1+n57((E57('rh-plan-adjust')||{}).value)/100,adjustedSalary=r257(salary*adjust),base=r257(adjustedSalary*workRatio),vacationPay=r257(adjustedSalary*vacDays/30),vacationThird=r257(vacationPay/3),vacationGross=r257(vacationPay+vacationThird),cashPay=r257(adjustedSalary*cashDays/30),cashThird=r257(cashPay/3),cashGross=r257(cashPay+cashThird),rec=recurringEarnings57(ctx,salary,workRatio*adjust),recTotal=r257(rec.reduce(function(s,x){return s+x.value},0)),regularGross=r257(base+recTotal),gross=r257(regularGross+vacationGross+cashGross);
  var clt=isClt57(p),intern=isIntern57(p),regular=regularRow57(ctx),hasInss=clt&&n57(regular.base_inss)>0,hasFgts=clt&&n57(regular.base_fgts)>0;
  var inferred=inferredDependents57(ctx),deps=param.dependentes_irrf==null?inferred:n57(param.dependentes_irrf),pension=n57(param.pensao_alimenticia),otherDeduct=n57(param.outras_deducoes_irrf);
  var contributionBase=r257(regularGross+vacationGross),inssEmp=hasInss?inss57(contributionBase):0,vacationInss=hasInss?Math.min(inssEmp,inss57(vacationGross)):0,regularInss=r257(Math.max(0,inssEmp-vacationInss)),regularIrrf=irrf57(regularGross,regularInss,deps,pension,otherDeduct),vacationIrrf=vacDays?irrf57(vacationGross,vacationInss,deps,0,0):{value:0,base:0,deduction:0,simplified:true,reduction:0},irrfTotal=r257(regularIrrf.value+vacationIrrf.value),vacationAdvance=r257(Math.max(0,vacationGross+cashGross-vacationInss-vacationIrrf.value)),ops=operationalDiscounts57(ctx,base,workRatio),opsTotal=r257(ops.reduce(function(s,x){return s+x.value},0)),manual=n57(param.outros_descontos);
  var discounts=r257(inssEmp+irrfTotal+vacationAdvance+opsTotal+pension+manual),net=r257(Math.max(0,gross-discounts)),rr=rates57(),employerBase=hasInss?contributionBase:0,fgtsBase=hasFgts?contributionBase:0,fgtsRate=isApprentice57(p) ? .02 : .08;
  var inssPat=trunc257(employerBase*rr.inssPat),rat=trunc257(employerBase*rr.rat),terc=trunc257(employerBase*rr.terceiros),pis=trunc257(employerBase*rr.pis),fgts=trunc257(fgtsBase*fgtsRate),company=r257(inssPat+rat+terc+pis+fgts),cost=r257(gross+company);
  var vacPrev=ctx.latestLaunches.some(isVacation57);
  var dep;try{dep=departmentName(p.departamento_snapshot||p.departamento)}catch(e){dep=p.departamento_snapshot||p.departamento||'—'}
  return{ctx:ctx,person:p,id:personKey57(p),folhaId:String(p.id||''),nome:p.nome||'—',departamento:dep,vinculo:p.vinculo_snapshot||p.vinculo||'—',salary:r257(salary),workRatio:workRatio,vacDays:vacDays,cashDays:cashDays,vacPrev:vacPrev,recurring:rec,recurringTotal:recTotal,baseSalary:base,vacationPay:vacationPay,vacationThird:vacationThird,vacationGross:vacationGross,cashPay:cashPay,cashThird:cashThird,cashGross:cashGross,vacationAdvance:vacationAdvance,regularGross:regularGross,employerBase:employerBase,fgtsBase:fgtsBase,proventos:gross,ops:ops,opsTotal:opsTotal,manualDiscount:manual,pension:pension,dependents:deps,inferredDependents:inferred,otherDeduct:otherDeduct,inssEmp:inssEmp,vacationInss:vacationInss,regularInss:regularInss,irrf:irrfTotal,regularIrrf:regularIrrf.value,vacationIrrf:vacationIrrf.value,regularIrrfBase:regularIrrf.base,vacationIrrfBase:vacationIrrf.base,regularIrrfDeduction:regularIrrf.deduction,vacationIrrfDeduction:vacationIrrf.deduction,regularIrrfSimplified:regularIrrf.simplified,vacationIrrfSimplified:vacationIrrf.simplified,irrfBase:r257(regularIrrf.base+vacationIrrf.base),irrfDeduction:r257(regularIrrf.deduction+vacationIrrf.deduction),irrfSimplified:regularIrrf.simplified&&vacationIrrf.simplified,irrfReduction:r257(regularIrrf.reduction+vacationIrrf.reduction),retained:r257(inssEmp+irrfTotal),descontos:discounts,liquido:net,inssPat:inssPat,rat:rat,terceiros:terc,pis:pis,fgts:fgts,encargos:company,taxTotal:r257(inssEmp+irrfTotal+company),custo:cost,isClt:clt,isIntern:intern,hasInss:hasInss,hasFgts:hasFgts,param:param}
}
function snapshot57(){
  var rows=V57.contexts.map(row57).sort(function(a,b){return b.custo-a.custo}),t={rows:rows};
  ['proventos','descontos','liquido','inssEmp','irrf','inssPat','rat','terceiros','pis','fgts','encargos','custo'].forEach(function(k){t[k]=sum57(rows,k)});
  t.retained=r257(t.inssEmp+t.irrf);t.taxTotal=r257(t.retained+t.encargos);t.vacationCount=rows.filter(function(r){return r.vacPrev}).length;t.target=V57.target;t.count=rows.length;
  return t
}

function table57(t){
  var admin=allowedAdmin57();
  return '<div class="table-wrap"><table class="rh57-table"><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Salário-base</th><th class="money">Proventos previstos</th><th class="money">Descontos calculados</th><th class="money">Líquido previsto</th><th class="money">Encargos empresa</th><th class="money">Custo previsto</th></tr></thead><tbody>'+t.rows.map(function(r){return '<tr data-rh57-row="'+esc57(r.id)+'"><td><b>'+esc57(r.nome)+'</b><small class="rh57-row-meta">'+esc57(r.vinculo)+(r.vacPrev?' · férias na base anterior':'')+(r.vacDays?' · '+r.vacDays+' dia(s) de férias projetados':'')+'</small>'+(admin?'<button type="button" class="rh57-mini" data-rh57-adjust="'+esc57(r.id)+'">Ajustar cálculo</button>':'')+'</td><td>'+esc57(r.departamento)+'</td><td class="money">'+money57(r.salary)+'</td><td class="money">'+money57(r.proventos)+'</td><td class="money">'+money57(r.descontos)+'</td><td class="money"><b>'+money57(r.liquido)+'</b></td><td class="money">'+money57(r.encargos)+'</td><td class="money"><b>'+money57(r.custo)+'</b></td></tr>'}).join('')+'</tbody><tfoot><tr><td><b>TOTAL</b></td><td></td><td></td><td class="money"><b>'+money57(t.proventos)+'</b></td><td class="money"><b>'+money57(t.descontos)+'</b></td><td class="money"><b>'+money57(t.liquido)+'</b></td><td class="money"><b>'+money57(t.encargos)+'</b></td><td class="money"><b>'+money57(t.custo)+'</b></td></tr></tfoot></table></div>'
}
function summaryCard57(label,value,note,key,featured){return '<button type="button" class="rh47-summary-card rh57-summary-card '+(featured?'featured':'')+'" data-rh57-key="'+key+'" data-rh-authoritative-total="1"><span>'+esc57(label)+'</span><strong>'+money57(value)+'</strong><small>'+esc57(note)+'</small></button>'}
function taxLine57(key,label,base,rate,value,nature){return '<button type="button" class="rh57-tax-line" data-rh57-tax="'+key+'"><span><b>'+esc57(label)+'</b><small>'+esc57(nature)+'</small></span><span>'+money57(base)+'</span><span>'+pct57(rate)+'</span><strong>'+money57(value)+'</strong></button>'}
function installSummary57(t){
  var k=E57('rh-plan-folha-kpis');if(!k)return;k.hidden=true;k.style.setProperty('display','none','important');var old=E57('rh47-forecast-summary');if(old)old.remove();var old57=E57('rh57-forecast-summary');if(old57)old57.remove();
  var box=document.createElement('section');box.id='rh57-forecast-summary';box.className='rh47-summary rh57-summary';
  var rr=rates57(),baseEmp=sum57(t.rows,'employerBase'),baseFgts=sum57(t.rows,'fgtsBase');
  box.innerHTML='<div class="rh47-summary-grid">'+
    summaryCard57('Proventos previstos',t.proventos,'salário vigente + verbas recorrentes','prov')+
    summaryCard57('Descontos calculados',t.descontos,'INSS + IRRF + descontos recorrentes','disc')+
    summaryCard57('Líquido previsto',t.liquido,'proventos − descontos','liq',true)+
    summaryCard57('Impostos retidos',t.retained,'INSS dos segurados + IRRF','ret')+
    summaryCard57('Encargos empresa',t.encargos,'INSS patronal + RAT + terceiros + PIS + FGTS','company')+
    summaryCard57('Tributos / recolhimentos',t.taxTotal,'retidos + encargos da empresa','tax')+
    summaryCard57('Custo total estimado',t.custo,'proventos + encargos da empresa','cost',true)+
    '</div><div class="rh47-tax-grid"><article class="rh47-tax-panel"><div class="rh47-tax-head"><b>RETENÇÕES ESTIMADAS</b><span>Base · alíquota efetiva · valor</span></div>'+
      taxLine57('INSS_EMP','INSS dos segurados',sum57(t.rows.filter(function(r){return r.hasInss}),'proventos'),t.proventos?t.inssEmp/sum57(t.rows.filter(function(r){return r.hasInss}),'proventos'):0,t.inssEmp,'Tabela progressiva 2026, por colaborador')+
      taxLine57('IRRF','IRRF sobre folha',sum57(t.rows,'irrfBase'),sum57(t.rows,'irrfBase')?t.irrf/sum57(t.rows,'irrfBase'):0,t.irrf,'Tabela, melhor dedução e redução mensal 2026')+
    '</article><article class="rh47-tax-panel"><div class="rh47-tax-head"><b>ENCARGOS DA EMPRESA</b><span>Base · alíquota · valor</span></div>'+
      taxLine57('INSS_PAT','INSS patronal',baseEmp,.20,t.inssPat,'Pago pela empresa')+
      taxLine57('RAT','RAT',baseEmp,rr.rat,t.rat,'Razão da competência-base')+
      taxLine57('TERC','Terceiros',baseEmp,rr.terceiros,t.terceiros,'Razão da competência-base')+
      taxLine57('PIS','PIS sobre folha',baseEmp,rr.pis,t.pis,'Razão da competência-base')+
      taxLine57('FGTS','FGTS',baseFgts,baseFgts?t.fgts/baseFgts:0,t.fgts,'8% por trabalhador; 2% aprendiz')+
    '</article></div><div class="rh47-audit"><b>Auditoria da projeção</b><span class="ok">Tabela tributária '+TAX57.versao+' · vigente desde '+TAX57.vigencia+'</span><span class="ok">'+t.count+' pessoas do quadro atual</span><span class="'+(t.vacationCount?'warn':'ok')+'">Férias detectadas na base: '+t.vacationCount+'</span><span class="ok">Salários editáveis com trilha de auditoria</span></div>';
  k.insertAdjacentElement('afterend',box)
}
function renderTable57(t){var pane=document.querySelector('[data-plan-pane="folha"]'),host=E57('rh-plan-folha-table');if(!pane||!host)return;var title=E57('rh-plan-next-title');if(title)title.textContent='Previsão da folha · '+comp57(t.target);var badge=pane.querySelector('.source-badge');if(badge)badge.textContent='Salário vigente · impostos 2026 · base '+comp57(V57.latest&&V57.latest.competencia);host.innerHTML=table57(t)}

async function refresh57(force){
  if(V57.rendering)return;V57.rendering=true;
  try{await load57(!!force);if(!V57.loaded)return;var pane=document.querySelector('[data-plan-pane="folha"]');if(!pane)return;var t=snapshot57();V57.snapshot=t;renderTable57(t);installSummary57(t);enhancePayroll57();ensureWorkforceButton57()}catch(e){warning57('Não foi possível recalcular a próxima folha: '+(e.message||e))}finally{V57.rendering=false}
}
function schedule57(ms,force){clearTimeout(V57.timer);V57.timer=setTimeout(function(){refresh57(force)},ms==null?80:ms)}

function enhancePayroll57(){
  if(!allowedAdmin57())return;var body=E57('payroll-rows');if(!body)return;Array.from(body.rows||[]).forEach(function(tr,i){var p=(S.pessoas||[])[i],cell=tr.cells&&tr.cells[1];if(!p||!cell||cell.querySelector('.rh57-salary-edit'))return;var b=document.createElement('button');b.type='button';b.className='rh57-salary-edit';b.dataset.rh57Salary=String(p.id||'');b.dataset.rh57Person=personKey57(p);b.dataset.rh57Name=p.nome||'';b.dataset.rh57Value=String(n57(p.salario));b.title='Editar salário bruto desta competência';b.innerHTML='<span>'+money57(p.salario)+'</span><small>Editar salário bruto</small>';cell.textContent='';cell.appendChild(b)})
}
function ensureWorkforceButton57(){
  if(!allowedAdmin57())return;var page=E57('page-colaboradores'),head=page&&page.querySelector('.page-head');if(!head||E57('rh57-workforce'))return;var actions=head.querySelector('.head-actions');if(!actions){actions=document.createElement('div');actions.className='head-actions';head.appendChild(actions)}var b=document.createElement('button');b.type='button';b.id='rh57-workforce';b.className='button secondary admin-only';b.textContent='Gerenciar quadro atual';actions.appendChild(b)
}

function closeModal57(){var m=E57('rh57-modal');if(m)m.remove()}
function openModal57(title,subtitle,html,width){
  closeModal57();var wrap=document.createElement('div');wrap.id='rh57-modal';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.innerHTML='<section class="rh57-modal-card" style="--rh57-w:'+(width||900)+'px"><header><div><span>RH & FOLHA · CONTROLE AUDITADO</span><h2>'+esc57(title)+'</h2><p>'+esc57(subtitle||'')+'</p></div><button type="button" data-rh57-close aria-label="Fechar">×</button></header><div class="rh57-modal-body">'+html+'</div></section>';document.body.appendChild(wrap);wrap.addEventListener('click',function(e){if(e.target===wrap)closeModal57()})
}
var TAX_KEYS57=['INSS_EMP','IRRF','INSS_PAT','RAT','TERC','PIS','FGTS'];
function taxBaseMemory57(key,r){
  var base=key==='IRRF'?n57(r.irrfBase):(key==='FGTS'?n57(r.fgtsBase):n57(r.employerBase)),items=[],excluded=[];
  if(key==='IRRF'){
    if(n57(r.regularGross))items.push({sign:'+',label:'Remuneração regular tributável',value:n57(r.regularGross)});
    if(n57(r.regularIrrfDeduction))items.push({sign:'−',label:r.regularIrrfSimplified?'Dedução simplificada mensal':'Deduções legais da folha',value:n57(r.regularIrrfDeduction)});
    if(n57(r.vacationGross))items.push({sign:'+',label:'Férias + 1/3 tributáveis',value:n57(r.vacationGross)});
    if(n57(r.vacationIrrfDeduction))items.push({sign:'−',label:r.vacationIrrfSimplified?'Dedução simplificada das férias':'Deduções legais das férias',value:n57(r.vacationIrrfDeduction)});
  }else{
    if(base>0){
      if(n57(r.baseSalary))items.push({sign:'+',label:'Salário proporcional aos dias trabalhados',value:n57(r.baseSalary)});
      (r.recurring||[]).forEach(function(x){if(n57(x.value))items.push({sign:'+',label:x.name||'Verba salarial recorrente',value:n57(x.value)})});
      if(n57(r.vacationPay))items.push({sign:'+',label:'Férias',value:n57(r.vacationPay)});
      if(n57(r.vacationThird))items.push({sign:'+',label:'1/3 constitucional de férias',value:n57(r.vacationThird)});
    }else if(n57(r.regularGross+r.vacationGross))excluded.push({label:'Remuneração sem incidência para este vínculo/base',value:n57(r.regularGross+r.vacationGross)});
  }
  if(n57(r.cashPay))excluded.push({label:'Abono pecuniário não incidente',value:n57(r.cashPay)});
  if(n57(r.cashThird))excluded.push({label:'1/3 do abono não incidente',value:n57(r.cashThird)});
  var equation;
  if(key==='IRRF')equation='Folha: máx. ('+money57(r.regularGross)+' − '+money57(r.regularIrrfDeduction)+', '+money57(0)+')'+(n57(r.vacationGross)||n57(r.vacationIrrfDeduction)?' + férias: máx. ('+money57(r.vacationGross)+' − '+money57(r.vacationIrrfDeduction)+', '+money57(0)+')':'')+' = '+money57(base);
  else{equation=items.map(function(x,i){return(i?' '+x.sign+' ':'')+money57(x.value)}).join('');if(!equation)equation=base?'Base apurada pelo motor da competência':'Sem base tributável nesta projeção';else equation+=' = '+money57(base)}
  var plain=items.map(function(x){return x.sign+' '+x.label+' '+money57(x.value)}).join(' | ');
  if(excluded.length)plain+=(plain?' | ':'')+'Fora da base: '+excluded.map(function(x){return x.label+' '+money57(x.value)}).join('; ');
  if(plain)plain+=' | '+equation;
  return{base:base,items:items,excluded:excluded,equation:equation,plain:plain||equation}
}
function taxBaseMemoryHtml57(personId,keys,label){return '<button type="button" class="rh57-base-memory" data-rh57-base-person="'+esc57(personId)+'" data-rh57-base-keys="'+esc57(Array.isArray(keys)?keys.join(','):keys)+'">'+esc57(label||'Ver composição')+'</button>'}
function taxCols57(kind){
  var widths=kind==='group'?[22,13,16,13,27,9]:[22,13,11,17,8,14,8,7];
  return '<colgroup>'+widths.map(function(w){return '<col style="width:'+w+'%">'}).join('')+'</colgroup>'
}
function taxBaseGroups57(taxes){
  var groups=[];(taxes||[]).forEach(function(d){var signature=d.base.toFixed(2)+'|'+d.memory.plain,g=groups.find(function(x){return x.signature===signature});if(!g){g={signature:signature,memory:d.memory,taxes:[]};groups.push(g)}g.taxes.push(d)});return groups
}
function taxBaseGroupLabel57(group,total){
  var keys=group.taxes.map(function(d){return d.key});if(total===1&&keys.length>1)return'Base comum';if(keys.indexOf('IRRF')>=0)return'Base do IRRF';if(keys.indexOf('FGTS')>=0)return'Base do FGTS';if(keys.indexOf('INSS_EMP')>=0)return'Base previdenciária';return'Base patronal'
}
function taxBaseSummaryHtml57(taxes){var groups=taxBaseGroups57(taxes);return '<div class="rh57-base-summary">'+groups.map(function(g){return '<span><small>'+esc57(taxBaseGroupLabel57(g,groups.length))+'</small><b>'+money57(g.memory.base)+'</b></span>'}).join('')+'</div>'}
function taxValuesHtml57(taxes){return '<div class="rh57-tax-values">'+taxes.map(function(d){return '<span><b>'+esc57(d.label)+'</b><small>'+pct57(d.rate)+'</small><strong>'+money57(d.value)+'</strong></span>'}).join('')+'</div>'}
function closeBaseMemory57(){var m=E57('rh57-base-dialog');if(m)m.remove()}
function openBaseMemory57(personId,keyList){
  closeBaseMemory57();var r=(V57.snapshot&&V57.snapshot.rows||[]).find(function(x){return String(x.id)===String(personId)});if(!r)return;var keys=String(keyList||'').split(',').filter(function(k){return TAX_KEYS57.indexOf(k)>=0}),taxes=keys.map(function(k){return taxDetail57(k,r)}),groups=taxBaseGroups57(taxes);if(!taxes.length)return;
  var bases=groups.map(function(g){var memory=g.memory,lines=memory.items.map(function(x){return '<div><span><i>'+esc57(x.sign)+'</i>'+esc57(x.label)+'</span><b>'+money57(x.value)+'</b></div>'}).join(''),out=memory.excluded.map(function(x){return '<div><span><i>×</i>'+esc57(x.label)+'</span><b>'+money57(x.value)+'</b></div>'}).join('');return '<article class="rh57-base-group"><h4>'+esc57(taxBaseGroupLabel57(g,groups.length))+'<small>'+esc57(g.taxes.map(function(d){return d.label}).join(' · '))+'</small></h4><div class="rh57-base-lines">'+lines+'<div class="total"><span>Base de cálculo individual</span><b>'+money57(memory.base)+'</b></div>'+(out?'<h5>Verbas fora da base</h5>'+out:'')+'</div><div class="rh57-base-equation"><b>Como chegamos à base</b><span>'+esc57(memory.equation)+'</span></div></article>'}).join('');
  var taxRows=taxes.map(function(d){return '<div><span><b>'+esc57(d.label)+'</b><small>'+esc57(d.rule)+'</small></span><em>Base '+money57(d.base)+'</em><em>'+pct57(d.rate)+'</em><strong>'+money57(d.value)+'</strong></div>'}).join('');
  var wrap=document.createElement('div');wrap.id='rh57-base-dialog';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.innerHTML='<section><header><div><span>FORMAÇÃO DA BASE</span><h3>'+(taxes.length===1?esc57(taxes[0].label):'Composição tributária')+'</h3><p>'+esc57(r.nome)+' · '+esc57(r.departamento)+'</p></div><button type="button" data-rh57-memory-close aria-label="Fechar">×</button></header><div class="rh57-base-dialog-body">'+bases+'<div class="rh57-base-tax-list"><h4>Impostos calculados</h4>'+taxRows+'</div></div></section>';var modal=E57('rh57-modal');if(modal)modal.appendChild(wrap);wrap.addEventListener('click',function(e){if(e.target===wrap)closeBaseMemory57()})
}
function taxDetail57(key,r){
  var rr=rates57(),d={key:key,label:key,base:0,value:0,rate:0,rule:'—',detail:''};
  if(key==='INSS_EMP'){d.label='INSS dos segurados';d.base=n57(r.employerBase);d.value=n57(r.inssEmp);d.rate=d.base?d.value/d.base:0;d.rule='Tabela progressiva 2026';d.detail='Alíquota efetiva individual'}
  else if(key==='IRRF'){d.label='IRRF sobre folha';d.base=n57(r.irrfBase);d.value=n57(r.irrf);d.rate=d.base?d.value/d.base:0;d.rule='Tabela mensal + redução 2026';d.detail='Dedução '+money57(r.irrfDeduction)+' · redução '+money57(r.irrfReduction)}
  else if(key==='INSS_PAT'){d.label='INSS patronal';d.base=n57(r.employerBase);d.value=n57(r.inssPat);d.rate=.20;d.rule='20% sobre a base patronal';d.detail='Pago pela empresa'}
  else if(key==='RAT'){d.label='RAT';d.base=n57(r.employerBase);d.value=n57(r.rat);d.rate=rr.rat;d.rule='Alíquota da competência-base';d.detail='Base previdenciária individual'}
  else if(key==='TERC'){d.label='Terceiros';d.base=n57(r.employerBase);d.value=n57(r.terceiros);d.rate=rr.terceiros;d.rule='Alíquota da competência-base';d.detail='Base previdenciária individual'}
  else if(key==='PIS'){d.label='PIS sobre folha';d.base=n57(r.employerBase);d.value=n57(r.pis);d.rate=rr.pis;d.rule='Alíquota da competência-base';d.detail='Base da folha individual'}
  else if(key==='FGTS'){d.label='FGTS';d.base=n57(r.fgtsBase);d.value=n57(r.fgts);d.rate=r.isClt?(isApprentice57(r.person)?.02:.08):0;d.rule=isApprentice57(r.person)?'Aprendiz · 2%':'Regra geral · 8%';d.detail='Base FGTS individual'}
  d.memory=taxBaseMemory57(key,r);return d
}
function taxAuditRows57(t,keys){
  var out=[];(t&&t.rows||[]).forEach(function(r){(keys||TAX_KEYS57).forEach(function(k){var d=taxDetail57(k,r);out.push({person:r,tax:d})})});
  return out.sort(function(a,b){var x=String(a.person.nome).localeCompare(String(b.person.nome),'pt-BR',{sensitivity:'base'});return x||TAX_KEYS57.indexOf(a.tax.key)-TAX_KEYS57.indexOf(b.tax.key)})
}
function taxTotal57(t,key){
  var rows=(t&&t.rows||[]).map(function(r){return taxDetail57(key,r)}),base=r257(rows.reduce(function(s,d){return s+d.base},0)),value=r257(rows.reduce(function(s,d){return s+d.value},0)),first=rows[0]||taxDetail57(key,{});
  return{key:key,label:first.label,base:base,value:value,rate:/^(INSS_PAT|RAT|TERC|PIS)$/.test(key)?first.rate:(base?value/base:0),rule:first.rule}
}
function taxSummaryRows57(t){return TAX_KEYS57.map(function(k){return taxTotal57(t,k)})}
function metricModal57(title,rows,key,total,note){
  var sorted=rows.slice().sort(function(a,b){return n57(b[key])-n57(a[key])}),body='<p class="rh57-note">'+esc57(note||'Composição conciliada com o total exibido no card.')+'</p><div class="rh57-scroll"><table><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Valor</th><th class="money">% do card</th></tr></thead><tbody>'+sorted.map(function(r){var v=n57(r[key]);return '<tr><td>'+esc57(r.nome)+'</td><td>'+esc57(r.departamento)+'</td><td class="money">'+money57(v)+'</td><td class="money">'+pct57(total?v/total:0)+'</td></tr>'}).join('')+'</tbody><tfoot><tr><td><b>TOTAL DO CARD</b></td><td></td><td class="money"><b>'+money57(total)+'</b></td><td class="money"><b>100,00%</b></td></tr></tfoot></table></div>';
  openModal57(title,'Próxima folha · '+comp57(V57.target),body,920)
}
function taxMetric57(key){
  var t=V57.snapshot;if(!t||TAX_KEYS57.indexOf(key)<0)return;var total=taxTotal57(t,key),rows=t.rows.map(function(r){return{person:r,tax:taxDetail57(key,r)}}).sort(function(a,b){return b.tax.value-a.tax.value||String(a.person.nome).localeCompare(String(b.person.nome),'pt-BR',{sensitivity:'base'})});
  var note=key==='IRRF'?'A base do IRRF já considera a dedução mais vantajosa e a tabela de redução mensal de 2026.':'A base apresentada é a base tributável individual efetivamente utilizada na projeção.';
  var body='<p class="rh57-note">'+esc57(note)+'</p><div class="rh57-scroll"><table class="rh57-tax-audit rh57-tax-single">'+taxCols57('single')+'<thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Base de cálculo</th><th>Formação da base</th><th class="money">Alíquota</th><th>Regra / memória</th><th class="money">Valor</th><th class="money">% do card</th></tr></thead><tbody>'+rows.map(function(x){var d=x.tax;return '<tr><td><b>'+esc57(x.person.nome)+'</b></td><td>'+esc57(x.person.departamento)+'</td><td class="money">'+money57(d.base)+'</td><td>'+taxBaseMemoryHtml57(x.person.id,d.key)+'</td><td class="money">'+pct57(d.rate)+'</td><td>'+esc57(d.rule)+'<small class="rh57-tax-detail">'+esc57(d.detail)+'</small></td><td class="money"><b>'+money57(d.value)+'</b></td><td class="money">'+pct57(total.value?d.value/total.value:0)+'</td></tr>'}).join('')+'</tbody><tfoot><tr><td><b>TOTAL</b></td><td>'+rows.length+' colaboradores</td><td class="money"><b>'+money57(total.base)+'</b></td><td>Bases formadas individualmente</td><td class="money"><b>'+pct57(total.rate)+'</b></td><td>'+esc57(total.rule)+'</td><td class="money"><b>'+money57(total.value)+'</b></td><td class="money"><b>'+(total.value?'100,00%':'—')+'</b></td></tr></tfoot></table></div>';
  openModal57(total.label,'Próxima folha · '+comp57(V57.target),body,1260)
}
function taxGroupModal57(title,keys,total,note){
  var rows=(V57.snapshot&&V57.snapshot.rows||[]).slice().sort(function(a,b){return String(a.nome).localeCompare(String(b.nome),'pt-BR',{sensitivity:'base'})}),body='<p class="rh57-note">'+esc57(note)+' Uma linha por colaborador; bases idênticas são exibidas somente uma vez.</p><div class="rh57-scroll"><table class="rh57-tax-audit rh57-tax-group">'+taxCols57('group')+'<thead><tr><th>Colaborador</th><th>Departamento</th><th>Bases utilizadas</th><th>Formação</th><th>Impostos calculados</th><th class="money">Total</th></tr></thead><tbody>'+rows.map(function(r){var taxes=keys.map(function(k){return taxDetail57(k,r)}),personTotal=r257(taxes.reduce(function(s,d){return s+d.value},0));return '<tr><td><b>'+esc57(r.nome)+'</b></td><td>'+esc57(r.departamento)+'</td><td>'+taxBaseSummaryHtml57(taxes)+'</td><td>'+taxBaseMemoryHtml57(r.id,keys,'Ver bases')+'</td><td>'+taxValuesHtml57(taxes)+'</td><td class="money"><b>'+money57(personTotal)+'</b></td></tr>'}).join('')+'</tbody><tfoot><tr><td><b>TOTAL DO CARD</b></td><td>'+rows.length+' colaboradores</td><td>Bases individuais</td><td>Sem repetição</td><td></td><td class="money"><b>'+money57(total)+'</b></td></tr></tfoot></table></div>';
  openModal57(title,'Próxima folha · '+comp57(V57.target),body,1320)
}
function handleCard57(key){var t=V57.snapshot;if(!t)return;if(key==='prov')return metricModal57('Proventos previstos',t.rows,'proventos',t.proventos);if(key==='disc')return metricModal57('Descontos calculados',t.rows,'descontos',t.descontos);if(key==='liq')return metricModal57('Líquido previsto',t.rows,'liquido',t.liquido);if(key==='ret')return taxGroupModal57('Impostos retidos',['INSS_EMP','IRRF'],t.retained,'INSS e IRRF com a respectiva base de cálculo individual.');if(key==='company')return taxGroupModal57('Encargos da empresa',['INSS_PAT','RAT','TERC','PIS','FGTS'],t.encargos,'Encargos patronais com base, alíquota e valor por colaborador.');if(key==='tax')return taxGroupModal57('Tributos / recolhimentos',TAX_KEYS57,t.taxTotal,'Memória tributária completa da Próxima Folha, por colaborador e por imposto.');if(key==='cost')return metricModal57('Custo total estimado',t.rows,'custo',t.custo)}

function salaryModal57(b){
  openModal57('Editar salário bruto',b.dataset.rh57Name,'<div class="rh57-form"><label>Salário bruto da competência<input id="rh57-salary-value" inputmode="decimal" value="'+esc57(money57(b.dataset.rh57Value).replace('R$ ','').replace('R$ ',''))+'"></label><label>Motivo da correção<input id="rh57-salary-reason" maxlength="180" placeholder="Ex.: salário contratual corrigido"></label><div class="rh57-form-note">A correção altera apenas o salário-base usado no planejamento. Proventos, descontos e líquido oficiais da folha importada permanecem intactos.</div><button type="button" class="button primary" id="rh57-salary-save" data-folha="'+esc57(b.dataset.rh57Salary)+'">Salvar com auditoria</button></div>',560)
}
async function saveSalary57(b){
  var value=parseBr57((E57('rh57-salary-value')||{}).value),reason=String((E57('rh57-salary-reason')||{}).value||'').trim();if(value<=0)return warning57('Informe um salário bruto válido.');if(!reason)return warning57('Informe o motivo da correção.');
  b.disabled=true;try{await rpc('rh_atualizar_salario_folha',{p_folha_id:b.dataset.folha,p_salario:value,p_motivo:reason});closeModal57();ok57('Salário-base atualizado e auditado.');if(S.competencia)await selectCompetence(S.competencia.id);V57.loaded=false;schedule57(30,true)}catch(e){warning57(e.message||String(e))}finally{b.disabled=false}
}
function parameterModal57(id){
  var r=V57.snapshot&&V57.snapshot.rows.find(function(x){return x.id===String(id)});if(!r)return;var p=r.param||{};
  openModal57('Parâmetros da próxima folha',r.nome,'<div class="rh57-form grid"><label>Dependentes para IRRF<input id="rh57-p-deps" type="number" min="0" max="20" value="'+esc57(p.dependentes_irrf==null?r.inferredDependents:p.dependentes_irrf)+'"></label><label>Dias de férias em '+esc57(comp57(V57.target))+'<input id="rh57-p-vac" type="number" min="0" max="30" value="'+esc57(n57(p.dias_ferias_proxima))+'"></label><label>Dias de abono pecuniário<input id="rh57-p-cash" type="number" min="0" max="10" value="'+esc57(n57(p.dias_abono_proxima))+'"></label><label>Pensão alimentícia<input id="rh57-p-pension" inputmode="decimal" value="'+esc57(n57(p.pensao_alimenticia).toFixed(2).replace('.',','))+'"></label><label>Outras deduções legais do IRRF<input id="rh57-p-deduct" inputmode="decimal" value="'+esc57(n57(p.outras_deducoes_irrf).toFixed(2).replace('.',','))+'"></label><label>Outros descontos da folha<input id="rh57-p-other" inputmode="decimal" value="'+esc57(n57(p.outros_descontos).toFixed(2).replace('.',','))+'"></label><label>Observação<input id="rh57-p-note" maxlength="220" value="'+esc57(p.observacao||'')+'" placeholder="Opcional"></label><div class="rh57-form-note">Salário-base: <b>'+money57(r.salary)+'</b>. Férias projetadas geram dias de férias, 1/3, adiantamento e impostos; o abono fica fora das bases de INSS, FGTS e IRRF. '+(r.vacPrev?'As rubricas da competência-base não são repetidas automaticamente.':'Nenhuma rubrica regular de férias foi detectada na competência-base.')+'</div><button type="button" class="button primary" id="rh57-param-save" data-person="'+esc57(r.id)+'">Salvar parâmetros e recalcular</button></div>',720)
}
async function saveParams57(b){
  var body={p_colaborador_id:b.dataset.person,p_competencia:V57.target,p_dependentes_irrf:n57((E57('rh57-p-deps')||{}).value),p_pensao_alimenticia:parseBr57((E57('rh57-p-pension')||{}).value),p_outras_deducoes_irrf:parseBr57((E57('rh57-p-deduct')||{}).value),p_outros_descontos:parseBr57((E57('rh57-p-other')||{}).value),p_dias_ferias_proxima:n57((E57('rh57-p-vac')||{}).value),p_dias_abono_proxima:n57((E57('rh57-p-cash')||{}).value),p_observacao:String((E57('rh57-p-note')||{}).value||'').trim()||null};
  if(body.p_dependentes_irrf<0||body.p_dependentes_irrf>20||body.p_dias_ferias_proxima<0||body.p_dias_ferias_proxima>30||body.p_dias_abono_proxima<0||body.p_dias_abono_proxima>10)return warning57('Revise os parâmetros informados.');
  b.disabled=true;try{await rpc('rh_salvar_parametros_projecao',body);closeModal57();ok57('Parâmetros salvos.');V57.loaded=false;await refresh57(true)}catch(e){warning57(e.message||String(e))}finally{b.disabled=false}
}

async function rosterModal57(){
  openModal57('Quadro atual','Carregando a situação consolidada...','<div class="empty-state"><p>Consultando a última folha mensal.</p></div>',1080);
  try{V57.roster=await rpc('rh_quadro_atual',{})||[];renderRoster57()}catch(e){warning57(e.message||String(e));closeModal57()}
}
function renderRoster57(){
  var rows=V57.roster||[],active=rows.filter(function(r){return !isDismissed57(r.situacao)}).length,inactive=rows.length-active;
  var html='<div class="rh57-roster-tools"><input id="rh57-roster-search" placeholder="Buscar colaborador, matrícula ou vínculo"><div><span class="status success">'+active+' ativos</span><span class="status danger">'+inactive+' desligados</span><button type="button" class="button secondary" id="rh57-roster-sync">Sincronizar com a última folha</button></div></div><div class="rh57-scroll"><table id="rh57-roster-table"><thead><tr><th>Colaborador</th><th>Matrícula</th><th>Vínculo</th><th>Última folha</th><th>Situação atual</th><th>Origem</th><th></th></tr></thead><tbody>'+rows.map(function(r){var off=isDismissed57(r.situacao);return '<tr data-search="'+esc57(norm57([r.nome,r.matricula,r.vinculo,r.situacao].join(' ')))+'"><td><b>'+esc57(r.nome)+'</b></td><td>'+esc57(r.matricula||'—')+'</td><td>'+esc57(r.vinculo||'—')+'</td><td>'+esc57(comp57(r.ultima_competencia))+(r.presente_ultima_folha?' · presente':' · ausente')+'</td><td><span class="status '+(off?'danger':'success')+'">'+esc57(r.situacao||'—')+'</span></td><td>'+esc57(r.status_origem||'—')+'</td><td><button type="button" class="rh57-mini" data-rh57-status="'+esc57(r.colaborador_id)+'">Editar</button></td></tr>'}).join('')+'</tbody></table></div>';
  var body=E57('rh57-modal')&&E57('rh57-modal').querySelector('.rh57-modal-body');if(body)body.innerHTML=html;var s=E57('rh57-roster-search');if(s)s.oninput=function(){var q=norm57(s.value);Array.from(E57('rh57-roster-table').tBodies[0].rows).forEach(function(tr){tr.hidden=q&&tr.dataset.search.indexOf(q)<0})}
}
function statusModal57(id){
  var r=V57.roster.find(function(x){return String(x.colaborador_id)===String(id)});if(!r)return;var off=isDismissed57(r.situacao);
  openModal57('Atualizar situação',r.nome,'<div class="rh57-form"><label>Situação atual<select id="rh57-status-value"><option>Trabalhando</option><option>Férias</option><option>Afastado</option><option>Desligado</option></select></label><label>Data do desligamento<input id="rh57-status-date" type="date" value="'+esc57(r.desligamento||'')+'"></label><label>Motivo / observação<input id="rh57-status-reason" maxlength="180" placeholder="Obrigatório para rastreabilidade"></label><div class="rh57-form-note">A última folha mensal continua sendo a fonte automática do quadro. A alteração manual fica registrada na auditoria.</div><button type="button" class="button primary" id="rh57-status-save" data-person="'+esc57(r.colaborador_id)+'">Salvar situação</button></div>',560);E57('rh57-status-value').value=off?'Desligado':(r.situacao||'Trabalhando')
}
async function saveStatus57(b){
  var status=E57('rh57-status-value').value,date=(E57('rh57-status-date')||{}).value||null,reason=String((E57('rh57-status-reason')||{}).value||'').trim();if(!reason)return warning57('Informe o motivo da alteração.');if(status==='Desligado'&&!date)return warning57('Informe a data do desligamento.');b.disabled=true;
  try{await rpc('rh_atualizar_status_colaborador',{p_colaborador_id:b.dataset.person,p_situacao:status,p_desligamento:date,p_motivo:reason});ok57('Situação atualizada e auditada.');V57.loaded=false;await rosterModal57();schedule57(20,true)}catch(e){warning57(e.message||String(e))}finally{b.disabled=false}
}
async function reconcileRoster57(b){b.disabled=true;try{var total=await rpc('rh_reconciliar_quadro_atual',{});ok57('Quadro sincronizado: '+n57(total)+' cadastro(s) atualizado(s).');await rosterModal57();V57.loaded=false;schedule57(20,true)}catch(e){warning57(e.message||String(e))}finally{b.disabled=false}}

async function ensurePdf57(){if(!LIBRARIES.jspdf)LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};if(!LIBRARIES.autotable)LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API.autoTable)}};await loadLibrary('jspdf');await loadLibrary('autotable')}
function download57(blob,name){var a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},500)}
async function exportPdf57(){
  await refresh57();var t=V57.snapshot;if(!t||!t.rows.length)throw new Error('A projeção ainda não está disponível.');await ensurePdf57();var doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
  doc.setFillColor(7,26,44);doc.rect(0,0,297,30,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('Próxima Folha — Relatório Executivo',12,13);doc.setFontSize(8);doc.text('Projeção '+comp57(t.target)+' · base '+comp57(V57.latest.competencia)+' · tabelas oficiais 2026 · uso restrito',12,21);
  doc.autoTable({startY:36,head:[['Indicador','Valor']],body:[['Proventos previstos',money57(t.proventos)],['Descontos calculados',money57(t.descontos)],['Líquido previsto',money57(t.liquido)],['Impostos retidos',money57(t.retained)],['Encargos da empresa',money57(t.encargos)],['Custo total estimado',money57(t.custo)]],theme:'grid',headStyles:{fillColor:[13,43,66]},columnStyles:{1:{halign:'right',fontStyle:'bold'}}});
  var taxSummary=taxSummaryRows57(t);doc.autoTable({startY:doc.lastAutoTable.finalY+6,head:[['Obrigação','Base de cálculo','Alíquota efetiva/aplicada','Valor']],body:taxSummary.map(function(x){return[x.label,money57(x.base),pct57(x.rate),money57(x.value)]}),theme:'grid',headStyles:{fillColor:[13,43,66]},columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'right',fontStyle:'bold'}}});
  doc.addPage('a4','landscape');doc.setFillColor(7,26,44);doc.rect(0,0,297,27,'F');doc.setTextColor(255,255,255);doc.setFontSize(15);doc.text('Composição por colaborador',12,16);doc.autoTable({startY:33,margin:{left:8,right:8},tableWidth:281,head:[['Colaborador','Departamento','Salário','Proventos','Descontos','Líquido','Encargos','Custo']],body:t.rows.map(function(r){return[r.nome,r.departamento,money57(r.salary),money57(r.proventos),money57(r.descontos),money57(r.liquido),money57(r.encargos),money57(r.custo)]}),foot:[['TOTAL','','',money57(t.proventos),money57(t.descontos),money57(t.liquido),money57(t.encargos),money57(t.custo)]],theme:'striped',styles:{fontSize:6.3,cellPadding:{top:1.8,right:1.4,bottom:1.8,left:1.4},valign:'middle',overflow:'linebreak'},headStyles:{fillColor:[13,43,66],fontStyle:'bold'},footStyles:{fillColor:[234,242,246],textColor:[7,26,44],fontStyle:'bold'},columnStyles:{0:{cellWidth:76},1:{cellWidth:32},2:{cellWidth:28,halign:'right'},3:{cellWidth:28,halign:'right'},4:{cellWidth:28,halign:'right'},5:{cellWidth:28,halign:'right'},6:{cellWidth:28,halign:'right'},7:{cellWidth:33,halign:'right'}},didParseCell:function(data){if(data.column.index>=2)data.cell.styles.halign='right'}});
  doc.addPage('a4','landscape');doc.setFillColor(7,26,44);doc.rect(0,0,297,27,'F');doc.setTextColor(255,255,255);doc.setFontSize(15);doc.text('Memória tributária individual',12,16);doc.setFontSize(7.5);doc.text('Todas as bases de cálculo, alíquotas, formação e valores da projeção '+comp57(t.target),12,22);var audit=taxAuditRows57(t,TAX_KEYS57);doc.autoTable({startY:33,margin:{left:8,right:8,bottom:12},tableWidth:281,head:[['Colaborador','Depto.','Imposto','Base','Formação da base','Alíquota','Valor','Regra']],body:audit.map(function(x){return[x.person.nome,x.person.departamento,x.tax.label,money57(x.tax.base),x.tax.memory.plain,pct57(x.tax.rate),money57(x.tax.value),x.tax.rule+(x.tax.detail?' · '+x.tax.detail:'')]}),theme:'striped',styles:{fontSize:5.35,cellPadding:{top:1.5,right:1.2,bottom:1.5,left:1.2},valign:'middle',overflow:'linebreak'},headStyles:{fillColor:[13,43,66],fontStyle:'bold'},alternateRowStyles:{fillColor:[247,250,252]},columnStyles:{0:{cellWidth:43},1:{cellWidth:23},2:{cellWidth:22},3:{cellWidth:24,halign:'right'},4:{cellWidth:78},5:{cellWidth:19,halign:'right'},6:{cellWidth:24,halign:'right',fontStyle:'bold'},7:{cellWidth:48}}});
  doc.save('LNB_Proxima_Folha_'+comp57(t.target).replace('/','-')+'_v57.pdf')
}
async function exportExcel57(){
  await refresh57();var t=V57.snapshot;if(!t||!t.rows.length)throw new Error('A projeção ainda não está disponível.');if(!LIBRARIES.exceljs)LIBRARIES.exceljs={url:'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',ready:function(){return !!window.ExcelJS}};await loadLibrary('exceljs');var wb=new ExcelJS.Workbook();wb.creator='Liga Nacional de Basquete';wb.created=new Date();
  function header(row){row.eachCell(function(c){c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0D2B42'}}})}
  var rs=wb.addWorksheet('Resumo');rs.views=[{showGridLines:false}];rs.addRow(['PRÓXIMA FOLHA — RELATÓRIO EXECUTIVO']);rs.addRow(['Projeção',comp57(t.target),'Base',comp57(V57.latest.competencia),'Tabela tributária',TAX57.versao]);rs.addRow([]);header(rs.addRow(['Indicador','Valor']));[['Proventos previstos',t.proventos],['Descontos calculados',t.descontos],['Líquido previsto',t.liquido],['Impostos retidos',t.retained],['Encargos empresa',t.encargos],['Custo total',t.custo]].forEach(function(x){rs.addRow(x)});rs.getColumn(1).width=34;rs.getColumn(2).width=18;rs.getColumn(2).numFmt='R$ #,##0.00';
  var wp=wb.addWorksheet('Colaboradores');wp.views=[{showGridLines:false,state:'frozen',ySplit:1}];header(wp.addRow(['Colaborador','Departamento','Vínculo','Salário-base','Dias férias','Proventos','Base INSS','INSS','Base IRRF','IRRF','Outros descontos','Líquido','Base patronal','INSS patronal','RAT','Terceiros','PIS','Base FGTS','FGTS','Custo']));t.rows.forEach(function(r){wp.addRow([r.nome,r.departamento,r.vinculo,r.salary,r.vacDays,r.proventos,r.employerBase,r.inssEmp,r.irrfBase,r.irrf,r.opsTotal+r.pension+r.manualDiscount,r.liquido,r.employerBase,r.inssPat,r.rat,r.terceiros,r.pis,r.fgtsBase,r.fgts,r.custo])});wp.columns.forEach(function(c,i){c.width=i===0?38:(i<3?20:15);if(i>=3)c.numFmt='R$ #,##0.00'});
  var summaries=taxSummaryRows57(t),wi=wb.addWorksheet('Impostos');wi.views=[{showGridLines:false}];header(wi.addRow(['Obrigação','Base de cálculo','Alíquota efetiva/aplicada','Valor','Regra']));summaries.forEach(function(x){wi.addRow([x.label,x.base,x.rate,x.value,x.rule])});wi.getColumn(1).width=24;wi.getColumn(2).width=18;wi.getColumn(2).numFmt='R$ #,##0.00';wi.getColumn(3).width=23;wi.getColumn(3).numFmt='0.00%';wi.getColumn(4).width=18;wi.getColumn(4).numFmt='R$ #,##0.00';wi.getColumn(5).width=48;
  var wa=wb.addWorksheet('Bases por Imposto');wa.views=[{showGridLines:false,state:'frozen',ySplit:1}];header(wa.addRow(['Colaborador','Departamento','Imposto','Base de cálculo','Formação da base','Alíquota efetiva/aplicada','Valor','Regra','Memória adicional']));taxAuditRows57(t,TAX_KEYS57).forEach(function(x){wa.addRow([x.person.nome,x.person.departamento,x.tax.label,x.tax.base,x.tax.memory.plain,x.tax.rate,x.tax.value,x.tax.rule,x.tax.detail])});wa.getColumn(1).width=38;wa.getColumn(2).width=22;wa.getColumn(3).width=22;wa.getColumn(4).width=18;wa.getColumn(4).numFmt='R$ #,##0.00';wa.getColumn(5).width=76;wa.getColumn(6).width=25;wa.getColumn(6).numFmt='0.00%';wa.getColumn(7).width=18;wa.getColumn(7).numFmt='R$ #,##0.00';wa.getColumn(8).width=34;wa.getColumn(9).width=42;
  var buf=await wb.xlsx.writeBuffer();download57(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'LNB_Proxima_Folha_'+comp57(t.target).replace('/','-')+'_v57.xlsx')
}
function busyExport57(b,fn,label){var old=b.textContent;b.disabled=true;b.textContent=label;Promise.resolve().then(fn).catch(function(e){warning57(e.message||String(e))}).finally(function(){b.disabled=false;b.textContent=old})}

function handleCapture57(e){
  var close=e.target&&e.target.closest&&e.target.closest('[data-rh57-close]');if(close){e.preventDefault();e.stopImmediatePropagation();closeModal57();return true}
  var closeMemory=e.target&&e.target.closest&&e.target.closest('[data-rh57-memory-close]');if(closeMemory){e.preventDefault();e.stopImmediatePropagation();closeBaseMemory57();return true}
  var baseMemory=e.target&&e.target.closest&&e.target.closest('[data-rh57-base-person]');if(baseMemory){e.preventDefault();e.stopImmediatePropagation();openBaseMemory57(baseMemory.dataset.rh57BasePerson,baseMemory.dataset.rh57BaseKeys);return true}
  var salary=e.target&&e.target.closest&&e.target.closest('.rh57-salary-edit');if(salary){e.preventDefault();e.stopImmediatePropagation();salaryModal57(salary);return true}
  var saveSalary=e.target&&e.target.closest&&e.target.closest('#rh57-salary-save');if(saveSalary){e.preventDefault();e.stopImmediatePropagation();saveSalary57(saveSalary);return true}
  var workforce=e.target&&e.target.closest&&e.target.closest('#rh57-workforce');if(workforce){e.preventDefault();e.stopImmediatePropagation();rosterModal57();return true}
  var sync=e.target&&e.target.closest&&e.target.closest('#rh57-roster-sync');if(sync){e.preventDefault();e.stopImmediatePropagation();reconcileRoster57(sync);return true}
  var status=e.target&&e.target.closest&&e.target.closest('[data-rh57-status]');if(status){e.preventDefault();e.stopImmediatePropagation();statusModal57(status.dataset.rh57Status);return true}
  var saveStatus=e.target&&e.target.closest&&e.target.closest('#rh57-status-save');if(saveStatus){e.preventDefault();e.stopImmediatePropagation();saveStatus57(saveStatus);return true}
  var adjust=e.target&&e.target.closest&&e.target.closest('[data-rh57-adjust]');if(adjust){e.preventDefault();e.stopImmediatePropagation();parameterModal57(adjust.dataset.rh57Adjust);return true}
  var saveParam=e.target&&e.target.closest&&e.target.closest('#rh57-param-save');if(saveParam){e.preventDefault();e.stopImmediatePropagation();saveParams57(saveParam);return true}
  if(activePlan57()!=='folha')return false;
  var pdf=e.target&&e.target.closest&&e.target.closest('#rh42-plan-pdf');if(pdf){e.preventDefault();e.stopImmediatePropagation();busyExport57(pdf,exportPdf57,'Gerando PDF auditado...');return true}
  var xlsx=e.target&&e.target.closest&&e.target.closest('#rh42-plan-xlsx');if(xlsx){e.preventDefault();e.stopImmediatePropagation();busyExport57(xlsx,exportExcel57,'Gerando Excel auditado...');return true}
  var tax=e.target&&e.target.closest&&e.target.closest('[data-rh57-tax]');if(tax){e.preventDefault();e.stopImmediatePropagation();taxMetric57(tax.dataset.rh57Tax);return true}
  var card=e.target&&e.target.closest&&e.target.closest('[data-rh57-key]');if(card){e.preventDefault();e.stopImmediatePropagation();handleCard57(card.dataset.rh57Key);return true}
  return false
}

function styles57(){
  if(E57('_rh57'))return;var s=document.createElement('style');s.id='_rh57';s.textContent=
  '.rh57-salary-edit{display:grid;gap:2px;width:100%;padding:5px 7px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--text);text-align:right;cursor:pointer}.rh57-salary-edit:hover{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 8%,var(--surface-2))}.rh57-salary-edit span{font-weight:850}.rh57-salary-edit small{color:var(--gold-2);font-size:9px}.rh57-row-meta{display:block;margin-top:3px;color:var(--muted);font-size:9px}.rh57-mini{display:inline-flex;margin-top:6px;padding:4px 7px;border:1px solid var(--line-soft);border-radius:7px;background:var(--surface-2);color:var(--gold-2);font-size:9px;font-weight:850;cursor:pointer}'+
  '.rh57-table{min-width:1320px!important}.rh57-table td:first-child{min-width:225px}.rh57-tax-line{display:grid;grid-template-columns:minmax(170px,1.5fr) minmax(105px,.8fr) 82px minmax(110px,.8fr);gap:10px;align-items:center;width:100%;padding:10px 13px;border:0;border-bottom:1px solid var(--line-soft);background:transparent;color:var(--text);text-align:left;cursor:pointer}.rh57-tax-line:last-child{border-bottom:0}.rh57-tax-line>span:nth-child(n+2),.rh57-tax-line>strong{text-align:right;font-variant-numeric:tabular-nums}.rh57-tax-line span b,.rh57-tax-line span small{display:block}.rh57-tax-line span small{margin-top:2px;color:var(--muted);font-size:9px}.rh57-tax-line>span:nth-child(n+2){color:var(--muted);font-size:10px}.rh57-tax-line>strong{font-size:11px}'+
  '#rh57-modal{position:fixed;inset:0;z-index:13000;display:grid;place-items:center;padding:20px;background:rgba(2,10,19,.78);backdrop-filter:blur(9px)}.rh57-modal-card{width:min(var(--rh57-w),calc(100vw - 40px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line);border-radius:19px;background:var(--surface);color:var(--text);box-shadow:0 28px 80px rgba(0,0,0,.55)}.rh57-modal-card>header{display:flex;justify-content:space-between;gap:18px;padding:20px 22px 16px;border-bottom:1px solid var(--line-soft)}.rh57-modal-card>header span{color:var(--gold-2);font-size:9px;font-weight:900;letter-spacing:.13em}.rh57-modal-card>header h2{margin:5px 0 4px;font-size:24px}.rh57-modal-card>header p{margin:0;color:var(--muted);font-size:11px}.rh57-modal-card>header button{width:38px;height:38px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface-2);color:var(--text);font-size:22px;cursor:pointer}.rh57-modal-body{min-height:0;overflow:auto;padding:18px 22px 22px}.rh57-note,.rh57-form-note{padding:10px 12px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface-2);color:var(--muted);font-size:11px;line-height:1.5}.rh57-scroll{width:100%;overflow:auto}.rh57-scroll table{width:100%;min-width:760px;border-collapse:collapse}.rh57-scroll th,.rh57-scroll td{padding:9px 10px;border-bottom:1px solid var(--line-soft);font-size:11px}.rh57-scroll th{color:var(--muted);font-size:9px;text-transform:uppercase}.rh57-scroll .money{text-align:right;white-space:nowrap}.rh57-scroll tfoot td{border-top:2px solid var(--gold);background:var(--surface-2)}'+
  '.rh57-tax-audit{min-width:1120px!important;table-layout:fixed}.rh57-tax-audit th,.rh57-tax-audit td{min-width:0;vertical-align:middle;overflow-wrap:anywhere}.rh57-tax-detail{display:block;margin-top:3px;color:var(--muted);font-size:9px;line-height:1.35}.rh57-base-memory{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:5px 7px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--gold-2);font-size:10px;font-weight:850;line-height:1.2;text-align:left;white-space:nowrap;cursor:pointer}.rh57-base-memory:before{content:"▸";flex:0 0 auto}.rh57-base-memory:hover{border-color:var(--line);background:var(--surface-2)}.rh57-base-summary{display:grid;gap:5px}.rh57-base-summary span{display:flex;align-items:center;justify-content:space-between;gap:8px}.rh57-base-summary small{color:var(--muted);font-size:8px;font-weight:800}.rh57-base-summary b{font-size:10px;white-space:nowrap}.rh57-tax-values{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 12px}.rh57-tax-values span{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:6px;min-width:0}.rh57-tax-values b{min-width:0;overflow:hidden;color:var(--text);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.rh57-tax-values small{color:var(--muted);font-size:8px;white-space:nowrap}.rh57-tax-values strong{font-size:9px;white-space:nowrap}'+
  '#rh57-base-dialog{position:fixed;inset:0;z-index:4;display:grid;place-items:center;padding:20px;background:rgba(2,10,19,.72);backdrop-filter:blur(7px)}#rh57-base-dialog>section{width:min(760px,calc(100vw - 40px));max-height:calc(100vh - 40px);overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:0 26px 75px rgba(0,0,0,.58)}#rh57-base-dialog header{display:flex;justify-content:space-between;gap:18px;padding:18px 20px 15px;border-bottom:1px solid var(--line-soft)}#rh57-base-dialog header span{color:var(--gold-2);font-size:9px;font-weight:900;letter-spacing:.12em}#rh57-base-dialog h3{margin:5px 0 3px;font-size:22px}#rh57-base-dialog header p{margin:0;color:var(--muted);font-size:11px}#rh57-base-dialog header button{width:36px;height:36px;flex:0 0 auto;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface-2);color:var(--text);font-size:21px;cursor:pointer}.rh57-base-dialog-body{max-height:calc(100vh - 150px);overflow:auto;padding:18px 20px 20px}.rh57-base-group+ .rh57-base-group{margin-top:18px;padding-top:16px;border-top:2px solid var(--line)}.rh57-base-group>h4{display:flex;justify-content:space-between;gap:12px;margin:0 0 8px;font-size:12px}.rh57-base-group>h4 small{color:var(--muted);font-size:8px;font-weight:700;text-align:right}.rh57-base-lines{display:grid;gap:3px}.rh57-base-lines>div{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:18px;padding:9px 10px;border-bottom:1px solid var(--line-soft)}.rh57-base-lines>div span{display:flex;gap:8px;min-width:0;line-height:1.35}.rh57-base-lines>div i{width:12px;flex:0 0 auto;color:var(--gold-2);font-style:normal;font-weight:900}.rh57-base-lines>div b{white-space:nowrap}.rh57-base-lines>div.total{margin-top:5px;border:1px solid var(--gold);border-radius:9px;background:color-mix(in srgb,var(--gold) 7%,var(--surface-2));font-weight:900}.rh57-base-lines h5{margin:13px 0 2px;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.08em}.rh57-base-equation{display:grid;gap:5px;margin-top:10px;padding:12px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface-2)}.rh57-base-equation b{font-size:10px;text-transform:uppercase}.rh57-base-equation span{color:var(--muted);font-size:11px;line-height:1.5}.rh57-base-tax-list{margin-top:18px;padding-top:16px;border-top:2px solid var(--gold)}.rh57-base-tax-list>h4{margin:0 0 7px;font-size:12px}.rh57-base-tax-list>div{display:grid;grid-template-columns:minmax(170px,1fr) 120px 70px 105px;align-items:center;gap:10px;padding:9px 10px;border-bottom:1px solid var(--line-soft)}.rh57-base-tax-list span b,.rh57-base-tax-list span small{display:block}.rh57-base-tax-list span b{font-size:10px}.rh57-base-tax-list span small{margin-top:2px;color:var(--muted);font-size:8px}.rh57-base-tax-list em{color:var(--muted);font-size:9px;font-style:normal;text-align:right;white-space:nowrap}.rh57-base-tax-list strong{text-align:right;white-space:nowrap}'+
  '.rh57-form{display:grid;gap:12px}.rh57-form.grid{grid-template-columns:1fr 1fr}.rh57-form label{display:grid;gap:5px;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase}.rh57-form input,.rh57-form select,.rh57-roster-tools input{height:40px;padding:0 10px;border:1px solid var(--line-soft);border-radius:9px;background:var(--surface-2);color:var(--text)}.rh57-form-note,.rh57-form .button{grid-column:1/-1}.rh57-roster-tools{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.rh57-roster-tools input{width:min(390px,100%)}.rh57-roster-tools>div{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rh57-roster-tools .status{white-space:nowrap}'+
  '@media(max-width:760px){#rh57-modal{padding:7px}.rh57-modal-card{width:calc(100vw - 14px);max-height:calc(100vh - 14px)}.rh57-form.grid{grid-template-columns:1fr}.rh57-roster-tools{align-items:stretch;flex-direction:column}.rh57-tax-line{grid-template-columns:1fr auto}.rh57-tax-line>span:nth-child(2),.rh57-tax-line>span:nth-child(3){display:none}#rh57-base-dialog{padding:7px}#rh57-base-dialog>section{width:calc(100vw - 14px);max-height:calc(100vh - 14px)}.rh57-base-tax-list>div{grid-template-columns:1fr auto}.rh57-base-tax-list>div em{display:none}}';document.head.appendChild(s)
}
async function vacationReceipt57(id,days,cashDays){
  await load57(true);var key=String(id||''),ctx=V57.contexts.find(function(x){return personKey57(x.person)===key||String(x.person.id||'')===key});if(!ctx)throw new Error('Colaborador sem base salarial na folha.');
  var p=ctx.person,salary=n57(p.salario),vacDays=Math.max(0,Math.min(30,n57(days))),bonusDays=Math.max(0,Math.min(10,n57(cashDays)));if(!salary||!vacDays)throw new Error('Informe o salário e os dias gozados antes de gerar o documento.');
  var pay=r257(salary*vacDays/30),third=r257(pay/3),bonusPay=r257(salary*bonusDays/30),bonusThird=r257(bonusPay/3),taxBase=r257(pay+third),regular=regularRow57(ctx),hasInss=isClt57(p)&&n57(regular.base_inss)>0,inss=hasInss?inss57(taxBase):0,param=V57.params.get(personKey57(p))||{},deps=param.dependentes_irrf==null?inferredDependents57(ctx):n57(param.dependentes_irrf),irrf=hasInss?irrf57(taxBase,inss,deps,0,0).value:0,gross=r257(pay+third+bonusPay+bonusThird),deductions=r257(inss+irrf);
  return{id:personKey57(p),nome:p.nome||'Colaborador',salary:r257(salary),days:vacDays,cashDays:bonusDays,vacationPay:pay,vacationThird:third,cashPay:bonusPay,cashThird:bonusThird,inss:r257(inss),irrf:r257(irrf),gross:gross,deductions:deductions,net:r257(gross-deductions)}
}
function init57(){
  window.RH_FORECAST_V57=true;window.rhV57HandleCapture=handleCapture57;window.rhV57Refresh=refresh57;window.rhV57Snapshot=function(){return V57.snapshot};window.rhV57CalculateVacationReceipt=vacationReceipt57;styles57();ensureWorkforceButton57();enhancePayroll57();
  var oldPayroll=renderPayroll;renderPayroll=function(){var r=oldPayroll.apply(this,arguments);setTimeout(enhancePayroll57,0);return r};
  var oldAll=renderAll;renderAll=function(){var r=oldAll.apply(this,arguments);V57.loaded=false;schedule57(80,true);setTimeout(ensureWorkforceButton57,0);return r};
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab="folha"],#rh-plan-recalc,.nav-item[data-view="planejamento"]'))schedule57(120,false)},true);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(E57('rh57-base-dialog'))closeBaseMemory57();else closeModal57()}});
  [250,750,1500].forEach(function(ms){setTimeout(function(){schedule57(0,false)},ms)})
}
window.RH_TAX_TABLE_2026=TAX57;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init57);else init57();
})();
