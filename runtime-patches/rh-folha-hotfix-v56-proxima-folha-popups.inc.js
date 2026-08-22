/* RH v56.1 — popups compactos da Próxima Folha, sem sobra lateral ou altura forçada */
(function(){
'use strict';
var V56={observer:null,timer:0,patched:false,applying:false};
function E(id){return document.getElementById(id)}
function targetWidth(cols){
  if(cols<=2)return 760;
  if(cols===3)return 1040;
  if(cols===4)return 1120;
  if(cols===5)return 1200;
  if(cols===6)return 1320;
  if(cols===7)return 1420;
  return 1500
}
function setFull(el){
  if(!el||!el.style)return;
  el.style.setProperty('width','100%','important');
  el.style.setProperty('max-width','100%','important');
  el.style.setProperty('min-width','0','important');
  el.style.setProperty('box-sizing','border-box','important');
  el.style.setProperty('margin-left','0','important');
  el.style.setProperty('margin-right','0','important');
  el.style.setProperty('flex-basis','auto','important');
  el.style.setProperty('justify-self','stretch','important');
  el.style.setProperty('align-self','stretch','important')
}
function stretchTableChain(table,body){
  var node=table&&table.parentElement,guard=0;
  while(node&&node!==body&&guard++<8){
    setFull(node);
    node.style.setProperty('float','none','important');
    node.style.setProperty('grid-column','1 / -1','important');
    if(node.classList.contains('rh47-popup-scroll'))node.style.setProperty('display','block','important');
    node=node.parentElement
  }
  Array.from(body.children||[]).forEach(function(child){
    setFull(child);
    child.style.setProperty('grid-column','1 / -1','important');
    child.style.setProperty('float','none','important')
  })
}
function tuneColumns(table,cols){
  if(cols!==3)return;
  var group=table.querySelector('colgroup');
  if(!group){
    group=document.createElement('colgroup');
    for(var i=0;i<3;i++)group.appendChild(document.createElement('col'));
    table.insertBefore(group,table.firstChild)
  }
  var cs=group.querySelectorAll('col'),ws=['46%','29%','25%'];
  Array.from(cs).slice(0,3).forEach(function(c,i){c.style.setProperty('width',ws[i],'important')});
  table.querySelectorAll('tr').forEach(function(tr){
    if(tr.cells&&tr.cells[2]){
      tr.cells[2].style.setProperty('text-align','right','important');
      tr.cells[2].style.setProperty('white-space','nowrap','important')
    }
  })
}
function applyForecastPopup56(){
  if(V56.applying)return false;
  var modal=E('encargos-popup');
  if(!modal||modal.hidden)return false;
  /* .rh47-popup-table identifica os detalhamentos auditados da Próxima Folha. */
  var table=modal.querySelector('.rh47-popup-table');
  if(!table)return false;
  var box=modal.querySelector('.modal-card'),body=modal.querySelector('.ep-body');
  if(!box||!body)return false;
  V56.applying=true;
  try{
    var cols=table.querySelectorAll('thead th').length||3;
    var px=Math.min(targetWidth(cols),Math.max(360,window.innerWidth-64)),w=px+'px';
    modal.classList.add('rh56-forecast-popup');
    modal.style.setProperty('--rh56-popup-w',w);
    modal.style.setProperty('display','grid','important');
    modal.style.setProperty('place-items','center','important');
    modal.style.setProperty('padding','24px','important');
    modal.style.setProperty('box-sizing','border-box','important');

    box.style.setProperty('width',w,'important');
    box.style.setProperty('max-width',w,'important');
    box.style.setProperty('min-width','0','important');
    box.style.setProperty('height','auto','important');
    box.style.setProperty('max-height','90vh','important');
    box.style.setProperty('margin','auto','important');
    box.style.setProperty('overflow','hidden','important');
    box.style.setProperty('box-sizing','border-box','important');
    box.style.setProperty('display','flex','important');
    box.style.setProperty('flex','0 1 auto','important');
    box.style.setProperty('flex-direction','column','important');
    box.style.setProperty('align-items','stretch','important');

    var head=box.querySelector('.modal-head');if(head)setFull(head);
    body.style.setProperty('display','block','important');
    setFull(body);
    body.style.setProperty('padding','14px 20px 20px','important');
    body.style.setProperty('overflow-y','auto','important');
    body.style.setProperty('overflow-x','hidden','important');
    body.style.setProperty('flex','0 1 auto','important');
    body.style.setProperty('max-height','calc(90vh - 118px)','important');

    stretchTableChain(table,body);
    var sub=body.querySelector('.rh47-popup-sub');if(sub)setFull(sub);
    var scroll=table.closest('.rh47-popup-scroll');
    if(scroll){
      setFull(scroll);
      scroll.style.setProperty('display','block','important');
      scroll.style.setProperty('overflow-x','auto','important');
      scroll.style.setProperty('overflow-y','visible','important');
      scroll.style.setProperty('padding','0','important')
    }

    table.style.setProperty('display','table','important');
    setFull(table);
    table.style.setProperty('table-layout','fixed','important');
    table.style.setProperty('border-collapse','collapse','important');
    table.style.setProperty('float','none','important');
    tuneColumns(table,cols);
  }finally{V56.applying=false}
  return true
}
function schedule56(){
  clearTimeout(V56.timer);
  requestAnimationFrame(applyForecastPopup56);
  V56.timer=setTimeout(applyForecastPopup56,25);
  setTimeout(applyForecastPopup56,90);
  setTimeout(applyForecastPopup56,220);
  setTimeout(applyForecastPopup56,500)
}
function styles56(){
  if(E('_rh56'))return;
  var s=document.createElement('style');s.id='_rh56';s.textContent=
    '#encargos-popup.rh56-forecast-popup[hidden]{display:none!important}'+
    '#encargos-popup.rh56-forecast-popup .modal-card{width:var(--rh56-popup-w)!important;max-width:var(--rh56-popup-w)!important;min-width:0!important;height:auto!important;flex:0 1 auto!important}'+
    '#encargos-popup.rh56-forecast-popup .modal-card>.modal-head,#encargos-popup.rh56-forecast-popup .ep-body,#encargos-popup.rh56-forecast-popup .ep-body>*{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important}'+
    '#encargos-popup.rh56-forecast-popup .ep-body{display:block!important;overflow-x:hidden!important;flex:0 1 auto!important;max-height:calc(90vh - 118px)!important}'+
    '#encargos-popup.rh56-forecast-popup .rh47-popup-scroll{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;box-sizing:border-box!important}'+
    '#encargos-popup.rh56-forecast-popup .rh47-popup-table{display:table!important;width:100%!important;max-width:100%!important;min-width:100%!important;margin:0!important;table-layout:fixed!important;float:none!important;box-sizing:border-box!important}'+
    '#encargos-popup.rh56-forecast-popup .rh47-popup-table th,#encargos-popup.rh56-forecast-popup .rh47-popup-table td{box-sizing:border-box!important;word-break:normal!important;overflow-wrap:break-word!important}'+
    '#encargos-popup.rh56-forecast-popup .rh47-popup-table .money{text-align:right!important;white-space:nowrap!important}'+
    '#encargos-popup.rh56-forecast-popup .rh47-popup-table tfoot td{font-weight:900!important;border-top:2px solid var(--gold)!important}'+
    '@media(max-width:760px){#encargos-popup.rh56-forecast-popup{padding:8px!important}#encargos-popup.rh56-forecast-popup .modal-card{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important}#encargos-popup.rh56-forecast-popup .ep-body{padding:12px 14px 16px!important}}';
  document.head.appendChild(s)
}
function patchGeneric56(){
  if(V56.patched||typeof window.openGenericDetail!=='function')return;
  var old=window.openGenericDetail;
  window.openGenericDetail=function(){var r=old.apply(this,arguments);schedule56();return r};
  V56.patched=true
}
function observe56(){
  if(V56.observer)return;
  V56.observer=new MutationObserver(function(ms){
    if(V56.applying)return;
    var modal=E('encargos-popup');
    if(!modal)return;
    var relevant=ms.some(function(m){
      if(m.type==='attributes'&&(m.target===modal||modal.contains(m.target)))return true;
      if(m.type==='childList'&&(m.target===modal||modal.contains(m.target)))return true;
      return false
    });
    if(relevant&&modal.querySelector('.rh47-popup-table'))schedule56()
  });
  V56.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']})
}
function init56(){
  styles56();patchGeneric56();observe56();
  document.addEventListener('click',function(e){
    var card=e.target&&e.target.closest&&e.target.closest('#page-planejamento [data-plan-pane="folha"] .rh47-summary-card,#page-planejamento [data-plan-pane="folha"] #rh-plan-folha-kpis .kpi,#page-planejamento [data-plan-pane="folha"] .rh47-tax-line');
    if(card)schedule56()
  },true);
  window.addEventListener('resize',function(){var m=E('encargos-popup');if(m&&!m.hidden&&m.querySelector('.rh47-popup-table'))schedule56()},{passive:true});
  schedule56()
}
window.RH_FORECAST_POPUP_FIX_V56=true;
window.rhV56FitForecastPopup=applyForecastPopup56;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init56);else init56();
})();
