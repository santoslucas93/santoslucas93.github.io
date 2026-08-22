/* RH v46a — acabamento da interatividade estável */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function style(){
  if(E('_rh46a'))return;
  var s=document.createElement('style');s.id='_rh46a';
  s.textContent='.rh46-total-card>*,.rh46-total-card .rh46-card-value{pointer-events:none!important}';
  document.head.appendChild(s)
}
window.RH_STABILITY_V46A=true;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',style);else style();
})();