/* RH v33 — garante aplicação visual e lógica da correção de avos no simulador de rescisão */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function d(v){if(!v)return null;if(v instanceof Date)return new Date(v.getTime());var x=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(x)?null:x}
function money(v){try{return fmt(n(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}}
function avos13(y,adm,dem,through){adm=d(adm);dem=d(dem);var q=0;for(var i=0;i<Math.min(12,through);i++){var s=new Date(y,i,1,12),e=new Date(y,i+1,0,12),a=s,b=e;if(adm&&adm>a)a=adm;if(dem&&dem<b)b=dem;if(b>=a&&Math.floor((b-a)/86400000)+1>=15)q++}return q}
function isPedido(){var s=E('rh26-type');if(!s)return false;var txt=String((s.selectedOptions&&s.selectedOptions[0]&&s.selectedOptions[0].textContent)||s.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return /pedido.*empregado|pedido.*demissao|pedido do empregado/.test(txt)||String(s.value||'').toLowerCase().indexOf('pedido')>=0}
function syncNotice(){var s=E('rh26-notice');if(!s||!isPedido())return;var na=Array.from(s.options||[]).find(function(o){var t=String(o.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return /nao aplicavel/.test(t)||String(o.value||'').toLowerCase()==='na'});if(na)s.value=na.value}
function correct(){var x=window.rhV31TerminationResult;if(!x||!x.p||!x.date)return null;var dt=d(x.date);if(!dt)return null;var adm=x.p.admissao||x.p.data_admissao||x.p.admission_date||null;var a=avos13(dt.getFullYear(),adm,dt,dt.getMonth()+1);if(a!==x.a13){x.a13=a;x.v13=r2(n(x.salary)/12*a);x.bruto=r2(n(x.saldo)+n(x.v13)+n(x.vf)+n(x.ven)+n(x.ter)+n(x.aviso)+n(x.av13)+n(x.avfut)+n(x.cct)+n(x.cred));x.ded=r2(n(x.inss)+n(x.inss13)+n(x.irrf)+n(x.irrf13)+n(x.operational)+n(x.noticeDisc));x.liq=r2(x.bruto-x.ded);x.fg13=r2((n(x.v13)+n(x.av13))*.08);x.fgTotal=r2(n(x.fgm)+n(x.fg13)+n(x.fgav));x.custo=r2(x.bruto+x.fgTotal+n(x.multa));window.rhV31TerminationResult=x}return x}
function setCard(box,label,value){Array.from(box.querySelectorAll('.kpi')).forEach(function(card){var s=card.querySelector('span'),b=card.querySelector('strong');if(s&&b&&String(s.textContent||'').trim().toLowerCase()===label.toLowerCase())b.textContent=money(value)})}
function patchLine(root,prefix,label,value){if(!root)return;Array.from(root.children).forEach(function(row){var s=row.querySelector('span'),b=row.querySelector('b');if(!s||!b)return;var t=String(s.textContent||'').trim();if(t.toLowerCase().indexOf(prefix.toLowerCase())===0){s.textContent=label||t;b.textContent=money(value)}})}
function patchBase(box,label,value){Array.from(box.querySelectorAll('.rh26-base .rh26-memory>div')).forEach(function(row){var s=row.querySelector('span'),b=row.querySelector('b');if(s&&b&&String(s.textContent||'').trim().toLowerCase()===label.toLowerCase())b.textContent=money(value)})}
function patchCompare(box,x){if(!x.hist)return;var vals={'Total bruto':[x.bruto,x.hist.gross],'Deduções':[x.ded,x.hist.discounts],'Líquido':[x.liq,x.hist.net],'FGTS da rescisão':[x.fgTotal,x.hist.fgts]};Array.from(box.querySelectorAll('.rh31-compare tbody tr')).forEach(function(tr){var td=tr.children;if(td.length<4)return;var item=String(td[0].textContent||'').trim(),v=vals[item];if(!v)return;var diff=r2(v[0]-v[1]);td[1].textContent=money(v[0]);td[2].textContent=money(v[1]);td[3].innerHTML='<b>'+money(diff)+'</b>';td[3].classList.toggle('rh31-ok',Math.abs(diff)<=.02);td[3].classList.toggle('rh31-warn',Math.abs(diff)>.02)})}
var busy=false;
function apply(){if(busy)return;var box=E('rh26-result');if(!box)return;var x=correct();if(!x)return;busy=true;try{syncNotice();setCard(box,'Total bruto',x.bruto);setCard(box,'Deduções',x.ded);setCard(box,'Líquido',x.liq);setCard(box,'Custo empregador',x.custo);var blocks=box.querySelectorAll('.rh26-term .rh-res-lines');patchLine(blocks[0],'13º proporcional','13º proporcional '+x.a13+'/12',x.v13);patchBase(box,'FGTS 13º',x.fg13);patchBase(box,'Base INSS 13º',x.v13);patchCompare(box,x)}finally{setTimeout(function(){busy=false},0)}}
function schedule(){[0,60,180,400].forEach(function(ms){setTimeout(apply,ms)})}
function bind(){var btn=E('rh26-calc');if(btn&&!btn.dataset.v33){btn.dataset.v33='1';btn.addEventListener('click',schedule,true)}var type=E('rh26-type');if(type&&!type.dataset.v33){type.dataset.v33='1';type.addEventListener('change',function(){syncNotice();schedule()})}syncNotice()}
var obs=new MutationObserver(function(){bind();schedule()});
function init(){bind();obs.observe(document.body,{childList:true,subtree:true})}
window.rhV33ApplyTermination=apply;window.rhV33CorrectTermination=correct;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
