import { describe, it, expect } from 'vitest';
import base from '../../../../datos/config_base.json';
import ejemplo from '../../../../datos/config_ejemplo_completo.json';
import escenarios from '../../../../datos/escenarios.json';
import { ejecutar } from '../agente.js';
import { correrBateria, personalizacion, puntajeIIB } from '../puntaje.js';
import { sanearConfig } from '../config.js';
import { calcular, extraerExpresion } from '../calculadora.js';
import { codificar, decodificar, codigoCorto, leerCodigoCorto, bytesCarga } from '../codigo.js';
import { sanearRegistro } from '../registro.js';

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
