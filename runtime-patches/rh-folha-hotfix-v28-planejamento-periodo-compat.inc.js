/* RH & Folha — hotfix v28: compatibilidade entre consolidação de período e Planejamento v26 */
(function(){
  'use strict';

  var rhV28LegacyPlanning=window.rhRenderPlanning;
  var rhV28BaseRenderAll=renderAll;
  var RH_V28_LEGACY_IDS=[
    'rh-plan-13-ref','rh-plan-13-kpis','rh-plan-13-table',
    'rh-plan-ferias-kpis','rh-plan-ferias-table',
    'rh-plan-next-title','rh-plan-folha-kpis','rh-plan-folha-table'
  ];

  function rhV28PlanningPage(){return document.getElementById('page-planejamento');}
  function rhV28NeedsBridge(){var p=rhV28PlanningPage();return !!(p&&p.dataset&&p.dataset.v26==='1');}

  function rhV28CreateLegacySinks(){
    if(!rhV28NeedsBridge())return null;
    var page=rhV28PlanningPage(),box=document.createElement('div'),created=0;
    box.id='rh-v28-legacy-sinks';box.hidden=true;box.setAttribute('aria-hidden','true');
    RH_V28_LEGACY_IDS.forEach(function(id){
      if(document.getElementById(id))return;
      var el=document.createElement(id==='rh-plan-13-ref'?'span':'div');el.id=id;box.appendChild(el);created++;
    });
    if(!created)return null;
    page.appendChild(box);return box;
  }

  function rhV28RemoveLegacySinks(box){try{if(box&&box.parentNode)box.parentNode.removeChild(box);}catch(e){}}

  function rhV28RunWithBridge(fn,ctx,args){
    var sink=rhV28CreateLegacySinks();
    try{return fn&&fn.apply(ctx,args||[]);}finally{rhV28RemoveLegacySinks(sink);}
  }

  /* O v24 ainda atualiza a aba Próxima folha, enquanto o v26 substitui as abas de 13º e Férias.
     Os elementos invisíveis abaixo mantêm o renderizador legado compatível sem alterar o layout atual. */
  renderAll=function(){return rhV28RunWithBridge(rhV28BaseRenderAll,this,arguments);};

  window.rhRenderPlanning=function(){
    var result=rhV28RunWithBridge(rhV28LegacyPlanning,this,arguments);
    var p=rhV28PlanningPage();
    if(p&&p.dataset.v26!=='1'&&typeof window.rhV26EnhancePlanning==='function')window.rhV26EnhancePlanning();
    return result;
  };

  window.rhV28PlanningPeriodBridge=rhV28RunWithBridge;
})();
