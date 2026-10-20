// Ayudas de la vista para entregar y compartir: cargas de los QR, huellas, pendientes y el enlace del
// celular probador. No es parte del motor (no tiene espejo en Python): solo reutiliza sus funciones.
import { codificar, decodificar, fnv1a } from '../motor/codigo.js';
import { sanearConfig } from '../motor/config.js';
import { sanearRegistro } from '../motor/registro.js';

// La misma carga que muestra «Entregar»: con el nombre del equipo dentro.
export function cargaAgente(config, equipo) { return codificar('B', sanearConfig({ ...config, equipo })); }
export function cargaRegistro(registro, equipo) { return codificar('A', sanearRegistro({ ...registro, equipo })); }

export function huella(carga) { return fnv1a(String(carga || '')); }

// Versión corta y legible del agente (4 hexadecimales): sirve para comparar dos celulares de un vistazo.
export function version4(carga) { return (huella(carga) >>> 16).toString(16).padStart(4, '0').toUpperCase(); }

const CAMPOS_REGISTRO = [
  ['i', 'Intención del usuario'], ['f', 'Flujo que siguieron'], ['h', 'Herramientas que usaron'],
  ['m', 'Memoria que consultaron'], ['c', '¿Qué hizo Control?'], ['im', 'Cómo manejaron el imprevisto'],
  ['r', 'Respuesta final al usuario'], ['k', 'Rol clave del equipo'],
];

// Campos vacíos del registro (después de sanear: un texto con solo espacios cuenta como vacío).
export function pendientesRegistro(registro) {
  const r = sanearRegistro(registro);
  return CAMPOS_REGISTRO.filter(([k]) => (Array.isArray(r[k]) ? r[k].length === 0 : !r[k])).map(([, t]) => t);
}

// Elementos de personalización que aún no cuentan (recibe el resultado de personalizacion()).
export function pendientesAgente(pz) { return pz.items.filter(i => !i.pasa).map(i => i.nombre); }

export function urlProbador(base, carga) { return base + '#/probador/' + carga; }

// Lee la carga de un enlace del celular probador (o el resto de la ruta después de «probador/»).
// Solo acepta el código de un agente (B1.…); la copia pasa por sanearConfig y nunca se guarda.
export function leerProbador(texto) {
  let t = String(texto || '');
  const i = t.indexOf('probador/');
  if (i >= 0) t = t.slice(i + 9);
  try { t = decodeURIComponent(t); } catch { return { ok: false }; }
  t = t.split(/[?&#\s]/)[0];
  try {
    const { tipo, datos } = decodificar(t);
    if (tipo !== 'B') return { ok: false };
    return { ok: true, config: sanearConfig(datos), carga: t, version: version4(t) };
  } catch {
    return { ok: false };
  }
}
