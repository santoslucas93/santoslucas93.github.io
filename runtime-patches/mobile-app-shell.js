/* Painel LNB — shell móvel compartilhado. Descobre e aciona a interface original. */
(function () {
  'use strict';
  if (!document.documentElement.matches('[data-lnb-mobile-shell="v4"]') || window.__LNB_MOBILE_APP_V4) return;
  window.__LNB_MOBILE_APP_V4 = true;

  var MODULES = {
    hub: { title: 'Painel LNB', subtitle: 'Central de Gestão', nav: '.hub-card a,.hub-chave.on' },
    colaboradores: { title: 'Colaboradores', subtitle: 'Central de Gestão', nav: null },
    admin: { title: 'Administração Mestre', subtitle: 'Acessos e permissões', nav: '#menu button[data-tela]' },
    beneficios: { title: 'Benefícios', subtitle: 'Gestão de benefícios', nav: '#main-nav .nav-tab[data-tab]' },
    orcado: { title: 'Orçado x Realizado', subtitle: 'Gestão orçamentária', nav: '#nav button[data-v]' },
    rh: { title: 'RH & Folha', subtitle: 'Administração de pessoal', nav: '.sidebar .nav-item[data-view]' }
  };
  var MODULE_LINKS = [
    { id: 'hub', resource: null, href: '/mobile/', icon: '⌂', label: 'Início' },
    { id: 'colaboradores', resources: ['colaboradores', 'beneficios', 'rh', 'admin'], href: '/colaboradores/', icon: '👥', label: 'Colaboradores' },
    { id: 'beneficios', resource: 'beneficios', href: '/beneficios/', icon: '♡', label: 'Benefícios' },
    { id: 'orcado', resource: 'orcamento', href: '/orcado/', icon: '▥', label: 'Orçado x Realizado' },
    { id: 'rh', resource: 'rh', href: '/rh/', icon: '▤', label: 'RH & Folha' },
    { id: 'admin', resource: 'admin', href: '/admin/', icon: '⚙', label: 'Administração' }
  ];
  var moduleId = document.documentElement.dataset.lnbMobileModule || inferModule();
  var config = MODULES[moduleId] || { title: document.title.split(/[·|—-]/)[0].trim() || 'Painel LNB', subtitle: 'Módulo LNB', nav: 'nav a,nav button' };
  var state = { mode: 'navigation', query: '', observerTimer: 0, homeSignature: '' };
  var ui = {};

  function inferModule() {
    var first = location.pathname.split('/').filter(Boolean)[0];
    return first === 'mobile' || !first ? 'hub' : first;
  }
  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  }
  function leadingIcon(value) {
    var text = String(value || '').trim();
    var match = text.match(/^(\p{Extended_Pictographic}|[⌂◈▤▥◆◇✓↔⌘⇧≡＋⤓📈])/u);
    return match ? match[0] : '›';
  }
  function isUsable(element) {
    if (!element || element.closest('.lnb-mobile-drawer,.lnb-mobile-bottomnav,.lnb-mobile-appbar')) return false;
    if (element.hidden || element.disabled || element.getAttribute('aria-hidden') === 'true' || element.closest('[hidden]')) return false;
    if (element.classList.contains('mode-hidden') || element.classList.contains('lnb-hide')) return false;
    return true;
  }
  function activeElement(element) {
    return element.classList.contains('active') || element.classList.contains('on') || element.getAttribute('aria-current') === 'page' || element.getAttribute('aria-selected') === 'true';
  }
  function currentBenefitsMode() {
    var match = document.body.className.match(/benefit-mode-(vr|vt|med|prud|mob)/);
    return match ? match[1] : null;
  }
  function navElements() {
    if (!config.nav) return [];
    var items = Array.prototype.slice.call(document.querySelectorAll(config.nav)).filter(isUsable);
    if (moduleId === 'beneficios') {
      var mode = currentBenefitsMode();
      if (mode) items = items.filter(function (item) { return item.classList.contains('benefit-' + mode); });
      var home = document.getElementById('benefit-home');
      if (!mode && home && !home.hidden && !home.classList.contains('mode-hidden')) {
        Array.prototype.slice.call(home.querySelectorAll('.benefit-choice-card')).filter(isUsable).forEach(function (item) { items.unshift(item); });
      }
    }
    return uniqueElements(items);
  }
  function actionElements() {
    var selectors = {
      colaboradores: '.barra-filtros button,.barra-flutuante button',
      admin: 'aside .rapidas button,main .tit button,main .rodape button',
      beneficios: '.tab-content.active button,.tab-content:not([style*="display: none"]) .btn-primary,.tab-content:not([style*="display: none"]) .btn-green',
      orcado: '.wrap button.act,.wrap .toolbar button,.wrap .actions button',
      rh: '.page.active .head-actions button,.page.active .button.primary,.page.active .button.secondary,.page.active .panel-head button'
    };
    var selector = selectors[moduleId] || 'main button';
    return uniqueElements(Array.prototype.slice.call(document.querySelectorAll(selector)).filter(function (item) {
      return isUsable(item) && cleanText(item.textContent || item.getAttribute('aria-label')).length > 1;
    })).slice(0, 24);
  }
  function uniqueElements(items) {
    var seen = new Set();
    return items.filter(function (item) { if (seen.has(item)) return false; seen.add(item); return true; });
  }
  function parseAccess() {
    try {
      var snapshot = JSON.parse(localStorage.getItem('lnb_access_snapshot_v1') || 'null');
      return snapshot && snapshot.access || null;
    } catch (error) { return null; }
  }
  function moduleAllowed(item) {
    if (!item.resource && !item.resources) return true;
    var access = parseAccess();
    if (!access) return true;
    if (access.acesso_total || access.permissoes === '*') return true;
    var permissions = access.permissoes || {};
    var resources = item.resources || [item.resource];
    return resources.some(function (resource) {
      var actions = permissions[resource] || [];
      if (resource === 'admin') return Array.isArray(actions) && (actions.indexOf('administrar') >= 0 || actions.indexOf('visualizar') >= 0);
      return Array.isArray(actions) && actions.indexOf('visualizar') >= 0;
    });
  }
  function pageTitle() {
    var candidates = moduleId === 'rh' ? '.page.active .page-head h1' : moduleId === 'admin' ? '#tela .tit h2,#tela h2' : moduleId === 'beneficios' ? '.tab-content.active h1,.tab-content.active .card-title' : moduleId === 'orcado' ? '[id^="v-"]:not([style*="display:none"]) h1,[id^="v-"]:not([style*="display:none"]) h2' : 'main h1,main h2';
    var node = document.querySelector(candidates);
    return cleanText(node && node.textContent) || config.subtitle;
  }
  function makeButton(icon, label, action, current) {
    var button = document.createElement('button');
    button.type = 'button';
    if (current) button.className = 'is-current';
    button.setAttribute('aria-label', label);
    button.innerHTML = '<span class="lnb-mobile-nav-icon" aria-hidden="true">' + icon + '</span><span>' + label + '</span>';
    button.addEventListener('click', action);
    return button;
  }
  function buildShell() {
    document.body.classList.add('lnb-mobile-app');
    var bar = document.createElement('header');
    bar.className = 'lnb-mobile-appbar';
    bar.setAttribute('aria-label', 'Cabeçalho do aplicativo');
    bar.innerHTML = '<a href="/mobile/" aria-label="Voltar ao Painel LNB">‹</a>' +
      '<div class="lnb-mobile-appbar-copy"><strong></strong><small></small></div>' +
      '<button type="button" aria-label="Abrir menu">☰</button>';
    document.body.appendChild(bar);
    ui.bar = bar;
    ui.title = bar.querySelector('strong');
    ui.subtitle = bar.querySelector('small');
    bar.querySelector('button').addEventListener('click', function () { openDrawer('modules'); });

    var bottom = document.createElement('nav');
    bottom.className = 'lnb-mobile-bottomnav';
    bottom.setAttribute('aria-label', 'Navegação principal do aplicativo');
    var home = document.createElement('a');
    home.href = '/mobile/'; home.className = moduleId === 'hub' ? 'is-current' : '';
    home.innerHTML = '<span class="lnb-mobile-nav-icon" aria-hidden="true">⌂</span><span>Início</span>';
    bottom.appendChild(home);
    bottom.appendChild(makeButton('▦', 'Visões', function () { openDrawer('navigation'); }, moduleId !== 'hub'));
    bottom.appendChild(makeButton('⌕', 'Buscar', function () { openDrawer('search'); }));
    ui.aiButton = makeButton('✦', 'IA', openAi);
    bottom.appendChild(ui.aiButton);
    bottom.appendChild(makeButton('☰', 'Módulos', function () { openDrawer('modules'); }));
    document.body.appendChild(bottom);
    ui.bottom = bottom;

    var backdrop = document.createElement('div');
    backdrop.className = 'lnb-mobile-backdrop'; backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', closeDrawer); document.body.appendChild(backdrop); ui.backdrop = backdrop;
    var drawer = document.createElement('section');
    drawer.className = 'lnb-mobile-drawer'; drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-label', 'Menu móvel');
    drawer.innerHTML = '<div class="lnb-mobile-grabber"></div><div class="lnb-mobile-drawer-head"><div><strong></strong><small></small></div><button class="lnb-mobile-close" type="button" aria-label="Fechar">×</button></div><input class="lnb-mobile-search" type="search" placeholder="Buscar uma função…" aria-label="Buscar uma função"><div class="lnb-mobile-drawer-list"></div>';
    drawer.querySelector('.lnb-mobile-close').addEventListener('click', closeDrawer);
    drawer.querySelector('.lnb-mobile-search').addEventListener('input', function () { state.query = this.value; renderDrawer(); });
    document.body.appendChild(drawer); ui.drawer = drawer; ui.drawerTitle = drawer.querySelector('strong'); ui.drawerSubtitle = drawer.querySelector('small'); ui.search = drawer.querySelector('input'); ui.list = drawer.querySelector('.lnb-mobile-drawer-list');
    syncShell();
  }
  function homeModules() {
    var definitions = [
      { id: 'orcado', source: '#hub-card-orcamento', href: '/orcado/', icon: '▥', title: 'Orçado x Realizado', subtitle: 'Planejamento e acompanhamento financeiro' },
      { id: 'beneficios', source: '#hub-card-beneficios', href: '/beneficios/', icon: '♡', title: 'Gestão de Benefícios', subtitle: 'Benefícios e custos dos colaboradores' },
      { id: 'rh', source: '#hub-card-rh', href: '/rh/', icon: '▤', title: 'RH & Folha', subtitle: 'Pessoas, folha, encargos e histórico' },
      { id: 'colaboradores', source: '#hub-icon-colaboradores', href: '/colaboradores/', icon: '👥', title: 'Central de Colaboradores', subtitle: 'Cadastro mestre e visão individual' },
      { id: 'admin', source: '#hub-chave', href: '/admin/', icon: '⚙', title: 'Administração', subtitle: 'Acessos, perfis e permissões' }
    ];
    return definitions.filter(function (item) {
      var source = document.querySelector(item.source);
      if (!source) return false;
      if (item.id === 'colaboradores' || item.id === 'admin') return source.classList.contains('on');
      return !source.hidden;
    });
  }
  function renderMobileHome() {
    if (moduleId !== 'hub') return;
    var shell = document.getElementById('hub-shell');
    if (!shell || shell.style.display === 'none') return;
    var modules = homeModules();
    var who = cleanText((document.getElementById('hub-who') || {}).textContent);
    var signature = who + '|' + modules.map(function (item) { return item.id; }).join(',');
    if (state.homeSignature === signature && document.querySelector('.lnb-mobile-home')) return;
    state.homeSignature = signature;
    var home = document.querySelector('.lnb-mobile-home') || document.createElement('main');
    home.className = 'lnb-mobile-home';
    home.innerHTML = '<section class="lnb-mobile-home-intro"><img src="/rh/lnb-logo.png" alt="Liga Nacional de Basquete"><div><small>Central de Gestão</small><h1>Olá' + (who ? ', ' + who.split(' ')[0] : '') + '</h1><p>Dados financeiros e de pessoas em um só lugar.</p></div></section>' +
      '<section class="lnb-mobile-home-section"><div class="lnb-mobile-section-title"><div><small>Seu espaço de trabalho</small><h2>Módulos</h2></div><span>' + modules.length + ' disponíveis</span></div><div class="lnb-mobile-home-modules"></div></section>' +
      '<section class="lnb-mobile-home-section"><div class="lnb-mobile-section-title"><div><small>Preferências</small><h2>Ações rápidas</h2></div></div><div class="lnb-mobile-quick-actions"></div></section>';
    var list = home.querySelector('.lnb-mobile-home-modules');
    modules.forEach(function (item) {
      var link = document.createElement('a'); link.href = item.href; link.className = 'lnb-mobile-module-row';
      link.innerHTML = '<span class="lnb-mobile-module-icon ' + item.id + '">' + item.icon + '</span><span class="lnb-mobile-module-copy"><strong>' + item.title + '</strong><small>' + item.subtitle + '</small></span><span class="lnb-mobile-chevron">›</span>';
      list.appendChild(link);
    });
    if (!modules.length) list.innerHTML = '<div class="lnb-mobile-home-empty">Nenhum módulo foi liberado para este perfil.</div>';
    var actions = [
      { source: '#hub-install', icon: '⇩', label: 'Instalar app' },
      { source: '#hub-theme-toggle', icon: '◐', label: 'Aparência' },
      { source: '#hub-password', icon: '⌘', label: 'Senha' },
      { source: '#hub-logout', icon: '↗', label: 'Sair' }
    ];
    var quick = home.querySelector('.lnb-mobile-quick-actions');
    actions.forEach(function (action) {
      var original = document.querySelector(action.source);
      if (!original || getComputedStyle(original).display === 'none') return;
      var button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span>' + action.icon + '</span><small>' + action.label + '</small>';
      button.addEventListener('click', function () { original.click(); }); quick.appendChild(button);
    });
    if (!home.isConnected) shell.appendChild(home);
    document.body.classList.add('lnb-mobile-home-ready');
  }
  function findAi() {
    var candidates = ['#ia-toggle', '#ai-launch', '#lnb-ai-fab', '.ia-launch', '[aria-label*="Chat IA"]', '[aria-label*="IA"]'];
    for (var i = 0; i < candidates.length; i += 1) {
      var node = document.querySelector(candidates[i]);
      if (node && !node.closest('.lnb-mobile-bottomnav,.lnb-mobile-appbar,.lnb-mobile-drawer')) return node;
    }
    return null;
  }
  function openAi() {
    var original = findAi();
    if (original) original.click();
    else openDrawer('actions');
  }
  function openDrawer(mode) {
    state.mode = mode; state.query = '';
    ui.search.value = '';
    ui.search.placeholder = mode === 'modules' ? 'Buscar um módulo…' : mode === 'actions' ? 'Buscar uma ação…' : 'Buscar uma função…';
    renderDrawer();
    document.body.classList.add('lnb-mobile-lock'); ui.drawer.classList.add('is-open'); ui.backdrop.classList.add('is-open');
    if (mode === 'search') setTimeout(function () { ui.search.focus(); }, 220);
  }
  function closeDrawer() {
    document.body.classList.remove('lnb-mobile-lock'); ui.drawer.classList.remove('is-open'); ui.backdrop.classList.remove('is-open');
  }
  function itemRecord(element) {
    var titleNode = element.querySelector && element.querySelector('[data-lnb-mobile-label],.benefit-choice-title,.module-card-title,h1,h2,h3,h4');
    var raw = cleanText(element.getAttribute('aria-label') || element.title || (titleNode && titleNode.textContent) || element.textContent);
    if (raw.length > 72) raw = raw.slice(0, 69).replace(/\s+\S*$/, '') + '…';
    return { label: raw || 'Abrir', icon: leadingIcon(element.textContent || ''), active: activeElement(element), element: element };
  }
  function renderDrawer() {
    var records;
    if (state.mode === 'modules') {
      ui.drawerTitle.textContent = 'Módulos'; ui.drawerSubtitle.textContent = 'Somente os acessos liberados para seu perfil';
      records = MODULE_LINKS.filter(moduleAllowed).map(function (item) { return { label: item.label, icon: item.icon, active: item.id === moduleId, href: item.href }; });
    } else if (state.mode === 'actions') {
      ui.drawerTitle.textContent = 'Ações'; ui.drawerSubtitle.textContent = 'Atalhos da tela atual'; records = actionElements().map(itemRecord);
    } else {
      ui.drawerTitle.textContent = state.mode === 'search' ? 'Buscar' : 'Visões de ' + config.title;
      ui.drawerSubtitle.textContent = state.mode === 'search' ? 'Digite o nome da função que procura' : 'Todas as funções do módulo';
      records = navElements().map(itemRecord);
      if (!records.length && moduleId === 'colaboradores') records = actionElements().map(itemRecord);
    }
    var query = cleanText(state.query).toLocaleLowerCase('pt-BR');
    if (query) records = records.filter(function (record) { return record.label.toLocaleLowerCase('pt-BR').indexOf(query) >= 0; });
    ui.list.replaceChildren();
    if (!records.length) {
      var empty = document.createElement('div'); empty.className = 'lnb-mobile-menu-empty'; empty.textContent = query ? 'Nenhuma função encontrada.' : 'Nenhuma função disponível nesta tela.'; ui.list.appendChild(empty); return;
    }
    records.forEach(function (record) {
      var item = document.createElement(record.href ? 'a' : 'button');
      if (record.href) item.href = record.href; else item.type = 'button';
      item.className = 'lnb-mobile-menu-item' + (record.active ? ' is-active' : '');
      item.innerHTML = '<span class="lnb-mobile-item-icon" aria-hidden="true">' + record.icon + '</span><span>' + record.label + '</span>';
      if (record.element) item.addEventListener('click', function () {
        closeDrawer(); record.element.click(); setTimeout(syncAll, 100); setTimeout(syncAll, 500);
      });
      ui.list.appendChild(item);
    });
  }
  function tableHeaders(table) {
    var rows = Array.prototype.slice.call(table.querySelectorAll('thead tr'));
    if (!rows.length) return [];
    var bodyRow = table.querySelector('tbody tr');
    var count = bodyRow ? bodyRow.children.length : 0;
    var chosen = rows[rows.length - 1];
    rows.some(function (row) { if (count && row.children.length === count) { chosen = row; return true; } return false; });
    return Array.prototype.slice.call(chosen.querySelectorAll('th,td')).map(function (header) { return cleanText(header.textContent); });
  }
  function tablePolicy(table, headers) {
    if (headers.length && table.querySelector('tbody tr,tfoot tr')) return 'cards';
    return 'plain';
  }
  function forceCardLayout(table, headers) {
    table.style.setProperty('display', 'block', 'important');
    table.style.setProperty('width', '100%', 'important');
    table.style.setProperty('min-width', '0', 'important');
    table.style.setProperty('table-layout', 'auto', 'important');
    Array.prototype.slice.call(table.querySelectorAll('colgroup')).forEach(function (group) { group.style.setProperty('display', 'none', 'important'); });
    var head = table.querySelector('thead'); if (head) head.style.setProperty('display', 'none', 'important');
    Array.prototype.slice.call(table.querySelectorAll('tbody,tfoot')).forEach(function (section) {
      section.style.setProperty('display', 'grid', 'important'); section.style.setProperty('width', '100%', 'important');
    });
    Array.prototype.slice.call(table.querySelectorAll('tbody tr,tfoot tr')).forEach(function (row) {
      row.style.setProperty('display', 'block', 'important'); row.style.setProperty('width', '100%', 'important'); row.style.removeProperty('grid-template-columns');
      Array.prototype.slice.call(row.children).forEach(function (cell, index) {
        if (cell.tagName !== 'TD' && cell.tagName !== 'TH') return;
        var label = headers[index] || (index === 0 ? 'Item' : 'Informação');
        cell.dataset.lnbLabel = label;
        var hasNestedTable = !!cell.querySelector('table, .table-scroll, .table-wrap');
        cell.style.setProperty('display', 'grid', 'important');
        cell.style.setProperty('grid-template-columns', hasNestedTable ? '1fr' : 'minmax(92px,38%) minmax(0,1fr)', 'important');
        cell.style.setProperty('width', '100%', 'important'); cell.style.setProperty('min-width', '0', 'important');
        cell.style.setProperty('white-space', 'normal', 'important'); cell.style.setProperty('overflow-wrap', 'break-word', 'important'); cell.style.setProperty('word-break', 'normal', 'important');
        cell.style.setProperty('text-align', hasNestedTable ? 'left' : 'right', 'important');
      });
    });
  }
  function labelTables(root) {
    Array.prototype.slice.call((root || document).querySelectorAll('table')).forEach(function (table) {
      if (table.closest('.lnb-mobile-drawer') || table.dataset.lnbMobileTable === 'skip' || table.getAttribute('role') === 'presentation') return;
      var headers = tableHeaders(table);
      var wrap = table.parentElement;
      var policy = tablePolicy(table, headers);
      if (wrap) {
        wrap.classList.toggle('lnb-mobile-table-cards', policy === 'cards');
        wrap.classList.remove('lnb-mobile-table-scroll');
        wrap.classList.toggle('lnb-mobile-table-plain', policy === 'plain');
        wrap.dataset.lnbMobileColumns = String(headers.length);
      }
      if (policy === 'cards') forceCardLayout(table, headers);
    });
  }
  function adaptRhCompositionGrids() {
    if (moduleId !== 'rh') return;
    Array.prototype.slice.call(document.querySelectorAll('.rh-comp-table')).forEach(function (grid) {
      grid.style.setProperty('display', 'grid', 'important'); grid.style.setProperty('width', '100%', 'important'); grid.style.setProperty('overflow-x', 'hidden', 'important');
      var header = grid.querySelector('.rh-comp-header'); if (header) header.remove();
      Array.prototype.slice.call(grid.querySelectorAll('.rh-comp-row:not(.rh-comp-header)')).forEach(function (row) {
        row.style.setProperty('display', 'block', 'important'); row.style.setProperty('grid-template-columns', '1fr', 'important'); row.style.setProperty('width', '100%', 'important'); row.style.setProperty('padding', '6px 0', 'important');
        Array.prototype.slice.call(row.children).forEach(function (cell) {
          cell.style.setProperty('display', 'grid', 'important'); cell.style.setProperty('grid-template-columns', 'minmax(105px,42%) minmax(0,1fr)', 'important');
          cell.style.setProperty('gap', '9px', 'important'); cell.style.setProperty('width', '100%', 'important'); cell.style.setProperty('min-width', '0', 'important');
          cell.style.setProperty('padding', '7px 10px', 'important'); cell.style.setProperty('white-space', 'normal', 'important'); cell.style.setProperty('overflow-wrap', 'break-word', 'important'); cell.style.setProperty('word-break', 'normal', 'important'); cell.style.setProperty('text-align', 'right', 'important');
        });
      });
    });
    Array.prototype.slice.call(document.querySelectorAll('.modal:not([hidden]),#rh-detail-modal:not([hidden])')).forEach(function (modal) {
      var card = modal.querySelector('.modal-card,.rh-detail-card');
      if (!card) return;
      card.style.setProperty('width', '100%', 'important'); card.style.setProperty('max-width', '100%', 'important'); card.style.setProperty('min-width', '0', 'important'); card.style.setProperty('height', 'auto', 'important'); card.style.setProperty('max-height', '100%', 'important');
    });
  }
  function adaptCharts() {
    if (moduleId !== 'orcado') return;
    Array.prototype.slice.call(document.querySelectorAll('.chart-svg')).forEach(function (svg) {
      var host = svg.parentElement; if (!host || host.querySelector(':scope > .lnb-mobile-chart-list')) return;
      var marks = Array.prototype.slice.call(svg.querySelectorAll('[data-clickable="1"]')).filter(function (mark) { return mark.querySelector('title'); });
      if (!marks.length) { svg.classList.add('lnb-mobile-chart-fit'); return; }
      var records = marks.map(function (mark) {
        var title = Array.prototype.slice.call(mark.querySelectorAll('title')).map(function (node) { return cleanText(node.textContent); }).filter(Boolean).join(' / ');
        var label = cleanText(mark.dataset.label) || title.split('·')[0].trim();
        var values = title.match(/R\$\s*[\d.]+(?:,\d{2})?/g) || [];
        var numeric = values.reduce(function (max, value) { return Math.max(max, Number(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0); }, 0);
        return { mark: mark, title: title, label: label, detail: title.replace(label, '').replace(/^\s*·\s*/, ''), value: numeric };
      });
      var max = Math.max.apply(Math, records.map(function (record) { return record.value; }).concat([1]));
      var list = document.createElement('div'); list.className = 'lnb-mobile-chart-list';
      records.forEach(function (record) {
        var button = document.createElement('button'); button.type = 'button'; button.style.setProperty('--lnb-chart-pct', Math.max(3, record.value / max * 100) + '%');
        button.innerHTML = '<span><strong>' + record.label + '</strong><small>' + (record.detail || 'Toque para detalhar') + '</small><i></i></span><b>›</b>';
        button.addEventListener('click', function () { record.mark.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); list.appendChild(button);
      });
      host.appendChild(list); svg.classList.add('lnb-mobile-chart-source');
    });
  }
  function syncShell() {
    if (!ui.title) return;
    ui.title.textContent = config.title;
    ui.subtitle.textContent = pageTitle();
    var ai = findAi();
    ui.aiButton.hidden = !ai;
    ui.aiButton.disabled = !ai;
  }
  function keepMobileStylesLast() {
    var link = document.querySelector('link[data-lnb-mobile-shell="v4"]');
    if (link && link.parentNode === document.head && document.head.lastElementChild !== link) document.head.appendChild(link);
  }
  function syncAll() { labelTables(document); adaptRhCompositionGrids(); adaptCharts(); renderMobileHome(); syncShell(); keepMobileStylesLast(); if (ui.drawer && ui.drawer.classList.contains('is-open')) renderDrawer(); }
  function observe() {
    var options = { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-selected', 'aria-current', 'style'] };
    var observer = new MutationObserver(function (mutations) {
      var useful = mutations.some(function (mutation) { return !mutation.target.closest || !mutation.target.closest('.lnb-mobile-appbar,.lnb-mobile-bottomnav,.lnb-mobile-drawer'); });
      if (!useful) return;
      clearTimeout(state.observerTimer); state.observerTimer = setTimeout(function () {
        observer.disconnect();
        syncAll();
        observer.observe(document.body, options);
      }, 120);
    });
    observer.observe(document.body, options);
  }
  var rhWatchTimer = null, rhWatchTicks = 0;
  function watchRhComposition() {
    if (moduleId !== 'rh') return;
    clearInterval(rhWatchTimer);
    rhWatchTicks = 0;
    rhWatchTimer = setInterval(function () {
      rhWatchTicks += 1;
      if (!document.querySelector('.rh-comp-header')) { clearInterval(rhWatchTimer); return; }
      adaptRhCompositionGrids();
      if (rhWatchTicks >= 12) clearInterval(rhWatchTimer);
    }, 400);
  }
  function start() { buildShell(); syncAll(); observe(); document.addEventListener('click', function () { setTimeout(syncAll, 20); setTimeout(syncAll, 300); watchRhComposition(); }, true); document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeDrawer(); }); setTimeout(syncAll, 800); setTimeout(syncAll, 2200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
