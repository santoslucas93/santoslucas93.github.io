/* RH & Folha — hotfix v20 revisado: uma única grade real para cabeçalho, corpo e totais */
(function(){
  'use strict';
  function arr(x){return Array.prototype.slice.call(x||[]);}
  function txt(el){return String(el&&el.textContent||'').replace(/\s+/g,' ').trim();}
  function isRhMobile(){return !!(document.documentElement&&document.documentElement.dataset&&document.documentElement.dataset.lnbMobileShell);}
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
  function isCostCenterHeader(value){return /^(centro\s+de\s+custo|cc)$/i.test(txt({textContent:value}));}
  function stripCostCenterTable(table){
    if(!table||table.dataset.rhNoCostCenter==='1')return;
    var head=table.querySelector('thead tr:first-child');if(!head)return;
    var indexes=visibleCells(head).map(function(c,i){return isCostCenterHeader(txt(c))?i:-1;}).filter(function(i){return i>=0;}).sort(function(a,b){return b-a;});
    if(!indexes.length){table.dataset.rhNoCostCenter='1';return;}
    arr(table.querySelectorAll('tr')).forEach(function(row){indexes.forEach(function(i){var cells=visibleCells(row);if(cells[i])cells[i].remove();});});
    arr(table.querySelectorAll('colgroup')).forEach(function(group){indexes.forEach(function(i){var cols=arr(group.children);if(cols[i])cols[i].remove();});});
    table.dataset.rhNoCostCenter='1';
  }
  function stripCostCenterGrid(grid){
    if(!grid||grid.dataset.rhNoCostCenter==='1')return;
    var header=grid.querySelector('.rh-comp-header');if(!header)return;
    var indexes=visibleCells(header).map(function(c,i){return isCostCenterHeader(txt(c))?i:-1;}).filter(function(i){return i>=0;}).sort(function(a,b){return b-a;});
    if(!indexes.length){grid.dataset.rhNoCostCenter='1';return;}
    arr(grid.querySelectorAll('.rh-comp-row')).forEach(function(row){indexes.forEach(function(i){var cells=visibleCells(row);if(cells[i])cells[i].remove();});});
    grid.dataset.rhNoCostCenter='1';
  }
  function tableRows(table){
    return arr(table.querySelectorAll('tbody tr')).filter(function(row){
      if(row.classList.contains('group-total')||row.classList.contains('rh-auto-total')||row.classList.contains('rh-v20-total'))return false;
      var cells=visibleCells(row);if(!cells.length)return false;
      return !cells.some(function(c){return Number(c.getAttribute('colspan')||1)>1;});
    });
  }
  function columnWeight(header,index,n){
    var h=String(header||'');
    if(/colaborador|empregado|pessoa/i.test(h))return 2.8;
    if(/departamento/i.test(h))return 1.65;
    if(/centro de custo|\bcc\b/i.test(h))return 1.45;
    if(/componente|rubrica|indicador|tratamento|movimenta|detalhe|natureza/i.test(h))return 2.1;
    if(/al[ií]quota|%|quantidade|qtd|pessoas/i.test(h))return .9;
    if(n===2&&index===0)return 2.1;
    return numericHeader(h)?1.25:1.45;
  }
  function widthsFor(heads){
    var n=heads.length,weights=heads.map(function(h,i){return columnWeight(h,i,n);}),sum=weights.reduce(function(a,x){return a+x;},0)||1;
    return weights.map(function(w){return w/sum*100;});
  }
  function tableSignature(table,heads,rows){return heads.join('|')+'::'+rows.map(function(r){return visibleCells(r).map(txt).join('|');}).join('||');}
  function fitMobileOwner(owner){
    owner.dataset.rhMobileLayout='cards';
    var card=owner.closest('.modal-card,.rh-detail-card');
    if(card){card.style.setProperty('width','100%','important');card.style.setProperty('max-width','100%','important');card.style.setProperty('min-width','0','important');card.style.setProperty('height','auto','important');card.style.setProperty('overflow-x','hidden','important');}
    var modal=owner.closest('.modal,#rh-detail-modal,[role="dialog"]');if(modal)modal.style.setProperty('overflow-x','hidden','important');
  }
  function mobileCell(cell,label){
    cell.dataset.lnbLabel=label||'Informação';cell.dataset.label=label||'Informação';
    cell.style.setProperty('display','grid','important');cell.style.setProperty('grid-template-columns','minmax(88px,38%) minmax(0,1fr)','important');cell.style.setProperty('align-items','center','important');cell.style.setProperty('gap','9px','important');cell.style.setProperty('width','100%','important');cell.style.setProperty('max-width','100%','important');cell.style.setProperty('min-width','0','important');cell.style.setProperty('box-sizing','border-box','important');cell.style.setProperty('padding','7px 10px','important');cell.style.setProperty('white-space','normal','important');cell.style.setProperty('overflow-wrap','anywhere','important');cell.style.setProperty('word-break','normal','important');cell.style.setProperty('text-align','right','important');
  }
  function mobileSectionCell(cell){
    cell.dataset.lnbLabel='';cell.dataset.label='';cell.style.setProperty('display','block','important');cell.style.setProperty('grid-template-columns','1fr','important');cell.style.setProperty('width','100%','important');cell.style.setProperty('max-width','100%','important');cell.style.setProperty('min-width','0','important');cell.style.setProperty('box-sizing','border-box','important');cell.style.setProperty('white-space','normal','important');cell.style.setProperty('overflow-wrap','anywhere','important');cell.style.setProperty('word-break','normal','important');cell.style.setProperty('text-align','left','important');
  }
  function mobileTable(table,heads){
    var wrap=table.parentElement;
    if(!wrap||!wrap.classList.contains('lnb-mobile-table-host')){wrap=document.createElement('div');wrap.className='lnb-mobile-table-host';table.parentNode.insertBefore(wrap,table);wrap.appendChild(table);}
    wrap.classList.add('lnb-mobile-table-cards');wrap.classList.remove('lnb-mobile-table-plain','lnb-mobile-table-scroll');wrap.style.setProperty('width','100%','important');wrap.style.setProperty('max-width','100%','important');wrap.style.setProperty('min-width','0','important');wrap.style.setProperty('overflow-x','hidden','important');
    arr(table.querySelectorAll('colgroup')).forEach(function(group){group.remove();});
    table.style.setProperty('display','block','important');table.style.setProperty('width','100%','important');table.style.setProperty('max-width','100%','important');table.style.setProperty('min-width','0','important');table.style.setProperty('table-layout','auto','important');table.style.setProperty('border-collapse','separate','important');
    var thead=table.querySelector('thead');if(thead)thead.style.setProperty('display','none','important');
    arr(table.querySelectorAll('tbody,tfoot')).forEach(function(section){section.style.setProperty('display','grid','important');section.style.setProperty('grid-template-columns','1fr','important');section.style.setProperty('width','100%','important');section.style.setProperty('max-width','100%','important');section.style.setProperty('min-width','0','important');});
    arr(table.querySelectorAll('tbody tr,tfoot tr')).forEach(function(row){
      row.style.setProperty('display','block','important');row.style.setProperty('grid-template-columns','1fr','important');row.style.setProperty('width','100%','important');row.style.setProperty('max-width','100%','important');row.style.setProperty('min-width','0','important');row.style.setProperty('box-sizing','border-box','important');
      arr(row.children).forEach(function(cell,i){if(Number(cell.getAttribute('colspan')||1)>1)mobileSectionCell(cell);else mobileCell(cell,heads[i]||(i===heads.length-1?'Ações':'Informação'));});
    });
    fitMobileOwner(table);
  }
  function setTableGrid(table,heads){
    if(isRhMobile()){mobileTable(table,heads);return;}
    var n=heads.length,widths=widthsFor(heads);
    table.style.setProperty('width','100%','important');
    table.style.setProperty('table-layout','fixed','important');
    table.style.setProperty('border-collapse','collapse','important');
    if(n>=5)table.style.setProperty('min-width',Math.max(900,n*150)+'px','important');else table.style.removeProperty('min-width');
    /* Um único colgroup é soberano. Manter o colgroup original junto do
       normalizado duplica as colunas lógicas e comprime a tabela à metade. */
    arr(table.querySelectorAll('colgroup')).forEach(function(x){x.remove();});
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
    if(!table)return;stripCostCenterTable(table);var headCells=arr(table.querySelectorAll('thead tr:first-child th')).filter(function(c){return getComputedStyle(c).display!=='none';});
    var heads=headCells.map(txt);if(!heads.length)return;var semantic=table.querySelector('tfoot tr:not(.rh-auto-total):not(.rh-v20-total)');
    if(semantic){table.dataset.rhSemanticTotal='1';setTableGrid(table,heads);return;}
    var rows=tableRows(table);if(!rows.length){setTableGrid(table,heads);return;}
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
  function mobileGrid(grid,heads,header,rows,total){
    grid.style.setProperty('display','block','important');grid.style.setProperty('grid-template-columns','1fr','important');grid.style.setProperty('width','100%','important');grid.style.setProperty('max-width','100%','important');grid.style.setProperty('min-width','0','important');grid.style.setProperty('overflow-x','hidden','important');
    header.style.setProperty('display','none','important');
    rows.concat(total?[total]:[]).forEach(function(row){
      row.style.setProperty('display','block','important');row.style.setProperty('grid-template-columns','1fr','important');row.style.setProperty('column-gap','0','important');row.style.setProperty('width','100%','important');row.style.setProperty('max-width','100%','important');row.style.setProperty('min-width','0','important');row.style.setProperty('box-sizing','border-box','important');
      arr(row.children).forEach(function(cell,i){mobileCell(cell,heads[i]||(i===heads.length-1?'Ações':'Informação'));});
    });
    fitMobileOwner(grid);
  }
  function rebuildGrid(grid){
    if(!grid)return;stripCostCenterGrid(grid);var header=grid.querySelector('.rh-comp-header');if(!header)return;var headCells=visibleCells(header),heads=headCells.map(txt),n=heads.length;if(!n)return;
    var widths=widthsFor(heads),template=widths.map(function(w){return 'minmax(0,'+w+'fr)';}).join(' '),rows=gridRows(grid);if(!rows.length){if(isRhMobile())mobileGrid(grid,heads,header,rows,null);return;}
    var semantic=grid.querySelector('.rh-comp-total:not(.rh-auto-total):not(.rh-v20-total)');
    if(semantic){
      grid.dataset.rhSemanticTotal='1';
      if(isRhMobile()){mobileGrid(grid,heads,header,rows,semantic);return;}
      [header].concat(rows,[semantic]).forEach(function(row){
        row.style.setProperty('display','grid','important');row.style.setProperty('grid-template-columns',template,'important');row.style.setProperty('column-gap','0','important');row.style.setProperty('width','100%','important');row.style.setProperty('box-sizing','border-box','important');
        visibleCells(row).forEach(function(c,i){c.style.setProperty('width','auto','important');c.style.setProperty('min-width','0','important');c.style.setProperty('box-sizing','border-box','important');c.style.setProperty('padding-left','12px','important');c.style.setProperty('padding-right','12px','important');c.style.setProperty('text-align',(i>0&&numericHeader(heads[i]))?'right':'left','important');if(i>0&&numericHeader(heads[i]))c.style.setProperty('font-variant-numeric','tabular-nums','important');});
      });
      var semanticCard=grid.closest('.modal-card,.rh-detail-card');if(semanticCard){var semanticWidth=n>=6?'min(1420px,98vw)':(n>=5?'min(1240px,98vw)':'min(980px,96vw)');semanticCard.style.setProperty('width',semanticWidth,'important');semanticCard.style.setProperty('max-width',semanticWidth,'important');}
      return;
    }
    var sig=gridSignature(heads,rows),total=grid.querySelector('.rh-v20-total');
    if(grid.dataset.rhV20Signature!==sig||!total){
      grid.dataset.rhV20Signature=sig;arr(grid.querySelectorAll('.rh-comp-total,.rh-v20-total')).forEach(function(x){x.remove();});
      total=document.createElement('div');total.className='rh-comp-row rh-comp-total rh-v20-total';
      heads.forEach(function(h,i){var c=document.createElement('div');c.className='rh-comp-cell';if(i===0)c.innerHTML='<b>TOTAL</b><small>'+rows.length+' linha'+(rows.length===1?'':'s')+'</small>';else{var vals=rows.map(function(r){return txt(visibleCells(r)[i]);}),ag=shouldAggregate(h,vals)?aggregate(vals):null;c.innerHTML='<b>'+(ag?esc(ag):'—')+'</b>';}total.appendChild(c);});grid.appendChild(total);
    }
    if(isRhMobile()){mobileGrid(grid,heads,header,rows,total);return;}
    var all=[header].concat(rows,[total]);all.forEach(function(row){
      row.style.setProperty('display','grid','important');row.style.setProperty('grid-template-columns',template,'important');row.style.setProperty('column-gap','0','important');row.style.setProperty('width','100%','important');row.style.setProperty('box-sizing','border-box','important');
      visibleCells(row).forEach(function(c,i){c.style.setProperty('width','auto','important');c.style.setProperty('min-width','0','important');c.style.setProperty('box-sizing','border-box','important');c.style.setProperty('padding-left','12px','important');c.style.setProperty('padding-right','12px','important');c.style.setProperty('text-align',(i>0&&numericHeader(heads[i]))?'right':'left','important');if(i>0&&numericHeader(heads[i]))c.style.setProperty('font-variant-numeric','tabular-nums','important');});
    });
    var card=grid.closest('.modal-card,.rh-detail-card');if(card){var width=n>=6?'min(1420px,98vw)':(n>=5?'min(1240px,98vw)':'min(980px,96vw)');card.style.setProperty('width',width,'important');card.style.setProperty('max-width',width,'important');}
  }
  function fixAll(root){root=root||document;arr(root.querySelectorAll('.modal:not([hidden]) table,#rh-detail-modal:not([hidden]) table,.rh-detail-card table,#rh47-forecast-modal table,#rh48-modal table,[role="dialog"] table')).forEach(rebuildTable);arr(root.querySelectorAll('.modal:not([hidden]) .rh-comp-table,#rh-detail-modal:not([hidden]) .rh-comp-table,.rh-detail-card .rh-comp-table,[role="dialog"] .rh-comp-table')).forEach(rebuildGrid);}
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
html[data-lnb-mobile-shell] .rh-comp-table{overflow-x:hidden!important}html[data-lnb-mobile-shell] .rh-comp-header{display:none!important}html[data-lnb-mobile-shell] .rh-comp-cell::before,html[data-lnb-mobile-shell] .lnb-mobile-table-cards td::before{content:attr(data-label);color:var(--muted)!important;font-size:9px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.05em!important;text-align:left!important;white-space:normal!important}html[data-lnb-mobile-shell] .lnb-mobile-table-cards td::before{content:attr(data-lnb-label)}\
';document.head.appendChild(st);}
  schedule();
})();
