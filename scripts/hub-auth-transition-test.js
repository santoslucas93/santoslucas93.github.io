'use strict';

const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('worker.js', 'utf8');

assert.match(html, /<body class="hub-auth-booting" aria-busy="true">/, 'a Central deve nascer em estado neutro de carregamento');
assert.match(html, /id="hub-auth-loading"[^>]+role="status"/, 'o carregamento precisa ser anunciado como status acessível');
assert.match(html, /body\.hub-auth-booting #hub-login[^}]+display:none!important/, 'o formulário de login não pode aparecer durante a validação');
assert.match(html, /function finishBoot\(\)[\s\S]*remove\('hub-auth-booting'\)[\s\S]*removeAttribute\('aria-busy'\)/, 'o portão deve liberar a interface após a validação');
assert.match(html, /function showLogin\(message\)[\s\S]*finishBoot\(\)/, 'o login só pode ser exibido depois de concluir a validação');
assert.match(html, /style\.display='block';finishBoot\(\)/, 'a Central autenticada deve substituir o carregamento sem revelar o login');
assert.match(html, /if\(!r\.ok\)throw new Error\('Configuração indisponível\.'\)/, 'falhas da configuração devem encerrar o carregamento de forma controlada');
assert.match(worker, /cache-control', 'no-store'/, 'o HTML autenticado não deve ficar retido em cache intermediário');

console.log('OK: transição da Central preserva a sessão e elimina o flash de logout.');
