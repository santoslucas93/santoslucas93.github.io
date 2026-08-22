/* RH v51 consolidada — Próxima Folha única, popups proporcionais e provisões sem CC */
(function(){
'use strict';
var V51={observer:null,timer:0};
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function p(v){var s=String(v==null?'':v).replace(/R\$/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');return Number(s)||0}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(r(v))}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function pane(){return document.querySelector('#page-planejamento [data-plan-pane="folha"]')}
function sourceGrid(){var x=pane();return x&&x.querySelector('#rh47-forecast-summary .rh47-summary-grid')}
function sourceCard(key){var g=sourceGrid();return g&&g.querySelector('.rh47-summary-card[data-rh47-key="'+key+'"]')}
function value(key){var c=sourceCard(key),s=c&&c.querySelector('strong');return r(p(s&&s.textContent))}
function text(key,sel,fallback){var c=sourceCard(key),x=c&&c.querySelector(sel);return String(x&&x.textContent||fallback||'').trim()}
function totals(){
  var g=sourceGrid();if(!g)return null;
  var prov=value('prov'),disc=value('disc'),ret=value('ret'),company=value('company'),ben=value('ben');if(!(prov>0))return null;
  return{prov:prov,disc:disc,liq:r(prov-disc),ret:ret,company:company,ben:ben,tax:r(ret+company),cost:r(prov+company+ben),ref:text('prov','small','Projeção mensal'),benLabel:text('ben','span','Benefícios confirmados (parcial)'),benSub:text('ben','small','fonte parcial')}
}
function card(label,v,sub,key,featured){return '<button type="button" class="rh47-summary-card rh51-stable-card '+(featured?'featured':'')+'" data-rh47-key="'+esc(key)+'"><span>'+esc(label)+'</span><strong>'+money(v)+'</strong><small>'+esc(sub||'')+'</small></button>'}
function html(t){return '<div class="rh51-summary-grid">'+card('Proventos previstos',t.prov,t.ref,'prov')+card('Descontos previstos',t.disc,'retenções + demais descontos','disc')+card('Líquido previsto',t.liq,'proventos − descontos','liq',true)+card('Impostos retidos',t.ret,'INSS segurados + IRRF','ret')+card('Encargos empresa',t.company,'INSS patronal + RAT + terceiros + PIS + FGTS','company')+card(t.benLabel,t.ben,t.benSub,'ben')+card('Tributos / recolhimentos',t.tax,'retidos + encargos da empresa','tax')+card('Custo total estimado',t.cost,'proventos + encargos + benefícios','cost',true)+'</div>'}
function sig(t){return t?[t.prov,t.disc,t.ret,t.company,t.ben].map(function(v){return r(v).toFixed(2)}).join('|'):''}
function ensureForecast(force){
  var x=pane(),source=E('rh47-forecast-summary');if(!x||!source)return;
  var t=totals();if(!t)return;
  var host=E('rh51-forecast-cards');if(!host){host=document.createElement('section');host.id='rh51-forecast-cards';host.className='rh51-forecast-cards';source.parentNode.insertBefore(host,source)}
  var s=sig(t);if(!force&&host.dataset.sig===s)return;host.dataset.sig=s;host.innerHTML=html(t)
}
function settle(delay,force){clearTimeout(V51.timer);var tries=0,prev='';function step(){tries++;var t=totals(),s=sig(t);if(s&&s===prev){ensureForecast(!!force);dedup();return}prev=s;if(tries<10)V51.timer=setTimeout(step,220);else{ensureForecast(true);dedup()}}V51.timer=setTimeout(step,delay==null?500:delay)}
function dedup(){
  var x=pane();if(!x)return;
  var legacy=E('rh-plan-folha-kpis');if(legacy)legacy.style.setProperty('display','none','important');
  x.querySelectorAll('#rh47-forecast-summary .rh47-summary-grid').forEach(function(g){g.style.setProperty('display','none','important')});
  var hosts=Array.prototype.slice.call(x.querySelectorAll('#rh51-forecast-cards'));hosts.slice(1).forEach(function(h){h.remove()});if(hosts[0])hosts[0].style.setProperty('display','block','important')
}

/* Popup do openGenericDetail: o modal original é #encargos-popup > .modal-card. */
function sizePopup(){
  var modal=E('encargos-popup');if(!modal||modal.hidden)return;var table=modal.querySelector('.rh47-popup-table');if(!table)return;var box=modal.querySelector('.modal-card');if(!box)return;
  var cols=table.querySelectorAll('thead th').length||3;cols=Math.max(2,Math.min(6,cols));box.classList.add('rh51-forecast-popup');for(var i=2;i<=6;i++)box.classList.toggle('rh51-cols'+i,i===cols)
}

/* 13º e Férias sem CC, com rodapé e agrupadores realinhados. */
function kind(table){var q=table&&table.closest('[data-plan-pane]');return q&&q.dataset.planPane==='13'?'13':q&&q.dataset.planPane==='ferias'?'ferias':''}
function group(kindName){var tr=document.createElement('tr');tr.className='rh30-group-head rh51-group-head';tr.innerHTML=kindName==='ferias'?'<th colspan="4">Colaborador e período</th><th colspan="8">Movimentação da provisão</th><th colspan="6">Encargos e custo</th>':'<th colspan="3">Colaborador e base</th><th colspan="6">Movimentação da provisão</th><th colspan="6">Encargos e custo</th>';return tr}
function mark(table,kindName){var starts=kindName==='ferias'?[1,5,13]:[1,4,10];table.querySelectorAll('thead tr:not(.rh30-group-head),tbody tr,tfoot tr').forEach(function(tr){Array.prototype.forEach.call(tr.children,function(c,i){c.classList.toggle('rh30-group-start',starts.indexOf(i+1)>=0)})})}
function stripCc(table){
  if(!table||table.dataset.rh51NoCc==='1')return;var k=kind(table);if(!k)return;var head=table.tHead&&Array.prototype.slice.call(table.tHead.rows).find(function(row){return !row.classList.contains('rh30-group-head')});if(!head||head.cells.length<2||!/^cc$|centro de custo/.test(norm(head.cells[1].textContent)))return;
  [table.tHead,table.tBodies&&table.tBodies[0],table.tFoot].forEach(function(sec){if(!sec)return;Array.prototype.forEach.call(sec.rows,function(row){if(!row.classList.contains('rh30-group-head')&&row.cells.length>1)row.deleteCell(1)})});
  var old=table.tHead&&table.tHead.querySelector('.rh30-group-head');if(old)old.remove();if(table.tHead)table.tHead.insertBefore(group(k),table.tHead.firstChild);table.dataset.rh51NoCc='1';table.classList.add('rh51-no-cc');mark(table,k);
  var wrap=table.closest('.table-wrap'),note=wrap&&wrap.previousElementSibling;if(note&&note.classList.contains('rh30-scroll-note'))note.innerHTML='<span>↔</span><b>Visualização detalhada</b><span>Role horizontalmente para consultar todas as colunas. O colaborador permanece fixo.</span>'
}
function rhV51FixProvisionTables(root){root=root||document;root.querySelectorAll('#page-planejamento [data-plan-pane="13"] table.rh26-wide,#page-planejamento [data-plan-pane="ferias"] table.rh26-wide').forEach(stripCc)}

function styles(){if(E('_rh51'))return;var s=document.createElement('style');s.id='_rh51';s.textContent=
  /* exatamente uma grade visível na Próxima Folha */
  '#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis{display:none!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh47-forecast-summary .rh47-summary-grid{display:none!important}'+
  '#page-planejamento [data-plan-pane="folha"] #rh51-forecast-cards{display:block!important;margin:0 0 14px!important}'+
  '.rh51-summary-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}'+
  '.rh51-stable-card{height:126px!important;min-height:126px!important;box-sizing:border-box!important;overflow:hidden!important;transform:none!important;animation:none!important}'+
  '.rh51-stable-card strong{font-size:28px!important;line-height:32px!important;letter-spacing:-.02em!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important;transition:none!important;animation:none!important;transform:none!important}'+
  /* popup proporcional ao conteúdo, sobrescrevendo regras antigas de quase 100vw */
  '#encargos-popup .modal-card.rh51-forecast-popup{box-sizing:border-box!important;margin:auto!important;max-height:88vh!important;overflow:hidden!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols2{width:min(680px,calc(100vw - 40px))!important;max-width:min(680px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols3{width:min(820px,calc(100vw - 40px))!important;max-width:min(820px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols4{width:min(960px,calc(100vw - 40px))!important;max-width:min(960px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols5{width:min(1120px,calc(100vw - 40px))!important;max-width:min(1120px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols6{width:min(1260px,calc(100vw - 40px))!important;max-width:min(1260px,calc(100vw - 40px))!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup .ep-body{max-width:100%!important;overflow:auto!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup .rh47-popup-scroll{width:100%!important;max-width:100%!important;overflow:auto!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup .rh47-popup-table{width:100%!important;max-width:100%!important;table-layout:fixed!important;margin:0!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols2 .rh47-popup-table,#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols3 .rh47-popup-table{min-width:0!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols4 .rh47-popup-table{min-width:860px!important}#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols5 .rh47-popup-table{min-width:1020px!important}#encargos-popup .modal-card.rh51-forecast-popup.rh51-cols6 .rh47-popup-table{min-width:1160px!important}'+
  '#encargos-popup .modal-card.rh51-forecast-popup .rh47-popup-table th,#encargos-popup .modal-card.rh51-forecast-popup .rh47-popup-table td{word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important}'+
  /* provisões sem CC */
  '#page-planejamento table.rh51-no-cc.rh30-13{min-width:1960px!important}#page-planejamento table.rh51-no-cc.rh30-ferias{min-width:2290px!important}'+
  '#page-planejamento table.rh51-no-cc tbody td:nth-child(2),#page-planejamento table.rh51-no-cc tfoot td:nth-child(2),#page-planejamento table.rh51-no-cc thead tr:not(.rh30-group-head) th:nth-child(2){position:static!important;left:auto!important;z-index:auto!important;box-shadow:none!important;background:inherit!important}'+
  '#page-planejamento table.rh51-no-cc tfoot td{white-space:nowrap!important;font-variant-numeric:tabular-nums!important}'+
  '@media(max-width:1120px){.rh51-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.rh51-summary-grid{grid-template-columns:1fr}.rh51-stable-card{height:auto!important;min-height:118px!important}#encargos-popup .modal-card.rh51-forecast-popup{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important;max-height:92vh!important}}';document.head.appendChild(s)}
function process(){styles();dedup();sizePopup();rhV51FixProvisionTables(document)}
function observe(){if(V51.observer)return;V51.observer=new MutationObserver(function(){queueMicrotask(process)});V51.observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']})}
function init(){styles();process();observe();settle(700,true);[1200,2200].forEach(function(ms){setTimeout(function(){settle(0,true)},ms)});document.addEventListener('click',function(e){if(!e.target||!e.target.closest)return;if(e.target.closest('#rh-plan-recalc')||e.target.closest('[data-plan-tab="folha"]'))settle(550,true);if(e.target.closest('[data-plan-tab="13"],[data-plan-tab="ferias"]'))setTimeout(function(){rhV51FixProvisionTables(document)},180)},true)}
window.RH_PLANNING_LAYOUT_V51=true;window.rhV51RefreshForecast=function(){settle(0,true)};window.rhV51FixProvisionTables=function(){rhV51FixProvisionTables(document)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
