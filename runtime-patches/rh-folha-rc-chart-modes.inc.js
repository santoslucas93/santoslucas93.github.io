/* RH & Folha — Release Candidate: modos de gráfico globais + ranking em quadro */
S.rhChartModes=S.rhChartModes||{};
S.rhUniversalChartArgs=S.rhUniversalChartArgs||{};

function rhUniversalClone(v){
  if(Array.isArray(v))return v.map(rhUniversalClone);
  if(v&&typeof v==='object'){
    var o={};Object.keys(v).forEach(function(k){o[k]=rhUniversalClone(v[k]);});return o;
  }
  return v;
}
function rhUniversalModeOptions(){
  return [['auto','Automático'],['columns','Colunas'],['bars','Barras'],['ranking','Ranking'],['line','Linha'],['pie','Pizza']];
}
function rhUniversalEnsureSelector(id){
  var canvas=$(id);if(!canvas)return null;
  var panel=canvas.closest('.panel');if(!panel)return null;
  var head=panel.querySelector('.panel-head');if(!head)return null;
  var sid='rh-mode-'+id,sel=$(sid);
  if(sel){sel.value=S.rhChartModes[id]||sel.value||'auto';return sel;}
  var wrap=document.createElement('label');wrap.className='rh-chart-mode rh-chart-mode-global';
  wrap.innerHTML='<span>Gráfico</span><select id="'+esc(sid)+'">'+rhUniversalModeOptions().map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>';}).join('')+'</select>';
  head.appendChild(wrap);sel=$(sid);sel.value=S.rhChartModes[id]||'auto';
  sel.onchange=function(){S.rhChartModes[id]=sel.value;rhUniversalRenderCached(id);};
  return sel;
}
function rhUniversalScore(data,index){
  return (data.datasets||[]).reduce(function(total,ds){var n=Number(ds&&ds.data&&ds.data[index]);return total+(isFinite(n)?n:0);},0);
}
function rhUniversalSortArray(arr,order){
  if(!Array.isArray(arr)||arr.length!==order.length)return arr;
  return order.map(function(i){return arr[i];});
}
function rhUniversalRanking(data){
  var labels=(data.labels||[]).slice(),order=labels.map(function(_,i){return i;});
  order.sort(function(a,b){var d=rhUniversalScore(data,b)-rhUniversalScore(data,a);return d||a-b;});
  var out=rhUniversalClone(data);
  out.labels=order.map(function(i,rank){return (rank+1)+'º · '+String(labels[i]==null?'—':labels[i]);});
  (out.datasets||[]).forEach(function(ds,di){
    var src=(data.datasets||[])[di]||{};
    ds.data=rhUniversalSortArray(src.data||[],order);
    if(Array.isArray(src.backgroundColor))ds.backgroundColor=rhUniversalSortArray(src.backgroundColor,order);
    if(Array.isArray(src.borderColor))ds.borderColor=rhUniversalSortArray(src.borderColor,order);
  });
  return {data:out,order:order};
}
function rhUniversalClickMap(handler,order){
  if(!handler||!order)return handler;
  return function(e,els){
    var mapped=(els||[]).map(function(el){var copy={};Object.keys(el).forEach(function(k){copy[k]=el[k];});copy.index=order[el.index];return copy;});
    return handler(e,mapped);
  };
}
function rhUniversalLineDatasets(data){
  (data.datasets||[]).forEach(function(ds){
    if(!ds.borderColor){var bg=ds.backgroundColor;ds.borderColor=Array.isArray(bg)?bg[0]:bg;}
    ds.fill=false;if(ds.tension==null)ds.tension=.25;if(ds.pointRadius==null)ds.pointRadius=3;
  });
}
function rhUniversalPieDatasets(data){
  var pal=typeof rhInterPalette==='function'?rhInterPalette():[chartColors().blue,chartColors().gold,chartColors().emerald,chartColors().red,chartColors().purple,chartColors().orange];
  var n=(data.labels||[]).length;
  (data.datasets||[]).forEach(function(ds){
    if(!Array.isArray(ds.backgroundColor)||ds.backgroundColor.length!==n)ds.backgroundColor=(data.labels||[]).map(function(_,i){return pal[i%pal.length];});
    ds.borderWidth=1;
  });
}
function rhUniversalTransform(id,type,data,options,clickHandler){
  var mode=S.rhChartModes[id]||'auto',d=rhUniversalClone(data||{}),o=rhUniversalClone(options||{}),t=type,h=clickHandler;
  if(mode==='auto'||mode==='ranking')return {type:t,data:d,options:o,clickHandler:h};
  if(mode==='columns'){
    t='bar';delete o.indexAxis;
  }else if(mode==='bars'){
    t='bar';o.indexAxis='y';
  }else if(mode==='line'){
    t='line';delete o.indexAxis;rhUniversalLineDatasets(d);
  }else if(mode==='pie'){
    t='doughnut';delete o.indexAxis;o.cutout='0%';o.scales={};rhUniversalPieDatasets(d);
  }
  return {type:t,data:d,options:o,clickHandler:h};
}
function rhUniversalRenderCached(id){
  var a=S.rhUniversalChartArgs[id];if(!a)return;
  chart(id,a.type,a.data,a.options,a.clickHandler,true);
}

