import { useMemo } from 'react';
import { claveEquipo } from '../motor/marcador.js';
import { puntajeIIB } from '../motor/puntaje.js';
import escenarios from '../../../datos/escenarios.json';

export default function IIB({ equipos, revelar, setRevelar }) {
  const lista = Object.values(equipos);
  const filas = useMemo(() => lista.map(e => ({ e, p: e.config ? puntajeIIB(e.config) : null })), [equipos]);
  if (!lista.length) return <div className="tarjeta"><p>Primero importa los agentes en «Importar».</p></div>;
  return (
    <>
      <section className="tarjeta">
        <h2>II.B · Evaluación con las variantes</h2>
        <p>Cada agente se vuelve a correr aquí con <b>frases distintas</b> de las de práctica, que prueban la misma propiedad. ¿Su agente memorizó frases o generalizó?</p>
        <button className="boton naranja" onClick={() => setRevelar(!revelar)}>{revelar ? 'Ocultar las variantes' : 'Revelar las variantes'}</button>
        {revelar ? (
          <ol style={{ marginTop: 12 }}>
            {escenarios.propiedades.map(p => <li key={p.id}><b>{p.nombre}:</b> «{p.evaluacion.mensaje}» <span className="nota">(práctica: «{p.practica.mensaje}»)</span></li>)}
          </ol>
        ) : null}
      </section>
      <section className="tarjeta desplazable">
        <table className="tabla">
          <thead><tr><th>Equipo</th>{escenarios.propiedades.map(p => <th key={p.id} className="num">P{p.id}</th>)}<th className="num">Esc.</th><th className="num">Pers.</th><th className="num">II.B</th></tr></thead>
          <tbody>
            {filas.map(({ e, p }) => (
              <tr key={claveEquipo(e.nombre)}>
                <td>{e.nombre}</td>
                {p ? p.escenarios.propiedades.map(x => <td key={x.id} className="num" aria-label={x.pasa ? 'pasa' : 'no pasa'}>{x.pasa ? '✓' : '✗'}</td>)
                  : escenarios.propiedades.map(x => <td key={x.id} className="num">·</td>)}
                <td className="num">{p ? p.escenarios.total : '—'}</td>
                <td className="num">{p ? p.personalizacion.total : '—'}</td>
                <td className="num"><b>{p ? p.total : Number.isFinite(e.iibManual) ? e.iibManual + ' (código)' : '—'}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
