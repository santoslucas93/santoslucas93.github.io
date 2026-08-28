(function(){
  'use strict';
  if(window.__lnbIaTraceOrcado)return;
  window.__lnbIaTraceOrcado=true;
  let seq=0;
  const tutorials=[
    {q:'Como usar a Home?',re:/como.*(usar|uso|funciona).*home|o que.*home/,view:'home',label:'Abrir Home',answer:'A Home resume orçamento, realizado, saldo e alertas da temporada. Selecione o período global e clique nos cards e gráficos para chegar às receitas, departamentos ou lançamentos que formam cada número.'},
    {q:'Como cadastrar ou editar o orçamento?',re:/como.*(cadastr|editar|alterar).*(or[cç]amento|or[cç]ado)|novo or[cç]ado/,view:'plan',label:'Abrir Novo Orçado',answer:'Use “Novo Orçado” para cadastrar valores por temporada, departamento, grupo e linha. Cada linha deve ter um ID único. Para reorganizar nomes e hierarquia sem perder os lançamentos, use “Editar Estrutura”.'},
    {q:'Como importar o Realizado?',re:/como.*import.*realizado|importar.*extrato|novo extrato/,view:'real',label:'Abrir Realizado',answer:'Em “Realizado”, escolha a conta bancária e importe o extrato no modelo esperado. Use “Substituir tudo desta conta” somente ao reimportar uma base corrigida; desmarcado, o sistema acrescenta apenas registros ainda não existentes.'},
    {q:'Como funciona a Conciliação?',re:/como.*funciona.*concilia[cç][aã]o(?! banc)|como.*usar.*concilia[cç][aã]o(?! banc)/,view:'conc',label:'Abrir Conciliação',answer:'A Conciliação reúne lançamentos classificados, pendentes e que pedem atenção. Filtre o período, pesquise o favorecido e confira departamento, grupo, linha e eventuais rateios antes de aplicar a classificação.'},
    {q:'Como funciona a Conciliação Bancária?',re:/concilia[cç][aã]o banc[aá]ria/,view:'bank',label:'Abrir Conciliação Bancária',answer:'A Conciliação Bancária confere a prova real de cada conta: saldo inicial + entradas − saídas = saldo final. Transferências entre contas da LNB aparecem para conferência, mas não entram no realizado nem nas receitas.'},
    {q:'Como revisar os IDs?',re:/como.*revis.*\bid|revis[aã]o de ids?/,view:'revid',label:'Abrir Revisão de IDs',answer:'Em “Revisão de IDs”, localize linhas sem identificação, duplicadas ou incompatíveis e associe cada lançamento ao ID oficial do orçamento. Revise antes de exportar ou consolidar o período.'},
    {q:'Como usar Relatórios e Exportações?',re:/como.*(usar|funciona).*(relat[oó]rio|exporta)/,view:'exp',label:'Abrir Exportar',answer:'Em “Exportar”, escolha o relatório e o recorte desejado. Confirme temporada, mês e filtros antes de gerar o arquivo; a composição deve refletir os mesmos lançamentos exibidos no painel.'},
    {q:'Como usar Regras e Integridade?',re:/como.*(usar|funciona).*(regras?|integridade|auditoria)/,view:'audit',label:'Abrir Integridade',answer:'“Regras” mostra os critérios de classificação; “Integridade” aponta inconsistências, vínculos ausentes e situações que exigem revisão. Corrija as pendências antes do fechamento da temporada.'}
  ];

  function tutorialFor(q){const nq=norm(q);return tutorials.find(t=>t.re.test(nq))||null;}
  function tutorialPanel(){
    const host=document.getElementById('ia-sug');if(!host||document.getElementById('ia-tutorial-orcado'))return;
    const details=document.createElement('details');details.id='ia-tutorial-orcado';details.className='ia-tutorials';
    const summary=document.createElement('summary');summary.textContent='Tutorial do Orçado x Realizado';details.appendChild(summary);
    const list=document.createElement('div');list.className='ia-tutorial-list';
    tutorials.forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t.q;b.onclick=function(){const input=document.getElementById('ia-q');if(input)input.value=t.q;window.iaSend();};list.appendChild(b);});
    details.appendChild(list);host.appendChild(details);
  }
  function tutorialAnswer(q,t){
    const inp=document.getElementById('ia-q');if(inp)inp.value='';
    if(typeof iaBubble!=='function')return false;
    iaBubble('eu',q);const bubble=iaBubble('ai',t.answer+'\n\n⚡ Tutorial local do sistema');
    const box=document.createElement('div');box.className='ia-trace-actions';
    const b=document.createElement('button');b.type='button';b.className='ia-trace-btn';b.textContent='↗ '+t.label;
    b.onclick=function(){curV=t.view;page=1;render();document.getElementById('ia-pop')?.classList.add('hide');showBack();highlight('v-'+t.view);};
    box.appendChild(b);const src=document.createElement('span');src.className='ia-trace-source';src.textContent='Ajuda · uso do sistema';box.appendChild(src);bubble.parentNode.insertBefore(box,bubble.nextSibling);return true;
  }

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
      const tutorial=tutorialFor(q);if(tutorial&&tutorialAnswer(q,tutorial))return;
      const provider=document.getElementById('ia-provider')?.value||'local';const result=await original.apply(this,arguments);
      const chat=document.getElementById('ia-chat');const bubble=chat&&[...chat.children].reverse().find(el=>el.tagName==='DIV'&&!el.classList.contains('ia-trace-actions'));
      const fallback=bubble&&/Resposta local provisória/i.test(bubble.textContent||'');
      if(provider==='local'||fallback)actions(bubble,traceFor(q));else sourceOnly(bubble);
      return result;
    };
    if(typeof window.iaInit==='function'){
      const init=window.iaInit;window.iaInit=function(){const result=init.apply(this,arguments);tutorialPanel();return result;};
    }
    tutorialPanel();
  }
  install();
})();
