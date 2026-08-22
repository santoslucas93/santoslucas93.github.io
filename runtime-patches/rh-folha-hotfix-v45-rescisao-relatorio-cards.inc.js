/* RH v45 — corrige exportação da rescisão e garante valores completos nos cards */
(function(){
'use strict';

function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}
function rgb(hex){hex=String(hex||'').replace('#','');return[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]}
function allowed(){try{return !!(canAdmin()||can('exportar'))}catch(e){return false}}
function warn(msg){try{toast(msg,true)}catch(e){try{alert(msg)}catch(ignore){}}}

/* ── PDF de rescisão ───────────────────────────────────────────────────────────────
   v43 verificava window.LIBRARIES, mas LIBRARIES vive no escopo do app.js, e ainda
   tentava executar n(x.type).indexOf(...), o que lança TypeError. O v45 usa a mesma
   infraestrutura do módulo diretamente e não depende desses dois pontos frágeis. */
async function ensurePdf(){
  if(!LIBRARIES.jspdf)LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};
  if(!LIBRARIES.autotable)LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)}};
  await loadLibrary('jspdf');
  await loadLibrary('autotable');
  if(!window.jspdf||!window.jspdf.jsPDF)throw new Error('Biblioteca de PDF não carregou. Tente novamente.');
}
function brDate(v){
  var d=v instanceof Date?v:new Date(String(v||'').slice(0,10)+'T12:00:00');
  if(!d||isNaN(d.getTime()))return '—';
  return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
}
function typeLabel(v){
  var s=String(v||'').toLowerCase();
  return s.indexOf('empregador')>=0||s.indexOf('dispens')>=0?'Dispensa sem justa causa':'Pedido de demissão';
}
async function currentTermination(){
  var x=window.rhV31TerminationResult;
  if(x&&x.p)return x;
  /* Se o relatório visual está aberto mas o estado foi perdido por um re-render,
     refaz o cálculo com os campos atuais antes de desistir. */
  var pane=document.querySelector('[data-plan-pane="rescisao"]');
  var hasForm=!!(pane&&E('rh26-person')&&E('rh26-date'));
  if(hasForm&&typeof window.rhV34RenderTermination==='function'){
    await window.rhV34RenderTermination();
    x=window.rhV31TerminationResult;
  }
  if(!x||!x.p)throw new Error('Calcule a rescisão antes de gerar o relatório.');
  return x;
}
function header(doc,title,sub){
  var w=doc.internal.pageSize.getWidth();
  doc.setFillColor.apply(doc,rgb('#071a2c'));doc.rect(0,0,w,31,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,12,13);
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text(sub||'',12,20,{maxWidth:w-24});
  doc.setTextColor.apply(doc,rgb('#f2c94c'));doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('LIGA NACIONAL DE BASQUETE · RH & FOLHA',12,26);
}
function footer(doc,name){
  var pages=doc.internal.getNumberOfPages();
  for(var i=1;i<=pages;i++){
    doc.setPage(i);var w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
    doc.setTextColor.apply(doc,rgb('#788b9d'));doc.setFont('helvetica','normal');doc.setFontSize(7);
    doc.text('Uso restrito — RH & Folha | '+String(name||'Colaborador'),12,h-7,{maxWidth:w-55});
    doc.text('Página '+i+' de '+pages,w-12,h-7,{align:'right'});
  }
}
function rows(items){return items.filter(function(x){return Math.abs(n(x[1]))>.004}).map(function(x){return[String(x[0]),money(x[1])]})}
function section(doc,y,title,data,total,minus){
  if(!data.length)return y;
  var w=doc.internal.pageSize.getWidth();
  if(y>245){doc.addPage();header(doc,'Rescisão — Relatório Executivo','Continuação');y=38}
  doc.setFillColor.apply(doc,rgb('#0d2b42'));doc.rect(12,y,w-24,8,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(title,14,y+5.5);
  doc.autoTable({startY:y+8,body:data,theme:'striped',styles:{font:'helvetica',fontSize:8.2,cellPadding:[2,3,2,3],textColor:rgb('#071a2c')},alternateRowStyles:{fillColor:[247,250,253]},columnStyles:{1:{halign:'right',fontStyle:'bold'}},margin:{left:12,right:12,bottom:18}});
  var fy=doc.lastAutoTable.finalY;
  doc.setFillColor.apply(doc,rgb('#eef4f8'));doc.rect(12,fy,w-24,9,'F');
  doc.setTextColor.apply(doc,rgb('#071a2c'));doc.setFont('helvetica','bold');doc.setFontSize(8.5);
  doc.text(minus?'(−) Total de descontos':'Subtotal',14,fy+6);doc.text(money(total),w-12,fy+6,{align:'right'});
  return fy+15;
}
async function exportTerminationPdfV45(){
  if(!allowed()){warn('Seu perfil não possui permissão para exportar relatórios.');return}
  var x=await currentTermination();
  await ensurePdf();
  var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  var name=String(x.p&&x.p.nome||'Colaborador'),dt=brDate(x.date),kind=typeLabel(x.type);
  header(doc,'Rescisão — Relatório Executivo',name+' | '+kind+' | Desligamento '+dt);

  var w=doc.internal.pageSize.getWidth(),gap=4,cardW=(w-24-gap*3)/4,y=38;
  [['Total bruto',x.bruto],['Deduções',x.ded],['Líquido',x.liq],['Custo empregador',x.custo]].forEach(function(it,i){
    var xx=12+i*(cardW+gap);doc.setFillColor.apply(doc,rgb(i===2?'#0d2b42':'#eef4f8'));doc.roundedRect(xx,y,cardW,24,3,3,'F');
    doc.setTextColor.apply(doc,rgb(i===2?'#ffffff':'#6b7d90'));doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.text(String(it[0]).toUpperCase(),xx+3.5,y+7,{maxWidth:cardW-7});
    doc.setTextColor.apply(doc,rgb(i===2?'#f2c94c':'#071a2c'));doc.setFontSize(10.2);doc.text(money(it[1]),xx+3.5,y+17,{maxWidth:cardW-7});
  });
  y+=31;

  var proventos=rows([
    ['Saldo de salário',x.saldo],['13º proporcional '+n(x.a13)+'/12',x.v13],['Férias proporcionais '+n(x.avf)+'/12',x.vf],['Férias vencidas',x.ven],['1/3 constitucional',x.ter],['Aviso-prévio indenizado '+n(x.noticeDays||x.nd)+' dias',x.aviso],['13º sobre aviso',x.av13],['Férias sobre aviso',x.avfut],['Indenização CCT',x.cct],['Outros créditos',x.cred]
  ]);
  var descontos=rows([
    ['INSS sobre rescisão',x.inss],['INSS sobre 13º',x.inss13],['IRRF sobre rescisão',x.irrf],['IRRF sobre 13º',x.irrf13],['Descontos operacionais / benefícios',x.operational],['Aviso descontado',x.noticeDisc],['Outros descontos',x.od]
  ]);
  var encargos=rows([
    ['FGTS mensal',x.fgm],['FGTS sobre 13º',x.fg13],['FGTS sobre aviso',x.fgav],['Multa de FGTS',x.multa]
  ]);
  y=section(doc,y,'PROVENTOS',proventos,n(x.bruto),false);
  y=section(doc,y,'DESCONTOS',descontos,n(x.ded),true);
  y=section(doc,y,'FGTS E ENCARGOS DA RESCISÃO',encargos,n(x.fgTotal)+n(x.multa),false);

  if(y>238){doc.addPage();header(doc,'Rescisão — Relatório Executivo','Fechamento');y=38}
  doc.setFillColor.apply(doc,rgb('#071a2c'));doc.roundedRect(12,y,w-24,18,3,3,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('LÍQUIDO ESTIMADO A PAGAR',16,y+7);
  doc.setTextColor.apply(doc,rgb('#f2c94c'));doc.setFontSize(13);doc.text(money(x.liq),w-16,y+8,{align:'right'});
  doc.setTextColor(255,255,255);doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text('Custo total estimado para o empregador: '+money(x.custo),16,y+13);
  y+=24;
  doc.setTextColor.apply(doc,rgb('#788b9d'));doc.setFontSize(7.2);doc.text(x.hist?'Impostos e descontos calibrados com o histórico importado disponível.':'Estimativa gerencial. Validar incidências, médias, CCT, estabilidade, benefícios e cálculo oficial antes do pagamento.',12,y,{maxWidth:w-24});
  footer(doc,name);
  var slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  doc.save('LNB_Rescisao_'+slug+'_'+dt.replace(/\//g,'-')+'.pdf');
}

/* Todos os pontos novos consultam este exportador em tempo de clique. */
window.rhV45ExportTerminationPdf=exportTerminationPdfV45;
window.rhV43ExportTerminationPdf=exportTerminationPdfV45;
window.rhV41ExportTerminationPdf=exportTerminationPdfV45;

function runPdfButton(btn){
  if(!btn||btn.dataset.rh45Busy==='1')return;
  btn.dataset.rh45Busy='1';var old=btn.textContent;btn.disabled=true;btn.textContent='Gerando...';
  Promise.resolve().then(exportTerminationPdfV45).catch(function(e){warn(e&&e.message?e.message:String(e))}).finally(function(){btn.disabled=false;btn.textContent=old;delete btn.dataset.rh45Busy});
}
function interceptReportButtons(){
  document.addEventListener('click',function(e){
    var btn=e.target&&e.target.closest?e.target.closest('#rh41-res-pdf,#rh41-inline-res-pdf'):null;
    if(!btn)return;
    e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();runPdfButton(btn);
  },true);
}

/* ── Card fit sem corte ─────────────────────────────────────────────────────────────
   Patches anteriores usavam overflow:hidden + ellipsis. Aqui o valor reduz até caber;
   se a largura ainda for insuficiente, ele quebra em duas linhas e o card cresce. */
var CARD_VALUES='.kpi strong,.rh40-guide-card strong,.rh41-report-card strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#charges-kpis strong,#payroll-kpis strong,#movement-kpis strong,#custo-real-kpis strong,#rh-dossier-kpis strong,#rh-insight-kpis strong';
var fitTimer=0;
function textWidth(el){var r=document.createRange();try{r.selectNodeContents(el);return r.getBoundingClientRect().width}catch(e){return el.scrollWidth||0}}
function fitValue(el){
  if(!el||!el.isConnected||!String(el.textContent||'').trim())return;
  var box=el.closest('.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card')||el.parentElement;if(!box)return;
  var bw=box.clientWidth;if(!bw)return;var cs=getComputedStyle(box),av=bw-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0)-8;if(av<36)return;
  var max=el.closest('.rh40-guide-card')?24:el.closest('.rh41-report-card')?26:36,min=8,size=max;
  box.style.setProperty('overflow','visible','important');box.style.setProperty('min-width','0','important');
  el.style.setProperty('display','block','important');el.style.setProperty('width','100%','important');el.style.setProperty('max-width','100%','important');
  el.style.setProperty('overflow','visible','important');el.style.setProperty('text-overflow','clip','important');el.style.setProperty('white-space','nowrap','important');el.style.setProperty('height','auto','important');
  el.style.setProperty('font-size',size+'px','important');
  for(var i=0;i<14;i++){
    var w=textWidth(el);if(w<=av||size<=min)break;
    size=Math.max(min,Math.floor(size*(av/w)*.97*10)/10);el.style.setProperty('font-size',size+'px','important');
  }
  var finalWidth=textWidth(el);
  if(finalWidth>av+1){
    /* normalmente quebra somente entre “R$” e o número, preservando o valor inteiro */
    el.style.setProperty('white-space','normal','important');el.style.setProperty('overflow-wrap','anywhere','important');el.style.setProperty('line-height','1.08','important');el.style.setProperty('font-size',Math.max(10,size)+'px','important');
  }else{
    el.style.setProperty('overflow-wrap','normal','important');el.style.setProperty('line-height','1.02','important');
  }
  el.style.setProperty('letter-spacing',size<16?'-.055em':size<22?'-.035em':'-.015em','important');
}
function fitAll(){Array.prototype.forEach.call(document.querySelectorAll(CARD_VALUES),fitValue)}
function scheduleFit(delay){clearTimeout(fitTimer);fitTimer=setTimeout(function(){requestAnimationFrame(fitAll)},delay==null?60:delay)}
window.rhFitAllCardValues=fitAll;window.rhV42FitCards=fitAll;window.rhV43FitAll=fitAll;window.rhV45FitAll=fitAll;

function styles(){
  if(E('_rh45'))return;
  var s=document.createElement('style');s.id='_rh45';
  s.textContent='.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card{min-width:0!important;height:auto!important}.kpi strong,.rh40-guide-card strong,.rh41-report-card strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#charges-kpis strong,#payroll-kpis strong,#movement-kpis strong,#custo-real-kpis strong,#rh-dossier-kpis strong,#rh-insight-kpis strong{min-width:0!important;max-width:100%!important;height:auto!important;font-variant-numeric:tabular-nums!important}';
  document.head.appendChild(s);
}
function init(){
  styles();interceptReportButtons();
  [90,320,720,1320].forEach(function(ms){setTimeout(fitAll,ms)});
  window.addEventListener('resize',function(){scheduleFit(90)});
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab],[data-go],.nav-item,#rh26-calc')){setTimeout(fitAll,120);setTimeout(fitAll,360)}},true);
  if(window.ResizeObserver){var ro=new ResizeObserver(function(){scheduleFit(80)});document.querySelectorAll('.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.summary-card,.stat-card').forEach(function(x){try{ro.observe(x)}catch(e){}})}
}
window.RH_CORRECOES_V45=true;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
