// Ruta de la traza: los bloques recorridos, en orden, con los pasos seguidos del mismo bloque juntos.
import { BLOQUES } from '../etiquetas.js';

export const ABREV = { orquestador: 'ORQ', memoria: 'MEM', llm: 'LLM', control: 'CTRL', herramientas: 'HERR' };

export function rutaDeTraza(pasos) {
  const out = [];
  for (const p of Array.isArray(pasos) ? pasos : []) {
    const ult = out[out.length - 1];
    if (ult && ult.b === p.b) ult.n += 1;
    else out.push({ b: p.b, n: 1, bloqueado: false, error: false });
    const g = out[out.length - 1];
    if (p.e === 'bloqueado') g.bloqueado = true;
    if (p.e === 'error') g.error = true;
  }
  return out;
}

// La misma ruta en palabras, para lectores de pantalla.
export function textoRuta(ruta) {
  return ruta.map(g => (BLOQUES[g.b] || g.b) + (g.n > 1 ? ` ${g.n} veces` : '') + (g.bloqueado ? ' (bloqueado)' : '') + (g.error ? ' (error)' : '')).join(', ');
}
