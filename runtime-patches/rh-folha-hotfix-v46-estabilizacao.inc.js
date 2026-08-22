/* RH v46 — estabilização geral: próxima folha, totalizadores, cards e Chat IA flutuante */
(function(){
'use strict';

var V46={refreshTimer:0,cardObserver:null,aiResize:null,drag:null};
var AI_KEY='lnb_rh_ai_window_v46';
var CARD_SELECTOR='.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.rh-history-metric,.summary-card,.stat-card,.preview-summary>div,.rh46-total-card';
var VALUE_SELECTOR='.kpi strong,.rh40-guide-card strong,.rh41-report-card strong,.rh-close-stat strong,.rh-history-metric strong,.summary-card strong,.stat-card strong,.preview-summary>div strong,.rh46-total-card strong';

function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function esc46(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function norm46(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function money46(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}
function pct46(v){return (n(v)*100).toFixed(2).replace('.',',')+'%'}
function parseMoney46(v){
  var s=String(v==null?'':v).trim(),neg=/^\(.*\)$/.test(s);
  s=s.replace(/[()]/g,'').replace(/R\$/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');
  var x=Number(s)||0;return neg?-x:x
}
function sum46(a,key){return (a||[]).reduce(function(s,x){return s+n(typeof key==='function'?key(x):x&&x[key])},0)}
function setHtml(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html}
function allowed46(){try{return !!(canAdmin()||can('exportar'))}catch(e){return false}}
function warn46(msg){try{toast(msg,true)}catch(e){try{alert(msg)}catch(ignore){}}}

function comp46(v){
  try{return formatCompetence(v)}catch(e){
    var p=String(v||'').slice(0,7).split('-');return p.length===2?p[1]+'/'+p[0]:'—'
  }
}
function latestActual46(){
  var src=(window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(S.competencias||[])).filter(function(c){
    return c&&!c._periodConsolidated&&String(c.competencia||'').slice(5,7)!=='00'
  }).slice().sort(function(a,b){return String(a.competencia||'').localeCompare(String(b.competencia||''))});
  if(src.length)return src[src.length-1];
  return S.competencia&&!S.competencia._periodConsolidated?S.competencia:null
}
function nextComp46(){
  var c=latestActual46(),d=c&&c.competencia?new Date(String(c.competencia).slice(0,10)+'T12:00:00'):new Date();
  if(isNaN(d.getTime()))d=new Date();
  d=new Date(d.getFullYear(),d.getMonth()+1,1,12);
  return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()
}

function forecastPane46(){return document.querySelector('[data-plan-pane="folha"]')}
function activePlanKind46(){
  var p=Array.from(document.querySelectorAll('#page-planejamento [data-plan-pane]')).find(function(x){
    return !x.hidden&&getComputedStyle(x).display!=='none'
  });
  return p&&p.dataset.planPane||''
}
function forecastRows46(){
  var pane=forecastPane46(),table=pane&&pane.querySelector('table'),rows=table?Array.from(table.querySelectorAll('tbody tr')):[];
  return rows.map(function(tr){
    var c=tr.cells||[];
    if(c.length<8)return null;
    return{
      nome:String(c[0].textContent||'').trim(),
      departamento:String(c[1].textContent||'').trim(),
      proventos:parseMoney46(c[2].textContent),
      descontos:parseMoney46(c[3].textContent),
      liquido:parseMoney46(c[4].textContent),
      encargos:parseMoney46(c[5].textContent),
      beneficios:parseMoney46(c[6].textContent),
      custo:parseMoney46(c[7].textContent)
    }
  }).filter(Boolean)
}
function forecastTotals46(){
  var rows=forecastRows46();
  return{
    rows:rows,
    prov:sum46(rows,'proventos'),
    disc:sum46(rows,'descontos'),
    liq:sum46(rows,'liquido'),
    enc:sum46(rows,'encargos'),
    ben:sum46(rows,'beneficios'),
    custo:sum46(rows,'custo')
  }
}
function chargeModel46(forecast){
  var c=latestActual46()||{},e=c.encargos||{},actualProv=n(c.proventos)||sum46(S.pessoas||[],'proventos')||forecast.prov||1;
  var factor=actualProv>0?forecast.prov/actualProv:1;
  if(!isFinite(factor)||factor<=0)factor=1;
  function sc(v){return n(v)*factor}
  function base(v,fallback){var x=n(v);return sc(x||fallback||0)}
  var baseInss=n(e.base_total_inss||e.sal_contrib_empregados)||actualProv;
  var baseFgts=n(e.base_fgts)||actualProv;
  var basePis=n(e.base_pis)||baseInss;
  var baseIrrf=n(e.base_irrf_mensal||e.base_irrf)||actualProv;
  var employerInss=n(e.empresa_inss||e.inss_empresa);
  if(!employerInss&&baseInss)employerInss=baseInss*.20;
  var rat=n(e.rat);if(!rat&&baseInss)rat=baseInss*.01;
  var third=n(e.terceiros);if(!third&&baseInss)third=baseInss*.058;
  var pis=n(e.valor_pis);if(!pis&&basePis)pis=basePis*.01;
  var fgts=n(e.valor_fgts||c.valor_fgts);if(!fgts&&baseFgts)fgts=baseFgts*.08;
  var insured=n(e.segurados);
  if(!insured){
    var ti=n(e.total_inss),rest=employerInss+rat+third;
    insured=Math.max(0,ti-rest)
  }
  var irrf=n(e.valor_irrf_folha||e.valor_irrf_mensal||e.valor_total_irrf||e.valor_irrf);
  var retained=[
    {key:'INSS_EMP',label:'INSS dos segurados',base:base(e.sal_contrib_empregados||e.base_total_inss,actualProv),value:sc(insured),nature:'Retido do colaborador'},
    {key:'IRRF',label:'IRRF sobre folha',base:base(e.base_irrf_mensal||e.base_irrf,actualProv),value:sc(irrf),nature:'Retido do colaborador'}
  ];
  var company=[
    {key:'INSS_PAT',label:'INSS patronal',base:base(baseInss,actualProv),value:sc(employerInss),nature:'Pago pela empresa'},
    {key:'RAT',label:'RAT',base:base(baseInss,actualProv),value:sc(rat),nature:'Pago pela empresa'},
    {key:'TERC',label:'Terceiros',base:base(baseInss,actualProv),value:sc(third),nature:'Pago pela empresa'},
    {key:'PIS',label:'PIS sobre folha',base:base(basePis,actualProv),value:sc(pis),nature:'Pago pela empresa'},
    {key:'FGTS',label:'FGTS',base:base(baseFgts,actualProv),value:sc(fgts),nature:'Depositado pela empresa'}
  ];
  retained.forEach(function(x){x.rate=x.base?x.value/x.base:0});
  company.forEach(function(x){x.rate=x.base?x.value/x.base:0});
  var retainedTotal=sum46(retained,'value'),companyTotal=sum46(company,'value');
  return{
    reference:c,
    factor:factor,
    retained:retained,
    company:company,
    retainedTotal:retainedTotal,
    companyTotal:companyTotal,
    otherDiscounts:Math.max(0,n(forecast.disc)-retainedTotal),
    taxGrandTotal:retainedTotal+companyTotal
  }
}
function monthlyTotals46(){
  var c=S.competencia||{},people=S.pessoas||[];
  var prov=n(c.proventos)||sum46(people,'proventos'),disc=n(c.descontos)||sum46(people,'descontos'),liq=n(c.liquido)||sum46(people,'liquido');
  var f={prov:prov,disc:disc,liq:liq,enc:0,ben:0,custo:0,rows:[]},m=chargeModel46(f);
  /* Para a folha atual a referência é a própria competência quando houver um único mês. */
  var e=c.encargos||{};
  function val(v){return n(v)}
  var baseInss=val(e.base_total_inss||e.sal_contrib_empregados)||prov,baseFgts=val(e.base_fgts)||prov,basePis=val(e.base_pis)||baseInss,baseIrrf=val(e.base_irrf_mensal||e.base_irrf)||prov;
  var emp=val(e.empresa_inss||e.inss_empresa)||baseInss*.20,rat=val(e.rat)||baseInss*.01,terc=val(e.terceiros)||baseInss*.058,pis=val(e.valor_pis)||basePis*.01,fgts=val(e.valor_fgts||c.valor_fgts)||baseFgts*.08;
  var seg=val(e.segurados);if(!seg){seg=Math.max(0,val(e.total_inss)-emp-rat-terc)}
  var irrf=val(e.valor_irrf_folha||e.valor_irrf_mensal||e.valor_total_irrf||e.valor_irrf);
  m.retained=[
    {key:'INSS_EMP',label:'INSS dos segurados',base:baseInss,value:seg,nature:'Retido do colaborador'},
    {key:'IRRF',label:'IRRF sobre folha',base:baseIrrf,value:irrf,nature:'Retido do colaborador'}
  ];
  m.company=[
    {key:'INSS_PAT',label:'INSS patronal',base:baseInss,value:emp,nature:'Pago pela empresa'},
    {key:'RAT',label:'RAT',base:baseInss,value:rat,nature:'Pago pela empresa'},
    {key:'TERC',label:'Terceiros',base:baseInss,value:terc,nature:'Pago pela empresa'},
    {key:'PIS',label:'PIS sobre folha',base:basePis,value:pis,nature:'Pago pela empresa'},
    {key:'FGTS',label:'FGTS',base:baseFgts,value:fgts,nature:'Depositado pela empresa'}
  ];
  m.retained.concat(m.company).forEach(function(x){x.rate=x.base?x.value/x.base:0});
  m.retainedTotal=sum46(m.retained,'value');m.companyTotal=sum46(m.company,'value');m.taxGrandTotal=m.retainedTotal+m.companyTotal;m.otherDiscounts=Math.max(0,disc-m.retainedTotal);
  return{prov:prov,disc:disc,liq:liq,model:m,people:people}
}

/* ───────────────────────── valores estáveis dos cards ───────────────────────── */
function stabilizeStrong46(el){
  if(!el||!el.isConnected)return;
  var direct=el.querySelector(':scope > .rh46-card-value');
  if(direct&&el.children.length===1)return;
  var text=String(el.textContent||'').trim();
  if(!text)return;
  el.textContent='';
  var span=document.createElement('span');span.className='rh46-card-value';span.textContent=text;el.appendChild(span)
}
function stabilizeCards46(root){
  var scope=root&&root.querySelectorAll?root:document;
  if(root&&root.matches&&root.matches(VALUE_SELECTOR))stabilizeStrong46(root);
  Array.prototype.forEach.call(scope.querySelectorAll(VALUE_SELECTOR),stabilizeStrong46)
}

/* ───────────────────────── totalizadores da folha atual ─────────────────────── */
function taxTableHtml46(items,title){
  return '<article class="rh46-tax-panel"><div class="rh46-tax-head"><b>'+esc46(title)+'</b><span>Base · alíquota efetiva · valor</span></div><div class="rh46-tax-list">'+items.map(function(x){
    return '<button type="button" class="rh46-tax-row" data-rh46-tax="'+esc46(x.key)+'"><span><b>'+esc46(x.label)+'</b><small>'+esc46(x.nature)+'</small></span><span>'+money46(x.base)+'</span><span>'+pct46(x.rate)+'</span><strong>'+money46(x.value)+'</strong></button>'
  }).join('')+'</div></article>'
}
function totalCard46(label,value,sub,key,featured){
  return '<button type="button" class="rh46-total-card '+(featured?'featured':'')+'" data-rh46-summary="'+esc46(key)+'"><span>'+esc46(label)+'</span><strong>'+esc46(value)+'</strong><small>'+esc46(sub||'')+'</small></button>'
}
function installPayrollTotalizer46(){
  var page=E('page-folha'),anchor=E('payroll-kpis');if(!page||!anchor||!S.competencia)return;
  var t=monthlyTotals46(),m=t.model,box=E('rh46-payroll-totalizer');
  if(!box){box=document.createElement('section');box.id='rh46-payroll-totalizer';box.className='rh46-totalizer';anchor.insertAdjacentElement('afterend',box)}
  var html='<div class="rh46-summary-grid">'+
    totalCard46('Proventos',money46(t.prov),'total bruto da folha','prov')+
    totalCard46('Descontos',money46(t.disc),'retenções + demais descontos','disc')+
    totalCard46('Líquido',money46(t.liq),'total processado','liq',true)+
    totalCard46('Impostos retidos',money46(m.retainedTotal),'INSS segurados + IRRF','ret')+
    totalCard46('Encargos da empresa',money46(m.companyTotal),'INSS patronal + RAT + terceiros + PIS + FGTS','company')+
    totalCard46('Tributos / recolhimentos',money46(m.taxGrandTotal),'retidos + pagos pela empresa','tax')+
    '</div><div class="rh46-tax-columns">'+taxTableHtml46(m.retained,'RETIDOS NA FOLHA')+taxTableHtml46(m.company,'PAGOS / DEPOSITADOS PELA EMPRESA')+'</div>';
  setHtml(box,html);
  installPayrollFoot46();
  stabilizeCards46(box);
  makeClickable46(box)
}
function installPayrollFoot46(){
  var page=E('page-folha'),table=page&&page.querySelector('table');if(!table)return;
  var body=table.tBodies&&table.tBodies[0],rows=body?Array.from(body.rows):[],sum={sal:0,prov:0,disc:0,liq:0};
  rows.forEach(function(r){var c=r.cells||[];if(c.length>=5){sum.sal+=parseMoney46(c[1].textContent);sum.prov+=parseMoney46(c[2].textContent);sum.disc+=parseMoney46(c[3].textContent);sum.liq+=parseMoney46(c[4].textContent)}});
  var tf=table.tFoot||table.createTFoot(),html='<tr class="rh46-table-total"><td><b>TOTAL DA FOLHA</b></td><td class="money"><b>'+money46(sum.sal)+'</b></td><td class="money"><b>'+money46(sum.prov)+'</b></td><td class="money"><b>'+money46(sum.disc)+'</b></td><td class="money"><b>'+money46(sum.liq)+'</b></td><td></td></tr>';
  setHtml(tf,html)
}

/* ───────────────────────── próxima folha na tela ───────────────────────────── */
function installForecastSummary46(){
  var pane=forecastPane46(),kpis=E('rh-plan-folha-kpis');if(!pane||!kpis)return;
  var f=forecastTotals46();if(!f.rows.length)return;
  var m=chargeModel46(f),cost=f.prov+m.companyTotal+f.ben,box=E('rh46-forecast-summary');
  if(!box){box=document.createElement('section');box.id='rh46-forecast-summary';box.className='rh46-totalizer rh46-forecast-totalizer';kpis.insertAdjacentElement('afterend',box)}
  var html='<div class="rh46-summary-grid">'+
    totalCard46('Proventos previstos',money46(f.prov),nextComp46(),'fprov')+
    totalCard46('Descontos previstos',money46(f.disc),'inclui retenções e outros descontos','fdisc')+
    totalCard46('Líquido previsto',money46(f.liq),'proventos − descontos','fliq',true)+
    totalCard46('Impostos retidos',money46(m.retainedTotal),'INSS segurados + IRRF','fret')+
    totalCard46('Encargos empresa',money46(m.companyTotal),'fora do líquido','fcompany')+
    totalCard46('Benefícios',money46(f.ben),'estimativa integrada','fben')+
    totalCard46('Custo total estimado',money46(cost),'proventos + encargos + benefícios','fcost',true)+
    '</div><div class="rh46-tax-columns">'+taxTableHtml46(m.retained,'RETENÇÕES ESTIMADAS NA PRÓXIMA FOLHA')+taxTableHtml46(m.company,'ENCARGOS ESTIMADOS PAGOS PELA EMPRESA')+'</div>'+
    '<div class="rh46-reconcile"><b>Conciliação executiva</b><span>Proventos '+money46(f.prov)+' − descontos '+money46(f.disc)+' = líquido '+money46(f.liq)+'.</span><span>Custo empresa: proventos '+money46(f.prov)+' + encargos '+money46(m.companyTotal)+' + benefícios '+money46(f.ben)+' = <strong>'+money46(cost)+'</strong>.</span></div>';
  setHtml(box,html);stabilizeCards46(box);makeClickable46(box)
}

/* ───────────────────────── PDF da próxima folha ────────────────────────────── */
async function ensurePdf46(){
  if(!LIBRARIES.jspdf)LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};
  if(!LIBRARIES.autotable)LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)}};
  await loadLibrary('jspdf');await loadLibrary('autotable')
}
function rgb46(hex){hex=String(hex||'').replace('#','');return[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]}
function pdfHead46(doc,title,sub){
  var w=doc.internal.pageSize.getWidth();
  doc.setFillColor.apply(doc,rgb46('#071a2c'));doc.rect(0,0,w,31,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,12,13);
  doc.setFont('helvetica','normal');doc.setFontSize(8.2);doc.text(sub||'',12,20,{maxWidth:w-24});
  doc.setTextColor.apply(doc,rgb46('#f2c94c'));doc.setFont('helvetica','bold');doc.setFontSize(7.8);doc.text('LIGA NACIONAL DE BASQUETE · RH & FOLHA · USO RESTRITO',12,26)
}
function pdfFoot46(doc,ref){
  var pages=doc.internal.getNumberOfPages();
  for(var i=1;i<=pages;i++){
    doc.setPage(i);var w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
    doc.setTextColor.apply(doc,rgb46('#718396'));doc.setFont('helvetica','normal');doc.setFontSize(7);
    doc.text('Projeção gerencial · referência '+ref+' · validar antes de qualquer pagamento',12,h-7);
    doc.text('Página '+i+' de '+pages,w-12,h-7,{align:'right'})
  }
}
function pdfKpiGrid46(doc,y,items){
  var w=doc.internal.pageSize.getWidth(),cols=4,gap=4,cardW=(w-24-gap*(cols-1))/cols,cardH=22;
  items.forEach(function(it,i){
    var row=Math.floor(i/cols),col=i%cols,x=12+col*(cardW+gap),yy=y+row*(cardH+4),featured=!!it[3];
    doc.setFillColor.apply(doc,rgb46(featured?'#0d2b42':'#eef4f8'));doc.roundedRect(x,yy,cardW,cardH,3,3,'F');
    doc.setTextColor.apply(doc,rgb46(featured?'#ffffff':'#64778b'));doc.setFont('helvetica','bold');doc.setFontSize(6.4);doc.text(String(it[0]).toUpperCase(),x+3.5,yy+6.5,{maxWidth:cardW-7});
    doc.setTextColor.apply(doc,rgb46(featured?'#f2c94c':'#071a2c'));doc.setFontSize(10.4);doc.text(String(it[1]),x+3.5,yy+15,{maxWidth:cardW-7});
    if(it[2]){doc.setTextColor.apply(doc,rgb46(featured?'#dce7f3':'#718396'));doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.text(String(it[2]),x+3.5,yy+19.5,{maxWidth:cardW-7})}
  });
  return y+Math.ceil(items.length/cols)*(cardH+4)
}
function taxRowsPdf46(items){return items.map(function(x){return[x.label,money46(x.base),pct46(x.rate),money46(x.value),x.nature]})}
async function exportForecastPdf46(){
  if(!allowed46()){warn46('Seu perfil não possui permissão para exportar relatórios.');return}
  var f=forecastTotals46();
  if(!f.rows.length&&typeof window.rhRenderPlanning==='function'){window.rhRenderPlanning();await new Promise(function(r){setTimeout(r,80)});f=forecastTotals46()}
  if(!f.rows.length)throw new Error('A projeção da próxima folha ainda não está disponível.');
  await ensurePdf46();
  var m=chargeModel46(f),cost=f.prov+m.companyTotal+f.ben,ref=comp46(m.reference&&m.reference.competencia),next=nextComp46();
  var doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
  pdfHead46(doc,'Próxima Folha — Relatório Executivo Completo','Projeção '+next+' · base: folha oficial '+ref+' · retenções e encargos separados');
  var y=37;
  y=pdfKpiGrid46(doc,y,[
    ['Proventos previstos',money46(f.prov),next],
    ['Descontos previstos',money46(f.disc),'retenções + demais descontos'],
    ['Líquido previsto',money46(f.liq),'proventos − descontos',true],
    ['Impostos retidos',money46(m.retainedTotal),'INSS segurados + IRRF'],
    ['Encargos empresa',money46(m.companyTotal),'pagos fora do líquido'],
    ['Benefícios',money46(f.ben),'estimativa integrada'],
    ['Tributos / recolhimentos',money46(m.taxGrandTotal),'retidos + empresa'],
    ['Custo total estimado',money46(cost),'proventos + encargos + benefícios',true]
  ]);
  doc.setTextColor.apply(doc,rgb46('#071a2c'));doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('RETENÇÕES NO PAGAMENTO DOS COLABORADORES',12,y+1);
  doc.autoTable({
    startY:y+4,head:[['Obrigação','Base projetada','Alíquota efetiva','Valor projetado','Tratamento']],
    body:taxRowsPdf46(m.retained).concat(m.otherDiscounts>0?[['Outros descontos / benefícios','—','—',money46(m.otherDiscounts),'Demais descontos contidos na folha']]:[]),
    foot:[['TOTAL DE IMPOSTOS RETIDOS','','',money46(m.retainedTotal),'']],
    theme:'grid',styles:{font:'helvetica',fontSize:7,cellPadding:2,textColor:rgb46('#071a2c')},
    headStyles:{fillColor:rgb46('#0d2b42'),textColor:[255,255,255]},footStyles:{fillColor:rgb46('#eef4f8'),textColor:rgb46('#071a2c'),fontStyle:'bold'},
    columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'right',fontStyle:'bold'}}
  });
  y=doc.lastAutoTable.finalY+6;
  doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('ENCARGOS PAGOS / DEPOSITADOS PELA EMPRESA',12,y+1);
  doc.autoTable({
    startY:y+4,head:[['Encargo','Base projetada','Alíquota efetiva','Valor projetado','Tratamento']],
    body:taxRowsPdf46(m.company),foot:[['TOTAL DE ENCARGOS DA EMPRESA','','',money46(m.companyTotal),'']],
    theme:'grid',styles:{font:'helvetica',fontSize:7,cellPadding:2,textColor:rgb46('#071a2c')},
    headStyles:{fillColor:rgb46('#0d2b42'),textColor:[255,255,255]},footStyles:{fillColor:rgb46('#eef4f8'),textColor:rgb46('#071a2c'),fontStyle:'bold'},
    columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'right',fontStyle:'bold'}}
  });
  y=doc.lastAutoTable.finalY+5;
  if(y<190){
    doc.setFillColor.apply(doc,rgb46('#f5f8fa'));doc.roundedRect(12,y,273,14,3,3,'F');
    doc.setTextColor.apply(doc,rgb46('#071a2c'));doc.setFont('helvetica','bold');doc.setFontSize(7.5);
    doc.text('CONCILIAÇÃO',16,y+5);doc.setFont('helvetica','normal');
    doc.text('Líquido = '+money46(f.prov)+' − '+money46(f.disc)+' = '+money46(f.liq)+'   |   Custo empresa = '+money46(f.prov)+' + '+money46(m.companyTotal)+' + '+money46(f.ben)+' = '+money46(cost),16,y+10,{maxWidth:265})
  }

  doc.addPage('a4','landscape');
  pdfHead46(doc,'Próxima Folha — Composição por Colaborador','Projeção '+next+' · valores estimados a partir do quadro ativo e da última competência importada');
  doc.autoTable({
    startY:37,
    head:[['Colaborador','Departamento','Proventos','Descontos','Líquido','Encargos empresa','Benefícios','Custo']],
    body:f.rows.map(function(r){return[r.nome,r.departamento,money46(r.proventos),money46(r.descontos),money46(r.liquido),money46(r.encargos),money46(r.beneficios),money46(r.custo)]}),
    foot:[['TOTAL','',money46(f.prov),money46(f.disc),money46(f.liq),money46(f.enc),money46(f.ben),money46(f.custo)]],
    theme:'striped',styles:{font:'helvetica',fontSize:6.5,cellPadding:1.9,textColor:rgb46('#071a2c')},
    headStyles:{fillColor:rgb46('#0d2b42'),textColor:[255,255,255]},alternateRowStyles:{fillColor:[247,250,253]},
    footStyles:{fillColor:rgb46('#eef4f8'),textColor:rgb46('#071a2c'),fontStyle:'bold'},
    columnStyles:{2:{halign:'right'},3:{halign:'right'},4:{halign:'right',fontStyle:'bold'},5:{halign:'right'},6:{halign:'right'},7:{halign:'right',fontStyle:'bold'}},
    margin:{left:12,right:12,bottom:16}
  });

  doc.addPage('a4','landscape');
  pdfHead46(doc,'Próxima Folha — Memória e Premissas','Rastreabilidade da projeção gerencial');
  var factor=(m.factor*100).toFixed(2).replace('.',',')+'%';
  doc.autoTable({
    startY:38,head:[['Item','Referência / critério']],
    body:[
      ['Competência-base','Folha oficial '+ref],
      ['Competência projetada',next],
      ['Fator de projeção dos encargos',factor+' da competência-base, conforme relação entre proventos projetados e proventos da folha-base'],
      ['Impostos retidos','INSS dos segurados e IRRF são apresentados separadamente dos demais descontos.'],
      ['Encargos externos ao líquido','INSS patronal, RAT, Terceiros, PIS e FGTS são apresentados como custo/recolhimento da empresa.'],
      ['Benefícios','Mantidos conforme integração disponível no planejamento.'],
      ['Custo total','Proventos previstos + encargos da empresa + benefícios. Retenções do colaborador não são somadas novamente ao custo.'],
      ['Uso do relatório','Estimativa gerencial. Conferir folha oficial, eSocial/DCTFWeb, FGTS Digital, CCT e eventos variáveis antes de pagamento ou contabilização.']
    ],
    theme:'grid',styles:{font:'helvetica',fontSize:8.2,cellPadding:3,textColor:rgb46('#071a2c')},
    headStyles:{fillColor:rgb46('#0d2b42'),textColor:[255,255,255]},columnStyles:{0:{fontStyle:'bold',cellWidth:58}}
  });
  pdfFoot46(doc,ref);
  doc.save('LNB_Proxima_Folha_'+next.replace('/','-')+'_Executiva_Completa.pdf')
}
function interceptForecastPdf46(){
  document.addEventListener('click',function(e){
    var btn=e.target&&e.target.closest?e.target.closest('#rh42-plan-pdf'):null;
    if(!btn||activePlanKind46()!=='folha')return;
    e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    if(btn.dataset.rh46Busy==='1')return;btn.dataset.rh46Busy='1';var old=btn.textContent;btn.disabled=true;btn.textContent='Gerando PDF...';
    Promise.resolve().then(exportForecastPdf46).catch(function(err){warn46(err&&err.message?err.message:String(err))}).finally(function(){btn.disabled=false;btn.textContent=old;delete btn.dataset.rh46Busy})
  },true)
}

