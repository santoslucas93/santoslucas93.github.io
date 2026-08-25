/* RH & Folha — hotfix v59: filtro global de Status (Trabalhando/Afastado/Desligado)
   nas mesmas telas que já têm Departamento/Vínculo, priorizando "Trabalhando" na
   primeira abertura da sessão, e período padrão = última folha importada (em vez
   de abrir consolidando todos os anos). Não altera nenhum cálculo de folha,
   encargos ou rubrica — só filtro de exibição e seleção inicial de período. */

/* --- 1) Filtro global de Status, no mesmo padrão de Departamento/Vínculo (v8) --- */
RH_SCOPE.situacao=RH_SCOPE.situacao||'';

function rhSituacaoCategory(p){
  var v=cleanSearch((p&&(p.situacao_snapshot||p.situacao))||'');
  if(/demit|deslig|rescis|rescind|inativ|transferid/.test(v))return 'desligado';
  if(/afast|licenca|ferias/.test(v))return 'afastado';
  return 'trabalhando';
}

var _rhV59BaseScopePeople=rhScopePeople;
rhScopePeople=function(){
  return _rhV59BaseScopePeople().filter(function(p){
    return !RH_SCOPE.situacao||rhSituacaoCategory(p)===RH_SCOPE.situacao;
  });
};

function rhSituacaoOptionsHtml(){
  return '<option value="">Todos os status</option><option value="trabalhando">Trabalhando</option><option value="afastado">Afastado</option><option value="desligado">Desligado</option>';
}

var _rhV59BaseSyncScopeControls=rhSyncScopeControls;
rhSyncScopeControls=function(){
  _rhV59BaseSyncScopeControls();
  var ms=$('filter-situacao');if(ms)ms.value=RH_SCOPE.situacao;
  document.querySelectorAll('[data-rh-scope-situacao]').forEach(function(s){s.value=RH_SCOPE.situacao;});
};

var _rhV59BasePopulateScopeControls=rhPopulateScopeControls;
rhPopulateScopeControls=function(){
  _rhV59BasePopulateScopeControls();
  var sh=rhSituacaoOptionsHtml(),ms=$('filter-situacao');
  if(ms){ms.innerHTML=sh;ms.value=RH_SCOPE.situacao;}
  document.querySelectorAll('[data-rh-scope-situacao]').forEach(function(s){s.innerHTML=sh;s.value=RH_SCOPE.situacao;});
};

var _rhV59BaseCreateScreenFilters=rhCreateScreenFilters;
rhCreateScreenFilters=function(pageId){
  _rhV59BaseCreateScreenFilters(pageId);
  var page=$(pageId);if(!page)return;var head=page.querySelector('.page-head');if(!head)return;
  var actions=head.querySelector('.head-actions');if(!actions)return;
  var key=pageId.replace('page-','');
  if(!page.querySelector('[data-rh-scope-situacao]')){
    var ls=document.createElement('label');ls.className='rh-scope-label';
    ls.innerHTML='Status<select id="rh-scope-situacao-'+key+'" data-rh-scope-situacao></select>';
    actions.insertBefore(ls,actions.firstChild);
  }
};

var _rhV59BaseEnsureScopeFilters=rhEnsureScopeFilters;
rhEnsureScopeFilters=function(){
  _rhV59BaseEnsureScopeFilters();
  if(!window.__rhV59DefaultStatusApplied){
    window.__rhV59DefaultStatusApplied=true;
    RH_SCOPE.situacao='trabalhando';
  }
  rhPopulateScopeControls();
  var ms=$('filter-situacao');
  if(ms)ms.onchange=function(){RH_SCOPE.situacao=ms.value||'';rhSyncScopeControls();rhRefreshScope();};
  document.querySelectorAll('[data-rh-scope-situacao]').forEach(function(s){s.onchange=function(){RH_SCOPE.situacao=s.value||'';rhSyncScopeControls();rhRefreshScope();};});
  var reset=$('filter-reset');
  if(reset){
    var _baseReset=reset.onclick;
    reset.onclick=function(){RH_SCOPE.situacao='';if(typeof _baseReset==='function')_baseReset();rhSyncScopeControls();rhRefreshScope();};
  }
};

/* --- 2) Período padrão = última folha importada, em vez de "todos os anos" --- */
(function(){
  var _rhV59BasePeriodPopulate=rhPeriodPopulate;
  rhPeriodPopulate=function(){
    if(!window.__rhV59DefaultPeriodApplied){
      window.__rhV59DefaultPeriodApplied=true;
      if(!RH_PERIOD.year&&(S.competencias||[]).length){
        var latest=S.competencias[0];
        RH_PERIOD.year=rhPeriodYear(latest);
        RH_PERIOD.month=rhPeriodMonth(latest);
      }
    }
    return _rhV59BasePeriodPopulate();
  };
})();
