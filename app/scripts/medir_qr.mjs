import { codificar, bytesCarga } from '../src/motor/codigo.js';
import { sanearConfig } from '../src/motor/config.js';
const frase = 'El agente debería consultar primero la memoria y después pedir confirmación antes de enviar el plan al grupo de estudio, porque así lo indicó el usuario en la ficha. ';
const llenar = n => (frase.repeat(10)).slice(0, n);
const cfg = sanearConfig({ equipo: llenar(30), nombre: llenar(30), tipo: 'organizador', proposito: llenar(80), modo: 'solo_si_hace_falta',
  reglas: [0,1,2].map(i => ({ p: llenar(40), a: 'herramienta:crear_plan_estudio' })),
  memoria: [0,1,2,3,4].map(i => ({ t: 'preferencia', v: llenar(40) })),
  herramientas: ['calculadora','crear_plan_estudio','buscar_recurso','resumir_texto','evaluar_entrega','enviar_correo','consultar_calendario'],
  adaptada: { n: 'buscar_video_corto_largo', b: 'buscar_recurso', p: llenar(40), f: 'video' },
  control: { envio: 'pedir', args: true, fuentes: true, peligrosas: true },
  hooks: [{ k: 'contiene', v: llenar(40) }, { k: 'confirmar', v: 'enviar_correo' }],
  caso: { m: llenar(100), e: 'herramienta:buscar_video_corto_largo' } });
const b = codificar('B', cfg);
console.log('II.B config JSON', JSON.stringify(cfg).length, 'bytes → carga', bytesCarga(b));
const reg = { v: 1, equipo: llenar(30), i: llenar(120), f: ['U','O','ML','LD','CA','H','OB','LD','CA','H','OB','LR','CD','R','ME','T'], h: ['H1','H2','H3','H4'], m: ['M1','M2','M3','M4'], c: ['autorizacion','fuentes','aclaracion'], cn: llenar(100), im: llenar(200), r: llenar(280), k: 'control' };
const a = codificar('A', reg);
console.log('II.A registro JSON', Buffer.byteLength(JSON.stringify(reg)), 'bytes → carga', bytesCarga(a));
// peor caso: texto sin repeticiones
const azar = n => Array.from({length:n}, (_, i) => 'abcdefghijklmnopqrstuvwxyzáéíóúñ '[(i*7919 + i*i*31) % 33]).join('');
const reg2 = { ...reg, i: azar(120), cn: azar(100), im: azar(200), r: azar(280) };
console.log('II.A peor caso (texto sin patrón) →', bytesCarga(codificar('A', reg2)));
