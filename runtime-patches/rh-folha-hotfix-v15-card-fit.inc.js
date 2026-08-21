/* RH & Folha — hotfix v15: encaixe robusto de valores nos cards */
(function(){
  var SELECTOR='.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#custo-real-kpis strong,#payroll-kpis strong,#charges-kpis strong,#movement-kpis strong';
  function fitOne(el){
    if(!el||!el.parentElement)return;
    var box=el.parentElement;
    el.style.setProperty('font-size','', 'important');
    el.style.setProperty('white-space','nowrap','important');
    el.style.setProperty('display','block','important');
    el.style.setProperty('max-width','100%','important');
    el.style.setProperty('overflow','visible','important');
    var cs=getComputedStyle(el),base=parseFloat(cs.fontSize)||34;
    var max=Math.min(base,42),min=15;
    var available=Math.max(36,box.clientWidth-24);
    var low=min,high=max,best=min;
    for(var i=0;i<12;i++){
      var mid=(low+high)/2;
      el.style.setProperty('font-size',mid+'px','important');
      var fits=el.scrollWidth<=available;
      if(fits){best=mid;low=mid;}else high=mid;
    }
    el.style.setProperty('font-size',best.toFixed(2)+'px','important');
    el.style.setProperty('letter-spacing',best<22?'-.035em':(best<28?'-.025em':'-.015em'),'important');
    el.dataset.rhFit='1';
  }
  function fitAll(root){
    root=root||document;
    Array.prototype.forEach.call(root.querySelectorAll(SELECTOR),fitOne);
  }
  var scheduled=false;
  function schedule(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(function(){requestAnimationFrame(function(){scheduled=false;fitAll(document);});});
  }
  window.rhFitAllCardValues=fitAll;
  if(typeof ResizeObserver!=='undefined'){
    var ro=new ResizeObserver(schedule);
    function observe(){Array.prototype.forEach.call(document.querySelectorAll('.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card'),function(x){try{ro.observe(x);}catch(e){}});}
    var mo=new MutationObserver(function(){observe();schedule();});
    mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
    document.addEventListener('DOMContentLoaded',function(){observe();schedule();});
  }else{
    var mo2=new MutationObserver(schedule);mo2.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  }
  window.addEventListener('resize',schedule);
  window.addEventListener('load',schedule);
  var prevRenderAll=window.renderAll;
  if(typeof prevRenderAll==='function')window.renderAll=function(){var r=prevRenderAll.apply(this,arguments);schedule();return r;};
  if(!document.getElementById('_rh_v15_card_fit_styles')){
    var st=document.createElement('style');st.id='_rh_v15_card_fit_styles';
    st.textContent='.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.summary-card,.stat-card{min-width:0!important;overflow:hidden!important}.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong{width:100%!important;max-width:100%!important;min-width:0!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;line-height:1.02!important}';
    document.head.appendChild(st);
  }
  schedule();
})();
