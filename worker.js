// Worker do painel LNB: serve os arquivos estáticos e expõe APIs seguras.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/gemini' && request.method === 'POST') return handleGemini(request, env);
    if (url.pathname === '/api/rh/holerite-email' && request.method === 'POST') return handleHoleriteEmail(request, env);
    if (url.pathname === '/api/config' && request.method === 'GET') return handleConfig(env);
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return handleHubBranding(request, env, false);
    if (request.method === 'GET' && (url.pathname === '/mobile' || url.pathname === '/mobile/' || url.pathname === '/mobile/index.html')) return handleHubBranding(request, env, true);
    if (request.method === 'GET' && (url.pathname === '/orcado/' || url.pathname === '/orcado/index.html')) return handleOrcadoComPermissoes(request, env);
    if (request.method === 'GET' && (url.pathname === '/beneficios/' || url.pathname === '/beneficios/index.html')) return handleBeneficiosComRastreabilidade(request, env);
    if (request.method === 'GET' && (url.pathname === '/rh/' || url.pathname === '/rh/index.html')) return handleRhHtml(request, env);
    if (request.method === 'GET' && (url.pathname === '/revisao-ids' || url.pathname === '/revisao-ids.html')) return handleGenericHtml(request, env);
    if (request.method === 'GET' && url.pathname === '/rh/app.js') return handleRhAppPatch(request, env);
    if (request.method === 'GET') return handleMobileAwareAsset(request, env);
    return env.ASSETS.fetch(request);
  }
};

async function handleHubBranding(request, env, mobileEntry) {
  let assetRequest = request;
  if (mobileEntry) {
    const rootUrl = new URL('/index.html', request.url);
    assetRequest = new Request(rootUrl, { method: 'GET', headers: request.headers });
  }
  const asset = await env.ASSETS.fetch(assetRequest);
  if (!asset.ok) return asset;
  let html = await asset.text();
  if (mobileEntry) html = html.replace('<html lang="pt-BR">', '<html lang="pt-BR" data-lnb-mobile-entry="true">');
  const marker = 'data-lnb-hub-branding="v1"';
  if (html.includes(marker)) return responsePatchedHtml(asset, html, 'x-lnb-hub-branding', 'v1');
  const style = '<link rel="stylesheet" href="/runtime-patches/hub-branding.css?v=1" '+marker+'>';
  const script = '<script src="/runtime-patches/hub-branding.js?v=1" '+marker+'></' + 'script>';
  let out = html;
  if (out.includes('</head>')) out = out.replace('</head>', style + '\n</head>'); else out = style + '\n' + out;
  if (out.includes('</body>')) out = out.replace('</body>', script + '\n</body>'); else out += '\n' + script;
  out = injectSystemExportBranding(injectSystemTextSpacing(out));
  out = injectMobileAppShell(out, request, 'hub', mobileEntry);
  const response = responsePatchedHtml(asset, out, 'x-lnb-hub-branding', 'v1');
  if (!mobileEntry) return response;
  const headers = new Headers(response.headers);
  headers.set('x-lnb-mobile-entry', 'v1');
  return new Response(response.body, { status: response.status, headers });
}

async function handleOrcadoComPermissoes(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  const html = await asset.text();
  if (html.includes('const LNB_ORCAMENTO_RECURSOS=')) return responseHtml(asset, injectMobileAppShell(injectSystemExportBranding(injectSystemTextSpacing(injectIaTraceability(html, 'orcado'))), request, 'orcado'), 'incorporado');
  const patchUrl = new URL('/runtime-patches/orcado-permissions.patch', request.url);
  const patchResponse = await env.ASSETS.fetch(new Request(patchUrl, { method: 'GET' }));
  if (!patchResponse.ok) return responseHtml(asset, injectMobileAppShell(injectSystemExportBranding(injectSystemTextSpacing(injectIaTraceability(html, 'orcado'))), request, 'orcado'), 'indisponivel');
  try {
    const patched = applyUnifiedPatch(html, await patchResponse.text(), 'orcado/index.html');
    return responseHtml(asset, injectMobileAppShell(injectSystemExportBranding(injectSystemTextSpacing(injectIaTraceability(patched, 'orcado'))), request, 'orcado'), 'staging-v1');
  } catch (error) {
    console.error('Falha ao aplicar patch de permissoes do Orcado:', error);
    return responseHtml(asset, injectMobileAppShell(injectSystemExportBranding(injectSystemTextSpacing(injectIaTraceability(html, 'orcado'))), request, 'orcado'), 'erro');
  }
}