/* ───────────────────────── composição clicável ─────────────────────────────── */
function openComp46(title,kicker,headers,rows,footer,subtitle){
  if(typeof rhInterOpen==='function'){rhInterOpen(title,kicker,headers,rows,footer,subtitle);return}
  var html='<div class="rh-comp-table">'+rows.map(function(r){return '<div class="rh-comp-row">'+r.map(function(x){return '<div>'+esc46(x)+'</div>'}).join('')+'</div>'}).join('')+'</div>';
  if(typeof openGenericDetail==='function')openGenericDetail(title,kicker,html)
}
function peopleMetric46(kind,title){
  var rows=(S.pessoas||[]).slice().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR')});
  var key=kind==='prov'?'proventos':kind==='disc'?'descontos':'liquido',total=sum46(rows,key);
  openComp46(title,'COMPOSIÇÃO POR COLABORADOR',['Colaborador','Departamento','Valor'],rows.map(function(p){
    var dep;try{dep=departmentName(p.departamento)}catch(e){dep=p.departamento||'—'}
    return[p.nome||'—',dep,money46(p[key])]
  }),['TOTAL',rows.length+' pessoas',money46(total)])
}
function taxComp46(items,title,total){
  openComp46(title,'COMPOSIÇÃO DE IMPOSTOS / ENCARGOS',['Item','Base','Alíquota efetiva','Valor','Tratamento'],items.map(function(x){return[x.label,money46(x.base),pct46(x.rate),money46(x.value),x.nature]}),['TOTAL','','',money46(total),''])
}
function forecastMetric46(kind,title){
  var f=forecastTotals46(),m=chargeModel46(f),key=kind==='fprov'?'proventos':kind==='fdisc'?'descontos':kind==='fliq'?'liquido':kind==='fben'?'beneficios':kind==='fcost'?'custo':null;
  if(kind==='fret'){taxComp46(m.retained,title,m.retainedTotal);return}
  if(kind==='fcompany'){taxComp46(m.company,title,m.companyTotal);return}
  if(!key){taxComp46(m.retained.concat(m.company),title,m.taxGrandTotal);return}
  var total=sum46(f.rows,key);
  openComp46(title,'PRÓXIMA FOLHA · COMPOSIÇÃO',['Colaborador','Departamento','Valor'],f.rows.map(function(r){return[r.nome,r.departamento,money46(r[key])]}),['TOTAL',f.rows.length+' pessoas',money46(total)],'Projeção '+nextComp46())
}
function tableFallback46(card,label,value){
  var panel=card.closest('.rh-plan-pane,.panel,.page')||document,table=panel.querySelector('table');
  if(table&&table.tBodies&&table.tBodies[0]&&table.tBodies[0].rows.length){
    var headers=table.tHead&&table.tHead.rows.length?Array.from(table.tHead.rows[table.tHead.rows.length-1].cells).map(function(c){return String(c.textContent||'').trim()}):[];
    var rows=Array.from(table.tBodies[0].rows).slice(0,100).map(function(r){return Array.from(r.cells).map(function(c){return String(c.textContent||'').replace(/\s+/g,' ').trim()})});
    var footer=table.tFoot&&table.tFoot.rows.length?Array.from(table.tFoot.rows[0].cells).map(function(c){return String(c.textContent||'').replace(/\s+/g,' ').trim()}):null;
    openComp46(label||'Composição','COMPOSIÇÃO DO CARD',headers,rows,footer,'Valor exibido: '+value);return
  }
  openComp46(label||'Composição','DETALHAMENTO',['Indicador','Valor'],[[label||'Indicador',value||'—']],null,'Este card não possui tabela analítica adicional nesta tela.')
}
function openCard46(card){
  var label=String((card.querySelector('span')||card.querySelector('h3')||card.querySelector('b')||{}).textContent||'Composição').replace(/\s+/g,' ').trim();
  var value=String((card.querySelector('strong')||{}).textContent||'').replace(/\s+/g,' ').trim(),key=card.dataset.rh46Summary||'',page=card.closest('.page'),pid=page&&page.id||'',ln=norm46(label);
  if(pid==='page-folha'){
    var t=monthlyTotals46();
    if(key==='prov'||ln.indexOf('provento')>=0){peopleMetric46('prov',label);return}
    if(key==='disc'||ln.indexOf('desconto')>=0){peopleMetric46('disc',label);return}
    if(key==='liq'||ln.indexOf('liquido')>=0){peopleMetric46('liq',label);return}
    if(key==='ret'||ln.indexOf('retid')>=0){taxComp46(t.model.retained,label,t.model.retainedTotal);return}
    if(key==='company'||ln.indexOf('encargo')>=0){taxComp46(t.model.company,label,t.model.companyTotal);return}
    if(key==='tax'||ln.indexOf('tribut')>=0){taxComp46(t.model.retained.concat(t.model.company),label,t.model.taxGrandTotal);return}
  }
  if(pid==='page-planejamento'&&card.closest('[data-plan-pane="folha"]')){
    forecastMetric46(key||(/provento/.test(ln)?'fprov':/desconto/.test(ln)?'fdisc':/liquido/.test(ln)?'fliq':/beneficio/.test(ln)?'fben':/custo/.test(ln)?'fcost':/retid/.test(ln)?'fret':/encargo/.test(ln)?'fcompany':'ftax'),label);return
  }
  if(pid==='page-encargos'){
    var mt=monthlyTotals46();taxComp46(mt.model.retained.concat(mt.model.company),label,mt.model.taxGrandTotal);return
  }
  if(pid==='page-planejamento'&&card.closest('[data-plan-pane="rescisao"]')){
    var x=window.rhV34TerminationResult||window.rhV31TerminationResult;
    if(x){
      var rr=[
        ['Total bruto',money46(x.bruto)],['INSS mensal',money46(x.inss)],['INSS 13º',money46(x.inss13)],['IRRF mensal',money46(x.irrf)],['IRRF 13º',money46(x.irrf13)],
        ['FGTS novo',money46(x.fgNew||x.fgTotal)],['Multa FGTS',money46(x.multa)],['Encargos patronais',money46(x.patTotal)],['Líquido',money46(x.liq)],['Custo empregador',money46(x.custo)]
      ];
      openComp46(label,'RESCISÃO · MEMÓRIA DE CÁLCULO',['Item','Valor'],rr,['INDICADOR SELECIONADO',value]);return
    }
  }
  tableFallback46(card,label,value)
}
function makeClickable46(root){
  var scope=root&&root.querySelectorAll?root:document;
  var cards=[];
  if(root&&root.matches&&root.matches(CARD_SELECTOR))cards.push(root);
  cards=cards.concat(Array.prototype.slice.call(scope.querySelectorAll(CARD_SELECTOR)));
  cards.forEach(function(card){
    if(card.dataset.rh46Clickable==='1')return;
    /* preserva handlers especializados já instalados; o fallback entra só onde falta composição */
    if(card.classList.contains('rh-clickable-kpi'))return;
    if(card.tagName==='BUTTON'&&card.classList.contains('source-target'))return;
    card.dataset.rh46Clickable='1';card.classList.add('rh46-clickable-card');if(card.tagName!=='BUTTON'){card.setAttribute('role','button');card.setAttribute('tabindex','0')}
    card.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('button,a,input,select,textarea')&&e.target!==card)return;openCard46(card)});
    if(card.tagName!=='BUTTON')card.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openCard46(card)}})
  })
}
function bindTaxClicks46(){
  document.addEventListener('click',function(e){
    var row=e.target&&e.target.closest?e.target.closest('.rh46-tax-row'):null;if(!row)return;
    var wrap=row.closest('#rh46-forecast-summary'),f=wrap?forecastTotals46():null,m=wrap?chargeModel46(f):monthlyTotals46().model,all=m.retained.concat(m.company),x=all.find(function(q){return q.key===row.dataset.rh46Tax});
    if(!x)return;e.preventDefault();e.stopPropagation();taxComp46([x],x.label,x.value)
  },true)
}

