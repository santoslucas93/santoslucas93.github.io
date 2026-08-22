/* RH v42 — ajustes de cards, rescisão, próxima folha e guias */
(function(){
'use strict';
var V={timer:0,resize:null,mode:'mes'};
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function comp(v){try{return formatCompetence(v)}catch(e){var p=String(v||'').slice(0,7).split('-');return p.length===2?p[1]+'/'+p[0]:'—'}}
function parseMoney(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function allowed(){try{return !!(canAdmin()||can('exportar'))}catch(e){return false}}
function guard(){if(allowed())return true;try{toast('Seu perfil não possui permissão para exportar relatórios.',true)}catch(e){}return false}

/* card fit: mede o texto real e reduz somente o necessário */
var FIT='.kpi strong,.rh40-guide-card strong,.rh41-report-card strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#charges-kpis strong,#payroll-kpis strong,#movement-kpis strong,#custo-real-kpis strong,#rh-dossier-kpis strong,#rh-insight-kpis strong';
function fitOne(el){
  if(!el||!el.isConnected||!String(el.textContent||'').trim())return;
  var box=el.closest('.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card')||el.parentElement;if(!box)return;
  var bcs=getComputedStyle(box),av=box.clientWidth-(parseFloat(bcs.paddingLeft)||0)-(parseFloat(bcs.paddingRight)||0)-8;if(av<40)return;
  var max=el.closest('.rh40-guide-card')?24:el.closest('.rh41-report-card')?26:36,min=10,size=max;
  el.style.setProperty('font-size',size+'px','important');el.style.setProperty('white-space','nowrap','important');el.style.setProperty('max-width','100%','important');el.style.setProperty('display','block','important');el.style.setProperty('overflow','hidden','important');
  for(var i=0;i<8;i++){var r=document.createRange();try{r.selectNodeContents(el)}catch(e){break}var w=r.getBoundingClientRect().width;if(w<=av||size<=min)break;size=Math.max(min,Math.floor((size*(av/w)*.96)*10)/10);el.style.setProperty('font-size',size+'px','important')}
  el.style.setProperty('letter-spacing',size<18?'-.05em':size<24?'-.035em':'-.015em','important');
}
function fitAll(){Array.prototype.forEach.call(document.querySelectorAll(FIT),fitOne)}
function scheduleFit(d){clearTimeout(V.timer);V.timer=setTimeout(function(){requestAnimationFrame(fitAll)},d==null?35:d)}
window.rhFitAllCardValues=fitAll;window.rhV42FitCards=fitAll;

function monthlyComp(){
  var a=(window.RH_PERIOD&&RH_PERIOD.active)||[];
  if(a.length===1&&!a[0]._periodConsolidated)return a[0];
  if(S.competencia&&!S.competencia._periodConsolidated)return S.competencia;
  return null;
}
function encRowsFrom(c){var e=c&&c.encargos||{};return[
  {key:'IRRF',label:'IRRF folha',base:n(e.base_irrf_mensal||c&&c.base_irrf),value:n(e.valor_irrf_folha||e.valor_irrf_mensal||e.valor_total_irrf||e.valor_irrf)},
  {key:'INSS',label:'INSS total',base:n(e.base_total_inss||c&&c.base_inss),value:n(e.total_inss)},
  {key:'PIS',label:'PIS sobre folha',base:n(e.base_pis||c&&c.base_inss),value:n(e.valor_pis)},
  {key:'FGTS',label:'FGTS',base:n(e.base_fgts||c&&c.base_fgts),value:n(e.valor_fgts||c&&c.valor_fgts)}
]}
function forecastPane(){return document.querySelector('[data-plan-pane="folha"]')}
function forecastTotals(){
  var pane=forecastPane(),table=pane&&pane.querySelector('table'),rows=table?Array.from(table.querySelectorAll('tbody tr')):[],sum={prov:0,disc:0,liq:0,enc:0,ben:0,custo:0};
  rows.forEach(function(tr){var c=tr.cells||[];if(c.length>=8){sum.prov+=parseMoney(c[2].textContent);sum.disc+=parseMoney(c[3].textContent);sum.liq+=parseMoney(c[4].textContent);sum.enc+=parseMoney(c[5].textContent);sum.ben+=parseMoney(c[6].textContent);sum.custo+=parseMoney(c[7].textContent)}});return sum;
}
function latestActual(){var a=(window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(S.competencias||[])).filter(function(c){return c&&!c._periodConsolidated&&String(c.competencia||'').slice(5,7)!=='00'}).slice().sort(function(x,y){return String(x.competencia||'').localeCompare(String(y.competencia||''))});return a[a.length-1]||monthlyComp()}
function nextGuideRows(){
  var base=latestActual(),f=forecastTotals(),real=encRowsFrom(base),factor=base&&n(base.proventos)>0?f.prov/n(base.proventos):1;
  return real.map(function(r){return{key:r.key,label:r.label,base:r.base*factor,value:r.value*factor,estimated:true}})
}
function guideRows(){return V.mode==='proxima'?nextGuideRows():encRowsFrom(monthlyComp())}
function guideLabel(){if(V.mode==='proxima')return 'Próxima folha · estimativa';var c=monthlyComp();return c?'Competência '+comp(c.competencia):'Selecione um único mês'}
function guideCards(){
  if(V.mode==='mes'&&!monthlyComp())return '<div class="rh42-guide-empty">Selecione um único mês no filtro global para visualizar e gerar as guias daquela competência.</div>';
  return guideRows().map(function(r){return '<div class="rh40-guide-card"><span>'+esc(r.label)+'</span><strong>'+esc(money(r.value))+'</strong><small>Base '+esc(money(r.base))+(r.estimated?' · estimativa':'')+'</small><button type="button" class="button ghost export-only" data-rh42-guide="'+r.key+'">Gerar PDF</button></div>'}).join('')
}
async function ensurePdf(){if(!LIBRARIES.jspdf)LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};if(!LIBRARIES.autotable)LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)}};await loadLibrary('jspdf');await loadLibrary('autotable')}
async function ensureExcel(){if(!LIBRARIES.exceljs)LIBRARIES.exceljs={url:'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',ready:function(){return !!window.ExcelJS}};await loadLibrary('exceljs')}
function dl(blob,name){var a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},1000)}
function rgb(hex){hex=String(hex).replace('#','');return[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]}
function pdfHead(doc,title,sub){var w=doc.internal.pageSize.getWidth();doc.setFillColor.apply(doc,rgb('#071a2c'));doc.rect(0,0,w,31,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,12,13);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text(sub||'',12,20);doc.setTextColor.apply(doc,rgb('#f2c94c'));doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('LIGA NACIONAL DE BASQUETE · RH & FOLHA',12,26)}
async function exportGuide(kind){
  if(!guard())return;if(V.mode==='mes'&&!monthlyComp())throw new Error('Selecione um único mês no filtro global.');await ensurePdf();var r=guideRows().find(function(x){return x.key===kind});if(!r)throw new Error('Encargo não encontrado.');var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),label=guideLabel();pdfHead(doc,'Guia Gerencial — '+r.label,label);doc.setFillColor.apply(doc,rgb('#eef4f8'));doc.roundedRect(12,40,186,43,4,4,'F');doc.setTextColor.apply(doc,rgb('#071a2c'));doc.setFont('helvetica','bold');doc.setFontSize(23);doc.text(money(r.value),18,61);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text('Base: '+money(r.base),18,75);doc.autoTable({startY:94,head:[['Campo','Informação']],body:[['Referência',label],['Obrigação',r.label],['Base',money(r.base)],['Valor',money(r.value)],['Natureza',r.estimated?'Estimativa gerencial sobre a próxima folha':'Valor da competência mensal selecionada'],['Observação',r.estimated?'Estimativa proporcional baseada na última competência fechada e no total projetado da próxima folha.':'IRRF da folha prioriza o código de folha e exclui RPA quando essa separação está disponível.']],theme:'grid',styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:rgb('#0d2b42'),textColor:[255,255,255]}});doc.save('LNB_Guia_'+kind+'_'+(V.mode==='proxima'?'Proxima_Folha':String(monthlyComp().competencia||'').slice(0,7))+'.pdf')
}
async function exportGuidePack(){for(var i=0;i<['IRRF','INSS','PIS','FGTS'].length;i++)await exportGuide(['IRRF','INSS','PIS','FGTS'][i])}

