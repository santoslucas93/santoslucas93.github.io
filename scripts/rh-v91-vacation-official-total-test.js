'use strict';
const fs=require('fs'),assert=require('assert');
const ui=fs.readFileSync('runtime-patches/rh-folha-hotfix-v91-ferias-oficiais.inc.js','utf8');
const v80=fs.readFileSync('runtime-patches/rh-folha-hotfix-v80-provisoes-oficiais.inc.js','utf8');
const v38=fs.readFileSync('runtime-patches/rh-folha-hotfix-v38-planejamento-ativos-ui.inc.js','utf8');
const sql=fs.readFileSync('supabase/migrations/20260827190000_rh_ferias_detalhamento_oficial.sql','utf8');
const payload=JSON.parse(sql.match(/values \('(\{[\s\S]*?\})'::jsonb\)\)/)[1]);

assert.strictEqual(Object.keys(payload).length,25,'detalhamento oficial deve cobrir as 25 matrículas');
assert.deepStrictEqual(payload['13'],{a:'2022-06-01',v:'2027-05-31',fv:1,fp:2,sa:11767.6},'Lucas deve ter um período adquirido + 2/12');
assert(ui.includes('RH_VACATION_OFFICIAL_MEMORY_V91'),'marcador v91 ausente');
assert(ui.includes("set91(strong,m91(saldo[0]))"),'card não usa o saldo total oficial');
assert(ui.includes("set91(strong,m91(saldo[6]))"),'card não usa o custo total oficial');
assert(ui.includes("rows.length+' colaboradores · competência '"),'composição não informa a abrangência oficial');
assert(!ui.includes('MutationObserver')&&!ui.includes('setInterval'),'v91 não pode reintroduzir renderização contínua');
assert(v80.includes('detail:raw.d||{}'),'campos auditados não chegam à memória individual');
assert(v80.includes("k==='ferias'&&x.detail"),'memória de férias não prioriza o detalhamento oficial');
assert(v80.includes('window.rhV80OpenRow=openRow80'),'roteador individual oficial não foi exposto');
assert(v38.includes('rh91OfficialIndex'),'lista oficial pode ser removida pelo filtro de ativos');
assert(v38.includes('rhV91OpenVacationMemory'),'clique não está roteado à memória oficial');

console.log('RH v91 férias oficiais, total e memória individual: OK');
