/* ============================================================
   Smart City Expo 2026 — service worker
   Millora progressiva: després d'una primera càrrega correcta,
   l'aplicació (shell + catàleg; preferits i assistència ja viuen a
   localStorage) ha de funcionar sense connexió.
   ============================================================ */

// IMPORTANT: puja aquest número cada vegada que es toqui sw.js O es vulgui
// forçar que tothom rebi l'última versió del shell de seguida — un
// CACHE_NAME que no canvia mai fa que el navegador no detecti que hi ha
// service worker nou per instal·lar.
const CACHE_NAME = "sce-shell-v2";

const SHELL_FILES = [
  "./",
  "index.html",
  "ara.html",
  "fitxa.html",
  "ponents.html",
  "manifest.json",
  "js/config.js",
  "js/ara.js",
  "js/explora.js",
  "js/fitxa.js",
  "js/navmenu.js",
  "js/fontsize.js",
  "js/planmode.js",
  "js/backup.js",
  "js/ponents.js",
  "js/modules/storage.js",
  "js/modules/data.js",
  "js/modules/status.js",
  "js/modules/state.js",
  "js/modules/ui.js",
  "assets/css/tokens.css",
  "assets/css/skins/skin-neutra.css",
  "assets/css/base.css",
  "assets/css/layout.css",
  "assets/css/router.js",
  "assets/css/components/card.css",
  "assets/css/components/badge.css",
  "assets/css/components/alert.css",
  "assets/css/components/status.css",
  "assets/css/components/button.css",
  "assets/css/components/empty.css",
  "assets/css/components/spinner.css",
  "assets/css/components/input.css",
  "assets/css/components/modal.css",
  "assets/css/components/modal.js",
  "assets/css/components/tabbar.css",
  "assets/css/components/tabbar.js",
  "assets/css/app.css",
  "assets/fontawesome/css/all.min.css",
  "assets/icons/icon.svg",
  "data/tracks.json",
  "data/venues.json",
  "data/events.json",
  "data/coverage.json"
];

// Codi propi (HTML/CSS/JS de l'app, en desenvolupament actiu): xarxa
// primer, perquè els canvis es vegin de seguida — la memòria cau només
// és la xarxa de seguretat per quan no hi ha connexió. Els fitxers de
// tercers vendoritzats (Font Awesome) pràcticament no canvien un cop
// publicats: cau primer, estalvia dades i van més ràpid.
function isAppCode(url) {
  return /\.(html|css|js)(\?|$)/.test(url) && !/\/fontawesome\//.test(url);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return; // només recursos propis

  const isDataFile = request.url.includes("/data/");

  if (isDataFile || isAppCode(request.url)) {
    // Xarxa primer (dades i codi propi sempre frescos quan hi ha
    // connexió); si falla, la còpia desada — així funciona sense
    // connexió sense quedar-se mai amb una versió vella pel mig.
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Fitxers de tercers vendoritzats: memòria cau primer.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
