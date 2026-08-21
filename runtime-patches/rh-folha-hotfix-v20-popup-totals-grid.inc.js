/* RH & Folha — hotfix v20: grade única e total identificado em todas as colunas dos popups */
(function(){
  'use strict';
  function arr(x){return Array.prototype.slice.call(x||[]);}
  function txt(el){return String(el&&el.textContent||'').trim();}
  function numericHeader(h){return /valor|total|provento|desconto|líquido|liquido|fgts|inss|pis|irrf|custo|benef|salário|salario|base|encargo|rat|terceir|patronal|retido|média|media|%|pessoas|quantidade|qtd|ref\.?/i.test(h||'');}
  function textualHeader(h){return /colaborador|nome|departamento|vínculo|vinculo|cargo|situação|situacao|rubrica|nota|descrição|descricao|tipo|competência|competencia|status/i.test(h||'');}
  function parseValue(v){
    v=String(v==null?'':v).trim();if(!v||v==='—'||v==='-')return null;
    var money=/R\$/.test(v),pct=/%/.test(v);
    var clean=v.replace(/[^0-9,.-]/g,'');if(!clean)return null;
    var n=Number(clean.replace(/\./g,'').replace(',','.'));if(!isFinite(n))return null;
    return {value:n,money:money,pct:pct};
  }
  function aggregate(values,header){
    var p=values.map(parseValue).filter(Boolean);if(!p.length)return null;
    if(p.some(function(x){return x.pct;})){
      var avg=p.reduce(function(a,x){return a+x.value;},0)/p.length;
      return {text:avg.toFixed(1).replace('.',',')+'%',kind:'avg'};
    }
    var total=p.reduce(function(a,x){return a+x.value;},0),money=p.some(function(x){return x.money;});
    return {text:money?fmt(total):nfmt(total),kind:'sum'};
  }
  function dataRows(table){
    return arr(table.querySelectorAll('tbody tr')).filter(function(row){
      if(row.classList.contains('group-total')||row.classList.contains('rh-auto-total')||row.classList.contains('rh-v20-total'))return false;
      var cells=arr(row.children);if(!cells.length)return false;
      return !cells.some(function(c){return Number(c.getAttribute('colspan')||1)>1;});
    });
  }
  function setTableGrid(table,heads){
    table.style.setProperty('width','100%','important');
    table.style.setProperty('table-layout','fixed','important');
    var n=heads.length;if(n>=5)table.style.setProperty('min-width',Math.max(860,n*155)+'px','important');
    var cg=table.querySelector('colgroup.rh-v20-cols');if(cg)cg.remove();cg=document.createElement('colgroup');cg.className='rh-v20-cols';
    var first=n>=5?24:(n===4?34:42),rest=n>1?(100-first)/(n-1):100;
    heads.forEach(function(h,i){var col=document.createElement('col');col.style.width=(i===0?first:rest)+'%';cg.appendChild(col);});
    table.insertBefore(cg,table.firstChild);
    arr(table.querySelectorAll('tr')).forEach(function(row){arr(row.children).forEach(function(cell,i){
      var h=heads[i]||'';cell.style.setProperty('box-sizing','border-box','important');cell.style.setProperty('vertical-align','middle','important');
      cell.style.setProperty('text-align',(numericHeader(h)&&!textualHeader(h))?'right':'left','important');
      if(i>0&&numericHeader(h))cell.style.setProperty('font-variant-numeric','tabular-nums','important');
    });});
    var card=table.closest('.modal-card,.rh-detail-card');if(card){
      var width=n>=5?'min(1180px,96vw)':(n>=4?'min(980px,96vw)':'min(760px,96vw)');
      card.style.setProperty('width',width,'important');card.style.setProperty('max-width',width,'important');
    }
  }
  function rebuildTableTotal(table){
    var heads=arr(table.querySelectorAll('thead th')).map(txt);if(!heads.length)return;
    setTableGrid(table,heads);var rows=dataRows(table);if(!rows.length)return;
    var old=table.querySelector('tfoot');if(old)old.remove();
    var foot=document.createElement('tfoot'),tr=document.createElement('tr');tr.className='rh-v20-total';
    heads.forEach(function(h,i){var td=document.createElement('td');
      if(i===0){td.innerHTML='<b>TOTAL</b><small>'+rows.length+' linha'+(rows.length===1?'':'s')+'</small>';}
      else{
        var values=rows.map(function(r){return txt(r.children[i]);}),ag=aggregate(values,h);
        if(ag&&(numericHeader(h)||values.some(function(v){return /R\$|%/.test(v);})))td.innerHTML='<small>'+esc(h||('Coluna '+(i+1)))+'</small><b>'+esc(ag.text)+'</b>';
        else td.innerHTML='<small>'+esc(h||'')+'</small><b>—</b>';
      }
      tr.appendChild(td);
    });
    foot.appendChild(tr);table.appendChild(foot);table.dataset.rhTotalsReady='1';
  }
  function gridRows(grid){return arr(grid.querySelectorAll('.rh-comp-row')).filter(function(r){return !r.classList.contains('rh-comp-header')&&!r.classList.contains('rh-comp-total')&&!r.classList.contains('rh-v20-total');});}
  function rebuildGridTotal(grid){
    var header=grid.querySelector('.rh-comp-header');if(!header)return;var heads=arr(header.children).map(txt),n=heads.length;if(!n)return;
    var template=n>=5?'minmax(190px,1.45fr) repeat('+(n-1)+',minmax(125px,1fr))':'minmax(190px,1.35fr) repeat('+(n-1)+',minmax(120px,1fr))';
    arr(grid.querySelectorAll('.rh-comp-row')).forEach(function(row){row.style.setProperty('display','grid','important');row.style.setProperty('grid-template-columns',template,'important');row.style.setProperty('width','100%','important');arr(row.children).forEach(function(c,i){c.style.setProperty('text-align',(i>0&&numericHeader(heads[i]))?'right':'left','important');});});
    var rows=gridRows(grid);if(!rows.length)return;arr(grid.querySelectorAll('.rh-comp-total,.rh-v20-total')).forEach(function(x){x.remove();});
    var total=document.createElement('div');total.className='rh-comp-row rh-comp-total rh-v20-total';total.style.setProperty('grid-template-columns',template,'important');
    heads.forEach(function(h,i){var c=document.createElement('div');c.className='rh-comp-cell';
      if(i===0)c.innerHTML='<b>TOTAL</b><small>'+rows.length+' linha'+(rows.length===1?'':'s')+'</small>';
      else{var vals=rows.map(function(r){return txt(r.children[i]);}),ag=aggregate(vals,h);c.innerHTML='<small>'+esc(h||('Coluna '+(i+1)))+'</small><b>'+esc(ag?ag.text:'—')+'</b>';}
      total.appendChild(c);
    });grid.appendChild(total);grid.dataset.rhTotalsReady='1';
  }
  function fixAll(root){
    root=root||document;
    arr(root.querySelectorAll('.modal:not([hidden]) table,#rh-detail-modal:not([hidden]) table,.rh-detail-card table')).forEach(rebuildTableTotal);
    arr(root.querySelectorAll('.modal:not([hidden]) .rh-comp-table,#rh-detail-modal:not([hidden]) .rh-comp-table,.rh-detail-card .rh-comp-table')).forEach(rebuildGridTotal);
  }
  window.rhV20FixAllPopupTotals=fixAll;
  var scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;fixAll(document);});}
  var mo=new MutationObserver(function(m){if(m.some(function(x){return x.type==='childList'||(x.type==='attributes'&&x.attributeName==='hidden');}))schedule();});
  if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  document.addEventListener('click',function(){setTimeout(schedule,0);},true);
  if(!document.getElementById('_rh_v20_popup_totals')){var st=document.createElement('style');st.id='_rh_v20_popup_totals';st.textContent='\
.modal-table-inner tfoot,.responsive-table tfoot,.modal table tfoot{position:static!important;display:table-footer-group!important;width:auto!important}\
.modal table tfoot td,.modal-table-inner tfoot td,.rh-detail-card table tfoot td{position:sticky!important;bottom:0!important;z-index:5!important;background:var(--surface)!important;border-top:2px solid var(--gold)!important;box-shadow:0 -4px 12px rgba(0,0,0,.12);white-space:nowrap!important}\
.rh-v20-total td small,.rh-v20-total .rh-comp-cell small{display:block!important;color:var(--muted)!important;font-size:9px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.04em!important;margin-bottom:3px!important}\
.rh-v20-total td b,.rh-v20-total .rh-comp-cell b{display:block!important;font-variant-numeric:tabular-nums!important;white-space:nowrap!important}\
.rh-comp-table{overflow-x:auto!important;width:100%!important}.rh-comp-row{column-gap:0!important}.rh-comp-row>div{padding-left:12px!important;padding-right:12px!important;min-width:0!important}\
';document.head.appendChild(st);}
  schedule();
})();
