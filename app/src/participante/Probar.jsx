import { useEffect, useRef, useState } from 'react';
import Traza from '../componentes/Traza.jsx';
import { ejecutar } from '../motor/agente.js';
import { MISIONES } from '../etiquetas.js';

export default function Probar({ config, titulo = 'Prueba tu agente', grande = false }) {
  const [chat, setChat] = useState([]);
  const [memoriaSesion, setMemoriaSesion] = useState([]);
  const [texto, setTexto] = useState('');
  const fin = useRef(null);

  useEffect(() => { fin.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }); }, [chat]);

  const enviar = m => {
    const msg = (m ?? texto).trim();
    if (!msg) return;
    // La memoria de sesión pasa de un mensaje al siguiente: lo que se pidió recordar y el estado
    // (una acción pendiente de tu «sí»). Así funciona la confirmación en dos turnos.
    const r = ejecutar(config, msg, memoriaSesion);
    setMemoriaSesion(r.memoriaSesion);
    setChat([...chat, { u: msg, r }]);
    setTexto('');
  };

  const recuerdos = memoriaSesion.filter(x => x.t !== 'estado');
  const estado = memoriaSesion.find(x => x.t === 'estado');

  return (
    <>
      <section className="tarjeta">
        <h2>{titulo}</h2>
        <p className="nota">Escribe como lo haría un usuario. Debajo de cada respuesta está la traza: qué hizo cada bloque.</p>
        <div className="fichas">
          {MISIONES.map((m, i) => <button key={i} className="ficha" onClick={() => enviar(m)}>Misión {i + 1}: {m}</button>)}
        </div>
        {recuerdos.length ? <p className="nota" style={{ marginTop: 8 }}>Memoria de esta conversación: {recuerdos.map(x => '«' + x.v + '»').join(', ')}</p> : null}
        {estado ? <p className="nota" style={{ marginTop: 8 }}>Estado en memoria: {estado.v}.</p> : null}
      </section>
      <div className="chat" aria-live="polite">
        {chat.map((x, i) => (
          <div key={i} className="chat">
            <div className="burbuja usuario">{x.u}</div>
            <div className="burbuja agente">
              <div>{x.r.respuesta}</div>
              <details open={i === chat.length - 1}>
                <summary>Ver la traza ({x.r.traza.length} pasos)</summary>
                <Traza pasos={x.r.traza} animada={i === chat.length - 1} />
              </details>
            </div>
          </div>
        ))}
        <div ref={fin} />
      </div>
      <form className="entrada-chat" onSubmit={e => { e.preventDefault(); enviar(); }}>
        <label className="oculto-visual" htmlFor="mensaje">Mensaje</label>
        <input id="mensaje" type="text" value={texto} maxLength={300} onChange={e => setTexto(e.target.value)} placeholder="Escribe un mensaje…" style={grande ? { fontSize: '1.1em' } : undefined} />
        <button className="boton naranja" type="submit">Enviar</button>
        {chat.length ? <button className="boton secundario" type="button" onClick={() => { setChat([]); setMemoriaSesion([]); }}>Limpiar</button> : null}
      </form>
    </>
  );
}
