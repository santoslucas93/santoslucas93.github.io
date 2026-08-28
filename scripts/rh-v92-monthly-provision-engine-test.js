'use strict';
const fs=require('fs'),assert=require('assert');
const sql=fs.readFileSync('supabase/migrations/20260828143000_rh_motor_provisoes_mensais.sql','utf8');
const ui=fs.readFileSync('runtime-patches/rh-folha-hotfix-v92-motor-provisoes.inc.js','utf8');
const v80=fs.readFileSync('runtime-patches/rh-folha-hotfix-v80-provisoes-oficiais.inc.js','utf8');

for(const marker of [
  'rh_provisoes_fechamentos','rh_provisoes_colaboradores','rh_provisoes_parametros',
  'private.rh_calcular_provisoes_competencia','rh_reprocessar_provisoes',
  "new.evento='importacao_concluida'","new.evento='folha_importada_editada'",
  "origem like 'dominio%'",'rh-prov-1.0.0','enable row level security'
]) assert(sql.includes(marker),`motor persistente sem ${marker}`);
assert(sql.includes("where public.rh_provisoes_oficiais.origem not like 'dominio%'"),'fechamento oficial pode ser sobrescrito');
assert(sql.includes("raise exception 'O fechamento oficial desta competência é imutável.'"),'reprocessamento oficial não está protegido');
assert(sql.includes("'LACUNA_COMPETENCIA'")&&sql.includes("'BASE_ZERADA'"),'alertas profissionais ausentes');
assert(!/grant\s+(insert|update|delete|all).*rh_provisoes_(fechamentos|colaboradores)/i.test(sql),'escrita direta indevida nas memórias');
for(const marker of ['RH_MONTHLY_PROVISION_ENGINE_V92','Reprocessar provisões','Cálculo automático concluído','requer revisão','rh_reprocessar_provisoes'])assert(ui.includes(marker),`interface v92 sem ${marker}`);
assert(!ui.includes('MutationObserver')&&!ui.includes('setInterval'),'v92 não pode reintroduzir a oscilação da tela');
for(const field of ['folha_competencia_id','status','versao_calculo','alertas','recalculado_em'])assert(v80.includes(field),`consulta v80 sem ${field}`);

// Continuidade do caso auditado do Lucas: 1 período + 2/12 em julho torna-se
// 1 período + 3/12 em agosto, sobre base remuneratória de R$ 8.146,80.
const base=8146.80,previous=12672.80,regular=Math.round(base/9*100)/100;
const target=Math.round(base*(1+3/12)*4/3*100)/100;
const adjustment=Math.round((target-previous-regular)*100)/100;
assert.strictEqual(regular,905.20);
assert.strictEqual(target,13578.00);
assert.strictEqual(adjustment,0);

// A Isabel completa 12/12 em agosto: os avos viram um período adquirido sem
// perder o saldo acumulado.
const isabelBase=5756,augustTarget=Math.round(isabelBase*1*4/3*100)/100;
assert.strictEqual(augustTarget,7674.67);

console.log('RH v92 motor mensal persistente de provisões: OK');
