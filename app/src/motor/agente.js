// El agente simulado: un ciclo determinista Orquestador → Memoria → LLM → Control → Herramienta →
// Observación → LLM → Control (evaluador) → Memoria → Traza. Espejo: mock_agent/agent.py y vecinos.
//
// Confirmación en dos turnos: si Control (antes) bloquea una acción porque falta autorización
// (envío en «pedir») o confirmación (hook «confirmar»), la Memoria guarda en la memoria de la sesión
// el estado: una entrada { t: 'estado', v, por, h, a, p } con la herramienta y sus argumentos. En el
// turno siguiente, una confirmación pura («sí», «confirmo»…) la ejecuta, una negación la cancela y
// cualquier otro mensaje la descarta. Quien llama guarda r.memoriaSesion para el próximo mensaje.
import lexico from '../../../datos/lexico.json';
import catalogo from '../../../datos/catalogo.json';
import textos from '../../../datos/textos.json';
import { normalizar, contiene, primeraFrase, formatear, palabrasDeLista, correos, formatoNumero, recortar, minusculaInicial, cubrePor } from './texto.js';
import { extraerExpresion, calcular, ErrorCalculo } from './calculadora.js';
import { sanearConfig } from './config.js';

const ORDEN_ARGS = {
  calculadora: ['expresion'],
  crear_plan_estudio: ['tema', 'dias', 'horas'],
  buscar_recurso: ['tema'],
  resumir_texto: ['texto'],
  evaluar_entrega: ['texto'],
  enviar_correo: ['destino', 'contenido'],
  consultar_calendario: [],
};

// ---------- extracción de argumentos ----------

function temaDe(msg, marcadores) {
  const rel = ' ' + msg + ' ';
  for (const m of marcadores) {
    const clave = ' ' + m + ' ';
    const i = rel.lastIndexOf(clave);
    if (i < 0) continue;
    let palabras = rel.slice(i + clave.length).trim().split(' ').filter(Boolean);
    while (palabras.length && lexico.articulos.includes(palabras[0])) palabras = palabras.slice(1);
    palabras = palabras.slice(0, 6);
    if (palabras.length) return palabras.join(' ');
  }
  return null;
}

function palabrasContenido(s) {
  return normalizar(s).split(' ').filter(w => w.length >= 3 && !lexico.vacias.includes(w));
}

function numeroDe(s) {
  const n = normalizar(s);
  const m = n.match(/(?:^| )(\d+)(?= |$)/);
  if (m) return parseInt(m[1], 10);
  for (const w of n.split(' ')) if (w in lexico.numeros) return lexico.numeros[w];
  return null;
}

function numeroAntes(msg, unidades) {
  const palabras = Object.keys(lexico.numeros).join('|');
  const re = new RegExp('(?:^| )(\\d+|' + palabras + ') (?:' + unidades.join('|') + ')(?= |$)');
  const m = msg.match(re);
  if (!m) return null;
  const v = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : lexico.numeros[m[1]];
  return v >= 1 && v <= 14 ? v : null;
}

function deMemoria(memoria, tipo) {
  for (const e of memoria) if (e.t === tipo && String(e.v).trim()) return String(e.v).trim();
  return null;
}

function textoTrasDosPuntos(crudo) {
  const i = crudo.indexOf(':');
  if (i < 0) return null;
  const t = recortar(crudo.slice(i + 1).trim(), 200);
  return t || null;
}

