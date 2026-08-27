/* RH v84 — conferencia automatica entre composicao individual e demonstrativo oficial. */
(function(){
'use strict';
function n84(v){var n=Number(v);return isFinite(n)?n:0}
function r84(v){return Math.round((n84(v)+Number.EPSILON)*100)/100}
function sum84(a,from,to){var s=0;a=a||[];for(var i=from||0;i<(to==null?a.length:to);i++)s+=n84(a[i]);return r84(s)}
function near84(a,b){return Math.abs(n84(a)-n84(b))<=.03}
function label84(v){try{return formatCompetence(v)}catch(e){return String(v||'—')}}
function audit84(record){
  if(!record)return{ok:false,issues:[{matricula:'—',motivo:'Demonstrativo oficial indisponível'}],count:0};
  var rows=record.colaboradores||[],totals=record.totais||{},issues=[];
  function issue(m,motivo){issues.push({matricula:String(m||'TOTAL'),motivo:motivo})}
  rows.forEach(function(row){
    [['pm','Provisão regular'],['p','Provisionado no mês'],['s','Saldo atual']].forEach(function(spec){
      var values=row[spec[0]]||[];if(values.length>=7&&!near84(sum84(values,0,6),values[6]))issue(row.m,spec[1]+' não fecha com o custo total');
    })
  });
  [['mes','pm'],['provisionado','p'],['saldo','s']].forEach(function(spec){
    var official=totals[spec[0]]||[];if(official.length<7)return;
    for(var i=0;i<7;i++){var individual=r84(rows.reduce(function(s,row){return s+n84((row[spec[1]]||[])[i])},0));if(!near84(individual,official[i]))issue('TOTAL',spec[0]+' · coluna '+(i+1)+' difere da soma individual')}
    if(!near84(sum84(official,0,6),official[6]))issue('TOTAL',spec[0]+' · custo total difere de base + encargos');
  });
  var seen={};issues=issues.filter(function(x){var key=x.matricula+'|'+x.motivo;if(seen[key])return false;seen[key]=true;return true});
  return{ok:issues.length===0,issues:issues,count:rows.length,competencia:record.competencia,arquivo:record.arquivo_nome}
}
function esc84(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function render84(kind,record){
  var pane=document.querySelector('[data-plan-pane="'+kind+'"]'),root=pane&&pane.querySelector('.rh80-official-root');if(!root||!record)return;
  var result=audit84(record),banner=root.querySelector('.rh84-integrity');if(!banner){banner=document.createElement('div');banner.className='rh84-integrity';var table=root.querySelector('article.rh80-official');root.insertBefore(banner,table||null)}
  banner.classList.toggle('ok',result.ok);banner.classList.toggle('error',!result.ok);
  if(result.ok){banner.innerHTML='<div><b>✓ Integridade conferida automaticamente</b><span>'+result.count+' matrículas · competência '+esc84(label84(result.competencia))+'</span></div><small>Custo total = base provisionada + INSS Empresa + RAT + Terceiros + FGTS + PIS.</small>'}
  else{var mats=Array.from(new Set(result.issues.map(function(x){return x.matricula})));banner.innerHTML='<div><b>⚠ Divergência no demonstrativo oficial</b><span>Competência '+esc84(label84(result.competencia))+' · matrículas: '+esc84(mats.join(', '))+'</span></div><details><summary>Ver conferência</summary><ul>'+result.issues.map(function(x){return '<li><b>'+esc84(x.matricula)+'</b> — '+esc84(x.motivo)+'</li>'}).join('')+'</ul></details>'}
  var bad={};result.issues.forEach(function(x){bad[x.matricula]=true});var rows=record._rows||[];
  Array.from(root.querySelectorAll('.rh80-table tbody tr')).forEach(function(tr,i){var failed=!!(rows[i]&&bad[String(rows[i].m)]);tr.classList.toggle('rh84-divergent',failed);if(failed)tr.title='Divergência automática detectada para a matrícula '+rows[i].m});
  var status=root.querySelector('.panel-head .status');if(status){status.classList.toggle('success',result.ok);status.classList.toggle('warn',!result.ok);status.textContent=result.ok?'Conferido automaticamente':'Divergência detectada'}
  root.dataset.rh84Integrity=result.ok?'ok':'error';
}
function run84(){var all=window.RH_V80_LAST||{};render84('13',all.decimo);render84('ferias',all.ferias)}
function style84(){if(document.getElementById('_rh84'))return;var s=document.createElement('style');s.id='_rh84';s.textContent='.rh84-integrity{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:14px 0;padding:12px 14px;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2)}.rh84-integrity>div{display:flex;flex-direction:column;gap:3px}.rh84-integrity b{font-size:.79rem}.rh84-integrity span,.rh84-integrity small{color:var(--muted);font-size:.69rem}.rh84-integrity.ok{border-color:color-mix(in srgb,var(--emerald) 46%,var(--line-soft));background:color-mix(in srgb,var(--emerald) 8%,var(--surface-2))}.rh84-integrity.error{align-items:flex-start;border-color:color-mix(in srgb,var(--red) 58%,var(--line-soft));background:color-mix(in srgb,var(--red) 8%,var(--surface-2))}.rh84-integrity.error b{color:var(--red)}.rh84-integrity details{max-width:48%;font-size:.7rem}.rh84-integrity summary{cursor:pointer;font-weight:850}.rh84-integrity ul{margin:7px 0 0;padding-left:18px}.rh84-divergent{outline:2px solid color-mix(in srgb,var(--red) 70%,transparent);outline-offset:-2px;background:color-mix(in srgb,var(--red) 7%,transparent)!important}@media(max-width:760px){.rh84-integrity{align-items:flex-start;flex-direction:column}.rh84-integrity.error details{max-width:100%}}';document.head.appendChild(s)}
var base84=window.rhV80Refresh;window.rhV80Refresh=async function(force){var result=typeof base84==='function'?await base84(force):false;setTimeout(run84,40);return result};
function init84(){style84();[380,900,1700].forEach(function(ms){setTimeout(run84,ms)});document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab="13"],[data-plan-tab="ferias"]'))setTimeout(run84,420)},true)}
window.rhV84AuditProvision=audit84;window.RH_PROVISION_INTEGRITY_V84=true;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init84);else init84();
})();