async function handleBeneficiosComRastreabilidade(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  const html = injectBenefitsGranularPermissions(await asset.text());
  return responseHtml(asset, injectMobileAppShell(injectBenefitsOfficialLogo(injectSystemExportBranding(injectSystemTextSpacing(injectIaTraceability(html, 'beneficios')))), request, 'beneficios'), 'granular-v90');
}

async function handleRhHtml(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  const html = injectSystemExportBranding(injectSystemTextSpacing(await asset.text()));
  return responsePatchedHtml(asset, injectMobileAppShell(html, request, 'rh'), 'x-lnb-system-spacing', 'v67');
}

async function handleGenericHtml(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  const html = injectSystemExportBranding(injectSystemTextSpacing(await asset.text()));
  return responsePatchedHtml(asset, injectMobileAppShell(html, request, inferMobileModule(new URL(request.url).pathname)), 'x-lnb-export-branding', 'v67');
}

async function handleMobileAwareAsset(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok || !isMobileRequest(request)) return asset;
  const contentType = String(asset.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('text/html')) return asset;
  const path = new URL(request.url).pathname;
  const html = injectMobileAppShell(await asset.text(), request, inferMobileModule(path));
  return responsePatchedHtml(asset, html, 'x-lnb-mobile-shell', 'v6');
}

function isMobileRequest(request, forceMobile) {
  if (forceMobile) return true;
  const url = new URL(request.url);
  if (url.pathname === '/mobile' || url.pathname.startsWith('/mobile/')) return true;
  if (url.searchParams.get('lnb_mobile') === '1') return true;
  if (String(request.headers.get('sec-ch-ua-mobile') || '') === '?1') return true;
  return /Android.*Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(String(request.headers.get('user-agent') || ''));
}

function inferMobileModule(pathname) {
  const segment = String(pathname || '/').split('/').filter(Boolean)[0] || 'hub';
  const aliases = { mobile: 'hub', orcado: 'orcado', beneficios: 'beneficios', rh: 'rh', admin: 'admin', colaboradores: 'colaboradores' };
  return aliases[segment] || segment.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'modulo';
}

function injectMobileAppShell(html, request, moduleName, forceMobile) {
  if (!isMobileRequest(request, forceMobile)) return html;
  const marker = 'data-lnb-mobile-shell="v6"';
  if (html.includes(marker)) return html;
  const moduleId = String(moduleName || 'modulo').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
  const style = '<link rel="stylesheet" href="/runtime-patches/mobile-app-shell.css?v=6" '+marker+'>';
  const script = '<script src="/runtime-patches/mobile-app-shell.js?v=6" data-lnb-mobile-module="'+moduleId+'" '+marker+' defer></' + 'script>';
  let out = html.replace(/<html(\s[^>]*)?>/i, function(match, attrs){
    const rest = attrs || '';
    return '<html'+rest+' data-lnb-mobile-shell="v6" data-lnb-mobile-module="'+moduleId+'">';
  });
  if (out.includes('</head>')) out = out.replace('</head>', style + '\n</head>'); else out = style + '\n' + out;
  if (out.includes('</body>')) out = out.replace('</body>', script + '\n</body>'); else out += '\n' + script;
  return out;
}

