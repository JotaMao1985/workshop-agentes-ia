import { useMemo, useState } from 'react';
import { sanearEquipos } from '../motor/marcador.js';
import { usePersistente } from '../almacen.js';
import { fnv1a } from '../motor/codigo.js';
import Importar from './Importar.jsx';
import Retos from './Retos.jsx';
import IIA from './IIA.jsx';
import IIB from './IIB.jsx';
import Marcador from './Marcador.jsx';
import Podio from './Podio.jsx';

const PESTANAS = [['importar', 'Importar'], ['retos', 'Retos'], ['iia', 'II.A'], ['iib', 'II.B'], ['marcador', 'Marcador'], ['podio', 'Podio']];
const HUELLA = 1319259372; // huella del PIN; el PIN no está en el código (solo disuade, no es seguridad real)

function sesionOk() { try { return sessionStorage.getItem('taller_fac_ok') === '1'; } catch { return false; } }

export default function Facilitador() {
  const [ok, setOk] = useState(sesionOk);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [pestana, setPestana] = useState('importar');
  const [equiposCrudos, setEquipos] = usePersistente('taller_fac_equipos_v2', {});
  const equipos = useMemo(() => sanearEquipos(equiposCrudos), [equiposCrudos]);
  const [revelar, setRevelar] = useState(false);

  if (!ok) {
    return (
      <>
        <header className="cabecera"><div className="cabecera-fila"><span className="marca">Workshop «Agentes de IA» · <span>facilitador</span></span></div></header>
        <main>
          <form className="tarjeta" onSubmit={e => {
            e.preventDefault();
            if (fnv1a('taller|' + pin.trim()) === HUELLA) { try { sessionStorage.setItem('taller_fac_ok', '1'); } catch { /* sin sesión */ } setOk(true); }
            else setError(true);
          }}>
            <h2>Modo facilitador</h2>
            <label className="campo"><span>PIN</span><input type="password" inputMode="numeric" value={pin} onChange={e => { setPin(e.target.value); setError(false); }} autoComplete="off" /></label>
            {error ? <div className="error-caja">PIN incorrecto.</div> : null}
            <button className="boton" type="submit">Entrar</button>
            <p className="nota"><a href="#/">Volver a la vista del participante</a></p>
          </form>
        </main>
      </>
    );
  }
  return (
    <div className={pestana === 'podio' ? 'proyector' : ''}>
      <header className="cabecera">
        <div className="cabecera-fila"><span className="marca">Workshop «Agentes de IA» · <span>facilitador</span></span><a href="#/proyector" style={{ color: '#fff', fontSize: '.85rem' }}>Vista de proyección</a></div>
        <nav className="pestanas" role="tablist" aria-label="Secciones del facilitador">
          {PESTANAS.map(([k, t]) => <button key={k} role="tab" className="pestana" aria-selected={pestana === k} onClick={() => setPestana(k)}>{t}</button>)}
        </nav>
      </header>
      <main className="ancho">
        {pestana === 'importar' ? <Importar equipos={equipos} setEquipos={setEquipos} /> : null}
        {pestana === 'retos' ? <Retos equipos={equipos} setEquipos={setEquipos} /> : null}
        {pestana === 'iia' ? <IIA equipos={equipos} setEquipos={setEquipos} /> : null}
        {pestana === 'iib' ? <IIB equipos={equipos} revelar={revelar} setRevelar={setRevelar} /> : null}
        {pestana === 'marcador' ? <Marcador equipos={equipos} setEquipos={setEquipos} /> : null}
        {pestana === 'podio' ? <Podio equipos={equipos} /> : null}
      </main>
    </div>
  );
}
