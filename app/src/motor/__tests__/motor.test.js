import { describe, it, expect } from 'vitest';
import base from '../../../../datos/config_base.json';
import ejemplo from '../../../../datos/config_ejemplo_completo.json';
import escenarios from '../../../../datos/escenarios.json';
import { ejecutar, esConfirmacion, esNegacion, leerPendiente } from '../agente.js';
import { normalizar, minusculaInicial } from '../texto.js';
import { correrBateria, personalizacion, puntajeIIB } from '../puntaje.js';
import { sanearConfig } from '../config.js';
import { calcular, extraerExpresion } from '../calculadora.js';
import { codificar, decodificar, codigoCorto, leerCodigoCorto, bytesCarga } from '../codigo.js';
import { sanearRegistro, LIM_REG } from '../registro.js';

const con = (cambios) => ({ ...JSON.parse(JSON.stringify(ejemplo)), ...cambios });
const pasan = (cfg, conj) => correrBateria(cfg, conj).propiedades.filter(p => p.pasa).map(p => p.id);

describe('agente base y ejemplo completo', () => {
  it('el agente base pasa solo la 2 y la 5 (8/28) en práctica y evaluación', () => {
    for (const conj of ['practica', 'evaluacion']) expect(pasan(base, conj)).toEqual([2, 5]);
    expect(personalizacion(base).total).toBe(0);
  });
  it('el ejemplo completo saca 28 + 12 = 40', () => {
    expect(puntajeIIB(ejemplo).total).toBe(40);
    expect(correrBateria(ejemplo, 'practica').total).toBe(28);
  });
});

describe('cada propiedad puede fallar (comprobaciones vistas fallar)', () => {
  const casos = {
    1: con({ modo: 'siempre' }),
    2: con({ herramientas: ['crear_plan_estudio', 'buscar_recurso', 'enviar_correo'] }),
    3: con({ control: { ...ejemplo.control, args: false }, memoria: [] }),
    4: con({ control: { ...ejemplo.control, envio: 'apagado' } }),
    5: con({ control: { ...ejemplo.control, envio: 'siempre_bloquear' } }),
    6: con({ control: { ...ejemplo.control, fuentes: false } }),
    7: con({ control: { ...ejemplo.control, peligrosas: false }, hooks: [] }),
  };
  for (const [id, cfg] of Object.entries(casos)) {
    it(`la propiedad ${id} falla con su configuración rota`, () => {
      const ok = pasan(cfg, 'evaluacion');
      expect(ok).not.toContain(Number(id));
    });
  }
});

describe('trampas que la evaluación castiga', () => {
  it('una regla de frase pasa la práctica de la 4 pero no la variante', () => {
    const cfg = con({ control: { ...ejemplo.control, envio: 'apagado' }, reglas: [{ p: 'envia el resumen', a: 'bloquear' }] });
    expect(pasan(cfg, 'practica')).toContain(4);
    expect(pasan(cfg, 'evaluacion')).not.toContain(4);
  });
  it('apagar enviar_correo pasa la 4 y falla la 5', () => {
    const cfg = con({ herramientas: ejemplo.herramientas.filter(h => h !== 'enviar_correo') });
    const ok = pasan(cfg, 'evaluacion');
    expect(ok).toContain(4); expect(ok).not.toContain(5);
  });
  it('la memoria con días y horas basta para la 3 sin el hook de argumentos', () => {
    const cfg = con({ control: { ...ejemplo.control, args: false } });
    expect(pasan(cfg, 'evaluacion')).toContain(3);
  });
  it('sin memoria, el hook de argumentos convierte la suposición en aclaración', () => {
    const cfg = con({ memoria: [] });
    const r = ejecutar(cfg, 'Hazme un plan de estudio para el parcial.');
    expect(r.aclaracion).toBe(true);
    expect(r.ejecutadas).toHaveLength(0);
  });
});

