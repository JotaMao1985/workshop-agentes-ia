import { useEffect, useMemo, useRef, useState } from 'react';
import { Texto, Lista, Interruptor } from '../componentes/Campos.jsx';
import { HERRAMIENTAS, TIPOS_AGENTE, TIPOS_MEMORIA, TIPOS_RECURSO, BLOQUES, DUENOS, etiquetaAccion, etiquetaEspera } from '../etiquetas.js';
import { LIMITES, configBase, nombreAdaptadaValido } from '../motor/config.js';
import { useDiferido } from '../componentes/ganchos.js';
import { medir, diferencias } from '../vista/marcadorVivo.js';

// A qué sección lleva cada ficha de personalización.
const SECCION = { identidad: 'sec-identidad', instrucciones: 'sec-instrucciones', memoria: 'sec-memoria', adaptada: 'sec-adaptada', hook: 'sec-hooks', caso: 'sec-caso' };

const menosMovimiento = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

// Lleva a una sección dejando a la vista su título, debajo de la cabecera y del marcador pegados.
function irA(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const barra = document.querySelector('.barra-marcador');
  const off = barra ? (parseFloat(getComputedStyle(barra).top) || 0) + barra.offsetHeight + 10 : 100;
  // Primero el foco (sin mover), luego el desplazamiento: enfocar después corta el desplazamiento suave.
  try { el.focus({ preventScroll: true }); } catch { /* sin foco */ }
  // Sin pasarse del final de la página: algunos navegadores no hacen el desplazamiento suave si el destino se pasa.
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const top = Math.min(max, Math.max(0, el.getBoundingClientRect().top + window.scrollY - off));
  window.scrollTo({ top, behavior: menosMovimiento() ? 'auto' : 'smooth' });
}

// Título de sección con su dueño de bloque: quien hizo ese rol en la II.A.
function Titulo({ id, dueno, children }) {
  const b = DUENOS[dueno];
  return (
    <div className="seccion-titulo">
      <h2 id={id} tabIndex={-1}>{children}</h2>
      <span className="dueno" data-b={b}><span className="oculto-visual">La configura: </span>{BLOQUES[b]}</span>
    </div>
  );
}

// Marcador vivo: puntaje de práctica a la vista mientras configuran, y aviso de lo que cambió.
function Marcador({ m, viejo }) {
  const previo = useRef(null);
  const reloj = useRef(null);
  const [avisos, setAvisos] = useState([]);
  useEffect(() => {
    const d = diferencias(previo.current, m);
    previo.current = m;
    if (!d.length) return;
    setAvisos(d);
    clearTimeout(reloj.current);
    reloj.current = setTimeout(() => setAvisos([]), 4500);
  }, [m]);
  useEffect(() => () => clearTimeout(reloj.current), []);
  return (
    <div className="barra-marcador">
      <div className="cifras">
        <span>Escenarios <b>{m.esc}</b>/28</span>
        <span>Personalización <b>{m.pers}</b>/12</span>
        <span className="version" title="Cambia con cada ajuste: sirve para comparar con el celular probador">versión {m.version}</span>
      </div>
      {viejo ? <div className="viejo">Cambiaste tu agente después de mostrar el QR: si ya lo escanearon, vuelve a mostrarlo en <a href="#/entregar">«Entregar»</a>.</div> : null}
      <div className="barra-aviso" role="status" aria-live="polite" aria-atomic="true">
        {avisos.length ? <div className={avisos[0].si ? 'si' : 'no'}>{avisos[0].texto}{avisos.length > 1 ? <span className="mas-n"> · y {avisos.length - 1} cambio{avisos.length > 2 ? 's' : ''} más</span> : null}</div> : null}
      </div>
    </div>
  );
}

