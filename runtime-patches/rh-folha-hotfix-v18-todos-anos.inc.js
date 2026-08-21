/* RH & Folha — hotfix v18: consolidado global de todos os anos */
(function(){
  var _basePeriodLabel=rhPeriodLabel;
  rhPeriodLabel=function(){
    if(!RH_PERIOD.year){
      if(RH_PERIOD.month==='all')return 'Todos os anos · Todos os meses';
      return 'Todos os anos · mês '+RH_PERIOD.month;
    }
    return _basePeriodLabel();
  };

  rhPeriodPopulate=function(){
    var ys=$('rh-period-year'),ms=$('rh-period-month');if(!ys||!ms)return;
    var years=rhPeriodYears(),prevY=(RH_PERIOD.year!==undefined&&RH_PERIOD.year!==null)?String(RH_PERIOD.year):'',prevM=RH_PERIOD.month||'all';
    ys.innerHTML='<option value="">Todos os anos</option>'+years.map(function(y){return '<option value="'+esc(y)+'">'+esc(y)+'</option>';}).join('');
    ys.value=prevY;
    RH_PERIOD.year=prevY;
    var have=rhPeriodMonthsForYear(prevY),names=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    ms.innerHTML='<option value="all">Todos os meses</option>'+names.map(function(n,i){var mm=String(i+1).padStart(2,'0'),disabled=have[mm]?'':' disabled';return '<option value="'+mm+'"'+disabled+'>'+n+'</option>';}).join('');
    if(prevM!=='all'&&!have[prevM])prevM='all';
    RH_PERIOD.month=prevM;ms.value=prevM;
  };

  var _baseEnsure=rhPeriodEnsureUI;
  rhPeriodEnsureUI=function(){
    _baseEnsure();
    var ys=$('rh-period-year');
    if(ys&&!ys.dataset.rhAllYearsBound){
      ys.dataset.rhAllYearsBound='1';
      ys.onchange=function(){RH_PERIOD.year=this.value;RH_PERIOD.month='all';rhPeriodPopulate();rhPeriodLoad().catch(function(e){toast('Não foi possível consolidar o período: '+e.message,true);});};
    }
  };

  var _baseV14MonthList=typeof rhV14MonthList==='function'?rhV14MonthList:null;
  if(_baseV14MonthList)rhV14MonthList=function(comps){
    if(RH_PERIOD.year)return _baseV14MonthList(comps);
    return (comps||[]).map(function(c){return _rhPeriodBaseFormatCompetence(c.competencia);});
  };

  var _baseV14Render=typeof rhV14Render==='function'?rhV14Render:null;
  if(_baseV14Render)rhV14Render=function(){
    var r=_baseV14Render.apply(this,arguments),comps=rhV14ActiveCompetences(),years={};
    comps.forEach(function(c){var y=rhPeriodYear(c);if(y)years[y]=1;});
    if(!RH_PERIOD.year){
      var yc=Object.keys(years).length,coverage=$('rh-v14-coverage');
      if(coverage)coverage.textContent=comps.length+' competência'+(comps.length===1?'':'s')+' carregada'+(comps.length===1?'':'s')+' em '+yc+' ano'+(yc===1?'':'s');
      var months=$('rh-v14-months');if(months&&comps.length>8)months.textContent=_rhPeriodBaseFormatCompetence(comps[0].competencia)+' → '+_rhPeriodBaseFormatCompetence(comps[comps.length-1].competencia);
    }
    return r;
  };

  var _baseSetup=setupUI;
  setupUI=function(){var r=_baseSetup.apply(this,arguments);rhPeriodEnsureUI();rhPeriodPopulate();return r;};
})();
