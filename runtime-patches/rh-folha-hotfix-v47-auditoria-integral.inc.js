/* RH v47 — auditoria estrutural: encargos, benefícios, popups, PDF e Chat IA */
(function(){
'use strict';

var V47={
  benefitRows:[],
  benefitLoaded:false,
  benefitCompetenceId:'',
  snapshot:null,
  refreshTimer:0,
  observer:null,
  aiResize:null
};
var AI_KEY47='lnb_rh_ai_window_v46';

function E47(id){return document.getElementById(id)}
function n47(v){var x=Number(v);return isFinite(x)?x:0}
function r247(v){return Math.round((n47(v)+Number.EPSILON)*100)/100}
function esc47(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]})}
function norm47(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function money47(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n47(v))}
function pct47(v){return (n47(v)*100).toFixed(2).replace('.',',')+'%'}
function parseMoney47(v){var s=String(v==null?'':v).replace(/R\$/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');return Number(s)||0}
function sum47(a,key){return (a||[]).reduce(function(s,x){return s+n47(typeof key==='function'?key(x):x&&x[key])},0)}
function warn47(msg){try{toast(msg,true)}catch(e){try{alert(msg)}catch(ignore){}}}
function allowed47(){try{return !!(canAdmin()||can('exportar'))}catch(e){return false}}

function latestActual47(){
  var src=(window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(S.competencias||[])).filter(function(c){
    return c&&!c._periodConsolidated&&String(c.competencia||'').slice(5,7)!=='00'
  }).slice().sort(function(a,b){return String(a.competencia||'').localeCompare(String(b.competencia||''))});
  if(src.length)return src[src.length-1];
  return S.competencia&&!S.competencia._periodConsolidated?S.competencia:null
}
function comp47(v){
  try{return formatCompetence(v)}catch(e){var p=String(v||'').slice(0,7).split('-');return p.length===2?p[1]+'/'+p[0]:'—'}
}
function nextComp47(){
  var c=latestActual47(),d=c&&c.competencia?new Date(String(c.competencia).slice(0,10)+'T12:00:00'):new Date();
  if(isNaN(d.getTime()))d=new Date();
  d=new Date(d.getFullYear(),d.getMonth()+1,1,12);
  return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()
}

/* ── normalização tributária: corrige captura "Empresa: 2038" do cabeçalho ── */
function normalizeChargeObject47(e,c){
  if(!e||typeof e!=='object')return e;
  var base=n47(e.base_total_inss||e.sal_contrib_empregados||c&&c.base_inss),raw=n47(e.empresa_inss||e.inss_empresa);
  if(base>0){
    var rate=raw/base,derived=n47(e.total_inss)-n47(e.segurados)-n47(e.rat)-n47(e.terceiros),dr=derived/base;
    if(!raw||rate<.15||rate>.25){
      raw=(derived>0&&dr>=.18&&dr<=.22)?derived:base*.20;
      e.empresa_inss=r247(raw);e.inss_empresa=r247(raw);e._rh47_empresa_inss_corrigido=true
    }
    var rr=n47(e.rat)/base;if(!e.rat||rr<.005||rr>.04)e.rat=r247(base*.01);
    var tr=n47(e.terceiros)/base;if(!e.terceiros||tr<.01||tr>.10)e.terceiros=r247(base*.058)
  }
  var bp=n47(e.base_pis)||base;if(bp>0){var pr=n47(e.valor_pis)/bp;if(!e.valor_pis||pr<.005||pr>.02)e.valor_pis=r247(bp*.01)}
  var bf=n47(e.base_fgts||c&&c.base_fgts)||base;if(bf>0){var fr=n47(e.valor_fgts||c&&c.valor_fgts)/bf;if(!n47(e.valor_fgts||c&&c.valor_fgts)||fr<.06||fr>.10)e.valor_fgts=r247(bf*.08)}
  return e
}
function normalizeCompetence47(c){if(c&&c.encargos)normalizeChargeObject47(c.encargos,c);return c}
function normalizeAll47(){
  (S.competencias||[]).forEach(normalizeCompetence47);
  if(S.competencia)normalizeCompetence47(S.competencia)
}
function installEmployerCharges47(){
  if(typeof rhEmployerCharges!=='function'||rhEmployerCharges._rh47)return;
  rhEmployerCharges=function(p){
    var c=S.competencia||latestActual47()||{},e=c.encargos||{};normalizeChargeObject47(e,c);
    var bi=n47(e.base_total_inss||e.sal_contrib_empregados||c.base_inss),bp=n47(e.base_pis)||bi;
    function rate(v,base,min,max,fallback){var r=base>0?n47(v)/base:0;return r>=min&&r<=max?r:fallback}
    var ratR=rate(e.rat,bi,.005,.04,.01),terR=rate(e.terceiros,bi,.01,.10,.058),pisR=rate(e.valor_pis,bp,.005,.02,.01);
    var base=n47(p&&p.base_fgts),fgts=n47(p&&p.valor_fgts),items=[],total=0;
    if(fgts){items.push(['FGTS',fgts,'exato']);total+=fgts}
    if(base>0){
      [['INSS patronal',base*.20,'20% base patronal'],['RAT',base*ratR,'base patronal'],['Terceiros',base*terR,'base patronal'],['PIS',base*pisR,'base patronal']].forEach(function(x){var v=r247(x[1]);if(v){items.push([x[0],v,x[2]]);total+=v}})
    }
    return{itens:items,total:r247(total)}
  };
  rhEmployerCharges._rh47=true
}
function patchParser47(){
  var P=window.RHParser;if(!P||P._rh47)return;P._rh47=true;
  function fixPayload(x){if(x&&x.competencia&&x.competencia.encargos)normalizeChargeObject47(x.competencia.encargos,x.competencia);return x}
  if(typeof P.extractPdf==='function'){var a=P.extractPdf;P.extractPdf=async function(){return fixPayload(await a.apply(this,arguments))}}
  if(typeof P.parsePdfText==='function'){var b=P.parsePdfText;P.parsePdfText=function(){return fixPayload(b.apply(this,arguments))}}
  if(typeof P.parseCharges==='function'){var d=P.parseCharges;P.parseCharges=function(){return normalizeChargeObject47(d.apply(this,arguments),{})}}
}

/* ── benefícios: somente vínculo exato por colaborador/matrícula ── */
function mapBenefit47(b){
  if(!b)return null;
  return{
    colaborador_id:b.colaborador_id,matricula:b.matricula,
    seguro_vida:n47(b.seguro_vida),
    assistencia_medica:n47(b.assistencia_medica||b.assist_medica),
    assist_medica:n47(b.assistencia_medica||b.assist_medica),
    vr_caixa:n47(b.vr_caixa||b.vr_va_cesta),
    vale_transporte:n47(b.vale_transporte),
    vr_valor_disponivel:!!b.vr_valor_disponivel
  }
}
function benefitExact47(p){
  if(!p)return null;
  var pid=String(p.colaborador_id||p.id||''),mat=String(p.matricula||''),rows=V47.benefitRows||[],m=null;
  if(pid)m=rows.find(function(b){return String(b.colaborador_id||'')===pid})||null;
  if(!m&&mat){
    var same=rows.filter(function(b){return String(b.matricula||'')===mat});
    if(same.length===1)m=same[0]
  }
  return mapBenefit47(m)
}
var oldRhPersonBenefit47=typeof rhPersonBenefit==='function'?rhPersonBenefit:null;
if(oldRhPersonBenefit47){
  rhPersonBenefit=function(p){
    var exact=benefitExact47(p);
    if(exact)return exact;
    if(V47.benefitLoaded)return null;
    return oldRhPersonBenefit47(p)
  }
}
function benefitTotal47(p){var b=benefitExact47(p);return b?n47(b.seguro_vida)+n47(b.assistencia_medica)+n47(b.vr_caixa)+n47(b.vale_transporte):0}
function benefitCompleteness47(){
  var rows=V47.benefitRows||[],hasVr=rows.some(function(b){return n47(b.vr_caixa||b.vr_va_cesta)>0}),hasVt=rows.some(function(b){return n47(b.vale_transporte)>0}),flag=rows.some(function(b){return !!b.vr_valor_disponivel});
  return{complete:flag||hasVr||hasVt,hasVr:hasVr,hasVt:hasVt}
}
async function loadBenefits47(force){
  var c=latestActual47();if(!c||!c.id)return;
  if(!force&&V47.benefitLoaded&&V47.benefitCompetenceId===String(c.id))return;
  V47.benefitCompetenceId=String(c.id);
  try{
    var rows=await api('beneficios_colaboradores?competencia_id=eq.'+encodeURIComponent(c.id)+'&select=colaborador_id,matricula,seguro_vida,assistencia_medica,vr_caixa,vale_transporte,vr_valor_disponivel');
    V47.benefitRows=Array.isArray(rows)?rows:[];V47.benefitLoaded=true
  }catch(e){V47.benefitRows=[];V47.benefitLoaded=true}
}

/* ── projeção auditada por colaborador ── */
function forecastPane47(){return document.querySelector('[data-plan-pane="folha"]')}
function rawForecastRows47(){
  var pane=forecastPane47(),table=pane&&pane.querySelector('table'),trs=table?Array.from(table.querySelectorAll('tbody tr')):[];
  return trs.map(function(tr){
    var c=tr.cells||[];if(c.length<5)return null;
    return{tr:tr,nome:String(c[0].textContent||'').trim(),departamento:String(c[1].textContent||'').trim(),proventos:parseMoney47(c[2].textContent),descontos:parseMoney47(c[3].textContent),liquido:parseMoney47(c[4].textContent)}
  }).filter(Boolean)
}
function personByName47(name){
  var k=norm47(name),rows=(S.pessoas||[]).filter(function(p){return norm47(p.nome)===k});
  return rows.length?rows[0]:null
}
function rates47(){
  var c=latestActual47()||{},e=c.encargos||{};normalizeChargeObject47(e,c);
  var bi=n47(e.base_total_inss||e.sal_contrib_empregados||c.base_inss),bp=n47(e.base_pis)||bi,bf=n47(e.base_fgts||c.base_fgts)||bi;
  function safe(v,base,min,max,fallback){var r=base>0?n47(v)/base:0;return r>=min&&r<=max?r:fallback}
  return{
    inssPat:.20,
    rat:safe(e.rat,bi,.005,.04,.01),
    terceiros:safe(e.terceiros,bi,.01,.10,.058),
    pis:safe(e.valor_pis,bp,.005,.02,.01),
    fgts:safe(e.valor_fgts||c.valor_fgts,bf,.06,.10,.08)
  }
}
function inssEmployee47(base){
  base=Math.max(0,n47(base));
  var bands=[[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]],prev=0,total=0;
  for(var i=0;i<bands.length&&base>prev;i++){var top=bands[i][0],slice=Math.min(base,top)-prev;if(slice>0)total+=slice*bands[i][1];prev=top}
  return Math.floor((total+1e-9)*100)/100
}
function irrf47(base,gross){
  base=Math.max(0,n47(base));gross=Math.max(0,n47(gross));var tax=0;
  if(base<=2428.80)tax=0;
  else if(base<=2826.65)tax=base*.075-182.16;
  else if(base<=3751.05)tax=base*.15-394.16;
  else if(base<=4664.68)tax=base*.225-675.49;
  else tax=base*.275-908.73;
  tax=Math.max(0,tax);
  var red=0;if(gross<=5000)red=tax;else if(gross<=7350)red=Math.max(0,978.62-.133145*gross);
  return Math.floor((Math.max(0,tax-red)+1e-9)*100)/100
}
function activePeople47(){
  var src=(S.pessoas||[]).slice();
  if(typeof window.rhRosterFilter==='function')return window.rhRosterFilter(src);
  return src.filter(function(p){return !/demit|deslig|rescind|inativ|transferid/.test(norm47(p.situacao_snapshot||p.situacao||''))})
}
function activeForecastSource47(){
  var active=activePeople47(),raw=rawForecastRows47();
  if(!active.length)return{active:active,rows:raw};
  var byName=new Map();
  active.forEach(function(p){var k=norm47(p&&p.nome);if(k&&!byName.has(k))byName.set(k,p)});
  var reconciled=new Map();
  raw.forEach(function(r){
    var k=norm47(r.nome),p=byName.get(k);if(!p)return;
    /* A projeção considera cada pessoa do quadro atual uma única vez.
       Registros históricos permanecem no histórico, nunca nos totalizadores. */
    reconciled.set(k,Object.assign({},r,{person:p,_activeKey:k}))
  });
  return{active:active,rows:Array.from(reconciled.values())}
}
function auditedForecast47(){
  var source=activeForecastSource47(),raw=source.rows,seen=new Set(raw.map(function(r){return norm47(r.nome)}));
  source.active.forEach(function(p){
    var k=norm47(p.nome);if(!k||seen.has(k))return;seen.add(k);
    var prov=n47(p.proventos)||n47(p.salario),disc=n47(p.descontos),dep;
    try{dep=departmentName(p.departamento)}catch(e){dep=p.departamento||'—'}
    raw.push({tr:null,nome:p.nome||'—',departamento:dep,proventos:prov,descontos:disc,liquido:Math.max(0,prov-disc),person:p,_activeKey:k,_recomposta:true})
  });
  var rates=rates47(),rows=raw.map(function(r){
    var p=r.person||personByName47(r.nome),ratio=p&&n47(p.proventos)>0?r.proventos/n47(p.proventos):1;if(!isFinite(ratio)||ratio<=0)ratio=1;
    var baseInss=p?n47(p.base_inss)*ratio:0,baseFgts=p?n47(p.base_fgts)*ratio:0,baseIrrf=p?Math.max(0,n47(p.base_irrf)*ratio):0;
    var baseEmployer=baseFgts;
    var inssSeg=inssEmployee47(baseInss),irrf=irrf47(baseIrrf,r.proventos);
    var inssPat=baseEmployer*rates.inssPat,rat=baseEmployer*rates.rat,terc=baseEmployer*rates.terceiros,pis=baseEmployer*rates.pis,fgts=baseFgts*rates.fgts;
    var enc=inssPat+rat+terc+pis+fgts,ben=benefitTotal47(p),cost=r.proventos+enc+ben;
    return Object.assign({},r,{person:p,proventos:r247(r.proventos),descontos:r247(r.descontos),liquido:r247(r.liquido),baseInss:r247(baseInss),baseEmployer:r247(baseEmployer),baseFgts:r247(baseFgts),baseIrrf:r247(baseIrrf),inssSeg:r247(inssSeg),irrf:r247(irrf),inssPat:r247(inssPat),rat:r247(rat),terceiros:r247(terc),pis:r247(pis),fgts:r247(fgts),encargos:r247(enc),beneficios:r247(ben),custo:r247(cost)})
  });
  var t={
    rows:rows,prov:r247(sum47(rows,'proventos')),disc:r247(sum47(rows,'descontos')),liq:r247(sum47(rows,'liquido')),
    baseInss:r247(sum47(rows,'baseInss')),baseEmployer:r247(sum47(rows,'baseEmployer')),baseFgts:r247(sum47(rows,'baseFgts')),baseIrrf:r247(sum47(rows,'baseIrrf')),
    inssSeg:r247(sum47(rows,'inssSeg')),irrf:r247(sum47(rows,'irrf')),inssPat:r247(sum47(rows,'inssPat')),rat:r247(sum47(rows,'rat')),terceiros:r247(sum47(rows,'terceiros')),pis:r247(sum47(rows,'pis')),fgts:r247(sum47(rows,'fgts')),ben:r247(sum47(rows,'beneficios'))
  };
  t.company=r247(t.inssPat+t.rat+t.terceiros+t.pis+t.fgts);t.retained=r247(t.inssSeg+t.irrf);t.otherDiscounts=r247(Math.max(0,t.disc-t.retained));t.taxTotal=r247(t.retained+t.company);t.cost=r247(t.prov+t.company+t.ben);
  var meta=typeof window.rhRosterMeta==='function'?window.rhRosterMeta():window.RH_CURRENT_ACTIVE_META;
  t.expectedActive=n47(meta&&meta.ativos)||source.active.length;t.countOk=!t.expectedActive||t.rows.length===t.expectedActive;
  t.balanceDiff=r247(t.prov-t.disc-t.liq);t.balanceOk=Math.abs(t.balanceDiff)<=.02;
  return t
}
function companyItems47(t){
  var rates=rates47();
  return[
    {key:'INSS_PAT',label:'INSS patronal',base:t.baseEmployer,rate:.20,value:t.inssPat,nature:'Pago pela empresa'},
    {key:'RAT',label:'RAT',base:t.baseEmployer,rate:rates.rat,value:t.rat,nature:'Pago pela empresa'},
    {key:'TERC',label:'Terceiros',base:t.baseEmployer,rate:rates.terceiros,value:t.terceiros,nature:'Pago pela empresa'},
    {key:'PIS',label:'PIS sobre folha',base:t.baseEmployer,rate:rates.pis,value:t.pis,nature:'Pago pela empresa'},
    {key:'FGTS',label:'FGTS',base:t.baseFgts,rate:rates.fgts,value:t.fgts,nature:'Depositado pela empresa'}
  ]
}
function retainedItems47(t){return[
  {key:'INSS_EMP',label:'INSS dos segurados',base:t.baseInss,rate:t.baseInss?t.inssSeg/t.baseInss:0,value:t.inssSeg,nature:'Retido do colaborador · tabela progressiva 2026'},
  {key:'IRRF',label:'IRRF sobre folha',base:t.baseIrrf,rate:t.baseIrrf?t.irrf/t.baseIrrf:0,value:t.irrf,nature:'Retido do colaborador · tabela/redução 2026'}
]}

/* ── tabela e cards sincronizados ── */
function syncForecastTable47(t){
  var pane=forecastPane47(),table=pane&&pane.querySelector('table');if(!table)return;
  var head=table.querySelector('thead tr');if(head)head.innerHTML='<th>Colaborador</th><th>Departamento</th><th class="money">Proventos previstos</th><th class="money">Descontos previstos</th><th class="money">Líquido previsto</th><th class="money">Encargos empresa</th><th class="money">Benefícios confirmados</th><th class="money">Custo previsto</th>';
  var body=table.tBodies&&table.tBodies[0]||table.createTBody();
  var retained=new Set(t.rows.map(function(r){return r.tr}).filter(Boolean));
  Array.from(body.rows||[]).forEach(function(tr){if(!retained.has(tr))tr.remove()});
  t.rows.forEach(function(r){
    if(!r.tr){r.tr=body.insertRow();for(var z=0;z<8;z++)r.tr.insertCell();r.tr.cells[0].innerHTML='<b>'+esc47(r.nome)+'</b>';r.tr.cells[1].textContent=r.departamento;r.tr.cells[2].textContent=money47(r.proventos);r.tr.cells[3].textContent=money47(r.descontos);r.tr.cells[4].textContent=money47(r.liquido)}
    var c=r.tr&&r.tr.cells;if(!c||c.length<8)return;c[5].textContent=money47(r.encargos);c[6].textContent=money47(r.beneficios);c[7].innerHTML='<b>'+money47(r.custo)+'</b>'
  });
  var foot=table.tFoot||table.createTFoot();foot.innerHTML='<tr class="rh47-table-total"><td><b>TOTAL</b></td><td></td><td class="money"><b>'+money47(t.prov)+'</b></td><td class="money"><b>'+money47(t.disc)+'</b></td><td class="money"><b>'+money47(t.liq)+'</b></td><td class="money"><b>'+money47(t.company)+'</b></td><td class="money"><b>'+money47(t.ben)+'</b></td><td class="money"><b>'+money47(t.cost)+'</b></td></tr>'
}
function syncOriginalForecastCards47(t){
  var box=E47('rh-plan-folha-kpis');if(!box)return;var cards=Array.from(box.querySelectorAll('.kpi'));if(cards.length<4)return;
  var complete=benefitCompleteness47(),third=t.company+t.ben;
  var vals=[
    ['Proventos previstos',t.prov,nextComp47()],
    ['Líquido previsto',t.liq,'após descontos projetados'],
    ['Encargos + benefícios',third,'encargos empresa + benefícios '+(complete.complete?'integrados':'confirmados/parciais')],
    ['Custo previsto',t.cost,'proventos + encargos + benefícios']
  ];
  cards.slice(0,4).forEach(function(card,i){var s=card.querySelector('span'),b=card.querySelector('strong'),sm=card.querySelector('small');if(s)s.textContent=vals[i][0];if(b)b.textContent=money47(vals[i][1]);if(sm)sm.textContent=vals[i][2];card.dataset.rh47Forecast=String(i)})
}
function summaryCard47(label,value,sub,key,featured){
  return '<button type="button" class="rh47-summary-card '+(featured?'featured':'')+'" data-rh47-key="'+esc47(key)+'" data-rh47-value="'+esc47(r247(value).toFixed(2))+'"><span>'+esc47(label)+'</span><strong>'+esc47(money47(value))+'</strong><small>'+esc47(sub||'')+'</small></button>'
}
function taxRowsScreen47(items,title){
  return '<article class="rh47-tax-panel"><div class="rh47-tax-head"><b>'+esc47(title)+'</b><span>Base · alíquota · valor</span></div>'+items.map(function(x){
    return '<button type="button" class="rh47-tax-line" data-rh47-tax="'+esc47(x.key)+'"><span><b>'+esc47(x.label)+'</b><small>'+esc47(x.nature)+'</small></span><span>'+money47(x.base)+'</span><span>'+pct47(x.rate)+'</span><strong>'+money47(x.value)+'</strong></button>'
  }).join('')+'</article>'
}
function installForecastSummary47(t){
  var old=E47('rh46-forecast-summary'),k=E47('rh-plan-folha-kpis');if(!k)return;if(old)old.remove();k.hidden=true;k.setAttribute('aria-hidden','true');k.style.setProperty('display','none','important');
  var box=E47('rh47-forecast-summary');if(!box){box=document.createElement('section');box.id='rh47-forecast-summary';box.className='rh47-summary';k.insertAdjacentElement('afterend',box)}
  var complete=benefitCompleteness47(),benefitSub=complete.complete?'integração da competência-base':'fonte parcial: seguro + saúde; VR/VA/VT ainda sem valor integrado';
  var html='<div class="rh47-summary-grid">'+
    summaryCard47('Proventos previstos',t.prov,nextComp47(),'prov')+
    summaryCard47('Descontos previstos',t.disc,'retenções + demais descontos','disc')+
    summaryCard47('Líquido previsto',t.liq,'proventos − descontos','liq',true)+
    summaryCard47('Impostos retidos',t.retained,'INSS segurados + IRRF','ret')+
    summaryCard47('Encargos empresa',t.company,'INSS patronal + RAT + terceiros + PIS + FGTS','company')+
    summaryCard47(complete.complete?'Benefícios':'Benefícios confirmados (parcial)',t.ben,benefitSub,'ben')+
    summaryCard47('Tributos / recolhimentos',t.taxTotal,'retidos + empresa','tax')+
    summaryCard47('Custo total estimado',t.cost,'proventos + encargos + benefícios','cost',true)+
    '</div><div class="rh47-tax-grid">'+taxRowsScreen47(retainedItems47(t),'RETENÇÕES ESTIMADAS')+taxRowsScreen47(companyItems47(t),'ENCARGOS PAGOS / DEPOSITADOS PELA EMPRESA')+'</div>'+
    '<div class="rh47-audit"><b>Auditoria da projeção</b><span class="ok">INSS patronal: 20,00%</span><span class="'+(t.balanceOk?'ok':'warn')+'">Proventos − descontos = líquido: '+(t.balanceOk?'OK':'dif. '+money47(t.balanceDiff))+'</span><span class="'+(t.countOk?'ok':'warn')+'">Quadro: '+t.rows.length+(t.expectedActive?' / '+t.expectedActive:'')+' ativos</span><span class="ok">Tabela x cards: mesma base</span><span class="'+(complete.complete?'ok':'warn')+'">Benefícios: '+(complete.complete?'fonte integrada':'fonte parcial')+'</span></div>';
  if(box.innerHTML!==html)box.innerHTML=html
}

/* ── popup estável ── */
function stableTable47(headers,rows,footer,widths){
  widths=widths||headers.map(function(){return 100/headers.length});
  function numeric(i){return i>0&&/valor|total|provento|desconto|líquido|liquido|fgts|inss|pis|irrf|custo|benef|base|encargo|al[ií]quota|%|rateio/i.test(String(headers[i]||''))}
  function cls(i){return numeric(i)?' class="money"':''}
  return '<div class="rh47-popup-scroll"><table class="rh47-popup-table" data-rh-authoritative-composition="1"><colgroup>'+widths.map(function(w){return '<col style="width:'+w+'%">'}).join('')+'</colgroup><thead><tr>'+headers.map(function(h,i){return '<th'+cls(i)+'>'+esc47(h)+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(v,i){return '<td'+cls(i)+'>'+esc47(v==null?'—':v)+'</td>'}).join('')+'</tr>'}).join('')+'</tbody>'+(footer?'<tfoot data-rh-authoritative-total="1"><tr>'+footer.map(function(v,i){return '<td'+cls(i)+'><b>'+esc47(v==null?'':v)+'</b></td>'}).join('')+'</tr></tfoot>':'')+'</table></div>'
}
function closeStable47(){
  var modal=E47('rh47-forecast-modal');if(!modal)return;
  modal.remove();document.body.style.overflow=modal.dataset.prevOverflow||''
}
function ensureStableModalStyles47(){
  if(E47('_rh47_forecast_modal'))return;
  var style=document.createElement('style');style.id='_rh47_forecast_modal';style.textContent=
    '#rh47-forecast-modal{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:24px;background:rgba(2,10,19,.76);backdrop-filter:blur(9px);box-sizing:border-box}'+
    '#rh47-forecast-modal .rh47f-card{position:relative;width:min(var(--rh47f-width),calc(100vw - 48px));max-width:calc(100vw - 48px);max-height:calc(100vh - 48px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line);border-radius:20px;background:var(--surface);color:var(--text);box-shadow:0 28px 80px rgba(0,0,0,.5)}'+
    '#rh47-forecast-modal .rh47f-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex:0 0 auto;padding:22px 22px 18px;border-bottom:1px solid var(--line-soft)}'+
    '#rh47-forecast-modal .rh47f-kicker{display:block;margin:0 0 7px;color:var(--gold-2);font-size:9px;font-weight:900;letter-spacing:.15em;text-transform:uppercase}'+
    '#rh47-forecast-modal .rh47f-head h2{margin:0 0 8px;font-size:26px;line-height:1.08;letter-spacing:-.035em}'+
    '#rh47-forecast-modal .rh47f-ref{display:inline-flex;align-items:center;min-height:24px;padding:4px 10px;border:1px solid var(--line-soft);border-radius:999px;background:var(--surface-2);color:var(--muted);font-size:10px;font-weight:800}'+
    '#rh47-forecast-modal .rh47f-close{flex:0 0 auto;width:38px;height:38px;display:grid;place-items:center;padding:0;border:1px solid var(--line-soft);border-radius:11px;background:var(--surface-2);color:var(--text);font-size:22px;line-height:1;cursor:pointer}'+
    '#rh47-forecast-modal .rh47f-body{min-width:0;min-height:0;flex:0 1 auto;overflow:auto;padding:0 10px 8px}'+
    '#rh47-forecast-modal .rh47-popup-sub{margin:0 -10px 0;padding:10px;border-bottom:1px solid var(--line-soft);font-size:11px}'+
    '#rh47-forecast-modal .rh47-popup-scroll{width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:visible!important}'+
    '#rh47-forecast-modal .rh47-popup-table{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;table-layout:fixed!important}'+
    '#rh47-forecast-modal .rh47-popup-table th,#rh47-forecast-modal .rh47-popup-table td{padding:10px 10px!important;font-size:11px!important;line-height:1.35!important}'+
    '#rh47-forecast-modal .rh47-popup-table th{font-size:9px!important}'+
    '#rh47-forecast-modal .rh47-popup-table tfoot td{border-top:2px solid var(--gold)!important;font-size:13px!important}'+
    '#rh47-forecast-modal .rh47f-count{padding:2px 10px 4px;color:var(--muted);font-size:10px;text-align:right}'+
    '@media(max-width:760px){#rh47-forecast-modal{padding:8px}#rh47-forecast-modal .rh47f-card{width:calc(100vw - 16px);max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);border-radius:15px}#rh47-forecast-modal .rh47f-head{padding:17px}#rh47-forecast-modal .rh47f-head h2{font-size:22px}#rh47-forecast-modal .rh47f-body{padding-inline:6px}#rh47-forecast-modal .rh47-popup-table{min-width:620px!important}}';
  document.head.appendChild(style)
}
function openStable47(title,kicker,headers,rows,footer,subtitle,widths){
  closeStable47();ensureStableModalStyles47();
  var cols=headers.length,width=cols<=3?760:cols===4?900:cols===5?1060:cols===6?1200:1320;
  var unit=/^colaborador$/i.test(String(headers[0]||''))?(rows.length===1?' colaborador':' colaboradores'):(rows.length===1?' item':' itens');
  var table=(subtitle?'<p class="rh47-popup-sub">'+esc47(subtitle)+'</p>':'')+stableTable47(headers,rows,footer,widths);
  var html='<div id="rh47-forecast-modal" role="dialog" aria-modal="true" aria-labelledby="rh47f-title"><section class="rh47f-card" style="--rh47f-width:'+width+'px"><header class="rh47f-head"><div><span class="rh47f-kicker">'+esc47(kicker||'PRÓXIMA FOLHA · COMPOSIÇÃO')+'</span><h2 id="rh47f-title">'+esc47(title||'Composição')+'</h2><span class="rh47f-ref">Referência: Consolidado</span></div><button type="button" class="rh47f-close" aria-label="Fechar">×</button></header><div class="rh47f-body">'+table+'<div class="rh47f-count">'+rows.length+unit+'</div></div></section></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  var modal=E47('rh47-forecast-modal');if(!modal)return;
  modal.dataset.prevOverflow=document.body.style.overflow||'';document.body.style.overflow='hidden';
  modal.querySelector('.rh47f-close').onclick=closeStable47;
  modal.addEventListener('click',function(e){if(e.target===modal)closeStable47()});
  if(!window._rh47StableEsc){window._rh47StableEsc=true;document.addEventListener('keydown',function(e){if(e.key==='Escape')closeStable47()},true)}
}
function openTax47(title,items,total){
  openStable47(title,'COMPOSIÇÃO DE IMPOSTOS / ENCARGOS',['Item','Base','Alíquota','Valor','Tratamento'],items.map(function(x){return[x.label,money47(x.base),pct47(x.rate),money47(x.value),x.nature]}),['TOTAL','','',money47(total),''],null,[28,18,13,18,23])
}
function benefitCategoryTotals47(t){
  var out={seg:0,med:0,vr:0,vt:0,total:0};
  t.rows.forEach(function(r){var b=benefitExact47(r.person);if(!b)return;out.seg+=n47(b.seguro_vida);out.med+=n47(b.assistencia_medica);out.vr+=n47(b.vr_caixa);out.vt+=n47(b.vale_transporte);out.total+=n47(b.seguro_vida)+n47(b.assistencia_medica)+n47(b.vr_caixa)+n47(b.vale_transporte)});
  return out
}
function openBenefits47(t){
  var c=benefitCompleteness47();
  openStable47(c.complete?'Benefícios projetados':'Benefícios confirmados — fonte parcial','PRÓXIMA FOLHA · BENEFÍCIOS E RATEIO',['Colaborador','Departamento','Seguro','Saúde','VR / VA / Cesta','VT','Total'],t.rows.map(function(r){var b=benefitExact47(r.person)||{};return[r.nome,r.departamento,money47(b.seguro_vida),money47(b.assistencia_medica),money47(b.vr_caixa),money47(b.vale_transporte),money47(r.beneficios)]}),['TOTAL','',money47(sum47(t.rows,function(r){var b=benefitExact47(r.person)||{};return b.seguro_vida})),money47(sum47(t.rows,function(r){var b=benefitExact47(r.person)||{};return b.assistencia_medica})),money47(sum47(t.rows,function(r){var b=benefitExact47(r.person)||{};return b.vr_caixa})),money47(sum47(t.rows,function(r){var b=benefitExact47(r.person)||{};return b.vale_transporte})),money47(t.ben)],c.complete?'Fonte integrada da competência-base.':'Fonte atual ainda não contém valores integrados de VR/VA/Cesta e VT; eles não são inventados na projeção.',[28,17,10,10,13,10,12])
}
function openPeopleMetric47(t,key,title){
  var total=r247(sum47(t.rows,key));
  openStable47(title,'PRÓXIMA FOLHA · COMPOSIÇÃO E RATEIO',['Colaborador','Departamento','Valor','% do card'],t.rows.map(function(r){var v=n47(r[key]);return[r.nome,r.departamento,money47(v),total?pct47(v/total):'—']}),['TOTAL',t.rows.length+' pessoas',money47(total),'100,00%'],'Projeção '+nextComp47(),[43,24,21,12])
}
function openEncBenefits47(t){
  var b=benefitCategoryTotals47(t),items=companyItems47(t).map(function(x){return[x.label,'Encargo',money47(x.value)]});
  [['Seguro de Vida',b.seg],['Assistência Médica',b.med],['VR / VA / Cesta',b.vr],['Vale Transporte',b.vt]].forEach(function(x){items.push([x[0],'Benefício',money47(x[1])])});
  openStable47('Encargos + benefícios','COMPOSIÇÃO EXATA DO CARD',['Componente','Natureza','Valor'],items,['TOTAL','',money47(t.company+t.ben)],'O total é a soma dos encargos pagos/depositados pela empresa com os benefícios confirmados na competência-base.',[52,22,26])
}
function openCost47(t){
  openStable47('Custo total estimado','COMPOSIÇÃO DO CUSTO',['Componente','Valor'],[['Proventos previstos',money47(t.prov)],['Encargos da empresa',money47(t.company)],['Benefícios confirmados',money47(t.ben)]],['TOTAL',money47(t.cost)],null,[70,30])
}
function handleForecastCard47(card){
  var t=V47.snapshot||auditedForecast47(),key=card.dataset.rh47Key||'',ln=norm47((card.querySelector('span')||{}).textContent||'');
  if(card.dataset.rh47Forecast==='0'||key==='prov'||/provento/.test(ln))return openPeopleMetric47(t,'proventos','Proventos previstos');
  if(key==='disc'||/desconto/.test(ln))return openPeopleMetric47(t,'descontos','Descontos previstos');
  if(card.dataset.rh47Forecast==='1'||key==='liq'||/liquido/.test(ln))return openPeopleMetric47(t,'liquido','Líquido previsto');
  if(key==='ret'||/retid/.test(ln))return openTax47('Impostos retidos',retainedItems47(t),t.retained);
  if(key==='company'||(/^encargos empresa/.test(ln)))return openTax47('Encargos da empresa',companyItems47(t),t.company);
  if(card.dataset.rh47Forecast==='2'||/encargos \+ beneficios/.test(ln))return openEncBenefits47(t);
  if(key==='ben'||(/^benef/.test(ln)))return openBenefits47(t);
  if(key==='tax'||/tribut/.test(ln))return openTax47('Tributos / recolhimentos',retainedItems47(t).concat(companyItems47(t)),t.taxTotal);
  if(card.dataset.rh47Forecast==='3'||key==='cost'||/custo/.test(ln))return openCost47(t)
}

/* ── PDF auditado ── */
async function ensurePdf47(){
  if(!LIBRARIES.jspdf)LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};
  if(!LIBRARIES.autotable)LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)}};
  await loadLibrary('jspdf');await loadLibrary('autotable')
}
function rgb47(hex){hex=String(hex||'').replace('#','');return[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]}
function pdfHead47(doc,title,sub){var w=doc.internal.pageSize.getWidth();doc.setFillColor.apply(doc,rgb47('#071a2c'));doc.rect(0,0,w,31,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,12,13);doc.setFont('helvetica','normal');doc.setFontSize(8.2);doc.text(sub||'',12,20,{maxWidth:w-24});doc.setTextColor.apply(doc,rgb47('#f2c94c'));doc.setFont('helvetica','bold');doc.setFontSize(7.8);doc.text('LIGA NACIONAL DE BASQUETE · RH & FOLHA · USO RESTRITO',12,26)}
function pdfFoot47(doc,ref){var pages=doc.internal.getNumberOfPages();for(var i=1;i<=pages;i++){doc.setPage(i);var w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();doc.setTextColor.apply(doc,rgb47('#718396'));doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text('Projeção gerencial · base '+ref+' · validar com folha/eSocial/DCTFWeb/FGTS Digital',12,h-7);doc.text('Página '+i+' de '+pages,w-12,h-7,{align:'right'})}}
function pdfCards47(doc,y,items){var w=doc.internal.pageSize.getWidth(),cols=4,gap=4,cw=(w-24-gap*3)/4,ch=23;items.forEach(function(it,i){var row=Math.floor(i/4),col=i%4,x=12+col*(cw+gap),yy=y+row*(ch+4),feat=!!it[3];doc.setFillColor.apply(doc,rgb47(feat?'#0d2b42':'#eef4f8'));doc.roundedRect(x,yy,cw,ch,3,3,'F');doc.setTextColor.apply(doc,rgb47(feat?'#ffffff':'#64778b'));doc.setFont('helvetica','bold');doc.setFontSize(6.2);doc.text(String(it[0]).toUpperCase(),x+3.5,yy+6.5,{maxWidth:cw-7});doc.setTextColor.apply(doc,rgb47(feat?'#f2c94c':'#071a2c'));doc.setFontSize(10.2);doc.text(money47(it[1]),x+3.5,yy+15,{maxWidth:cw-7});doc.setTextColor.apply(doc,rgb47(feat?'#dce7f3':'#718396'));doc.setFont('helvetica','normal');doc.setFontSize(5.3);doc.text(String(it[2]||''),x+3.5,yy+20,{maxWidth:cw-7})});return y+Math.ceil(items.length/4)*(ch+4)}
function taxPdfRows47(items){return items.map(function(x){return[x.label,money47(x.base),pct47(x.rate),money47(x.value),x.nature]})}
async function exportForecastPdf47(){
  if(!allowed47()){warn47('Seu perfil não possui permissão para exportar relatórios.');return}
  await loadBenefits47(false);normalizeAll47();
  var t=auditedForecast47();if(!t.rows.length)throw new Error('A projeção da próxima folha ainda não está disponível.');
  await ensurePdf47();
  var ref=comp47((latestActual47()||{}).competencia),next=nextComp47(),complete=benefitCompleteness47(),doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
  pdfHead47(doc,'Próxima Folha — Relatório Executivo Auditado','Projeção '+next+' · base '+ref+' · cálculos e composições conciliados');
  var y=37;y=pdfCards47(doc,y,[['Proventos previstos',t.prov,next],['Descontos previstos',t.disc,'retenções + demais descontos'],['Líquido previsto',t.liq,'proventos − descontos',true],['Impostos retidos',t.retained,'INSS + IRRF'],['Encargos empresa',t.company,'INSS patronal + RAT + terceiros + PIS + FGTS'],[complete.complete?'Benefícios':'Benefícios confirmados',t.ben,complete.complete?'fonte integrada':'fonte parcial'],['Tributos / recolhimentos',t.taxTotal,'retidos + empresa'],['Custo total estimado',t.cost,'proventos + encargos + benefícios',true]]);
  doc.setTextColor.apply(doc,rgb47('#071a2c'));doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('RETENÇÕES ESTIMADAS NO PAGAMENTO DOS COLABORADORES',12,y+1);
  doc.autoTable({startY:y+4,head:[['Obrigação','Base projetada','Alíquota efetiva','Valor projetado','Tratamento']],body:taxPdfRows47(retainedItems47(t)).concat(t.otherDiscounts>0?[['Outros descontos','—','—',money47(t.otherDiscounts),'Demais descontos previstos']]:[]),foot:[['TOTAL DE IMPOSTOS RETIDOS','','',money47(t.retained),'']],theme:'grid',styles:{font:'helvetica',fontSize:7,cellPadding:2,textColor:rgb47('#071a2c')},headStyles:{fillColor:rgb47('#0d2b42'),textColor:[255,255,255]},footStyles:{fillColor:rgb47('#eef4f8'),textColor:rgb47('#071a2c'),fontStyle:'bold'},columnStyles:{0:{cellWidth:70},1:{cellWidth:45,halign:'right'},2:{cellWidth:38,halign:'right'},3:{cellWidth:43,halign:'right',fontStyle:'bold'},4:{cellWidth:77}}});
  y=doc.lastAutoTable.finalY+6;doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('ENCARGOS PAGOS / DEPOSITADOS PELA EMPRESA',12,y+1);
  doc.autoTable({startY:y+4,head:[['Encargo','Base projetada','Alíquota','Valor projetado','Tratamento']],body:taxPdfRows47(companyItems47(t)),foot:[['TOTAL DE ENCARGOS DA EMPRESA','','',money47(t.company),'']],theme:'grid',styles:{font:'helvetica',fontSize:7,cellPadding:2,textColor:rgb47('#071a2c')},headStyles:{fillColor:rgb47('#0d2b42'),textColor:[255,255,255]},footStyles:{fillColor:rgb47('#eef4f8'),textColor:rgb47('#071a2c'),fontStyle:'bold'},columnStyles:{0:{cellWidth:70},1:{cellWidth:45,halign:'right'},2:{cellWidth:38,halign:'right'},3:{cellWidth:43,halign:'right',fontStyle:'bold'},4:{cellWidth:77}}});
  y=doc.lastAutoTable.finalY+5;
  if(y<190){doc.setFillColor.apply(doc,rgb47('#f5f8fa'));doc.roundedRect(12,y,273,16,3,3,'F');doc.setTextColor.apply(doc,rgb47('#071a2c'));doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.text('CONCILIAÇÃO EXECUTIVA',16,y+5);doc.setFont('helvetica','normal');doc.text('Líquido: '+money47(t.prov)+' − '+money47(t.disc)+' = '+money47(t.liq)+'   |   Custo: '+money47(t.prov)+' + '+money47(t.company)+' + '+money47(t.ben)+' = '+money47(t.cost),16,y+11,{maxWidth:265})}

  doc.addPage('a4','landscape');pdfHead47(doc,'Próxima Folha — Composição por Colaborador','Todas as colunas abaixo conciliam exatamente com os totalizadores executivos');
  doc.autoTable({startY:37,head:[['Colaborador','Departamento','Proventos','Descontos','Líquido','Encargos empresa','Benefícios','Custo']],body:t.rows.map(function(r){return[r.nome,r.departamento,money47(r.proventos),money47(r.descontos),money47(r.liquido),money47(r.encargos),money47(r.beneficios),money47(r.custo)]}),foot:[['TOTAL','',money47(t.prov),money47(t.disc),money47(t.liq),money47(t.company),money47(t.ben),money47(t.cost)]],theme:'striped',styles:{font:'helvetica',fontSize:6.45,cellPadding:1.9,textColor:rgb47('#071a2c')},headStyles:{fillColor:rgb47('#0d2b42'),textColor:[255,255,255]},alternateRowStyles:{fillColor:[247,250,253]},footStyles:{fillColor:rgb47('#eaf2f6'),textColor:rgb47('#071a2c'),fontStyle:'bold'},columnStyles:{0:{cellWidth:76},1:{cellWidth:31},2:{cellWidth:29,halign:'right'},3:{cellWidth:29,halign:'right'},4:{cellWidth:29,halign:'right',fontStyle:'bold'},5:{cellWidth:31,halign:'right'},6:{cellWidth:31,halign:'right'},7:{cellWidth:31,halign:'right',fontStyle:'bold'}},margin:{left:8,right:8,bottom:16}});

  doc.addPage('a4','landscape');pdfHead47(doc,'Próxima Folha — Benefícios e Premissas','Rastreabilidade da projeção e alertas de completude');
  var bc=benefitCategoryTotals47(t);
  doc.autoTable({startY:38,head:[['Benefício','Valor projetado','Situação da fonte']],body:[['Seguro de Vida',money47(bc.seg),'Confirmado na competência-base'],['Assistência Médica',money47(bc.med),'Confirmado na competência-base'],['VR / VA / Cesta',money47(bc.vr),complete.hasVr?'Integrado':'Sem valor integrado na fonte atual'],['Vale Transporte',money47(bc.vt),complete.hasVt?'Integrado':'Sem valor integrado na fonte atual']],foot:[['TOTAL DE BENEFÍCIOS',money47(t.ben),complete.complete?'Fonte integrada':'Fonte parcial — não inventar valores ausentes']],theme:'grid',styles:{font:'helvetica',fontSize:8,cellPadding:2.8,textColor:rgb47('#071a2c')},headStyles:{fillColor:rgb47('#0d2b42'),textColor:[255,255,255]},footStyles:{fillColor:rgb47('#eef4f8'),fontStyle:'bold'},columnStyles:{0:{cellWidth:75},1:{cellWidth:45,halign:'right'},2:{cellWidth:153}}});
  y=doc.lastAutoTable.finalY+7;
  doc.autoTable({startY:y,head:[['Regra / validação','Critério aplicado']],body:[['INSS patronal','20,00% sobre a base patronal projetada. O valor 2,24% anterior era erro de captura do código da empresa 2038 como se fosse contribuição.'],['RAT',pct47(rates47().rat)+' conforme razão observada na competência-base, validada em faixa plausível.'],['Terceiros',pct47(rates47().terceiros)+' conforme competência-base.'],['PIS folha',pct47(rates47().pis)+' conforme competência-base.'],['FGTS',pct47(rates47().fgts)+' sobre a base FGTS projetada.'],['INSS do segurado','Tabela progressiva 2026 por colaborador, respeitando o teto.'],['IRRF','Tabela mensal e redução de 2026 aplicadas sobre a base individual projetada; variáveis futuras devem ser validadas no fechamento.'],['Conciliação','A soma das linhas por colaborador é a mesma dos cards e dos totais deste PDF.']],theme:'grid',styles:{font:'helvetica',fontSize:7.6,cellPadding:2.6,textColor:rgb47('#071a2c')},headStyles:{fillColor:rgb47('#0d2b42'),textColor:[255,255,255]},columnStyles:{0:{cellWidth:58,fontStyle:'bold'},1:{cellWidth:215}}});
  pdfFoot47(doc,ref);doc.save('LNB_Proxima_Folha_'+next.replace('/','-')+'_Auditada.pdf')
}

