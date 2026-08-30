const fs = require('fs');

const source = fs.readFileSync('beneficios/index.html', 'utf8');
const start = source.indexOf('function mobExcluirColaborador(id)');
const end = source.indexOf('/* Aproveita o cadastro', start);
if (start < 0 || end < 0) throw new Error('Fluxo de desligamento da Mobilidade não encontrado.');

const flow = source.slice(start, end);
for (const required of [
  "c.situacao = 'desligado'",
  "MobDB.put('colaboradores', c)",
  "'desligamento'",
  'Cadastro e corridas preservados'
]) {
  if (!flow.includes(required)) throw new Error(`Proteção ausente: ${required}`);
}
for (const forbidden of [
  "MobDB.del('colaboradores', id)",
  'Mob.colaboradores = Mob.colaboradores.filter'
]) {
  if (flow.includes(forbidden)) throw new Error(`Exclusão física ainda presente: ${forbidden}`);
}

console.log('OK: Mobilidade usa desligamento lógico e preserva cadastro/corridas.');