async function handleRhAppPatch(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  const source = await asset.text();
  try {
    const rcUrl = new URL('/runtime-patches/rh-folha-rc.inc.js', request.url);
    const rcResponse = await env.ASSETS.fetch(new Request(rcUrl, { method: 'GET' }));
    if (!rcResponse.ok) throw new Error('Release candidate do RH indisponivel.');
    const rc = await rcResponse.text();

    // Motor de conferencia (somente leitura) — carregado DEPOIS do release
    // candidate. Se o arquivo faltar, o RH segue funcionando sem o painel.
    let motor = '';
    let motorStatus = 'ausente';
    try {
      const motorUrl = new URL('/runtime-patches/rh-folha-conciliacao-motor.inc.js', request.url);
      const motorResponse = await env.ASSETS.fetch(new Request(motorUrl, { method: 'GET' }));
      if (motorResponse.ok) {
        motor = '\n/* LNB RH — MOTOR DE CONFERENCIA (somente leitura) */\n' + (await motorResponse.text()) + '\n';
        motorStatus = 'ativo';
      }
    } catch (motorError) {
      console.error('Falha ao carregar o motor de conferencia do RH:', motorError);
      motorStatus = 'erro';
    }

    const bootMarker = "if(document.readyState==='loading')";
    const index = source.lastIndexOf(bootMarker);
    if (index < 0) throw new Error('Marcador de inicializacao do RH nao encontrado.');
    const injected = source.slice(0, index) + '\n/* LNB RH RELEASE CANDIDATE */\n' + rc + '\n' + motor + source.slice(index);
    const headers = new Headers(asset.headers);
    headers.delete('content-length');
    headers.set('content-type', 'application/javascript; charset=utf-8');
    headers.set('cache-control', 'no-store');
    headers.set('x-lnb-rh-patch', 'release-candidate-1');
    headers.set('x-lnb-rh-motor', motorStatus);
    return new Response(injected, { status: asset.status, headers });
  } catch (error) {
    console.error('Falha ao carregar release candidate do RH:', error);
    const headers = new Headers(asset.headers);
    headers.set('cache-control', 'no-store');
    headers.set('x-lnb-rh-patch', 'release-candidate-erro');
    return new Response(source, { status: asset.status, headers });
  }
}

function injectIaTraceability(html, moduleName) {
  const marker = `data-lnb-ia-traceability="${moduleName}"`;
  if (html.includes(marker)) return html;
  const style = '<link rel="stylesheet" href="/runtime-patches/ia-traceability.css?v=2" '+marker+'>';
  const script = `<script src="/runtime-patches/ia-traceability-${moduleName}.js?v=2" ${marker}></` + 'script>';
  let out = html;
  if (out.includes('</head>')) out = out.replace('</head>', style + '\n</head>'); else out = style + '\n' + out;
  if (out.includes('</body>')) out = out.replace('</body>', script + '\n</body>'); else out += '\n' + script;
  return out;
}

function injectBenefitsOfficialLogo(html) {
  const marker = 'data-lnb-benefits-logo="v88"';
  if (html.includes(marker)) return html;
  const style = '<link rel="stylesheet" href="/runtime-patches/beneficios-official-logo.css?v=88" '+marker+'>';
  const script = '<script src="/runtime-patches/beneficios-official-logo.js?v=88" '+marker+'></' + 'script>';
  let out = html;
  if (out.includes('</head>')) out = out.replace('</head>', style + '\n</head>'); else out = style + '\n' + out;
  if (out.includes('</body>')) out = out.replace('</body>', script + '\n</body>'); else out += '\n' + script;
  return out;
}

function injectBenefitsGranularPermissions(html) {
  const marker = '/* LNB BENEFICIOS PERMISSOES GRANULARES V90 */';
  if (html.includes(marker)) return html;
  const sessionAnchor = 'let AUTH_SESSION = null;';
  const readonlyAnchor = "function isReadOnlyUser(){ return !!(AUTH_SESSION && AUTH_SESSION.role && AUTH_SESSION.role!=='admin'); }";
  const accessAnchor = "    if(!r.ok) return null;\n    return await r.json();\n  }catch(e){ return null; }\n}\nfunction lnbTemModulo(acesso,recurso){";
  if (!html.includes(sessionAnchor) || !html.includes(readonlyAnchor) || !html.includes(accessAnchor)) {
    console.error('Marcadores de permissoes do modulo Beneficios nao encontrados.');
    return html;
  }
  const permissionCode = marker + "\n" +
    "let LNB_ACCESS = null;";
  const readonlyCode = [
    'function lnbCanBenefitsAction(action, resource){',
    '  const acesso=LNB_ACCESS;',
    "  if(!acesso)return !!(AUTH_SESSION&&AUTH_SESSION.role==='admin');",
    "  if(acesso.acesso_total||acesso.permissoes==='*')return true;",
    '  const permissoes=acesso.permissoes||{};',
    "  const recurso=resource||'beneficios';",
    '  const direct=Array.isArray(permissoes[recurso])?permissoes[recurso]:[];',
    '  const parent=Array.isArray(permissoes.beneficios)?permissoes.beneficios:[];',
    "  return direct.includes(action)||parent.includes(action)||direct.includes('administrar')||parent.includes('administrar');",
    '}',
    "function lnbHasFullBenefitsCrud(){ return ['criar','editar','excluir'].every(function(action){return lnbCanBenefitsAction(action,'beneficios');}); }",
    'function isReadOnlyUser(){',
    '  if(LNB_ACCESS)return !lnbHasFullBenefitsCrud();',
    "  return !!(AUTH_SESSION && AUTH_SESSION.role && AUTH_SESSION.role!=='admin');",
    '}'
  ].join('\n');
  let out = html.replace(sessionAnchor, sessionAnchor + '\n' + permissionCode);
  out = out.replace(readonlyAnchor, readonlyCode);
  out = out.replace(accessAnchor, "    if(!r.ok) return null;\n    LNB_ACCESS=await r.json();\n    return LNB_ACCESS;\n  }catch(e){ return null; }\n}\nfunction lnbTemModulo(acesso,recurso){");
  return out;
}