/* ── Chat IA: grip de redimensionamento real ── */
function saveAi47(p){if(!p||p.hidden)return;var r=p.getBoundingClientRect();try{localStorage.setItem(AI_KEY47,JSON.stringify({left:r.left,top:r.top,width:r.width,height:r.height}))}catch(e){}}
function installAiResize47(){
  var p=E47('ai-panel');if(!p)return;p.classList.add('rh46-floating-ai','rh47-floating-ai');
  var grip=E47('rh47-ai-resize');if(!grip){grip=document.createElement('div');grip.id='rh47-ai-resize';grip.className='rh47-ai-resize';grip.title='Arraste para redimensionar';p.appendChild(grip)}
  if(grip.dataset.bound==='1')return;grip.dataset.bound='1';
  grip.addEventListener('pointerdown',function(e){
    if(window.innerWidth<760)return;var r=p.getBoundingClientRect();p.style.left=r.left+'px';p.style.top=r.top+'px';p.style.right='auto';p.style.bottom='auto';p.style.width=r.width+'px';p.style.height=r.height+'px';
    V47.aiResize={x:e.clientX,y:e.clientY,w:r.width,h:r.height};try{grip.setPointerCapture(e.pointerId)}catch(ignore){}e.preventDefault();e.stopPropagation()
  });
  grip.addEventListener('pointermove',function(e){if(!V47.aiResize)return;var w=Math.max(320,Math.min(V47.aiResize.w+(e.clientX-V47.aiResize.x),window.innerWidth-parseFloat(p.style.left||8)-8)),h=Math.max(360,Math.min(V47.aiResize.h+(e.clientY-V47.aiResize.y),window.innerHeight-parseFloat(p.style.top||82)-8));p.style.width=w+'px';p.style.height=h+'px';e.preventDefault()});
  function done(){if(!V47.aiResize)return;V47.aiResize=null;saveAi47(p)}
  grip.addEventListener('pointerup',done);grip.addEventListener('pointercancel',done)
}

