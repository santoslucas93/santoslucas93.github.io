/* RH & Folha — hotfix v21 revisado: mês apenas para competência única; múltiplas competências = Consolidado */
(function(){
  'use strict';
  function active(){return (window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(typeof rhPeriodSelectedCompetences==='function'?rhPeriodSelectedCompetences():[])).slice();}
  function compLabel(c){try{return _rhPeriodBaseFormatCompetence?_rhPeriodBaseFormatCompetence(c.competencia):formatCompetence(c.competencia);}catch(e){return String(c&&c.competencia||'').slice(0,7);}}
  function referenceLabel(){var a=active();if(a.length===1)return compLabel(a[0]);if(a.length>1)return 'Consolidado';return '—';}
  function stamp(modal){
    if(!modal||modal.hidden)return;var card=modal.querySelector('.modal-card,.rh-detail-card')||modal,head=card.querySelector('.modal-head,.rh-detail-head,.detail-head');if(!head)return;
    var oldBand=card.querySelector('.rh-v21-period-band');if(oldBand)oldBand.style.display='none';
    var chip=head.querySelector('.rh-period-chip-modal');if(!chip){chip=document.createElement('span');chip.className='rh-period-chip-modal';var target=head.querySelector('div')||head;target.appendChild(chip);}var text='Referência: '+referenceLabel();if(chip.textContent!==text)chip.textContent=text;
  }
  function fix(root){root=root||document;Array.prototype.forEach.call(root.querySelectorAll('.modal:not([hidden]),#rh-detail-modal:not([hidden])'),stamp);if(typeof window.rhV20FixAllPopupTotals==='function')window.rhV20FixAllPopupTotals(root);}
  window.rhV21ApplyPopupPeriodReferences=fix;
  var queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;fix(document);});}
  var mo=new MutationObserver(function(m){if(m.some(function(x){return x.type==='childList'||(x.type==='attributes'&&x.attributeName==='hidden');}))schedule();});
  if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  document.addEventListener('click',function(){setTimeout(schedule,0);},true);
  if(!document.getElementById('_rh_v21_period_refs')){var st=document.createElement('style');st.id='_rh_v21_period_refs';st.textContent='.rh-v21-period-band,.rh-v21-ref-head,.rh-v21-ref-cell{display:none!important}.rh-period-chip-modal{white-space:nowrap}';document.head.appendChild(st);}
  schedule();
})();
