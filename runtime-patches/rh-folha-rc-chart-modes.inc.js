/* RH & Folha — Release Candidate: modos de gráfico globais + ranking real */
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
  if(mode==='auto')return {type:t,data:d,options:o,clickHandler:h};
  if(mode==='columns'){
    t='bar';delete o.indexAxis;
  }else if(mode==='bars'){
    t='bar';o.indexAxis='y';
  }else if(mode==='ranking'){
    t='bar';o.indexAxis='y';var ranked=rhUniversalRanking(d);d=ranked.data;h=rhUniversalClickMap(h,ranked.order);
    o.plugins=o.plugins||{};o.plugins.title={display:true,text:'Ranking · maior para menor'};
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

var _rhUniversalChartBase=chart;
chart=function(id,type,data,options,clickHandler,fromCache){
  if(!fromCache)S.rhUniversalChartArgs[id]={type:type,data:rhUniversalClone(data||{}),options:rhUniversalClone(options||{}),clickHandler:clickHandler};
  rhUniversalEnsureSelector(id);
  var t=rhUniversalTransform(id,type,data,options,clickHandler);
  return _rhUniversalChartBase(id,t.type,t.data,t.options,t.clickHandler);
};

if(!$('_rh_universal_chart_styles')){
  var _rhucs=document.createElement('style');_rhucs.id='_rh_universal_chart_styles';
  _rhucs.textContent='.rh-chart-mode-global{margin-left:auto}.rh-chart-mode select{min-width:118px}';
  document.head.appendChild(_rhucs);
}
