/* RH v45 — exportacao robusta da rescisao + layout responsivo sem cortes */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}
function rgb(hex){hex=String(hex||'').replace('#','');return[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]}
function allowed(){try{return !!(canAdmin()||can('exportar'))}catch(e){return false}}
function warn(msg){try{toast(msg,true)}catch(e){try{alert(msg)}catch(ignore){}}}
function note(msg){try{toast(msg,false)}catch(e){}}
function brDate(v){var d=v instanceof Date?v:new Date(String(v||'').slice(0,10)+'T12:00:00');if(!d||isNaN(d.getTime()))return '—';return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()}
function typeLabel(v){var s=String(v||'').toLowerCase();return s.indexOf('empregador')>=0||s.indexOf('dispens')>=0?'Dispensa sem justa causa':'Pedido de demissão'}
function adapt(x){
  if(!x)return null;
  if(x.v13Aviso==null)x.v13Aviso=n(x.av13);
  if(x.vfAviso==null)x.vfAviso=n(x.avfut);
  if(x.fgNew==null)x.fgNew=n(x.fgTotal)||n(x.fgm)+n(x.fg13)+n(x.fgav);
  if(x.patTotal==null)x.patTotal=n(x.patInss)+n(x.patRat)+n(x.patTerc)+n(x.patPis);
  if(x.noticeDays==null)x.noticeDays=n(x.nd)||30;
  if(x.feriasAdq==null)x.feriasAdq=n(x.ven);
  if(x.dobroExtra==null)x.dobroExtra=0;
  return x;
}
async function currentTermination(){
  var x=adapt(window.rhV34TerminationResult||window.rhV31TerminationResult);
  if(x&&x.p)return x;
  if(typeof window.rhV34CalcTermination==='function'){
    x=adapt(await window.rhV34CalcTermination());
    if(x&&x.p){window.rhV34TerminationResult=x;window.rhV31TerminationResult=x;return x}
  }
  if(typeof window.rhV34RenderTermination==='function'){
    await window.rhV34RenderTermination();
    x=adapt(window.rhV34TerminationResult||window.rhV31TerminationResult);
    if(x&&x.p){window.rhV31TerminationResult=x;return x}
  }
  throw new Error('Calcule a rescisão antes de gerar o PDF.');
}
async function ensurePdf(){
  if(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)return;
  if(!LIBRARIES.jspdf)LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};
  if(!LIBRARIES.autotable)LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)}};
  await loadLibrary('jspdf');await loadLibrary('autotable');
  if(!window.jspdf||!window.jspdf.jsPDF||!window.jspdf.jsPDF.API.autoTable)throw new Error('O gerador de PDF não pôde ser carregado.');
}
function header(doc,title,sub){var w=doc.internal.pageSize.getWidth();doc.setFillColor.apply(doc,rgb('#071a2c'));doc.rect(0,0,w,31,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,12,13);doc.setFont('helvetica','normal');doc.setFontSize(8.4);doc.text(sub||'',12,20,{maxWidth:w-24});doc.setTextColor.apply(doc,rgb('#f2c94c'));doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('LIGA NACIONAL DE BASQUETE · RH & FOLHA',12,26)}
function footer(doc,name){var pages=doc.internal.getNumberOfPages();for(var i=1;i<=pages;i++){doc.setPage(i);var w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();doc.setTextColor.apply(doc,rgb('#788b9d'));doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text('Uso restrito — RH & Folha | '+String(name||'Colaborador'),12,h-7,{maxWidth:w-55});doc.text('Página '+i+' de '+pages,w-12,h-7,{align:'right'})}}
function rows(items){return items.filter(function(x){return Math.abs(n(x[1]))>.004}).map(function(x){return[String(x[0]),money(x[1])]})}
function section(doc,y,title,data,total,minus){if(!data.length)return y;var w=doc.internal.pageSize.getWidth();if(y>238){doc.addPage();header(doc,'Rescisão — Relatório Executivo','Continuação');y=38}doc.setFillColor.apply(doc,rgb('#0d2b42'));doc.rect(12,y,w-24,8,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(title,14,y+5.5);doc.autoTable({startY:y+8,body:data,theme:'striped',styles:{font:'helvetica',fontSize:8.2,cellPadding:[2,3,2,3],textColor:rgb('#071a2c')},alternateRowStyles:{fillColor:[247,250,253]},columnStyles:{1:{halign:'right',fontStyle:'bold'}},margin:{left:12,right:12,bottom:18}});var fy=doc.lastAutoTable.finalY;doc.setFillColor.apply(doc,rgb('#eef4f8'));doc.rect(12,fy,w-24,9,'F');doc.setTextColor.apply(doc,rgb('#071a2c'));doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(minus?'(−) Total de descontos':'Subtotal',14,fy+6);doc.text(money(total),w-12,fy+6,{align:'right'});return fy+15}
async function exportTerminationPdfV45(){
  if(!allowed())throw new Error('Seu perfil não possui permissão para exportar relatórios.');
  var x=await currentTermination();await ensurePdf();
  var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),w=doc.internal.pageSize.getWidth(),name=String(x.p&&x.p.nome||'Colaborador'),dt=brDate(x.date),kind=typeLabel(x.type),y=38;
  header(doc,'Rescisão — Relatório Executivo',name+' | '+kind+' | Desligamento '+dt);
  var gap=4,cardW=(w-24-gap*3)/4;
  [['Total bruto',x.bruto],['Deduções',x.ded],['Líquido',x.liq],['Custo empregador',x.custo]].forEach(function(it,i){var xx=12+i*(cardW+gap);doc.setFillColor.apply(doc,rgb(i===2?'#0d2b42':'#eef4f8'));doc.roundedRect(xx,y,cardW,24,3,3,'F');doc.setTextColor.apply(doc,rgb(i===2?'#ffffff':'#6b7d90'));doc.setFont('helvetica','bold');doc.setFontSize(6.4);doc.text(String(it[0]).toUpperCase(),xx+3.5,y+7,{maxWidth:cardW-7});doc.setTextColor.apply(doc,rgb(i===2?'#f2c94c':'#071a2c'));doc.setFontSize(9.8);doc.text(money(it[1]),xx+3.5,y+17,{maxWidth:cardW-7})});y+=31;
  var proventos=rows([['Saldo de salário '+n(x.days)+' dias',x.saldo],['13º proporcional '+n(x.a13)+'/12',x.v13],['13º sobre projeção do aviso',x.v13Aviso],['Férias proporcionais '+n(x.avf)+'/12',x.vf],['Férias sobre projeção do aviso',x.vfAviso],['Períodos adquiridos e não gozados',x.feriasAdq],['1/3 constitucional',x.ter],['Adicional por férias fora do prazo',x.dobroExtra],['Aviso-prévio indenizado '+n(x.noticeDays)+' dias',x.aviso],['Indenização CCT / outra verba',x.cct],['Outros créditos',x.cred]]);
  var descontos=rows([['INSS mensal',x.inss],['INSS 13º',x.inss13],['IRRF mensal',x.irrf],['IRRF 13º',x.irrf13],['Descontos operacionais / benefícios',x.operational],['Aviso descontado',x.noticeDisc],['Outros descontos',x.od]]);
  var encargos=rows([['FGTS do mês',x.fgm],['FGTS 13º',x.fg13],['FGTS aviso',x.fgav],['Multa FGTS',x.multa],['INSS patronal',x.patInss],['RAT',x.patRat],['Terceiros',x.patTerc],['PIS folha',x.patPis]]);
  y=section(doc,y,'PROVENTOS',proventos,n(x.bruto),false);y=section(doc,y,'DESCONTOS',descontos,n(x.ded),true);y=section(doc,y,'FGTS E ENCARGOS DO EMPREGADOR',encargos,n(x.fgNew)+n(x.multa)+n(x.patTotal),false);
  if(y>236){doc.addPage();header(doc,'Rescisão — Relatório Executivo','Fechamento');y=38}doc.setFillColor.apply(doc,rgb('#071a2c'));doc.roundedRect(12,y,w-24,19,3,3,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('LÍQUIDO ESTIMADO A PAGAR',16,y+7);doc.setTextColor.apply(doc,rgb('#f2c94c'));doc.setFontSize(13);doc.text(money(x.liq),w-16,y+8,{align:'right'});doc.setTextColor(255,255,255);doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text('Custo total estimado para o empregador: '+money(x.custo),16,y+14);y+=25;doc.setTextColor.apply(doc,rgb('#788b9d'));doc.setFontSize(7.2);doc.text(x.hist?'Impostos e descontos calibrados com o histórico importado disponível.':'Estimativa gerencial. Validar FGTS Digital, CCT, médias, estabilidade, benefícios e incidências antes do pagamento oficial.',12,y,{maxWidth:w-24});footer(doc,name);
  var slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'');doc.save('LNB_Rescisao_'+slug+'_'+dt.replace(/\//g,'-')+'.pdf');return true;
}
window.rhV45ExportTerminationPdf=exportTerminationPdfV45;window.rhV43ExportTerminationPdf=exportTerminationPdfV45;window.rhV41ExportTerminationPdf=exportTerminationPdfV45;
function runPdfButton(btn){if(!btn||btn.dataset.rh45Busy==='1')return;btn.dataset.rh45Busy='1';var old=btn.textContent;btn.disabled=true;btn.textContent='Gerando PDF...';Promise.resolve().then(exportTerminationPdfV45).then(function(){note('PDF da rescisão gerado com sucesso.')}).catch(function(e){warn(e&&e.message?e.message:String(e))}).finally(function(){btn.disabled=false;btn.textContent=old;delete btn.dataset.rh45Busy})}
function activeTermination(){var pane=document.querySelector('[data-plan-pane="rescisao"]');return !!(pane&&!pane.hidden&&getComputedStyle(pane).display!=='none')}
function ensureResultButton(){var box=E('rh26-result');if(!box||!box.querySelector('.rh26-kpis'))return;var head=box.querySelector('.panel-head');if(!head||head.querySelector('.rh45-result-pdf'))return;var b=document.createElement('button');b.type='button';b.className='button primary export-only rh45-result-pdf';b.textContent='Gerar PDF';b.hidden=!allowed();head.appendChild(b)}
function interceptReportButtons(){document.addEventListener('click',function(e){if(!e.target||!e.target.closest)return;var btn=e.target.closest('#rh41-res-pdf,#rh41-inline-res-pdf,.rh45-result-pdf');if(!btn){var generic=e.target.closest('#rh42-plan-pdf');if(generic&&activeTermination())btn=generic}if(!btn)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();runPdfButton(btn)},true)}
var CARD_VALUES='.kpi strong,.rh40-guide-card strong,.rh41-report-card strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#charges-kpis strong,#payroll-kpis strong,#movement-kpis strong,#custo-real-kpis strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#page-planejamento .rh26-memory b,#page-planejamento .rh-res-lines b,#page-planejamento .rh42-term-formula strong';
var fitTimer=0;
function textWidth(el){var r=document.createRange();try{r.selectNodeContents(el);return r.getBoundingClientRect().width}catch(e){return el.scrollWidth||0}}
function fitValue(el){if(!el||!el.isConnected||!String(el.textContent||'').trim())return;var box=el.closest('.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card,.rh26-memory>div,.rh-res-lines>div')||el.parentElement;if(!box)return;var bw=box.clientWidth;if(!bw)return;var cs=getComputedStyle(box),av=bw-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0)-8;if(av<36)return;var max=el.closest('.kpi')?30:el.closest('.rh26-memory')?18:24,min=10,size=max;el.style.setProperty('display','block','important');el.style.setProperty('max-width','100%','important');el.style.setProperty('overflow','visible','important');el.style.setProperty('text-overflow','clip','important');el.style.setProperty('white-space','nowrap','important');el.style.setProperty('font-size',size+'px','important');for(var i=0;i<12;i++){var tw=textWidth(el);if(tw<=av||size<=min)break;size=Math.max(min,Math.floor(size*(av/tw)*.97*10)/10);el.style.setProperty('font-size',size+'px','important')}if(textWidth(el)>av+1){el.style.setProperty('white-space','normal','important');el.style.setProperty('overflow-wrap','normal','important');el.style.setProperty('word-break','keep-all','important');el.style.setProperty('line-height','1.08','important')}else el.style.setProperty('line-height','1.02','important');el.style.setProperty('letter-spacing',size<16?'-.04em':'-.02em','important')}
function fitAll(){Array.prototype.forEach.call(document.querySelectorAll(CARD_VALUES),fitValue);ensureResultButton()}
function scheduleFit(d){clearTimeout(fitTimer);fitTimer=setTimeout(function(){requestAnimationFrame(fitAll)},d==null?60:d)}
window.rhFitAllCardValues=fitAll;window.rhV42FitCards=fitAll;window.rhV43FitAll=fitAll;window.rhV45FitAll=fitAll;
function styles(){if(E('_rh45'))return;var s=document.createElement('style');s.id='_rh45';s.textContent='[data-plan-pane="rescisao"] #rh26-result .rh26-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}[data-plan-pane="rescisao"] #rh26-result .rh26-kpis .kpi{min-height:112px!important;overflow:visible!important;padding:18px!important}[data-plan-pane="rescisao"] #rh26-result .rh26-kpis .kpi strong{white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important}[data-plan-pane="rescisao"] #rh26-result .panel-head{align-items:flex-start!important;flex-wrap:wrap!important}[data-plan-pane="rescisao"] #rh26-result .rh45-result-pdf{margin-left:auto;flex:0 0 auto}[data-plan-pane="rescisao"] #rh26-result .rh26-memory>div{min-width:0!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:start!important;gap:12px!important}[data-plan-pane="rescisao"] #rh26-result .rh26-memory span{min-width:0!important;overflow-wrap:anywhere}[data-plan-pane="rescisao"] #rh26-result .rh26-memory b{min-width:0!important;text-align:right!important;white-space:nowrap!important}.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card{min-width:0!important;height:auto!important}.kpi strong,.rh26-memory b,.rh-res-lines b{font-variant-numeric:tabular-nums!important}@media(max-width:820px){[data-plan-pane="rescisao"] #rh26-result .rh26-kpis{grid-template-columns:1fr!important}[data-plan-pane="rescisao"] #rh26-result .rh26-memory{grid-template-columns:1fr!important}}@media(min-width:1100px){body.rh45-planning-active .ai-launch{top:14px!important;right:360px!important;bottom:auto!important;width:48px!important;height:48px!important;border-radius:15px!important;z-index:85!important}}';document.head.appendChild(s)}
function syncPlanningClass(){var p=E('page-planejamento');document.body.classList.toggle('rh45-planning-active',!!(p&&p.classList.contains('active')))}
function init(){styles();interceptReportButtons();syncPlanningClass();[80,280,650,1200].forEach(function(ms){setTimeout(fitAll,ms)});window.addEventListener('resize',function(){scheduleFit(80)});document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab],[data-go],.nav-item,#rh26-calc')){setTimeout(syncPlanningClass,30);setTimeout(fitAll,100);setTimeout(fitAll,320)}},true);var mo=new MutationObserver(function(){ensureResultButton();scheduleFit(70)});var root=E('page-planejamento')||document.body;mo.observe(root,{childList:true,subtree:true})}
window.RH_CORRECOES_V45=true;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
