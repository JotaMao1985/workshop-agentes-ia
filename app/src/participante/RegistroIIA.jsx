import { Texto, Lista } from '../componentes/Campos.jsx';
import { FICHAS_FLUJO, HERRAMIENTAS_CASO, MEMORIA_CASO, CONTROL_CASO, ROLES, LIM_REG } from '../motor/registro.js';

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
  return (
    <>
      <section className="tarjeta">
        <h2>Registro de decisiones · II.A</h2>
        <p className="nota">Caso: el tutor de estudio. Registren lo que hizo su equipo cuando fue el agente. Equipo: <b>{equipo || 'sin nombre'}</b>.</p>
        <Texto etiqueta="¿Qué quería el usuario? (intención)" valor={registro.i} alCambiar={v => set('i', v)} max={LIM_REG.i} area />
      </section>
      <section className="tarjeta">
        <h3>Flujo que siguieron</h3>
        <p className="nota">Toquen las fichas en el orden en que pasaron (pueden repetir: el ciclo es un bucle).</p>
        <div className="fichas" style={{ marginBottom: 10 }}>
          {FICHAS_FLUJO.map(([c, t]) => (
            <button key={c} type="button" className="ficha" disabled={flujo.length >= LIM_REG.f} onClick={() => set('f', [...flujo, c])}>+ {t}</button>
          ))}
        </div>
        <div className="secuencia" aria-live="polite">
          {flujo.length === 0 ? <span className="nota">Aún no hay pasos.</span> : flujo.map((c, i) => (
            <span key={i} className="fila" style={{ gap: 4 }}>
              {i > 0 ? <span className="flecha" aria-hidden="true">→</span> : null}
              <span className="paso">{i + 1}. {ETIQ[c]}</span>
            </span>
          ))}
        </div>
        <div className="fila" style={{ marginTop: 8 }}>
          <button className="boton secundario mini" disabled={!flujo.length} onClick={() => set('f', flujo.slice(0, -1))}>Quitar el último</button>
          <button className="boton secundario mini" disabled={!flujo.length} onClick={() => set('f', [])}>Vaciar</button>
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
