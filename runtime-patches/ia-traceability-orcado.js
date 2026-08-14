(function(){
  'use strict';
  if(window.__lnbIaTraceOrcado)return;
  window.__lnbIaTraceOrcado=true;
  let seq=0;

  function terms(q){
    const stop=['qual','quais','quanto','quantos','porque','resuma','explique','maior','maiores','receitas','despesas','realizado','orcado','orçado','lancamentos','lançamentos','temporada','periodo','período','acima','abaixo','atencao','atenção','pendente','revisar'];
    return norm(q).split(/[^a-z0-9&]+/).filter(t=>t.length>3&&!stop.includes(t)).slice(0,3).join(' ');
  }
  function traceFor(q){
    const nq=norm(q),month=iaFindMonth(q),season=(typeof lnbCurrentTemporada==='function'&&lnbCurrentTemporada())||'';
    const trace={id:'orc-'+(++seq),verified:true,month,season,source:'Extratos e classificações do Orçado x Realizado',origin:null,composition:null};
    if(/atencao|atenção|pendente|revis|concili|classific/.test(nq)){
      trace.source='Conciliação · lançamentos classificados e pendentes';
      trace.origin={view:'conc',target:'txtable',status:'pend',query:''};trace.composition={...trace.origin};
    }else if(/receita|entrada|patrocin|cota|rendimento/.test(nq)){
      trace.source='Extratos bancários · receitas e outras receitas classificadas';
      trace.origin={view:'rec',target:'rec-lines'};trace.composition={view:'conc',target:'txtable',status:'all',query:terms(q)};
    }else if(/estour|acima|desvio|orcad|orçado|sobra|budget/.test(nq)){
      trace.source='Orçado vigente + realizado classificado';
      trace.origin={view:'dash',target:'dash-chart-box',chart:'desvios'};trace.composition={view:'conc',target:'txtable',status:'all',query:terms(q)};
    }else if(/favorecid|fornecedor|maior|top|quem|pagamos|gasto com|transmiss|logistic|logística|arbitrag|viagem|reembolso/.test(nq)){
      const query=terms(q);trace.source='Extratos bancários · favorecido, descrição e classificação';
      trace.origin={view:'dash',target:'dash-chart-box',chart:'fornecedores',query};trace.composition={view:'conc',target:'txtable',status:'all',query};
    }else if(/resum|diagnostico|diagnóstico|situacao|situação|panorama|geral/.test(nq)||month!=='ALL'){
      trace.source='Resumo consolidado do Orçado x Realizado';
      trace.origin={view:'home',target:'kpis'};trace.composition={view:'conc',target:'txtable',status:'all',query:''};
    }else{
      const query=terms(q);trace.source='Pesquisa nos lançamentos carregados do período';
      trace.origin={view:'conc',target:'txtable',status:'all',query};trace.composition={...trace.origin};
    }
    return trace;
  }
  function filterLabel(trace){
    const f=[];if(trace.season)f.push('Temporada '+trace.season);f.push(trace.month==='ALL'?'período completo':iaPeriodLabel(trace.month));
    const q=(trace.composition&&trace.composition.query)||(trace.origin&&trace.origin.query);if(q)f.push('busca “'+q+'”');return f.join(' · ');
  }
  function highlight(target){
    setTimeout(function(){
      document.querySelectorAll('.ia-origin-highlight').forEach(el=>el.classList.remove('ia-origin-highlight'));
      const el=document.getElementById(target)||document.querySelector(target);if(!el)return;
      el.classList.add('ia-origin-highlight');el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el.classList.remove('ia-origin-highlight'),5200);
    },140);
  }
  function showBack(){
    let b=document.getElementById('ia-back-chat');if(b)return;
    b=document.createElement('button');b.id='ia-back-chat';b.type='button';b.className='ia-back-chat';b.textContent='← Voltar ao Chat IA';
    b.onclick=function(){if(typeof iaOpenPop==='function')iaOpenPop();else document.getElementById('ia-pop')?.classList.remove('hide');b.remove();setTimeout(()=>document.getElementById('ia-q')?.focus(),80);};document.body.appendChild(b);
  }
  function navigate(trace,kind){
    const dest=trace&&trace.verified&&trace[kind];if(!dest)return;
    curM=trace.month||'ALL';curV=dest.view;page=1;
    if(dest.view==='dash'){
      render();const sel=document.getElementById('dash-chart');if(sel&&dest.chart)sel.value=dest.chart;renderDash();
    }else if(dest.view==='conc'){
      clearBulkDestination();render();const fs=document.getElementById('f-status');if(fs)fs.value=dest.status||'all';
      const fq=document.getElementById('f-q');if(fq)fq.value=dest.query||'';const bq=document.getElementById('bulk-q');if(bq)bq.value=dest.query||'';
      renderStats();renderTable();renderAreas();
    }else render();
    document.getElementById('ia-pop')?.classList.add('hide');showBack();highlight(dest.target);
  }
  function actions(bubble,trace){
    if(!bubble||!trace||bubble.dataset.iaTraceReady)return;bubble.dataset.iaTraceReady='1';
    const box=document.createElement('div');box.className='ia-trace-actions';
    [['origin','↗ Ver origem'],['composition','▦ Ver composição']].forEach(([kind,label])=>{if(!trace[kind])return;const b=document.createElement('button');b.type='button';b.className='ia-trace-btn';b.textContent=label;b.title=kind==='origin'?'Fonte: '+trace.source:'Abrir os registros que formam o resultado';b.onclick=()=>navigate(trace,kind);box.appendChild(b);});
    const src=document.createElement('span');src.className='ia-trace-source';src.textContent='Fonte: '+trace.source;box.appendChild(src);
    const fl=document.createElement('span');fl.className='ia-trace-filter';fl.textContent=filterLabel(trace);box.appendChild(fl);
    bubble.parentNode.insertBefore(box,bubble.nextSibling);
  }
  function sourceOnly(bubble){
    if(!bubble||bubble.dataset.iaTraceReady)return;bubble.dataset.iaTraceReady='1';
    const box=document.createElement('div');box.className='ia-trace-actions';const src=document.createElement('span');src.className='ia-trace-source';src.textContent='Fonte: Gemini com resumo estruturado · sem vínculo navegável verificável';box.appendChild(src);bubble.parentNode.insertBefore(box,bubble.nextSibling);
  }
  function install(){
    if(typeof window.iaSend!=='function')return setTimeout(install,80);
    const original=window.iaSend;
    window.iaSend=async function(){
      const inp=document.getElementById('ia-q'),q=inp?inp.value.trim():'';if(!q)return original.apply(this,arguments);
      const provider=document.getElementById('ia-provider')?.value||'local';const result=await original.apply(this,arguments);
      const chat=document.getElementById('ia-chat');const bubble=chat&&[...chat.children].reverse().find(el=>el.tagName==='DIV'&&!el.classList.contains('ia-trace-actions'));
      const fallback=bubble&&/Resposta local provisória/i.test(bubble.textContent||'');
      if(provider==='local'||fallback)actions(bubble,traceFor(q));else sourceOnly(bubble);
      return result;
    };
  }
  install();
})();