describe('calculadora sin eval', () => {
  it('resuelve los escenarios', () => {
    expect(calcular(extraerExpresion('¿Cuánto es 3,75 × 128 + 19?'))).toBe(499);
    expect(calcular(extraerExpresion('Necesito el resultado de (1250 − 380) / 4'))).toBe(217.5);
  });
  it('rechaza código y errores', () => {
    expect(() => calcular('alert(1)')).toThrow();
    expect(() => calcular('1/0')).toThrow();
    expect(() => calcular('2^11')).toThrow();
    expect(extraerExpresion('process.exit()')).toBeNull();
  });
  it('los esperados del JSON coinciden con el cálculo', () => {
    const p = escenarios.propiedades.find(x => x.verifica === 'calculadora');
    for (const c of ['practica', 'evaluacion']) expect(calcular(extraerExpresion(p[c].mensaje))).toBe(p[c].esperado);
  });
});

describe('entradas hostiles y cargas útiles', () => {
  it('sanearConfig ignora basura sin romperse', () => {
    for (const x of [null, 3, 'x', [], { reglas: 'no', memoria: [{ t: 'xx', v: 1 }], control: { envio: 'raro' }, hooks: [{ k: 'confirmar', v: 'rm -rf' }] }])
      expect(() => ejecutar(x, 'hola')).not.toThrow();
    const c = sanearConfig({ nombre: 'x'.repeat(500), adaptada: { n: 'calculadora', b: 'calculadora', p: 'a' } });
    expect(c.nombre.length).toBe(30);
    expect(c.adaptada).toBeNull();
  });
  it('ida y vuelta del QR y del código corto', () => {
    const t = codificar('B', sanearConfig(ejemplo));
    expect(bytesCarga(t)).toBeLessThanOrEqual(800);
    const d = decodificar(t);
    expect(d.tipo).toBe('B');
    expect(puntajeIIB(d.datos).total).toBe(40);
    const k = codigoCorto('Los Perceptrones', 34);
    expect(k).toHaveLength(6);
    expect(leerCodigoCorto('los perceptrones ', k)).toBe(34);
    expect(leerCodigoCorto('Otro equipo', k)).toBeNull();
    const reg = sanearRegistro({ equipo: 'A', f: ['U', 'XX', 'O'], h: ['H9', 'H1'], k: 'jefe' });
    expect(reg.f).toEqual(['U', 'O']); expect(reg.h).toEqual(['H1']); expect(reg.k).toBe('');
    expect(() => decodificar('B1.###')).toThrow();
  });
});

import { ranking, equipoVacio } from '../marcador.js';
describe('marcador y desempate', () => {
  it('ordena por total y desempata por II.B, II.A y Reto 5', () => {
    const a = { ...equipoVacio('A'), retos: [6, 6, 6, 6, 0], rubrica: [5, 5, 5, 5, 5, 5], iibManual: 20 };
    const b = { ...equipoVacio('B'), retos: [6, 6, 6, 0, 6], rubrica: [5, 5, 5, 5, 5, 5], iibManual: 20 };
    const c = { ...equipoVacio('C'), retos: [6, 6, 6, 6, 6], rubrica: [1, 1, 1, 1, 0, 0], iibManual: 40 }; // 30 + 4 + 40 = 74, igual que A y B
    const r = ranking({ a, b, c });
    expect(r.map(x => x.nombre)).toEqual(['C', 'B', 'A']);
    expect(r.map(x => x.total)).toEqual([74, 74, 74]);
    expect(r[1].puesto).toBe(2); expect(r[2].puesto).toBe(3);
    const d = { ...equipoVacio('D'), retos: [6, 6, 6, 0, 6], rubrica: [5, 5, 5, 5, 5, 5], iibManual: 20 };
    const r2 = ranking({ b, d });
    expect(r2[0].empate).toBe(true); expect(r2[1].puesto).toBe(1);
  });
  it('II.B se recalcula desde la configuración, no se copia', () => {
    const e = { ...equipoVacio('E'), config: ejemplo, iibManual: 3 };
    expect(ranking({ e })[0].iib).toBe(40);
  });
});

