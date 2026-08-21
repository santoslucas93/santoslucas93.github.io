/* RH & Folha — hotfix v13: ajuste automático dos cards e totais em todos os popups */
function rhFitCardValue(el){
  if(!el||!el.parentElement)return;
  el.style.fontSize='';el.style.whiteSpace='nowrap';
  var base=parseFloat(getComputedStyle(el).fontSize)||28,min=14,size=base,box=el.parentElement;
  while(size>min&&el.scrollWidth>Math.max(20,box.clientWidth-12)){size-=1;el.style.fontSize=size+'px';}
  el.classList.toggle('rh-value-tight',size<base);
}
function rhFitAllCardValues(root){
  root=root||document;
  var sel='.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,.rh-period-bar strong';
  Array.prototype.forEach.call(root.querySelectorAll(sel),rhFitCardValue);
}
function rhPopupNumber(text){
  text=String(text==null?'':text).trim();
  if(!text||text==='—'||text.indexOf('/')>=0&&!/R\$/.test(text))return null;
  var money=/R\$/.test(text),pct=/%/.test(text),clean=text.replace(/[^0-9,.-]/g,'');
  if(!clean)return null;
  var n=Number(clean.replace(/\./g,'').replace(',','.'));if(!isFinite(n))return null;
  return {value:n,money:money,pct:pct};
}
function rhPopupAggregate(values){
  var parsed=values.map(rhPopupNumber).filter(Boolean);if(!parsed.length)return '';
  var money=parsed.some(function(x){return x.money;}),pct=parsed.some(function(x){return x.pct;});
  if(pct){var avg=parsed.reduce(function(a,x){return a+x.value;},0)/parsed.length;return avg.toFixed(1).replace('.',',')+'%';}
  var total=parsed.reduce(function(a,x){return a+x.value;},0);return money?fmt(total):nfmt(total);
}
function rhPopupTotalForColumn(cells,index){
  var vals=cells.map(function(row){return row[index]||'';});return rhPopupAggregate(vals);
}
function rhEnsureHtmlTableTotals(table){
  if(!table||table.dataset.rhTotalsReady==='1')return;
  var heads=Array.prototype.map.call(table.querySelectorAll('thead th'),function(x){return x.textContent.trim();});
  var rows=Array.prototype.map.call(table.querySelectorAll('tbody tr'),function(tr){return Array.prototype.map.call(tr.children,function(td){return td.textContent.trim();});});
  if(!heads.length||!rows.length)return;
  var totals=heads.map(function(h,i){if(i===0)return 'TOTAL';var v=rhPopupTotalForColumn(rows,i);return v||'—';});
  var foot=table.querySelector('tfoot');if(!foot){foot=document.createElement('tfoot');table.appendChild(foot);}
  foot.innerHTML='<tr class="detail-total-row rh-auto-total">'+totals.map(function(v,i){return '<td'+((heads[i]||'').match(/valor|total|provento|desconto|líquido|liquido|fgts|inss|pis|irrf|custo|benef|salário|salario|base|encargo|%/i)?' class="money"':'')+'><b>'+esc(v)+'</b></td>';}).join('')+'</tr>';
  table.dataset.rhTotalsReady='1';
}
function rhEnsureGridTotals(grid){
  if(!grid||grid.dataset.rhTotalsReady==='1')return;
  var header=grid.querySelector('.rh-comp-header');if(!header)return;
  var heads=Array.prototype.map.call(header.children,function(x){return x.textContent.trim();});
  var body=Array.prototype.filter.call(grid.querySelectorAll('.rh-comp-row'),function(r){return !r.classList.contains('rh-comp-header')&&!r.classList.contains('rh-comp-total');});
  var rows=body.map(function(r){return Array.prototype.map.call(r.children,function(c){return c.textContent.trim();});});
  if(!heads.length||!rows.length)return;
  var totals=heads.map(function(h,i){if(i===0)return 'TOTAL';var v=rhPopupTotalForColumn(rows,i);return v||'—';});
  var old=grid.querySelector('.rh-comp-total');if(old)old.remove();
  var total=document.createElement('div');total.className='rh-comp-row rh-comp-total rh-auto-total';
  total.innerHTML=totals.map(function(v,i){return '<div class="rh-comp-cell" data-label="'+esc(heads[i]||'')+'"><b>'+esc(v)+'</b></div>';}).join('');
  grid.appendChild(total);grid.dataset.rhTotalsReady='1';
}
function rhEnsurePopupTotals(root){
  root=root||document;
  Array.prototype.forEach.call(root.querySelectorAll('.modal:not([hidden]) table,.rh-detail-card table,#rh-detail-modal:not([hidden]) table'),rhEnsureHtmlTableTotals);
  Array.prototype.forEach.call(root.querySelectorAll('.modal:not([hidden]) .rh-comp-table,.rh-detail-card .rh-comp-table,#rh-detail-modal:not([hidden]) .rh-comp-table'),rhEnsureGridTotals);
}
function rhPostRenderPolish(){requestAnimationFrame(function(){rhFitAllCardValues(document);rhEnsurePopupTotals(document);});}
if(!document.getElementById('_rh_v13_styles')){
  var _rhV13Style=document.createElement('style');_rhV13Style.id='_rh_v13_styles';
  _rhV13Style.textContent='.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.summary-card strong,.stat-card strong{max-width:100%;display:block;line-height:1.05;overflow:hidden;text-overflow:clip}.rh-value-tight{letter-spacing:-.02em}.rh-auto-total{border-top:2px solid var(--gold)!important;background:color-mix(in srgb,var(--gold) 8%,transparent)!important}.rh-auto-total td,.rh-auto-total .rh-comp-cell{font-weight:800!important}';
  document.head.appendChild(_rhV13Style);
}
var _rhV13RenderAll=renderAll;
renderAll=function(){var r=_rhV13RenderAll.apply(this,arguments);rhPostRenderPolish();return r;};
var _rhV13OpenGeneric=typeof openGenericDetail==='function'?openGenericDetail:null;
if(_rhV13OpenGeneric)openGenericDetail=function(){var r=_rhV13OpenGeneric.apply(this,arguments);rhPostRenderPolish();return r;};
var _rhV13OpenPerson=typeof openPerson==='function'?openPerson:null;
if(_rhV13OpenPerson)openPerson=function(){var r=_rhV13OpenPerson.apply(this,arguments);rhPostRenderPolish();return r;};
['openEncargosPopup','openInssBreakdown','openIrrfBreakdown','openFgtsBreakdown'].forEach(function(name){var fn=window[name];if(typeof fn==='function')window[name]=function(){var r=fn.apply(this,arguments);rhPostRenderPolish();return r;};});
var _rhV13Observer=new MutationObserver(function(muts){var hit=muts.some(function(m){return m.type==='childList'||m.type==='characterData'||(m.type==='attributes'&&m.attributeName==='hidden');});if(hit)rhPostRenderPolish();});
if(document.documentElement)_rhV13Observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
window.addEventListener('resize',function(){rhFitAllCardValues(document);});