function injectSystemTextSpacing(html) {
  const marker = 'data-lnb-system-spacing="v61"';
  if (html.includes(marker)) return html;
  const script = '<script src="/runtime-patches/system-text-spacing.js?v=61" '+marker+'></' + 'script>';
  return html.includes('</body>') ? html.replace('</body>', script + '\n</body>') : html + '\n' + script;
}

function injectSystemExportBranding(html) {
  const marker = 'data-lnb-export-branding="v67"';
  if (html.includes(marker)) return html;
  const script = '<script src="/runtime-patches/system-export-branding.js?v=67" '+marker+'></' + 'script>';
  return html.includes('</body>') ? html.replace('</body>', script + '\n</body>') : html + '\n' + script;
}

function responsePatchedHtml(original, body, headerName, headerValue) {
  const headers = new Headers(original.headers);
  headers.delete('content-length');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-store');
  if (headerName) headers.set(headerName, headerValue || '1');
  return new Response(body, { status: original.status, headers });
}

function responseHtml(original, body, patchStatus) {
  const headers = new Headers(original.headers);
  headers.delete('content-length');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-store');
  headers.set('x-lnb-permissions-patch', patchStatus);
  headers.set('x-lnb-ia-traceability', 'v1');
  return new Response(body, { status: original.status, headers });
}

function applyUnifiedPatch(source, patch, targetPath) {
  const marker = `diff --git a/${targetPath} b/${targetPath}`;
  const start = patch.indexOf(marker);
  if (start < 0) throw new Error(`Arquivo ${targetPath} nao encontrado no patch.`);
  const nextDiff = patch.indexOf('\ndiff --git ', start + marker.length);
  const section = patch.slice(start, nextDiff < 0 ? patch.length : nextDiff);
  const patchLines = section.split('\n');
  const sourceLines = source.split('\n');
  let delta = 0;
  for (let i = 0; i < patchLines.length; i += 1) {
    const match = patchLines[i].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (!match) continue;
    const oldStart = Number(match[1]);
    const oldCount = match[2] === undefined ? 1 : Number(match[2]);
    const newCount = match[4] === undefined ? 1 : Number(match[4]);
    const index = oldStart - 1 + delta;
    let cursor = index, consumedOld = 0, producedNew = 0;
    const replacement = [];
    i += 1;
    while (i < patchLines.length && (consumedOld < oldCount || producedNew < newCount)) {
      const line = patchLines[i];
      if (line === '\\ No newline at end of file') { i += 1; continue; }
      const kind = line.charAt(0), value = line.slice(1);
      if (kind === ' ' || kind === '-') {
        if (sourceLines[cursor] !== value) throw new Error(`Contexto divergente na linha ${cursor + 1}.`);
        consumedOld += 1;
        if (kind === ' ') { replacement.push(value); producedNew += 1; }
        cursor += 1;
      } else if (kind === '+') { replacement.push(value); producedNew += 1; }
      i += 1;
    }
    const removed = cursor - index;
    sourceLines.splice(index, removed, ...replacement);
    delta += replacement.length - removed;
    i -= 1;
  }
  return sourceLines.join('\n');
}

