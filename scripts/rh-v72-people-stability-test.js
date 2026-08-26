'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const source=fs.readFileSync('runtime-patches/rh-folha-hotfix-v72-estabilidade-colaboradores.inc.js','utf8');
function cell(text=''){return {textContent:text,dataset:{},className:'',title:'',colSpan:1};}
const marker={dataset:{rh62Employee:'employee-1'}};
const row={
  cells:[cell('Pessoa'),cell('1'),cell('CLT'),cell('Financeiro'),cell('Trabalhando'),cell('R$ 10.000,00'),cell('R$ 3.000,00'),cell('R$ 7.000,00')],
  querySelector(selector){
    if(selector==='[data-rh62-employee]')return marker;
    if(selector==='[data-rh72-current-salary]')return this.cells.find(c=>c.dataset.rh72CurrentSalary)||null;
    return null;
  },
  insertBefore(newCell,before){const index=before?this.cells.indexOf(before):this.cells.length;this.cells.splice(index,0,newCell);}
};
const head={cells:Array.from({length:8},()=>cell())};
Object.defineProperty(head,'innerHTML',{set(value){this.cells=Array.from({length:(value.match(/<th/g)||[]).length},()=>cell());}});
const table={querySelector(selector){return selector==='thead tr'?head:null;},querySelectorAll(selector){return selector==='#employee-rows tr'?[row]:[];}};
const body={closest(){return table;}};
const scheduled=[];
const document={readyState:'loading',body:{},head:{appendChild(){}},addEventListener(){},getElementById(id){return id==='employee-rows'?body:null;},createElement(tag){return tag==='td'?cell():{};}};
const context={
  window:{},document,S:{colaboradores:[{id:'employee-1',salario_base:10000,situacao:'Trabalhando'}],pessoas:[],competencias:[],competencia:null},
  renderPeople(){return 'rendered';},
  MutationObserver:function(){this.observe=function(){}},setTimeout(fn,ms){scheduled.push(ms);return scheduled.length;},clearTimeout(){},
  Intl,Date,Number,Math,String,Array,Object,Map,Promise,console,Event:function(){},fmt(v){return `R$ ${Number(v).toFixed(2)}`;}
};
vm.createContext(context);vm.runInContext(source,context,{filename:'rh-v72.js'});
assert.strictEqual(context.window.RH_PEOPLE_STABILITY_V72,true,'marcador v72 ausente');
assert.strictEqual(context.window.rhV72IsWorking({situacao:'Trabalhando'}),true);
assert.strictEqual(context.window.rhV72IsWorking({situacao:'Desligado'}),false);
assert.strictEqual(context.window.rhV72IsWorking({situacao:'Afastado'}),false);
assert.strictEqual(context.window.rhV72IsWorking({situacao:'Férias'}),false);
assert(source.includes('Salário atual')&&source.includes('Bruto no período'),'novas colunas não foram encontradas');
assert(source.includes('salaryLoading')&&source.includes('V71.loadingId')===false,'a consulta salarial deve possuir cache próprio');
assert(source.includes('setTimeout(install72,ms)'),'as tentativas tardias de 250/800/1600 ms foram removidas');
assert.strictEqual(context.renderPeople(),'rendered');
assert.strictEqual(row.cells.length,9,'a grade deve ter nove colunas após inserir Salário atual');
assert.strictEqual(row.cells[5].dataset.rh72CurrentSalary,'employee-1','Salário atual deve ocupar a sexta coluna');
assert.strictEqual(row.cells[8].textContent,'R$ 7.000,00','Líquido no período deve ser preservado na última coluna');
console.log('RH v72 people stability: OK');
