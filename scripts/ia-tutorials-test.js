'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const files={
  orcado:'runtime-patches/ia-traceability-orcado.js',
  beneficios:'runtime-patches/ia-traceability-beneficios.js',
  css:'runtime-patches/ia-traceability.css',
  worker:'worker.js'
};
const source={};Object.keys(files).forEach(k=>source[k]=fs.readFileSync(files[k],'utf8'));

/* Sintaxe dos dois patches injetados. */
new vm.Script(source.orcado,{filename:files.orcado});
new vm.Script(source.beneficios,{filename:files.beneficios});

/* O tutorial precisa ser local, clicável e progressivo em ambos os chats. */
['orcado','beneficios'].forEach(function(mod){
  assert(source[mod].includes("document.createElement('details')"),mod+': expansor nativo ausente');
  assert(source[mod].includes("className='ia-tutorials'"),mod+': classe do tutorial ausente');
  assert(source[mod].includes('tutorialFor('),mod+': roteamento local das perguntas ausente');
  assert(source[mod].includes('tutorialAnswer('),mod+': respostas locais do tutorial ausentes');
  assert(source[mod].includes('Ajuda · uso do sistema'),mod+': identificação da fonte tutorial ausente');
  assert(!/tutorialAnswer[\s\S]{0,1200}fetch\(/.test(source[mod]),mod+': tutorial não pode depender de rede');
});

['Home','orçamento','Realizado','Conciliação','Conciliação Bancária','IDs','Relatórios','Integridade'].forEach(function(nome){
  assert(source.orcado.toLowerCase().includes(nome.toLowerCase()),'Orçado: tutorial ausente para '+nome);
});
['VR/VA/Cesta Básica','Vale Transporte','Assistência Médica','Seguro de Vida','Mobilidade Corporativa','Gestão de Benefícios'].forEach(function(nome){
  assert(source.beneficios.toLowerCase().includes(nome.toLowerCase()),'Benefícios: tutorial ausente para '+nome);
});

assert(source.css.includes('.ia-tutorials'),'CSS compartilhado dos tutoriais ausente');
assert(source.css.includes('overflow-x:hidden'),'tutoriais devem impedir overflow horizontal');
assert(source.worker.includes('ia-traceability.css?v=2'),'cache bust do CSS não atualizado');
assert(source.worker.includes('ia-traceability-${moduleName}.js?v=2'),'cache bust dos scripts não atualizado');

console.log('IA tutorials (Orçado + Benefícios): OK');
