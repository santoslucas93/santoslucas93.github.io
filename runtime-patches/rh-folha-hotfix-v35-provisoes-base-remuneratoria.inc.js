/* RH v35 — aplica a base remuneratória vigente às provisões de 13º e férias */
(function(){
'use strict';
var cache=new Map(),busy=false,timer=0;
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function money(v){try{return fmt(n(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}}
function parse(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function esc2(v){try{return esc(String(v==null?'':v))}catch(e){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}}
function d(v){if(!v)return null;var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x)?null:x}
function anchor(){var a=(window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(S.competencia?[S.competencia]:[])).slice().sort(function(x,y){return String(x.competencia||'').localeCompare(String(y.competencia||''))}),c=a[a.length-1],x=d(c&&c.competencia);return x?new Date(x.getFullYear(),x.getMonth()+1,0,12):new Date()}
function rates(){var e=(S.competencia&&S.competencia.encargos)||{},b=n(e.base_total_inss);return{inss:b&&n(e.inss_empresa)>0?n(e.inss_empresa)/b:.20,rat:b&&n(e.rat)>0?n(e.rat)/b:.01,terc:b&&n(e.terceiros)>0?n(e.terceiros)/b:.058,fgts:.08,pis:b&&n(e.valor_pis)>0?n(e.valor_pis)/b:.01}}
function ctx(id,a){var k=id+'|'+a.getFullYear()+'-'+String(a.getMonth()+1).padStart(2,'0');if(cache.has(k))return cache.get(k);var p=Promise.resolve(window.rhV34TerminationContext(id,a));cache.set(k,p);return p}
function base(c){return r2(n(c&&c.latest&&c.latest.salario)+(c&&c.recurring||[]).reduce(function(s,x){return s+n(x.valor)},0)+n(c&&c.variableAvg))}
function setKpi(p,label,val,small){Array.from(p.querySelectorAll('.kpi')).forEach(function(k){var s=k.querySelector('span'),b=k.querySelector('strong'),sm=k.querySelector('small');if(s&&b&&String(s.textContent||'').trim().toLowerCase()===label.toLowerCase()){b.textContent=money(val);if(sm&&small)sm.textContent=small}})}
function updateCc(panel,detailRows){var tables=panel.querySelectorAll('table'),t=tables.length>1?tables[0]:null;if(!t)return;var g={};detailRows.forEach(function(x){if(!g[x.cc])g[x.cc]={cc:x.cc,n:0,s:0,e:0,t:0};g[x.cc].n++;g[x.cc].s+=x.saldo;g[x.cc].e+=x.enc;g[x.cc].t+=x.total});var arr=Object.keys(g).map(function(k){return g[k]}).sort(function(a,b){return b.t-a.t});var tb=t.querySelector('tbody');if(tb)tb.innerHTML=arr.map(function(x){return '<tr><td><b>'+esc2(x.cc)+'</b></td><td class="money">'+x.n+'</td><td class="money">'+money(x.s)+'</td><td class="money">'+money(x.e)+'</td><td class="money"><b>'+money(x.t)+'</b></td></tr>'}).join('');var tf=t.querySelector('tfoot tr');if(tf&&tf.children.length>=5){tf.children[1].textContent=detailRows.length;tf.children[2].innerHTML='<b>'+money(detailRows.reduce(function(s,x){return s+x.saldo},0))+'</b>';tf.children[3].innerHTML='<b>'+money(detailRows.reduce(function(s,x){return s+x.enc},0))+'</b>';tf.children[4].innerHTML='<b>'+money(detailRows.reduce(function(s,x){return s+x.total},0))+'</b>'}}
async function patch13(){
  var p=document.querySelector('[data-plan-pane="13"]');if(!p||typeof window.rhV34TerminationContext!=='function')return;
  var table=p.querySelector('table.rh26-wide');if(!table)return;var a=anchor(),rr=rates(),trs=Array.from(table.querySelectorAll('tbody tr.rh26-row'));
  var contexts=await Promise.all(trs.map(function(tr){return ctx(tr.dataset.id,a)})),rows=[];
  trs.forEach(function(tr,i){var c=contexts[i],b=base(c),td=tr.children;if(td.length<16)return;var av=parseInt(String(td[3].textContent||'0'),10)||0,prev=parse(td[4].textContent),pm=av?b/12:0,current=b/12*av,pago=parse(td[7].textContent),adi=parse(td[8].textContent),aj=current-prev-pm,saldo=Math.max(0,current-pago-adi),ei=saldo*rr.inss,er=saldo*rr.rat,et=saldo*rr.terc,ef=saldo*rr.fgts,ep=saldo*rr.pis,enc=ei+er+et+ef+ep,total=saldo+enc,cc=String(td[1].textContent||'Sem CC').trim();
    td[2].textContent=money(b);td[2].title='Base remuneratória: salário vigente + verbas recorrentes + média variável detectada';
    td[4].textContent=money(prev);td[5].textContent=money(pm);td[6].textContent=money(aj);td[9].innerHTML='<b>'+money(saldo)+'</b>';td[10].textContent=money(ei);td[11].textContent=money(er);td[12].textContent=money(et);td[13].textContent=money(ef);td[14].textContent=money(ep);td[15].innerHTML='<b>'+money(total)+'</b>';
    var sm=td[0].querySelector('small');if(sm&&!td[0].querySelector('.rh35-base'))td[0].insertAdjacentHTML('beforeend','<small class="rh35-base">Base remun.: '+money(b)+'</small>');
    rows.push({cc:cc,prev:prev,pm:pm,aj:aj,pago:pago,adi:adi,saldo:saldo,ei:ei,er:er,et:et,ef:ef,ep:ep,enc:enc,total:total})
  });
  var th=table.querySelector('thead th:nth-child(3)');if(th)th.textContent='Base remun.';
  var tf=table.querySelector('tfoot tr');if(tf&&tf.children.length>=16){var sum=function(k){return rows.reduce(function(s,x){return s+n(x[k])},0)};[[4,'prev'],[5,'pm'],[6,'aj'],[7,'pago'],[8,'adi'],[9,'saldo'],[10,'ei'],[11,'er'],[12,'et'],[13,'ef'],[14,'ep'],[15,'total']].forEach(function(q){tf.children[q[0]].innerHTML=(q[0]===9||q[0]===15?'<b>':'')+money(sum(q[1]))+(q[0]===9||q[0]===15?'</b>':'')})}
  setKpi(p,'Saldo provisionado',rows.reduce(function(s,x){return s+x.saldo},0));setKpi(p,'Provisão do mês',rows.reduce(function(s,x){return s+x.pm},0));setKpi(p,'Encargos sobre saldo',rows.reduce(function(s,x){return s+x.enc},0));setKpi(p,'Custo provisionado',rows.reduce(function(s,x){return s+x.total},0));
  updateCc(p,rows);p.dataset.rh35='1';
}
async function patchFerias(){
  var p=document.querySelector('[data-plan-pane="ferias"]');if(!p||typeof window.rhV34TerminationContext!=='function')return;
  var table=p.querySelector('table.rh26-wide');if(!table)return;var a=anchor(),rr=rates(),trs=Array.from(table.querySelectorAll('tbody tr.rh26-row')),contexts=await Promise.all(trs.map(function(tr){return ctx(tr.dataset.id,a)})),rows=[];
  trs.forEach(function(tr,i){var c=contexts[i],b=base(c),td=tr.children;if(td.length<19)return;var av=parseInt(String(td[4].textContent||'0'),10)||0,prev=parse(td[5].textContent),pm=b/12*4/3,fer=b/12*av,ter=fer/3,current=fer+ter,goz=parse(td[10].textContent),ind=parse(td[11].textContent),aj=current-prev-pm,saldo=Math.max(0,current-goz-ind),ei=saldo*rr.inss,er=saldo*rr.rat,et=saldo*rr.terc,ef=saldo*rr.fgts,ep=saldo*rr.pis,enc=ei+er+et+ef+ep,total=saldo+enc,cc=String(td[1].textContent||'Sem CC').trim();
    td[5].textContent=money(prev);td[6].textContent=money(pm);td[7].textContent=money(aj);td[8].textContent=money(fer);td[9].textContent=money(ter);td[12].innerHTML='<b>'+money(saldo)+'</b>';td[13].textContent=money(ei);td[14].textContent=money(er);td[15].textContent=money(et);td[16].textContent=money(ef);td[17].textContent=money(ep);td[18].innerHTML='<b>'+money(total)+'</b>';
    if(!td[0].querySelector('.rh35-base'))td[0].insertAdjacentHTML('beforeend','<small class="rh35-base">Base remun.: '+money(b)+'</small>');
    rows.push({cc:cc,prev:prev,pm:pm,aj:aj,fer:fer,ter:ter,goz:goz,ind:ind,saldo:saldo,ei:ei,er:er,et:et,ef:ef,ep:ep,enc:enc,total:total})
  });
  var tf=table.querySelector('tfoot tr');if(tf&&tf.children.length>=19){var sum=function(k){return rows.reduce(function(s,x){return s+n(x[k])},0)};[[5,'prev'],[6,'pm'],[7,'aj'],[8,'fer'],[9,'ter'],[10,'goz'],[11,'ind'],[12,'saldo'],[13,'ei'],[14,'er'],[15,'et'],[16,'ef'],[17,'ep'],[18,'total']].forEach(function(q){tf.children[q[0]].innerHTML=(q[0]===12||q[0]===18?'<b>':'')+money(sum(q[1]))+(q[0]===12||q[0]===18?'</b>':'')})}
  setKpi(p,'Saldo provisionado',rows.reduce(function(s,x){return s+x.saldo},0));setKpi(p,'Provisão do mês',rows.reduce(function(s,x){return s+x.pm},0));setKpi(p,'Encargos sobre saldo',rows.reduce(function(s,x){return s+x.enc},0));setKpi(p,'Custo provisionado',rows.reduce(function(s,x){return s+x.total},0));
  updateCc(p,rows);p.dataset.rh35='1';
}
async function run(){if(busy)return;busy=true;try{await patch13();await patchFerias()}catch(e){console.warn('RH v35:',e)}finally{busy=false}}
function schedule(){clearTimeout(timer);timer=setTimeout(run,180)}
function style(){if(E('_rh35'))return;var s=document.createElement('style');s.id='_rh35';s.textContent='.rh35-base{display:block!important;color:var(--gold)!important;font-size:.68rem!important;margin-top:5px!important}.rh26-wide td:nth-child(n+3){white-space:nowrap}';document.head.appendChild(s)}
var obs=new MutationObserver(function(){style();schedule()});
function init(){style();schedule();obs.observe(document.body,{childList:true,subtree:true})}
window.rhV35ApplyProvisionRemuneration=run;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();