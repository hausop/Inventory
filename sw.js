const CACHE_NAME = "warehouse-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./login.html",
  "./admin.html",
  "./css/style.css",
  "./css/responsive.css",
  "./js/config.js",
  "./js/supabase.js",
  "./js/products.js",
  "./js/random.js",
  "./js/app.js",
  "./js/auth.js",
  "./js/admin.js",
  "./assets/icon.svg",
  "./assets/product-placeholder.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
