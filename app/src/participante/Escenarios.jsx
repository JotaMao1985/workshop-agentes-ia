import { useMemo } from 'react';
import Traza from '../componentes/Traza.jsx';
import { Estado } from '../componentes/Campos.jsx';
import { correrBateria, personalizacion } from '../motor/puntaje.js';

export default function Escenarios({ config }) {
  const b = useMemo(() => correrBateria(config, 'practica'), [config]);
  const pz = useMemo(() => personalizacion(config), [config]);
  return (
    <>
      <section className="tarjeta">
        <h2>Escenarios comunes (práctica)</h2>
        <div className="fila" style={{ justifyContent: 'space-between' }}>
          <span>Escenarios <b className="puntaje-grande">{b.total}</b>/28</span>
          <span>Personalización <b className="puntaje-grande">{pz.total}</b>/12</span>
        </div>
        <div className="aviso-caja" style={{ marginTop: 10 }}>
          La evaluación oficial usa <b>otras frases</b> que piden lo mismo, y se revelan al final. Si tu agente solo «memoriza» estas frases, puede fallar. Arréglalo con la arquitectura (hooks, memoria, herramientas), no con trucos de palabras.
        </div>
      </section>
      <section className="tarjeta">
        {b.propiedades.map(p => (
          <div key={p.id} className="escenario">
            <div className="fila" style={{ justifyContent: 'space-between' }}>
              <b>P{p.id} · {p.nombre}</b>
              <Estado si={p.pasa}>{p.puntos} pts</Estado>
            </div>
            <div className="msg">«{p.mensaje}»</div>
            <div>→ {p.resultado.respuesta}</div>
            <details>
              <summary>Ver la traza</summary>
              <Traza pasos={p.resultado.traza} />
            </details>
          </div>
        ))}
      </section>
      <section className="tarjeta">
        <h3>Tu caso de prueba</h3>
        {config.caso && config.caso.m ? (
          <Estado si={pz.items.find(i => i.id === 'caso').pasa}>«{config.caso.m}»</Estado>
        ) : <p className="nota">Aún no tienes uno. Créalo en «Mi agente», sección 6.</p>}
      </section>
    </>
  );
}
