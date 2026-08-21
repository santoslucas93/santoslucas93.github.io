/* RH & Folha — hotfix v15: encaixe robusto e estável de valores nos cards */
(function(){
  var SELECTOR='.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#custo-real-kpis strong,#payroll-kpis strong,#charges-kpis strong,#movement-kpis strong';
  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function isFilteredTotal(el){
    var card=el&&el.closest&&el.closest('.kpi');if(!card)return false;
    var label=card.querySelector('span');return norm(label&&label.textContent).indexOf('custo total filtrado')>=0;
  }
  function fitOne(el){
    if(!el||!el.parentElement)return;
    var box=el.parentElement,filtered=isFilteredTotal(el),text=String(el.textContent||'').trim();
    var width=Math.round(box.clientWidth||0),sig=text+'|'+width+'|'+(filtered?'filtered':'normal');
    if(el.dataset.rhFitSig===sig)return;
    el.style.setProperty('white-space','nowrap','important');
    el.style.setProperty('display','block','important');
    el.style.setProperty('max-width','100%','important');
    el.style.setProperty('overflow','visible','important');

    /* Custo Total Filtrado: tamanho FIXO por faixa de largura. Não mede o próprio texto e não oscila entre frames. */
    if(filtered){
      var fixed=width>=230?21:(width>=200?19:17);
      el.style.setProperty('font-size',fixed+'px','important');
      el.style.setProperty('letter-spacing','0','important');
      el.style.setProperty('font-variant-numeric','tabular-nums','important');
      el.dataset.rhFit='1';el.dataset.rhFitSig=sig;return;
    }

    el.style.setProperty('font-size','', 'important');
    var cs=getComputedStyle(el),base=parseFloat(cs.fontSize)||34;
    var max=Math.min(base,42),min=15;
    var available=Math.max(36,(box.clientWidth-24)*.96);
    var low=min,high=max,best=min;
    for(var i=0;i<10;i++){
      var mid=(low+high)/2;
      el.style.setProperty('font-size',mid+'px','important');
      var fits=el.scrollWidth<=available;
      if(fits){best=mid;low=mid;}else high=mid;
    }
    best=Math.floor(best*2)/2;
    el.style.setProperty('font-size',best+'px','important');
    el.style.setProperty('letter-spacing',best<22?'-.035em':(best<28?'-.025em':'-.015em'),'important');
    el.dataset.rhFit='1';el.dataset.rhFitSig=sig;
  }
  function fitAll(root){root=root||document;Array.prototype.forEach.call(root.querySelectorAll(SELECTOR),fitOne);}
  var scheduled=false;
  function schedule(force){
    if(force)Array.prototype.forEach.call(document.querySelectorAll(SELECTOR),function(el){delete el.dataset.rhFitSig;});
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(function(){requestAnimationFrame(function(){scheduled=false;fitAll(document);});});
  }
  window.rhFitAllCardValues=fitAll;
  if(typeof ResizeObserver!=='undefined'){
    var lastWidths=new WeakMap();
    var ro=new ResizeObserver(function(entries){
      var changed=false;entries.forEach(function(entry){var w=Math.round(entry.contentRect&&entry.contentRect.width||0),old=lastWidths.get(entry.target);if(old==null||Math.abs(w-old)>=8){lastWidths.set(entry.target,w);changed=true;}});if(changed)schedule(true);
    });
    function observe(){Array.prototype.forEach.call(document.querySelectorAll('.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card'),function(x){try{ro.observe(x);}catch(e){}});}
    var mo=new MutationObserver(function(muts){var contentChanged=muts.some(function(m){return m.type==='childList'||m.type==='characterData';});observe();if(contentChanged)schedule(true);});
    mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
    document.addEventListener('DOMContentLoaded',function(){observe();schedule(true);});
  }else{
    var mo2=new MutationObserver(function(){schedule(true);});mo2.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  }
  window.addEventListener('resize',function(){schedule(true);});
  window.addEventListener('load',function(){schedule(true);});
  var prevRenderAll=window.renderAll;
  if(typeof prevRenderAll==='function')window.renderAll=function(){var r=prevRenderAll.apply(this,arguments);schedule(true);return r;};
  if(!document.getElementById('_rh_v15_card_fit_styles')){
    var st=document.createElement('style');st.id='_rh_v15_card_fit_styles';
    st.textContent='.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.summary-card,.stat-card{min-width:0!important;overflow:hidden!important}.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong{width:100%!important;max-width:100%!important;min-width:0!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;line-height:1.02!important}#rh-insight-kpis .kpi:last-child strong{font-variant-numeric:tabular-nums!important;transform:none!important;animation:none!important;transition:none!important}';
    document.head.appendChild(st);
  }
  schedule(true);
})();
