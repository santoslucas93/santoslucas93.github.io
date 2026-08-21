/* RH & Folha — hotfix v21: referência de competências/mês dentro dos popups consolidados */
(function(){
  'use strict';
  function arr(x){return Array.prototype.slice.call(x||[]);}
  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();}
  function active(){return (window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(typeof rhPeriodSelectedCompetences==='function'?rhPeriodSelectedCompetences():[])).slice().sort(function(a,b){return String(a.competencia||'').localeCompare(String(b.competencia||''));});}
  function compLabel(c){try{return _rhPeriodBaseFormatCompetence? _rhPeriodBaseFormatCompetence(c.competencia):formatCompetence(c.competencia);}catch(e){return String(c&&c.competencia||'').slice(0,7);}}
  function allLabels(){return active().map(compLabel);}
  function personMap(){var m={};(S.pessoas||[]).forEach(function(p){m[norm(p.nome)] = p;});return m;}
  function labelsForPerson(p){
    if(!p)return allLabels();var ids=(p.competencias||[]).map(String),comps=active();
    var list=ids.length?comps.filter(function(c){return ids.indexOf(String(c.id))>=0;}):comps;
    return list.map(compLabel);
  }
  function summaryText(labels){
    if(!labels.length)return 'Sem competência identificada';
    if(labels.length<=6)return labels.join(' · ');
    return labels.slice(0,3).join(' · ')+' · … · '+labels.slice(-2).join(' · ')+' ('+labels.length+' competências)';
  }
  function ensureBand(modal){
    if(!modal||modal.hidden)return;var labels=allLabels();if(labels.length<=1)return;
    var card=modal.querySelector('.modal-card,.rh-detail-card')||modal;
    var head=card.querySelector('.modal-head,.rh-detail-head,.detail-head');if(!head)return;
    var band=card.querySelector('.rh-v21-period-band');if(!band){band=document.createElement('div');band.className='rh-v21-period-band';head.insertAdjacentElement('afterend',band);}
    band.innerHTML='<b>Referência dos valores consolidados</b><span>'+esc(summaryText(labels))+'</span>';
  }
  function addTableRef(table){
    var labels=allLabels();if(labels.length<=1||!table||table.dataset.rhV21Refs==='1')return;
    var heads=arr(table.querySelectorAll('thead th')).map(function(x){return x.textContent.trim();});if(!heads.length)return;
    var first=heads[0]||'';if(!/colaborador|nome|pessoa/i.test(first))return;
    var th=document.createElement('th');th.textContent='Competências';th.className='rh-v21-ref-head';var hr=table.querySelector('thead tr');if(!hr)return;hr.insertBefore(th,hr.children[1]||null);
    var pm=personMap();arr(table.querySelectorAll('tbody tr')).forEach(function(row){
      if(arr(row.children).some(function(c){return Number(c.getAttribute('colspan')||1)>1;}))return;
      var who=norm(row.children[0]&&row.children[0].textContent),p=pm[who],td=document.createElement('td');td.className='rh-v21-ref-cell';
      var ls=labelsForPerson(p);td.innerHTML='<span title="'+esc(ls.join(' · '))+'">'+esc(summaryText(ls))+'</span>';row.insertBefore(td,row.children[1]||null);
    });
    table.dataset.rhV21Refs='1';
  }
  function addGridRef(grid){
    var labels=allLabels();if(labels.length<=1||!grid||grid.dataset.rhV21Refs==='1')return;
    var header=grid.querySelector('.rh-comp-header');if(!header)return;var first=header.children[0]&&header.children[0].textContent||'';if(!/colaborador|nome|pessoa/i.test(first))return;
    var hc=document.createElement('div');hc.className='rh-comp-cell rh-v21-ref-head';hc.textContent='Competências';header.insertBefore(hc,header.children[1]||null);
    var pm=personMap();arr(grid.querySelectorAll('.rh-comp-row')).forEach(function(row){
      if(row===header||row.classList.contains('rh-comp-total')||row.classList.contains('rh-v20-total'))return;
      var who=norm(row.children[0]&&row.children[0].textContent),p=pm[who],c=document.createElement('div');c.className='rh-comp-cell rh-v21-ref-cell';var ls=labelsForPerson(p);c.innerHTML='<span title="'+esc(ls.join(' · '))+'">'+esc(summaryText(ls))+'</span>';row.insertBefore(c,row.children[1]||null);
    });
    grid.dataset.rhV21Refs='1';
  }
  function fix(root){root=root||document;var labels=allLabels();if(labels.length<=1)return;
    arr(root.querySelectorAll('.modal:not([hidden]),#rh-detail-modal:not([hidden])')).forEach(ensureBand);
    arr(root.querySelectorAll('.modal:not([hidden]) table,#rh-detail-modal:not([hidden]) table,.rh-detail-card table')).forEach(addTableRef);
    arr(root.querySelectorAll('.modal:not([hidden]) .rh-comp-table,#rh-detail-modal:not([hidden]) .rh-comp-table,.rh-detail-card .rh-comp-table')).forEach(addGridRef);
    if(typeof window.rhV20FixAllPopupTotals==='function')window.rhV20FixAllPopupTotals(root);
  }
  window.rhV21ApplyPopupPeriodReferences=fix;
  var queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;fix(document);});}
  var mo=new MutationObserver(function(m){if(m.some(function(x){return x.type==='childList'||(x.type==='attributes'&&x.attributeName==='hidden');}))schedule();});
  if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  document.addEventListener('click',function(){setTimeout(schedule,0);},true);
  if(!document.getElementById('_rh_v21_period_refs')){var st=document.createElement('style');st.id='_rh_v21_period_refs';st.textContent='\
.rh-v21-period-band{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 16px;border-bottom:1px solid var(--line-soft);background:color-mix(in srgb,var(--gold) 7%,var(--surface));font-size:11px}.rh-v21-period-band b{color:var(--gold-2)}.rh-v21-period-band span{color:var(--muted)}\
.rh-v21-ref-cell{font-size:10px!important;color:var(--muted)!important;white-space:nowrap!important}.rh-v21-ref-cell span{display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis}.rh-v21-ref-head{white-space:nowrap!important}\
';document.head.appendChild(st);}
  schedule();
})();
