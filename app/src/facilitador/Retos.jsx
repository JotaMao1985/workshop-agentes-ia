import { claveEquipo } from '../motor/marcador.js';

const TITULOS = ['¿Qué necesita un agente?', '¿Qué aprende una neurona?', '¿Qué arquitectura escogerías?', '¿Puede hacerlo un LLM solo?', '¿Qué componente falta?'];

export default function Retos({ equipos, setEquipos }) {
  const lista = Object.values(equipos);
  const fijar = (e, i, v) => {
    const k = claveEquipo(e.nombre);
    const n = v === '' ? null : Math.max(0, Math.min(6, Math.round(Number(v))));
    setEquipos(prev => ({ ...prev, [k]: { ...prev[k], retos: prev[k].retos.map((x, j) => (j === i ? (Number.isFinite(n) ? n : null) : x)) } }));
  };
  if (!lista.length) return <div className="tarjeta"><p>Primero agrega equipos en «Importar».</p></div>;
  return (
    <section className="tarjeta">
      <h2>Parte I · Retos 1 a 5 (6 pts cada uno)</h2>
      <p className="nota">{TITULOS.map((t, i) => `R${i + 1}: ${t}`).join(' · ')}. Las claves están en el guion.</p>
      <div className="desplazable">
        <table className="tabla">
          <thead><tr><th>Equipo</th>{TITULOS.map((_, i) => <th key={i} className="num">R{i + 1}</th>)}<th className="num">Total</th></tr></thead>
          <tbody>
            {lista.map(e => (
              <tr key={claveEquipo(e.nombre)}>
                <td>{e.nombre}</td>
                {e.retos.map((x, i) => (
                  <td key={i} className="num">
                    <input type="number" min="0" max="6" inputMode="numeric" value={x ?? ''} onChange={ev => fijar(e, i, ev.target.value)}
                      aria-label={`${e.nombre}, reto ${i + 1}`} style={{ width: 58, minHeight: 38, padding: '4px 6px', textAlign: 'right' }} />
                  </td>
                ))}
                <td className="num"><b>{e.retos.reduce((s, x) => s + (x || 0), 0)}</b>/30</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
