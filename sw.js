// Couleur PWA Service Worker
const CACHE_NAME = 'couleur-v3';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon_192.png',
  './icon_512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // キャッシュ可能なものだけキャッシュ（CORS制限のあるものはスキップ）
      return Promise.allSettled(
        URLS_TO_CACHE.map(url =>
          cache.add(url).catch(e => console.log('Cache skip:', url, e.message))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // chrome-extension: 等、http/https以外のリクエストはキャッシュ不可なのでそのまま素通りさせる
  if (!event.request.url.startsWith('http')) {
    return;
  }
  event.respondWith(
    fetch(event.request).then(response => {
      // オンライン時：常に最新を取得し、キャッシュも更新する（次回オフライン時用）
      if (response && response.status === 200 && response.type !== 'opaque') {
        const toCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, toCache))
          .catch(e => console.log('Cache put skip:', event.request.url, e.message));
      }
      return response;
    }).catch(() => {
      // オフライン時：キャッシュがあれば返す
      return caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
