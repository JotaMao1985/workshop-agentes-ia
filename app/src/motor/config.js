// Saneamiento de la configuración de un equipo. Todo lo que llega por QR es entrada no confiable:
// se recorta, se valida contra los enums y se completa con valores por defecto.
// Espejo: mock_agent/config.py
import lexico from '../../../datos/lexico.json';
import base from '../../../datos/config_base.json';
import { normalizar, palabrasDeLista, recortar } from './texto.js';

// Límites elegidos para que el QR de II.B no pase de 800 bytes ni con todo lleno (ver scripts/medir_qr2.mjs).
export const LIMITES = {
  equipo: 30, nombre: 30, proposito: 60, reglas: 3, palabras: 30, memoria: 4, valorMemoria: 30,
  adaptadaNombre: 24, hooks: 2, casoMensaje: 80,
};

const ACCIONES_REGLA = ['responder', 'aclarar', 'bloquear'];
const MODOS = ['siempre', 'solo_si_hace_falta'];
const ENVIO = ['apagado', 'pedir', 'siempre_bloquear'];
const ESPERAS = ['sin_herramienta', 'bloqueo', 'aclaracion'];

export function nombreAdaptadaValido(n) {
  return typeof n === 'string' && /^[a-z][a-z0-9_]{2,23}$/.test(n) && !lexico.herramientas_base.includes(n);
}

function texto(v, n) {
  return recortar(typeof v === 'string' ? v : '', n).trim();
}

function bool(v) { return v === true; }

export function configBase() {
  return JSON.parse(JSON.stringify(base));
}

export function sanearConfig(c) {
  c = c && typeof c === 'object' && !Array.isArray(c) ? c : {};
  const out = {
    v: 1,
    equipo: texto(c.equipo, LIMITES.equipo),
    nombre: texto(c.nombre, LIMITES.nombre),
    tipo: lexico.tipos_agente.includes(c.tipo) ? c.tipo : 'tutor',
    proposito: texto(c.proposito, LIMITES.proposito),
    modo: MODOS.includes(c.modo) ? c.modo : 'siempre',
    reglas: [],
    memoria: [],
    herramientas: [],
    adaptada: null,
    control: { envio: 'apagado', args: false, fuentes: false, peligrosas: false },
    hooks: [],
    caso: null,
  };
  const ad = c.adaptada && typeof c.adaptada === 'object' ? c.adaptada : null;
  if (ad && nombreAdaptadaValido(ad.n) && lexico.herramientas_base.includes(ad.b)) {
    out.adaptada = {
      n: ad.n,
      b: ad.b,
      p: texto(ad.p, LIMITES.palabras),
      f: ad.b === 'buscar_recurso' && lexico.tipos_recurso.includes(ad.f) ? ad.f : 'cualquiera',
    };
  }
  const nombresHerr = lexico.herramientas_base.concat(out.adaptada ? [out.adaptada.n] : []);
  for (const r of Array.isArray(c.reglas) ? c.reglas.slice(0, LIMITES.reglas) : []) {
    if (!r || typeof r !== 'object') continue;
    const a = typeof r.a === 'string' ? r.a : '';
    const okAccion = ACCIONES_REGLA.includes(a) || (a.startsWith('herramienta:') && nombresHerr.includes(a.slice(12)));
    if (!okAccion) continue;
    out.reglas.push({ p: texto(r.p, LIMITES.palabras), a });
  }
  for (const m of Array.isArray(c.memoria) ? c.memoria.slice(0, LIMITES.memoria) : []) {
    if (!m || typeof m !== 'object' || !lexico.tipos_memoria.includes(m.t)) continue;
    out.memoria.push({ t: m.t, v: texto(m.v, LIMITES.valorMemoria) });
  }
  const h = Array.isArray(c.herramientas) ? c.herramientas : [];
  out.herramientas = lexico.herramientas_base.filter(n => h.includes(n));
  const ct = c.control && typeof c.control === 'object' ? c.control : {};
  out.control = {
    envio: ENVIO.includes(ct.envio) ? ct.envio : 'apagado',
    args: bool(ct.args), fuentes: bool(ct.fuentes), peligrosas: bool(ct.peligrosas),
  };
  for (const k of Array.isArray(c.hooks) ? c.hooks.slice(0, LIMITES.hooks) : []) {
    if (!k || typeof k !== 'object') continue;
    if (k.k === 'contiene') out.hooks.push({ k: 'contiene', v: texto(k.v, LIMITES.palabras) });
    else if (k.k === 'confirmar' && nombresHerr.includes(k.v)) out.hooks.push({ k: 'confirmar', v: k.v });
  }
  const cs = c.caso && typeof c.caso === 'object' ? c.caso : null;
  if (cs) {
    const e = typeof cs.e === 'string' ? cs.e : '';
    const okE = ESPERAS.includes(e) || (e.startsWith('herramienta:') && nombresHerr.includes(e.slice(12)));
    if (okE) out.caso = { m: texto(cs.m, LIMITES.casoMensaje), e };
  }
  return out;
}

export function reglaValida(r) {
  return palabrasDeLista(r.p).length > 0;
}

export function normalizarClave(s) { return normalizar(s); }
