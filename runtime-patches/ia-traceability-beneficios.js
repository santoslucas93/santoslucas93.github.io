(function(){
  'use strict';
  if(window.__lnbIaTraceBeneficios)return;
  window.__lnbIaTraceBeneficios=true;
  let lastQuestion='',seq=0;
  const tabs={
    vr:{base:'colaboradores',history:'historico',consolidated:'consolidado',baseTarget:'tab-colaboradores',historyTarget:'ben-exec-vr',tableTarget:'tab-consolidado'},
    vt:{base:'vt',history:'vt-historico',consolidated:'vt-consolidado',baseTarget:'tab-vt',historyTarget:'ben-exec-vt',tableTarget:'tab-vt-consolidado'},
    med:{base:'med',history:'med-historico',consolidated:'med-consolidado',baseTarget:'tab-med',historyTarget:'ben-exec-med',tableTarget:'tab-med-consolidado'},
    prud:{base:'prud',history:'prud-historico',consolidated:'prud-consolidado',baseTarget:'tab-prud',historyTarget:'ben-exec-prud',tableTarget:'tab-prud-consolidado'},
    mob:{base:'mob-cadastros',history:'mob',consolidated:'mob-relatorios',baseTarget:'tab-mob-cadastros',historyTarget:'tab-mob',tableTarget:'tab-mob-relatorios'}
  };
  function monthOf(period){return period&&period.tipo==='mes'?(period.valor||''):'';}
  function traceFor(q,composition){
    const nq=iaNormBen(q).replace(/[^\w\s\/\-]/g,' ').replace(/\s+/g,' ').trim();let mod=iaResolverModulo(nq)||iaModuloAtual();
    if(typeof lnbIsMobOnlyUser==='function'&&lnbIsMobOnlyUser()&&mod!=='mob')return null;
    const comps=mod==='mob'&&typeof iaCompetenciasMob==='function'?iaCompetenciasMob():(mod?iaTodasCompetencias(mod):[]);
    const period=iaResolverPeriodo(nq,comps),trace={id:'ben-'+(++seq),verified:true,module:mod||'multimodulo',period,source:'',origin:null,composition:null};
    const cadastro=/\bquant[oa]s\b|\bnumero de\b|ativ[oa]s?|cadastrad|desligad|inconsistenc|duplicad|sem departamento|sem centro de custo/.test(nq);
    if(!mod){trace.source='Históricos oficiais dos módulos de benefícios';if(composition&&composition.length)trace.composition={type:'dialog'};return trace.composition?trace:null;}
    const t=tabs[mod],label={vr:'VR/VA/Cesta Básica',vt:'Vale Transporte',med:'Assistência Médica SulAmérica',prud:'Seguro de Vida Prudential',mob:'Mobilidade Corporativa'}[mod];if(!t)return null;
    if(cadastro){trace.source='Cadastro ativo · '+label;trace.origin={type:'navigate',mod,tab:t.base,target:t.baseTarget};trace.composition={...trace.origin};}
    else{trace.source='Histórico oficial processado · '+label;trace.origin={type:'navigate',mod,tab:t.history,target:t.historyTarget};trace.composition={type:'navigate',mod,tab:t.consolidated,target:t.tableTarget};}
    return trace;
  }
  function filterLabel(trace){const out=[],c=monthOf(trace.period);if(c)out.push('Competência '+compLabel(c));if(trace.module!=='multimodulo')out.push({vr:'VR/VA/CB',vt:'Vale Transporte',med:'Assistência Médica',prud:'Prudential',mob:'Mobilidade'}[trace.module]||trace.module);return out.join(' · ');}
  function highlight(target){setTimeout(function(){document.querySelectorAll('.ia-origin-highlight').forEach(el=>el.classList.remove('ia-origin-highlight'));const el=document.getElementById(target)||document.querySelector(target);if(!el)return;el.classList.add('ia-origin-highlight');el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el.classList.remove('ia-origin-highlight'),5200);},180);}
  function showBack(){let b=document.getElementById('ia-back-chat');if(b)return;b=document.createElement('button');b.id='ia-back-chat';b.type='button';b.className='ia-back-chat';b.textContent='← Voltar ao Chat IA';b.onclick=function(){document.getElementById('ia-pop')?.classList.remove('hide');if(typeof iaInit==='function')iaInit();b.remove();setTimeout(()=>document.getElementById('ia-q')?.focus(),80);};document.body.appendChild(b);}
  function applyPeriod(trace,dest){const comp=monthOf(trace.period);if(!comp)return;if(dest.mod==='mob'){if(typeof mobCompetenciaOperacional==='function')mobCompetenciaOperacional(comp);else if(window.Mob&&Mob.cfg)Mob.cfg.competenciaAtual=comp;return;}const ym=comp.split('-');if(dest.tab.includes('consolidado')&&window.__consFiltros&&window.__consFiltros[dest.mod])window.__consFiltros[dest.mod]={ano:ym[0]||'',mes:ym[1]||''};const ids={vr:['competencia-input','rateio-comp'],vt:['vt-comp','vt-rateio-comp','vt-calc-comp'],med:['med-comp','med-rateio-comp'],prud:['prud-comp','prud-rateio-comp']}[dest.mod]||[];ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value=comp;});}
  function navigate(trace,kind){const dest=trace&&trace.verified&&trace[kind];if(!dest||dest.type!=='navigate')return false;if(typeof lnbIsMobOnlyUser==='function'&&lnbIsMobOnlyUser()&&dest.mod!=='mob')return false;window.selectBenefitMode(dest.mod);const open=function(){applyPeriod(trace,dest);const btn=document.querySelector('.nav-tab[data-tab="'+dest.tab+'"]');if(btn)showTab(btn,dest.tab);document.getElementById('ia-pop')?.classList.add('hide');showBack();highlight(dest.target);};setTimeout(open,dest.mod==='mob'?650:80);return true;}
  function sourceOnly(bubble){if(!bubble||bubble.dataset.iaTraceRuntime)return;bubble.dataset.iaTraceRuntime='1';const box=document.createElement('div');box.className='ia-trace-actions';const src=document.createElement('span');src.className='ia-trace-source';src.textContent='Fonte: Gemini com resumo estruturado · sem vínculo navegável verificável';box.appendChild(src);bubble.parentNode.insertBefore(box,bubble.nextSibling);}
  function addActions(bubble,trace,composition,legacy){
    if(!bubble||!trace||bubble.dataset.iaTraceRuntime)return;bubble.dataset.iaTraceRuntime='1';if(legacy)legacy.style.display='none';const box=document.createElement('div');box.className='ia-trace-actions';
    if(trace.origin){const b=document.createElement('button');b.type='button';b.className='ia-trace-btn';b.textContent='↗ Ver origem';b.title='Fonte: '+trace.source;b.onclick=()=>navigate(trace,'origin');box.appendChild(b);}
    if(trace.composition){const b=document.createElement('button');b.type='button';b.className='ia-trace-btn';b.textContent='▦ Ver composição'+(composition&&composition.length?' ('+composition.length+')':'');b.title='Abrir os registros que formam o resultado';b.onclick=function(){if(trace.composition.type==='navigate')navigate(trace,'composition');else if(legacy)legacy.click();};box.appendChild(b);}
    const src=document.createElement('span');src.className='ia-trace-source';src.textContent='Fonte: '+trace.source;box.appendChild(src);const fl=filterLabel(trace);if(fl){const f=document.createElement('span');f.className='ia-trace-filter';f.textContent=fl;box.appendChild(f);}bubble.parentNode.insertBefore(box,bubble.nextSibling);
  }
  function install(){
    if(typeof window.iaSend!=='function'||typeof window.iaFinalizarResposta!=='function')return setTimeout(install,80);
    const send=window.iaSend;window.iaSend=function(){lastQuestion=document.getElementById('ia-q')?.value.trim()||'';return send.apply(this,arguments);};
    const finish=window.iaFinalizarResposta;window.iaFinalizarResposta=function(bubble,text,composition,source){finish.apply(this,arguments);const legacy=bubble.nextElementSibling&&/Ver composição/i.test(bubble.nextElementSibling.textContent||'')?bubble.nextElementSibling:null;if(source==='gemini')sourceOnly(bubble);else addActions(bubble,traceFor(lastQuestion,composition),composition,legacy);};
  }
  install();
})();