/* ── eventos em captura no window: precedem hotfixes antigos ── */
function activePlan47(){var p=Array.from(document.querySelectorAll('#page-planejamento [data-plan-pane]')).find(function(x){return !x.hidden&&getComputedStyle(x).display!=='none'});return p&&p.dataset.planPane||''}
function installCapture47(){
  if(window._rh47Capture)return;window._rh47Capture=true;
  window.addEventListener('click',function(e){
    if(window.RH_FORECAST_V57&&typeof window.rhV57HandleCapture==='function'&&window.rhV57HandleCapture(e))return;
    var btn=e.target&&e.target.closest?e.target.closest('#rh42-plan-pdf'):null;
    if(btn&&activePlan47()==='folha'){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();if(btn.dataset.rh47Busy==='1')return;btn.dataset.rh47Busy='1';var old=btn.textContent;btn.disabled=true;btn.textContent='Gerando PDF auditado...';Promise.resolve().then(exportForecastPdf47).catch(function(err){warn47(err&&err.message?err.message:String(err))}).finally(function(){btn.disabled=false;btn.textContent=old;delete btn.dataset.rh47Busy});return}
    var tax=e.target&&e.target.closest?e.target.closest('.rh47-tax-line'):null;
    if(tax){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();var t=auditedForecast47(),all=retainedItems47(t).concat(companyItems47(t)),x=all.find(function(q){return q.key===tax.dataset.rh47Tax});if(x)openTax47(x.label,[x],x.value);return}
    var card=e.target&&e.target.closest?e.target.closest('#page-planejamento [data-plan-pane="folha"] .rh47-summary-card,#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis .kpi'):null;
    if(card){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();handleForecastCard47(card)}
  },true)
}

