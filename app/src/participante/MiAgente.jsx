import { useMemo } from 'react';
import { Texto, Lista, Interruptor, Estado } from '../componentes/Campos.jsx';
import { HERRAMIENTAS, TIPOS_AGENTE, TIPOS_MEMORIA, TIPOS_RECURSO, etiquetaAccion, etiquetaEspera } from '../etiquetas.js';
import { LIMITES, configBase, nombreAdaptadaValido } from '../motor/config.js';
import { personalizacion } from '../motor/puntaje.js';

export default function MiAgente({ config, setConfig }) {
  const c = config;
  const set = (k, v) => setConfig({ ...c, [k]: v });
  const setCtrl = (k, v) => setConfig({ ...c, control: { ...c.control, [k]: v } });
  const herrs = HERRAMIENTAS.map(h => h[0]).concat(c.adaptada && nombreAdaptadaValido(c.adaptada.n) ? [c.adaptada.n] : []);
  const accionesRegla = [['responder', etiquetaAccion('responder')], ['aclarar', etiquetaAccion('aclarar')], ['bloquear', etiquetaAccion('bloquear')],
    ...herrs.map(h => ['herramienta:' + h, etiquetaAccion('herramienta:' + h)])];
  const esperas = [['sin_herramienta', etiquetaEspera('sin_herramienta')], ['bloqueo', etiquetaEspera('bloqueo')], ['aclaracion', etiquetaEspera('aclaracion')],
    ...herrs.map(h => ['herramienta:' + h, etiquetaEspera('herramienta:' + h)])];
  const pz = useMemo(() => personalizacion(c), [c]);

  const cambiarLista = (k, i, campo, v) => set(k, c[k].map((x, j) => (j === i ? { ...x, [campo]: v } : x)));
  const quitar = (k, i) => set(k, c[k].filter((_, j) => j !== i));
  const ad = c.adaptada || { n: '', b: 'buscar_recurso', p: '', f: 'cualquiera' };
  const setAd = (k, v) => set('adaptada', { ...ad, [k]: v });

  return (
    <>
      <section className="tarjeta">
        <h2>Personalización · {pz.total}/12</h2>
        <div className="fichas">
          {pz.items.map(it => <Estado key={it.id} si={it.pasa}>{it.nombre}</Estado>)}
        </div>
        <p className="nota" style={{ marginTop: 8 }}>Cada elemento vale 2 puntos. Los escenarios valen 28 más: míralos en «Escenarios».</p>
      </section>

      <section className="tarjeta">
        <h2>1 · Identidad</h2>
        <Texto etiqueta="Nombre del agente" valor={c.nombre} alCambiar={v => set('nombre', v)} max={LIMITES.nombre} placeholder="Ej.: TutorIA" />
        <Lista etiqueta="Tipo de agente" valor={c.tipo} alCambiar={v => set('tipo', v)} opciones={TIPOS_AGENTE} />
        <Texto etiqueta="Propósito" valor={c.proposito} alCambiar={v => set('proposito', v)} max={LIMITES.proposito} placeholder="Ej.: Ayudarte a estudiar redes neuronales" />
      </section>

      <section className="tarjeta">
        <h2>2 · Instrucciones</h2>
        <p className="nota">Reglas «si dice… → haz…». Tienen prioridad sobre lo que el LLM interpretaría solo. Ojo: una regla demasiado amplia puede romper otros casos.</p>
        <Lista etiqueta="¿Cuándo usar herramientas?" valor={c.modo} alCambiar={v => set('modo', v)}
          opciones={[['solo_si_hace_falta', 'Solo si hace falta'], ['siempre', 'Siempre que pueda']]} />
        {c.reglas.map((r, i) => (
          <div key={i} className="tarjeta" style={{ background: 'var(--superficie-2)', boxShadow: 'none' }}>
            <Texto etiqueta={`Regla ${i + 1}: si el mensaje dice… (palabras separadas por comas)`} valor={r.p} alCambiar={v => cambiarLista('reglas', i, 'p', v)} max={LIMITES.palabras} />
            <Lista etiqueta="…entonces" valor={r.a} alCambiar={v => cambiarLista('reglas', i, 'a', v)} opciones={accionesRegla} />
            <button className="boton peligro mini" onClick={() => quitar('reglas', i)}>Quitar regla</button>
          </div>
        ))}
        <button className="boton secundario" disabled={c.reglas.length >= LIMITES.reglas} onClick={() => set('reglas', [...c.reglas, { p: '', a: 'responder' }])}>+ Agregar regla</button>
      </section>

      <section className="tarjeta">
        <h2>3 · Memoria</h2>
        <p className="nota">Lo que tu agente ya sabe del usuario. El agente la lee antes de decidir. Si alguien escribe «recuerda que…» en «Probar», también se guarda (solo en esa conversación).</p>
        {c.memoria.map((m, i) => (
          <div key={i} className="rejilla-2">
            <Lista etiqueta={`Dato ${i + 1}`} valor={m.t} alCambiar={v => cambiarLista('memoria', i, 't', v)} opciones={TIPOS_MEMORIA} />
            <div>
              <Texto etiqueta="Valor" valor={m.v} alCambiar={v => cambiarLista('memoria', i, 'v', v)} max={LIMITES.valorMemoria}
                placeholder={m.t === 'dias' ? 'Ej.: 2' : m.t === 'horas' ? 'Ej.: 1' : m.t === 'correo_grupo' ? 'grupo@ejemplo.edu' : ''} />
              <button className="boton peligro mini" onClick={() => quitar('memoria', i)}>Quitar</button>
            </div>
          </div>
        ))}
        <button className="boton secundario" disabled={c.memoria.length >= LIMITES.memoria} onClick={() => set('memoria', [...c.memoria, { t: 'preferencia', v: '' }])}>+ Agregar dato</button>
      </section>

      <section className="tarjeta">
        <h2>4 · Herramientas</h2>
        {HERRAMIENTAS.map(([h, d]) => (
          <Interruptor key={h} titulo={h} detalle={d} activo={c.herramientas.includes(h)}
            alCambiar={on => set('herramientas', on ? HERRAMIENTAS.map(x => x[0]).filter(x => x === h || c.herramientas.includes(x)) : c.herramientas.filter(x => x !== h))} />
        ))}
        <h3 style={{ marginTop: 14 }}>Herramienta adaptada</h3>
        <p className="nota">Una herramienta nueva hecha a partir de otra: nombre propio y palabras que la activan.</p>
        <div className="rejilla-2">
          <div>
            <Texto etiqueta="Nombre (minúsculas y _ )" valor={ad.n} alCambiar={v => setAd('n', v.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} max={LIMITES.adaptadaNombre} placeholder="Ej.: buscar_video" />
            {ad.n && !nombreAdaptadaValido(ad.n) ? <small className="nota" style={{ color: 'var(--error)' }}>Usa de 3 a 24 caracteres, empieza por letra y no repitas un nombre existente.</small> : null}
          </div>
          <Lista etiqueta="Basada en" valor={ad.b} alCambiar={v => setAd('b', v)} opciones={HERRAMIENTAS.map(h => [h[0], h[0]])} />
        </div>
        <Texto etiqueta="Palabras que la activan (separadas por comas)" valor={ad.p} alCambiar={v => setAd('p', v)} max={LIMITES.palabras} placeholder="Ej.: video, videos" />
        {ad.b === 'buscar_recurso' ? <Lista etiqueta="Solo recursos de tipo" valor={ad.f} alCambiar={v => setAd('f', v)} opciones={TIPOS_RECURSO} /> : null}
        {c.adaptada ? <button className="boton peligro mini" onClick={() => set('adaptada', null)}>Quitar herramienta adaptada</button> : null}
      </section>

      <section className="tarjeta">
        <h2>5 · Control</h2>
        <Lista etiqueta="Antes de enviar correos" valor={c.control.envio} alCambiar={v => setCtrl('envio', v)}
          opciones={[['apagado', 'No revisar (apagado)'], ['pedir', 'Pedir autorización explícita'], ['siempre_bloquear', 'Bloquear siempre']]} />
        <Interruptor titulo="Exigir argumentos completos" detalle="Si el LLM tuvo que suponer un dato, no se llama la herramienta: se pregunta." activo={c.control.args} alCambiar={v => setCtrl('args', v)} />
        <Interruptor titulo="Evaluador de fuentes (después)" detalle="Revisa que la respuesta no cite fuentes inventadas." activo={c.control.fuentes} alCambiar={v => setCtrl('fuentes', v)} />
        <Interruptor titulo="Bloquear acciones peligrosas" detalle="Borrar, eliminar, contraseñas…: no se hacen." activo={c.control.peligrosas} alCambiar={v => setCtrl('peligrosas', v)} />
        <h3 style={{ marginTop: 14 }}>Hooks propios</h3>
        {c.hooks.map((h, i) => (
          <div key={i} className="rejilla-2">
            <Lista etiqueta={`Hook ${i + 1}`} valor={h.k} alCambiar={v => cambiarLista('hooks', i, 'k', v)}
              opciones={[['contiene', 'Bloquear si el mensaje contiene…'], ['confirmar', 'Pedir confirmación antes de usar…']]} />
            <div>
              {h.k === 'confirmar'
                ? <Lista etiqueta="Herramienta" valor={h.v} alCambiar={v => cambiarLista('hooks', i, 'v', v)} opciones={[['', 'Elige…'], ...herrs.map(x => [x, x])]} />
                : <Texto etiqueta="Palabras (separadas por comas)" valor={h.v} alCambiar={v => cambiarLista('hooks', i, 'v', v)} max={LIMITES.palabras} />}
              <button className="boton peligro mini" onClick={() => quitar('hooks', i)}>Quitar</button>
            </div>
          </div>
        ))}
        <button className="boton secundario" disabled={c.hooks.length >= LIMITES.hooks} onClick={() => set('hooks', [...c.hooks, { k: 'contiene', v: '' }])}>+ Agregar hook</button>
      </section>

      <section className="tarjeta">
        <h2>6 · Caso de prueba propio</h2>
        <Texto etiqueta="Mensaje de un usuario" valor={c.caso ? c.caso.m : ''} alCambiar={v => set('caso', { m: v, e: c.caso ? c.caso.e : 'sin_herramienta' })} max={LIMITES.casoMensaje} />
        <Lista etiqueta="¿Qué debería pasar?" valor={c.caso ? c.caso.e : 'sin_herramienta'} alCambiar={v => set('caso', { m: c.caso ? c.caso.m : '', e: v })} opciones={esperas} />
        <p className="nota">Cuenta si tu agente lo cumple. Míralo en «Escenarios».</p>
      </section>

      <div className="fila">
        <button className="boton peligro" onClick={() => { if (window.confirm('¿Volver al agente base? Se pierde tu configuración.')) setConfig({ ...configBase(), equipo: c.equipo }); }}>Volver al agente base</button>
      </div>
    </>
  );
}
