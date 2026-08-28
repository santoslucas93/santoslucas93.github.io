'use strict';
const fs=require('fs'),assert=require('assert');
const v38=fs.readFileSync('runtime-patches/rh-folha-hotfix-v38-planejamento-ativos-ui.inc.js','utf8');
const v54=fs.readFileSync('runtime-patches/rh-folha-hotfix-v54-provisoes-seguras.inc.js','utf8');
const v80=fs.readFileSync('runtime-patches/rh-folha-hotfix-v80-provisoes-oficiais.inc.js','utf8');

assert(!v38.includes('MutationObserver'),'a tela ainda possui observador contínuo capaz de provocar oscilação');
assert(v38.includes('rh38-name-list'),'a composição simples por colaborador não está protegida');
assert(v38.includes('Clique no colaborador para abrir a memória de cálculo completa.'),'orientação da composição aprovada mudou');
assert(v38.includes('rhProvisionOpenMemory'),'o clique do colaborador não abre a memória de cálculo');
assert(v80.includes('RH_PLANNING_REFERENCE_UI_V90=true'),'modo visual de referência não está habilitado');
assert(v80.includes('if(!window.RH_PLANNING_REFERENCE_UI_V90){a=d&&render80'),'a fonte oficial ainda substitui a composição aprovada');
assert(v80.includes('window.RH_V80_LAST={competencia:comp80()'),'dados oficiais deixaram de alimentar os pop-ups e o Gemini');
assert(v54.includes('!window.RH_PLANNING_REFERENCE_UI_V90'),'recalculo legado não foi reativado no modo de referência');

console.log('RH v90 planejamento estável e composição de referência: OK');
