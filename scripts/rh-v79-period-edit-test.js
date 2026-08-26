const fs = require('fs');
const assert = require('assert');

const ui = fs.readFileSync('runtime-patches/rh-folha-hotfix-v79-edicao-periodos.inc.js', 'utf8');
const forecast = fs.readFileSync('runtime-patches/rh-folha-hotfix-v57-base-editavel-proxima-folha.inc.js', 'utf8');
const sql = fs.readFileSync('supabase/migrations/20260826110359_rh_edicao_periodos_auditada.sql', 'utf8');
const indexes = fs.readFileSync('supabase/migrations/20260826110553_rh_projecao_periodos_indices.sql', 'utf8');
const staging = fs.readFileSync('.github/workflows/deploy-staging.yml', 'utf8');
const production = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');

for (const action of ['editar_folha_importada', 'editar_proxima_folha', 'encerrar_periodo', 'reabrir_periodo']) {
  assert(sql.includes(action), `migration sem ação ${action}`);
  assert(ui.includes(action), `interface sem ação ${action}`);
}
for (const fn of ['rh_editar_folha_colaborador', 'rh_reabrir_competencia', 'rh_atualizar_status_projecao', 'rh_salvar_ajuste_projecao', 'rh_salvar_parametros_projecao_v2']) {
  assert(sql.includes(`function public.${fn}`), `migration sem função ${fn}`);
}
assert(sql.includes('create table if not exists public.rh_projecao_periodos'), 'período próprio da Próxima Folha ausente');
assert(sql.includes('enable row level security'), 'RLS da Próxima Folha ausente');
assert(sql.includes("if v_status in ('conferido', 'conciliado')"), 'edição não invalida conferência anterior');
assert(sql.includes("'folha_importada_editada'"), 'auditoria antes/depois da folha ausente');
assert(sql.includes("'projecao_periodo_reaberto'"), 'auditoria de reabertura da projeção ausente');
assert(sql.includes('revoke all on function public.rh_recalcular_competencia_interno(uuid) from public, anon, authenticated'), 'recalculo interno não está protegido');
for (const signature of [
  'public.rh_salvar_parametros_projecao(uuid,date,integer,numeric,numeric,numeric,integer,integer,text)',
  'public.rh_atualizar_salario_folha(uuid,numeric,text)',
  'public.rh_atualizar_status_competencia(uuid,text)'
]) {
  assert(sql.includes(`revoke all on function ${signature} from public, anon`), `${signature} ainda executável por PUBLIC/anon`);
  assert(sql.includes(`grant execute on function ${signature} to authenticated`), `${signature} indisponível ao usuário autenticado`);
}
assert(sql.includes('grant execute on function public.rh_editar_folha_colaborador'), 'RPC de edição não foi concedida ao usuário autenticado');
assert(indexes.includes('rh_projecao_periodos_encerrado_por_idx') && indexes.includes('rh_projecao_periodos_atualizado_por_idx'), 'chaves de auditoria do período estão sem índices de cobertura');

for (const marker of ['RH_PERIOD_EDIT_V79', 'Editar folha', 'Composição de rubricas', 'Motivo obrigatório', 'Reabrir período', 'Período encerrado', 'Salvar e recalcular']) {
  assert(ui.includes(marker), `interface sem ${marker}`);
}
assert(ui.includes("status79()!=='fechado'"), 'interface não bloqueia edição em período fechado');
assert(ui.includes('voltará automaticamente para <b>Importado</b>'), 'interface não avisa sobre reconferência');
assert(!ui.includes('MutationObserver'), 'camada de edição não deve criar observador de DOM');
assert(forecast.includes("can('editar_proxima_folha')"), 'parâmetros individuais da projeção não usam permissão específica');
assert(forecast.includes('rh_salvar_parametros_projecao_v2'), 'parâmetros individuais não usam RPC auditada');
assert(forecast.includes("document.dispatchEvent(new CustomEvent('rh:v57:rendered'"), 'Próxima Folha não publica o estado do período');

for (const workflow of [staging, production]) {
  assert(workflow.includes('rh-folha-hotfix-v79-edicao-periodos.inc.js'), 'workflow não inclui v79');
  assert(workflow.includes('node scripts/rh-v79-period-edit-test.js'), 'workflow não executa teste v79');
}

console.log('RH v79 period editing: OK');
