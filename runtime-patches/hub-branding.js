/* Central de Gestão LNB — identidade visual do cabeçalho e ícone premium de RH */
(function(){
  'use strict';
  function apply(){
    var brand=document.querySelector('.hub-brand');
    if(brand&&!brand.querySelector('.hub-lnb-logo')){
      var old=brand.querySelector(':scope > svg');
      var logo=document.createElement('span');
      logo.className='hub-lnb-logo';
      logo.innerHTML='<img src="/rh/lnb-logo.png" alt="Liga Nacional de Basquete">';
      if(old)old.replaceWith(logo);else brand.insertBefore(logo,brand.firstChild);
    }
    var rh=document.querySelector('.hub-card.rh .hub-icon');
    if(rh&&!rh.dataset.premiumRh){
      rh.dataset.premiumRh='1';
      rh.innerHTML='<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
        +'<defs><linearGradient id="rhCard" x1="18" y1="14" x2="78" y2="82" gradientUnits="userSpaceOnUse"><stop stop-color="#173A67"/><stop offset="1" stop-color="#0B223D"/></linearGradient><linearGradient id="rhAccent" x1="20" y1="18" x2="75" y2="75" gradientUnits="userSpaceOnUse"><stop stop-color="#E8B93C"/><stop offset="1" stop-color="#F2D06D"/></linearGradient></defs>'
        +'<rect x="16" y="11" width="64" height="72" rx="14" fill="url(#rhCard)" stroke="#E8B93C" stroke-opacity=".72" stroke-width="1.7"/>'
        +'<rect x="16" y="11" width="64" height="15" rx="14" fill="#E8B93C" fill-opacity=".16"/>'
        +'<circle cx="34" cy="41" r="9" fill="url(#rhAccent)"/>'
        +'<path d="M22 61c1.2-9.5 5.8-14 12-14 6.1 0 10.8 4.5 12 14" fill="#E8B93C" fill-opacity=".88"/>'
        +'<rect x="51" y="35" width="18" height="4" rx="2" fill="#EAF0FA" fill-opacity=".94"/>'
        +'<rect x="51" y="43" width="14" height="3.5" rx="1.75" fill="#8EA6C1"/>'
        +'<rect x="27" y="68" width="42" height="4" rx="2" fill="#8EA6C1" fill-opacity=".86"/>'
        +'<circle cx="70" cy="70" r="13" fill="#1FC48D" stroke="#0A1930" stroke-width="3"/>'
        +'<path d="M64.5 70.2l3.6 3.6 7.2-8" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
        +'</svg>';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
