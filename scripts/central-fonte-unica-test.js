const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('colaboradores/index.html', 'utf8');
const migration = fs.readFileSync(
  'supabase/migrations/20260830213000_central_fonte_unica_sincronizacao_total.sql',
  'utf8'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scriptStart = html.lastIndexOf('<script>') + '<script>'.length;
const scriptEnd = html.indexOf('</script>', scriptStart);
assert(scriptStart > 7 && scriptEnd > scriptStart, 'Script principal da Central não encontrado.');
new vm.Script(html.slice(scriptStart, scriptEnd), { filename: 'colaboradores/index.html' });

assert(html.includes("rpc/'+nome"), 'A Central precisa usar RPC para gravar.');
assert(html.includes("salvar_colaborador_central"), 'RPC individual não ligado à tela.');
assert(html.includes("salvar_colaboradores_central_lote"), 'RPC em lote não ligado à tela.');
assert(!/method\s*:\s*['\"]PATCH['\"]/.test(html), 'Ainda existe gravação PATCH parcial na Central.');
assert(html.includes('btn-novo-colaborador'), 'Cadastro de novo colaborador ausente.');
assert(html.includes('btn-importar-colaboradores'), 'Importação CSV ausente.');
assert(html.includes('ed-nome') && html.includes('ed-cpf') && html.includes('ed-nascimento'), 'Dados pessoais não estão editáveis.');

assert(migration.includes('trg_colaboradores_master_propagar'), 'Gatilho de propagação ausente.');
assert(migration.includes('private.sincronizar_colaborador_central_operacional'), 'Motor de sincronização ausente.');
[
  'liga_emp',
  'liga_mestre',
  'liga_vt_registros',
  'liga_med_registros',
  'liga_prud_registros',
  'liga_mob_colaboradores'
].forEach((key) => assert(migration.includes(`'${key}'`), `Sincronização ausente para ${key}.`));
assert(!/\bdelete\s+from\b/i.test(migration), 'A migração não pode remover colaboradores fisicamente.');
assert(migration.includes("security invoker"), 'RPC público deve manter o contexto de segurança do usuário.');

console.log('Central fonte única: estrutura, sintaxe e proteções verificadas.');