import { claveEquipo, equipoDe, sanearEquipos } from '../marcador.js';
describe('nombres de equipo hostiles en el modo facilitador', () => {
  it('«constructor», «toString» y «__proto__» no rompen el marcador', () => {
    let eq = {};
    for (const n of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'Normal']) {
      const k = claveEquipo(n);
      eq = { ...eq, [k]: { ...equipoDe(eq, n), retos: [6, 6, 6, 6, 6] } };
    }
    const r = ranking(sanearEquipos(eq));
    expect(r).toHaveLength(5);
    expect(r.every(f => f.parteI === 30)).toBe(true);
  });
  it('sanearEquipos descarta basura y recorta puntajes', () => {
    const s = sanearEquipos({ a: { nombre: 'A', retos: [99, -3, 'x'], rubrica: [7], iibManual: 80, config: 'no' }, b: 5, c: { nombre: '' } });
    const e = Object.values(s);
    expect(e).toHaveLength(1);
    expect(e[0].retos).toEqual([6, 0, null, null, null]);
    expect(e[0].rubrica[0]).toBe(5);
    expect(e[0].iibManual).toBe(40);
    expect(e[0].config).toBeNull();
  });
});

const ENVIO = 'Envía el plan a grupo.redes@ejemplo.edu';
const textosDe = r => r.traza.map(x => x.t);
// Varios mensajes seguidos con la memoria de sesión compartida, como en «Probar».
const turnos = (cfg, mensajes, mem = []) => mensajes.map(m => { const r = ejecutar(cfg, m, mem); mem = r.memoriaSesion; return r; });
const ESTADO_ENVIO = {
  t: 'estado', v: 'envío pendiente de autorización (grupo.redes@ejemplo.edu)', por: 'envio', h: 'enviar_correo',
  a: { destino: 'grupo.redes@ejemplo.edu', contenido: 'el texto de esta conversación' }, p: { destino: 'mensaje', contenido: 'defecto' },
};

