// Generado por scripts/genera_sw.mjs. No editar a mano.
const CACHE = 'taller-agentes-555c88eac273';
const ARCHIVOS = ["./","./assets/index-BNsRUiH-.js","./assets/index-CUJYkj1D.css","./assets/montserrat-latin-400-normal-CIMKXMQI.woff2","./assets/montserrat-latin-400-normal-Sf4eHQyG.woff","./assets/montserrat-latin-600-normal-CjtsKS3e.woff2","./assets/montserrat-latin-600-normal-CoQZtLyZ.woff","./assets/montserrat-latin-700-normal-BYRy5CoC.woff2","./assets/montserrat-latin-700-normal-DHOpyQza.woff","./assets/montserrat-latin-800-normal-Cp9CdP19.woff2","./assets/montserrat-latin-800-normal-CwdtYla9.woff","./icono.svg","./index.html"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put('./', copia)); return r; })
      .catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
