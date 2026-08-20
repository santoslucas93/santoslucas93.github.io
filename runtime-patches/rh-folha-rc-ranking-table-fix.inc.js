/* RH & Folha — ranking em quadro, responsivo e sem rolagem lateral */
function rhRankingAggregateValue(sets,total){
  var allCount=sets.length&&sets.every(function(ds){return rhUniversalIsCountSeries(ds);});
  return allCount?nfmt(total):fmt(total);
}
function rhRankingColumnTemplate(valueCols){
  return '42px minmax(135px,1.55fr) repeat('+Math.max(1,valueCols)+',minmax(0,1fr))';
}
function rhRankingApplyTemplate(host,valueCols){
  var tpl=rhRankingColumnTemplate(valueCols);
  Array.prototype.forEach.call(host.querySelectorAll('.rh-rank-row'),function(row){row.style.gridTemplateColumns=tpl;});
}
rhUniversalRenderRanking=function(id,data,clickHandler){
  var canvas=$(id),host=rhUniversalRankingHost(id);if(!canvas||!host)return;
  if(S.charts[id]){try{S.charts[id].destroy();}catch(e){}delete S.charts[id];}
  var wrap=canvas.closest('.chart-wrap')||canvas.parentNode;
  canvas.hidden=true;host.hidden=false;if(wrap)wrap.classList.add('rh-ranking-active');

  var labels=(data.labels||[]).slice();
  var sets=(data.datasets||[]).filter(function(ds){return Array.isArray(ds.data);});
  var rule=rhUniversalRankingScoreRule(data);
  var order=labels.map(function(_,i){return i;});
  order.sort(function(a,b){var d=rhUniversalRankingScoreAt(data,b,rule)-rhUniversalRankingScoreAt(data,a,rule);return d||a-b;});

  var addTotal=rule.sum;
  var valueCols=sets.length+(addTotal?1:0);
  var header='<div class="rh-rank-row rh-rank-head"><div>#</div><div>Categoria</div>'
    +sets.map(function(ds){return '<div>'+esc(ds.label||'Valor')+'</div>';}).join('')
    +(addTotal?'<div>Total</div>':'')+'</div>';

  var body=order.map(function(originalIndex,rank){
    var total=rhUniversalScore(data,originalIndex);
    var cells=sets.map(function(ds){return '<div class="rh-rank-value">'+esc(rhUniversalRankingValue(ds,ds.data[originalIndex]))+'</div>';}).join('');
    return '<button type="button" class="rh-rank-row rh-rank-item" data-rh-rank-index="'+originalIndex+'">'
      +'<div class="rh-rank-pos">'+(rank+1)+'º</div>'
      +'<div class="rh-rank-name"><b>'+esc(labels[originalIndex]==null?'—':labels[originalIndex])+'</b></div>'
      +cells
      +(addTotal?'<div class="rh-rank-total">'+esc(rhRankingAggregateValue(sets,total))+'</div>':'')
      +'</button>';
  }).join('');

  var totals=sets.map(function(ds){
    var total=(ds.data||[]).reduce(function(a,v){var n=Number(v);return a+(isFinite(n)?n:0);},0);
    return '<div class="rh-rank-value">'+esc(rhUniversalRankingValue(ds,total))+'</div>';
  }).join('');
  var grand=labels.reduce(function(a,_,i){return a+rhUniversalScore(data,i);},0);
  var foot='<div class="rh-rank-row rh-rank-foot"><div></div><div>TOTAL</div>'+totals
    +(addTotal?'<div class="rh-rank-total">'+esc(rhRankingAggregateValue(sets,grand))+'</div>':'')+'</div>';

  host.innerHTML='<div class="rh-rank-table">'+header+body+foot+'</div>';
  rhRankingApplyTemplate(host,valueCols);

  Array.prototype.forEach.call(host.querySelectorAll('[data-rh-rank-index]'),function(row){
    row.onclick=function(){
      if(!clickHandler)return;
      var originalIndex=Number(row.dataset.rhRankIndex);
      var datasetIndex=rule.datasetIndex>=0?rule.datasetIndex:0;
      clickHandler(null,[{index:originalIndex,datasetIndex:datasetIndex}]);
    };
  });
};

if(!$('_rh_ranking_table_fix_styles')){
  var st=document.createElement('style');st.id='_rh_ranking_table_fix_styles';
  st.textContent='.rh-ranking-view{max-height:430px!important;overflow-y:auto!important;overflow-x:hidden!important}.rh-rank-row{grid-template-columns:none!important}.rh-rank-row[style]{grid-template-columns:var(--rank-template)!important}.rh-rank-head{box-shadow:0 1px 0 var(--line-soft)}.rh-rank-pos{font-size:.8rem}.rh-rank-name b{font-weight:850}.rh-rank-value,.rh-rank-total{font-variant-numeric:tabular-nums}.rh-rank-foot{z-index:2}@media(max-width:760px){.rh-rank-row>div{padding:8px 5px!important;font-size:.7rem!important}.rh-rank-name b{font-size:.72rem}}';
  document.head.appendChild(st);
}