function installGuideMode(){
  var panel=E('rh40-guides-panel');if(!panel)return;var head=panel.querySelector('.panel-head');if(head&&!E('rh42-guide-mode')){var wrap=document.createElement('div');wrap.className='rh42-guide-mode';wrap.innerHTML='<label>Referência das guias<select id="rh42-guide-mode"><option value="mes">Mês selecionado</option><option value="proxima">Próxima folha (estimativa)</option></select></label><span id="rh42-guide-ref"></span>';head.appendChild(wrap)}
  var sel=E('rh42-guide-mode');if(sel){sel.value=V.mode;sel.onchange=function(){V.mode=this.value;syncGuides()}}
  var old=E('rh40-guides-pack');if(old){old.onclick=function(){exportGuidePack().catch(function(e){try{toast(e.message,true)}catch(x){}})}}
  syncGuides();
}
function syncGuides(){var grid=E('rh40-guide-grid');if(grid)grid.innerHTML=guideCards();var ref=E('rh42-guide-ref');if(ref)ref.textContent=guideLabel();scheduleFit(20)}

function tablePack(pane){
  if(!pane)return null;var tables=Array.from(pane.querySelectorAll('table')).filter(function(t){return t.tBodies&&t.tBodies[0]&&t.tBodies[0].rows.length});if(!tables.length)return null;tables.sort(function(a,b){return b.tBodies[0].rows.length-a.tBodies[0].rows.length});var t=tables[0],head=t.tHead&&t.tHead.rows.length?t.tHead.rows[t.tHead.rows.length-1]:null,headers=head?Array.from(head.cells).map(function(c){return String(c.textContent||'').trim()}):[],rows=Array.from(t.tBodies[0].rows).map(function(tr){return Array.from(tr.cells).map(function(td){return String(td.textContent||'').replace(/\s+/g,' ').trim()})});return{headers:headers,rows:rows}}
