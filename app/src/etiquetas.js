export const HERRAMIENTAS = [
  ['calculadora', 'Hace operaciones exactas.'],
  ['crear_plan_estudio', 'Arma un plan por días y horas.'],
  ['buscar_recurso', 'Busca en un catálogo fijo de recursos.'],
  ['resumir_texto', 'Resume el texto que va después de «:».'],
  ['evaluar_entrega', 'Revisa claridad, evidencia y conclusión.'],
  ['enviar_correo', 'Envía un correo (simulado).'],
  ['consultar_calendario', 'Lee una agenda de ejemplo.'],
];
export const TIPOS_AGENTE = [
  ['tutor', 'Tutor'], ['organizador', 'Organizador de estudio'], ['evaluador', 'Evaluador de entregas'],
  ['administrativo', 'Administrativo'], ['recomendador', 'Recomendador de recursos'], ['soporte', 'Soporte técnico'],
];
export const TIPOS_MEMORIA = [
  ['dias', 'Días disponibles'], ['horas', 'Horas al día'], ['tema', 'Tema'], ['correo_grupo', 'Correo del grupo'],
  ['preferencia', 'Preferencia'], ['otro', 'Otro dato'],
];
export const TIPOS_RECURSO = [['cualquiera', 'Cualquiera'], ['articulo', 'Artículos'], ['video', 'Videos'], ['libro', 'Libros'], ['curso', 'Cursos']];
export const BLOQUES = {
  orquestador: 'Orquestador', memoria: 'Memoria', llm: 'LLM', control: 'Control', herramientas: 'Herramientas',
};
export const ICONO_ESTADO = { ok: '', aviso: '⚠️', bloqueado: '✋', error: '✗' };

export function etiquetaAccion(a) {
  if (a === 'responder') return 'Responder directo';
  if (a === 'aclarar') return 'Pedir aclaración';
  if (a === 'bloquear') return 'No hacerlo';
  if (a && a.startsWith('herramienta:')) return 'Usar ' + a.slice(12);
  return a;
}
export function etiquetaEspera(e) {
  if (e === 'sin_herramienta') return 'Responde sin herramientas';
  if (e === 'bloqueo') return 'Se bloquea';
  if (e === 'aclaracion') return 'Pide aclaración';
  if (e && e.startsWith('herramienta:')) return 'Usa ' + e.slice(12);
  return e;
}
export const MISIONES = [
  '¿Qué es un token?',
  'Envía el resumen a grupo.redes@ejemplo.edu',
  'Recomiéndame un artículo sobre redes de cápsulas cuánticas.',
];
