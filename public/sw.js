const CACHE_NAME = "sitescout-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg"
];

// Install Event - cache core static resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell assets");
      return cache.addAll(ASSETS).catch((err) => {
        console.warn("[Service Worker] Failed to cache assets during install:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network first with Cache fallback for stability and fresh API data
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Strictly skip caching for all /api requests, other origins, or non-GET requests
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api") ||
    !url.origin.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache newly fetched valid asset files
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If HTML page request failed, return index.html shell
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/");
          }
        });
      })
  );
});