function rhUniversalRankingScoreRule(data){
  var sets=data.datasets||[],preferred=-1;
  sets.some(function(ds,i){var k=cleanSearch(ds&&ds.label||'');if(/(^|\s)(total|custo real|custo total)(\s|$)/.test(k)){preferred=i;return true;}return false;});
  if(preferred<0)sets.some(function(ds,i){var k=cleanSearch(ds&&ds.label||'');if(k.indexOf('provent')>=0){preferred=i;return true;}return false;});
  return {datasetIndex:preferred,sum:preferred<0&&sets.length>1};
}
function rhUniversalRankingScoreAt(data,index,rule){
  if(rule.datasetIndex>=0){var v=Number(data.datasets[rule.datasetIndex]&&data.datasets[rule.datasetIndex].data&&data.datasets[rule.datasetIndex].data[index]);return isFinite(v)?v:0;}
  return rhUniversalScore(data,index);
}
function rhUniversalIsCountSeries(ds){
  var key=cleanSearch(ds&&ds.label||''),vals=(ds&&ds.data||[]).map(Number).filter(function(n){return isFinite(n);});
  if(/pessoas|headcount|corridas|quantidade|qtd|colaboradores|funcionarios/.test(key))return true;
  if(/valor|custo|provento|desconto|liquido|fgts|inss|pis|irrf|encargo|salario|beneficio|patronal|recolhimento|folha/.test(key))return false;
  return vals.length>0&&vals.every(function(n){return Math.floor(n)===n;})&&Math.max.apply(Math,vals)<=500;
}
function rhUniversalRankingValue(ds,v){
  var n=Number(v)||0,key=cleanSearch(ds&&ds.label||'');
  if(/%|percent/.test(key))return n.toFixed(1).replace('.',',')+'%';
  if(rhUniversalIsCountSeries(ds))return nfmt(n);
  return fmt(n);
}
function rhUniversalRankingHost(id){
  var canvas=$(id);if(!canvas)return null;
  var wrap=canvas.closest('.chart-wrap')||canvas.parentNode;if(!wrap)return null;
  var rid='rh-ranking-'+id,host=$(rid);
  if(!host){host=document.createElement('div');host.id=rid;host.className='rh-ranking-view';host.hidden=true;wrap.appendChild(host);}
  return host;
}
function rhUniversalHideRanking(id){
  var canvas=$(id),host=$('rh-ranking-'+id),wrap=canvas&&(canvas.closest('.chart-wrap')||canvas.parentNode);
  if(host)host.hidden=true;if(canvas)canvas.hidden=false;if(wrap)wrap.classList.remove('rh-ranking-active');
}
function rhUniversalRenderRanking(id,data,clickHandler){
  var canvas=$(id),host=rhUniversalRankingHost(id);if(!canvas||!host)return;
  if(S.charts[id]){try{S.charts[id].destroy();}catch(e){}delete S.charts[id];}
  var wrap=canvas.closest('.chart-wrap')||canvas.parentNode;canvas.hidden=true;host.hidden=false;if(wrap)wrap.classList.add('rh-ranking-active');
  var labels=(data.labels||[]).slice(),sets=(data.datasets||[]).filter(function(ds){return Array.isArray(ds.data);}),rule=rhUniversalRankingScoreRule(data),order=labels.map(function(_,i){return i;});
  order.sort(function(a,b){var d=rhUniversalRankingScoreAt(data,b,rule)-rhUniversalRankingScoreAt(data,a,rule);return d||a-b;});
  var addTotal=rule.sum,cols=2+sets.length+(addTotal?1:0);
  var header='<div class="rh-rank-row rh-rank-head" style="--rh-rank-cols:'+cols+'"><div>#</div><div>Categoria</div>'+sets.map(function(ds){return '<div>'+esc(ds.label||'Valor')+'</div>';}).join('')+(addTotal?'<div>Total</div>':'')+'</div>';
  var body=order.map(function(originalIndex,rank){
    var total=rhUniversalScore(data,originalIndex),cells=sets.map(function(ds){return '<div class="rh-rank-value">'+esc(rhUniversalRankingValue(ds,ds.data[originalIndex]))+'</div>';}).join('');
    return '<button type="button" class="rh-rank-row rh-rank-item" style="--rh-rank-cols:'+cols+'" data-rh-rank-index="'+originalIndex+'"><div class="rh-rank-pos">'+(rank+1)+'º</div><div class="rh-rank-name"><b>'+esc(labels[originalIndex]==null?'—':labels[originalIndex])+'</b><small>posição no ranking</small></div>'+cells+(addTotal?'<div class="rh-rank-total">'+esc(fmt(total))+'</div>':'')+'</button>';
  }).join('');
  var totals=sets.map(function(ds){var t=(ds.data||[]).reduce(function(a,v){var n=Number(v);return a+(isFinite(n)?n:0);},0);return '<div class="rh-rank-value">'+esc(rhUniversalRankingValue(ds,t))+'</div>';}).join('');
  var grand=labels.reduce(function(a,_,i){return a+rhUniversalScore(data,i);},0);
  var foot='<div class="rh-rank-row rh-rank-foot" style="--rh-rank-cols:'+cols+'"><div></div><div>TOTAL</div>'+totals+(addTotal?'<div class="rh-rank-total">'+esc(fmt(grand))+'</div>':'')+'</div>';
  host.innerHTML='<div class="rh-rank-table">'+header+body+foot+'</div>';
  Array.prototype.forEach.call(host.querySelectorAll('[data-rh-rank-index]'),function(row){row.onclick=function(){if(!clickHandler)return;var oi=Number(row.dataset.rhRankIndex),di=rule.datasetIndex>=0?rule.datasetIndex:0;clickHandler(null,[{index:oi,datasetIndex:di}]);};});
}