/* ───────────────────────── Chat IA flutuante e redimensionável ─────────────── */
function aiState46(){try{return JSON.parse(localStorage.getItem(AI_KEY)||'null')||{}}catch(e){return{}}}
function saveAi46(){
  var p=E('ai-panel');if(!p||p.hidden)return;var r=p.getBoundingClientRect();
  try{localStorage.setItem(AI_KEY,JSON.stringify({left:r.left,top:r.top,width:r.width,height:r.height}))}catch(e){}
}
function clampAi46(){
  var p=E('ai-panel');if(!p||p.hidden||window.innerWidth<760)return;var r=p.getBoundingClientRect(),left=Math.max(8,Math.min(r.left,window.innerWidth-r.width-8)),top=Math.max(82,Math.min(r.top,window.innerHeight-r.height-8));
  p.style.left=left+'px';p.style.top=top+'px';p.style.right='auto';p.style.bottom='auto'
}
function restoreAi46(){
  var p=E('ai-panel');if(!p||window.innerWidth<760)return;var s=aiState46();
  if(s.width)p.style.width=Math.max(320,Math.min(n(s.width),window.innerWidth-16))+'px';
  if(s.height)p.style.height=Math.max(360,Math.min(n(s.height),window.innerHeight-90))+'px';
  if(isFinite(Number(s.left))&&isFinite(Number(s.top))){p.style.left=n(s.left)+'px';p.style.top=n(s.top)+'px';p.style.right='auto';p.style.bottom='auto'}
  setTimeout(clampAi46,0)
}
function resetAi46(){
  var p=E('ai-panel');if(!p)return;try{localStorage.removeItem(AI_KEY)}catch(e){}
  p.style.removeProperty('left');p.style.removeProperty('top');p.style.removeProperty('width');p.style.removeProperty('height');p.style.removeProperty('right');p.style.removeProperty('bottom')
}
function rhV46InstallFloatingAI(){
  var p=E('ai-panel'),head=p&&p.querySelector('.ai-head'),launch=E('ai-launch');if(!p||!head||head.dataset.rh46Drag==='1')return;
  head.dataset.rh46Drag='1';head.title='Arraste para mover · redimensione pelo canto · duplo clique restaura';
  head.addEventListener('pointerdown',function(e){
    if(window.innerWidth<760||e.button!==0||e.target.closest('button,input,a'))return;
    var r=p.getBoundingClientRect();p.style.left=r.left+'px';p.style.top=r.top+'px';p.style.width=r.width+'px';p.style.height=r.height+'px';p.style.right='auto';p.style.bottom='auto';
    V46.drag={dx:e.clientX-r.left,dy:e.clientY-r.top};head.classList.add('rh46-dragging');e.preventDefault()
  });
  document.addEventListener('pointermove',function(e){
    if(!V46.drag)return;var r=p.getBoundingClientRect(),left=e.clientX-V46.drag.dx,top=e.clientY-V46.drag.dy;
    left=Math.max(8,Math.min(left,window.innerWidth-r.width-8));top=Math.max(82,Math.min(top,window.innerHeight-r.height-8));
    p.style.left=left+'px';p.style.top=top+'px'
  });
  document.addEventListener('pointerup',function(){if(!V46.drag)return;V46.drag=null;head.classList.remove('rh46-dragging');saveAi46()});
  head.addEventListener('dblclick',function(e){if(e.target.closest('button'))return;resetAi46();setTimeout(restoreAi46,0)});
  if(launch)launch.addEventListener('click',function(){setTimeout(function(){restoreAi46();saveAi46()},80)});
  if(window.ResizeObserver){V46.aiResize=new ResizeObserver(function(){if(!V46.drag)saveAi46()});V46.aiResize.observe(p)}
  window.addEventListener('resize',function(){setTimeout(clampAi46,50)});
  restoreAi46()
}
window.rhV46InstallFloatingAI=rhV46InstallFloatingAI;

