/* RH v91 - férias: total oficial e memória por colaborador sem re-render contínuo. */
(function(){
'use strict';
window.RH_VACATION_OFFICIAL_MEMORY_V91=true;
var state91={signature:'',pending:null};
function E91(id){return document.getElementById(id)}
function x91(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function n91(v){var n=Number(v);return isFinite(n)?n:0}
function m91(v){try{return fmt(n91(v))}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n91(v))}}
function norm91(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function sum91(a,from,to){a=a||[];var total=0;for(var i=from||0;i<(to==null?a.length:to);i++)total+=n91(a[i]);return Math.round((total+Number.EPSILON)*100)/100}
function record91(){return window.RH_V80_LAST&&window.RH_V80_LAST.ferias}
function label91(){var c=window.RH_V80_LAST&&window.RH_V80_LAST.competencia;try{return formatCompetence(c)}catch(e){return String(c||'').slice(0,7).split('-').reverse().join('/')||'—'}}
function set91(el,value){if(el&&el.textContent!==value)el.textContent=value}
function cards91(pane,r){
  var t=r.totais||{},saldo=t.saldo||[],mes=t.provisionado||t.mes||[],regular=t.mes||[],ajuste=t.ajuste||[],enc=sum91(saldo,1,6),grid=pane.querySelector('.rh26-kpis');
  if(!grid)return;Array.from(grid.querySelectorAll('.kpi')).forEach(function(card){var label=norm91((card.querySelector('span')||{}).textContent),strong=card.querySelector('strong'),small=card.querySelector('small'),kind='';
    if(label.indexOf('saldo provisionado')>=0){kind='saldo';set91(strong,m91(saldo[0]));set91(small,(r._rows||[]).length+' colaboradores no demonstrativo oficial')}
    else if(label.indexOf('provisao do mes')>=0){kind='mes';set91(strong,m91(mes[0]));set91(small,m91(regular[0])+' regular + '+m91(ajuste[0])+' ajuste')}
    else if(label.indexOf('encargos sobre saldo')>=0){kind='encargos';set91(strong,m91(enc));set91(small,'INSS Emp. + RAT + Terceiros + FGTS + PIS')}
    else if(label.indexOf('custo provisionado')>=0){kind='custo';set91(strong,m91(saldo[6]));set91(small,'saldo + encargos')}
    if(kind){card.dataset.rh80Card=kind;card.dataset.rh80Kind='ferias';card.setAttribute('type','button')}
  })
}
function list91(pane,r){
  var table=pane.querySelector('table.rh26-wide'),rows=r._rows||[];if(!table)return;var sig=rows.map(function(q){return q.m+'|'+q.name+'|'+q.dep+'|'+JSON.stringify(q.s)+'|'+JSON.stringify(q.detail||{})}).join(';');
  if(table.dataset.rh91Signature===sig)return;table.dataset.rh91Signature=sig;table.classList.add('rh38-name-list','rh91-official-list');
  var body=table.tBodies[0]||table.createTBody();body.innerHTML=rows.map(function(q,i){return '<tr class="rh26-row" data-k="ferias" data-rh91-official-index="'+i+'" data-rh91-matricula="'+x91(q.m)+'"><td><b>'+x91(q.name)+'</b><small>'+x91(q.dep)+' · matrícula '+x91(q.m)+'</small></td></tr>'}).join('');
  var article=table.closest('article.table-panel');if(article){set91(article.querySelector('.panel-head h2'),'Colaboradores — provisão de férias');set91(article.querySelector('.detail-note'),'Clique no colaborador para abrir a memória oficial completa, incluindo períodos adquiridos e avos proporcionais.');var note=article.querySelector('.rh91-official-note');if(!note){note=document.createElement('div');note.className='rh91-official-note';article.appendChild(note)}note.innerHTML='<span>Fonte: '+x91(r.arquivo_nome)+'</span><b>'+rows.length+' colaboradores · competência '+x91(label91())+'</b>'}
}
function apply91(){var pane=document.querySelector('[data-plan-pane="ferias"]'),r=record91();if(!pane||!r||!(r._rows||[]).length)return false;var sig=[window.RH_V80_LAST.competencia,JSON.stringify((r.totais||{}).saldo||[]),JSON.stringify((r.totais||{}).provisionado||[]),(r._rows||[]).length].join('|');cards91(pane,r);list91(pane,r);pane.dataset.rh91Ready='1';state91.signature=sig;if(typeof window.rhFitAllCardValues==='function')window.rhFitAllCardValues();return true}
async function refresh91(force){if(state91.pending)return state91.pending;state91.pending=Promise.resolve(typeof window.rhV80Refresh==='function'?window.rhV80Refresh(!!force):false).then(function(){return apply91()}).finally(function(){state91.pending=null});return state91.pending}
function open91(index){var r=record91(),i=Number(index);if(!r||!r._rows||!r._rows[i])return false;if(typeof window.rhV80OpenRow==='function'){window.rhV80OpenRow('ferias',i);return true}return false}
function style91(){if(E91('_rh91'))return;var s=document.createElement('style');s.id='_rh91';s.textContent='#page-planejamento [data-plan-pane="ferias"] .rh91-official-note{display:flex;justify-content:space-between;gap:12px;padding:11px 18px;border-top:1px solid var(--line-soft);color:var(--muted);font-size:.7rem}#page-planejamento [data-plan-pane="ferias"] .rh91-official-note b{color:var(--text)}@media(max-width:700px){#page-planejamento [data-plan-pane="ferias"] .rh91-official-note{flex-direction:column}}';document.head.appendChild(s)}
function init91(){style91();setTimeout(function(){refresh91(false)},220)}
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab="ferias"],[data-view="planejamento"],#rh-plan-recalc'))setTimeout(function(){refresh91(false)},220)},true);
window.rhV91ApplyVacationOfficial=apply91;
window.rhV91RefreshVacationOfficial=refresh91;
window.rhV91OpenVacationMemory=open91;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init91);else init91();
})();

