// focus terminal: network first, so the hosted copy is never stale while
// online, and the cached copy opens it with no network at all.
// bump CACHE when the file list changes.
const CACHE = "focus-terminal-v3";
const ASSETS = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  // no catch: if caching fails the worker doesn't install, and the footer
  // keeps saying "caching" instead of claiming "ready"
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  /* Only this app's caches: every app on talon270.github.io shares one CacheStorage, and deleting the rest took their offline copies with it. */
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("focus-terminal-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
