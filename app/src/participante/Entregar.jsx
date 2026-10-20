import { useEffect, useMemo, useState } from 'react';
import QR from '../componentes/QR.jsx';
import Copiar from '../componentes/Copiar.jsx';
import { bytesCarga, codigoCorto } from '../motor/codigo.js';
import { sanearConfig } from '../motor/config.js';
import { puntajeIIB, personalizacion } from '../motor/puntaje.js';
import { cargaAgente, cargaRegistro, huella, pendientesRegistro, pendientesAgente } from '../vista/entrega.js';

function Pendientes({ titulo, lista, listo }) {
  if (!lista.length) return <p className="nota">✓ {listo}</p>;
  return (
    <div className="aviso-caja">
      <b>{titulo}</b>
      <ul className="pendientes">{lista.map(t => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

export default function Entregar({ equipo, config, registro, qrMostrado, setQrMostrado }) {
  const [ver, setVer] = useState('');
  const sinNombre = !equipo.trim();
  const cargaA = useMemo(() => cargaRegistro(registro, equipo), [registro, equipo]);
  const cargaB = useMemo(() => cargaAgente(config, equipo), [config, equipo]);
  const cfg = useMemo(() => sanearConfig({ ...config, equipo }), [config, equipo]);
  const corto = useMemo(() => codigoCorto(equipo, puntajeIIB(cfg).total), [cfg, equipo]);
  const faltaReg = useMemo(() => pendientesRegistro(registro), [registro]);
  const faltaAg = useMemo(() => pendientesAgente(personalizacion(config)), [config]);
  const actual = { A: huella(cargaA), B: huella(cargaB) };
  // Huella del último QR mostrado: si después cambian el registro o el agente, se avisa que el QR quedó viejo.
  useEffect(() => {
    if (sinNombre || !ver) return;
    const h = actual[ver];
    setQrMostrado(prev => (prev && prev[ver] === h ? prev : { ...(prev || {}), [ver]: h }));
  }, [ver, actual.A, actual.B, sinNombre]);
  const viejo = t => ver !== t && Number.isFinite(qrMostrado?.[t]) && qrMostrado[t] !== actual[t];

  if (sinNombre) return <div className="tarjeta"><div className="aviso-caja">Primero escribe el nombre de tu equipo en la pestaña «Equipo».</div></div>;
  return (
    <>
      <section className="tarjeta">
        <h2>Entregar · {equipo}</h2>
        <p>Muéstrale el QR al facilitador para que lo escanee con su portátil. Sube el brillo de la pantalla.</p>
        {viejo('A') ? <div className="aviso-caja">Cambiaron el registro después de mostrar su QR: si ya lo escanearon, vuelvan a mostrarlo.</div> : null}
        {viejo('B') ? <div className="aviso-caja">Cambiaron el agente después de mostrar su QR: si ya lo escanearon, vuelvan a mostrarlo.</div> : null}
        <div className="fila">
          <button className={'boton' + (ver === 'A' ? '' : ' secundario')} onClick={() => setVer(ver === 'A' ? '' : 'A')}>QR del registro II.A</button>
          <button className={'boton' + (ver === 'B' ? '' : ' secundario')} onClick={() => setVer(ver === 'B' ? '' : 'B')}>QR de mi agente II.B</button>
        </div>
      </section>
      {ver === 'A' ? (
        <section className="tarjeta">
          <h3>Registro II.A</h3>
          <Pendientes titulo="Antes de entregar, revisen lo que quedó vacío:" lista={faltaReg} listo="Todos los campos del registro tienen algo." />
          {bytesCarga(cargaA) > 800 ? <div className="aviso-caja">El QR quedó muy cargado ({bytesCarga(cargaA)} bytes): si cuesta leerlo, acorta los textos del registro.</div> : null}
          <QR texto={cargaA} titulo="QR del registro de la II.A" />
          <div className="fila" style={{ justifyContent: 'space-between' }}><span className="nota">{bytesCarga(cargaA)} bytes</span><Copiar texto={cargaA} /></div>
          <details><summary>Ver el código</summary><div className="codigo">{cargaA}</div></details>
        </section>
      ) : null}
      {ver === 'B' ? (
        <section className="tarjeta">
          <h3>Mi agente II.B</h3>
          <Pendientes titulo="Personalización que aún no cuenta (2 puntos cada una):" lista={faltaAg} listo="Los 6 elementos de personalización cuentan." />
          {bytesCarga(cargaB) > 800 ? <div className="aviso-caja">El QR quedó muy cargado ({bytesCarga(cargaB)} bytes) y puede costar leerlo. Si falla, acorta los textos de tu agente o usa el código corto.</div> : null}
          <QR texto={cargaB} titulo="QR de la configuración del agente" />
          <div className="fila" style={{ justifyContent: 'space-between' }}><span className="nota">{bytesCarga(cargaB)} bytes</span><Copiar texto={cargaB} /></div>
          <details><summary>Ver el código</summary><div className="codigo">{cargaB}</div></details>
          <h3 style={{ marginTop: 12 }}>Código corto de respaldo</h3>
          <p className="nota">Solo si el QR no funciona: díctale este código al facilitador junto con el nombre exacto del equipo.</p>
          <div className="codigo-corto" aria-label="Código corto">{corto}</div>
        </section>
      ) : null}
    </>
  );
}
