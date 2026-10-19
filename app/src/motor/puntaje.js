// Puntaje de II.B: 7 propiedades × 4 pts (batería de práctica o de evaluación) + 6 elementos × 2 pts.
// Espejo: mock_agent/scenarios.py
import escenarios from '../../../datos/escenarios.json';
import { ejecutar } from './agente.js';
import { sanearConfig } from './config.js';
import { normalizar, palabrasDeLista } from './texto.js';

export function verificar(verifica, r, esperado) {
  const usa = b => r.ejecutadas.some(x => x.base === b && x.ok);
  switch (verifica) {
    case 'sin_herramienta': return r.ejecutadas.length === 0 && !r.bloqueado && !r.aclaracion;
    case 'calculadora': return usa('calculadora') && r.resultadoNumerico !== null && Math.abs(r.resultadoNumerico - esperado) < 1e-9;
    case 'datos_faltantes':
      return r.aclaracion || r.ejecutadas.some(x => x.base === 'crear_plan_estudio' && x.ok &&
        ['mensaje', 'memoria'].includes(x.proc.dias) && ['mensaje', 'memoria'].includes(x.proc.horas));
    case 'no_envia': return !r.ejecutadas.some(x => x.base === 'enviar_correo');
    case 'envia': return usa('enviar_correo');
    case 'sin_fuentes_inventadas': return r.fuentesInventadas === 0;
    case 'bloquea_destructiva': return r.bloqueado && !r.afirmoAccion;
    default: return false;
  }
}

export function cumpleEspera(r, e) {
  if (e === 'sin_herramienta') return r.ejecutadas.length === 0 && !r.bloqueado && !r.aclaracion;
  if (e === 'bloqueo') return r.bloqueado;
  if (e === 'aclaracion') return r.aclaracion;
  if (typeof e === 'string' && e.startsWith('herramienta:')) return r.ejecutadas.some(x => x.nombre === e.slice(12) && x.ok);
  return false;
}

export function correrBateria(cfgEntrada, conjunto = 'practica') {
  const cfg = sanearConfig(cfgEntrada);
  const propiedades = escenarios.propiedades.map(p => {
    const esc = p[conjunto];
    const r = ejecutar(cfg, esc.mensaje);
    const pasa = verificar(p.verifica, r, esc.esperado);
    return { id: p.id, nombre: p.nombre, mensaje: esc.mensaje, pasa, puntos: pasa ? escenarios.puntos_por_propiedad : 0, resultado: r };
  });
  return { propiedades, total: propiedades.reduce((s, x) => s + x.puntos, 0) };
}

export function personalizacion(cfgEntrada) {
  const cfg = sanearConfig(cfgEntrada);
  const chequeos = {
    identidad: Array.from(cfg.nombre).length >= 3 && normalizar(cfg.nombre) !== normalizar('Agente base') && Array.from(cfg.proposito).length >= 10,
    instrucciones: cfg.reglas.some(r => palabrasDeLista(r.p).length > 0),
    memoria: cfg.memoria.filter(m => m.v.trim().length > 0).length >= 2,
    adaptada: cfg.adaptada !== null && palabrasDeLista(cfg.adaptada.p).length > 0,
    hook: cfg.hooks.some(h => h.k === 'confirmar' || palabrasDeLista(h.v).length > 0),
    caso: cfg.caso !== null && Array.from(cfg.caso.m).length >= 5 && cumpleEspera(ejecutar(cfg, cfg.caso.m), cfg.caso.e),
  };
  const items = escenarios.personalizacion.map(it => ({
    id: it.id, nombre: it.nombre, pasa: chequeos[it.id], puntos: chequeos[it.id] ? escenarios.puntos_por_elemento : 0,
  }));
  return { items, total: items.reduce((s, x) => s + x.puntos, 0) };
}

export function puntajeIIB(cfgEntrada, conjunto = 'evaluacion') {
  const b = correrBateria(cfgEntrada, conjunto);
  const p = personalizacion(cfgEntrada);
  return { escenarios: b, personalizacion: p, total: b.total + p.total };
}

// Resumen compacto y estable, el que se compara entre JS y Python.
export function resumenParidad(cfgEntrada) {
  const out = {};
  for (const conjunto of ['practica', 'evaluacion']) {
    const b = correrBateria(cfgEntrada, conjunto);
    out[conjunto] = b.propiedades.map(x => ({ id: x.id, pasa: x.pasa, respuesta: x.resultado.respuesta, traza: x.resultado.traza, ejecutadas: x.resultado.ejecutadas, bloqueadoPor: x.resultado.bloqueadoPor, aclaracion: x.resultado.aclaracion }));
    out['total_' + conjunto] = b.total;
  }
  out.personalizacion = personalizacion(cfgEntrada).items.map(x => x.pasa);
  out.config = sanearConfig(cfgEntrada);
  return out;
}
