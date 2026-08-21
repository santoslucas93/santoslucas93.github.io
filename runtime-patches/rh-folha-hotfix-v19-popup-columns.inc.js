/* RH & Folha — hotfix v19: alinhamento consistente de colunas e totais em todos os popups */
(function(){
  function isNumericHeader(t){return /valor|total|provento|desconto|líquido|liquido|fgts|inss|pis|irrf|custo|benef|salário|salario|base|encargo|média|media|%|pessoas|quantidade|qtd/i.test(String(t||''));}
  function alignGrid(grid){
    if(!grid)return;var header=grid.querySelector('.rh-comp-header');if(!header)return;
    var heads=Array.prototype.map.call(header.children,function(x){return x.textContent.trim();});
    var template=getComputedStyle(header).gridTemplateColumns;
    if(!template||template==='none')template='repeat('+Math.max(1,heads.length)+',minmax(0,1fr))';
    Array.prototype.forEach.call(grid.querySelectorAll('.rh-comp-row'),function(row){
      row.style.setProperty('display','grid','important');row.style.setProperty('grid-template-columns',template,'important');row.style.setProperty('width','100%','important');row.style.setProperty('align-items','center','important');
      Array.prototype.forEach.call(row.children,function(cell,i){
        cell.style.setProperty('min-width','0','important');cell.style.setProperty('box-sizing','border-box','important');
        cell.style.setProperty('text-align',isNumericHeader(heads[i])?'right':'left','important');
        cell.style.setProperty('justify-self','stretch','important');
      });
    });
  }
  function alignTable(table){
    if(!table)return;var heads=Array.prototype.map.call(table.querySelectorAll('thead th'),function(x){return x.textContent.trim();});if(!heads.length)return;
    Array.prototype.forEach.call(table.querySelectorAll('tr'),function(row){Array.prototype.forEach.call(row.children,function(cell,i){cell.style.setProperty('text-align',isNumericHeader(heads[i])?'right':'left','important');cell.style.setProperty('vertical-align','middle','important');});});
  }
  function alignAll(root){root=root||document;Array.prototype.forEach.call(root.querySelectorAll('.rh-comp-table'),alignGrid);Array.prototype.forEach.call(root.querySelectorAll('.modal table,.rh-detail-card table,#rh-detail-modal table'),alignTable);}
  window.rhAlignPopupColumns=alignAll;
  var oldTotals=window.rhEnsurePopupTotals;if(typeof oldTotals==='function')window.rhEnsurePopupTotals=function(root){var r=oldTotals.apply(this,arguments);requestAnimationFrame(function(){alignAll(root||document);});return r;};
  var oldGeneric=window.openGenericDetail;if(typeof oldGeneric==='function')window.openGenericDetail=function(){var r=oldGeneric.apply(this,arguments);requestAnimationFrame(function(){alignAll(document);});return r;};
  var oldPerson=window.openPerson;if(typeof oldPerson==='function')window.openPerson=function(){var r=oldPerson.apply(this,arguments);requestAnimationFrame(function(){alignAll(document);});return r;};
  var mo=new MutationObserver(function(muts){if(muts.some(function(m){return m.type==='childList'||(m.type==='attributes'&&m.attributeName==='hidden');}))requestAnimationFrame(function(){alignAll(document);});});
  if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  if(!document.getElementById('_rh_v19_popup_columns')){var st=document.createElement('style');st.id='_rh_v19_popup_columns';st.textContent='.rh-comp-table{width:100%!important}.rh-comp-row{column-gap:0!important}.rh-comp-row>div{padding-left:14px!important;padding-right:14px!important}.rh-comp-header>div,.rh-comp-total>div{white-space:nowrap!important}.rh-comp-total{width:100%!important}.rh-comp-total .rh-comp-cell{font-variant-numeric:tabular-nums}';document.head.appendChild(st);}
  requestAnimationFrame(function(){alignAll(document);});
})();
