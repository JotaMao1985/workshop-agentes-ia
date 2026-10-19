import { useEffect, useState } from 'react';
import { usePersistente } from './almacen.js';
import { configBase } from './motor/config.js';
import { registroVacio } from './motor/registro.js';
import Equipo from './participante/Equipo.jsx';
import RegistroIIA from './participante/RegistroIIA.jsx';
import MiAgente from './participante/MiAgente.jsx';
import Probar from './participante/Probar.jsx';
import Escenarios from './participante/Escenarios.jsx';
import Entregar from './participante/Entregar.jsx';
import Facilitador from './facilitador/Facilitador.jsx';

const PESTANAS = [['equipo', 'Equipo'], ['registro', 'Registro II.A'], ['mi-agente', 'Mi agente'], ['probar', 'Probar'], ['escenarios', 'Escenarios'], ['entregar', 'Entregar']];

function rutaActual() { return (window.location.hash || '#/').replace(/^#\/?/, ''); }

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

  if (ruta.startsWith('facilitador')) return <Facilitador />;
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
      <header className="cabecera">
        <div className="cabecera-fila">
          <span className="marca">Workshop <span>«Agentes de IA»</span></span>
          {equipo.trim() ? <span className="chip-equipo" title={equipo}>{equipo}</span> : null}
        </div>
        <nav className="pestanas" role="tablist" aria-label="Secciones">
          {PESTANAS.map(([k, t]) => <button key={k} role="tab" className="pestana" aria-selected={pestana === k} onClick={() => ir(k)}>{t}</button>)}
        </nav>
      </header>
      <main>
        {pestana === 'equipo' ? <Equipo equipo={equipo} setEquipo={setEquipo} ir={ir} /> : null}
        {pestana === 'registro' ? <RegistroIIA registro={registro} setRegistro={setRegistro} equipo={equipo} /> : null}
        {pestana === 'mi-agente' ? <MiAgente config={config} setConfig={setConfig} /> : null}
        {pestana === 'probar' ? <Probar config={config} /> : null}
        {pestana === 'escenarios' ? <Escenarios config={config} /> : null}
        {pestana === 'entregar' ? <Entregar equipo={equipo} config={config} registro={registro} /> : null}
        <p className="pie">Workshop «Agentes de IA» · Universidad El Bosque · martes 20 de octubre de 2026<br />Todo se guarda solo en este celular. <a href="#/facilitador">Facilitador</a></p>
      </main>
    </>
  );
}
