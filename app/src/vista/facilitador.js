// Ayudas del modo facilitador: rúbrica completa, estado de una importación y el torneo de casos.
// Es vista, no motor: el torneo reutiliza ejecutar y cumpleEspera tal cual.
import { ejecutar } from '../motor/agente.js';
import { cumpleEspera } from '../motor/puntaje.js';
import { HERRAMIENTAS } from '../etiquetas.js';

// Calificada = los 6 criterios tienen nota (0 también es nota).
export function rubricaCompleta(e) { return !!e && Array.isArray(e.rubrica) && e.rubrica.length === 6 && e.rubrica.every(Number.isFinite); }

export function estadoImport(previo, nuevo) {
  if (!previo) return 'nuevo';
  return JSON.stringify(previo) === JSON.stringify(nuevo) ? 'igual' : 'actualizado';
}

const BASE = new Set(HERRAMIENTAS.map(h => h[0]));

// Torneo de casos: el agente de cada equipo contra el caso de prueba propio de cada otro equipo.
// Entra un caso si espera algo que cualquier agente puede hacer (no la herramienta adaptada de su autor)
// y si el agente de su autor lo pasa (un caso imposible no debe ganar «el más difícil»). Mención, sin puntos.
export function torneo(equipos) {
  const agentes = Object.values(equipos || {}).filter(e => e && e.config)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const casos = [];
  const excluidos = [];
  for (const e of agentes) {
    const c = e.config.caso;
    if (!c || Array.from(c.m || '').length < 5) continue;
    if (c.e.startsWith('herramienta:') && !BASE.has(c.e.slice(12))) { excluidos.push({ autor: e.nombre, m: c.m, motivo: 'espera su herramienta adaptada' }); continue; }
    if (!cumpleEspera(ejecutar(e.config, c.m), c.e)) { excluidos.push({ autor: e.nombre, m: c.m, motivo: 'su propio agente no lo pasa' }); continue; }
    casos.push({ autor: e.nombre, m: c.m, e: c.e });
  }
  const celdas = agentes.map(a => casos.map(c => (c.autor === a.nombre ? null : cumpleEspera(ejecutar(a.config, c.m), c.e))));
  const porCaso = casos.map((c, j) => {
    const col = celdas.map(f => f[j]).filter(x => x !== null);
    return { ...c, enfrentados: col.length, fallos: col.filter(x => !x).length };
  });
  const porAgente = agentes.map((a, i) => {
    const fila = celdas[i].filter(x => x !== null);
    return { nombre: a.nombre, enfrentados: fila.length, pasados: fila.filter(Boolean).length };
  });
  const maxFallos = Math.max(0, ...porCaso.map(c => c.fallos));
  const masDificil = maxFallos > 0 ? porCaso.filter(c => c.fallos === maxFallos) : [];
  const conCasos = porAgente.filter(a => a.enfrentados > 0);
  const tasa = a => a.pasados / a.enfrentados;
  const mejor = conCasos.reduce((m, a) => (!m || tasa(a) > tasa(m) || (tasa(a) === tasa(m) && a.pasados > m.pasados) ? a : m), null);
  const masRobusto = mejor ? conCasos.filter(a => tasa(a) === tasa(mejor) && a.pasados === mejor.pasados) : [];
  return { agentes: agentes.map(a => a.nombre), casos: porCaso, celdas, porAgente, masDificil, masRobusto, excluidos };
}
