/* RH & Folha — hotfix v20 revisado: uma única grade real para cabeçalho, corpo e totais */
(function(){
  'use strict';
  function arr(x){return Array.prototype.slice.call(x||[]);}
  function txt(el){return String(el&&el.textContent||'').replace(/\s+/g,' ').trim();}
  function numericHeader(h){return /valor|total|provento|desconto|líquido|liquido|fgts|inss|pis|irrf|custo|benef|salário|salario|base|encargo|rat|terceir|patronal|retido|média|media|%|pessoas|quantidade|qtd|ref\.?/i.test(String(h||''));}
  function parseValue(v){
    v=String(v==null?'':v).trim();if(!v||v==='—'||v==='-')return null;
    var money=/R\$/.test(v),pct=/%/.test(v),clean=v.replace(/[^0-9,.-]/g,'');if(!clean)return null;
    var n=Number(clean.replace(/\./g,'').replace(',','.'));if(!isFinite(n))return null;
    return {value:n,money:money,pct:pct};
  }
  function aggregate(values){
    var p=values.map(parseValue).filter(Boolean);if(!p.length)return null;
    if(p.some(function(x){return x.pct;})){
      var avg=p.reduce(function(a,x){return a+x.value;},0)/p.length;
      return 'Média '+avg.toFixed(1).replace('.',',')+'%';
    }
    var total=p.reduce(function(a,x){return a+x.value;},0),money=p.some(function(x){return x.money;});
    return money?fmt(total):nfmt(total);
  }
  function shouldAggregate(header,values){return numericHeader(header)||(values||[]).some(function(v){return /R\$|%/.test(String(v||''));});}
  function visibleCells(row){return arr(row&&row.children).filter(function(c){return getComputedStyle(c).display!=='none';});}
  function tableRows(table){
    return arr(table.querySelectorAll('tbody tr')).filter(function(row){
      if(row.classList.contains('group-total')||row.classList.contains('rh-auto-total')||row.classList.contains('rh-v20-total'))return false;
      var cells=visibleCells(row);if(!cells.length)return false;
      return !cells.some(function(c){return Number(c.getAttribute('colspan')||1)>1;});
    });
  }
  function widthsFor(n){
    if(n>=7)return [30].concat(Array(n-1).fill(70/(n-1)));
    if(n===6)return [31,13.8,13.8,13.8,13.8,13.8];
    if(n===5)return [34,16.5,16.5,16.5,16.5];
    if(n===4)return [40,20,20,20];
    if(n===3)return [44,28,28];
    if(n===2)return [58,42];
    return [100];
  }
  function tableSignature(table,heads,rows){return heads.join('|')+'::'+rows.map(function(r){return visibleCells(r).map(txt).join('|');}).join('||');}
  function setTableGrid(table,heads){
    var n=heads.length,widths=widthsFor(n);
    table.style.setProperty('width','100%','important');
    table.style.setProperty('table-layout','fixed','important');
    table.style.setProperty('border-collapse','collapse','important');
    if(n>=5)table.style.setProperty('min-width',Math.max(900,n*150)+'px','important');else table.style.removeProperty('min-width');
    arr(table.querySelectorAll('colgroup.rh-v20-cols')).forEach(function(x){x.remove();});
    var cg=document.createElement('colgroup');cg.className='rh-v20-cols';
    widths.forEach(function(w){var col=document.createElement('col');col.style.width=w+'%';cg.appendChild(col);});
    table.insertBefore(cg,table.firstChild);
    arr(table.querySelectorAll('tr')).forEach(function(row){
      var cells=visibleCells(row);cells.forEach(function(cell,i){
        cell.style.setProperty('width','auto','important');cell.style.setProperty('min-width','0','important');cell.style.setProperty('box-sizing','border-box','important');cell.style.setProperty('vertical-align','middle','important');
        cell.style.setProperty('padding-left','12px','important');cell.style.setProperty('padding-right','12px','important');
        cell.style.setProperty('text-align',(i>0&&numericHeader(heads[i]))?'right':'left','important');
        if(i>0&&numericHeader(heads[i]))cell.style.setProperty('font-variant-numeric','tabular-nums','important');
      });
    });
    var card=table.closest('.modal-card,.rh-detail-card');if(card){var width=n>=6?'min(1420px,98vw)':(n>=5?'min(1240px,98vw)':'min(980px,96vw)');card.style.setProperty('width',width,'important');card.style.setProperty('max-width',width,'important');}
  }
  function rebuildTable(table){
    if(!table)return;var headCells=arr(table.querySelectorAll('thead tr:first-child th')).filter(function(c){return getComputedStyle(c).display!=='none';});
    var heads=headCells.map(txt);if(!heads.length)return;var rows=tableRows(table);if(!rows.length){setTableGrid(table,heads);return;}
    var sig=tableSignature(table,heads,rows),existing=table.querySelector('tfoot.rh-v20-foot');
    if(table.dataset.rhV20Signature===sig&&existing){setTableGrid(table,heads);return;}
    table.dataset.rhV20Signature=sig;arr(table.querySelectorAll('tfoot')).forEach(function(x){x.remove();});
    var foot=document.createElement('tfoot');foot.className='rh-v20-foot';var tr=document.createElement('tr');tr.className='rh-v20-total';
    heads.forEach(function(h,i){var td=document.createElement('td');if(i===0){td.innerHTML='<b>TOTAL</b><small>'+rows.length+' linha'+(rows.length===1?'':'s')+'</small>';}
      else{var values=rows.map(function(r){return txt(visibleCells(r)[i]);}),ag=shouldAggregate(h,values)?aggregate(values):null;td.innerHTML='<b>'+(ag?esc(ag):'—')+'</b>';}
      tr.appendChild(td);});
    foot.appendChild(tr);table.appendChild(foot);setTableGrid(table,heads);
  }
  function gridRows(grid){return arr(grid.querySelectorAll('.rh-comp-row')).filter(function(r){return !r.classList.contains('rh-comp-header')&&!r.classList.contains('rh-comp-total')&&!r.classList.contains('rh-v20-total');});}
  function gridSignature(heads,rows){return heads.join('|')+'::'+rows.map(function(r){return visibleCells(r).map(txt).join('|');}).join('||');}
  function rebuildGrid(grid){
    if(!grid)return;var header=grid.querySelector('.rh-comp-header');if(!header)return;var headCells=visibleCells(header),heads=headCells.map(txt),n=heads.length;if(!n)return;
    var widths=widthsFor(n),template=widths.map(function(w){return 'minmax(0,'+w+'fr)';}).join(' '),rows=gridRows(grid);if(!rows.length)return;
    var sig=gridSignature(heads,rows),total=grid.querySelector('.rh-v20-total');
    if(grid.dataset.rhV20Signature!==sig||!total){
      grid.dataset.rhV20Signature=sig;arr(grid.querySelectorAll('.rh-comp-total,.rh-v20-total')).forEach(function(x){x.remove();});
      total=document.createElement('div');total.className='rh-comp-row rh-comp-total rh-v20-total';
      heads.forEach(function(h,i){var c=document.createElement('div');c.className='rh-comp-cell';if(i===0)c.innerHTML='<b>TOTAL</b><small>'+rows.length+' linha'+(rows.length===1?'':'s')+'</small>';else{var vals=rows.map(function(r){return txt(visibleCells(r)[i]);}),ag=shouldAggregate(h,vals)?aggregate(vals):null;c.innerHTML='<b>'+(ag?esc(ag):'—')+'</b>';}total.appendChild(c);});grid.appendChild(total);
    }
    var all=[header].concat(rows,[total]);all.forEach(function(row){
      row.style.setProperty('display','grid','important');row.style.setProperty('grid-template-columns',template,'important');row.style.setProperty('column-gap','0','important');row.style.setProperty('width','100%','important');row.style.setProperty('box-sizing','border-box','important');
      visibleCells(row).forEach(function(c,i){c.style.setProperty('width','auto','important');c.style.setProperty('min-width','0','important');c.style.setProperty('box-sizing','border-box','important');c.style.setProperty('padding-left','12px','important');c.style.setProperty('padding-right','12px','important');c.style.setProperty('text-align',(i>0&&numericHeader(heads[i]))?'right':'left','important');if(i>0&&numericHeader(heads[i]))c.style.setProperty('font-variant-numeric','tabular-nums','important');});
    });
    var card=grid.closest('.modal-card,.rh-detail-card');if(card){var width=n>=6?'min(1420px,98vw)':(n>=5?'min(1240px,98vw)':'min(980px,96vw)');card.style.setProperty('width',width,'important');card.style.setProperty('max-width',width,'important');}
  }
  function fixAll(root){root=root||document;arr(root.querySelectorAll('.modal:not([hidden]) table,#rh-detail-modal:not([hidden]) table,.rh-detail-card table')).forEach(rebuildTable);arr(root.querySelectorAll('.modal:not([hidden]) .rh-comp-table,#rh-detail-modal:not([hidden]) .rh-comp-table,.rh-detail-card .rh-comp-table')).forEach(rebuildGrid);}
  window.rhV20FixAllPopupTotals=fixAll;
  var queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;fixAll(document);});}
  var mo=new MutationObserver(function(ms){if(ms.some(function(m){return m.type==='childList'||(m.type==='attributes'&&m.attributeName==='hidden');}))schedule();});
  if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  document.addEventListener('click',function(){setTimeout(schedule,0);},true);
  if(!document.getElementById('_rh_v20_popup_totals')){var st=document.createElement('style');st.id='_rh_v20_popup_totals';st.textContent='\
.modal table tfoot,.modal-table-inner tfoot,.responsive-table tfoot,.rh-detail-card table tfoot{position:static!important;display:table-footer-group!important;width:auto!important}\
.modal table tfoot td,.modal-table-inner tfoot td,.rh-detail-card table tfoot td{position:static!important;background:var(--surface)!important;border-top:2px solid var(--gold)!important;box-shadow:none!important;white-space:nowrap!important}\
.rh-v20-total td small,.rh-v20-total .rh-comp-cell small{display:block!important;color:var(--muted)!important;font-size:9px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.04em!important;margin-top:2px!important}\
.rh-v20-total td b,.rh-v20-total .rh-comp-cell b{display:block!important;font-variant-numeric:tabular-nums!important;white-space:nowrap!important}\
.rh-comp-table{overflow-x:auto!important;width:100%!important}.rh-comp-header,.rh-comp-row{column-gap:0!important}.rh-comp-header>div,.rh-comp-row>div{min-width:0!important;box-sizing:border-box!important}\
';document.head.appendChild(st);}
  schedule();
})();
