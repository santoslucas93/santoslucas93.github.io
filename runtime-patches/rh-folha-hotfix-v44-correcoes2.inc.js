/* RH v44 — correcoes 2: fix Bug 1 robusto + timing SUPABASE_KEY */
(function(){
'use strict';

/* ─── FIX 1: rhRosterActiveIds inclui valores nao-UUID para proteger rh26-type/notice ───
   v38's filterTerminationSelect usa ids() → rhRosterActiveIds(). Ela remove qualquer
   option.value que nao esteja no set. Os selects de tipo ('pedido','empregador') e aviso
   ('indenizado','na','desconto') nao sao UUIDs, entao eram removidos.
   Solucao: incluir todos os valores nao-colaborador no set retornado, para que o filtro
   do v38 os preserve. ─────────────────────────────────────────────────────────────────── */
function patchRhRosterActiveIds(){
  if(typeof window.rhRosterActiveIds!=='function')return false;
  if(window.rhRosterActiveIds._v44safe)return true;
  var orig=window.rhRosterActiveIds;
  window.rhRosterActiveIds=function(){
    var set=orig();
    /* valores conhecidos dos selects rh26-type e rh26-notice */
    var safe=new Set(set);
    ['pedido','empregador','sem-justa-causa','justa-causa','demissao',
     'na','indenizado','desconto','trabalhado','cumprido','nao','sim',
     '','true','false','none','null','undefined'].forEach(function(v){safe.add(v)});
    return safe;
  };
  window.rhRosterActiveIds._v44safe=true;
  return true;
}

/* Tenta aplicar imediatamente; se ainda nao existe, tenta novamente com delays */
var _patchAttempts=0;
function tryPatchIds(){
  if(patchRhRosterActiveIds())return;
  if(++_patchAttempts<10)setTimeout(tryPatchIds,150);
}

/* ─── FIX 2: defer rhRosterLoad ate CFG estar populado ────────────────────────────────
   Patches injetados antes do boot marker rodam antes de start(), que e quem popula CFG.
   Portanto qualquer chamada a api() no DOMContentLoaded falha com "null.SUPABASE_KEY".
   Solucao: envolver rhRosterLoad para esperar CFG ser preenchido antes de chamar api(). */
function cfgReady(){
  /* CFG pode ser window.CFG (global var no app.js) */
  try{return !!(window.CFG&&window.CFG.SUPABASE_KEY&&window.CFG.SUPABASE_URL)}catch(e){return false}
}
function waitCfg(cb,maxMs){
  if(cfgReady()){cb();return}
  var elapsed=0,interval=80;
  var t=setInterval(function(){
    elapsed+=interval;
    if(cfgReady()||(maxMs&&elapsed>=maxMs)){clearInterval(t);cb()}
  },interval);
}
function patchRhRosterLoad(){
  if(typeof window.rhRosterLoad!=='function')return false;
  if(window.rhRosterLoad._v44deferred)return true;
  var orig=window.rhRosterLoad;
  window.rhRosterLoad=function(force){
    if(cfgReady())return orig(force);
    return new Promise(function(resolve,reject){
      waitCfg(function(){orig(force).then(resolve).catch(reject)},4000);
    });
  };
  window.rhRosterLoad._v44deferred=true;
  return true;
}
var _patchRosterAttempts=0;
function tryPatchRoster(){
  if(patchRhRosterLoad())return;
  if(++_patchRosterAttempts<10)setTimeout(tryPatchRoster,150);
}

/* ─── Captura + restaura options de rh26-type e rh26-notice ──────────────────────────
   Garante que, mesmo que o v38 remova as opcoes antes dos patches acima entrarem,
   restauramos a partir da captura feita na primeira vez que os selects foram vistos. */
var _capturedType=null,_capturedNotice=null;

function captureOpts(id){
  var el=document.getElementById(id);
  if(!el||el.options.length<2)return null;
  return Array.from(el.options).map(function(o){
    return{v:o.value,t:o.text,sel:o.defaultSelected};
  });
}

function repairOpts(id,saved){
  if(!saved||!saved.length)return;
  var el=document.getElementById(id);
  if(!el)return;
  var existing=new Set(Array.from(el.options).map(function(o){return o.value;}));
  var missing=saved.filter(function(o){return!existing.has(o.v);});
  if(!missing.length)return;
  var cur=el.value;
  missing.forEach(function(o){
    var opt=document.createElement('option');
    opt.value=o.v;opt.textContent=o.t;if(o.sel)opt.defaultSelected=true;
    el.appendChild(opt);
  });
  if(cur)el.value=cur;
  console.log('[RH v44] restaurou',missing.length,'opcoes em #'+id);
}

function captureAndRepair(){
  /* tenta capturar pela primeira vez */
  if(!_capturedType){var c=captureOpts('rh26-type');if(c&&c.length>1)_capturedType=c;}
  if(!_capturedNotice){var n=captureOpts('rh26-notice');if(n&&n.length>1)_capturedNotice=n;}
  /* repara se houver opcoes faltando */
  repairOpts('rh26-type',_capturedType);
  repairOpts('rh26-notice',_capturedNotice);
}

/* Observa o DOM para detectar quando os selects aparecem ou quando opcoes sao removidas */
var _roInstalled=false;
function installObserver(){
  if(_roInstalled)return;
  _roInstalled=true;
  var mo=new MutationObserver(function(muts){
    var needsCheck=muts.some(function(m){
      if(m.removedNodes.length){
        /* verifica se algum option foi removido de rh26-type ou rh26-notice */
        for(var i=0;i<m.removedNodes.length;i++){
          var n=m.removedNodes[i];
          if(n.tagName==='OPTION'){
            var p=n.parentElement;
            if(p&&(p.id==='rh26-type'||p.id==='rh26-notice'))return true;
          }
        }
      }
      /* verifica se novos selects foram adicionados ao DOM (para capturar pela 1a vez) */
      if(m.addedNodes.length){
        for(var j=0;j<m.addedNodes.length;j++){
          var a=m.addedNodes[j];
          if(a.nodeType===1){
            if(a.id==='rh26-type'||a.id==='rh26-notice')return true;
            if(a.querySelector&&(a.querySelector('#rh26-type')||a.querySelector('#rh26-notice')))return true;
          }
        }
      }
      return false;
    });
    if(needsCheck)setTimeout(captureAndRepair,0);
  });
  mo.observe(document.body,{childList:true,subtree:true});
}

/* ─── Inicialização ───────────────────────────────────────────────────────────────── */
function init(){
  tryPatchIds();
  tryPatchRoster();
  installObserver();
  /* tenta capturar agora e com delays (selects podem nao existir ainda) */
  [200,500,1000,2000].forEach(function(ms){setTimeout(captureAndRepair,ms);});
  /* reaplica captura ao navegar para a pagina de planejamento */
  document.addEventListener('click',function(e){
    if(!e.target||!e.target.closest)return;
    var tab=e.target.closest('[data-plan-tab],[data-go]');
    if(tab)setTimeout(captureAndRepair,100);
  },true);
}

window.RH_CORRECOES_V44=true;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