function extraerArgs(base, crudo, msg, memoria) {
  const args = {}, proc = {}, deMem = [];
  const poner = (k, v, p) => { args[k] = v; proc[k] = p; };
  const sup = textos.supuestos;
  if (base === 'calculadora') {
    const e = extraerExpresion(crudo);
    if (e === null) return { args, proc, deMem, sinExpresion: true };
    poner('expresion', e, 'mensaje');
  } else if (base === 'crear_plan_estudio') {
    const tema = temaDe(msg, lexico.marcadores_tema.crear_plan_estudio);
    const dias = numeroAntes(msg, ['dia', 'dias']);
    const horas = numeroAntes(msg, ['hora', 'horas']);
    if (tema) poner('tema', tema, 'mensaje');
    else if (deMemoria(memoria, 'tema')) { poner('tema', deMemoria(memoria, 'tema'), 'memoria'); deMem.push('tema'); }
    else poner('tema', sup.tema, 'supuesto');
    for (const [k, v] of [['dias', dias], ['horas', horas]]) {
      if (v !== null) { poner(k, String(v), 'mensaje'); continue; }
      const mv = deMemoria(memoria, k);
      const n = mv === null ? null : numeroDe(mv);
      if (n !== null && n >= 1 && n <= 14) { poner(k, String(n), 'memoria'); deMem.push(k); }
      else poner(k, sup[k], 'supuesto');
    }
  } else if (base === 'buscar_recurso') {
    const tema = temaDe(msg, lexico.marcadores_tema.buscar_recurso);
    if (tema) poner('tema', tema, 'mensaje');
    else if (deMemoria(memoria, 'tema')) { poner('tema', deMemoria(memoria, 'tema'), 'memoria'); deMem.push('tema'); }
    else poner('tema', sup.tema, 'supuesto');
  } else if (base === 'resumir_texto' || base === 'evaluar_entrega') {
    const t = textoTrasDosPuntos(crudo);
    if (t) poner('texto', t, 'mensaje'); else poner('texto', sup.texto, 'supuesto');
  } else if (base === 'enviar_correo') {
    const c = correos(crudo);
    const mc = deMemoria(memoria, 'correo_grupo');
    const cm = mc === null ? [] : correos(mc);
    if (c.length) poner('destino', c[0], 'mensaje');
    else if (cm.length) { poner('destino', cm[0], 'memoria'); deMem.push('destino'); }
    else poner('destino', sup.destino, 'supuesto');
    poner('contenido', textos.contenido_por_defecto, 'defecto');
  }
  return { args, proc, deMem };
}

function textoArgs(args) {
  return Object.keys(args).map(k => k + '=' + args[k]).join(', ');
}

// ---------- herramientas simuladas ----------

function buscarEnCatalogo(tema, filtro) {
  const ws = palabrasContenido(tema);
  if (!ws.length) return [];
  const hallados = [];
  catalogo.recursos.forEach((r, i) => {
    if (filtro && filtro !== 'cualquiera' && r.tipo !== filtro) return;
    let s = 0;
    for (const w of ws) if (r.etiquetas.includes(w) || (w.endsWith('s') && r.etiquetas.includes(w.slice(0, -1)))) s++;
    if (s * 5 >= ws.length * 3) hallados.push({ r, s, i });
  });
  hallados.sort((a, b) => b.s - a.s || a.i - b.i);
  return hallados.slice(0, 3).map(h => h.r);
}

function textoPlan(tema, dias, horas) {
  const d = Math.min(Math.max(parseInt(dias, 10) || 1, 1), 7);
  const h = Math.min(Math.max(parseInt(horas, 10) || 1, 1), 6);
  const ws = normalizar(tema).split(' ');
  const redes = ws.some(w => catalogo.palabras_redes.includes(w));
  const temas = redes ? catalogo.temas_plan_redes : catalogo.temas_plan_general;
  const lineas = [];
  for (let i = 1; i <= d; i++) lineas.push('Día ' + i + ' (' + h + ' h): ' + temas[(i - 1) % temas.length]);
  return { d, texto: lineas.join(textos.separador_plan) };
}

function textoResumen(t) {
  const partes = t.split(/[.!?]/).map(x => x.trim()).filter(Boolean);
  const primera = partes.length ? partes[0] : t.trim();
  const a = Array.from(primera);
  return a.length > 120 ? a.slice(0, 120).join('') + '…' : primera;
}

function textoRevision(t) {
  const n = normalizar(t);
  const ok = [
    Array.from(t).length >= 40,
    /\d/.test(t) || contiene(n, 'porque') || contiene(n, 'datos'),
    contiene(n, 'en conclusion') || contiene(n, 'por lo tanto') || contiene(n, 'conclusion'),
  ];
  return textos.evaluar_criterios.map((c, i) => c + ': ' + (ok[i] ? textos.si : textos.no)).join(' · ');
}

