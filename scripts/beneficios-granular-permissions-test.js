'use strict';
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('beneficios/index.html','utf8');
const worker=fs.readFileSync('worker.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260827120000_beneficios_permissoes_granulares.sql','utf8');

assert(html.includes("function isReadOnlyUser(){ return !!(AUTH_SESSION && AUTH_SESSION.role"),'fixture original deixou de representar o bloqueio legado');
assert(worker.includes('function injectBenefitsGranularPermissions('),'injecao granular ausente');
assert(worker.includes('let LNB_ACCESS = null;'),'acesso efetivo nao e mantido no modulo servido');
assert(worker.includes('function lnbCanBenefitsAction('),'avaliador granular ausente');
assert(worker.includes("['criar','editar','excluir'].every"),'perfil com CRUD completo continua bloqueado');
assert(worker.includes('LNB_ACCESS=await r.json()'),'meu_acesso nao alimenta a autorizacao da tela');
assert(worker.includes("'granular-v90'"),'resposta nao identifica a camada de permissoes aplicada');
for(const marker of ['beneficios_recurso_estado','escrita granular insert','escrita granular update','escrita granular delete',"tem_permissao('beneficios.mob', 'editar')"])assert(migration.includes(marker),'migration sem '+marker);
assert(migration.includes("auth.email()) = 'admin-beneficios@painel-lnb.local'"),'conta administrativa legada deixou de funcionar');

console.log('Beneficios permissoes granulares: OK');
