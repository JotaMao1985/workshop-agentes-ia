import { readFileSync, writeFileSync } from 'node:fs';
import { resumenParidad } from '../../app/src/motor/puntaje.js';
import { ejecutar } from '../../app/src/motor/agente.js';
const leer = n => JSON.parse(readFileSync(new URL('./' + n, import.meta.url)));
const configs = leer('configs.json');
const mensajes = leer('mensajes.json');
const CLAVES = ['respuesta', 'traza', 'ejecutadas', 'bloqueadoPor', 'aclaracion', 'memoriaEscrita', 'resultadoNumerico', 'memoriaSesion'];
const elegir = r => Object.fromEntries(CLAVES.map(k => [k, r[k]]));
const out = configs.map(c => ({ resumen: resumenParidad(c), extra: mensajes.map(m => elegir(ejecutar(c, m))) }));
writeFileSync(new URL('./salida_js.json', import.meta.url), JSON.stringify(out));
console.log('JS listo:', out.length, 'configuraciones ×', 14 + mensajes.length, 'mensajes');

// Secuencias: varios mensajes seguidos con la memoria de sesión compartida (r.memoriaSesion pasa al siguiente).
const secuencias = leer('secuencias.json');
const todas = configs.concat(leer('configs_secuencias.json'));
const sec = todas.map(c => secuencias.map(s => {
  let mem = s.memoria ?? [];
  return s.mensajes.map(m => { const r = ejecutar(c, m, mem); mem = r.memoriaSesion; return r; });
}));
writeFileSync(new URL('./salida_sec_js.json', import.meta.url), JSON.stringify(sec));
console.log('JS secuencias:', todas.length, 'configuraciones ×', secuencias.length, 'secuencias');