/* ───────────────────────── estilos e ciclo estável ─────────────────────────── */
function styles46(){
  if(E('_rh46'))return;var s=document.createElement('style');s.id='_rh46';
  s.textContent=
  '.rh46-card-value{display:block!important;width:100%!important;max-width:100%!important;font-size:clamp(14px,1.45vw,27px)!important;line-height:1.06!important;letter-spacing:-.025em!important;font-variant-numeric:tabular-nums!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;transition:none!important;animation:none!important}'+
  '.rh40-guide-card .rh46-card-value,.rh41-report-card .rh46-card-value{font-size:clamp(13px,1.15vw,22px)!important}'+
  '.rh46-clickable-card{cursor:pointer!important;transition:border-color .15s ease,box-shadow .15s ease!important}.rh46-clickable-card:hover{border-color:color-mix(in srgb,var(--gold) 55%,var(--line-soft))!important;box-shadow:0 10px 28px rgba(0,0,0,.14)!important}.rh46-clickable-card:focus-visible{outline:2px solid var(--gold)!important;outline-offset:3px!important}'+
  '.rh46-totalizer{margin:0 0 18px}.rh46-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 12px}.rh46-total-card{min-width:0;min-height:105px;padding:14px 15px;border:1px solid var(--line-soft);border-radius:14px;background:linear-gradient(145deg,var(--surface),color-mix(in srgb,var(--surface-2) 88%,var(--emerald) 12%));color:var(--text);text-align:left;cursor:pointer}.rh46-total-card.featured{border-color:var(--line);background:linear-gradient(145deg,rgba(232,185,60,.11),rgba(31,196,141,.10)),var(--surface)}.rh46-total-card span,.rh46-total-card small{display:block;color:var(--muted)}.rh46-total-card span{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.rh46-total-card strong{display:block;margin:7px 0 5px}.rh46-total-card small{font-size:10px;line-height:1.25}'+
  '.rh46-tax-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rh46-tax-panel{border:1px solid var(--line-soft);border-radius:14px;background:var(--surface);overflow:hidden}.rh46-tax-head{display:flex;justify-content:space-between;gap:10px;padding:11px 13px;background:var(--surface-2);border-bottom:1px solid var(--line-soft)}.rh46-tax-head b{font-size:10px;letter-spacing:.08em;color:var(--gold-2)}.rh46-tax-head span{font-size:9px;color:var(--muted)}.rh46-tax-list{display:grid}.rh46-tax-row{display:grid;grid-template-columns:minmax(150px,1.5fr) minmax(100px,.8fr) 78px minmax(105px,.8fr);gap:10px;align-items:center;width:100%;padding:10px 13px;border:0;border-bottom:1px solid var(--line-soft);background:transparent;color:var(--text);text-align:left;cursor:pointer}.rh46-tax-row:last-child{border-bottom:0}.rh46-tax-row:hover{background:color-mix(in srgb,var(--surface-2) 80%,var(--gold) 8%)}.rh46-tax-row>span:nth-child(n+2),.rh46-tax-row>strong{text-align:right;font-variant-numeric:tabular-nums}.rh46-tax-row span b,.rh46-tax-row span small{display:block}.rh46-tax-row span b{font-size:11px}.rh46-tax-row span small{font-size:9px;color:var(--muted);margin-top:2px}.rh46-tax-row>span:nth-child(n+2){font-size:10px;color:var(--muted)}.rh46-tax-row>strong{font-size:11px}'+
  '.rh46-reconcile{display:flex;flex-wrap:wrap;gap:7px 18px;align-items:center;margin-top:12px;padding:11px 13px;border:1px solid color-mix(in srgb,var(--gold) 35%,var(--line-soft));border-radius:12px;background:color-mix(in srgb,var(--gold) 6%,var(--surface));font-size:10px}.rh46-reconcile b{color:var(--gold-2)}.rh46-reconcile span{color:var(--muted)}.rh46-reconcile strong{color:var(--text)}'+
  '.rh46-table-total td{background:color-mix(in srgb,var(--surface-2) 82%,var(--gold) 8%)!important;border-top:2px solid var(--line)!important;font-weight:900!important}'+
  '.ai-panel.rh46-floating-ai{resize:both!important;min-width:320px!important;min-height:360px!important;max-width:calc(100vw - 16px)!important;max-height:calc(100vh - 82px)!important}.ai-panel.rh46-floating-ai .ai-head{cursor:move;user-select:none;touch-action:none}.ai-panel.rh46-floating-ai .ai-head.rh46-dragging{cursor:grabbing}'+
  '@media(max-width:1100px){.rh46-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rh46-tax-columns{grid-template-columns:1fr}}'+
  '@media(max-width:760px){.rh46-summary-grid{grid-template-columns:1fr 1fr}.rh46-tax-row{grid-template-columns:minmax(120px,1.3fr) minmax(90px,.8fr) 66px minmax(95px,.8fr);font-size:9px}.ai-panel.rh46-floating-ai{resize:none!important;min-width:0!important;min-height:0!important}}'+
  '@media(max-width:480px){.rh46-summary-grid{grid-template-columns:1fr}.rh46-tax-panel{overflow:auto}.rh46-tax-list{min-width:560px}}';
  document.head.appendChild(s)
}

