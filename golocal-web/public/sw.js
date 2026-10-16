const CACHE_NAME = "golocal-offline-v1";
const APP_SHELL = ["/", "/manifest.json", "/golocal-mark.png", "/abbey-lavender.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("golocal-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/_next/webpack-hmr")) return;

  const isBackendRead = url.pathname.startsWith("/api/parvoy/");
  const isNavigation = request.mode === "navigate";
  const isStaticAsset = ["script", "style", "image", "font"].includes(request.destination);
  if (!isBackendRead && !isNavigation && !isStaticAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (isBackendRead || isNavigation) {
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        if (isNavigation && response.ok) await cache.put("/", response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || (isNavigation ? await cache.match("/") : undefined) || Response.error();
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