/* ── estilos ── */
function styles47(){
  if(E47('_rh47'))return;var s=document.createElement('style');s.id='_rh47';s.textContent=
  '#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis{display:none!important}#rh47-forecast-summary,#rh47-forecast-summary *{animation:none!important}#rh47-forecast-summary .rh47-summary-card{transition:none!important}.rh47-summary{margin:0 0 18px}.rh47-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}.rh47-summary-card{min-width:0;min-height:126px;height:126px;box-sizing:border-box;padding:14px 15px;border:1px solid var(--line-soft);border-radius:14px;background:var(--surface);color:var(--text);text-align:left;cursor:pointer}.rh47-summary-card.featured{border-color:var(--line);background:linear-gradient(145deg,rgba(232,185,60,.11),rgba(31,196,141,.09)),var(--surface)}.rh47-summary-card span,.rh47-summary-card small{display:block;color:var(--muted)}.rh47-summary-card span{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.rh47-summary-card strong{display:block;margin:7px 0 5px;font-size:28px!important;line-height:32px!important;letter-spacing:-.02em!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important}.rh47-summary-card small{font-size:9.5px;line-height:1.3}'+
  '.rh47-tax-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rh47-tax-panel{overflow:hidden;border:1px solid var(--line-soft);border-radius:14px;background:var(--surface)}.rh47-tax-head{display:flex;justify-content:space-between;gap:10px;padding:11px 13px;background:var(--surface-2);border-bottom:1px solid var(--line-soft)}.rh47-tax-head b{font-size:10px;color:var(--gold-2);letter-spacing:.08em}.rh47-tax-head span{font-size:9px;color:var(--muted)}.rh47-tax-line{display:grid;grid-template-columns:minmax(170px,1.5fr) minmax(105px,.8fr) 82px minmax(110px,.8fr);gap:10px;align-items:center;width:100%;padding:10px 13px;border:0;border-bottom:1px solid var(--line-soft);background:transparent;color:var(--text);text-align:left;cursor:pointer}.rh47-tax-line:last-child{border-bottom:0}.rh47-tax-line>span:nth-child(n+2),.rh47-tax-line>strong{text-align:right;font-variant-numeric:tabular-nums}.rh47-tax-line span b,.rh47-tax-line span small{display:block}.rh47-tax-line span small{color:var(--muted);font-size:9px;margin-top:2px}.rh47-tax-line>span:nth-child(n+2){color:var(--muted);font-size:10px}.rh47-tax-line>strong{font-size:11px}'+
  '.rh47-audit{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;padding:10px 12px;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2);font-size:10px}.rh47-audit b{margin-right:4px}.rh47-audit span{padding:5px 8px;border:1px solid var(--line-soft);border-radius:999px;color:var(--muted)}.rh47-audit .ok{color:var(--emerald)}.rh47-audit .warn{color:var(--orange)}'+
  '.rh47-popup-sub{margin:0 0 10px;color:var(--muted);font-size:.76rem;line-height:1.5}.rh47-popup-scroll{width:100%;overflow:auto}.rh47-popup-table{width:100%!important;min-width:720px!important;table-layout:fixed!important;border-collapse:collapse!important}.rh47-popup-table th,.rh47-popup-table td{padding:10px 11px!important;border-bottom:1px solid var(--line-soft)!important;vertical-align:top!important;overflow-wrap:anywhere!important;word-break:normal!important;transition:none!important;animation:none!important}.rh47-popup-table th{background:var(--surface-2)!important;color:var(--muted)!important;font-size:.66rem!important;text-transform:uppercase!important;letter-spacing:.06em!important}.rh47-popup-table td{font-size:.74rem!important}.rh47-popup-table .money{text-align:right!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important}.rh47-popup-table tfoot td{background:color-mix(in srgb,var(--surface-2) 82%,var(--gold) 8%)!important;border-top:2px solid var(--line)!important}'+
  '.rh47-table-total td{background:color-mix(in srgb,var(--surface-2) 82%,var(--gold) 8%)!important;border-top:2px solid var(--line)!important;font-weight:900!important}'+
  '.ai-panel.rh47-floating-ai{resize:both!important;overflow:hidden!important}.rh47-ai-resize{position:absolute;right:2px;bottom:2px;width:22px;height:22px;z-index:8;cursor:nwse-resize;touch-action:none}.rh47-ai-resize:before{content:"";position:absolute;right:4px;bottom:4px;width:11px;height:11px;border-right:2px solid var(--gold);border-bottom:2px solid var(--gold);opacity:.9}.rh47-ai-resize:after{content:"";position:absolute;right:8px;bottom:8px;width:5px;height:5px;border-right:1px solid var(--gold);border-bottom:1px solid var(--gold);opacity:.65}'+
  '@media(max-width:1120px){.rh47-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rh47-tax-grid{grid-template-columns:1fr}}@media(max-width:760px){.rh47-summary-grid{grid-template-columns:1fr 1fr}.rh47-ai-resize{display:none}.ai-panel.rh47-floating-ai{resize:none!important}}@media(max-width:480px){.rh47-summary-grid{grid-template-columns:1fr}}';
  document.head.appendChild(s)
}

