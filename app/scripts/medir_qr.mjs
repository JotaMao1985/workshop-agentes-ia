import { codificar, bytesCarga } from '../src/motor/codigo.js';
import { sanearConfig } from '../src/motor/config.js';
import { sanearRegistro, LIM_REG, FICHAS_FLUJO, HERRAMIENTAS_CASO, MEMORIA_CASO, CONTROL_CASO } from '../src/motor/registro.js';
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
// II.A con todo al límite: LIM_REG.f pasos (el ciclo con varias vueltas), todas las casillas marcadas y
// todos los textos llenos. Se sanea igual que en la app antes de codificar.
const ciclo = ['U','O','ML','LD','CA','H','OB','LD','CA','H','OB','LD','CA','H','OB','LR','CD','R','ME','T'];
const flujo = Array.from({ length: LIM_REG.f }, (_, i) => (i < ciclo.length ? ciclo[i] : FICHAS_FLUJO[i % FICHAS_FLUJO.length][0]));
const todos = lista => lista.map(x => x[0]);
const reg = sanearRegistro({ v: 1, equipo: llenar(30), i: llenar(120), f: flujo, h: todos(HERRAMIENTAS_CASO), m: todos(MEMORIA_CASO), c: todos(CONTROL_CASO),
  cn: llenar(100), im: llenar(200), r: llenar(280), k: 'orquestador' });
const a = codificar('A', reg);
console.log('II.A registro (' + reg.f.length + ' pasos) JSON', Buffer.byteLength(JSON.stringify(reg)), 'bytes → carga', bytesCarga(a));
// texto con un patrón periódico (se comprime bien)
const azar = n => Array.from({length:n}, (_, i) => 'abcdefghijklmnopqrstuvwxyzáéíóúñ '[(i*7919 + i*i*31) % 33]).join('');
const reg2 = { ...reg, i: azar(120), cn: azar(100), im: azar(200), r: azar(280) };
console.log('II.A texto con patrón periódico →', bytesCarga(codificar('A', reg2)));
// peor caso real: letras al azar (con tildes y ñ) en todos los textos y fichas al azar; se comprime muy poco
let s = 777; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const letras = n => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyzáéíóúñ '[Math.floor(rnd() * 33)]).join('');
let peor = 0;
for (let k = 0; k < 200; k++) {
  const r3 = sanearRegistro({ ...reg, equipo: letras(30), i: letras(120), cn: letras(100), im: letras(200), r: letras(280),
    f: Array.from({ length: LIM_REG.f }, () => FICHAS_FLUJO[Math.floor(rnd() * FICHAS_FLUJO.length)][0]) });
  peor = Math.max(peor, bytesCarga(codificar('A', r3)));
}
console.log('II.A peor caso (letras al azar, 200 pruebas) →', peor);
