/* RH v92 — status e reprocessamento do motor mensal persistente de provisões. */
(function(){
'use strict';
window.RH_MONTHLY_PROVISION_ENGINE_V92=true;
var busy92=false;
function E92(id){return document.getElementById(id)}
function x92(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function can92(){try{return can('importar')||can('administrar')}catch(e){return false}}
function rec92(kind){var x=window.RH_V80_LAST||{};return kind==='13'?x.decimo:x.ferias}
function automatic92(r){return String(r&&r.origem||'').indexOf('calculo_automatico')===0}
function date92(v){if(!v)return '—';try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch(e){return String(v)}}
function message92(r){var alerts=Array.isArray(r&&r.alertas)?r.alertas:[],auto=automatic92(r),review=String(r&&r.status)==='revisao';return{
  title:auto?(review?'Cálculo automático · requer revisão':'Cálculo automático concluído'):'Fechamento oficial conciliado',
  detail:auto?('Gerado a partir da folha mensal · '+x92(r.versao_calculo||'motor versionado')+' · '+x92(date92(r.recalculado_em))):'Valores preservados do demonstrativo oficial do Domínio.',
  alerts:alerts
}}
function render92(){
  ['13','ferias'].forEach(function(kind){var pane=document.querySelector('#page-planejamento [data-plan-pane="'+kind+'"]');if(!pane)return;var old=pane.querySelector(':scope > .rh92-engine-status'),r=rec92(kind);if(!r){if(old)old.remove();return}var m=message92(r),sig=[r.status,r.origem,r.versao_calculo,r.recalculado_em,JSON.stringify(r.alertas||[])].join('|');if(old&&old.dataset.signature===sig)return;if(!old){old=document.createElement('div');old.className='rh92-engine-status';pane.insertBefore(old,pane.firstChild)}old.dataset.signature=sig;var warnings=m.alerts.map(function(a){return '<li>'+x92(a&&a.mensagem||a&&a.codigo||a)+'</li>'}).join('');old.className='rh92-engine-status '+(String(r.status)==='revisao'?'review':'ok');old.innerHTML='<div><b>'+x92(m.title)+'</b><span>'+m.detail+'</span>'+(warnings?'<ul>'+warnings+'</ul>':'')+'</div>'+(automatic92(r)&&can92()&&S.competencia&&!S.competencia._periodConsolidated?'<button type="button" class="button secondary" data-rh92-reprocess>Reprocessar provisões</button>':'')
  })
}
async function reprocess92(btn){if(busy92||!S.competencia||!S.competencia.id)return;busy92=true;btn.disabled=true;btn.textContent='Reprocessando…';try{await rpc('rh_reprocessar_provisoes',{p_competencia_id:S.competencia.id});if(typeof window.rhV80Refresh==='function')await window.rhV80Refresh(true);if(typeof window.rhV91ApplyVacationOfficial==='function')window.rhV91ApplyVacationOfficial();render92();try{toast('Provisões de 13º e férias reprocessadas e auditadas.')}catch(e){}}catch(e){try{toast('Não foi possível reprocessar: '+(e.message||e),true)}catch(x){alert(e.message||e)}}finally{busy92=false;btn.disabled=false;btn.textContent='Reprocessar provisões'}}
function style92(){if(E92('_rh92'))return;var s=document.createElement('style');s.id='_rh92';s.textContent='#page-planejamento .rh92-engine-status{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin:0 0 14px;padding:12px 14px;border:1px solid var(--line-soft);border-radius:13px;background:var(--surface-2)}#page-planejamento .rh92-engine-status.ok{border-color:color-mix(in srgb,var(--green) 42%,var(--line-soft))}#page-planejamento .rh92-engine-status.review{border-color:color-mix(in srgb,var(--gold) 65%,var(--line-soft))}#page-planejamento .rh92-engine-status b,#page-planejamento .rh92-engine-status span{display:block}#page-planejamento .rh92-engine-status span{margin-top:3px;color:var(--muted);font-size:.72rem}#page-planejamento .rh92-engine-status ul{margin:7px 0 0;padding-left:18px;color:var(--gold);font-size:.72rem}@media(max-width:700px){#page-planejamento .rh92-engine-status{flex-direction:column}#page-planejamento .rh92-engine-status .button{width:100%}}';document.head.appendChild(s)}
var base92=window.rhV80Refresh;if(typeof base92==='function')window.rhV80Refresh=async function(force){var out=await base92(force);render92();return out};
document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('[data-rh92-reprocess]');if(b){e.preventDefault();reprocess92(b);return}if(e.target&&e.target.closest&&e.target.closest('[data-plan-tab="13"],[data-plan-tab="ferias"],[data-view="planejamento"]'))setTimeout(render92,240)},true);
function init92(){style92();setTimeout(function(){Promise.resolve(typeof window.rhV80Refresh==='function'?window.rhV80Refresh(false):false).then(render92)},260)}
window.rhV92RenderProvisionStatus=render92;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init92);else init92();
})();
