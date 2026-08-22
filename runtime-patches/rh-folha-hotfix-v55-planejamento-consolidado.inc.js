/* RH v55 — Planejamento & Provisões consolidado: cards estáveis + popups dimensionados */
(function(){
'use strict';
var V55={styleObs:null,popupObs:null,cleaning:false};
function E(id){return document.getElementById(id)}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function parseMoney(v){var s=String(v==null?'':v).replace(/R\$/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');return Number(s)||0}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.round(((Number(v)||0)+Number.EPSILON)*100)/100)}
function sum(rows,key){return (rows||[]).reduce(function(a,r){return a+(Number(r[key])||0)},0)}
function planPageVisible(){var p=E('page-planejamento');return !!(p&&!p.hidden&&getComputedStyle(p).display!=='none')}
function activePlanKind(){var p=Array.from(document.querySelectorAll('#page-planejamento [data-plan-pane]')).find(function(x){return !x.hidden&&getComputedStyle(x).display!=='none'});return p&&p.dataset.planPane||''}
function cleanPlanningValue(el){
  if(!el||!el.style)return;
  ['font-size','line-height','letter-spacing','white-space','width','max-width','overflow','text-overflow','transform','transition','animation','opacity','visibility'].forEach(function(k){if(el.style.getPropertyValue(k))el.style.removeProperty(k)});
  el.dataset.rh55Fixed='1'
}
function cleanPlanningTree(root){
  if(!root)return;var sel='#page-planejamento .kpi strong,#page-planejamento .rh47-summary-card strong,#page-planejamento .rh46-total-card strong,#page-planejamento .summary-card strong,#page-planejamento .stat-card strong,#page-planejamento strong .rh46-card-value';
  if(root.nodeType===1&&root.matches&&root.matches(sel))cleanPlanningValue(root);
  if(root.querySelectorAll)Array.from(root.querySelectorAll(sel)).forEach(cleanPlanningValue)
}
function styles(){
  if(E('_rh55'))return;var s=document.createElement('style');s.id='_rh55';s.textContent=
  '#page-planejamento .kpi strong,#page-planejamento .rh47-summary-card strong,#page-planejamento .rh46-total-card strong,#page-planejamento .summary-card strong,#page-planejamento .stat-card strong,#page-planejamento strong .rh46-card-value{font-size:28px!important;line-height:32px!important;letter-spacing:-.02em!important;font-variant-numeric:tabular-nums!important;white-space:nowrap!important;opacity:1!important;visibility:visible!important;transform:none!important;transition:none!important;animation:none!important}'+
  '#page-planejamento .kpi,#page-planejamento .rh47-summary-card,#page-planejamento .rh46-total-card,#page-planejamento .summary-card,#page-planejamento .stat-card{transform:none!important;animation:none!important;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease!important}'+
  '#page-planejamento [data-plan-pane="13"] .kpi,#page-planejamento [data-plan-pane="ferias"] .kpi{min-height:138px!important;height:138px!important;box-sizing:border-box!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary>.rh47-summary-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important}'+
  '#page-planejamento [data-plan-pane="folha"] .rh47-summary-card{min-height:126px!important;height:126px!important;box-sizing:border-box!important}'+
  '#rh55-plan-modal{position:fixed;inset:0;z-index:10080;display:grid;place-items:center;padding:24px;background:rgba(2,12,22,.72);backdrop-filter:blur(7px)}'+
  '#rh55-plan-modal .rh55-card{width:min(var(--rh55-w,820px),calc(100vw - 48px));max-width:min(var(--rh55-w,820px),calc(100vw - 48px));max-height:88vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line);border-radius:22px;background:var(--surface);box-shadow:0 24px 80px rgba(0,0,0,.35)}'+
  '#rh55-plan-modal .rh55-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:24px 26px 20px;border-bottom:1px solid var(--line-soft)}'+
  '#rh55-plan-modal .rh55-kicker{display:block;color:var(--gold-2);font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:7px}'+
  '#rh55-plan-modal h2{margin:0;font-size:28px;line-height:1.08}#rh55-plan-modal .rh55-ref{display:inline-block;margin-top:8px;padding:4px 9px;border:1px solid var(--line-soft);border-radius:999px;color:var(--muted);font-size:11px;font-weight:750}'+
  '#rh55-plan-modal .rh55-close{width:44px;height:44px;flex:0 0 44px;border:1px solid var(--line-soft);border-radius:13px;background:var(--surface-2);color:var(--text);font-size:27px;cursor:pointer}'+
  '#rh55-plan-modal .rh55-sub{margin:0;padding:12px 26px 0;color:var(--muted);font-size:12px;line-height:1.45}'+
  '#rh55-plan-modal .rh55-body{padding:18px 26px 24px;overflow:auto;min-height:0}'+
  '#rh55-plan-modal table{width:100%;min-width:0;table-layout:fixed;border-collapse:collapse}'+
  '#rh55-plan-modal th,#rh55-plan-modal td{padding:11px 12px;border-bottom:1px solid var(--line-soft);vertical-align:middle;word-break:normal;overflow-wrap:break-word}'+
  '#rh55-plan-modal th{background:var(--surface-2);color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em;text-align:left}'+
  '#rh55-plan-modal td{font-size:13px;line-height:1.25}#rh55-plan-modal .num{text-align:right!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important}'+
  '#rh55-plan-modal tfoot td{font-weight:900;background:color-mix(in srgb,var(--surface-2) 84%,var(--gold) 8%);border-top:2px solid var(--line)}'+
  '#encargos-popup.rh55-planning-popup{display:grid!important;place-items:center!important;padding:24px!important;box-sizing:border-box!important}#encargos-popup.rh55-planning-popup[hidden]{display:none!important}'+
  '#encargos-popup.rh55-planning-popup .modal-card{width:min(var(--rh55-generic-w,820px),calc(100vw - 48px))!important;max-width:min(var(--rh55-generic-w,820px),calc(100vw - 48px))!important;min-width:0!important;max-height:88vh!important;margin:auto!important;overflow:hidden!important;box-sizing:border-box!important;flex:none!important}'+
  '#encargos-popup.rh55-planning-popup .ep-body{width:100%!important;max-width:100%!important;padding:18px 22px 22px!important;overflow:auto!important;box-sizing:border-box!important}'+
  '#encargos-popup.rh55-planning-popup .rh47-popup-scroll{width:100%!important;max-width:100%!important;overflow:auto!important}'+
  '#encargos-popup.rh55-planning-popup .rh47-popup-table,#encargos-popup.rh55-planning-popup table{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;table-layout:fixed!important}'+
  '#encargos-popup.rh55-planning-popup th,#encargos-popup.rh55-planning-popup td{word-break:normal!important;overflow-wrap:break-word!important;hyphens:none!important}'+
  '#encargos-popup.rh55-planning-popup .money{text-align:right!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important}'+
  '#rh48-modal.rh55-planning-popup{display:grid!important;place-items:center!important;padding:24px!important;box-sizing:border-box!important}#rh48-modal.rh55-planning-popup .rh48-modal-card{width:min(var(--rh55-generic-w,700px),calc(100vw - 48px))!important;max-width:min(var(--rh55-generic-w,700px),calc(100vw - 48px))!important;min-width:0!important;max-height:88vh!important;margin:auto!important;overflow:hidden!important}#rh48-modal.rh55-planning-popup .rh48-table{width:100%!important;min-width:0!important;max-width:100%!important;table-layout:fixed!important}'+
  '@media(max-width:1120px){#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary>.rh47-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}'+
  '@media(max-width:760px){#page-planejamento [data-plan-pane="13"] .kpi,#page-planejamento [data-plan-pane="ferias"] .kpi,#page-planejamento [data-plan-pane="folha"] .rh47-summary-card{height:auto!important;min-height:118px!important}#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary>.rh47-summary-grid{grid-template-columns:1fr!important}#rh55-plan-modal{padding:8px}#rh55-plan-modal .rh55-card,#encargos-popup.rh55-planning-popup .modal-card,#rh48-modal.rh55-planning-popup .rh48-modal-card{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important}#rh55-plan-modal .rh55-head{padding:18px}#rh55-plan-modal .rh55-body{padding:14px 18px 18px}}';
  document.head.appendChild(s)
}
function observeStyles(){
  var page=E('page-planejamento');if(!page||V55.styleObs)return;
  V55.styleObs=new MutationObserver(function(ms){if(V55.cleaning)return;V55.cleaning=true;try{ms.forEach(function(m){if(m.type==='attributes'&&m.attributeName==='style'){var el=m.target;if(el&&el.matches&&el.matches('.kpi strong,.rh47-summary-card strong,.rh46-total-card strong,.summary-card strong,.stat-card strong,strong .rh46-card-value'))cleanPlanningValue(el)}else if(m.type==='childList'){Array.from(m.addedNodes||[]).forEach(function(n){if(n&&n.nodeType===1)cleanPlanningTree(n)})}})}finally{V55.cleaning=false}});
  V55.styleObs.observe(page,{subtree:true,childList:true,attributes:true,attributeFilter:['style']})
}
function widthFor(cols){if(cols<=2)return 640;if(cols===3)return 780;if(cols===4)return 900;if(cols===5)return 1020;if(cols===6)return 1140;if(cols===7)return 1240;return 1360}
function fitGenericPopup(){
  if(!planPageVisible()||activePlanKind()!=='folha')return;var modal=E('encargos-popup');if(!modal||modal.hidden)return;var table=modal.querySelector('.rh47-popup-table,.modal-table-inner,table'),box=modal.querySelector('.modal-card');if(!table||!box)return;
  var cols=table.querySelectorAll('thead th').length||3,w=widthFor(cols);modal.classList.add('rh55-planning-popup');modal.style.setProperty('--rh55-generic-w',w+'px');box.style.setProperty('width','min('+w+'px,calc(100vw - 48px))','important');box.style.setProperty('max-width','min('+w+'px,calc(100vw - 48px))','important');box.style.setProperty('min-width','0','important');table.style.setProperty('width','100%','important');table.style.setProperty('min-width','0','important');table.style.setProperty('max-width','100%','important')
}
function fitDedicatedPopup(){
  if(!planPageVisible())return;var modal=E('rh48-modal');if(!modal)return;var table=modal.querySelector('.rh48-table'),box=modal.querySelector('.rh48-modal-card');if(!table||!box)return;var cols=table.querySelectorAll('thead th').length||2,w=widthFor(cols);modal.classList.add('rh55-planning-popup');modal.style.setProperty('--rh55-generic-w',w+'px');box.style.setProperty('width','min('+w+'px,calc(100vw - 48px))','important');box.style.setProperty('max-width','min('+w+'px,calc(100vw - 48px))','important');box.style.setProperty('min-width','0','important')
}
function observePopups(){
  if(V55.popupObs)return;V55.popupObs=new MutationObserver(function(){queueMicrotask(function(){fitGenericPopup();fitDedicatedPopup()})});V55.popupObs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']})
}
function refLabel(){try{var c=S&&S.competencia;if(c&&c._periodConsolidated)return 'Consolidado';if(c&&c.competencia&&typeof formatCompetence==='function')return formatCompetence(c.competencia)}catch(e){}return 'Consolidado'}
function closeOwn(){var m=E('rh55-plan-modal');if(m)m.remove()}
function tableHtml(headers,rows,footer,numeric,widths){
  numeric=numeric||[];var isNum=function(i){return numeric.indexOf(i)>=0};
  var colgroup=widths&&widths.length===headers.length?'<colgroup>'+widths.map(function(w){return '<col style="width:'+w+'%">'}).join('')+'</colgroup>':'';
  return '<table>'+colgroup+'<thead><tr>'+headers.map(function(h,i){return '<th class="'+(isNum(i)?'num':'')+'">'+h+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(v,i){return '<td class="'+(isNum(i)?'num':'')+'">'+v+'</td>'}).join('')+'</tr>'}).join('')+'</tbody>'+(footer?'<tfoot><tr>'+footer.map(function(v,i){return '<td class="'+(isNum(i)?'num':'')+'">'+v+'</td>'}).join('')+'</tr></tfoot>':'')+'</table>'
}
function openOwn(title,headers,rows,footer,numeric,widths,subtitle){
  closeOwn();var cols=headers.length,w=widthFor(cols),html='<div id="rh55-plan-modal" role="dialog" aria-modal="true"><section class="rh55-card" style="--rh55-w:'+w+'px"><header class="rh55-head"><div><span class="rh55-kicker">PLANEJAMENTO & PROVISÕES · COMPOSIÇÃO</span><h2>'+title+'</h2><span class="rh55-ref">Referência: '+refLabel()+'</span></div><button type="button" class="rh55-close" aria-label="Fechar">×</button></header>'+(subtitle?'<p class="rh55-sub">'+subtitle+'</p>':'')+'<div class="rh55-body">'+tableHtml(headers,rows,footer,numeric,widths)+'</div></section></div>';document.body.insertAdjacentHTML('beforeend',html);var m=E('rh55-plan-modal');if(!m)return;m.querySelector('.rh55-close').onclick=closeOwn;m.addEventListener('click',function(e){if(e.target===m)closeOwn()})
}
function personCell(tr){var c=tr&&tr.cells&&tr.cells[0],b=c&&c.querySelector('b'),sm=c&&c.querySelector('small');return{name:String(b?b.textContent:c&&c.textContent||'—').trim(),dep:String(sm?sm.textContent:'—').trim()}}
function provisionRows(kind){
  var pane=document.querySelector('#page-planejamento [data-plan-pane="'+kind+'"]'),table=pane&&pane.querySelector('table.rh26-wide');if(!table)return[];return Array.from(table.querySelectorAll('tbody tr.rh26-row')).filter(function(tr){return !tr.hidden&&getComputedStyle(tr).display!=='none'}).map(function(tr){var c=tr.cells||[],p=personCell(tr);if(kind==='13'&&c.length>=16){var inss=parseMoney(c[10].textContent),rat=parseMoney(c[11].textContent),terc=parseMoney(c[12].textContent),fgts=parseMoney(c[13].textContent),pis=parseMoney(c[14].textContent);return{name:p.name,dep:p.dep,pm:parseMoney(c[5].textContent),saldo:parseMoney(c[9].textContent),inss:inss,rat:rat,terc:terc,fgts:fgts,pis:pis,enc:inss+rat+terc+fgts+pis,custo:parseMoney(c[15].textContent)}}if(kind==='ferias'&&c.length>=19){var i=parseMoney(c[13].textContent),r=parseMoney(c[14].textContent),t=parseMoney(c[15].textContent),f=parseMoney(c[16].textContent),ps=parseMoney(c[17].textContent);return{name:p.name,dep:p.dep,pm:parseMoney(c[6].textContent),saldo:parseMoney(c[12].textContent),inss:i,rat:r,terc:t,fgts:f,pis:ps,enc:i+r+t+f+ps,custo:parseMoney(c[18].textContent)}}return null}).filter(Boolean)
}
function openProvisionCard(card,kind){
  var rows=provisionRows(kind);if(!rows.length)return false;rows.sort(function(a,b){return a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'})});var label=norm((card.querySelector('span')||{}).textContent||''),title=(card.querySelector('span')||{}).textContent||'Composição';
  if(label.indexOf('saldo provisionado')>=0){openOwn(title,['Colaborador','Departamento','Saldo atual'],rows.map(function(r){return[r.name,r.dep,money(r.saldo)]}),['TOTAL','',money(sum(rows,'saldo'))],[2],[48,27,25],'Composição exclusiva do saldo provisionado.');return true}
  if(label.indexOf('provisao do mes')>=0){openOwn(title,['Colaborador','Departamento','Provisão do mês'],rows.map(function(r){return[r.name,r.dep,money(r.pm)]}),['TOTAL','',money(sum(rows,'pm'))],[2],[48,27,25],'Composição da provisão reconhecida no mês.');return true}
  if(label.indexOf('encargo')>=0){openOwn(title,['Colaborador','INSS Empresa','RAT','Terceiros','FGTS','PIS','Total encargos'],rows.map(function(r){return[r.name,money(r.inss),money(r.rat),money(r.terc),money(r.fgts),money(r.pis),money(r.enc)]}),['TOTAL',money(sum(rows,'inss')),money(sum(rows,'rat')),money(sum(rows,'terc')),money(sum(rows,'fgts')),money(sum(rows,'pis')),money(sum(rows,'enc'))],[1,2,3,4,5,6],[31,12,10,12,11,10,14],'Encargos incidentes sobre o saldo da provisão.');return true}
  if(label.indexOf('custo provisionado')>=0){openOwn(title,['Colaborador','Departamento','Saldo atual','Encargos','Custo provisionado'],rows.map(function(r){return[r.name,r.dep,money(r.saldo),money(r.enc),money(r.custo)]}),['TOTAL','',money(sum(rows,'saldo')),money(sum(rows,'enc')),money(sum(rows,'custo'))],[2,3,4],[35,22,14,14,15],'Custo provisionado = saldo atual + encargos.');return true}
  return false
}
function captureProvisionCards(){
  window.addEventListener('click',function(e){if(!e.target||!e.target.closest)return;var card=e.target.closest('#page-planejamento [data-plan-pane="13"] .kpi,#page-planejamento [data-plan-pane="ferias"] .kpi');if(!card)return;var pane=card.closest('[data-plan-pane]'),kind=pane&&pane.dataset.planPane;if((kind==='13'||kind==='ferias')&&openProvisionCard(card,kind)){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}},true)
}
function ensureForecast(){var pane=document.querySelector('#page-planejamento [data-plan-pane="folha"]');if(!pane)return;pane.querySelectorAll('#rh51-forecast-cards,#rh52-forecast-cards').forEach(function(x){x.remove()});var old=E('rh-plan-folha-kpis');if(old)old.style.setProperty('display','none','important');var s=E('rh47-forecast-summary'),g=s&&s.querySelector(':scope > .rh47-summary-grid');if(s)s.style.setProperty('display','block','important');if(g)g.style.setProperty('display','grid','important')}
function init(){styles();cleanPlanningTree(document);observeStyles();observePopups();captureProvisionCards();ensureForecast();[0,120,500].forEach(function(ms){setTimeout(function(){cleanPlanningTree(document);ensureForecast();fitGenericPopup();fitDedicatedPopup()},ms)});document.addEventListener('keydown',function(e){if(e.key==='Escape')closeOwn()},true);document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#page-planejamento [data-plan-tab],#rh-plan-recalc'))setTimeout(function(){cleanPlanningTree(document);ensureForecast()},0)},true)}
window.RH_PLANNING_CONSOLIDATED_V55=true;window.rhV55FitPlanningPopups=function(){fitGenericPopup();fitDedicatedPopup()};window.rhV55Refresh=function(){cleanPlanningTree(document);ensureForecast()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
