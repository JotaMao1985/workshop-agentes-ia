// Escribe dist/sw.js con la lista de archivos del build para que la app funcione sin conexión
// una vez abierta (requisito P1: la II.B no puede depender de la red del salón).
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const archivos = [];
(function recorrer(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) recorrer(p);
    else if (f !== 'sw.js') archivos.push(relative(dist, p));
  }
})(dist);
archivos.sort();
const hash = createHash('sha256');
for (const f of archivos) hash.update(f).update(readFileSync(join(dist, f)));
const version = hash.digest('hex').slice(0, 12);
const lista = ['./', ...archivos.map(f => './' + f)];
const sw = `// Generado por scripts/genera_sw.mjs. No editar a mano.
const CACHE = 'taller-agentes-${version}';
const ARCHIVOS = ${JSON.stringify(lista)};
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
`;
writeFileSync(join(dist, 'sw.js'), sw);
console.log('sw.js:', lista.length, 'archivos en caché, versión', version);
