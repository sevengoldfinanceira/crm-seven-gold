const CACHE_VERSION = "seven-gold-vms9w0s41";
const STATIC_ASSETS = [
  "/home.css",
  "/painel.css",
  "/atendimento.css",
  "/permissoes.css",
  "/permissoes.js",
  "/equipe.js",
  "/styles.css",
  "/script.js",
  "/auth.js",
  "/admin-shell.js",
  "/pwa.js",
  "/supabase-config.js",
  "/assets/icons/seven-gold-g7.png",
  "/manifest.json",
  "/atendimento.html"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((r) => r || caches.match("/index.html"))
      )
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const resClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
