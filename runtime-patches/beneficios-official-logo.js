/* Beneficios v88 - emblema oficial da Liga no cabecalho. */
(function(){
'use strict';
function installOfficialLogo(){
  var header=document.querySelector('header.app-header');
  if(!header||header.querySelector(':scope > .lnb-official-emblem'))return;
  var current=header.querySelector(':scope > svg');
  if(!current)return;
  var emblem=document.createElement('span');
  emblem.className='lnb-official-emblem';
  emblem.innerHTML='<img src="/rh/lnb-logo.png" alt="Liga Nacional de Basquete">';
  current.replaceWith(emblem)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installOfficialLogo,{once:true});else installOfficialLogo();
})();
