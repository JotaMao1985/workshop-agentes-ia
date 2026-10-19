import { useState } from 'react';
import { claveEquipo } from '../motor/marcador.js';
import { FICHAS_FLUJO, HERRAMIENTAS_CASO, MEMORIA_CASO, CONTROL_CASO, ROLES } from '../motor/registro.js';

const CRITERIOS = ['Intención identificada', 'Herramientas cuando correspondía', 'Evitó herramientas innecesarias', 'Control aplicado, incluido el imprevisto', 'Respuesta clara', 'Traza comprensible'];
const nombres = lista => Object.fromEntries(lista);

export default function IIA({ equipos, setEquipos }) {
  const lista = Object.values(equipos);
  const [sel, setSel] = useState(lista.length ? claveEquipo(lista[0].nombre) : '');
  const e = Object.prototype.hasOwnProperty.call(equipos, sel) ? equipos[sel] : null;
  const fijar = (i, v) => setEquipos(prev => (Object.prototype.hasOwnProperty.call(prev, sel) ? { ...prev, [sel]: { ...prev[sel], rubrica: prev[sel].rubrica.map((x, j) => (j === i ? v : x)) } } : prev));
  if (!lista.length) return <div className="tarjeta"><p>Primero importa los registros en «Importar».</p></div>;
  const reg = e && e.registro;
  const F = nombres(FICHAS_FLUJO), H = nombres(HERRAMIENTAS_CASO), M = nombres(MEMORIA_CASO), C = nombres(CONTROL_CASO), K = nombres(ROLES);
  return (
    <>
      <section className="tarjeta">
        <label className="campo"><span>Equipo</span>
          <select value={sel} onChange={ev => setSel(ev.target.value)}>
            {lista.map(x => <option key={claveEquipo(x.nombre)} value={claveEquipo(x.nombre)}>{x.nombre}{x.registro ? '' : ' (sin registro)'}</option>)}
          </select>
        </label>
      </section>
      {e ? (
        <div className="rejilla-2">
          <section className="tarjeta">
            <h2>Registro</h2>
            {!reg ? <p className="nota">Este equipo aún no entregó su registro.</p> : (
              <>
                <p><b>Intención:</b> {reg.i || '—'}</p>
                <p><b>Flujo ({reg.f.length} pasos):</b> {reg.f.map(c => F[c]).join(' → ') || '—'}</p>
                <p><b>Herramientas:</b> {reg.h.map(c => H[c]).join(', ') || '—'}</p>
                <p><b>Memoria:</b> {reg.m.map(c => M[c]).join(', ') || '—'}</p>
                <p><b>Control:</b> {reg.c.map(c => C[c]).join(', ') || '—'}{reg.cn ? ' · ' + reg.cn : ''}</p>
                <p><b>Imprevisto:</b> {reg.im || '—'}</p>
                <p><b>Respuesta final:</b> {reg.r || '—'}</p>
                <p><b>Rol clave:</b> {K[reg.k] || '—'}</p>
              </>
            )}
          </section>
          <section className="tarjeta">
            <h2>Rúbrica · {e.rubrica.reduce((s, x) => s + (x || 0), 0)}/30</h2>
            <p className="nota">0 a 5 por criterio. La clave del caso está en el guion.</p>
            {CRITERIOS.map((c, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{i + 1}. {c}</div>
                <div className="puntos" role="group" aria-label={c}>
                  {[0, 1, 2, 3, 4, 5].map(v => <button key={v} aria-pressed={e.rubrica[i] === v} onClick={() => fijar(i, v)}>{v}</button>)}
                </div>
              </div>
            ))}
          </section>
        </div>
      ) : null}
    </>
  );
}
