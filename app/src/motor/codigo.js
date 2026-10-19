// Carga útil de los QR: JSON → deflate crudo → base64url, con prefijo «A1.» (registro II.A) o «B1.» (agente II.B).
// Código corto de respaldo: 6 caracteres que llevan el puntaje de II.B y una suma de control ligada al equipo.
// Espejo: mock_agent/main.py (decodificar) y mock_agent/codigo.py
import pako from 'pako';

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function aBase64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64url(s) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function codificar(prefijo, obj) {
  const json = JSON.stringify(obj);
  return prefijo + '1.' + aBase64url(pako.deflateRaw(new TextEncoder().encode(json), { level: 9 }));
}

export function decodificar(texto) {
  const t = String(texto || '').trim();
  const m = t.match(/^([AB])1\.([A-Za-z0-9_-]+)$/);
  if (!m) throw new Error('formato');
  try {
    const json = new TextDecoder().decode(pako.inflateRaw(deBase64url(m[2])));
    return { tipo: m[1], datos: JSON.parse(json) };
  } catch {
    throw new Error('formato');
  }
}

export function bytesCarga(texto) { return new TextEncoder().encode(texto).length; }

// FNV-1a de 32 bits sobre UTF-8.
export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(s)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export function codigoCorto(equipo, puntaje) {
  const p = Math.max(0, Math.min(40, Math.round(puntaje)));
  const h = fnv1a(equipo.trim().toLowerCase() + '|' + p) & 0xffffff;
  let v = p * 0x1000000 + h;
  let s = '';
  for (let i = 0; i < 6; i++) { s = B32[v % 32] + s; v = Math.floor(v / 32); }
  return s;
}

export function leerCodigoCorto(equipo, codigo) {
  const c = String(codigo || '').trim().toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
  if (!/^[0-9A-HJKMNP-TV-Z]{6}$/.test(c)) return null;
  let v = 0;
  for (const ch of c) v = v * 32 + B32.indexOf(ch);
  const p = Math.floor(v / 0x1000000);
  if (p > 40) return null;
  return codigoCorto(equipo, p) === c ? p : null;
}