export { applyUnifiedPatch };

async function handleGemini(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return jsonError('Corpo da requisição inválido (esperado JSON).', 400); }
  if (body && body.contextScope === 'rh') {
    const access = await validateRhGeminiAccess(request, env);
    if (!access.ok) return jsonError(access.message, access.status);
    if (JSON.stringify(body.contents || []).length > 350000) return jsonError('O contexto do RH excedeu o limite seguro.', 413);
  }
  const key = env.GEMINI_API_KEY;
  if (!key) return jsonError('GEMINI_API_KEY não configurada no Worker. Configure em Settings > Variables and Secrets.', 500);
  const model = (body && body.model) || 'gemini-flash-latest';
  const stream = !!(body && body.stream);
  const contents = (body && body.contents) || [];
  const generationConfig = (body && body.generationConfig) || {};
  const action = stream ? 'streamGenerateContent' : 'generateContent';
  const qs = stream ? '?alt=sse' : '';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${action}${qs}`;
  let upstream;
  try {
    upstream = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents, generationConfig }) });
  } catch (e) { return jsonError('Falha ao contatar a API do Gemini: ' + e.message, 502); }
  if (stream) return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' } });
  const text = await upstream.text();
  return new Response(text, { status: upstream.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

async function validateRhGeminiAccess(request, env) {
  const token = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, message: 'Sessão do RH não informada.' };
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return { ok: false, status: 500, message: 'Integração de acesso do RH não configurada.' };
  const headers = { apikey: env.SUPABASE_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  let response;
  try { response = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/meu_acesso', { method: 'POST', headers, body: '{}' }); }
  catch (error) { return { ok: false, status: 502, message: 'Não foi possível validar o acesso ao RH.' }; }
  if (!response.ok) return { ok: false, status: response.status === 401 ? 401 : 403, message: 'Sessão inválida ou sem acesso ao RH.' };
  const access = await response.json().catch(() => null);
  const permissions = access && access.permissoes;
  const rh = permissions && typeof permissions === 'object' ? permissions.rh : null;
  const allowed = !!(access && access.autenticado && access.cadastrado && !(access.usuario && (access.usuario.bloqueado || !access.usuario.ativo)) && (access.acesso_total || permissions === '*' || (Array.isArray(rh) && rh.includes('visualizar'))));
  return allowed ? { ok: true } : { ok: false, status: 403, message: 'Seu perfil não possui permissão para consultar o Gemini no RH.' };
}

function handleConfig(env) {
  const cfg = { GSHEET_REALIZADO_ID: env.GSHEET_REALIZADO_ID || null, GSHEET_ORCADO_ID: env.GSHEET_ORCADO_ID || null, SUPABASE_URL: env.SUPABASE_URL || null, SUPABASE_KEY: env.SUPABASE_KEY || null, RH_EMAIL_CONFIGURED: !!(env.RH_HOLERITE_FROM && (env.EMAIL || env.RESEND_API_KEY)), RH_EMAIL_PROVIDER: env.EMAIL ? 'cloudflare' : (env.RESEND_API_KEY ? 'resend' : null) };
  return new Response(JSON.stringify(cfg), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function handleHoleriteEmail(request, env) {
  const token = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return jsonError('Sessão não informada.', 401);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return jsonError('Integração de acesso não configurada.', 500);
  if (!env.RH_HOLERITE_FROM || (!env.EMAIL && !env.RESEND_API_KEY)) {
    return jsonError('Envio de holerites ainda não configurado. Defina o remetente e o provedor seguro no Worker.', 503);
  }

  let body;
  try { body = await request.json(); } catch (e) { return jsonError('Corpo da requisição inválido.', 400); }
  const competenciaId = String(body && body.competencia_id || '');
  const colaboradorId = String(body && body.colaborador_id || '');
  const to = String(body && body.to || '').trim().toLowerCase();
  const employeeName = String(body && body.employee_name || 'Colaborador').trim().slice(0, 160);
  const competence = String(body && body.competence || '').trim().slice(0, 30);
  const pdfBase64 = String(body && body.pdf_base64 || '').replace(/^data:application\/pdf;base64,/, '');
  const filename = safeAttachmentName(body && body.filename || 'Holerite.pdf');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(competenciaId) || !uuid.test(colaboradorId)) return jsonError('Competência ou colaborador inválido.', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) return jsonError('E-mail do colaborador inválido.', 400);
  if (!pdfBase64 || pdfBase64.length > 5 * 1024 * 1024 || !/^[A-Za-z0-9+/=\r\n]+$/.test(pdfBase64)) return jsonError('PDF ausente, inválido ou acima do limite de 5 MiB.', 413);

  const authHeaders = { 'apikey': env.SUPABASE_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  const permitted = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/rh_pode_enviar_holerite', { method: 'POST', headers: authHeaders, body: '{}' });
  if (!permitted.ok) return jsonError('Não foi possível validar a permissão de envio.', permitted.status === 401 ? 401 : 403);
  if ((await permitted.text()).trim() !== 'true') return jsonError('Seu perfil não possui permissão para enviar holerites.', 403);

  const subject = 'Holerite ' + competence + ' — Liga Nacional de Basquete';
  const html = '<div style="font-family:Arial,sans-serif;color:#152333;line-height:1.5">' +
    '<p>Olá, ' + escapeEmailHtml(employeeName) + '.</p>' +
    '<p>Segue em anexo o seu holerite referente à competência <strong>' + escapeEmailHtml(competence) + '</strong>.</p>' +
    '<p>Em caso de dúvida, responda a esta mensagem e fale com o RH.</p>' +
    '<p>Atenciosamente,<br><strong>Liga Nacional de Basquete — RH</strong></p></div>';
  const text = 'Olá, ' + employeeName + '.\n\nSegue em anexo o seu holerite referente à competência ' + competence + '.\n\nLiga Nacional de Basquete — RH';
  let provider = env.EMAIL ? 'cloudflare' : 'resend';
  let providerId = null;
  try {
    if (env.EMAIL) {
      const sent = await env.EMAIL.send({
        to, from: env.RH_HOLERITE_FROM, replyTo: env.RH_HOLERITE_REPLY_TO || undefined,
        subject, html, text,
        attachments: [{ content: pdfBase64, filename, type: 'application/pdf', disposition: 'attachment' }]
      });
      providerId = sent && (sent.messageId || sent.id) || null;
    } else {
      const resend = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': ('rh-' + competenciaId + '-' + colaboradorId).slice(0, 256) },
        body: JSON.stringify({ from: env.RH_HOLERITE_FROM, to: [to], reply_to: env.RH_HOLERITE_REPLY_TO || undefined, subject, html, text, attachments: [{ content: pdfBase64, filename }] })
      });
      const sent = await resend.json().catch(() => ({}));
      if (!resend.ok) throw new Error(sent && (sent.message || sent.error && sent.error.message) || 'Falha no provedor de e-mail.');
      providerId = sent && sent.id || null;
    }
  } catch (error) {
    await registerHoleriteDelivery(env, authHeaders, { competenciaId, colaboradorId, to, status: 'erro', provider, providerId, detail: String(error && error.message || error).slice(0, 500) });
    return jsonError('O provedor recusou o envio: ' + String(error && error.message || error), 502);
  }

  const registered = await registerHoleriteDelivery(env, authHeaders, { competenciaId, colaboradorId, to, status: 'enviado', provider, providerId, detail: null });
  return new Response(JSON.stringify({ ok: true, provider, message_id: providerId, registered }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function registerHoleriteDelivery(env, headers, item) {
  try {
    const response = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/rh_registrar_envio_holerite', {
      method: 'POST', headers,
      body: JSON.stringify({ p_competencia_id: item.competenciaId, p_colaborador_id: item.colaboradorId,
        p_destinatario_email: item.to, p_status: item.status, p_provedor: item.provider,
        p_provedor_id: item.providerId, p_detalhe: item.detail })
    });
    return response.ok;
  } catch (e) { return false; }
}

function safeAttachmentName(value) {
  const name = String(value || 'Holerite.pdf').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 180);
  return /\.pdf$/i.test(name) ? name : name + '.pdf';
}

function escapeEmailHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: { message } }), { status: status || 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
