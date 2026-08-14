// Worker do painel LNB: serve os arquivos estáticos (index.html, logos etc.)
// e expõe /api/gemini como proxy seguro para a API do Gemini — a chave
// (GEMINI_API_KEY) fica só aqui, como secret do Worker, nunca no navegador.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/gemini' && request.method === 'POST') {
      return handleGemini(request, env);
    }

    if (url.pathname === '/api/config' && request.method === 'GET') {
      return handleConfig(env);
    }

    if (request.method === 'GET' && (url.pathname === '/orcado/' || url.pathname === '/orcado/index.html')) {
      return handleOrcadoComPermissoes(request, env);
    }

    if (request.method === 'GET' && (url.pathname === '/beneficios/' || url.pathname === '/beneficios/index.html')) {
      return handleBeneficiosComRastreabilidade(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

// Aplicacao temporaria para o teste de staging. O HTML do Orcado tem mais de
// 1 MB e inclui a base orcamentaria embutida; por seguranca, publicamos somente
// o patch de codigo e o aplicamos ao servir a pagina. Depois da homologacao, o
// patch pode ser incorporado diretamente ao HTML e este bloco removido.
async function handleOrcadoComPermissoes(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;

  const html = await asset.text();
  if (html.includes('const LNB_ORCAMENTO_RECURSOS=')) {
    return responseHtml(asset, injectIaTraceability(html, 'orcado'), 'incorporado');
  }

  const patchUrl = new URL('/runtime-patches/orcado-permissions.patch', request.url);
  const patchResponse = await env.ASSETS.fetch(new Request(patchUrl, { method: 'GET' }));
  if (!patchResponse.ok) {
    console.error('Patch de permissoes do Orcado indisponivel:', patchResponse.status);
    return responseHtml(asset, injectIaTraceability(html, 'orcado'), 'indisponivel');
  }

  try {
    const patched = applyUnifiedPatch(html, await patchResponse.text(), 'orcado/index.html');
    return responseHtml(asset, injectIaTraceability(patched, 'orcado'), 'staging-v1');
  } catch (error) {
    console.error('Falha ao aplicar patch de permissoes do Orcado:', error);
    return responseHtml(asset, injectIaTraceability(html, 'orcado'), 'erro');
  }
}

async function handleBeneficiosComRastreabilidade(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  return responseHtml(asset, injectIaTraceability(await asset.text(), 'beneficios'), 'nao-aplicavel');
}

// Mantem os HTMLs grandes e as conexoes de dados intocados. O Worker injeta
// somente a camada de navegacao do Chat IA quando serve cada modulo.
function injectIaTraceability(html, moduleName) {
  const marker = `data-lnb-ia-traceability="${moduleName}"`;
  if (html.includes(marker)) return html;
  const style = '<link rel="stylesheet" href="/runtime-patches/ia-traceability.css?v=1" '+marker+'>';
  const script = `<script src="/runtime-patches/ia-traceability-${moduleName}.js?v=1" ${marker}></` + 'script>';
  let out = html;
  if (out.includes('</head>')) out = out.replace('</head>', style + '\n</head>');
  else out = style + '\n' + out;
  if (out.includes('</body>')) out = out.replace('</body>', script + '\n</body>');
  else out += '\n' + script;
  return out;
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
    let cursor = index;
    let consumedOld = 0;
    let producedNew = 0;
    const replacement = [];

    i += 1;
    while (i < patchLines.length && (consumedOld < oldCount || producedNew < newCount)) {
      const line = patchLines[i];
      if (line === '\\ No newline at end of file') {
        i += 1;
        continue;
      }

      const kind = line.charAt(0);
      const value = line.slice(1);
      if (kind === ' ' || kind === '-') {
        if (sourceLines[cursor] !== value) {
          throw new Error(`Contexto divergente na linha ${cursor + 1}.`);
        }
        consumedOld += 1;
        if (kind === ' ') {
          replacement.push(value);
          producedNew += 1;
        }
        cursor += 1;
      } else if (kind === '+') {
        replacement.push(value);
        producedNew += 1;
      }
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
  const key = env.GEMINI_API_KEY;
  if (!key) {
    return jsonError('GEMINI_API_KEY não configurada no Worker. Configure em Settings > Variables and Secrets.', 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError('Corpo da requisição inválido (esperado JSON).', 400);
  }

  const model = (body && body.model) || 'gemini-flash-latest';
  const stream = !!(body && body.stream);
  const contents = (body && body.contents) || [];
  const generationConfig = (body && body.generationConfig) || {};

  const action = stream ? 'streamGenerateContent' : 'generateContent';
  const qs = stream ? '?alt=sse' : '';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${action}${qs}`;

  let upstream;
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents, generationConfig })
    });
  } catch (e) {
    return jsonError('Falha ao contatar a API do Gemini: ' + e.message, 502);
  }

  if (stream) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
      }
    });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

// Expoe os IDs de planilhas/URL do Supabase configurados como vars do Worker
// (Settings > Variables and Secrets), em vez de deixa-los fixos no index.html.
// Fica so aqui, nao e segredo (a chave do Supabase ja e a publica/anon), mas assim
// da pra trocar de ambiente (teste/producao) sem editar o HTML.
function handleConfig(env) {
  const cfg = {
    GSHEET_REALIZADO_ID: env.GSHEET_REALIZADO_ID || null,
    GSHEET_ORCADO_ID: env.GSHEET_ORCADO_ID || null,
    SUPABASE_URL: env.SUPABASE_URL || null,
    SUPABASE_KEY: env.SUPABASE_KEY || null
  };
  return new Response(JSON.stringify(cfg), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: { message } }), {
    status: status || 500,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
