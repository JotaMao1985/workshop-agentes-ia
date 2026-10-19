import { useMemo, useState } from 'react';
import QR from '../componentes/QR.jsx';
import { codificar, bytesCarga, codigoCorto } from '../motor/codigo.js';
import { sanearConfig } from '../motor/config.js';
import { sanearRegistro } from '../motor/registro.js';
import { puntajeIIB } from '../motor/puntaje.js';

function Copiar({ texto }) {
  const [ok, setOk] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); }
    catch { window.prompt('Copia este código:', texto); }
  };
  return <button className="boton secundario mini" onClick={copiar}>{ok ? 'Copiado ✓' : 'Copiar código'}</button>;
}

export default function Entregar({ equipo, config, registro }) {
  const [ver, setVer] = useState('');
  const sinNombre = !equipo.trim();
  const cargaA = useMemo(() => codificar('A', sanearRegistro({ ...registro, equipo })), [registro, equipo]);
  const cfg = useMemo(() => sanearConfig({ ...config, equipo }), [config, equipo]);
  const cargaB = useMemo(() => codificar('B', cfg), [cfg]);
  const corto = useMemo(() => codigoCorto(equipo, puntajeIIB(cfg).total), [cfg, equipo]);
  if (sinNombre) return <div className="tarjeta"><div className="aviso-caja">Primero escribe el nombre de tu equipo en la pestaña «Equipo».</div></div>;
  return (
    <>
      <section className="tarjeta">
        <h2>Entregar · {equipo}</h2>
        <p>Muéstrale el QR al facilitador para que lo escanee con su portátil. Sube el brillo de la pantalla.</p>
        <div className="fila">
          <button className={'boton' + (ver === 'A' ? '' : ' secundario')} onClick={() => setVer(ver === 'A' ? '' : 'A')}>QR del registro II.A</button>
          <button className={'boton' + (ver === 'B' ? '' : ' secundario')} onClick={() => setVer(ver === 'B' ? '' : 'B')}>QR de mi agente II.B</button>
        </div>
      </section>
      {ver === 'A' ? (
        <section className="tarjeta">
          <h3>Registro II.A</h3>
          {bytesCarga(cargaA) > 800 ? <div className="aviso-caja">El QR quedó muy cargado ({bytesCarga(cargaA)} bytes): si cuesta leerlo, acorta los textos del registro.</div> : null}
          <QR texto={cargaA} titulo="QR del registro de la II.A" />
          <div className="fila" style={{ justifyContent: 'space-between' }}><span className="nota">{bytesCarga(cargaA)} bytes</span><Copiar texto={cargaA} /></div>
          <details><summary>Ver el código</summary><div className="codigo">{cargaA}</div></details>
        </section>
      ) : null}
      {ver === 'B' ? (
        <section className="tarjeta">
          <h3>Mi agente II.B</h3>
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