async function exportForecastPdf(){if(!guard())return;var p=tablePack(forecastPane());if(!p)throw new Error('A projeção da próxima folha ainda não está disponível.');await ensurePdf();var doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});pdfHead(doc,'Próxima Folha — Relatório Executivo','Projeção gerencial do quadro ativo');doc.autoTable({startY:38,head:[p.headers],body:p.rows,theme:'striped',styles:{fontSize:6.8,cellPadding:2},headStyles:{fillColor:rgb('#0d2b42'),textColor:[255,255,255]}});doc.save('LNB_Proxima_Folha_Executiva.pdf')}
async function exportForecastExcel(){if(!guard())return;var p=tablePack(forecastPane());if(!p)throw new Error('A projeção da próxima folha ainda não está disponível.');await ensureExcel();var wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Próxima Folha');ws.views=[{showGridLines:false,state:'frozen',ySplit:4}];ws.mergeCells(1,1,1,Math.max(1,p.headers.length));var c=ws.getCell(1,1);c.value='PRÓXIMA FOLHA — RELATÓRIO EXECUTIVO';c.font={bold:true,size:18,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF071A2C'}};var hr=ws.addRow([]);hr=ws.addRow([]);hr=ws.addRow(p.headers);hr.eachCell(function(x){x.font={bold:true,color:{argb:'FFFFFFFF'}};x.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0D2B42'}}});p.rows.forEach(function(r,i){var row=ws.addRow(r);if(i%2)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF5F8FA'}}});ws.columns.forEach(function(col){var m=10;col.eachCell({includeEmpty:true},function(x){m=Math.max(m,String(x.value==null?'':x.value).length+2)});col.width=Math.min(38,m)});var buf=await wb.xlsx.writeBuffer();dl(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'LNB_Proxima_Folha_Executiva.xlsx')}

