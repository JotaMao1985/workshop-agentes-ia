import { useMemo } from 'react';
import Probar from './Probar.jsx';
import { leerProbador } from '../vista/entrega.js';

// Celular probador: una copia del agente que llega en el enlace. Solo sirve para probar: no se guarda,
// no se edita y no se entrega (no toca «Mi agente» ni «Entregar» de este celular).
export default function Probador({ carga }) {
  const r = useMemo(() => leerProbador(carga), [carga]);
  return (
    <>
      <header className="cabecera">
        <div className="cabecera-fila">
          <span className="marca">Workshop «Agentes de IA» · <span>celular probador</span></span>
          <a href="#/" style={{ color: '#fff', fontSize: '.85rem' }}>Salir</a>
        </div>
      </header>
      <main>
        {r.ok ? (
          <>
            <section className="tarjeta">
              <h2 style={{ marginBottom: 4 }}>{r.config.nombre || 'Agente sin nombre'}</h2>
              <p style={{ margin: 0 }}>Equipo <b>{r.config.equipo || 'sin nombre'}</b> · versión <b>{r.version}</b></p>
              <div className="aviso-caja" style={{ marginTop: 10, marginBottom: 0 }}>Esta copia solo sirve para probar: no se edita ni se entrega. Si cambian el agente en el celular principal, la versión cambia: escaneen de nuevo.</div>
            </section>
            <Probar key={r.carga} config={r.config} titulo="Intenten romper el agente" />
          </>
        ) : (
          <section className="tarjeta">
            <h2>No pude abrir esa copia</h2>
            <p>El enlace llegó incompleto o no es de un agente. En el celular principal, vayan a «Probar» › «Probar en otro celular» y escaneen el QR otra vez.</p>
            <a className="boton" href="#/">Ir a la app</a>
          </section>
        )}
      </main>
    </>
  );
}
