import { useMemo, useState } from 'react';
import { ranking } from '../motor/marcador.js';

export default function Podio({ equipos }) {
  const filas = useMemo(() => ranking(equipos), [equipos]);
  const [paso, setPaso] = useState(0);
  const primero = filas.filter(f => f.puesto === 1);
  const segundo = filas.filter(f => f.puesto === 2);
  const tercero = filas.filter(f => f.puesto === 3);
  const lugar = (cls, num, fs, visible) => (
    <div className={'lugar ' + cls}>
      <div className="numero">{num}</div>
      {visible ? fs.map(f => <div key={f.nombre}><div className="nombre">{f.nombre}</div><div className="total">{f.total} puntos</div></div>) : <div className="nombre">?</div>}
      {visible && fs.length > 1 ? <div className="nota">Empate: pregunta relámpago</div> : null}
    </div>
  );
  if (!filas.length) return <div className="tarjeta"><p>Todavía no hay equipos.</p></div>;
  return (
    <section>
      <div className="podio">
        {tercero.length ? lugar('tercero', '3.º', tercero, paso >= 1) : null}
        {lugar('segundo', '2.º', segundo, paso >= 2)}
        {lugar('primero', '1.º', primero, paso >= 3)}
      </div>
      <div className="fila" style={{ justifyContent: 'center' }}>
        <button className="boton naranja" onClick={() => setPaso(Math.min(3, paso + 1))} disabled={paso >= 3}>{paso === 0 ? 'Revelar 3.º' : paso === 1 ? 'Revelar 2.º' : 'Revelar 1.º'}</button>
        <button className="boton secundario" onClick={() => setPaso(0)}>Ocultar</button>
      </div>
      <p className="nota" style={{ textAlign: 'center', marginTop: 16 }}>La inteligencia aparente de un agente no está solo en el modelo: está en la interacción entre modelo, herramientas, memoria, validaciones, estado, trazas y diseño del flujo.</p>
    </section>
  );
}