function activeKind(){var pane=Array.from(document.querySelectorAll('#page-planejamento [data-plan-pane]')).find(function(x){return !x.hidden&&getComputedStyle(x).display!=='none'});return pane&&pane.dataset.planPane||'13'}
function installPlanningToolbar(){
  var page=E('page-planejamento');if(!page)return;var bar=E('rh42-plan-export');if(!bar){bar=document.createElement('div');bar.id='rh42-plan-export';bar.className='rh42-plan-export';bar.innerHTML='<div><b id="rh42-plan-title">Exportar planejamento</b><small id="rh42-plan-sub">PDF e Excel executivo</small></div><div class="rh42-plan-actions"><button class="button primary export-only" id="rh42-plan-pdf" type="button">PDF Executivo</button><button class="button secondary export-only" id="rh42-plan-xlsx" type="button">Excel Executivo</button></div>';var head=page.querySelector('.page-head');if(head)head.insertAdjacentElement('afterend',bar);else page.insertBefore(bar,page.firstChild)}
  syncPlanningToolbar();
  E('rh42-plan-pdf').onclick=function(){runPlanExport('pdf')};E('rh42-plan-xlsx').onclick=function(){runPlanExport('xlsx')};
}
function syncPlanningToolbar(){var k=activeKind(),map={'13':'13º salário','ferias':'Férias','folha':'Próxima folha','rescisao':'Rescisão'},t=E('rh42-plan-title');if(t)t.textContent='Exportar '+(map[k]||'planejamento');var s=E('rh42-plan-sub');if(s)s.textContent=k==='folha'?'Projeção gerencial do quadro ativo':'PDF e Excel executivo'}
function runPlanExport(type){var k=activeKind(),fn=null;if(k==='13')fn=type==='pdf'?window.rhV41ExportProvisionPdf&&function(){return window.rhV41ExportProvisionPdf('13')}:window.rhV41ExportProvisionExcel&&function(){return window.rhV41ExportProvisionExcel('13')};else if(k==='ferias')fn=type==='pdf'?window.rhV41ExportProvisionPdf&&function(){return window.rhV41ExportProvisionPdf('ferias')}:window.rhV41ExportProvisionExcel&&function(){return window.rhV41ExportProvisionExcel('ferias')};else if(k==='folha')fn=type==='pdf'?exportForecastPdf:exportForecastExcel;else if(k==='rescisao')fn=type==='pdf'?window.rhV41ExportTerminationPdf:window.rhV41ExportTerminationExcel;if(!fn){try{toast('Exportação indisponível para esta opção.',true)}catch(e){}return}Promise.resolve().then(fn).catch(function(e){try{toast(e.message||String(e),true)}catch(x){}})}

function enhanceTermination(){
  var pane=document.querySelector('[data-plan-pane="rescisao"]'),term=pane&&pane.querySelector('.rh26-term'),kpis=pane&&pane.querySelector('.rh26-kpis');if(!term||!kpis)return;
  var cols=term.children;if(cols[0]&&cols[0].querySelector('h3'))cols[0].querySelector('h3').textContent='Proventos';if(cols[1]&&cols[1].querySelector('h3'))cols[1].querySelector('h3').textContent='Descontos';
  var cards=Array.from(kpis.querySelectorAll('.kpi')),gross=0,ded=0,liq=0;cards.forEach(function(c){var l=norm((c.querySelector('span')||{}).textContent),v=parseMoney((c.querySelector('strong')||{}).textContent);if(l.indexOf('total bruto')>=0)gross=v;else if(l.indexOf('dedu')>=0)ded=v;else if(l.indexOf('liquido')>=0)liq=v});
  if(cols[0]&&!cols[0].querySelector('.rh42-term-total'))cols[0].insertAdjacentHTML('beforeend','<div class="rh42-term-total"><span>Total de proventos</span><b>'+money(gross)+'</b></div>');
  if(cols[1]&&!cols[1].querySelector('.rh42-term-total'))cols[1].insertAdjacentHTML('beforeend','<div class="rh42-term-total"><span>Total de descontos</span><b>'+money(ded)+'</b></div>');
  var f=E('rh42-term-formula');if(!f){f=document.createElement('div');f.id='rh42-term-formula';f.className='rh42-term-formula';f.innerHTML='<b>Como chegamos ao líquido</b><span>'+money(gross)+' de proventos − '+money(ded)+' de descontos = <strong>'+money(liq)+'</strong></span>';kpis.insertAdjacentElement('afterend',f)}else f.innerHTML='<b>Como chegamos ao líquido</b><span>'+money(gross)+' de proventos − '+money(ded)+' de descontos = <strong>'+money(liq)+'</strong></span>';
  var rem=pane.querySelector('.rh34-rem');if(rem&&term.previousElementSibling!==kpis&&term!==kpis.nextElementSibling)kpis.insertAdjacentElement('afterend',term);
}

