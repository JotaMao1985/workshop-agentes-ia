import { describe, it, expect } from 'vitest';
import base from '../../../../datos/config_base.json';
import ejemplo from '../../../../datos/config_ejemplo_completo.json';
import lexico from '../../../../datos/lexico.json';
import { ejecutar } from '../../motor/agente.js';
import { personalizacion } from '../../motor/puntaje.js';
import { registroVacio } from '../../motor/registro.js';
import { equipoVacio } from '../../motor/marcador.js';
import { HERRAMIENTAS } from '../../etiquetas.js';
import { cargaAgente, version4, pendientesRegistro, pendientesAgente, urlProbador, leerProbador, huella } from '../entrega.js';
import { medir, diferencias } from '../marcadorVivo.js';
import { rutaDeTraza, textoRuta, ABREV } from '../ruta.js';
import { rubricaCompleta, estadoImport, torneo } from '../facilitador.js';

const copia = x => JSON.parse(JSON.stringify(x));

describe('marcador vivo', () => {
  it('sin medición previa no hay diferencias, y dos iguales tampoco', () => {
    const m = medir(base, 'Equipo');
    expect(diferencias(null, m)).toEqual([]);
    expect(diferencias(m, medir(base, 'Equipo'))).toEqual([]);
  });
  it('pedir autorización hace pasar solo la P4 (+4), con el texto exacto', () => {
    const antes = medir(base, 'Equipo');
    const despues = medir({ ...copia(base), control: { ...base.control, envio: 'pedir' } }, 'Equipo');
    expect(antes.esc).toBe(8);
    const d = diferencias(antes, despues);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ si: true, delta: 4 });
    expect(d[0].texto).toBe('✓ P4 · No envía sin autorización ahora pasa (+4)');
    expect(despues.esc).toBe(12);
  });
  it('lo que deja de pasar resta, con el signo menos tipográfico', () => {
    const d = diferencias(medir(ejemplo), medir({ ...copia(ejemplo), modo: 'siempre' }));
    const p1 = d.find(x => x.texto.includes('P1'));
    expect(p1).toMatchObject({ si: false, delta: -4 });
    expect(p1.texto).toMatch(/dejó de pasar \(−4\)$/);
  });
  it('la personalización suma y resta de a 2', () => {
    const sinHook = { ...copia(ejemplo), hooks: [] };
    const d = diferencias(medir(sinHook), medir(ejemplo));
    expect(d).toEqual([{ si: true, delta: 2, texto: '✓ Un hook propio ahora cuenta (+2)' }]);
    expect(diferencias(medir(ejemplo), medir(sinHook))[0].texto).toBe('✗ Un hook propio dejó de contar (−2)');
  });
  it('la versión cambia con el agente y con el nombre del equipo', () => {
    const v = medir(ejemplo, 'A').version;
    expect(v).toMatch(/^[0-9A-F]{4}$/);
    expect(medir(ejemplo, 'B').version).not.toBe(v);
    expect(medir({ ...copia(ejemplo), nombre: 'Otro' }, 'A').version).not.toBe(v);
    expect(medir(ejemplo, 'A').huellaB).toBe(huella(cargaAgente(ejemplo, 'A')));
  });
});

describe('ruta de la traza', () => {
  it('junta los pasos seguidos del mismo bloque y conserva el bloqueo', () => {
    const r = rutaDeTraza([{ b: 'orquestador', e: 'ok' }, { b: 'llm', e: 'ok' }, { b: 'llm', e: 'ok' }, { b: 'control', e: 'bloqueado' }, { b: 'llm', e: 'ok' }]);
    expect(r).toEqual([
      { b: 'orquestador', n: 1, bloqueado: false, error: false }, { b: 'llm', n: 2, bloqueado: false, error: false },
      { b: 'control', n: 1, bloqueado: true, error: false }, { b: 'llm', n: 1, bloqueado: false, error: false },
    ]);
    expect(textoRuta(r)).toBe('Orquestador, LLM 2 veces, Control (bloqueado), LLM');
  });
  it('una acción destructiva con el ejemplo completo deja Control bloqueado en la ruta', () => {
    const r = rutaDeTraza(ejecutar(ejemplo, 'Borra todos los archivos de la carpeta del curso.').traza);
    expect(r.some(g => g.b === 'control' && g.bloqueado)).toBe(true);
    for (const g of r) expect(ABREV[g.b]).toBeTruthy();
  });
  it('lista vacía o rara no rompe', () => {
    expect(rutaDeTraza(null)).toEqual([]);
    expect(textoRuta([])).toBe('');
  });
});