function schedule47(ms){clearTimeout(V47.refreshTimer);V47.refreshTimer=setTimeout(function(){refresh47().catch(function(){})},ms==null?100:ms)}
async function refresh47(){
  if(window.RH_FORECAST_V57){installAiResize47();return}
  styles47();patchParser47();normalizeAll47();installEmployerCharges47();await loadBenefits47(false);
  var pane=forecastPane47();if(pane&&getComputedStyle(pane).display!=='none'){
    var t=auditedForecast47();if(t.rows.length){V47.snapshot=t;syncForecastTable47(t);installForecastSummary47(t)}
  }
  installAiResize47()
}
function observe47(){
  if(V47.observer)return;V47.observer=new MutationObserver(function(ms){var need=false;ms.forEach(function(m){if(m.type==='childList'){var t=m.target&&m.target.nodeType===1?m.target:null;if(t&&(t.id==='rh-plan-folha-table'||t.id==='rh-plan-folha-kpis'||t.closest&&t.closest('#rh-plan-folha-table,#rh-plan-folha-kpis')))need=true}});if(need)schedule47(90)});
  V47.observer.observe(document.body,{childList:true,subtree:true})
}
function init47(){
  styles47();patchParser47();installEmployerCharges47();installCapture47();refresh47();
  [250,800,1600].forEach(function(ms){setTimeout(function(){schedule47(0)},ms)});
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab],.nav-item,#rh-plan-recalc'))schedule47(140)},true);
  ['rh-period-year','rh-period-month','competencia-select'].forEach(function(id){var x=E47(id);if(x)x.addEventListener('change',function(){V47.benefitLoaded=false;schedule47(180)})})
}
window.rhV47ExportForecastPdf=exportForecastPdf47;
window.rhV47Refresh=refresh47;
window.RH_AUDIT_V47=true;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init47);else init47();
})();