var _rhUniversalChartBase=chart;
chart=function(id,type,data,options,clickHandler,fromCache){
  if(!fromCache)S.rhUniversalChartArgs[id]={type:type,data:rhUniversalClone(data||{}),options:rhUniversalClone(options||{}),clickHandler:clickHandler};
  rhUniversalEnsureSelector(id);
  if((S.rhChartModes[id]||'auto')==='ranking'){rhUniversalRenderRanking(id,data||{},clickHandler);return null;}
  rhUniversalHideRanking(id);
  var t=rhUniversalTransform(id,type,data,options,clickHandler);
  return _rhUniversalChartBase(id,t.type,t.data,t.options,t.clickHandler);
};

if(!$('_rh_universal_chart_styles')){
  var _rhucs=document.createElement('style');_rhucs.id='_rh_universal_chart_styles';
  _rhucs.textContent='.rh-chart-mode-global{margin-left:auto}.rh-chart-mode select{min-width:118px}.chart-wrap.rh-ranking-active{height:auto!important;min-height:260px;overflow:hidden!important}.rh-ranking-view{width:100%;max-height:430px;overflow-y:auto;overflow-x:hidden;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2)}.rh-rank-table{width:100%;min-width:0}.rh-rank-row{display:grid;grid-template-columns:42px minmax(135px,1.55fr) repeat(calc(var(--rh-rank-cols) - 2),minmax(74px,1fr));align-items:center;width:100%;min-width:0;border:0;border-bottom:1px solid var(--line-soft);background:transparent;color:var(--text);text-align:left;padding:0}.rh-rank-row>div{min-width:0;padding:10px 9px;overflow:hidden;text-overflow:ellipsis}.rh-rank-head{position:sticky;top:0;z-index:2;background:var(--surface);font-size:.67rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.rh-rank-head>div:not(:nth-child(-n+2)){text-align:right}.rh-rank-item{cursor:pointer;font:inherit}.rh-rank-item:hover{background:rgba(255,255,255,.045)}.rh-rank-pos{font-weight:900;text-align:center}.rh-rank-name b{display:block;white-space:normal;line-height:1.15}.rh-rank-name small{display:block;margin-top:3px;color:var(--muted);font-size:.68rem;font-weight:600}.rh-rank-value,.rh-rank-total{text-align:right;white-space:nowrap;font-weight:750}.rh-rank-total{font-weight:950}.rh-rank-foot{position:sticky;bottom:0;background:var(--surface);font-weight:950;border-bottom:0;border-top:2px solid var(--gold)}body.light .rh-ranking-view{border-color:rgba(16,49,78,.24)!important;background:#fff!important}body.light .rh-rank-head,body.light .rh-rank-foot{background:#eef4f8!important;color:#213b55!important}body.light .rh-rank-item:hover{background:#f3f7fa!important}@media(max-width:760px){.rh-rank-row{grid-template-columns:38px minmax(110px,1.4fr) repeat(calc(var(--rh-rank-cols) - 2),minmax(0,1fr))}.rh-rank-row>div{padding:8px 6px;font-size:.72rem}.rh-rank-name small{display:none}}';
  document.head.appendChild(_rhucs);
}
