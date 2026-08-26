'use strict';
const fs=require('fs');
const assert=require('assert');

const ui=fs.readFileSync('runtime-patches/rh-folha-hotfix-v73-edicao-completa-colaboradores.inc.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260826142507_rh_atualizar_colaborador.sql','utf8');
const migrations=fs.readdirSync('supabase/migrations')
  .filter(name=>name.endsWith('.sql'))
  .map(name=>fs.readFileSync(`supabase/migrations/${name}`,'utf8'))
  .join('\n');

for(const marker of ['RH_EDIT_V73','rh_atualizar_colaborador','rh73-edit-form','Editar cadastro','salaryRaw']) {
  assert(ui.includes(marker),`v73 sem ${marker}`);
}
for(const marker of [
  'create or replace function public.rh_atualizar_colaborador',
  "public.tem_permissao('rh', 'administrar', v_uid)",
  "set search_path to 'pg_catalog', 'public'",
  "insert into public.rh_auditoria",
  'grant execute on function public.rh_atualizar_colaborador'
]) assert(migration.toLowerCase().includes(marker.toLowerCase()),`migration v73 sem ${marker}`);

assert(ui.includes("salaryRaw===''?null:parseMoney73(salaryRaw)"),'salário zero não pode ser convertido em nulo');
assert(migrations.toLowerCase().includes('revoke all on function public.rh_atualizar_colaborador'),'RPC v73 precisa revogar PUBLIC/anon');

console.log('RH v73 collaborator editing: OK');
