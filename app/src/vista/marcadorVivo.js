// Marcador vivo de «Mi agente»: el puntaje de práctica y lo que cambió con el último ajuste.
// Es vista, no motor: solo reutiliza correrBateria y personalizacion.
import { correrBateria, personalizacion } from '../motor/puntaje.js';
import { cargaAgente, huella, version4 } from './entrega.js';

export function medir(config, equipo = '') {
  const b = correrBateria(config, 'practica');
  const pz = personalizacion(config);
  const carga = cargaAgente(config, equipo);
  return {
    esc: b.total,
    pers: pz.total,
    props: b.propiedades.map(p => ({ id: p.id, nombre: p.nombre, pasa: p.pasa, puntos: p.puntos })),
    items: pz.items,
    pz,
    version: version4(carga),
    huellaB: huella(carga),
  };
}

const MENOS = '−';

// Lo que pasó de no cumplir a cumplir (o al revés) entre dos mediciones.
export function diferencias(prev, next) {
  if (!prev || !next) return [];
  const out = [];
  for (const p of next.props) {
    const a = prev.props.find(x => x.id === p.id);
    if (!a || a.pasa === p.pasa) continue;
    const d = p.puntos - a.puntos;
    out.push({ si: p.pasa, delta: d, texto: p.pasa
      ? `✓ P${p.id} · ${p.nombre} ahora pasa (+${d})`
      : `✗ P${p.id} · ${p.nombre} dejó de pasar (${MENOS}${-d})` });
  }
  for (const it of next.items) {
    const a = prev.items.find(x => x.id === it.id);
    if (!a || a.pasa === it.pasa) continue;
    const d = it.puntos - a.puntos;
    out.push({ si: it.pasa, delta: d, texto: it.pasa
      ? `✓ ${it.nombre} ahora cuenta (+${d})`
      : `✗ ${it.nombre} dejó de contar (${MENOS}${-d})` });
  }
  return out;
}
