/*
 * Administração segura de contas do Painel LNB.
 *
 * A chave de serviço permanece exclusivamente nesta função. A página envia o
 * token da pessoa conectada e a função confirma no banco a permissão
 * admin:administrar antes de tocar em auth.users.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function serviceFetch(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
  });
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 300) }; }
}

async function requesterFromToken(auth: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_ROLE, Authorization: auth },
  });
  if (!response.ok) return null;
  return readJson(response);
}

async function profileById(id: string) {
  const response = await serviceFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,nome,email,ativo,bloqueado,valido_ate,role`);
  const rows = response.ok ? await readJson(response) : [];
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function isMaster(id: string) {
  const response = await serviceFetch(
    `/rest/v1/usuario_perfis?usuario_id=eq.${encodeURIComponent(id)}&select=valido_ate,perfis!inner(acesso_total,ativo)`,
  );
  const rows = response.ok ? await readJson(response) : [];
  const today = new Date().toISOString().slice(0, 10);
  return Array.isArray(rows) && rows.some((row: any) =>
    row?.perfis?.acesso_total && row?.perfis?.ativo && (!row.valido_ate || row.valido_ate >= today)
  );
}

async function canAdminister(id: string) {
  const profile = await profileById(id);
  const today = new Date().toISOString().slice(0, 10);
  if (!profile?.ativo || profile?.bloqueado || (profile.valido_ate && profile.valido_ate < today)) return false;
  const response = await serviceFetch('/rest/v1/rpc/tem_permissao', {
    method: 'POST',
    body: JSON.stringify({ p_recurso: 'admin', p_acao: 'administrar', p_usuario: id }),
  });
  return response.ok && String(await response.text()).trim() === 'true';
}

async function profileIsMaster(profileId: string | null) {
  if (!profileId) return false;
  const response = await serviceFetch(`/rest/v1/perfis?id=eq.${encodeURIComponent(profileId)}&select=acesso_total,ativo`);
  const rows = response.ok ? await readJson(response) : [];
  return Array.isArray(rows) && !!rows[0]?.acesso_total && !!rows[0]?.ativo;
}

async function audit(actor: string, action: string, details: Record<string, unknown>) {
  await serviceFetch('/rest/v1/activity_log', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{ actor, action, details: JSON.stringify(details) }]),
  }).catch(() => {});
}

function cleanEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function uuid(value: unknown) {
  const text = String(value || '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : '';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return json({ erro: 'Método não suportado.' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ erro: 'Administração de usuários não configurada no servidor.' }, 503);

  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ erro: 'Sessão não informada.' }, 401);
  const requester = await requesterFromToken(auth);
  if (!requester?.id) return json({ erro: 'Sessão inválida.' }, 401);
  if (!(await canAdminister(requester.id))) return json({ erro: 'Seu perfil não permite administrar usuários.' }, 403);

  let body: any;
  try { body = await request.json(); } catch { return json({ erro: 'Corpo inválido.' }, 400); }
  const action = String(body?.acao || '');
  const actor = String(requester.email || requester.id);

  if (action === 'criar') {
    const name = String(body?.nome || '').trim().slice(0, 160);
    const email = cleanEmail(body?.email);
    const password = String(body?.senha || '');
    const profileId = body?.perfil_id ? String(body.perfil_id) : null;
    const validUntil = body?.valido_ate ? String(body.valido_ate) : null;
    if (!name) return json({ erro: 'Informe o nome.' }, 400);
    if (!validEmail(email)) return json({ erro: 'Informe um e-mail válido.' }, 400);
    if (password.length < 8) return json({ erro: 'A senha temporária precisa ter ao menos 8 caracteres.' }, 400);
    if (profileId && await profileIsMaster(profileId) && !(await isMaster(requester.id))) {
      return json({ erro: 'Somente um Administrador Mestre pode conceder acesso total.' }, 403);
    }

    const authResponse = await serviceFetch('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { nome: name } }),
    });
    const created = await readJson(authResponse);
    if (!authResponse.ok || !created?.id) return json({ erro: 'O Supabase recusou a criação: ' + String(created?.msg || created?.message || created?.raw || '').slice(0, 220) }, 400);

    const role = profileId && await profileIsMaster(profileId) ? 'administrador' : 'visualizador';
    const profileResponse = await serviceFetch('/rest/v1/profiles', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{ id: created.id, nome: name, email, role, ativo: true, bloqueado: false, criado_por: requester.id }]),
    });
    if (!profileResponse.ok) {
      await serviceFetch(`/auth/v1/admin/users/${created.id}`, { method: 'DELETE' }).catch(() => {});
      const error = await readJson(profileResponse);
      return json({ erro: 'Não foi possível criar o perfil de acesso: ' + String(error?.message || error?.raw || '').slice(0, 220) }, 400);
    }

    if (profileId) {
      const linkResponse = await serviceFetch('/rest/v1/usuario_perfis', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify([{ usuario_id: created.id, perfil_id: profileId, valido_ate: validUntil, concedido_por: requester.id }]),
      });
      if (!linkResponse.ok) {
        await serviceFetch(`/auth/v1/admin/users/${created.id}`, { method: 'DELETE' }).catch(() => {});
        const error = await readJson(linkResponse);
        return json({ erro: 'Não foi possível conceder o perfil inicial: ' + String(error?.message || error?.raw || '').slice(0, 220) }, 400);
      }
    }
    await audit(actor, 'usuario_criado', { usuario_id: created.id, email, perfil_id: profileId });
    return json({ ok: true, usuario_id: created.id });
  }

  if (action === 'editar') {
    const targetId = uuid(body?.usuario_id);
    if (!targetId) return json({ erro: 'Usuário inválido.' }, 400);
    const current = await profileById(targetId);
    if (!current) return json({ erro: 'Usuário não encontrado.' }, 404);
    const name = String(body?.nome || '').trim().slice(0, 160);
    const email = cleanEmail(body?.email);
    if (!name || !validEmail(email)) return json({ erro: 'Revise o nome e o e-mail.' }, 400);

    const authResponse = await serviceFetch(`/auth/v1/admin/users/${targetId}`, {
      method: 'PUT',
      body: JSON.stringify({ email, email_confirm: true, user_metadata: { nome: name } }),
    });
    const authBody = await readJson(authResponse);
    if (!authResponse.ok) return json({ erro: 'Não foi possível atualizar a conta: ' + String(authBody?.msg || authBody?.message || authBody?.raw || '').slice(0, 220) }, 400);

    const update = {
      nome: name,
      email,
      ativo: body?.ativo !== false,
      bloqueado: body?.bloqueado === true,
      valido_ate: body?.valido_ate || null,
    };
    const profileResponse = await serviceFetch(`/rest/v1/profiles?id=eq.${targetId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(update),
    });
    if (!profileResponse.ok) {
      await serviceFetch(`/auth/v1/admin/users/${targetId}`, {
        method: 'PUT',
        body: JSON.stringify({ email: current.email, email_confirm: true, user_metadata: { nome: current.nome } }),
      }).catch(() => {});
      const error = await readJson(profileResponse);
      return json({ erro: String(error?.message || error?.raw || 'A atualização deixaria a plataforma sem Administrador Mestre.').slice(0, 240) }, 409);
    }
    await audit(actor, 'usuario_editado', { usuario_id: targetId, email });
    return json({ ok: true });
  }

  if (action === 'excluir') {
    const targetId = uuid(body?.usuario_id);
    if (!targetId) return json({ erro: 'Usuário inválido.' }, 400);
    if (targetId === requester.id) return json({ erro: 'Você não pode excluir o próprio acesso enquanto está conectado.' }, 409);
    const current = await profileById(targetId);
    if (!current) return json({ erro: 'Usuário não encontrado.' }, 404);
    if (cleanEmail(body?.confirmacao_email) !== cleanEmail(current.email)) return json({ erro: 'A confirmação do e-mail não confere.' }, 400);

    const deleteResponse = await serviceFetch(`/auth/v1/admin/users/${targetId}`, { method: 'DELETE' });
    const deleteBody = await readJson(deleteResponse);
    if (!deleteResponse.ok) {
      return json({ erro: 'A exclusão foi bloqueada para preservar segurança ou histórico: ' + String(deleteBody?.msg || deleteBody?.message || deleteBody?.raw || '').slice(0, 220) }, 409);
    }
    await audit(actor, 'usuario_excluido', { usuario_id: targetId, email: current.email });
    return json({ ok: true });
  }

  return json({ erro: 'Ação desconhecida.' }, 400);
});
