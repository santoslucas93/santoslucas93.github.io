/* RH v93 — fonte oficial como proprietária final dos cards de férias. */
(function(){
'use strict';
window.RH_VACATION_CARD_OWNER_V93=true;
function apply93(){return typeof window.rhV91ApplyVacationOfficial==='function'?window.rhV91ApplyVacationOfficial():false}
function wrap93(name){
  var base=window[name];
  if(typeof base!=='function'||base._rh93)return;
  var wrapped=async function(){var out=await base.apply(this,arguments);apply93();return out};
  wrapped._rh93=true;wrapped._rh93Base=base;window[name]=wrapped
}
function refresh93(force){var load=typeof window.rhV80Refresh==='function'?window.rhV80Refresh(!!force):false;return Promise.resolve(load).then(function(out){apply93();return out})}
function init93(){wrap93('rhProvisionRefresh');wrap93('rhV80Refresh');setTimeout(function(){refresh93(false)},280)}
window.rhV93ApplyVacationCards=apply93;
window.rhV93RefreshVacationCards=refresh93;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init93);else init93();
})();