export default function MiAgente({ config, setConfig, equipo = '', qrMostrado = {} }) {
  const c = config;
  const set = (k, v) => setConfig({ ...c, [k]: v });
  const setCtrl = (k, v) => setConfig({ ...c, control: { ...c.control, [k]: v } });
  const herrs = HERRAMIENTAS.map(h => h[0]).concat(c.adaptada && nombreAdaptadaValido(c.adaptada.n) ? [c.adaptada.n] : []);
  const accionesRegla = [['responder', etiquetaAccion('responder')], ['aclarar', etiquetaAccion('aclarar')], ['bloquear', etiquetaAccion('bloquear')],
    ...herrs.map(h => ['herramienta:' + h, etiquetaAccion('herramienta:' + h)])];
  const esperas = [['sin_herramienta', etiquetaEspera('sin_herramienta')], ['bloqueo', etiquetaEspera('bloqueo')], ['aclaracion', etiquetaEspera('aclaracion')],
    ...herrs.map(h => ['herramienta:' + h, etiquetaEspera('herramienta:' + h)])];
  const diferida = useDiferido(c, 300);
  const m = useMemo(() => medir(diferida, equipo), [diferida, equipo]);
  const viejo = Number.isFinite(qrMostrado?.B) && qrMostrado.B !== m.huellaB;

  const cambiarLista = (k, i, campo, v) => set(k, c[k].map((x, j) => (j === i ? { ...x, [campo]: v } : x)));
  const quitar = (k, i) => set(k, c[k].filter((_, j) => j !== i));
  const ad = c.adaptada || { n: '', b: 'buscar_recurso', p: '', f: 'cualquiera' };
  const setAd = (k, v) => set('adaptada', { ...ad, [k]: v });

  return (
    <>
      <Marcador m={m} viejo={viejo} />

      <section className="tarjeta">
        <h2>Personalización · {m.pers}/12</h2>
        <div className="fichas">
          {m.items.map(it => (
            <button key={it.id} type="button" className={'estado ' + (it.pasa ? 'si' : 'pendiente')} onClick={() => irA(SECCION[it.id])}>
              {it.pasa ? '✓' : '○'} {it.nombre}<span className="oculto-visual">{it.pasa ? ' (cuenta)' : ' (pendiente)'}: ir a la sección</span>
            </button>
          ))}
        </div>
        <p className="nota" style={{ marginTop: 8 }}>Cada elemento vale 2 puntos; toca uno para ir a su sección. Los escenarios valen 28 más: míralos en «Escenarios».</p>
        <p className="nota"><b>Pásense el celular:</b> cada sección la configura quien hizo ese rol en la II.A (lo dice la etiqueta de color junto al título).</p>
      </section>

      <section className="tarjeta">
        <Titulo id="sec-identidad" dueno="identidad">1 · Identidad</Titulo>
        <Texto etiqueta="Nombre del agente" valor={c.nombre} alCambiar={v => set('nombre', v)} max={LIMITES.nombre} placeholder="Ej.: TutorIA" />
        <Lista etiqueta="Tipo de agente" valor={c.tipo} alCambiar={v => set('tipo', v)} opciones={TIPOS_AGENTE} />
        <Texto etiqueta="Propósito" valor={c.proposito} alCambiar={v => set('proposito', v)} max={LIMITES.proposito} placeholder="Ej.: Ayudarte a estudiar redes neuronales" />
      </section>

      <section className="tarjeta">
        <Titulo id="sec-instrucciones" dueno="instrucciones">2 · Instrucciones</Titulo>
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
        <Titulo id="sec-memoria" dueno="memoria">3 · Memoria</Titulo>
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
        <Titulo id="sec-herramientas" dueno="herramientas">4 · Herramientas</Titulo>
        {HERRAMIENTAS.map(([h, d]) => (
          <Interruptor key={h} titulo={h} detalle={d} activo={c.herramientas.includes(h)}
            alCambiar={on => set('herramientas', on ? HERRAMIENTAS.map(x => x[0]).filter(x => x === h || c.herramientas.includes(x)) : c.herramientas.filter(x => x !== h))} />
        ))}
        <h3 id="sec-adaptada" tabIndex={-1} style={{ marginTop: 14 }}>Herramienta adaptada</h3>
        <p className="nota">Una herramienta nueva hecha a partir de otra: nombre propio y palabras que la activan.</p>
        <div className="rejilla-2">
          <div>
            <Texto etiqueta="Nombre (minúsculas y _)" valor={ad.n} alCambiar={v => setAd('n', v.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} max={LIMITES.adaptadaNombre} placeholder="Ej.: buscar_video" />
            {ad.n && !nombreAdaptadaValido(ad.n) ? <small className="nota" style={{ color: 'var(--error)' }}>Usa de 3 a 24 caracteres, empieza por letra y no repitas un nombre existente.</small> : null}
          </div>
          <Lista etiqueta="Basada en" valor={ad.b} alCambiar={v => setAd('b', v)} opciones={HERRAMIENTAS.map(h => [h[0], h[0]])} />
        </div>
        <Texto etiqueta="Palabras que la activan (separadas por comas)" valor={ad.p} alCambiar={v => setAd('p', v)} max={LIMITES.palabras} placeholder="Ej.: video, videos" />
        {ad.b === 'buscar_recurso' ? <Lista etiqueta="Solo recursos de tipo" valor={ad.f} alCambiar={v => setAd('f', v)} opciones={TIPOS_RECURSO} /> : null}
        {c.adaptada ? <button className="boton peligro mini" onClick={() => set('adaptada', null)}>Quitar herramienta adaptada</button> : null}
      </section>

      <section className="tarjeta">
        <Titulo id="sec-control" dueno="control">5 · Control</Titulo>
        <Lista etiqueta="Antes de enviar correos" valor={c.control.envio} alCambiar={v => setCtrl('envio', v)}
          opciones={[['apagado', 'No revisar (apagado)'], ['pedir', 'Pedir autorización explícita'], ['siempre_bloquear', 'Bloquear siempre']]} />
        <Interruptor titulo="Exigir argumentos completos" detalle="Si el LLM tuvo que suponer un dato, no se llama la herramienta: se pregunta." activo={c.control.args} alCambiar={v => setCtrl('args', v)} />
        <Interruptor titulo="Evaluador de fuentes (después)" detalle="Revisa que la respuesta no cite fuentes inventadas." activo={c.control.fuentes} alCambiar={v => setCtrl('fuentes', v)} />
        <Interruptor titulo="Bloquear acciones peligrosas" detalle="Borrar, eliminar, contraseñas…: no se hacen." activo={c.control.peligrosas} alCambiar={v => setCtrl('peligrosas', v)} />
        <h3 id="sec-hooks" tabIndex={-1} style={{ marginTop: 14 }}>Hooks propios</h3>
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
        <Titulo id="sec-caso" dueno="caso">6 · Caso de prueba propio</Titulo>
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