function aproximar(v) {
  if (v === 0) return 0;
  const a = Math.abs(v);
  if (a < 1) return Math.floor(v * 10 + 0.5) / 10;
  let p = 1;
  while (a >= p * 10) p *= 10;
  return Math.floor(v / p + 0.5) * p;
}

function mayuscula(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

// ---------- el estado: la acción pendiente ----------

const PROCEDENCIAS = ['mensaje', 'memoria', 'supuesto', 'defecto'];

// Las entradas de la memoria de sesión, sin el estado.
export function entradasDeSesion(memoriaSesion) {
  return (Array.isArray(memoriaSesion) ? memoriaSesion : []).filter(e => e && typeof e.v === 'string' && e.t !== 'estado');
}

// La acción pendiente de la memoria de sesión, validada contra la configuración (llega del exterior).
export function leerPendiente(memoriaSesion, cfg) {
  const e = (Array.isArray(memoriaSesion) ? memoriaSesion : []).find(x => x && typeof x === 'object' && x.t === 'estado');
  if (!e || !['envio', 'confirmar'].includes(e.por)) return null;
  const esAdaptada = cfg.adaptada !== null && e.h === cfg.adaptada.n;
  if (!esAdaptada && !(lexico.herramientas_base.includes(e.h) && cfg.herramientas.includes(e.h))) return null;
  const base = esAdaptada ? cfg.adaptada.b : e.h;
  if (e.por === 'envio' && base !== 'enviar_correo') return null;
  const a = e.a, pr = e.p;
  if (!a || typeof a !== 'object' || Array.isArray(a) || !pr || typeof pr !== 'object' || Array.isArray(pr)) return null;
  const args = {}, proc = {};
  for (const k of ORDEN_ARGS[base]) {
    if (typeof a[k] !== 'string' || !PROCEDENCIAS.includes(pr[k])) return null;
    args[k] = recortar(a[k], 300); proc[k] = pr[k];
  }
  const p = { por: e.por, h: e.h, base, args, proc };
  p.v = describirPendiente(p);
  return p;
}

function describirPendiente(p) {
  return p.por === 'envio'
    ? formatear(textos.estado_pendiente.envio, { destino: p.args.destino })
    : formatear(textos.estado_pendiente.confirmar, { herramienta: p.h });
}

export function esConfirmacion(msgNorm) { return cubrePor(msgNorm, lexico.confirmacion, lexico.relleno_confirmacion); }
export function esNegacion(msgNorm) { return cubrePor(msgNorm, lexico.negacion, lexico.relleno_confirmacion); }

// ---------- el ciclo ----------

export function ejecutar(cfgEntrada, mensaje, memoriaSesion = []) {
  const cfg = sanearConfig(cfgEntrada);
  const crudo = recortar(String(mensaje ?? ''), 300);
  const msg = normalizar(crudo);
  const T = textos.traza, R = textos.respuesta;
  const traza = [];
  const paso = (b, clave, datos = {}, e = 'ok') => traza.push({ b, t: formatear(T[clave], datos), e });
  // memoriaEscrita: lo que se pidió recordar en este turno. memoriaSesion: la memoria de la sesión
  // completa después del turno (entradas + estado pendiente, si quedó uno): es la que se pasa al siguiente.
  const r = {
    intencion: 'conversacional', accion: 'responder', herramienta: null, ejecutadas: [],
    bloqueado: false, bloqueadoPor: null, aclaracion: false, fuentesInventadas: 0, afirmoAccion: false,
    resultadoNumerico: null, respuesta: '', memoriaEscrita: [], memoriaSesion: [], traza,
  };
  const entradasSesion = entradasDeSesion(memoriaSesion);
  const memoria = cfg.memoria.concat(entradasSesion.slice(0, 10));
  const pendiente = leerPendiente(memoriaSesion, cfg);
  const autorizado = primeraFrase(msg, lexico.autorizacion) !== null;

  paso('orquestador', 'recibe');
  if (memoria.length) paso('memoria', 'mem_leer', { n: memoria.length });
  else if (!pendiente) paso('memoria', 'mem_vacia');
  // Con un estado pendiente, el mensaje lo confirma, lo cancela o (cualquier otro) lo descarta.
  let conPendiente = null;
  if (pendiente) {
    conPendiente = esConfirmacion(msg) ? 'confirmar' : esNegacion(msg) ? 'cancelar' : 'descartar';
    paso('memoria', conPendiente === 'descartar' ? 'mem_descarta_pendiente' : 'mem_lee_pendiente', { estado: pendiente.v });
  }

  // --- LLM decide ---
  let tipo = null, nombre = null, faltan = [], textoMemoria = '';
  let regla = null, palabraRegla = null;
  const decideElEstado = conPendiente === 'confirmar' || conPendiente === 'cancelar';
  if (!decideElEstado) {
    for (const rg of cfg.reglas) {
      const p = primeraFrase(msg, palabrasDeLista(rg.p));
      if (p) { regla = rg; palabraRegla = p; break; }
    }
  }
  if (decideElEstado) {
    // El estado manda: confirmar ejecuta la acción guardada; cancelar responde sin herramientas.
    r.intencion = conPendiente;
    paso('llm', 'llm_intencion', { intencion: textos.intencion[conPendiente] });
    if (conPendiente === 'confirmar') { tipo = 'herramienta'; nombre = pendiente.h; } else tipo = 'responder';
  } else if (regla) {
    r.intencion = 'regla';
    paso('llm', 'llm_intencion', { intencion: textos.intencion.regla });
    const etiqueta = regla.a.startsWith('herramienta:')
      ? formatear(textos.accion_regla.herramienta, { h: regla.a.slice(12) })
      : textos.accion_regla[regla.a];
    paso('llm', 'llm_regla', { palabra: palabraRegla, accion: etiqueta });
    if (regla.a === 'responder') tipo = 'responder';
    else if (regla.a === 'aclarar') { tipo = 'aclarar'; faltan = ['detalles']; }
    else if (regla.a === 'bloquear') tipo = 'bloquear_instruccion';
    else { tipo = 'herramienta'; nombre = regla.a.slice(12); }
  } else {
    const fraseRecordar = primeraFrase(msg, lexico.recordar);
    const adaptadaPalabra = cfg.adaptada ? primeraFrase(msg, palabrasDeLista(cfg.adaptada.p)) : null;
    if (fraseRecordar) {
      r.intencion = 'recordar';
      const rel = ' ' + msg + ' ';
      const i = rel.indexOf(' ' + fraseRecordar + ' ');
      textoMemoria = recortar(rel.slice(i + fraseRecordar.length + 2).trim(), 40);
      tipo = 'memoria';
    } else if (adaptadaPalabra) {
      r.intencion = 'adaptada';
      tipo = 'herramienta'; nombre = cfg.adaptada.n;
    } else {
      for (const it of lexico.orden_intenciones) {
        let hay = primeraFrase(msg, lexico.intenciones[it]) !== null;
        if (!hay && it === 'calcular') hay = extraerExpresion(crudo) !== null;
        if (hay) { r.intencion = it; break; }
      }
      if (r.intencion === 'peligrosa') tipo = 'inexistente';
      else if (r.intencion === 'conversacional') tipo = 'responder';
      else { tipo = 'herramienta'; nombre = lexico.herramienta_de_intencion[r.intencion]; }
    }
    paso('llm', 'llm_intencion', { intencion: textos.intencion[r.intencion] });
    if (tipo === 'responder' && cfg.modo === 'siempre' && cfg.herramientas.includes('buscar_recurso')) {
      paso('llm', 'llm_modo_siempre', {}, 'aviso');
      tipo = 'herramienta'; nombre = 'buscar_recurso';
    }
  }

  let base = null, habilitada = false, args = {}, proc = {}, supuestos = [];
  let temaModoSiempre = null;
  if (tipo === 'herramienta') {
    base = cfg.adaptada && nombre === cfg.adaptada.n ? cfg.adaptada.b : nombre;
    habilitada = (cfg.adaptada !== null && nombre === cfg.adaptada.n) || cfg.herramientas.includes(nombre);
    r.herramienta = nombre;
    if (conPendiente === 'confirmar') {
      args = { ...pendiente.args }; proc = { ...pendiente.proc };
    } else if (r.intencion === 'conversacional') {
      temaModoSiempre = palabrasContenido(crudo).join(' ');
      if (temaModoSiempre) { args = { tema: temaModoSiempre }; proc = { tema: 'mensaje' }; }
      else { args = { tema: textos.supuestos.tema }; proc = { tema: 'supuesto' }; }
    } else {
      const ex = extraerArgs(base, crudo, msg, memoria);
      if (ex.sinExpresion) { tipo = 'aclarar'; faltan = ['expresion']; }
      else {
        args = ex.args; proc = ex.proc;
        if (ex.deMem.length) paso('memoria', 'mem_usa', { datos: ex.deMem.map(k => k + '=' + args[k]).join(', ') });
      }
    }
    if (tipo === 'herramienta') {
      supuestos = ORDEN_ARGS[base].filter(k => proc[k] === 'supuesto');
      if (habilitada) {
        paso('llm', 'llm_propone', { herramienta: nombre, args: textoArgs(args) });
        if (supuestos.length) paso('llm', 'llm_supone', { supuestos: supuestos.map(k => k + '=' + args[k]).join(', ') }, 'aviso');
      } else {
        paso('llm', 'llm_sin_tool', { herramienta: nombre }, 'aviso');
      }
    }
  }
  if (tipo === 'responder') paso('llm', 'llm_responder');
  else if (tipo === 'aclarar') paso('llm', 'llm_aclarar', { faltan: faltan.map(k => textos.faltan[k]).join(textos.y) });
  else if (tipo === 'inexistente') paso('llm', 'llm_inexistente');
  else if (tipo === 'memoria') paso('llm', 'llm_memoria', { texto: textoMemoria });
  else if (tipo === 'bloquear_instruccion') paso('llm', 'llm_bloquear');
  r.accion = tipo;

  // --- Control (antes) ---
  // Confirmar la acción pendiente es la autorización explícita de este turno; los demás controles siguen.
  const autorizadoAhora = autorizado || conPendiente === 'confirmar';
  let bloqueo = null, avisos = [];
  for (const hk of cfg.hooks) {
    if (hk.k !== 'contiene') continue;
    const p = primeraFrase(msg, palabrasDeLista(hk.v));
    if (p) { bloqueo = { por: 'regla', datos: { palabra: p } }; break; }
  }
  if (!bloqueo && cfg.control.peligrosas && primeraFrase(msg, lexico.intenciones.peligrosa)) bloqueo = { por: 'peligrosa', datos: {} };
  if (!bloqueo && tipo === 'herramienta' && habilitada) {
    for (const hk of cfg.hooks) {
      if (hk.k === 'confirmar' && (hk.v === nombre || hk.v === base) && !autorizadoAhora) { bloqueo = { por: 'confirmar', datos: { herramienta: nombre } }; break; }
    }
    if (!bloqueo && base === 'enviar_correo') {
      if (cfg.control.envio === 'siempre_bloquear') bloqueo = { por: 'envio_siempre', datos: {} };
      else if (cfg.control.envio === 'pedir' && !autorizadoAhora) bloqueo = { por: 'envio', datos: { destino: args.destino } };
      else if (cfg.control.envio === 'apagado') avisos.push('ctrl_sin_hook_envio');
    }
    if (!bloqueo && supuestos.length) {
      if (cfg.control.args) bloqueo = { por: 'args', datos: { herramienta: nombre, supuestos: supuestos.map(k => k + '=' + args[k]).join(', ') } };
      else avisos.push('ctrl_sin_hook_args');
    }
  }
  if (!bloqueo && tipo === 'inexistente') avisos.push('ctrl_sin_hook_peligrosa');

  if (bloqueo) {
    r.bloqueado = true; r.bloqueadoPor = bloqueo.por;
    const claves = { regla: 'ctrl_bloq_regla', peligrosa: 'ctrl_bloq_peligrosa', confirmar: 'ctrl_bloq_confirmar', envio_siempre: 'ctrl_bloq_envio_siempre', envio: 'ctrl_bloq_envio', args: 'ctrl_bloq_args' };
    paso('control', claves[bloqueo.por], bloqueo.datos, 'bloqueado');
    if (bloqueo.por === 'regla') r.respuesta = R.bloq_regla;
    else if (bloqueo.por === 'peligrosa') r.respuesta = R.bloq_peligrosa;
    else if (bloqueo.por === 'confirmar') r.respuesta = formatear(R.bloq_confirmar, { herramienta: nombre });
    else if (bloqueo.por === 'envio_siempre') r.respuesta = R.bloq_envio_siempre;
    else if (bloqueo.por === 'envio') r.respuesta = formatear(R.bloq_envio, { destino: args.destino });
    else { r.aclaracion = true; r.respuesta = formatear(R.aclarar, { faltan: supuestos.map(k => textos.faltan[k]).join(textos.y) }); }
  } else {
    if (conPendiente === 'confirmar') paso('control', 'ctrl_autorizado');
    if (avisos.length) for (const a of avisos) paso('control', a, {}, 'aviso');
    else if (conPendiente !== 'confirmar') paso('control', 'ctrl_ok');

    // --- Herramienta y observación ---
    let obs = null;
    if (tipo === 'herramienta' && habilitada) {
      const esAdaptada = cfg.adaptada !== null && nombre === cfg.adaptada.n;
      obs = correrHerramienta(base, args, esAdaptada ? cfg.adaptada.f : 'cualquiera');
      r.ejecutadas.push({ nombre, base, args, proc, ok: obs.ok });
      if (obs.ok) paso('herramientas', 'tool_ok', { herramienta: nombre, observacion: obs.texto });
      else paso('herramientas', 'tool_error', { herramienta: nombre, error: obs.texto }, 'error');
      paso('orquestador', 'orq_bucle');
    }

    // --- LLM redacta ---
    paso('llm', 'llm_redacta');
    if (tipo === 'herramienta') {
      if (base === 'calculadora') {
        if (habilitada) {
          if (obs.ok) { r.resultadoNumerico = obs.valor; r.respuesta = formatear(R.calc, { expr: args.expresion, res: formatoNumero(obs.valor) }); }
          else r.respuesta = formatear(R.calc_error, { error: obs.texto });
        } else {
          try { r.respuesta = formatear(R.calc_aprox, { aprox: formatoNumero(aproximar(calcular(args.expresion))) }); }
          catch (e) { r.respuesta = formatear(R.calc_error, { error: textos.errores[e.codigo] || textos.errores.sintaxis }); }
        }
      } else if (base === 'crear_plan_estudio') {
        if (habilitada) {
          r.respuesta = formatear(R.plan, { tema: args.tema, lineas: obs.texto2 });
          const pref = deMemoria(memoria, 'preferencia');
          if (pref) r.respuesta += formatear(R.plan_pref, { pref });
        } else r.respuesta = formatear(R.plan_sin_tool, { dias: args.dias, horas: args.horas });
      } else if (base === 'buscar_recurso') {
        if (habilitada && obs.lista.length) {
          r.respuesta = formatear(R.buscar, { lista: obs.lista.map(x => '«' + x.titulo + '» (' + textos.tipo_recurso[x.tipo] + ')').join(textos.separador_lista) });
        } else {
          paso('llm', 'llm_inventa', {}, 'aviso');
          r.fuentesInventadas = 1;
          r.respuesta = formatear(R.buscar_inventa, { tema_titulo: mayuscula(args.tema) });
        }
      } else if (base === 'enviar_correo') {
        r.respuesta = habilitada ? formatear(R.enviar, { contenido: args.contenido, destino: args.destino }) : R.enviar_sin_tool;
      } else if (base === 'resumir_texto') {
        r.respuesta = formatear(R.resumir, { res: textoResumen(args.texto) });
      } else if (base === 'evaluar_entrega') {
        r.respuesta = formatear(R.evaluar, { res: textoRevision(args.texto) });
      } else if (base === 'consultar_calendario') {
        r.respuesta = habilitada ? formatear(R.calendario, { res: catalogo.calendario }) : R.calendario_sin_tool;
      }
    } else if (tipo === 'responder' && conPendiente === 'cancelar') {
      r.respuesta = pendiente.base === 'enviar_correo' ? R.cancelado_envio : R.cancelado;
    } else if (tipo === 'responder') {
      let def = null;
      for (const [term, txt] of textos.glosario) if (contiene(msg, term)) { def = txt; break; }
      r.respuesta = def || formatear(R.por_defecto, {
        nombre: cfg.nombre || 'Agente base',
        proposito: minusculaInicial(cfg.proposito || textos.proposito_por_tipo[cfg.tipo]),
      });
    } else if (tipo === 'inexistente') {
      paso('llm', 'llm_afirma', {}, 'aviso');
      r.afirmoAccion = true; r.respuesta = R.afirma;
    } else if (tipo === 'memoria') {
      r.memoriaEscrita.push({ t: 'preferencia', v: textoMemoria });
      r.respuesta = R.memoria;
    } else if (tipo === 'aclarar') {
      r.aclaracion = true;
      r.respuesta = formatear(R.aclarar, { faltan: faltan.map(k => textos.faltan[k]).join(textos.y) });
    } else if (tipo === 'bloquear_instruccion') {
      r.bloqueado = true; r.bloqueadoPor = 'instruccion'; r.respuesta = R.bloq_instruccion;
    }

    // --- Control (después): evaluador ---
    if (r.fuentesInventadas > 0 && cfg.control.fuentes) {
      paso('control', 'eval_corrige');
      r.fuentesInventadas = 0;
      r.respuesta = formatear(R.buscar_honesto, { tema: args.tema });
    } else if (cfg.control.fuentes) paso('control', 'eval_ok');
    else paso('control', 'eval_apagado', {}, 'aviso');
  }

  // --- Memoria (escribir) y traza ---
  // Solo queda estado pendiente si faltó autorización o confirmación: «Bloquear siempre» es definitivo.
  let nuevoPendiente = null;
  if (bloqueo && (bloqueo.por === 'envio' || bloqueo.por === 'confirmar')) {
    nuevoPendiente = { t: 'estado', v: '', por: bloqueo.por, h: nombre, a: { ...args }, p: { ...proc } };
    nuevoPendiente.v = describirPendiente({ por: bloqueo.por, h: nombre, args });
  }
  r.memoriaSesion = entradasSesion.concat(r.memoriaEscrita, nuevoPendiente ? [nuevoPendiente] : []);
  const enviado = r.ejecutadas.find(x => x.base === 'enviar_correo' && x.ok);
  if (r.memoriaEscrita.length) paso('memoria', 'mem_escribe', { texto: r.memoriaEscrita[0].v });
  else if (nuevoPendiente) paso('memoria', 'mem_guarda_pendiente', { estado: nuevoPendiente.v });
  else if (conPendiente === 'confirmar') paso('memoria', r.bloqueado ? 'mem_borra_bloqueado' : 'mem_borra_hecho');
  else if (conPendiente === 'cancelar') paso('memoria', 'mem_borra_cancelado');
  else if (enviado) paso('memoria', 'mem_estado', { estado: formatear(textos.estado_envio, { destino: enviado.args.destino }) });
  else paso('memoria', 'mem_nada');
  paso('control', 'traza', { n: traza.length + 1 });
  return r;
}

function correrHerramienta(base, args, filtro) {
  const O = textos.observacion;
  if (base === 'calculadora') {
    try {
      const v = calcular(args.expresion);
      return { ok: true, valor: v, texto: formatear(O.calc, { res: formatoNumero(v) }) };
    } catch (e) {
      const cod = e instanceof ErrorCalculo ? e.codigo : 'sintaxis';
      return { ok: false, texto: textos.errores[cod] || textos.errores.sintaxis };
    }
  }
  if (base === 'crear_plan_estudio') {
    const p = textoPlan(args.tema, args.dias, args.horas);
    return { ok: true, texto: formatear(O.plan, { d: p.d }), texto2: p.texto };
  }
  if (base === 'buscar_recurso') {
    const lista = buscarEnCatalogo(args.tema, filtro);
    return { ok: true, lista, texto: lista.length ? formatear(O.buscar, { n: lista.length }) : O.buscar_vacio };
  }
  if (base === 'enviar_correo') return { ok: true, texto: formatear(O.enviar, { destino: args.destino }) };
  if (base === 'resumir_texto') return { ok: true, texto: O.resumir };
  if (base === 'evaluar_entrega') return { ok: true, texto: O.evaluar };
  return { ok: true, texto: formatear(O.calendario, { res: catalogo.calendario }) };
}
