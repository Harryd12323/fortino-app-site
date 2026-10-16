// Service worker: makes the app installable and lets it open offline.
// It caches only the app's own files. Supabase requests (sign-in and test-account sync) go to another origin, so
// they pass straight through and are never cached. TODO(HIPAA): keep it that way for any patient-data API.
// Bump VERSION whenever any app file changes, so phones pick up the new version.
const VERSION = "fortino-v9";
const SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./manifest.json",
  "./supabase-config.js", "./vendor/supabase.js",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png",
  "./images/article-beach-walk.jpg",
  "./images/article-calm-beach.jpg",
  "./images/article-consult.jpg",
  "./images/article-ocean.jpg",
  "./images/article-protein.jpg",
  "./images/article-walking.jpg",
  "./images/dr-fortino.jpg",
  "./images/food-bowl.jpg",
  "./images/home-coast.jpg",
  "./images/logo.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pages: network first (fresh when online), cached copy when offline. Other files: cache first.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
