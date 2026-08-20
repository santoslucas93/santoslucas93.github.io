/* RH & Folha — hotfix v9: fechar popups com tecla Escape */
(function(){
  function closeTopRhPopup(){
    var candidates=Array.prototype.slice.call(document.querySelectorAll('.modal')).filter(function(el){
      if(!el||el.hidden)return false;
      var cs=getComputedStyle(el);
      return cs.display!=='none'&&cs.visibility!=='hidden';
    });
    if(!candidates.length)return false;
    var top=candidates.sort(function(a,b){
      var za=parseInt(getComputedStyle(a).zIndex,10)||0,zb=parseInt(getComputedStyle(b).zIndex,10)||0;
      if(za!==zb)return zb-za;
      return Array.prototype.indexOf.call(document.body.children,b)-Array.prototype.indexOf.call(document.body.children,a);
    })[0];
    if(!top)return false;
    top.hidden=true;
    return true;
  }

  if(!window.__lnbRhEscPopupBound){
    window.__lnbRhEscPopupBound=true;
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape'&&e.key!=='Esc')return;
      if(closeTopRhPopup()){
        e.preventDefault();
        e.stopPropagation();
      }
    },true);
  }
})();
