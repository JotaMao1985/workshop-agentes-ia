// Marcador del facilitador: suma, orden y desempate. II.B se recalcula siempre desde la configuración.
import { puntajeIIB } from './puntaje.js';
import { sanearConfig } from './config.js';
import { normalizar } from './texto.js';
import { sanearRegistro } from './registro.js';

// Prefijo «eq:» para que ningún nombre («constructor», «toString»…) choque con Object.prototype.
export function claveEquipo(nombre) { return 'eq:' + normalizar(nombre); }

// Recupera un equipo existente o crea uno nuevo, sin leer propiedades heredadas.
export function equipoDe(equipos, nombre) {
  const k = claveEquipo(nombre);
  return Object.prototype.hasOwnProperty.call(equipos, k) ? equipos[k] : equipoVacio(nombre);
}

const numOVacio = (x, max) => (Number.isFinite(x) ? Math.max(0, Math.min(max, Math.round(x))) : null);

// Sanea lo que viene de localStorage o de un respaldo JSON: forma fija, sin campos raros.
export function sanearEquipos(x) {
  const out = {};
  if (!x || typeof x !== 'object' || Array.isArray(x)) return out;
  for (const v of Object.values(x)) {
    if (!v || typeof v !== 'object' || typeof v.nombre !== 'string' || !v.nombre.trim()) continue;
    const e = equipoVacio(v.nombre.slice(0, 30));
    e.retos = [0, 1, 2, 3, 4].map(i => numOVacio(Array.isArray(v.retos) ? v.retos[i] : null, 6));
    e.rubrica = [0, 1, 2, 3, 4, 5].map(i => numOVacio(Array.isArray(v.rubrica) ? v.rubrica[i] : null, 5));
    e.registro = v.registro && typeof v.registro === 'object' ? sanearRegistro(v.registro) : null;
    e.config = v.config && typeof v.config === 'object' ? sanearConfig(v.config) : null;
    e.iibManual = numOVacio(v.iibManual, 40);
    out[claveEquipo(e.nombre)] = e;
  }
  return out;
}

export function equipoVacio(nombre) {
  return { nombre: String(nombre || '').trim(), retos: [null, null, null, null, null], registro: null, rubrica: [null, null, null, null, null, null], config: null, iibManual: null };
}

const suma = xs => xs.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);

export function filaMarcador(e) {
  const parteI = suma(e.retos);
  const iia = suma(e.rubrica);
  const iib = e.config ? puntajeIIB(e.config).total : (Number.isFinite(e.iibManual) ? e.iibManual : 0);
  return { nombre: e.nombre, parteI, iia, iib, r5: Number.isFinite(e.retos[4]) ? e.retos[4] : 0, total: parteI + iia + iib, iibFuente: e.config ? 'qr' : (Number.isFinite(e.iibManual) ? 'codigo' : 'nada') };
}

// Orden: total, luego II.B, luego II.A, luego Reto 5. Si aun así empatan, se marca para la pregunta relámpago.
export function ranking(equipos) {
  const filas = Object.values(equipos).map(filaMarcador);
  const cmp = (a, b) => b.total - a.total || b.iib - a.iib || b.iia - a.iia || b.r5 - a.r5;
  filas.sort((a, b) => cmp(a, b) || a.nombre.localeCompare(b.nombre, 'es'));
  let puesto = 0;
  filas.forEach((f, i) => {
    if (i === 0 || cmp(filas[i - 1], f) !== 0) puesto = i + 1;
    f.puesto = puesto;
  });
  filas.forEach(f => { f.empate = filas.filter(g => g.puesto === f.puesto).length > 1; });
  return filas;
}
