import { codificar, bytesCarga } from '../src/motor/codigo.js';
import { sanearConfig } from '../src/motor/config.js';
import { sanearRegistro, LIM_REG, FICHAS_FLUJO } from '../src/motor/registro.js';
const W = 'agente memoria control herramienta plan estudio grupo correo enviar permiso usuario parcial redes neuronales gradiente entrenamiento video corto ejemplo práctico jueves miércoles martes hora día calendario recurso artículo fuente inventada evaluador bloqueo confirmación traza paso orquestador decide propone ejecuta observación respuesta final imprevisto servicio error disponible cámara código número cálculo resultado tema examen repaso sesión clase profesor Camila Andrés señal atajo capa token contexto ventana'.split(' ');
let s = 12345; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
// generador aparte para las fichas del flujo: así los textos (y el II.B) son los mismos con cualquier LIM_REG.f
let sF = 4242; const rndF = () => (sF = (sF * 1103515245 + 12345) % 2147483648) / 2147483648;
const texto = n => { let t = ''; while (t.length < n) t += W[Math.floor(rnd() * W.length)] + (rnd() < 0.15 ? ', ' : ' '); return t.slice(0, n); };
let maxA = 0, maxB = 0;
for (let k = 0; k < 200; k++) {
  const cfg = sanearConfig({ equipo: texto(30), nombre: texto(30), tipo: 'organizador', proposito: texto(60), modo: 'solo_si_hace_falta',
    reglas: [0,1,2].map(() => ({ p: texto(30), a: 'herramienta:crear_plan_estudio' })),
    memoria: [0,1,2,3].map(() => ({ t: 'preferencia', v: texto(30) })),
    herramientas: ['calculadora','crear_plan_estudio','buscar_recurso','resumir_texto','evaluar_entrega','enviar_correo','consultar_calendario'],
    adaptada: { n: 'buscar_video_corto_largo', b: 'buscar_recurso', p: texto(30), f: 'video' },
    control: { envio: 'pedir', args: true, fuentes: true, peligrosas: true },
    hooks: [{ k: 'contiene', v: texto(30) }, { k: 'confirmar', v: 'enviar_correo' }],
    caso: { m: texto(80), e: 'herramienta:buscar_video_corto_largo' } });
  maxB = Math.max(maxB, bytesCarga(codificar('B', cfg)));
  const f = Array.from({ length: LIM_REG.f }, () => FICHAS_FLUJO[Math.floor(rndF() * FICHAS_FLUJO.length)][0]);
  const reg = sanearRegistro({ v: 1, equipo: texto(30), i: texto(120), f, h: ['H1','H2','H3','H4','H5'], m: ['M1','M2','M3','M4'], c: ['autorizacion','bloqueo','aclaracion','fuentes','nada'], cn: texto(100), im: texto(200), r: texto(280), k: 'orquestador' });
  maxA = Math.max(maxA, bytesCarga(codificar('A', reg)));
}
console.log('máximo en 200 pruebas con texto variado: II.A (' + LIM_REG.f + ' pasos)', maxA, 'bytes; II.B', maxB, 'bytes');
