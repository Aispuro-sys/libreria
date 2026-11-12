/* Biblioteca PWA — Service Worker
 * - Precache: shell básico.
 * - Runtime: same-origin GET → network-first con fallback a caché
 *   (los assets de Vite se van cacheando al usarse).
 * - /libros/*.pdf → cache-first (los libros se guardan bajo demanda
 *   desde la app con el botón de descarga).
 */
const SHELL_CACHE = "biblio-shell-v1";
const BOOKS_CACHE = "biblio-books-v1";
const RUNTIME_CACHE = "biblio-runtime-v1";

const SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, BOOKS_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  // Libros PDF: cache-first (solo responden offline los descargados explícitamente)
  if (request.url.includes("/libros/")) {
    e.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            // No guardar automáticamente: el usuario elige qué descargar
            return res;
          })
      )
    );
    return;
  }

  // Resto: network-first, fallback a caché; navegación → index.html
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        if (request.mode === "navigate") {
          return (await caches.match("/index.html")) || (await caches.match("/"));
        }
        return Response.error();
      })
  );
});
