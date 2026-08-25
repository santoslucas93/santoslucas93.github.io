'use strict';

const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('admin/index.html', 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1];
if (!script) throw new Error('Script administrativo não encontrado.');

const context = {
  console,
  Promise,
  Date,
  JSON,
  Object,
  Array,
  String,
  RegExp,
  Math,
  setTimeout,
  clearTimeout,
  alert() {},
  confirm() { return true; },
  prompt() { return null; },
  location: { href: '' },
  localStorage: { getItem() { return null; }, removeItem() {}, setItem() {} },
  window: { addEventListener() {}, __busca: '', __soAtivos: false },
  document: {
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById() { return null; },
    createElement() { return { style: {}, setAttribute() {}, addEventListener() {}, querySelector() { return null; } }; },
    body: { appendChild() {} },
  },
  fetch() { return new Promise(() => {}); },
  URL: { createObjectURL() { return ''; } },
  Blob: function Blob() {},
};
context.globalThis = context;
vm.createContext(context);
new vm.Script(script, { filename: 'admin/index.html:inline.js' }).runInContext(context);

context.desenhar = function () {};
context.D = {
  recursos: [
    { id: 'modulo', pai_id: null, nome: 'Módulo' },
    { id: 'tela-a', pai_id: 'modulo', nome: 'Tela A' },
    { id: 'tela-b', pai_id: 'modulo', nome: 'Tela B' },
  ],
  acoes: [
    { recurso_id: 'modulo', acao: 'visualizar' },
    { recurso_id: 'modulo', acao: 'administrar' },
    { recurso_id: 'tela-a', acao: 'visualizar' },
    { recurso_id: 'tela-a', acao: 'editar' },
    { recurso_id: 'tela-b', acao: 'visualizar' },
  ],
};
context.PERM = {};
context.ESC = {};
context.PERM_ORIGINAL = {};
context.ESC_ORIGINAL = {};
context.HIST_PERM = [];

context.definirModulo('modulo', true);
if (Object.keys(context.PERM).length !== 5) throw new Error('Liberar módulo inteiro não marcou todas as ações.');
if (!context.PERM['modulo|administrar']) throw new Error('Permissão especial não entrou na liberação do módulo inteiro.');

context.definirColunaModulo('modulo', 'visualizar', false);
if (Object.keys(context.PERM).some((key) => key.endsWith('|visualizar'))) throw new Error('Bloquear coluna não removeu todas as células aplicáveis.');
if (!context.PERM['tela-a|editar']) throw new Error('Bloquear coluna alterou outra ação indevidamente.');

context.desfazerPermissoes();
if (!context.PERM['modulo|visualizar'] || !context.PERM['tela-a|visualizar'] || !context.PERM['tela-b|visualizar']) {
  throw new Error('Desfazer não restaurou a seleção em massa anterior.');
}

[
  'data-modulo-perm',
  'data-coluna-perm',
  'data-linha-perm',
  'Revisar e salvar',
  'Atribuir este crachá a um usuário',
  'NADA é aplicado antes da sua confirmação'.toLowerCase(),
].forEach((required) => {
  if (!html.toLowerCase().includes(required.toLowerCase())) throw new Error(`Recurso didático ausente: ${required}`);
});

console.log('Permissões em massa: módulo, coluna, linha, desfazer e revisão validados.');
