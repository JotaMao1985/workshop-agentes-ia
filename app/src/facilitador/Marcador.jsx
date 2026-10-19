import { useMemo, useRef } from 'react';
import { ranking } from '../motor/marcador.js';

function descargar(nombre, contenido, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function Marcador({ equipos, setEquipos }) {
  const filas = useMemo(() => ranking(equipos), [equipos]);
  const archivo = useRef(null);
  const csv = () => {
    const enc = ['puesto', 'equipo', 'parte_I', 'II_A', 'II_B', 'total', 'empate'];
    const lineas = filas.map(f => [f.puesto, '"' + f.nombre.replace(/"/g, '""') + '"', f.parteI, f.iia, f.iib, f.total, f.empate ? 'sí' : 'no'].join(','));
    // BOM de UTF-8: así Excel lee bien las tildes («sí», nombres de equipo).
    descargar('marcador_workshop.csv', '\uFEFF' + [enc.join(','), ...lineas].join('\n'), 'text/csv;charset=utf-8');
  };
  const restaurar = f => {
    if (!f) return;
    f.text().then(t => {
      try { const d = JSON.parse(t); if (d && typeof d === 'object') setEquipos(d); } catch { window.alert('Ese archivo no es un respaldo válido.'); }
    });
  };
  return (
    <>
      <section className="tarjeta desplazable">
        <h2>Marcador</h2>
        {!filas.length ? <p className="nota">Todavía no hay equipos.</p> : (
          <table className="tabla">
            <thead><tr><th className="num">#</th><th>Equipo</th><th className="num">Parte I</th><th className="num">II.A</th><th className="num">II.B</th><th className="num">Total</th></tr></thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.nombre}>
                  <td className="num">{f.puesto}</td>
                  <td>{f.nombre}{f.empate ? <span className="estado neutro" style={{ marginLeft: 6 }}>empate: pregunta relámpago</span> : null}{f.iibFuente === 'codigo' ? <span className="nota"> · II.B por código</span> : null}</td>
                  <td className="num">{f.parteI}/30</td><td className="num">{f.iia}/30</td><td className="num">{f.iib}/40</td><td className="num"><b>{f.total}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="nota">Desempate: II.B, luego II.A, luego el Reto 5; si persiste, la pregunta relámpago del guion.</p>
      </section>
      <section className="tarjeta">
        <h3>Respaldo</h3>
        <div className="fila">
          <button className="boton secundario" onClick={csv} disabled={!filas.length}>Descargar CSV</button>
          <button className="boton secundario" onClick={() => descargar('respaldo_workshop.json', JSON.stringify(equipos), 'application/json')}>Descargar respaldo JSON</button>
          <button className="boton secundario" onClick={() => archivo.current.click()}>Restaurar respaldo</button>
          <input ref={archivo} type="file" accept="application/json" hidden onChange={e => restaurar(e.target.files[0])} />
          <button className="boton peligro" onClick={() => { if (window.confirm('¿Borrar todos los equipos y puntajes de este portátil?')) setEquipos({}); }}>Borrar todo</button>
        </div>
      </section>
    </>
  );
}
