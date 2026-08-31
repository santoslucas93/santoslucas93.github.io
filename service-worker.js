'use strict';

const CACHE_NAME = 'painel-lnb-shell-v1';
const SAFE_ASSETS = [
  '/offline.html',
  '/icons/painel-lnb-192.png',
  '/icons/painel-lnb-512.png',
  '/icons/painel-lnb-maskable-512.png',
  '/rh/lnb-logo.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(SAFE_ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE_NAME; }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(function () { return caches.match('/offline.html'); }));
    return;
  }

  if (SAFE_ASSETS.indexOf(url.pathname) >= 0) {
    event.respondWith(caches.match(request).then(function (cached) {
      return cached || fetch(request);
    }));
  }
});
