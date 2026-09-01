(function () {
  'use strict';
  var installButton = document.getElementById('hub-install');
  var deferredPrompt = null;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  function showInstallButton() {
    if (installButton && !isStandalone) installButton.classList.add('on');
  }

  function closeSheet() {
    var sheet = document.querySelector('.pwa-sheet-backdrop');
    if (sheet) sheet.remove();
  }

  function showIOSInstructions() {
    closeSheet();
    var backdrop = document.createElement('div');
    backdrop.className = 'pwa-sheet-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'pwa-sheet-title');
    backdrop.innerHTML = '<div class="pwa-sheet"><button type="button" class="pwa-sheet-close" aria-label="Fechar">×</button><h2 id="pwa-sheet-title">Instalar o Painel LNB</h2><p>No Safari, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>. O Painel será aberto em tela cheia, como um aplicativo.</p><div class="pwa-sheet-actions"><button type="button" data-primary>Entendi</button></div></div>';
    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop || event.target.matches('button')) closeSheet();
    });
    document.body.appendChild(backdrop);
    backdrop.querySelector('.pwa-sheet-close').focus();
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    showInstallButton();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    if (installButton) installButton.classList.remove('on');
  });

  if (installButton) installButton.addEventListener('click', async function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installButton.classList.remove('on');
      return;
    }
    showIOSInstructions();
  });

  if (isIOS) showInstallButton();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(function (error) {
        console.warn('Não foi possível registrar o modo instalável do Painel LNB.', error);
      });
    });
  }
}());
