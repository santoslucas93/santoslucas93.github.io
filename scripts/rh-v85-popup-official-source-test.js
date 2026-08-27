'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('runtime-patches/rh-folha-hotfix-v48-estabilidade-popups.inc.js','utf8');
const document={readyState:'loading',addEventListener(){},getElementById(){return null},querySelector(){return null},documentElement:{dataset:{}}};
const rows=[
  {m:'2',name:'GUSTAVO DE OLIVEIRA MARINHEIRO',dep:'Comunicação',cc:'200121',prov:[622.23],s:[10577.77,2115.56,105.77,613.51,846.21,105.77,14364.59]},
  {m:'595',name:'ISABEL DE AZEVEDO SOUZA',dep:'Administrativa',cc:'100101',prov:[639.54],s:[7035.10,1407.02,70.35,408.04,562.80,70.35,9553.66]}
];
const context={window:{RH_V80_LAST:{ferias:{_rows:rows}}},document,setTimeout(){},clearTimeout(){},MutationObserver:function(){},Intl,Number,Math,String,Array,Object,console};
vm.createContext(context);vm.runInContext(source,context);
const result=context.window.rhV48ProvisionRows('ferias');
assert.strictEqual(result.length,2,'popup não consumiu as linhas oficiais');
const gustavo=result.find(x=>x.matricula==='2'),isabel=result.find(x=>x.matricula==='595');
assert(gustavo&&isabel,'Gustavo ou Isabel não foram associados pela matrícula');
assert.strictEqual(gustavo.saldo,10577.77);assert.strictEqual(gustavo.enc,3786.82);assert.strictEqual(gustavo.custo,14364.59);
assert.strictEqual(isabel.saldo,7035.10);assert.strictEqual(isabel.enc,2518.56);assert.strictEqual(isabel.custo,9553.66);
assert(result.every(x=>x.enc===Math.round((x.inss+x.rat+x.terc+x.fgts+x.pis)*100)/100),'Total encargos não soma as cinco colunas');
console.log('RH v85 official popup source: OK');
