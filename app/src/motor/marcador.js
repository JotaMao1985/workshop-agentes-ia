// Marcador del facilitador: suma, orden y desempate. II.B se recalcula siempre desde la configuración.
import { puntajeIIB } from './puntaje.js';

export function claveEquipo(nombre) { return String(nombre || '').trim().toLowerCase(); }

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