function styles(){if(E('_rh42'))return;var s=document.createElement('style');s.id='_rh42';s.textContent='.rh42-plan-export{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;margin:-4px 0 14px;border:1px solid var(--line-soft);border-radius:13px;background:var(--surface-2)}.rh42-plan-export>div:first-child{display:flex;flex-direction:column}.rh42-plan-export small{color:var(--muted)}.rh42-plan-actions{display:flex;gap:8px;flex-wrap:wrap}.rh42-guide-mode{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-left:auto}.rh42-guide-mode label{display:flex;flex-direction:column;gap:4px;color:var(--muted);font-size:.68rem;font-weight:800;text-transform:uppercase}.rh42-guide-mode select{padding:8px 30px 8px 10px;border:1px solid var(--line-soft);border-radius:9px;background:var(--surface-2);color:var(--text)}#rh42-guide-ref{font-size:.76rem;color:var(--muted);font-weight:800}.rh42-guide-empty{grid-column:1/-1;padding:18px;border:1px dashed var(--line-soft);border-radius:12px;color:var(--muted);text-align:center}.rh42-term-formula{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:13px 16px;margin:12px 0;border:1px solid color-mix(in srgb,var(--gold) 35%,var(--line-soft));border-radius:12px;background:color-mix(in srgb,var(--gold) 7%,var(--surface-1))}.rh42-term-formula span{color:var(--muted)}.rh42-term-formula strong{color:var(--gold);font-size:1.08rem}.rh42-term-total{display:flex!important;justify-content:space-between!important;gap:10px;padding-top:10px!important;margin-top:8px!important;border-top:1px solid var(--line-soft)!important;font-weight:900}.rh26-term{margin-top:12px!important}.kpi strong,.rh40-guide-card strong{overflow:hidden!important;text-overflow:clip!important;max-width:100%!important;min-width:0!important}@media(max-width:800px){.rh42-plan-export,.rh42-term-formula{align-items:flex-start;flex-direction:column}.rh42-plan-actions{width:100%}.rh42-plan-actions .button{flex:1}.rh42-guide-mode{margin-left:0}}';document.head.appendChild(s)}

function refresh(){styles();installGuideMode();installPlanningToolbar();enhanceTermination();scheduleFit(10)}
function wrapRender(){if(typeof window.renderAll==='function'&&!window.renderAll._rh42){var base=window.renderAll;var w=function(){var r=base.apply(this,arguments);setTimeout(refresh,0);setTimeout(refresh,80);setTimeout(refresh,220);return r};w._rh42=true;window.renderAll=w}}
function init(){styles();wrapRender();refresh();setTimeout(refresh,500);setTimeout(refresh,1200);document.addEventListener('click',function(e){var g=e.target&&e.target.closest&&e.target.closest('[data-rh42-guide]');if(g){e.preventDefault();exportGuide(g.dataset.rh42Guide).catch(function(err){try{toast(err.message||String(err),true)}catch(x){}});return}if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab],.nav-item')){setTimeout(refresh,60);setTimeout(refresh,180)}} ,true);['rh-period-year','rh-period-month'].forEach(function(id){var x=E(id);if(x)x.addEventListener('change',function(){setTimeout(refresh,160)})});window.addEventListener('resize',function(){scheduleFit(60)});if(window.ResizeObserver){V.resize=new ResizeObserver(function(){scheduleFit(50)});document.querySelectorAll('.kpi,.rh40-guide-card').forEach(function(x){try{V.resize.observe(x)}catch(e){}})}}
window.rhV42ExportForecastPdf=exportForecastPdf;window.rhV42ExportForecastExcel=exportForecastExcel;window.rhV42ExportGuide=exportGuide;window.RH_REPORT_FIXES_V42=true;
init();
})();