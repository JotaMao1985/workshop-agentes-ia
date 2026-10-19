import { correrBateria, personalizacion } from '../src/motor/puntaje.js';
import base from '../../datos/config_base.json';
import ej from '../../datos/config_ejemplo_completo.json';
for (const [n, c] of [['base', base], ['ejemplo', ej]]) {
  for (const conj of ['practica', 'evaluacion']) {
    const b = correrBateria(c, conj);
    console.log(n, conj, b.total, b.propiedades.map(p => (p.pasa ? '✓' : '✗') + p.id).join(' '));
  }
  console.log(n, 'personalización', personalizacion(c).total, personalizacion(c).items.map(i => (i.pasa ? '✓' : '✗') + i.id).join(' '));
}
const b = correrBateria(base, 'practica');
for (const p of b.propiedades) { console.log('\n#' + p.id, p.mensaje, '→', p.resultado.respuesta); for (const t of p.resultado.traza) console.log('   [' + t.b + '] ' + t.t + (t.e !== 'ok' ? ' (' + t.e + ')' : '')); }
