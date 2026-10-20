import { useEffect, useRef, useState } from 'react';
import { Texto, Lista } from '../componentes/Campos.jsx';
import { FICHAS_FLUJO, HERRAMIENTAS_CASO, MEMORIA_CASO, CONTROL_CASO, ROLES, LIM_REG } from '../motor/registro.js';
import { BLOQUE_FICHA } from '../etiquetas.js';

const ETIQ = Object.fromEntries(FICHAS_FLUJO);

function Casillas({ titulo, opciones, valor, alCambiar }) {
  const alternar = c => alCambiar(valor.includes(c) ? valor.filter(x => x !== c) : opciones.map(o => o[0]).filter(x => x === c || valor.includes(x)));
  return (
    <fieldset className="campo" style={{ border: 0, padding: 0, margin: '0 0 12px' }}>
      <legend style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 6 }}>{titulo}</legend>
      <div className="fichas">
        {opciones.map(([c, t]) => (
          <button key={c} type="button" className={'ficha' + (valor.includes(c) ? ' activa' : '')} aria-pressed={valor.includes(c)} onClick={() => alternar(c)}>{t}</button>
        ))}
      </div>
    </fieldset>
  );
}

export default function RegistroIIA({ registro, setRegistro, equipo }) {
  const set = (k, v) => setRegistro({ ...registro, [k]: v });
  const flujo = registro.f || [];
  const [anuncio, setAnuncio] = useState('');
  const foco = useRef(null); // índice del paso que debe recibir el foco después de quitar uno
  const pasos = useRef(null);
  const fichas = useRef(null);
  useEffect(() => {
    if (foco.current === null || !pasos.current) return;
    const bs = pasos.current.querySelectorAll('button.paso');
    // Si no queda ningún paso, el foco vuelve a la primera ficha para seguir armando el flujo.
    (bs[Math.min(foco.current, bs.length - 1)] || fichas.current?.querySelector('button') || null)?.focus();
    foco.current = null;
  }, [flujo.length]);
  const agregar = c => { set('f', [...flujo, c]); setAnuncio(`Paso ${flujo.length + 1} agregado: ${ETIQ[c]}.`); };
  const quitarPaso = (i, enfocar = true) => {
    if (enfocar) foco.current = i;
    set('f', flujo.filter((_, j) => j !== i));
    setAnuncio(`Quitado el paso ${i + 1}: ${ETIQ[flujo[i]]}.`);
  };
  const vaciar = () => {
    if (!window.confirm(`¿Vaciar el flujo? Se borran los ${flujo.length} pasos.`)) return;
    set('f', []);
    setAnuncio('Flujo vaciado.');
  };
  return (
    <>
      <section className="tarjeta">
        <h2>Registro de decisiones · II.A</h2>
        <p className="nota">Caso: el tutor de estudio. Registren lo que hizo su equipo cuando fue el agente. Equipo: <b>{equipo || 'sin nombre'}</b>.</p>
        <Texto etiqueta="¿Qué quería el usuario? (intención)" valor={registro.i} alCambiar={v => set('i', v)} max={LIM_REG.i} area />
      </section>
      <section className="tarjeta">
        <h3>Flujo que siguieron</h3>
        <p className="nota">Toquen las fichas en el orden en que pasaron (pueden repetir: el ciclo es un bucle). Para quitar un paso, tóquenlo.</p>
        <div className="fichas" style={{ marginBottom: 10 }} ref={fichas}>
          {FICHAS_FLUJO.map(([c, t]) => (
            <button key={c} type="button" className={'ficha' + (BLOQUE_FICHA[c] ? '' : ' neutra')} data-b={BLOQUE_FICHA[c] || undefined} disabled={flujo.length >= LIM_REG.f} onClick={() => agregar(c)}>+ {t}</button>
          ))}
        </div>
        <div className="secuencia" ref={pasos}>
          {flujo.length === 0 ? <span className="nota">Aún no hay pasos.</span> : flujo.map((c, i) => (
            <span key={i} className="fila" style={{ gap: 4 }}>
              {i > 0 ? <span className="flecha" aria-hidden="true">→</span> : null}
              <button type="button" className="paso" data-b={BLOQUE_FICHA[c] || undefined} aria-label={`Quitar el paso ${i + 1}: ${ETIQ[c]}`} onClick={() => quitarPaso(i)}>{i + 1}. {ETIQ[c]}</button>
            </span>
          ))}
        </div>
        <p className="oculto-visual" role="status">{anuncio}</p>
        <div className="fila" style={{ marginTop: 8 }}>
          <button className="boton secundario mini" disabled={!flujo.length} onClick={() => quitarPaso(flujo.length - 1, false)}>Quitar el último</button>
          <button className="boton secundario mini" disabled={!flujo.length} onClick={vaciar}>Vaciar</button>
          <span className="nota">{flujo.length}/{LIM_REG.f} pasos</span>
        </div>
      </section>
      <section className="tarjeta">
        <Casillas titulo="Herramientas que usaron" opciones={HERRAMIENTAS_CASO} valor={registro.h || []} alCambiar={v => set('h', v)} />
        <Casillas titulo="Memoria que consultaron" opciones={MEMORIA_CASO} valor={registro.m || []} alCambiar={v => set('m', v)} />
        <Casillas titulo="¿Qué hizo Control?" opciones={CONTROL_CASO} valor={registro.c || []} alCambiar={v => set('c', v)} />
        <Texto etiqueta="Nota sobre Control" valor={registro.cn} alCambiar={v => set('cn', v)} max={LIM_REG.cn} />
      </section>
      <section className="tarjeta">
        <Texto etiqueta="¿Cómo manejaron el imprevisto?" valor={registro.im} alCambiar={v => set('im', v)} max={LIM_REG.im} area />
        <Texto etiqueta="Respuesta final al usuario" valor={registro.r} alCambiar={v => set('r', v)} max={LIM_REG.r} area />
        <Lista etiqueta="Rol clave del equipo" valor={registro.k} alCambiar={v => set('k', v)} opciones={[['', 'Elijan uno…'], ...ROLES]} />
        <p className="nota">Se guarda solo en este celular. Cuando terminen, vayan a «Entregar».</p>
      </section>
    </>
  );
}
