/* RH v32 — corrige contagem de avos de 13º quando o desligamento ocorre antes de 15 dias no mês */
(function(){
'use strict';
var oldRender=window.rhV31RenderTermination;
if(typeof oldRender!=='function')return;
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function d(v){if(!v)return null;if(v instanceof Date)return new Date(v.getTime());var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x)?null:x}
function money(v){try{return fmt(n(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}}
function avos13(y,adm,dem,through){adm=d(adm);dem=d(dem);var q=0;for(var i=0;i<Math.min(12,through);i++){var s=new Date(y,i,1,12),e=new Date(y,i+1,0,12),a=s,b=e;if(adm&&adm>a)a=adm;if(dem&&dem<b)b=dem;if(b>=a&&Math.floor((b-a)/86400000)+1>=15)q++}return q}
function inssBands(dt){var y=dt.getFullYear();if(y>=2026)return [[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]];if(y===2025)return [[1518,.075],[2793.88,.09],[4190.83,.12],[8157.41,.14]];if(y===2024)return [[1412,.075],[2666.68,.09],[4000.03,.12],[7786.02,.14]];if(y===2023)return [[1320,.075],[2571.29,.09],[3856.94,.12],[7507.49,.14]];return [[1412,.075],[2666.68,.09],[4000.03,.12],[7786.02,.14]]}
function inss(base,dt){base=Math.max(0,n(base));var b=inssBands(dt),prev=0,total=0;for(var i=0;i<b.length&&base>prev;i++){var top=b[i][0],rate=b[i][1],slice=Math.min(base,top)-prev;if(slice>0)total+=slice*rate;prev=top}return Math.floor((total+1e-9)*100)/100}
function irrfCfg(dt){var y=dt.getFullYear(),m=dt.getMonth()+1;if(y>=2026||y===2025&&m>=5)return [[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]];if(y===2025||y===2024)return [[2259.20,0,0],[2826.65,.075,169.44],[3751.05,.15,381.44],[4664.68,.225,662.77],[Infinity,.275,896.00]];if(y===2023&&m>=5)return [[2112,0,0],[2826.65,.075,158.40],[3751.05,.15,370.40],[4664.68,.225,651.73],[Infinity,.275,884.96]];return [[1903.98,0,0],[2826.65,.075,142.80],[3751.05,.15,354.80],[4664.68,.225,636.13],[Infinity,.275,869.36]]}
function irrf(gross,inssVal,dt){var base=Math.max(0,n(gross)-n(inssVal)),cfg=irrfCfg(dt),tax=0;for(var i=0;i<cfg.length;i++){if(base<=cfg[i][0]){tax=Math.max(0,base*cfg[i][1]-cfg[i][2]);break}}if(dt.getFullYear()>=2026){var rend=n(gross),red=0;if(rend<=5000)red=tax;else if(rend<=7350)red=Math.max(0,978.62-(.133145*rend));tax=Math.max(0,tax-red)}return Math.floor((tax+1e-9)*100)/100}
function correct(x){
  if(!x||!x.p||!x.date)return x;
  var dt=d(x.date);if(!dt)return x;
  var correctAvos=avos13(dt.getFullYear(),x.p.admissao,dt,dt.getMonth()+1);
  if(correctAvos===x.a13)return x;
  x.a13=correctAvos;
  x.v13=r2(n(x.salary)/12*correctAvos);
  if(!x.hist){x.inss13=r2(inss(x.v13,dt));x.irrf13=r2(irrf(x.v13,x.inss13,dt));}
  x.bruto=r2(n(x.saldo)+n(x.v13)+n(x.vf)+n(x.ven)+n(x.ter)+n(x.aviso)+n(x.av13)+n(x.avfut)+n(x.cct)+n(x.cred));
  x.ded=r2(n(x.inss)+n(x.inss13)+n(x.irrf)+n(x.irrf13)+n(x.operational)+n(x.noticeDisc));
  x.liq=r2(x.bruto-x.ded);
  x.fg13=r2((n(x.v13)+n(x.av13))*.08);
  x.fgTotal=r2(n(x.fgm)+n(x.fg13)+n(x.fgav));
  x.custo=r2(x.bruto+x.fgTotal+n(x.multa));
  return x;
}
function setCard(box,label,value){Array.from(box.querySelectorAll('.kpi')).forEach(function(card){var s=card.querySelector('span'),b=card.querySelector('strong');if(s&&b&&String(s.textContent||'').trim().toLowerCase()===label.toLowerCase())b.textContent=money(value)})}
function setLine(root,prefix,newLabel,value){if(!root)return;Array.from(root.children).forEach(function(row){var s=row.querySelector('span'),b=row.querySelector('b');if(!s||!b)return;var t=String(s.textContent||'').trim();if(t.toLowerCase().indexOf(prefix.toLowerCase())===0){s.textContent=newLabel||t;b.textContent=money(value)}})}
function setBase(box,label,value){Array.from(box.querySelectorAll('.rh26-base .rh26-memory>div')).forEach(function(row){var s=row.querySelector('span'),b=row.querySelector('b');if(s&&b&&String(s.textContent||'').trim().toLowerCase()===label.toLowerCase())b.textContent=money(value)})}
function patchCompare(box,x){if(!x.hist)return;var vals={'Total bruto':[x.bruto,x.hist.gross],'Deduções':[x.ded,x.hist.discounts],'Líquido':[x.liq,x.hist.net],'FGTS da rescisão':[x.fgTotal,x.hist.fgts]};var table=box.querySelector('.rh31-compare table');if(!table)return;Array.from(table.querySelectorAll('tbody tr')).forEach(function(tr){var td=tr.children;if(td.length<4)return;var item=String(td[0].textContent||'').trim(),v=vals[item];if(!v)return;var diff=r2(v[0]-v[1]);td[1].textContent=money(v[0]);td[2].textContent=money(v[1]);td[3].innerHTML='<b>'+money(diff)+'</b>';td[3].classList.toggle('rh31-ok',Math.abs(diff)<=.02);td[3].classList.toggle('rh31-warn',Math.abs(diff)>.02)})}
function patch(x){var box=E('rh26-result');if(!box||!x)return;setCard(box,'Total bruto',x.bruto);setCard(box,'Deduções',x.ded);setCard(box,'Líquido',x.liq);setCard(box,'Custo empregador',x.custo);var blocks=box.querySelectorAll('.rh26-term .rh-res-lines');setLine(blocks[0],'13º proporcional','13º proporcional '+x.a13+'/12',x.v13);setLine(blocks[1],'INSS 13º',null,x.inss13);setLine(blocks[1],'IRRF 13º',null,x.irrf13);setBase(box,'FGTS 13º',x.fg13);setBase(box,'Base INSS 13º',x.v13);patchCompare(box,x)}
async function render(){await oldRender();var x=correct(window.rhV31TerminationResult);window.rhV31TerminationResult=x;patch(x);return x}
function bind(){var btn=E('rh26-calc');if(!btn||btn.dataset.v32==='1')return;btn.dataset.v32='1';btn.onclick=function(e){if(e)e.preventDefault();render().catch(function(err){try{toast('Não foi possível calcular a rescisão: '+err.message,true)}catch(ignore){}})}}
var obs=new MutationObserver(function(){bind()});function init(){bind();obs.observe(document.body,{childList:true,subtree:true})}
window.rhV32RenderTermination=render;window.rhV32CorrectTermination=correct;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
