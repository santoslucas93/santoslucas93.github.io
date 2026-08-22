/* RH v56 — ajuste isolado dos popups da Próxima Folha */
(function(){
'use strict';
var V56={observer:null,timer:0};
function E(id){return document.getElementById(id)}
function targetWidth(cols){
  if(cols<=2)return 640;
  if(cols===3)return 760;
  if(cols===4)return 880;
  if(cols===5)return 1000;
  if(cols===6)return 1120;
  if(cols===7)return 1240;
  return 1360
}
function applyForecastPopup56(){
  var modal=E('encargos-popup');
  if(!modal||modal.hidden)return false;
  /* .rh47-popup-table é exclusiva dos detalhamentos auditados da Próxima Folha. */
  var table=modal.querySelector('.rh47-popup-table');
  if(!table)return false;
  var box=modal.querySelector('.modal-card'),body=modal.querySelector('.ep-body'),scroll=table.closest('.rh47-popup-scroll');
  if(!box||!body)return false;
  var cols=table.querySelectorAll('thead th').length||3;
  var px=Math.min(targetWidth(cols),Math.max(320,window.innerWidth-48));
  var w=px+'px';
  modal.classList.add('rh56-forecast-popup');
  modal.style.setProperty('display','grid','important');
  modal.style.setProperty('place-items','center','important');
  modal.style.setProperty('padding','24px','important');
  modal.style.setProperty('box-sizing','border-box','important');
  box.style.setProperty('width',w,'important');
  box.style.setProperty('max-width',w,'important');
  box.style.setProperty('min-width','0','important');
  box.style.setProperty('height','auto','important');
  box.style.setProperty('max-height','88vh','important');
  box.style.setProperty('margin','auto','important');
  box.style.setProperty('overflow','hidden','important');
  box.style.setProperty('box-sizing','border-box','important');
  box.style.setProperty('display','flex','important');
  box.style.setProperty('flex-direction','column','important');
  body.style.setProperty('display','block','important');
  body.style.setProperty('width','100%','important');
  body.style.setProperty('max-width','100%','important');
  body.style.setProperty('min-width','0','important');
  body.style.setProperty('padding','14px 20px 20px','important');
  body.style.setProperty('margin','0','important');
  body.style.setProperty('box-sizing','border-box','important');
  body.style.setProperty('overflow','auto','important');
  body.style.setProperty('flex','1 1 auto','important');
  var sub=body.querySelector('.rh47-popup-sub');
  if(sub){sub.style.setProperty('width','100%','important');sub.style.setProperty('max-width','100%','important');sub.style.setProperty('box-sizing','border-box','important')}
  if(scroll){
    scroll.style.setProperty('display','block','important');
    scroll.style.setProperty('width','100%','important');
    scroll.style.setProperty('max-width','100%','important');
    scroll.style.setProperty('min-width','0','important');
    scroll.style.setProperty('margin','0','important');
    scroll.style.setProperty('padding','0','important');
    scroll.style.setProperty('box-sizing','border-box','important');
    scroll.style.setProperty('overflow-x','auto','important')
  }
  table.style.setProperty('display','table','important');
  table.style.setProperty('width','100%','important');
  table.style.setProperty('max-width','100%','important');
  table.style.setProperty('min-width','0','important');
  table.style.setProperty('margin','0','important');
  table.style.setProperty('table-layout','fixed','important');
  table.style.setProperty('box-sizing','border-box','important');
  return true
}
function schedule56(){
  clearTimeout(V56.timer);
  requestAnimationFrame(applyForecastPopup56);
  V56.timer=setTimeout(applyForecastPopup56,35);
  setTimeout(applyForecastPopup56,120);
  setTimeout(applyForecastPopup56,260)
}
function styles56(){
  if(E('_rh56'))return;
  var s=document.createElement('style');s.id='_rh56';s.textContent=
    '#encargos-popup.rh56-forecast-popup[hidden]{display:none!important}'+
    '#encargos-popup.rh56-forecast-popup .modal-card>.modal-head{width:100%!important;max-width:100%!important;box-sizing:border-box!important;flex:0 0 auto!important}'+
    '#encargos-popup.rh56-forecast-popup .ep-body>*{max-width:100%!important;box-sizing:border-box!important}'+
    '#encargos-popup.rh56-forecast-popup .rh47-popup-scroll{width:100%!important;max-width:100%!important;min-width:0!important}'+
    '#encargos-popup.rh56-forecast-popup .rh47-popup-table{width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important}'+
    '#encargos-popup.rh56-forecast-popup .rh47-popup-table th,#encargos-popup.rh56-forecast-popup .rh47-popup-table td{box-sizing:border-box!important;word-break:normal!important;overflow-wrap:break-word!important}'+
    '#encargos-popup.rh56-forecast-popup .rh47-popup-table .money{text-align:right!important;white-space:nowrap!important}'+
    '@media(max-width:760px){#encargos-popup.rh56-forecast-popup{padding:8px!important}#encargos-popup.rh56-forecast-popup .modal-card{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important}#encargos-popup.rh56-forecast-popup .ep-body{padding:12px 14px 16px!important}}';
  document.head.appendChild(s)
}
function observe56(){
  if(V56.observer)return;
  V56.observer=new MutationObserver(function(ms){
    var relevant=ms.some(function(m){
      if(m.type==='attributes'&&m.target&&m.target.id==='encargos-popup')return true;
      if(m.type==='childList'){
        var modal=E('encargos-popup');
        return !!(modal&&(m.target===modal||modal.contains(m.target)))
      }
      return false
    });
    if(relevant)schedule56()
  });
  V56.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']})
}
function init56(){
  styles56();observe56();
  document.addEventListener('click',function(e){
    var card=e.target&&e.target.closest&&e.target.closest('#page-planejamento [data-plan-pane="folha"] .rh47-summary-card,#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis .kpi,#page-planejamento [data-plan-pane="folha"] .rh47-tax-line');
    if(card)schedule56()
  },true);
  window.addEventListener('resize',function(){if(E('encargos-popup')&&!E('encargos-popup').hidden)schedule56()},{passive:true});
  schedule56()
}
window.RH_FORECAST_POPUP_FIX_V56=true;
window.rhV56FitForecastPopup=applyForecastPopup56;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init56);else init56();
})();