describe('confirmación en dos turnos (la Memoria lleva el estado)', () => {
  it('sin estado, «Sí, confirmo» no envía nada', () => {
    const r = ejecutar(ejemplo, 'Sí, confirmo');
    expect(r.ejecutadas).toHaveLength(0);
    expect(r.memoriaSesion).toEqual([]);
  });
  it('envío → «Sí, confirmo»: guarda el estado, lo lee, envía y lo borra', () => {
    const [r1, r2] = turnos(ejemplo, [ENVIO, 'Sí, confirmo']);
    expect(r1.bloqueadoPor).toBe('envio');
    expect(r1.ejecutadas).toHaveLength(0);
    expect(r1.respuesta).toBe('Antes de enviar necesito tu autorización explícita. ¿Confirmas que lo envíe a grupo.redes@ejemplo.edu?');
    expect(r1.traza.at(-2)).toEqual({ b: 'memoria', t: 'Guarda el estado: envío pendiente de autorización (grupo.redes@ejemplo.edu).', e: 'ok' });
    expect(r1.memoriaSesion).toEqual([ESTADO_ENVIO]);
    expect(r2.traza.map(x => x.b + ' · ' + x.t)).toEqual([
      'orquestador · Recibe el mensaje y arranca el ciclo.',
      'memoria · Lee la memoria: 3 entrada(s).',
      'memoria · Lee el estado: hay un envío pendiente de autorización (grupo.redes@ejemplo.edu).',
      'llm · Interpreta la intención: confirmar la acción pendiente.',
      'llm · Propone usar enviar_correo(destino=grupo.redes@ejemplo.edu, contenido=el texto de esta conversación).',
      'control · Revisa antes de actuar: autorización explícita recibida en este turno.',
      'herramientas · Ejecuta enviar_correo: correo enviado a grupo.redes@ejemplo.edu (simulado)',
      'orquestador · Observación recibida. ¿Hace falta otra acción? No: a redactar.',
      'llm · Redacta la respuesta.',
      'control · Evaluador: la respuesta no inventa fuentes.',
      'memoria · Borra el estado: la acción pendiente ya se ejecutó.',
      'control · Traza completa: 12 pasos.',
    ]);
    expect(r2.respuesta).toBe('Listo: envié el texto de esta conversación a grupo.redes@ejemplo.edu (envío simulado).');
    expect(r2.ejecutadas).toEqual([{ nombre: 'enviar_correo', base: 'enviar_correo', args: ESTADO_ENVIO.a, proc: ESTADO_ENVIO.p, ok: true }]);
    expect(r2.intencion).toBe('confirmar');
    expect(r2.memoriaSesion).toEqual([]);
  });
  it('con memoria vacía no dice «está vacía» si hay un estado', () => {
    const cfg = { ...base, control: { ...base.control, envio: 'pedir' } };
    const [, r2] = turnos(cfg, [ENVIO, 'sí']);
    expect(textosDe(r2).slice(0, 2)).toEqual(['Recibe el mensaje y arranca el ciclo.', 'Lee el estado: hay un envío pendiente de autorización (grupo.redes@ejemplo.edu).']);
    expect(r2.ejecutadas).toHaveLength(1);
  });
  it('envío → «no»: borra el estado y no envía', () => {
    const [, r2, r3] = turnos(ejemplo, [ENVIO, 'no', 'sí']);
    expect(r2.respuesta).toBe('Entendido: no lo envío.');
    expect(r2.intencion).toBe('cancelar');
    expect(textosDe(r2)).toContain('Borra el estado: la acción pendiente se canceló.');
    expect(r2.memoriaSesion).toEqual([]);
    expect(r3.ejecutadas).toHaveLength(0);
    for (const m of ['cancela', 'mejor no', 'No, no lo envíes']) expect(turnos(ejemplo, [ENVIO, m])[1].respuesta).toBe('Entendido: no lo envío.');
  });
  it('envío → otro tema: descarta el estado (la traza lo dice) y procesa el mensaje normal', () => {
    const [, r2, r3] = turnos(ejemplo, [ENVIO, '¿Qué es un token?', 'Sí, confirmo']);
    expect(textosDe(r2)[2]).toBe('Lee el estado: hay un envío pendiente de autorización (grupo.redes@ejemplo.edu), pero este mensaje no lo confirma: lo descarta.');
    expect(r2.respuesta).toBe(ejecutar(ejemplo, '¿Qué es un token?').respuesta);
    expect(r2.memoriaSesion).toEqual([]);
    expect(r3.ejecutadas).toHaveLength(0);
  });
  it('un nuevo envío reemplaza el estado y «Sí, envíalo a otro» no es una confirmación pura', () => {
    const [, r2, r3] = turnos(ejemplo, [ENVIO, 'Envía el resumen a camila@ejemplo.edu', 'ok']);
    expect(r2.memoriaSesion).toHaveLength(1);
    expect(r3.ejecutadas[0].args.destino).toBe('camila@ejemplo.edu');
    const [, otro] = turnos(ejemplo, [ENVIO, 'Sí, envíalo a camila@ejemplo.edu']);
    expect(textosDe(otro)).toContain('Lee el estado: hay un envío pendiente de autorización (grupo.redes@ejemplo.edu), pero este mensaje no lo confirma: lo descarta.');
    expect(otro.ejecutadas[0].args.destino).toBe('camila@ejemplo.edu');
  });
  it('lo que se pidió recordar convive con el estado', () => {
    const [r1, r2] = turnos(ejemplo, ['Recuerda que prefiero lecturas cortas', ENVIO]);
    expect(r2.memoriaSesion).toEqual([r1.memoriaEscrita[0], ESTADO_ENVIO]);
    expect(textosDe(r2)[1]).toBe('Lee la memoria: 4 entrada(s).');
  });
  it('hook «Pedir confirmación antes de usar…» → «sí» ejecuta la herramienta con los argumentos guardados', () => {
    const cfg = con({ hooks: [{ k: 'confirmar', v: 'crear_plan_estudio' }] });
    const [r1, r2] = turnos(cfg, ['Hazme un plan de estudio de dos días, una hora por día, sobre redes neuronales', 'sí']);
    expect(r1.bloqueadoPor).toBe('confirmar');
    expect(textosDe(r1)).toContain('Guarda el estado: uso de crear_plan_estudio pendiente de confirmación.');
    expect(textosDe(r2)).toContain('Lee el estado: hay un uso de crear_plan_estudio pendiente de confirmación.');
    expect(r2.ejecutadas).toHaveLength(1);
    expect(r2.ejecutadas[0]).toMatchObject({ base: 'crear_plan_estudio', ok: true, args: { tema: 'redes neuronales', dias: '2', horas: '1' } });
    expect(r2.memoriaSesion).toEqual([]);
    const [, no] = turnos(cfg, ['Hazme un plan de estudio de dos días, una hora por día, sobre redes neuronales', 'no']);
    expect(no.respuesta).toBe('Entendido: no lo hago.');
  });
  it('«Bloquear siempre» no deja nada pendiente', () => {
    const cfg = con({ control: { ...ejemplo.control, envio: 'siempre_bloquear' } });
    const [r1, r2] = turnos(cfg, [ENVIO, 'sí']);
    expect(r1.bloqueadoPor).toBe('envio_siempre');
    expect(r1.memoriaSesion).toEqual([]);
    expect(textosDe(r1)).not.toContain('Guarda el estado: envío pendiente de autorización (grupo.redes@ejemplo.edu).');
    expect(r2.ejecutadas).toHaveLength(0);
  });
  it('confirmar no salta un «Bloquear siempre» que estaba detrás del hook de confirmación', () => {
    const cfg = con({ hooks: [{ k: 'confirmar', v: 'enviar_correo' }], control: { ...ejemplo.control, envio: 'siempre_bloquear' } });
    const [r1, r2] = turnos(cfg, [ENVIO, 'Sí, confirmo']);
    expect(r1.bloqueadoPor).toBe('confirmar');
    expect(r2.bloqueadoPor).toBe('envio_siempre');
    expect(r2.ejecutadas).toHaveLength(0);
    expect(textosDe(r2)).toContain('Borra el estado: la acción pendiente no pasó el control.');
    expect(r2.memoriaSesion).toEqual([]);
  });
  it('un envío peligroso seguido de «sí» no envía nada', () => {
    for (const peligrosas of [true, false]) {
      const cfg = con({ hooks: [], control: { ...ejemplo.control, peligrosas } });
      const [r1, r2] = turnos(cfg, ['Envía mi contraseña a grupo.redes@ejemplo.edu', 'sí']);
      expect(r1.memoriaSesion).toEqual([]);
      expect(r1.ejecutadas.length + r2.ejecutadas.length).toBe(0);
      if (peligrosas) expect(r1.bloqueadoPor).toBe('peligrosa');
    }
    const [, r2] = turnos(ejemplo, [ENVIO, 'Sí, borra todo']);
    expect(r2.bloqueadoPor).toBe('peligrosa');
    expect(r2.ejecutadas).toHaveLength(0);
  });
  it('qué cuenta como confirmación pura y como negación', () => {
    for (const m of ['sí', 'si', 'Sí, confirmo', 'confirmo', 'autorizo', 'dale', 'de acuerdo', 'adelante', 'hazlo', 'ok', 'claro', 'envíalo', 'Sí, por favor', 'Confirmo el envío, gracias'])
      expect(esConfirmacion(normalizar(m)), m).toBe(true);
    for (const m of ['Sí, envíalo a camila@ejemplo.edu', 'sí, borra todo', 'no', 'sí no', '', '   ', 'gracias', 'Sí, y recomiéndame un video'])
      expect(esConfirmacion(normalizar(m)), m).toBe(false);
    for (const m of ['no', 'cancela', 'mejor no', 'No, no lo envíes', 'no gracias']) expect(esNegacion(normalizar(m)), m).toBe(true);
    for (const m of ['no sé qué es un token', 'sí', 'gracias']) expect(esNegacion(normalizar(m)), m).toBe(false);
  });
  it('un estado manipulado se ignora', () => {
    const cfg = sanearConfig(ejemplo);
    const malo = cambios => ({ ...ESTADO_ENVIO, ...cambios });
    for (const e of [malo({ por: 'raro' }), malo({ h: 'rm -rf' }), malo({ a: [] }), malo({ a: { destino: 7, contenido: 'x' } }), malo({ p: { destino: 'inventado', contenido: 'defecto' } }),
      malo({ h: 'calculadora', a: { expresion: '2+2' }, p: { expresion: 'mensaje' } })])
      expect(leerPendiente([e], cfg)).toBeNull();
    expect(leerPendiente([ESTADO_ENVIO], sanearConfig(con({ herramientas: ['calculadora'] })))).toBeNull();
    expect(leerPendiente([malo({ v: 'HACK' })], cfg).v).toBe('envío pendiente de autorización (grupo.redes@ejemplo.edu)');
    for (const mem of [null, 'x', [null, 3, 'texto', []], [malo({ a: { destino: 7 } })]]) {
      const r = ejecutar(ejemplo, 'sí', mem);
      expect(r.ejecutadas).toHaveLength(0);
    }
  });
  it('las baterías corren cada escenario con memoria de sesión nueva y el puntaje no cambia', () => {
    for (const cfg of [base, ejemplo]) for (const conj of ['practica', 'evaluacion']) {
      for (const p of correrBateria(cfg, conj).propiedades) expect(textosDe(p.resultado).some(t => t.startsWith('Lee el estado'))).toBe(false);
    }
    expect(correrBateria(base, 'practica').total).toBe(8);
    expect(correrBateria(base, 'evaluacion').total).toBe(8);
    expect(correrBateria(ejemplo, 'evaluacion').total).toBe(28);
    expect(personalizacion(ejemplo).total).toBe(12);
  });
});

