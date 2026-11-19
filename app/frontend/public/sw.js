/* HeartSync Safe PWA Service Worker (v1)
 * Strict non-interference policy:
 *  - Never intercepts non-GET requests
 *  - Never intercepts cross-origin requests (Toss Payments SDK/API, KakaoPay/NaverPay, fonts, CDNs)
 *  - Never intercepts /api/* endpoints or /payment-* callback routes
 *  - Uses Network-First for HTML navigations so latest deployments take effect immediately
 */

const CACHE_NAME = "heartsync-pwa-v1";
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("heartsync-pwa-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Never touch cross-origin traffic (Toss, social auth, CDNs, backend)
  if (url.origin !== self.location.origin) return;

  // Never touch API calls, auth callbacks, payment flows, or admin metrics
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/payment") ||
    url.pathname.startsWith("/admin")
  ) {
    return;
  }

  // HTML Document navigation: Network-First (always serve fresh deployment when online)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && url.pathname === "/") {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/", copy)).catch(() => undefined);
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Hashed build assets & app icons: Stale-While-Revalidate
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response && response.status === 200 && response.type === "basic") {
                cache.put(request, response.clone()).catch(() => undefined);
              }
              return response;
            })
            .catch(() => cached);

          return cached || networkFetch;
        })
      )
    );
  }
});
