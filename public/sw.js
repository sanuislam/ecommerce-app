// Eid Bazar service worker — minimal offline shell + runtime cache.
// Cache versioning ensures old caches are evicted on each deploy.
const CACHE_VERSION = "eidbazar-v1";
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

const OFFLINE_URL = "/offline";
const PRECACHE_URLS = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never intercept admin, API, auth, or studio routes.
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/studio") ||
    url.pathname.startsWith("/_next/data") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/sign-up")
  ) {
    return;
  }

  // HTML navigations: network-first with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME);
          cache.put(req, fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return (
            offline ??
            new Response("Offline", {
              status: 503,
              headers: { "content-type": "text/plain" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Static assets (Next chunks, images, fonts): stale-while-revalidate.
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/payments/") ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|css|js)$/i.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone()).catch(() => undefined);
            return res;
          })
          .catch(() => cached);
        return cached ?? (await fetchPromise);
      })(),
    );
  }
});
