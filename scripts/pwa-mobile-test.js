'use strict';
const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('worker.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
const serviceWorker = fs.readFileSync('service-worker.js', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(index.includes('rel="manifest" href="/manifest.webmanifest"'), 'Manifesto não vinculado ao Painel.');
assert(index.includes('/runtime-patches/pwa-install.js?v=2'), 'Instalação PWA não carregada.');
assert(index.includes('id="hub-install"'), 'Botão de instalação ausente.');
assert(manifest.start_url === '/mobile/', 'A PWA deve abrir pelo endereço mobile.');
assert(manifest.scope === '/', 'O escopo deve preservar a navegação entre módulos.');
assert(Array.isArray(manifest.icons) && manifest.icons.some(icon => icon.purpose === 'maskable'), 'Ícone maskable ausente.');
assert(worker.includes("url.pathname === '/mobile/'"), 'Rota mobile não atendida pelo Worker.');
assert(serviceWorker.includes("request.mode === 'navigate'"), 'Navegações não estão protegidas por estratégia de rede.');
assert(!serviceWorker.includes("'/api/config',"), 'A API não pode ser armazenada no cache offline.');
assert(!serviceWorker.includes("'/index.html',"), 'Páginas autenticadas não podem ser pré-armazenadas.');

for (const path of ['offline.html', 'icons/painel-lnb-192.png', 'icons/painel-lnb-512.png', 'icons/painel-lnb-maskable-512.png']) {
  assert(fs.existsSync(path), 'Arquivo obrigatório ausente: ' + path);
}

console.log('PWA mobile: manifesto, rota, instalação e cache seguro validados.');