function scheduleRefresh46(delay){
  clearTimeout(V46.refreshTimer);V46.refreshTimer=setTimeout(refresh46,delay==null?100:delay)
}
function refresh46(){
  styles46();stabilizeCards46(document);installPayrollTotalizer46();installForecastSummary46();makeClickable46(document);rhV46InstallFloatingAI()
}
function observe46(){
  if(V46.cardObserver)return;
  V46.cardObserver=new MutationObserver(function(ms){
    var needs=false;
    ms.forEach(function(m){
      if(m.type==='childList'){
        Array.prototype.forEach.call(m.addedNodes,function(node){if(node.nodeType===1){stabilizeCards46(node);makeClickable46(node)}});
        var t=m.target&&m.target.nodeType===1?m.target:null;
        if(t&&(t.id==='payroll-rows'||t.id==='rh-plan-folha-table'||t.closest&&t.closest('#payroll-rows,#rh-plan-folha-table,#rh-plan-folha-kpis')))needs=true
      }
    });
    if(needs)scheduleRefresh46(90)
  });
  V46.cardObserver.observe(document.body,{childList:true,subtree:true})
}
function init46(){
  styles46();interceptForecastPdf46();bindTaxClicks46();refresh46();observe46();
  [180,650,1400].forEach(function(ms){setTimeout(refresh46,ms)});
  document.addEventListener('click',function(e){
    if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab],.nav-item,#rh-plan-recalc,#rh26-calc'))scheduleRefresh46(140)
  },true);
  ['rh-period-year','rh-period-month','competencia-select'].forEach(function(id){var x=E(id);if(x)x.addEventListener('change',function(){scheduleRefresh46(180)})})
}

window.rhV46ExportForecastPdf=exportForecastPdf46;
window.rhV46Refresh=refresh46;
window.RH_STABILITY_V46=true;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init46);else init46();
})();