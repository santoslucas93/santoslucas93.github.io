/* RH v83 — Gemini hibrido com contexto estruturado, sem dados pessoais desnecessarios. */
(function(){
'use strict';
var H83=[],BUSY83=false;
function E83(id){return document.getElementById(id)}
function n83(v){var n=Number(v);return isFinite(n)?Math.round((n+Number.EPSILON)*100)/100:0}
function dept83(v){try{return departmentName(v)}catch(e){return String(v||'—')}}
function known83(q){
  q=String(q||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return /liquido|total da folha|departamento|maior custo|quant|pessoa|colaborador|headcount|fgts|desconto|inss patronal|inss empresa|irrf|encargo patronal|admiss|desliga|demit|movimenta/.test(q)||
    /como.*(uso|usar|funciona|import|carreg|simul|edit|envio)|o que.*(visao geral|folha mensal|rubrica|encargo|movimenta|rateio|historico|indicador|dossie|concilia|relatorio|custo real|configura|colaborador)|o que significa.*coluna|holerite|recibo de pagamento|planejamento.*provis/.test(q);
}
function provision83(record){
  if(!record)return null;var rows=record._rows||[];
  return{fonte:record.arquivo_nome||null,totais:record.totais||{},colaboradores:rows.map(function(x){return{
    nome:x.name,matricula:x.m,departamento:x.dep,vinculo:x.link,
    provisao_mes:x.prov,saldo_atual:x.s,total_encargos:n83(x.enc),custo_total:n83((x.s||[])[6])
  }})};
}
function context83(){
  var c=S&&S.competencia||{},e=c.encargos||{},r=c.resumo||{};
  var people=(S&&S.pessoas||[]).slice(0,120).map(function(p){return{
    nome:p.nome,matricula:p.matricula,vinculo:p.vinculo,departamento:dept83(p.departamento),cargo:p.cargo,
    situacao:p.situacao,admissao:p.admissao,proventos:n83(p.proventos),descontos:n83(p.descontos),
    liquido:n83(p.liquido),encargos_empregador:n83(p.encargos||p.encargos_patronais)
  }});
  var official=window.RH_V80_LAST||{};
  return{
    modulo:'RH & Folha',competencia:c._periodConsolidated?'Consolidado':c.competencia,
    resumo:{pessoas:n83(r.pessoas||people.length),empregados:n83(r.empregados),estagiarios:n83(r.estagiarios),proventos:n83(c.proventos),descontos:n83(c.descontos),liquido:n83(c.liquido)},
    encargos:{inss_empresa:n83(e.empresa_inss),rat:n83(e.rat),terceiros:n83(e.terceiros),fgts:n83(e.valor_fgts||c.valor_fgts),pis:n83(e.pis),irrf_retido:n83(e.valor_total_irrf||e.valor_irrf_mensal||e.valor_irrf||c.valor_irrf)},
    colaboradores:people,
    provisoes_oficiais:{ferias:provision83(official.ferias),decimo_terceiro:provision83(official.decimo)},
    modulos_disponiveis:['Visão geral','Colaboradores','Folha mensal','Rubricas','Encargos','Movimentações','Planejamento & Provisões','Rateio','Histórico','Indicadores','Dossiê','Importação','Conciliação','Relatórios & Documentos','Custo Real','Configurações'],
    privacidade:'Contexto limitado à folha autorizada. CPF, e-mail, telefone, nascimento, endereço, dados bancários, anexos e documentos foram excluídos.'
  };
}
function bubble83(text,kind,source){
  var body=E83('ai-body');if(!body)return null;var div=document.createElement('div');div.className='ai-message '+kind;
  var span=document.createElement('span');span.textContent=text;div.appendChild(span);
  if(source){var small=document.createElement('small');small.className='ai-source';small.textContent=source;div.appendChild(small)}
  body.appendChild(div);body.scrollTop=body.scrollHeight;return span
}
async function gemini83(question){
  if(BUSY83)return;BUSY83=true;bubble83(question,'user');var out=bubble83('Consultando o Gemini com os dados autorizados do RH…','bot','Gemini · contexto restrito e rastreável');
  try{
    var prompt='Você é o assistente de RH e Folha da Liga Nacional de Basquete. Responda em português, de forma objetiva e auditável. Use somente o JSON fornecido; não invente números nem motivos. Para cálculos, mostre a fórmula resumida. Diferencie folha oficial, provisão oficial e estimativa. Se o dado não estiver no contexto, diga exatamente o que precisa ser conferido. Ao orientar o uso, indique o módulo e os passos.\n\nCONTEXTO AUTORIZADO (sem CPF, contatos, dados bancários ou documentos):\n'+JSON.stringify(context83())+'\n\nPERGUNTA:\n'+question;
    var history=H83.slice(-6).map(function(m){return{role:m.role,parts:[{text:m.text}]}});
    var res=await fetch('/api/gemini',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+String(SES&&SES.access_token||'')},body:JSON.stringify({contextScope:'rh',model:'gemini-flash-latest',contents:history.concat([{role:'user',parts:[{text:prompt}]}]),generationConfig:{temperature:.15,maxOutputTokens:2048}})});
    var data=await res.json().catch(function(){return{}});if(!res.ok||data.error)throw new Error(data&&data.error&&data.error.message||data&&data.error||('Erro '+res.status));
    var answer=((data.candidates||[])[0]&&data.candidates[0].content&&data.candidates[0].content.parts||[]).map(function(p){return p.text||''}).join('').trim();
    if(!answer)throw new Error('O Gemini não retornou texto.');out.textContent=answer;H83.push({role:'user',text:question},{role:'model',text:answer});H83=H83.slice(-8)
  }catch(err){out.textContent='Não consegui consultar o Gemini: '+String(err&&err.message||err)+'. Você ainda pode selecionar “Local” e usar as perguntas prontas.'}finally{BUSY83=false}
}
var baseAsk83=typeof askAI==='function'?askAI:null;
askAI=function(question){
  var q=String(question||'').trim();if(!q)return;var mode=E83('rh83-ai-mode')&&E83('rh83-ai-mode').value||'auto';
  if(mode==='local'||(mode==='auto'&&known83(q))){if(baseAsk83)return baseAsk83(q)}
  return gemini83(q)
};
function style83(){if(E83('_rh83'))return;var s=document.createElement('style');s.id='_rh83';s.textContent='#rh83-ai-controls{display:flex;align-items:center;gap:7px;padding:8px 12px;border-top:1px solid var(--line-soft);color:var(--muted);font-size:10px}#rh83-ai-controls label{font-weight:800}#rh83-ai-mode{min-width:0;max-width:230px;padding:6px 8px;border:1px solid var(--line-soft);border-radius:9px;background:var(--surface);color:var(--text);font-size:10px}.ai-message.bot>span{white-space:pre-wrap}';document.head.appendChild(s)}
function controls83(){
  if(E83('rh83-ai-controls'))return;var anchor=E83('rh74-more-details')||E83('ai-suggestions');if(!anchor)return;style83();
  var wrap=document.createElement('div');wrap.id='rh83-ai-controls';var label=document.createElement('label');label.htmlFor='rh83-ai-mode';label.textContent='Modo IA';
  var select=document.createElement('select');select.id='rh83-ai-mode';[['auto','Automático · local + Gemini'],['local','Somente local'],['gemini','Sempre Gemini']].forEach(function(x){var o=document.createElement('option');o.value=x[0];o.textContent=x[1];select.appendChild(o)});select.value=localStorage.getItem('lnb_rh_ai_mode_v83')||'auto';select.onchange=function(){localStorage.setItem('lnb_rh_ai_mode_v83',select.value)};
  wrap.appendChild(label);wrap.appendChild(select);anchor.insertAdjacentElement('afterend',wrap)
}
function init83(){controls83();[350,900,1800].forEach(function(ms){setTimeout(controls83,ms)})}
window.RH_GEMINI_HYBRID_V83=true;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init83);else init83();
})();
