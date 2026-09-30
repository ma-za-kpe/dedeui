// Public offline notice only. Never cache API responses, conversations or recordings.
const CACHE = "dede-public-v2";
const offlineURL = new URL('./offline.html', self.location.href).href;
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([offlineURL]))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("dede-public-") && key !== CACHE).map(key => caches.delete(key))))); });
self.addEventListener("fetch", event => { if (event.request.mode === "navigate" && event.request.method === "GET" && event.request.url.startsWith(self.registration.scope)) event.respondWith(fetch(event.request).catch(() => caches.match(offlineURL))); });
