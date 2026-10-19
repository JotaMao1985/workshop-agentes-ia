// Registro de decisiones de la II.A (juego de roles). Llega por QR: se sanea igual que la configuración.
import { recortar } from './texto.js';

export const FICHAS_FLUJO = [
  ['U', 'Usuario'], ['O', 'Orquestador'], ['ML', 'Memoria (leer)'], ['LD', 'LLM decide'],
  ['CA', 'Control (antes)'], ['H', 'Herramienta'], ['OB', 'Observación'], ['LR', 'LLM redacta'],
  ['CD', 'Control (después)'], ['R', 'Respuesta'], ['ME', 'Memoria (escribir)'], ['T', 'Traza'],
];
export const HERRAMIENTAS_CASO = [
  ['H1', 'H1 · consultar_calendario'], ['H2', 'H2 · buscar_recurso'], ['H3', 'H3 · crear_plan_estudio'],
  ['H4', 'H4 · enviar_correo'], ['H5', 'H5 · calculadora'],
];
export const MEMORIA_CASO = [
  ['M1', 'M1 · Prefiere ejemplos prácticos y videos cortos'], ['M2', 'M2 · Le cuesta el entrenamiento'],
  ['M3', 'M3 · Correo del grupo'], ['M4', 'M4 · No enviar sin confirmar'],
];
export const CONTROL_CASO = [
  ['autorizacion', 'Pidió autorización antes de enviar'], ['bloqueo', 'Bloqueó una acción'],
  ['aclaracion', 'Pidió aclaración'], ['fuentes', 'Verificó que las fuentes fueran reales'], ['nada', 'No intervino'],
];
export const ROLES = [['llm', 'LLM'], ['orquestador', 'Orquestador'], ['herramientas', 'Herramientas'], ['memoria', 'Memoria'], ['control', 'Control']];
export const LIM_REG = { equipo: 30, i: 120, f: 16, cn: 100, im: 200, r: 280 };

const codigos = lista => lista.map(x => x[0]);

export function registroVacio(equipo = '') {
  return { v: 1, equipo, i: '', f: [], h: [], m: [], c: [], cn: '', im: '', r: '', k: '' };
}

export function sanearRegistro(x) {
  x = x && typeof x === 'object' ? x : {};
  const t = (v, n) => recortar(typeof v === 'string' ? v : '', n).trim();
  const sub = (v, lista) => (Array.isArray(v) ? codigos(lista).filter(c => v.includes(c)) : []);
  return {
    v: 1,
    equipo: t(x.equipo, LIM_REG.equipo),
    i: t(x.i, LIM_REG.i),
    f: (Array.isArray(x.f) ? x.f : []).filter(c => codigos(FICHAS_FLUJO).includes(c)).slice(0, LIM_REG.f),
    h: sub(x.h, HERRAMIENTAS_CASO),
    m: sub(x.m, MEMORIA_CASO),
    c: sub(x.c, CONTROL_CASO),
    cn: t(x.cn, LIM_REG.cn),
    im: t(x.im, LIM_REG.im),
    r: t(x.r, LIM_REG.r),
    k: codigos(ROLES).includes(x.k) ? x.k : '',
  };
}
