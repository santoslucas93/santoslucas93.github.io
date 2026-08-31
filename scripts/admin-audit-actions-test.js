const fs = require('fs');

const source = fs.readFileSync('admin/index.html', 'utf8');
for (const marker of [
  'function registrarAtividade(acao,detalhes)',
  "'usuario_bloqueado'",
  "'usuario_desbloqueado'",
  "'perfil_concedido'",
  "'perfil_revogado'",
  "'permissoes_perfil_atualizadas'",
  "'excecoes_usuario_atualizadas'"
]) {
  if (!source.includes(marker)) throw new Error(`Auditoria administrativa ausente: ${marker}`);
}

const edge = fs.readFileSync('supabase/functions/gerenciar-usuario/index.ts', 'utf8');
for (const marker of ["'usuario_criado'", "'usuario_editado'", "'usuario_excluido'"]) {
  if (!edge.includes(marker)) throw new Error(`Auditoria da Edge Function ausente: ${marker}`);
}

console.log('OK: ações administrativas relevantes registram auditoria.');
