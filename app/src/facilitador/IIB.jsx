import { useMemo, useState } from 'react';
import { claveEquipo } from '../motor/marcador.js';
import { puntajeIIB } from '../motor/puntaje.js';
import { etiquetaEspera } from '../etiquetas.js';
import { torneo } from '../vista/facilitador.js';
import escenarios from '../../../datos/escenarios.json';

const nombres = xs => xs.join(' y ');

// Torneo de casos: cada agente contra el caso de prueba propio de los otros equipos. Mención, sin puntos.
function Torneo({ equipos }) {
  const [ver, setVer] = useState(false);
  const [grande, setGrande] = useState(false);
  const t = useMemo(() => (ver ? torneo(equipos) : null), [ver, equipos]);
  return (
    <section className={'tarjeta torneo' + (grande ? ' grande' : '')}>
      <h2>Torneo de casos <span className="estado neutro" style={{ verticalAlign: 'middle' }}>Mención, sin puntos</span></h2>
      <p>Cada agente contra el caso de prueba que escribió cada uno de los otros equipos. ¿Qué caso rompió más agentes? ¿Qué agente aguantó más?</p>
      <div className="fila">
        <button className="boton naranja" onClick={() => setVer(!ver)}>{ver ? 'Ocultar el torneo' : 'Mostrar el torneo'}</button>
        {ver ? <button className="boton secundario" onClick={() => setGrande(!grande)}>{grande ? 'Letra normal' : 'Letra grande (proyector)'}</button> : null}
      </div>
      {t ? (!t.casos.length ? <p className="nota" style={{ marginTop: 12 }}>Aún no hay casos que puedan entrar al torneo (hacen falta agentes importados por QR con un caso de prueba que su propio agente pase).</p> : (
        <>
          <div className="destacados">
            <div><b>Caso más difícil</b><br />{t.masDificil.length ? t.masDificil.map(c => <span key={c.autor}>«{c.m}» ({c.autor}): tumbó a {c.fallos} de {c.enfrentados}<br /></span>) : 'Ningún caso tumbó a otro agente.'}</div>
            <div><b>Agente más robusto</b><br />{t.masRobusto.length ? <>{nombres(t.masRobusto.map(a => a.nombre))}: {t.masRobusto.length > 1 ? 'pasaron' : 'pasó'} {t.masRobusto[0].pasados} de {t.masRobusto[0].enfrentados}</> : '—'}</div>
          </div>
          <div className="desplazable">
            <table className="tabla">
              <thead><tr><th>Agente ↓ · caso de →</th>{t.casos.map(c => <th key={c.autor} className="num" title={`«${c.m}» → ${etiquetaEspera(c.e)}`}>{c.autor}</th>)}<th className="num">Pasó</th></tr></thead>
              <tbody>
                {t.agentes.map((a, i) => (
                  <tr key={a}>
                    <td>{a}</td>
                    {t.celdas[i].map((x, j) => (x === null
                      ? <td key={j} className="propia" aria-label="su propio caso">—</td>
                      : <td key={j} className={x ? 'pasa' : 'falla'} aria-label={x ? 'pasa' : 'falla'}>{x ? '✓' : '✗'}</td>))}
                    <td className="num">{t.porAgente[i].pasados}/{t.porAgente[i].enfrentados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ol className="nota" style={{ marginTop: 10 }}>
            {t.casos.map(c => <li key={c.autor}><b>{c.autor}:</b> «{c.m}» → {etiquetaEspera(c.e).toLowerCase()} · tumbó a {c.fallos} de {c.enfrentados}</li>)}
          </ol>
          {t.excluidos.length ? <p className="nota">Fuera del torneo: {t.excluidos.map(x => `${x.autor} (${x.motivo})`).join(' · ')}.</p> : null}
        </>
      )) : null}
    </section>
  );
}

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
      <Torneo equipos={equipos} />
    </>
  );
}
