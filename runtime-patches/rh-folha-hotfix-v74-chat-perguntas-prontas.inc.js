/* RH v74 — Chat IA: mais perguntas prontas (dados) e perguntas de tutorial (uso do sistema).
   Não conecta nenhum provedor de IA externo — continua 100% local, mesmo padrão do robô original. */
(function(){
'use strict';

function q74(v){try{return cleanSearch(String(v||''));}catch(e){return String(v||'').toLowerCase();}}
function money74(v){try{return fmt(Number(v)||0);}catch(e){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);}}
function num74(v){try{return nfmt(v);}catch(e){return String(v==null?0:v);}}
function comp74(c){try{return formatCompetence(c);}catch(e){return String(c||'—');}}

/* ── respostas de dados: usam só S, os mesmos dados que o robô original já lê ── */
function dataAnswer74(q){
  if(typeof S==='undefined'||!S||!S.competencia)return null;
  var e=S.competencia.encargos||{},r=S.competencia.resumo||{},comp=S.competencia.competencia,pessoas=S.pessoas||[];
  /* Corrige colisão do robô original: "Quanto foi recolhido de FGTS?" cai na
     categoria de headcount antes de chegar em /fgts/, porque "Quant" já
     bate em "Quanto". Resolvida aqui, sem tocar no app.js. */
  if(/fgts/.test(q)&&!/quantos|quantas/.test(q)){
    return{answer:'O FGTS da competência '+comp74(comp)+' é '+money74(e.valor_fgts||S.competencia.valor_fgts)+', sobre base de '+money74(e.base_fgts||S.competencia.base_fgts)+'.',trace:'encargos',view:'encargos'};
  }
  if(/inss patronal|inss empresa|inss da empresa/.test(q)){
    return{answer:'O INSS patronal (a cargo da empresa) da competência '+comp74(comp)+' é '+money74(e.empresa_inss)+'.',trace:'encargos',view:'encargos'};
  }
  if(/\birrf\b|imposto de renda/.test(q)){
    var irrf=e.valor_total_irrf||e.valor_irrf_mensal||e.valor_irrf||S.competencia.valor_irrf;
    return{answer:'O IRRF retido na competência '+comp74(comp)+' é '+money74(irrf)+'.',trace:'encargos',view:'encargos'};
  }
  if(/encargo patronal|encargos patronais|encargos totais|custo total de encargos/.test(q)){
    var total=(Number(e.empresa_inss)||0)+(Number(e.rat)||0)+(Number(e.terceiros)||0)+(Number(e.valor_fgts||S.competencia.valor_fgts)||0);
    return{answer:'Os encargos patronais (INSS empresa + RAT + Terceiros + FGTS) somam '+money74(total)+' na competência '+comp74(comp)+'.',trace:'encargos',view:'encargos'};
  }
  if(/quantos.*clt|quantos.*pj\b|quantos.*estagi|por vinculo|tipos? de vinculo/.test(q)){
    var pj=pessoas.filter(function(p){return /\bpj\b/i.test(p.vinculo||'');}).length;
    return{answer:'A folha tem '+num74(r.empregados||0)+' CLT, '+num74(r.estagiarios||0)+' estagiário(s) e '+num74(pj)+' PJ, de um total de '+num74(r.pessoas||pessoas.length)+' pessoas.',trace:'headcount',view:'colaboradores'};
  }
  if(/admiss|admiti|desliga|demit|movimenta/.test(q)){
    var ym=String(comp||'').slice(0,7);
    var adm=pessoas.filter(function(p){return (p.admissao||'').slice(0,7)===ym;}).length;
    var dem=pessoas.filter(function(p){return /demit/i.test(p.situacao||'');}).length;
    return{answer:'Nesta competência há '+num74(adm)+' admissão(ões) registrada(s) no mês e '+num74(dem)+' colaborador(es) com situação de desligamento.',trace:'movimentacoes',view:'movimentacoes'};
  }
  return null;
}

/* ── perguntas de tutorial: não dependem de dados, só orientam o uso do sistema ── */
var TUTORIAL74=[
  {t:/como.*(importo|importar|carrego|carregar).*folha|importar.*planilha|subir.*folha/,
   a:'Vá em "Importação" no menu, escolha a competência e envie o arquivo da folha. O sistema faz a leitura automática; confira os totais na prévia antes de confirmar.',
   view:'importacao',label:'↗ Ir para Importação'},
  {t:/planejamento.*provis|provis.*planejamento|13.*provis|ferias.*provis|como funciona.*planejamento/,
   a:'Em "Planejamento & Provisões" você acompanha a provisão de 13º salário e de férias colaborador a colaborador. Clique em qualquer linha da tabela para abrir a memória de cálculo.',
   view:'planejamento',label:'↗ Ir para Planejamento & Provisões'},
  {t:/simular.*rescis|rescis.*simul|como.*calcul.*rescis/,
   a:'Dentro de "Planejamento & Provisões", abra a aba "Rescisão", escolha o colaborador, a data e a modalidade de desligamento. O relatório gerado é uma estimativa gerencial — valide contra o cálculo oficial antes de pagar.',
   view:'planejamento',label:'↗ Ir para Rescisão'},
  {t:/editar.*cadastro|edito.*colaborador|alterar.*dados.*colaborador|atualizar.*cadastro/,
   a:'Em "Colaboradores", clique no colaborador desejado para abrir e editar o cadastro completo.',
   view:'colaboradores',label:'↗ Ir para Colaboradores'},
  {t:/o que significa.*coluna|significa.*liquido no periodo|diferenca.*bruto.*liquido/,
   a:'Em "Colaboradores": Salário atual é o salário-base da última folha; Bruto no período é o total de proventos; Encargos no período são os encargos patronais sobre a folha daquele colaborador; Líquido no período é o valor líquido a receber (bruto − descontos do colaborador).',
   view:'colaboradores',label:'↗ Ir para Colaboradores'},
  {t:/holerite|recibo de pagamento|enviar.*email.*colaborador/,
   a:'Em "Colaboradores" há a opção de gerar e enviar holerites por e-mail. O envio automático só funciona quando o provedor de e-mail está configurado no Worker; sem isso, o holerite ainda pode ser gerado para download.',
   view:'colaboradores',label:'↗ Ir para Colaboradores'},
  {t:/gemini|voce usa ia|inteligencia artificial de verdade|esse chat usa ia|usa alguma ia/,
   a:'Não. Este Chat IA do RH & Folha responde localmente por palavras-chave, usando só os dados já carregados na tela — não há Gemini nem nenhum outro modelo de IA conectado aqui, e nada é enviado para fora do navegador.',
   view:null,label:null}
];
function tutorialAnswer74(q){
  for(var i=0;i<TUTORIAL74.length;i++){if(TUTORIAL74[i].t.test(q))return TUTORIAL74[i];}
  return null;
}
function addTutorialBubble74(text,view,label){
  var body=document.getElementById('ai-body');if(!body)return;
  var div=document.createElement('div');div.className='ai-message bot';
  var span=document.createElement('span');span.textContent=text;div.appendChild(span);
  if(view&&label){
    var actions=document.createElement('div');actions.className='trace-actions';
    var btn=document.createElement('button');btn.type='button';btn.textContent=label;
    btn.onclick=function(){
      if(typeof S!=='undefined')S.fromChat=true;
      var panel=document.getElementById('ai-panel'),back=document.getElementById('back-chat');
      if(panel)panel.hidden=true;if(back)back.hidden=false;
      if(typeof go==='function')go(view);
    };
    actions.appendChild(btn);div.appendChild(actions);
  }
  var small=document.createElement('small');small.className='ai-source';small.textContent='Ajuda · uso do sistema';div.appendChild(small);
  body.appendChild(div);body.scrollTop=body.scrollHeight;
}

/* ── encaixe no robô: perguntas novas são tratadas primeiro; o resto segue igual ── */
var baseAskAI74=(typeof askAI==='function')?askAI:null;
askAI=function(question){
  var raw=String(question||'').trim();if(!raw){if(baseAskAI74)baseAskAI74(question);return;}
  var q=q74(raw);
  var t=tutorialAnswer74(q);
  if(t){if(typeof addMessage==='function')addMessage(raw,'user');addTutorialBubble74(t.a,t.view,t.label);return;}
  var d=dataAnswer74(q);
  if(d){if(typeof addMessage==='function')addMessage(raw,'user');if(typeof addAnswer==='function')addAnswer(d.answer,d.trace,d.view,false);return;}
  if(baseAskAI74)baseAskAI74(question);
};

/* ── UI: painel expansível com as perguntas novas, sem mexer no bloco original ── */
var EXTRA74=[
  'Quanto foi de descontos na folha?',
  'Quantos colaboradores são CLT, PJ e estagiários?',
  'Quanto foi de INSS patronal?',
  'Quanto foi de IRRF?',
  'Quanto somam os encargos patronais?',
  'Houve admissões ou desligamentos nesta competência?'
];
var EXTRA_TUTORIAL74=[
  'Como eu importo uma folha?',
  'Como funciona o Planejamento & Provisões?',
  'Como eu simulo uma rescisão?',
  'Como eu edito o cadastro de um colaborador?',
  'O que significa cada coluna de Colaboradores?',
  'Como eu envio holerite por e-mail?',
  'Esse chat usa Gemini ou outra IA?'
];
function style74(){
if(document.getElementById('_rh74'))return;var s=document.createElement('style');s.id='_rh74';
s.textContent='#ai-suggestions{max-height:280px;overflow-y:auto}'
+'#rh74-more{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px 4px;border-top:1px solid var(--line-soft)}'
+'#rh74-more button{flex:none;border:1px solid var(--line-soft);border-radius:999px;background:var(--surface);color:var(--muted);font-size:10px;padding:7px 9px;cursor:pointer}'
+'#rh74-more .rh74-cat{flex-basis:100%;margin:4px 0 0;font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:var(--faint)}';
document.head.appendChild(s);
}
/* v81: perguntas de dados e de tutorial ficam sempre visiveis, sem exigir um clique extra em "Mais perguntas" - o chat responde em qualquer tela do modulo, nao so quando uma funcao especifica esta aberta. */
function buildMorePanel74(){
var panel=document.createElement('div');panel.id='rh74-more';
function cat(label){var c=document.createElement('div');c.className='rh74-cat';c.textContent=label;panel.appendChild(c);}
function chip(text){var b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=function(){askAI(text);};panel.appendChild(b);}
cat('Mais dados desta competência');EXTRA74.forEach(chip);
cat('Como usar o sistema (tutorial)');EXTRA_TUTORIAL74.forEach(chip);
return panel;
}
function suggestions74(){
var box=document.getElementById('ai-suggestions');if(!box||box.dataset.rh74==='1')return;box.dataset.rh74='1';
style74();
var panel=buildMorePanel74();box.insertAdjacentElement('afterend',panel);
}
function init74(){suggestions74();[300,900,1800].forEach(function(ms){setTimeout(suggestions74,ms);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init74);else init74();
window.RH_CHAT_SUGGESTIONS_V74=true;
})();

