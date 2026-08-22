/* RH & Folha — hotfix v25: garante que Planejamento & Provisões entre no menu e abra corretamente */
(function(){
  'use strict';
  var recovering=false, attempts=0;
  function byId(id){return document.getElementById(id);}
  function planPage(){return byId('page-planejamento');}
  function planButton(){return document.querySelector('#nav [data-view="planejamento"]');}
  function nav(){return byId('nav')||document.querySelector('.sidebar nav');}
  function moveNearPeople(btn){
    var n=nav();if(!n||!btn)return;
    var mov=n.querySelector('[data-view="movimentacoes"]');
    if(mov&&mov.nextSibling!==btn)n.insertBefore(btn,mov.nextSibling);
  }
  function openPlanning(){
    if(!planPage())recoverPage();
    var page=planPage();
    if(!page){if(typeof toast==='function')toast('Planejamento & Provisões ainda está carregando. Tente novamente em instantes.',true);return;}
    if(typeof go==='function')go('planejamento');
    if(typeof window.rhRenderPlanning==='function')window.rhRenderPlanning();
  }
  function ensureButton(){
    var n=nav();if(!n)return null;
    var btn=planButton();
    if(!btn){
      btn=document.createElement('button');btn.type='button';btn.className='nav-item';btn.dataset.view='planejamento';btn.innerHTML='<span>◫</span>Planejamento & Provisões';n.appendChild(btn);
    }
    btn.hidden=false;btn.removeAttribute('hidden');btn.style.removeProperty('display');btn.onclick=openPlanning;
    btn.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openPlanning();}};
    moveNearPeople(btn);return btn;
  }
  function recoverPage(){
    if(planPage()||recovering)return;var app=byId('app');if(!app||app.hidden)return;
    if(typeof setupUI!=='function')return;
    recovering=true;
    try{setupUI();}catch(e){console.error('Falha ao recuperar Planejamento & Provisões:',e);}finally{recovering=false;}
  }
  function ensure(){
    attempts++;
    var app=byId('app');
    if(!app||app.hidden){if(attempts<24)setTimeout(ensure,350);return;}
    if(!planPage())recoverPage();
    var btn=ensureButton();
    if(planPage()&&btn){
      planPage().dataset.rhPlanningReady='1';
      if(typeof window.rhRenderPlanning==='function'){try{window.rhRenderPlanning();}catch(e){console.error('Falha ao renderizar Planejamento & Provisões:',e);}}
      return;
    }
    if(attempts<24)setTimeout(ensure,350);
  }
  window.rhEnsurePlanningEntry=ensure;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(ensure,0);},{once:true});else setTimeout(ensure,0);
  window.addEventListener('load',function(){setTimeout(ensure,250);},{once:true});
  var mo=new MutationObserver(function(ms){
    if(ms.some(function(m){return m.type==='childList';}))setTimeout(function(){if(byId('app')&&!byId('app').hidden)ensureButton();},0);
  });
  var root=byId('app')||document.body;if(root)mo.observe(root,{subtree:true,childList:true});
  if(!byId('_rh_v25_planning_entry_styles')){
    var st=document.createElement('style');st.id='_rh_v25_planning_entry_styles';
    st.textContent='#nav [data-view="planejamento"]{display:flex!important;visibility:visible!important;opacity:1!important}';document.head.appendChild(st);
  }
})();
