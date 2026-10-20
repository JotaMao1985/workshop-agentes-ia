import { useEffect, useMemo, useRef, useState } from 'react';
import Traza, { RutaTraza } from '../componentes/Traza.jsx';
import QR from '../componentes/QR.jsx';
import Copiar from '../componentes/Copiar.jsx';
import { ejecutar } from '../motor/agente.js';
import { bytesCarga } from '../motor/codigo.js';
import { MISIONES } from '../etiquetas.js';
import { cargaAgente, urlProbador, version4 } from '../vista/entrega.js';

const menosMovimiento = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

// QR con un enlace que abre una copia del agente en otro celular, solo para probar.
function OtroCelular({ config, equipo }) {
  const carga = useMemo(() => cargaAgente(config, equipo), [config, equipo]);
  const url = urlProbador(window.location.origin + window.location.pathname, carga);
  return (
    <>
      <p className="nota">Otra persona del equipo escanea este QR con la cámara de su celular y prueba una copia del agente mientras ustedes siguen configurando. La copia no se edita ni se entrega: si cambian el agente, escanéenlo de nuevo.</p>
      {bytesCarga(url) > 800 ? <div className="aviso-caja">El QR quedó muy cargado ({bytesCarga(url)} bytes): si cuesta leerlo, acerquen más los celulares o usen «Copiar enlace».</div> : null}
      <QR texto={url} titulo="QR para probar el agente en otro celular" />
      <div className="fila" style={{ justifyContent: 'space-between' }}>
        <span className="nota">Versión <b>{version4(carga)}</b>: debe coincidir en los dos celulares.</span>
        <Copiar texto={url} etiqueta="Copiar enlace" />
      </div>
    </>
  );
}

export default function Probar({ config, titulo = 'Prueba tu agente', grande = false, compartir = false, equipo = '' }) {
  const [chat, setChat] = useState([]);
  const [memoriaSesion, setMemoriaSesion] = useState([]);
  const [texto, setTexto] = useState('');
  const [otro, setOtro] = useState(false);
  const fin = useRef(null);

  useEffect(() => { if (chat.length) fin.current?.scrollIntoView?.({ behavior: menosMovimiento() ? 'auto' : 'smooth', block: 'end' }); }, [chat]);

  const enviar = m => {
    const msg = (m ?? texto).trim();
    if (!msg) return;
    // La memoria de sesión pasa de un mensaje al siguiente: lo que se pidió recordar y el estado
    // (una acción pendiente de tu «sí»). Así funciona la confirmación en dos turnos.
    const r = ejecutar(config, msg, memoriaSesion);
    setMemoriaSesion(r.memoriaSesion);
    setChat([...chat, { u: msg, r }]);
    if (m === undefined) setTexto('');
  };

  const recuerdos = memoriaSesion.filter(x => x.t !== 'estado');
  const estado = memoriaSesion.find(x => x.t === 'estado');

  return (
    <>
      <section className="tarjeta">
        <div className="fila" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>{titulo}</h2>
          <button className="boton secundario mini" type="button" disabled={!chat.length} onClick={() => { setChat([]); setMemoriaSesion([]); }}>Nueva conversación</button>
        </div>
        <p className="nota" style={{ marginTop: 8 }}>Escribe como lo haría un usuario. Debajo de cada respuesta está la ruta por los bloques y la traza: qué hizo cada bloque.</p>
        <div className="fichas">
          {MISIONES.map((m, i) => <button key={i} className="ficha" onClick={() => enviar(m)}>Misión {i + 1}: {m}</button>)}
        </div>
        {recuerdos.length ? <p className="nota" style={{ marginTop: 8 }}>Memoria de esta conversación: {recuerdos.map(x => '«' + x.v + '»').join(', ')}</p> : null}
        {compartir ? (
          <details style={{ marginTop: 10 }} open={otro} onToggle={e => setOtro(e.currentTarget.open)}>
            <summary>Probar en otro celular</summary>
            {otro ? <OtroCelular config={config} equipo={equipo} /> : null}
          </details>
        ) : null}
      </section>
      <div className="chat" aria-live="polite">
        {chat.map((x, i) => (
          <div key={i} className="chat">
            <div className="burbuja usuario">{x.u}</div>
            <div className="burbuja agente">
              <div>{x.r.respuesta}</div>
              <RutaTraza pasos={x.r.traza} />
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
        {estado ? (
          <div className="pendiente-chat" role="status">
            <span><b>Memoria guarda:</b> {estado.v}. ¿Lo confirmas?</span>
            <button className="boton mini" type="button" onClick={() => enviar('Sí, confirmo')}>Sí, confirmo</button>
            <button className="boton secundario mini" type="button" onClick={() => enviar('No')}>No</button>
          </div>
        ) : null}
        <label className="oculto-visual" htmlFor="mensaje">Mensaje</label>
        <input id="mensaje" type="text" value={texto} maxLength={300} onChange={e => setTexto(e.target.value)} placeholder="Escribe un mensaje…" style={grande ? { fontSize: '1.1em' } : undefined} />
        <button className="boton naranja" type="submit">Enviar</button>
      </form>
    </>
  );
}
