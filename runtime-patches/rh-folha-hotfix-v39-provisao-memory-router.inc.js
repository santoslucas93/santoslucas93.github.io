/* RH v39 — roteador definitivo da memória de provisões */
(function(){
'use strict';
function findRow(target){
  if(!target||!target.closest)return null;
  return target.closest('#page-planejamento [data-plan-pane="13"] tr.rh26-row[data-id],#page-planejamento [data-plan-pane="ferias"] tr.rh26-row[data-id]');
}
function route(tr,e){
  if(!tr)return false;
  if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}
  if(typeof window.rhProvisionOpenMemory==='function'){
    Promise.resolve(window.rhProvisionOpenMemory(tr)).catch(function(err){console.warn('RH v39 memória provisão:',err)});
    return true;
  }
  console.warn('RH v39: rhProvisionOpenMemory indisponível');
  return false;
}
function bindRows(){
  document.querySelectorAll('#page-planejamento [data-plan-pane="13"] tr.rh26-row[data-id],#page-planejamento [data-plan-pane="ferias"] tr.rh26-row[data-id]').forEach(function(tr){
    if(tr.dataset.rh39Bound==='1')return;
    tr.dataset.rh39Bound='1';
    tr.onclick=function(e){route(tr,e)};
  });
}
function init(){
  window.RH_PROVISION_MEMORY_ROUTER='v39';
  document.addEventListener('click',function(e){var tr=findRow(e.target);if(tr)route(tr,e)},true);
  bindRows();
  var old=window.rhV38EnforcePlanningUI;
  if(typeof old==='function'&&!old._rh39){
    var wrapped=function(){var r=old.apply(this,arguments);setTimeout(bindRows,40);setTimeout(bindRows,140);return r};
    wrapped._rh39=1;window.rhV38EnforcePlanningUI=wrapped;
  }
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#page-planejamento [data-plan-tab]')){setTimeout(bindRows,60);setTimeout(bindRows,180)}},false);
}
window.rhV39BindProvisionMemory=bindRows;
window.rhV39RouteProvisionMemory=route;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
