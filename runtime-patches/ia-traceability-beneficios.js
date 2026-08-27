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
  const tutorials=[
    {q:'Como usar o módulo VR/VA/Cesta Básica?',re:/como.*(usar|uso|funciona).*(vr|va|cesta)|tutorial.*(vr|va|cesta)/,dest:{type:'navigate',mod:'vr',tab:'colaboradores',target:'tab-colaboradores'},answer:'No módulo VR/VA/Cesta Básica, mantenha primeiro os Colaboradores; depois faça o Cálculo Mensal, confira o Rateio e registre Pedidos Avulsos quando necessário. A Importação alimenta a base, Painel & Histórico acompanha competências, Dossiê gera a leitura executiva, Consolidado reúne os meses e Configurações guarda os parâmetros.'},
    {q:'Como usar o módulo Vale Transporte?',re:/como.*(usar|uso|funciona).*(vale transporte|\bvt\b)|tutorial.*(vale transporte|\bvt\b)/,dest:{type:'navigate',mod:'vt',tab:'vt',target:'tab-vt'},answer:'No Vale Transporte, revise Colaboradores VT, tarifa, dias e situação ativa; execute o Cálculo VT e confira o Rateio. Use Pedidos Avulsos para exceções, Importação para atualizar a base, Painel & Histórico e Consolidado para análise, Dossiê para relatório e Configurações VT para os parâmetros do benefício.'},
    {q:'Como usar o módulo Assistência Médica?',re:/como.*(usar|uso|funciona).*(assist[eê]ncia m[eé]dica|sul ?am[eé]rica|sa[uú]de)|tutorial.*(sa[uú]de|sul ?am[eé]rica)/,dest:{type:'navigate',mod:'med',tab:'med',target:'tab-med'},answer:'Na Assistência Médica SulAmérica, mantenha os Colaboradores Saúde e seus valores, incluindo o IOF quando aplicável. Depois use Cálculo Saúde e Rateio, importe as competências, acompanhe Painel & Histórico, gere o Dossiê, confira o Consolidado e ajuste apenas o necessário em Configurações Saúde.'},
    {q:'Como usar o módulo Seguro de Vida?',re:/como.*(usar|uso|funciona).*(seguro de vida|prudential)|tutorial.*(seguro de vida|prudential)/,dest:{type:'navigate',mod:'prud',tab:'prud',target:'tab-prud'},answer:'No Seguro de Vida Prudential, revise os colaboradores, vínculos, valores e o departamento de Arbitragem quando aplicável. Execute Cálculo Prudential e Rateio, importe as competências, acompanhe Painel & Histórico, gere o Dossiê, confira o Consolidado e mantenha os parâmetros em Configurações Prudential.'},
    {q:'Como usar o módulo Mobilidade Corporativa?',re:/como.*(usar|uso|funciona).*(mobilidade|uber|99|corridas)|tutorial.*(mobilidade|corridas)/,dest:{type:'navigate',mod:'mob',tab:'mob',target:'tab-mob'},answer:'Em Mobilidade Corporativa, o Painel resume corridas e custos; Colaboradores e Departamentos mantém o cadastro; Importação recebe os arquivos de Uber e 99; Relatórios permite filtros e detalhamento; e Dossiê consolida a leitura executiva. Confira competência, departamento e colaborador antes de fechar o período.'},
    {q:'Como usar a Gestão de Benefícios?',re:/como.*(usar|uso|funciona).*(gest[aã]o de benef[ií]cios|m[oó]dulo de benef[ií]cios)|tutorial.*benef[ií]cios/,dest:{type:'navigate',mod:'vr',tab:'colaboradores',target:'tab-colaboradores'},answer:'Comece escolhendo o benefício na tela inicial. Em cada módulo, siga a sequência: cadastro dos colaboradores, cálculo mensal, rateio, importação ou pedidos avulsos quando existirem, conferência no histórico, emissão do dossiê e validação no consolidado. As configurações devem ser alteradas somente quando a regra do benefício mudar.'}
  ];
  function tutorialFor(q){const nq=iaNormBen(q);return tutorials.find(t=>t.re.test(nq))||null;}
  function tutorialPanel(){
    const host=document.getElementById('ia-sug');if(!host||document.getElementById('ia-tutorial-beneficios'))return;
    const details=document.createElement('details');details.id='ia-tutorial-beneficios';details.className='ia-tutorials';
    const summary=document.createElement('summary');summary.textContent='Tutorial dos módulos de Benefícios';details.appendChild(summary);
    const list=document.createElement('div');list.className='ia-tutorial-list';
    tutorials.forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t.q;b.onclick=function(){const input=document.getElementById('ia-q');if(input)input.value=t.q;window.iaSend();};list.appendChild(b);});
    details.appendChild(list);host.appendChild(details);
  }
  function tutorialAnswer(q,t){
    const inp=document.getElementById('ia-q');if(inp)inp.value='';
    if(typeof iaBubble!=='function')return false;
    iaBubble('eu',q);const bubble=iaBubble('ai',t.answer+'\n\n⚡ Tutorial local do sistema');
    const box=document.createElement('div');box.className='ia-trace-actions';const b=document.createElement('button');b.type='button';b.className='ia-trace-btn';b.textContent='↗ Abrir módulo';
    b.onclick=function(){navigate({verified:true,origin:t.dest},'origin');};box.appendChild(b);
    const src=document.createElement('span');src.className='ia-trace-source';src.textContent='Ajuda · uso do sistema';box.appendChild(src);bubble.parentNode.insertBefore(box,bubble.nextSibling);return true;
  }
  function monthOf(period){return period&&period.tipo==='mes'?(period.valor||''):'';}
  function traceFor(q,composition){
    const nq=iaNormBen(q).replace(/[^\w\s\/\-]/g,' ').replace(/\s+/g,' ').trim();let mod=iaResolverModulo(nq)||iaModuloAtual();
    if(typeof lnbIsMobOnlyUser==='function'&&lnbIsMobOnlyUser()&&mod!=='mob')return null;
    const comps=mod==='mob'&&typeof iaCompetenciasMob==='function'?iaCompetenciasMob():(mod?iaTodasCompetencias(mod):[]);
    const period=iaResolverPeriodo(nq,comps),trace={id:'ben-'+(++seq),verified:true,module:mod||'multimodulo',period,source:'',origin:null,composition:null};
    const cadastro=/\bquant[oa]s\b|\bnumero de\b|ativ[oa]s?|cadastrad|desligad|inconsistenc|duplicad|sem departamento|sem centro de custo/.test(nq);
    if(!mod){trace.source='Bases oficiais dos módulos de benefícios';if(composition&&composition.length)trace.composition={type:'dialog'};return trace.composition?trace:null;}
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
  function ticketPorColaborador(nq,mod){
    if(!/\bticket\b/.test(nq) && !/\bm[ée]dia\s+(?:por|de)\s+colaborador/.test(nq) && !/\bcusto\s+m[ée]dio\s+(?:por|de)\s+colaborador/.test(nq))return false;
    if(mod==='mob'&&!/colaborador/.test(nq))return false;
    return true;
  }
  async function calcularTicket(mods,periodo,tipo){
    const porPessoa={},labels={vr:'VR / VA / Cesta Básica',vt:'Vale Transporte',med:'Assistência Médica SulAmérica',prud:'Seguro de Vida Prudential'};
    for(const mod of mods){
      const itens=await iaItensModulo(mod,periodo,tipo);
      itens.forEach(function(item){
        const nome=String(item.nome||'').trim(),valor=Number(item.valor)||0,key=iaNormBen(nome);
        if(!nome||!key||valor<=0)return;
        if(!porPessoa[key])porPessoa[key]={nome,total:0,componentes:{}};
        porPessoa[key].total+=valor;
        if(!porPessoa[key].componentes[mod])porPessoa[key].componentes[mod]={label:labels[mod]||mod,total:0,registros:0,competencias:new Set()};
        const componente=porPessoa[key].componentes[mod];
        componente.total+=valor;componente.registros+=1;
        if(item.competencia)componente.competencias.add(item.competencia);
      });
    }
    const pessoas=Object.values(porPessoa).map(function(p){
      const detalhes=Object.values(p.componentes).map(c=>({
        label:c.label,
        valor:+c.total.toFixed(2),
        registros:c.registros,
        referencia:c.competencias.size?[...c.competencias].sort().map(compLabel).join(', '):iaPeriodoLabel(periodo)
      })).sort((a,b)=>b.valor-a.valor);
      return {nome:p.nome,total:+p.total.toFixed(2),detalhes};
    }).sort((a,b)=>b.total-a.total);
    const total=+pessoas.reduce((s,p)=>s+p.total,0).toFixed(2),quantidade=pessoas.length;
    return {total,quantidade,ticket:quantidade?+(total/quantidade).toFixed(2):null,composicao:pessoas.map(p=>({label:p.nome,valor:p.total,tipo:'colaborador',detalhes:p.detalhes}))};
  }
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function abrirDetalheColaborador(item){
    let ov=document.getElementById('ia-colaborador-overlay');
    if(!ov){
      ov=document.createElement('div');ov.id='ia-colaborador-overlay';ov.className='modal-overlay ia-colaborador-overlay';ov.style.zIndex='1000002';
      ov.onclick=e=>{if(e.target===ov)ov.classList.remove('open');};
      ov.innerHTML='<div class="modal ia-colaborador-modal" role="dialog" aria-modal="true" aria-labelledby="ia-colaborador-titulo"><div id="ia-colaborador-body"></div></div>';
      document.body.appendChild(ov);
    }
    const detalhes=Array.isArray(item.detalhes)?item.detalhes:[],total=+detalhes.reduce((s,d)=>s+(Number(d.valor)||0),0).toFixed(2);
    const linhas=detalhes.map(d=>'<tr><td><strong>'+escapeHtml(d.label)+'</strong><span class="ia-colaborador-ref">'+escapeHtml(d.referencia||'Situação atual')+' · '+d.registros+' registro'+(d.registros===1?'':'s')+'</span></td><td class="ia-colaborador-valor">'+iaMoneyBen(d.valor)+'</td></tr>').join('');
    document.getElementById('ia-colaborador-body').innerHTML='<div class="ia-colaborador-head"><div><span class="ia-colaborador-kicker">Composição por colaborador</span><h3 id="ia-colaborador-titulo">'+escapeHtml(item.label)+'</h3></div><button type="button" class="ia-colaborador-close" aria-label="Fechar">×</button></div><div class="ia-colaborador-total"><span>Total considerado</span><strong>'+iaMoneyBen(total)+'</strong></div><div class="ia-colaborador-table-wrap"><table class="ia-colaborador-table"><thead><tr><th>Benefício / referência</th><th>Valor</th></tr></thead><tbody>'+linhas+'</tbody><tfoot><tr><td>Total conferido</td><td>'+iaMoneyBen(total)+'</td></tr></tfoot></table></div><div class="ia-colaborador-foot"><span>'+detalhes.length+' benefício'+(detalhes.length===1?'':'s')+' com valor no cálculo</span><button type="button" class="btn btn-ghost ia-colaborador-ok">Fechar</button></div>';
    ov.querySelector('.ia-colaborador-close').onclick=ov.querySelector('.ia-colaborador-ok').onclick=()=>ov.classList.remove('open');
    ov.classList.add('open');setTimeout(()=>ov.querySelector('.ia-colaborador-close')?.focus(),30);
  }
  function installCompositionDrilldown(){
    if(window.__lnbIaCompositionDrilldown||typeof window.iaAbrirComposicao!=='function')return;
    window.__lnbIaCompositionDrilldown=true;
    const original=window.iaAbrirComposicao;
    window.iaAbrirComposicao=function(idx){
      const lista=typeof __iaComposicoes!=='undefined'?(__iaComposicoes[idx]||[]):[];
      if(!lista.some(item=>item&&item.tipo==='colaborador'&&Array.isArray(item.detalhes)))return original.apply(this,arguments);
      original.apply(this,arguments);
      const body=document.getElementById('ia-composicao-body');if(!body)return;
      body.innerHTML='<p class="ia-comp-help">Clique em um colaborador para visualizar a composição individual por benefício.</p><div class="ia-comp-table-wrap"><table class="ia-comp-table"><thead><tr><th>Colaborador</th><th>Valor</th></tr></thead><tbody>'+lista.map((item,i)=>'<tr><td><button type="button" class="ia-comp-person" data-ia-person="'+i+'"><span>'+escapeHtml(item.label)+'</span><small>Ver composição individual →</small></button></td><td class="ia-comp-value">'+iaMoneyBen(item.valor)+'</td></tr>').join('')+'</tbody></table></div>';
      body.querySelectorAll('[data-ia-person]').forEach(btn=>{btn.onclick=()=>abrirDetalheColaborador(lista[Number(btn.dataset.iaPerson)]);});
    };
  }
  function installTicketFix(){
    if(window.__lnbIaTicketMedioFix||typeof window.iaRespSoma!=='function'||typeof window.iaMotorLocal!=='function')return;
    window.__lnbIaTicketMedioFix=true;
    const somaOriginal=window.iaRespSoma,motorOriginal=window.iaMotorLocal;
    window.iaRespSoma=async function(nq){
      const mod=iaResolverModulo(nq);
      if(!ticketPorColaborador(nq,mod))return somaOriginal.apply(this,arguments);
      if(mod==='mob')return somaOriginal.apply(this,arguments);
      const mods=mod?[mod]:['vt','med','prud','vr'],tipo=iaResolverTipo(nq);
      const competencias=[...new Set(mods.flatMap(m=>iaTodasCompetencias(m)))].sort();
      const periodo=iaResolverPeriodo(nq,competencias),r=await calcularTicket(mods,periodo,tipo);
      if(r.ticket==null)return {texto:'Não encontrei colaboradores com valor positivo para calcular o ticket médio em '+iaPeriodoLabel(periodo)+'.'};
      const escopo=mod?iaLabelModulo(mod).replace(/^n[ao]s? /,''):'de benefícios';
      const recorte=tipo?' · '+tipo:'';
      const texto='Ticket médio '+escopo+' ('+iaPeriodoLabel(periodo)+recorte+'):\n'+
        '• Custo total considerado: '+iaMoneyBen(r.total)+'\n'+
        '• Colaboradores considerados: '+r.quantidade+'\n'+
        '• Cálculo: '+iaMoneyBen(r.total)+' ÷ '+r.quantidade+' = '+iaMoneyBen(r.ticket)+'\n'+
        '• Ticket médio por colaborador: '+iaMoneyBen(r.ticket)+'.';
      return {texto,composicao:r.composicao};
    };
    window.iaMotorLocal=async function(q){
      const nq=iaNormBen(q).replace(/[^\w\s\/\-]/g,' ').replace(/\s+/g,' ').trim(),mod=iaResolverModulo(nq);
      if(ticketPorColaborador(nq,mod))return window.iaRespSoma(nq);
      return motorOriginal.apply(this,arguments);
    };
  }
  function install(){
    if(typeof window.iaSend!=='function'||typeof window.iaFinalizarResposta!=='function')return setTimeout(install,80);
    installTicketFix();
    installCompositionDrilldown();
    const send=window.iaSend;window.iaSend=function(){
      lastQuestion=document.getElementById('ia-q')?.value.trim()||'';
      const tutorial=tutorialFor(lastQuestion);if(tutorial&&tutorialAnswer(lastQuestion,tutorial))return Promise.resolve();
      return send.apply(this,arguments);
    };
    const finish=window.iaFinalizarResposta;window.iaFinalizarResposta=function(bubble,text,composition,source){finish.apply(this,arguments);const legacy=bubble.nextElementSibling&&/Ver composição/i.test(bubble.nextElementSibling.textContent||'')?bubble.nextElementSibling:null;if(source==='gemini')sourceOnly(bubble);else addActions(bubble,traceFor(lastQuestion,composition),composition,legacy);};
    if(typeof window.iaRenderSugestoes==='function'){
      const renderSug=window.iaRenderSugestoes;window.iaRenderSugestoes=function(){const result=renderSug.apply(this,arguments);tutorialPanel();return result;};
    }
    tutorialPanel();
  }
  install();
})();
