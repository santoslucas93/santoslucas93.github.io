/* RH v46b — composição tributária somente de leitura, conciliada ao valor visível */
(function(){
'use strict';

function n46b(v){var x=Number(v);return isFinite(x)?x:0}
function r246b(v){return Math.round((n46b(v)+Number.EPSILON)*100)/100}
function esc46b(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function norm46b(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function parseMoney46b(v){var s=String(v==null?'':v).replace(/R\$/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');return Number(s)||0}
function money46b(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n46b(v))}
function pct46b(v){return(n46b(v)*100).toFixed(2).replace('.',',')+'%'}
function dep46b(p,fallback){try{return departmentName(p&&p.departamento||fallback)||fallback||'—'}catch(e){return fallback||p&&p.departamento||'—'}}

function inss46b(base){
  base=Math.max(0,n46b(base));var bands=[[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]],prev=0,total=0;
  for(var i=0;i<bands.length&&base>prev;i++){var top=bands[i][0],slice=Math.min(base,top)-prev;if(slice>0)total+=slice*bands[i][1];prev=top}
  return Math.floor((total+1e-9)*100)/100
}
function irrf46b(base,gross){
  base=Math.max(0,n46b(base));gross=Math.max(0,n46b(gross));var tax=0;
  if(base<=2428.80)tax=0;else if(base<=2826.65)tax=base*.075-182.16;else if(base<=3751.05)tax=base*.15-394.16;else if(base<=4664.68)tax=base*.225-675.49;else tax=base*.275-908.73;
  tax=Math.max(0,tax);var red=0;if(gross<=5000)red=tax;else if(gross<=7350)red=Math.max(0,978.62-.133145*gross);
  return Math.floor((Math.max(0,tax-red)+1e-9)*100)/100
}

function forecastPeople46b(){
  /* S vive no escopo privado do app.js; não é publicado em window. */
  var pane=document.querySelector('#page-planejamento [data-plan-pane="folha"]'),table=pane&&pane.querySelector('#rh-plan-folha-table,table'),pool=typeof S!=='undefined'&&Array.isArray(S.pessoas)?S.pessoas:[];
  if(!table)return[];
  return Array.from(table.querySelectorAll('tbody tr')).filter(function(tr){return !tr.hidden&&getComputedStyle(tr).display!=='none'}).map(function(tr){
    var c=tr.cells||[],nameCell=c[0],name=String(nameCell&&nameCell.querySelector('b')?nameCell.querySelector('b').textContent:nameCell&&nameCell.textContent||'').trim();if(!name)return null;
    var p=pool.find(function(x){return norm46b(x.nome)===norm46b(name)})||null,forecastProv=parseMoney46b(c[2]&&c[2].textContent),ratio=p&&n46b(p.proventos)>0?forecastProv/n46b(p.proventos):1;if(!isFinite(ratio)||ratio<=0)ratio=1;
    var baseInss=p?n46b(p.base_inss)*ratio:0,baseFgts=p?n46b(p.base_fgts)*ratio:0,baseIrrf=p?n46b(p.base_irrf)*ratio:0,irrfRaw=p&&n46b(p.valor_irrf)>0?n46b(p.valor_irrf)*ratio:irrf46b(baseIrrf,forecastProv);
    return{name:name,dep:String(c[1]&&c[1].textContent||dep46b(p,'—')).trim(),matched:!!p,forecastProv:forecastProv,baseInss:baseInss,baseFgts:baseFgts,baseIrrf:baseIrrf,inss:inss46b(baseInss),irrf:irrfRaw,flat:baseFgts,fgts:p&&n46b(p.valor_fgts)>0?n46b(p.valor_fgts)*ratio:baseFgts}
  }).filter(Boolean)
}

function allocateCents46b(rows,target,weight){
  var cents=Math.max(0,Math.round(n46b(target)*100)),weights=rows.map(function(r){return Math.max(0,n46b(weight(r)))}),sum=weights.reduce(function(a,b){return a+b},0),out=rows.map(function(){return 0});
  if(!rows.length||!cents)return out;if(sum<=0){weights=rows.map(function(){return 1});sum=rows.length}
  var used=0,remainders=weights.map(function(w,i){var exact=cents*w/sum,whole=Math.floor(exact);out[i]=whole;used+=whole;return{i:i,rest:exact-whole}}).sort(function(a,b){return b.rest-a.rest||a.i-b.i});
  for(var k=0;k<cents-used;k++)out[remainders[k%remainders.length].i]++;
  return out.map(function(x){return x/100})
}

function readDisplayedTotals46b(button){
  var parts=button&&button.children||[],label=button&&button.querySelector('b'),nature=button&&button.querySelector('small'),value=button&&button.querySelector('strong');
  return{key:String(button&&button.dataset.rh47Tax||''),label:String(label&&label.textContent||'Imposto'),nature:String(nature&&nature.textContent||''),base:parseMoney46b(parts[1]&&parts[1].textContent),value:parseMoney46b(value&&value.textContent)}
}
function rawFields46b(row,key){
  if(key==='INSS_EMP')return{base:row.baseInss,value:row.inss};
  if(key==='IRRF')return{base:row.baseIrrf,value:row.irrf};
  if(key==='FGTS')return{base:row.baseFgts,value:row.fgts};
  if(/^(INSS_PAT|RAT|TERC|PIS)$/.test(key))return{base:row.baseFgts,value:row.flat};
  return{base:0,value:0}
}
function reconciledRows46b(button){
  var shown=readDisplayedTotals46b(button),source=forecastPeople46b(),rows=source.map(function(r){var f=rawFields46b(r,shown.key);return{name:r.name,dep:r.dep,matched:r.matched,forecastProv:r.forecastProv,rawBase:f.base,rawValue:f.value}});
  /* Se a folha ainda estiver terminando de carregar, nunca inventa rateio igual: usa
     proventos apenas para as linhas sem vínculo, preservando as bases reais já obtidas. */
  var hasIndividualBase=rows.some(function(r){return r.matched&&r.rawBase>0});
  if(!hasIndividualBase)rows.forEach(function(r){r.rawBase=r.forecastProv;r.rawValue=r.forecastProv});
  var bases=allocateCents46b(rows,shown.base,function(r){return r.rawBase}),values=allocateCents46b(rows,shown.value,function(r){return r.rawValue});
  rows.forEach(function(r,i){r.base=bases[i];r.value=values[i];r.rate=r.base?r.value/r.base:0});rows.sort(function(a,b){return String(a.name).localeCompare(String(b.name),'pt-BR',{sensitivity:'base'})});
  return{shown:shown,rows:rows}
}

function close46b(){var modal=document.getElementById('rh46b-tax-modal');if(!modal)return;document.body.style.overflow=modal.dataset.prevOverflow||'';modal.remove()}
function styles46b(){
  if(document.getElementById('_rh46b_tax'))return;var s=document.createElement('style');s.id='_rh46b_tax';s.textContent=
  '.rh47-tax-line:hover,.rh47-tax-line:focus-visible{background:color-mix(in srgb,var(--gold) 7%,transparent)!important;outline:0}'+
  '#rh46b-tax-modal{position:fixed;inset:0;z-index:12500;display:grid;place-items:center;padding:22px;background:rgba(2,12,23,.74);backdrop-filter:blur(5px)}#rh46b-tax-modal .rh46b-card{width:min(1180px,calc(100vw - 44px));max-height:calc(100vh - 44px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--surface);color:var(--text);box-shadow:0 30px 80px rgba(0,0,0,.45)}'+
  '#rh46b-tax-modal header{display:flex;justify-content:space-between;gap:18px;padding:20px 22px 15px;border-bottom:1px solid var(--line-soft)}#rh46b-tax-modal h2{margin:5px 0 7px;font-size:1.55rem}#rh46b-tax-modal .kicker{color:var(--gold-2);font-size:.67rem;font-weight:900;letter-spacing:.12em}#rh46b-tax-modal .ref{display:inline-flex;padding:4px 9px;border:1px solid var(--line-soft);border-radius:999px;color:var(--muted);font-size:.7rem;font-weight:800}#rh46b-tax-modal .close{width:44px;height:44px;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2);color:var(--text);font-size:1.7rem;cursor:pointer}'+
  '#rh46b-tax-modal .sub{margin:0;padding:12px 22px 0;color:var(--muted);font-size:.78rem}#rh46b-tax-modal .body{min-height:0;overflow:auto;padding:14px 22px 12px}#rh46b-tax-modal .wrap{overflow:auto;border:1px solid var(--line-soft);border-radius:12px}#rh46b-tax-modal table{width:100%;table-layout:fixed;border-collapse:collapse}#rh46b-tax-modal th,#rh46b-tax-modal td{padding:10px 11px;border-bottom:1px solid var(--line-soft);overflow-wrap:break-word}#rh46b-tax-modal th{background:var(--surface-2);color:var(--muted);font-size:.66rem;text-transform:uppercase}#rh46b-tax-modal td{font-size:.76rem}#rh46b-tax-modal .money{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}#rh46b-tax-modal tfoot td{border-top:2px solid var(--gold);background:var(--surface-2);font-weight:900}#rh46b-tax-modal .count{padding-top:8px;color:var(--muted);font-size:10px;text-align:right}@media(max-width:760px){#rh46b-tax-modal{padding:8px}#rh46b-tax-modal .rh46b-card{width:calc(100vw - 16px);max-height:calc(100vh - 16px)}#rh46b-tax-modal table{min-width:760px}}';document.head.appendChild(s)
}
function open46b(button){
  var model=reconciledRows46b(button);if(!model.rows.length){try{toast('Não há colaboradores disponíveis para esta composição.',true)}catch(e){}return}close46b();styles46b();
  var s=model.shown,html='<div id="rh46b-tax-modal" role="dialog" aria-modal="true"><section class="rh46b-card"><header><div><span class="kicker">PRÓXIMA FOLHA · COMPOSIÇÃO POR COLABORADOR</span><h2>'+esc46b(s.label)+'</h2><span class="ref">Referência: Consolidado</span></div><button type="button" class="close" aria-label="Fechar">×</button></header><p class="sub">'+esc46b(s.nature)+' · Composição conciliada exclusivamente ao valor já exibido no painel.</p><div class="body"><div class="wrap"><table data-rh-authoritative-composition="1"><colgroup><col style="width:32%"><col style="width:18%"><col style="width:16%"><col style="width:12%"><col style="width:14%"><col style="width:8%"></colgroup><thead><tr><th>Colaborador</th><th>Departamento</th><th class="money">Base individual</th><th class="money">Alíquota efetiva</th><th class="money">Valor</th><th class="money">% do total</th></tr></thead><tbody>'+model.rows.map(function(r){return'<tr><td>'+esc46b(r.name)+'</td><td>'+esc46b(r.dep)+'</td><td class="money">'+money46b(r.base)+'</td><td class="money">'+pct46b(r.rate)+'</td><td class="money">'+money46b(r.value)+'</td><td class="money">'+(s.value?pct46b(r.value/s.value):'—')+'</td></tr>'}).join('')+'</tbody><tfoot data-rh-authoritative-total="1"><tr><td>TOTAL</td><td>'+model.rows.length+' colaboradores</td><td class="money">'+money46b(s.base)+'</td><td class="money">'+pct46b(s.base?s.value/s.base:0)+'</td><td class="money">'+money46b(s.value)+'</td><td class="money">'+(s.value?'100,00%':'—')+'</td></tr></tfoot></table></div><div class="count">'+model.rows.length+' colaboradores</div></div></section></div>';
  document.body.insertAdjacentHTML('beforeend',html);var modal=document.getElementById('rh46b-tax-modal');modal.dataset.prevOverflow=document.body.style.overflow||'';document.body.style.overflow='hidden';modal.querySelector('.close').onclick=close46b;modal.addEventListener('click',function(e){if(e.target===modal)close46b()});modal.querySelector('.close').focus()
}

/* Registrado antes do v47: o clique só lê o painel e nunca chama o recálculo. */
window.addEventListener('click',function(e){var button=e.target&&e.target.closest?e.target.closest('.rh47-tax-line[data-rh47-tax]'):null;if(!button)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();open46b(button)},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape')close46b()},true);
window.RH_TAX_COMPOSITION_READONLY_V46B=true;
})();
