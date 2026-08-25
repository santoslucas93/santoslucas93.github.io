'use strict';

const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('admin/index.html', 'utf8');
const edge = fs.readFileSync('supabase/functions/gerenciar-usuario/index.ts', 'utf8');

const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!inline.length) throw new Error('Script administrativo não encontrado.');
inline.forEach((match, index) => new vm.Script(match[1], { filename: `admin-inline-${index}.js` }));

[
  'id="bt-novo-usuario"',
  "gerenciarUsuario('criar'",
  "gerenciarUsuario('editar'",
  "gerenciarUsuario('excluir'",
  'data-editar-perfil',
  'data-excluir-perfil',
  'data-salvar-perfil',
  'Você não pode excluir o próprio acesso',
  'p.sistema||p.acesso_total||quem',
].forEach((required) => {
  if (!html.includes(required)) throw new Error(`Fluxo administrativo ausente: ${required}`);
});

[
  "action === 'criar'",
  "action === 'editar'",
  "action === 'excluir'",
  "p_recurso: 'admin'",
  "p_acao: 'administrar'",
  'SUPABASE_SERVICE_ROLE_KEY',
  'targetId === requester.id',
  'profileIsMaster(profileId)',
  "usuario_excluido",
].forEach((required) => {
  if (!edge.includes(required)) throw new Error(`Proteção do servidor ausente: ${required}`);
});

if (html.includes('SUPABASE_SERVICE_ROLE_KEY')) {
  throw new Error('A chave de serviço jamais pode aparecer no HTML administrativo.');
}

console.log('CRUD de usuários e perfis: interface e proteções essenciais validadas.');
