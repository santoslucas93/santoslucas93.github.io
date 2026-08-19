(function(){
'use strict';
var cache={competencias:null,folha:null,colaboradores:null,beneficios:null};
var nativeFetch=window.fetch.bind(window);
window.fetch=async function(){
  var res=await nativeFetch.apply(window,arguments);
  try{
    var url=String(arguments[0]&&arguments[0].url||arguments[0]||'');
    var clone=res.clone();
    if(/rh_competencias\?/.test(url)) cache.competencias=await clone.json();
    else if(/rh_folha_colaboradores\?/.test(url)) cache.folha=await clone.json();
    else if(/rh_colaboradores\?/.test(url)) cache.colaboradores=await clone.json();
    else if(/beneficios_colaboradores\?/.test(url)) cache.beneficios=await clone.json();
  }catch(e){}
  return res;
};

var money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
function fmt(v){return money.format(Number(v)||0);}
function n(v){return Number(v)||0;}
function currentComp(){
  var sel=document.getElementById('competencia-select');
  var id=sel&&sel.value;
  return (cache.competencias||[]).find(function(x){return String(x.id)===String(id);})||(cache.competencias||[])[0]||null;
}
function people(){
  var by={};(cache.colaboradores||[]).forEach(function(x){by[x.id]=x;});
  return (cache.folha||[]).map(function(f){return Object.assign({},by[f.colaborador_id]||{},f);});
}
function benefitsByPerson(){
  var m={};(cache.beneficios||[]).forEach(function(b){m[b.colaborador_id]=b;});return m;
}
function totals(){
  var c=currentComp()||{},e=c.encargos||{};
  var prov=n(c.proventos),fgts=n(e.valor_fgts||c.valor_fgts),base=n(e.base_total_inss);
  var patronal=base*.20,rat=base*.01,terc=base*.058;
  var ben=(cache.beneficios||[]).reduce(function(a,b){return a+n(b.seguro_vida)+n(b.assistencia_medica||b.assist_medica)+n(b.vr_caixa)+n(b.vale_transporte);},0);
  return {prov:prov,fgts:fgts,patronal:patronal,rat:rat,terc:terc,beneficios:ben,custo:prov+fgts+patronal+rat+terc+ben,encargosPatronais:fgts+patronal+rat+terc,totalRecolhimentos:n(e.total_inss)+fgts+n(e.valor_pis)+n(e.valor_total_irrf||e.valor_irrf||c.valor_irrf)};
}
function repairText(root){
  var map={'BenefÃ­cios':'Benefícios','SalÃ¡rios':'Salários','AssistÃªncia':'Assistência','MÃ©dica':'Médica','benefÃ­cio':'benefício','nÃ£o':'não','disponÃ­veis':'disponíveis','cÃ¡lculo':'cálculo','competÃªncia':'competência','Terceiros â':'Terceiros —','â¶':'▶'};
  var w=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);var node;
  while((node=w.nextNode())){var s=node.nodeValue,ns=s;Object.keys(map).forEach(function(k){ns=ns.split(k).join(map[k]);});if(ns!==s)node.nodeValue=ns;}
}
function fixCusto(){
  var wrap=document.getElementById('custo-real-kpis');if(!wrap||!cache.folha)return;
  var t=totals();
  var cards=wrap.querySelectorAll('.kpi');
  if(cards[0]){cards[0].querySelector('span').textContent='Custo total LNB';cards[0].querySelector('strong').textContent=fmt(t.custo);}
  if(cards[1]){cards[1].querySelector('span').textContent='Salários brutos';cards[1].querySelector('strong').textContent=fmt(t.prov);}
  if(cards[2]){cards[2].querySelector('span').textContent='FGTS + encargos patronais';cards[2].querySelector('strong').textContent=fmt(t.encargosPatronais);}
  if(t.beneficios>0){
    var b=cards[3];if(!b){b=document.createElement('div');b.className='kpi';b.innerHTML='<span>Benefícios</span><strong></strong><small>Integrado à Gestão de Benefícios</small>';wrap.appendChild(b);}b.querySelector('strong').textContent=fmt(t.beneficios);
  }
  var note=document.getElementById('custo-ben-note');if(note)note.hidden=true;
}
function fixCharges(){
  var wrap=document.getElementById('charges-kpis');if(!wrap||!cache.competencias)return;
  var t=totals();
  var old=wrap.querySelector('.rh-total-recolhimentos');if(old)old.remove();
  var d=document.createElement('div');d.className='kpi rh-total-recolhimentos';d.innerHTML='<span>Total de recolhimentos</span><strong>'+fmt(t.totalRecolhimentos)+'</strong><small>INSS + FGTS + PIS + IRRF</small>';wrap.appendChild(d);
}
function fixIrrf(){
  var modal=document.getElementById('irrf-modal');if(!modal)return;
  modal.style.maxWidth='1180px';modal.style.width='min(1180px,96vw)';
  var body=modal.querySelector('.irrf-body');if(body){body.style.overflow='auto';body.style.maxHeight='60vh';}
  var table=modal.querySelector('table');if(table){table.style.minWidth='900px';table.style.width='100%';}
}
function go(view){var b=document.querySelector('[data-view="'+view+'"]');if(b)b.click();}
function bindCharts(){
  if(!window.Chart||!Chart.getChart)return;
  var ids=['chart-composicao','chart-departamentos','chart-vinculos','chart-rubricas','chart-encargos','chart-rateio','chart-custo-real'];
  ids.forEach(function(id){var cv=document.getElementById(id);if(!cv||cv.dataset.rhHotfixClick)return;cv.dataset.rhHotfixClick='1';cv.style.cursor='pointer';cv.addEventListener('click',function(evt){
    var ch=Chart.getChart(cv);if(!ch)return;var pts=ch.getElementsAtEventForMode(evt,'nearest',{intersect:true},true);var idx=pts[0]&&pts[0].index;
    if(id==='chart-departamentos'||id==='chart-rateio'){
      if(idx==null)return;var label=ch.data.labels[idx];go('colaboradores');setTimeout(function(){var sel=document.getElementById('filter-dept');if(sel){var opt=[].slice.call(sel.options).find(function(o){return o.textContent===label;});if(opt){sel.value=opt.value;sel.dispatchEvent(new Event('change',{bubbles:true}));}}},60);
    }else if(id==='chart-vinculos'){go('colaboradores');}
    else if(id==='chart-encargos'){go('encargos');}
    else if(id==='chart-rubricas'){go('rubricas');}
    else if(id==='chart-custo-real'){if(idx==null)return;var name=ch.data.labels[idx];go('colaboradores');setTimeout(function(){var q=document.getElementById('employee-search');if(q){q.value=name;q.dispatchEvent(new Event('input',{bubbles:true}));}},60);}
    else{go('folha');}
  });});
}
function style(){if(document.getElementById('rh-fixes-style'))return;var s=document.createElement('style');s.id='rh-fixes-style';s.textContent='#irrf-modal .modal-card{max-width:1180px!important;width:min(1180px,96vw)!important}#irrf-modal .irrf-body{overflow:auto!important;max-height:60vh!important}#irrf-modal table{min-width:900px;width:100%}.rh-total-recolhimentos{border-color:rgba(240,184,45,.55)!important}canvas[data-rh-hotfix-click="1"]{cursor:pointer}';document.head.appendChild(s);}
function run(){style();repairText(document.body);fixCusto();fixCharges();fixIrrf();bindCharts();}
var scheduled=false;var mo=new MutationObserver(function(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;run();});});
document.addEventListener('DOMContentLoaded',function(){mo.observe(document.body,{subtree:true,childList:true,characterData:true});run();setInterval(run,1500);});
})();