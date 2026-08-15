// ============================================================
// Service Worker — Pré-Saison Football Tracker
// Version du cache : incrémenter à chaque mise à jour du HTML
// ============================================================
const CACHE_NAME = 'presaison-v1';

const ASSETS_TO_CACHE = [
  './presaison-football-tracker.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
];

// ── Installation : mise en cache de tous les assets ──────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // On cache les assets locaux en priorité
      // Les CDN externes (Tailwind, Google Fonts) sont best-effort
      return cache.addAll([
        './presaison-football-tracker.html',
        './manifest.json',
      ]).then(() => {
        // Assets externes : on essaie, on ignore les erreurs
        return Promise.allSettled(
          ['https://cdn.tailwindcss.com',
           'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap']
          .map(url => cache.add(url).catch(() => {}))
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activation : nettoyage des anciens caches ─────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : stratégie Cache-First pour les assets locaux ──────
//    Network-First pour tout le reste (YouTube, etc.)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Assets locaux de l'app → Cache First
  const isLocalAsset =
    url.origin === self.location.origin ||
    url.hostname === 'cdn.tailwindcss.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';

  if (isLocalAsset) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // On met en cache les nouvelles réponses valides
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Offline et pas en cache : pour le HTML, on renvoie la page principale
          if (event.request.destination === 'document') {
            return caches.match('./presaison-football-tracker.html');
          }
        });
      })
    );
    return;
  }

  // Ressources externes (YouTube, etc.) → Network Only, pas de cache
  // On laisse passer sans interférer
});