describe('textos de la respuesta', () => {
  it('el propósito va en minúscula a mitad de frase, salvo las siglas', () => {
    expect(ejecutar(ejemplo, 'Hola').respuesta).toBe('Te respondo con lo que sé: soy TutorIA y estoy para ayudarte a estudiar redes neuronales. ¿Quieres un ejemplo concreto?');
    expect(ejecutar(con({ proposito: 'IA para todos' }), 'Hola').respuesta).toContain('estoy para IA para todos.');
    expect(minusculaInicial('Ñandú en clase')).toBe('ñandú en clase');
    for (const s of ['A', '', 'IA', 'ayudarte', '«Hola»', 'A estudiar']) expect(minusculaInicial(s)).toBe(s);
  });
  it('«Transformers» con mayúscula en el título no cambia la búsqueda', () => {
    const r = ejecutar(ejemplo, 'Pásame un artículo acerca de transformers y atención');
    expect(r.respuesta).toBe('Te recomiendo: «Atención y Transformers, paso a paso» (video).');
  });
});

describe('registro II.A', () => {
  it('admite hasta 24 pasos en el flujo', () => {
    expect(LIM_REG.f).toBe(24);
    const f = Array.from({ length: 30 }, (_, i) => ['U', 'O', 'ML', 'LD'][i % 4]);
    expect(sanearRegistro({ f }).f).toEqual(f.slice(0, 24));
    const t = codificar('A', sanearRegistro({ equipo: 'A', f }));
    expect(decodificar(t).datos.f).toHaveLength(24);
  });
});