describe('entrega', () => {
  it('un registro vacío tiene los 8 campos pendientes; uno completo, ninguno', () => {
    expect(pendientesRegistro(registroVacio('X'))).toHaveLength(8);
    const lleno = { ...registroVacio('X'), i: 'Plan', f: ['U', 'O'], h: ['H1'], m: ['M1'], c: ['nada'], im: 'Bien', r: 'Listo', k: 'llm' };
    expect(pendientesRegistro(lleno)).toEqual([]);
  });
  it('un texto con solo espacios cuenta como vacío', () => {
    const r = { ...registroVacio('X'), i: '   ', f: ['U'], h: ['H1'], m: ['M1'], c: ['nada'], im: 'a', r: 'b', k: 'llm' };
    expect(pendientesRegistro(r)).toEqual(['Intención del usuario']);
  });
  it('pendientes del agente: el base tiene 6, el ejemplo ninguno', () => {
    expect(pendientesAgente(personalizacion(base))).toHaveLength(6);
    expect(pendientesAgente(personalizacion(ejemplo))).toEqual([]);
  });
  it('el enlace del probador trae la misma configuración y la misma versión', () => {
    const carga = cargaAgente(ejemplo, 'Los Perceptrones');
    const url = urlProbador('https://x.github.io/app/', carga);
    const r = leerProbador(url);
    expect(r.ok).toBe(true);
    expect(r.version).toBe(version4(carga));
    expect(r.config.equipo).toBe('Los Perceptrones');
    expect(r.config.nombre).toBe('TutorIA');
    expect(leerProbador('probador/' + carga.replace('.', '%2E') + '?x=1').version).toBe(version4(carga));
  });
  it('el probador rechaza un registro, basura y vacío', () => {
    expect(leerProbador('probador/' + 'A1.' + cargaAgente(ejemplo, 'X').slice(3)).ok).toBe(false);
    expect(leerProbador('probador/hola').ok).toBe(false);
    expect(leerProbador('').ok).toBe(false);
    expect(leerProbador('probador/%E0%A4%A').ok).toBe(false);
  });
});

describe('facilitador', () => {
  it('la rúbrica está completa solo con las 6 notas, y 0 cuenta', () => {
    expect(rubricaCompleta({ rubrica: [0, 0, 0, 0, 0, 0] })).toBe(true);
    expect(rubricaCompleta({ rubrica: [5, 5, 5, 5, 5, null] })).toBe(false);
    expect(rubricaCompleta(equipoVacio('X'))).toBe(false);
  });
  it('estado de una importación: nuevo, igual o actualizado', () => {
    expect(estadoImport(null, { a: 1 })).toBe('nuevo');
    expect(estadoImport({ a: 1 }, { a: 1 })).toBe('igual');
    expect(estadoImport({ a: 1 }, { a: 2 })).toBe('actualizado');
  });
  it('las herramientas de la interfaz son las mismas del léxico', () => {
    expect(HERRAMIENTAS.map(h => h[0])).toEqual(lexico.herramientas_base);
  });

  const eq = (nombre, config, extra = {}) => ({ ...equipoVacio(nombre), config, ...extra });
  const borrar = { m: 'Borra todos los archivos de la carpeta del curso', e: 'bloqueo' };
  const calcular = { m: '¿Cuánto es 12 × 12?', e: 'herramienta:calculadora' };
  const equipos = {
    a: eq('Alfa', { ...copia(ejemplo), equipo: 'Alfa', caso: borrar }),
    b: eq('Beta', { ...copia(base), equipo: 'Beta', caso: calcular }),
    c: eq('Gama', { ...copia(ejemplo), equipo: 'Gama' }),
    d: eq('Delta', { ...copia(base), equipo: 'Delta', caso: borrar }),
    e: { ...equipoVacio('Épsilon'), iibManual: 30 },
    f: eq('Zeta', { ...copia(base), equipo: 'Zeta', caso: null }),
  };
  const antes = JSON.stringify(equipos);
  const t = torneo(equipos);

  it('el torneo excluye la herramienta adaptada, el caso que su autor no pasa y al equipo sin configuración', () => {
    expect(t.agentes).toEqual(['Alfa', 'Beta', 'Delta', 'Gama', 'Zeta']);
    expect(t.casos.map(c => c.autor)).toEqual(['Alfa', 'Beta']);
    expect(t.excluidos.map(x => [x.autor, x.motivo])).toEqual([
      ['Delta', 'su propio agente no lo pasa'], ['Gama', 'espera su herramienta adaptada'],
    ]);
    expect(JSON.stringify(equipos)).toBe(antes);
  });
  it('la diagonal queda vacía y cada celda corre el agente contra el caso', () => {
    expect(t.celdas[0][0]).toBeNull();
    expect(t.celdas[1][1]).toBeNull();
    // El caso de Alfa (bloquear lo destructivo) lo pasa Gama (ejemplo) y lo fallan Beta, Delta y Zeta (base).
    expect(t.celdas.map(f => f[0])).toEqual([null, false, false, true, false]);
    expect(t.casos[0]).toMatchObject({ enfrentados: 4, fallos: 3 });
  });
  it('caso más difícil y agente más robusto', () => {
    expect(t.masDificil.map(c => c.autor)).toEqual(['Alfa']);
    expect(t.masRobusto.map(a => a.nombre)).toEqual(['Gama']);
  });
  it('sin casos no hay destacados', () => {
    const t2 = torneo({ f: equipos.f });
    expect(t2.masDificil).toEqual([]);
    expect(t2.masRobusto).toEqual([]);
  });
});
