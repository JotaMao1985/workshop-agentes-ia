import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePersistente, almacenDisponible } from './almacen.js';
import { configBase } from './motor/config.js';
import { registroVacio } from './motor/registro.js';
import Equipo from './participante/Equipo.jsx';
import RegistroIIA from './participante/RegistroIIA.jsx';
import MiAgente from './participante/MiAgente.jsx';
import Probar from './participante/Probar.jsx';
import Probador from './participante/Probador.jsx';
import Escenarios from './participante/Escenarios.jsx';
import Entregar from './participante/Entregar.jsx';
import Facilitador from './facilitador/Facilitador.jsx';

const PESTANAS = [['equipo', 'Equipo'], ['registro', 'Registro II.A'], ['mi-agente', 'Mi agente'], ['probar', 'Probar'], ['escenarios', 'Escenarios'], ['entregar', 'Entregar']];

function rutaActual() { return (window.location.hash || '#/').replace(/^#\/?/, ''); }

// Cabecera plegable: mide la fila del título (lo que se esconde al bajar) y el alto que queda pegado,
// para que el marcador de «Mi agente» se pegue justo debajo de las pestañas.
function useMedidasCabecera(ref, clave) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const medir = () => {
      const fila = el.querySelector('.cabecera-fila');
      const pliegue = fila ? fila.offsetHeight + (parseFloat(getComputedStyle(el).paddingTop) || 0) : 0;
      document.documentElement.style.setProperty('--pliegue', pliegue + 'px');
      document.documentElement.style.setProperty('--alto-pegado', Math.max(0, el.offsetHeight - pliegue) + 'px');
    };
    medir();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', medir); return () => window.removeEventListener('resize', medir); }
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clave]);
}

export default function App() {
  const [ruta, setRuta] = useState(rutaActual);
  useEffect(() => {
    const f = () => { setRuta(rutaActual()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const [equipo, setEquipo] = usePersistente('taller_equipo_v1', '');
  const [config, setConfig] = usePersistente('taller_config_v1', configBase());
  const [registro, setRegistro] = usePersistente('taller_registro_v1', registroVacio());
  const [qrCrudo, setQrMostrado] = usePersistente('taller_qr_mostrado_v1', {});
  const qrMostrado = qrCrudo && typeof qrCrudo === 'object' && !Array.isArray(qrCrudo) ? qrCrudo : {};
  const [guarda] = useState(almacenDisponible);
  const cabecera = useRef(null);
  useMedidasCabecera(cabecera, ruta);

  if (ruta.startsWith('facilitador')) return <Facilitador />;
  if (ruta.startsWith('probador')) return <Probador carga={ruta} />;
  if (ruta.startsWith('proyector')) {
    return (
      <div className="proyector">
        <header className="cabecera"><div className="cabecera-fila"><span className="marca">Workshop «Agentes de IA» · <span>el agente base</span></span><a href="#/facilitador" style={{ color: '#fff', fontSize: '.8rem' }}>Volver</a></div></header>
        <main><Probar config={configBase()} titulo="El agente base (viene incompleto a propósito)" grande /></main>
      </div>
    );
  }
  const pestana = PESTANAS.some(p => p[0] === ruta) ? ruta : 'equipo';
  const ir = k => { window.location.hash = '#/' + k; };
  return (
    <>
      <header className="cabecera cabecera-plegable" ref={cabecera}>
        <div className="cabecera-fila">
          <span className="marca">Workshop <span>«Agentes de IA»</span></span>
          {equipo.trim() ? <span className="chip-equipo" title={equipo}>{equipo}</span> : null}
        </div>
        <nav className="pestanas" role="tablist" aria-label="Secciones">
          {PESTANAS.map(([k, t]) => <button key={k} role="tab" className="pestana" aria-selected={pestana === k} onClick={() => ir(k)}>{t}</button>)}
        </nav>
      </header>
      <main>
        {!guarda ? <div className="aviso-caja"><b>Este navegador no está guardando.</b> Si cierran la pestaña, se pierde lo que hagan. Abran la app en el navegador normal del celular (no en modo privado ni dentro de otra app) y no cierren esta pestaña hasta entregar.</div> : null}
        {pestana === 'equipo' ? <Equipo equipo={equipo} setEquipo={setEquipo} ir={ir} /> : null}
        {pestana === 'registro' ? <RegistroIIA registro={registro} setRegistro={setRegistro} equipo={equipo} /> : null}
        {pestana === 'mi-agente' ? <MiAgente config={config} setConfig={setConfig} equipo={equipo} qrMostrado={qrMostrado} /> : null}
        {pestana === 'probar' ? <Probar config={config} compartir equipo={equipo} /> : null}
        {pestana === 'escenarios' ? <Escenarios config={config} /> : null}
        {pestana === 'entregar' ? <Entregar equipo={equipo} config={config} registro={registro} qrMostrado={qrMostrado} setQrMostrado={setQrMostrado} /> : null}
        <p className="pie">Workshop «Agentes de IA» · Universidad El Bosque · martes 20 de octubre de 2026<br />Autores: Javier Mauricio Sierra y Andrés Mauricio Suárez Mantilla<br />Todo se guarda solo en este celular. <a href="#/facilitador">Facilitador</a></p>
      </main>
    </>
  );
}
