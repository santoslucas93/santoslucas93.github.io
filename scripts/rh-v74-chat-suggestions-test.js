'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const source=fs.readFileSync('runtime-patches/rh-folha-hotfix-v74-chat-perguntas-prontas.inc.js','utf8');

function makeEl(){
  var el={
    dataset:{},
    _text:'',
    classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},toggle(c){if(this._s.has(c)){this._s.delete(c);return false}this._s.add(c);return true},contains(c){return this._s.has(c)}},
    appendChild(child){return child},
    insertAdjacentElement(pos,child){return child},
    querySelector(){return null},
    querySelectorAll(){return []},
  };
  Object.defineProperty(el,'textContent',{get(){return el._text},set(v){el._text=v}});
  Object.defineProperty(el,'innerHTML',{get(){return el._text},set(v){el._text=v}});
  return el;
}
const elements={};
function stubElement(id){if(!elements[id])elements[id]=makeEl();return elements[id]}

const document={
  readyState:'loading',
  body:{},
  head:{appendChild(){}},
  addEventListener(){},
  getElementById(id){return stubElement(id)},
  createElement(){return makeEl()},
};

var calls={addMessage:0,addAnswer:0,go:0};
const context={
  window:{},
  document,
  setTimeout(){},clearTimeout(){},
  Intl,Date,Number,Math,String,Array,Object,Map,Promise,console,
  S:{competencia:{competencia:'2026-08-01',liquido:1,descontos:1,valor_fgts:1,
      encargos:{empresa_inss:100,rat:5,terceiros:29,valor_fgts:40,valor_total_irrf:25},
      resumo:{pessoas:3,empregados:2,estagiarios:1}},
    pessoas:[{nome:'A',vinculo:'CLT',situacao:'Trabalhando',admissao:'2026-08-05'}]},
  cleanSearch(v){return String(v||'').toLowerCase()},
  fmt(v){return 'R$ '+(Number(v)||0).toFixed(2)},
  nfmt(v){return String(v)},
  formatCompetence(c){return String(c).slice(5,7)+'/'+String(c).slice(0,4)},
  go(){calls.go++},
  addMessage(){calls.addMessage++},
  addAnswer(){calls.addAnswer++},
};
context.askAI=function(question){context.addMessage(question,'user');context.addAnswer('base fallback',null,'visao',false)};
const baseAskAIRef=context.askAI;

vm.createContext(context);
vm.runInContext(source,context,{filename:'rh-v74.js'});

assert.strictEqual(context.window.RH_CHAT_SUGGESTIONS_V74,true,'marcador v74 ausente');
assert.strictEqual(typeof context.askAI,'function','askAI deve continuar sendo função após o wrap');
assert.notStrictEqual(context.askAI,baseAskAIRef,'v74 deve envolver (wrap) o askAI original, não substituí-lo sem fallback');

/* pergunta nova de dados é respondida sem cair no robô original */
calls={addMessage:0,addAnswer:0,go:0};
context.askAI('Quanto foi de INSS patronal?');
assert.strictEqual(calls.addMessage,1,'pergunta nova deve registrar a mensagem do usuário');
assert.strictEqual(calls.addAnswer,1,'pergunta nova de dados deve responder via addAnswer');

/* pergunta que não bate em nenhuma categoria nova cai no robô original (fallback preservado) */
calls={addMessage:0,addAnswer:0,go:0};
context.askAI('pergunta totalmente fora de qualquer categoria');
assert.strictEqual(calls.addAnswer,1,'pergunta sem categoria nova deve continuar caindo no askAI original');

/* correção da colisão "Quant" x "Quanto" da pergunta de FGTS: não deve mais depender do robô original */
assert(/quanto foi recolhido de fgts|fgts.*!.*quantos.*quantas|!\/quantos\|quantas\//i.test(source)===false||source.includes('quantos|quantas'),'checagem de regressão da colisão de FGTS deve estar presente no código');
assert(/if\(\/fgts\/\.test\(q\)&&!\/quantos\|quantas\/\.test\(q\)\)/.test(source),'correção da colisão FGTS/headcount não encontrada no código');

/* não conecta nenhum provedor de IA externo: sem fetch, sem gemini API, resposta honesta sobre isso */
assert(!/fetch\(/.test(source),'v74 não deve fazer chamadas de rede — deve continuar 100% local');
assert(source.includes('não há Gemini'),'resposta honesta sobre não usar Gemini não encontrada');

console.log('RH v74 chat suggestions: OK');

