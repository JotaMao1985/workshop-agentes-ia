import { readFileSync, writeFileSync } from 'node:fs';
import { resumenParidad } from '../../app/src/motor/puntaje.js';
import { ejecutar } from '../../app/src/motor/agente.js';
const configs = JSON.parse(readFileSync(new URL('./configs.json', import.meta.url)));
const mensajes = JSON.parse(readFileSync(new URL('./mensajes.json', import.meta.url)));
const out = configs.map(c => ({ resumen: resumenParidad(c), extra: mensajes.map(m => { const r = ejecutar(c, m); return { respuesta: r.respuesta, traza: r.traza, ejecutadas: r.ejecutadas, bloqueadoPor: r.bloqueadoPor, aclaracion: r.aclaracion, memoriaEscrita: r.memoriaEscrita, resultadoNumerico: r.resultadoNumerico }; }) }));
writeFileSync(new URL('./salida_js.json', import.meta.url), JSON.stringify(out));
console.log('JS listo:', out.length, 'configuraciones ×', 14 + mensajes.length, 'mensajes');
