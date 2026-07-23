// Worker do painel LNB: serve os arquivos estáticos (index.html, logos etc.)
// e expõe /api/gemini como proxy seguro para a API do Gemini — a chave
// (GEMINI_API_KEY) fica só aqui, como secret do Worker, nunca no navegador.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/gemini' && request.method === 'POST') {
      return handleGemini(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

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

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: { message } }), {
    status: status || 500,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
