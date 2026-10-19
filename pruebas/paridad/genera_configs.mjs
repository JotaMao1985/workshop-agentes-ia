// Genera configuraciones aleatorias (semilla fija) para la prueba de paridad JS ↔ Python.
import { writeFileSync, readFileSync } from 'node:fs';
const base = JSON.parse(readFileSync(new URL('../../datos/config_base.json', import.meta.url)));
const ejemplo = JSON.parse(readFileSync(new URL('../../datos/config_ejemplo_completo.json', import.meta.url)));
let s = 20261020;
const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const uno = a => a[Math.floor(rnd() * a.length)];
const algunos = (a, p = 0.5) => a.filter(() => rnd() < p);
const HERR = ['calculadora', 'crear_plan_estudio', 'buscar_recurso', 'resumir_texto', 'evaluar_entrega', 'enviar_correo', 'consultar_calendario'];
const PALABRAS = ['envia', 'plan', 'parcial, examen', 'borra', 'token', 'fuente', 'video, videos', 'cuanto', 'resumen', 'contraseña, clave', 'agenda', 'manda', 'ab', 'repaso', 'gradiente'];
const ACC = ['responder', 'aclarar', 'bloquear', ...HERR.map(h => 'herramienta:' + h), 'herramienta:mi_tool', 'herramienta:nada'];
const MEM = [{ t: 'dias', v: '2' }, { t: 'dias', v: 'tres' }, { t: 'horas', v: '1' }, { t: 'horas', v: 'una hora' }, { t: 'tema', v: 'redes neuronales' },
  { t: 'correo_grupo', v: 'grupo.redes@ejemplo.edu' }, { t: 'preferencia', v: 'ejemplos prácticos' }, { t: 'otro', v: 'vive en Bogotá' }, { t: 'dias', v: '99' }, { t: 'xx', v: 'malo' }];
const CASOS = [{ m: 'Recomiéndame un video sobre descenso por gradiente', e: 'herramienta:mi_tool' }, { m: '¿Qué es un token?', e: 'sin_herramienta' },
  { m: 'Borra todo', e: 'bloqueo' }, { m: 'Hazme un plan de estudio', e: 'aclaracion' }, { m: 'Calcula 2+2', e: 'herramienta:calculadora' }, { m: 'x', e: 'raro' }];
const out = [base, ejemplo];
for (let i = 0; i < 220; i++) {
  const adaptada = rnd() < 0.6 ? { n: uno(['mi_tool', 'buscar_video', 'calculadora', 'X-mala']), b: uno(HERR), p: uno(PALABRAS), f: uno(['video', 'articulo', 'cualquiera', 'raro']) } : null;
  out.push({
    v: 1, equipo: 'Equipo ' + i, nombre: uno(['', 'Agente base', 'TutorIA', 'Al', 'Organizador Ñandú']), tipo: uno(['tutor', 'soporte', 'recomendador', 'otro']),
    proposito: uno(['', 'Ayudarte a estudiar redes neuronales', 'corto']), modo: uno(['siempre', 'solo_si_hace_falta', 'quizas']),
    reglas: algunos([0, 1, 2, 3], 0.4).map(() => ({ p: uno(PALABRAS), a: uno(ACC) })),
    memoria: algunos(MEM, 0.3),
    herramientas: algunos(HERR, 0.8),
    adaptada,
    control: { envio: uno(['apagado', 'pedir', 'siempre_bloquear']), args: rnd() < 0.5, fuentes: rnd() < 0.5, peligrosas: rnd() < 0.5 },
    hooks: algunos([0, 1], 0.4).map(() => (rnd() < 0.5 ? { k: 'contiene', v: uno(PALABRAS) } : { k: 'confirmar', v: uno(HERR.concat(['mi_tool'])) })),
    caso: rnd() < 0.7 ? uno(CASOS) : null,
  });
}
writeFileSync(new URL('./configs.json', import.meta.url), JSON.stringify(out));
console.log('configs:', out.length);
