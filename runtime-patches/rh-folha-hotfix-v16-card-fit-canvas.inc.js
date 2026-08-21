/* RH & Folha — hotfix v16: encaixe de valores por medição real do texto */
(function(){
  var SELECTOR='.kpi strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#custo-real-kpis strong,#payroll-kpis strong,#charges-kpis strong,#movement-kpis strong';
  var canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  function innerWidth(box){
    var cs=getComputedStyle(box),w=box.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0);return Math.max(48,w-2);
  }
  function textWidth(el,size){
    if(!ctx)return Infinity;var cs=getComputedStyle(el),weight=cs.fontWeight||700,family=cs.fontFamily||'sans-serif';ctx.font=weight+' '+size+'px '+family;return ctx.measureText(String(el.textContent||'').trim()).width;
  }
  function fitOne(el){
    if(!el||!el.parentElement)return;var box=el.closest('.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card')||el.parentElement;
    var txt=String(el.textContent||'').trim();if(!txt)return;
    var available=innerWidth(box),min=12,max=34;
    if(txt.length<=8)max=34;else if(txt.length<=11)max=30;else if(txt.length<=14)max=26;else if(txt.length<=17)max=22;else max=19;
    var lo=min,hi=max,best=min;
    for(var i=0;i<16;i++){var mid=(lo+hi)/2;if(textWidth(el,mid)<=available){best=mid;lo=mid;}else{hi=mid;}}
    var size=Math.max(min,Math.floor(best*100)/100);
    el.style.setProperty('font-size',size+'px','important');
    el.style.setProperty('white-space','nowrap','important');
    el.style.setProperty('display','block','important');
    el.style.setProperty('width','100%','important');
    el.style.setProperty('max-width','100%','important');
    el.style.setProperty('overflow','visible','important');
    el.style.setProperty('text-overflow','clip','important');
    el.style.setProperty('letter-spacing',size<20?'-.045em':(size<25?'-.03em':'-.015em'),'important');
  }
  function fitAll(){Array.prototype.forEach.call(document.querySelectorAll(SELECTOR),fitOne);}
  var timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(function(){requestAnimationFrame(fitAll);},30);}
  window.rhFitAllCardValues=fitAll;
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(schedule);
  var mo=new MutationObserver(schedule);mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('resize',schedule);window.addEventListener('load',schedule);document.addEventListener('DOMContentLoaded',schedule);
  var prev=window.renderAll;if(typeof prev==='function')window.renderAll=function(){var r=prev.apply(this,arguments);schedule();return r;};
  if(!document.getElementById('_rh_v16_card_fit_styles')){var st=document.createElement('style');st.id='_rh_v16_card_fit_styles';st.textContent='.kpi,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card{min-width:0!important}.kpi strong,#rh-dossier-kpis strong,#rh-insight-kpis strong,#custo-real-kpis strong,#payroll-kpis strong,#charges-kpis strong,#movement-kpis strong{min-width:0!important;width:100%!important;max-width:100%!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;line-height:1.02!important}';document.head.appendChild(st);}
  schedule();
})();
