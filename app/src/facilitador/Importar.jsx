import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { decodificar, leerCodigoCorto } from '../motor/codigo.js';
import { sanearConfig } from '../motor/config.js';
import { sanearRegistro } from '../motor/registro.js';
import { puntajeIIB } from '../motor/puntaje.js';
import { claveEquipo, equipoDe } from '../motor/marcador.js';
import { Texto } from '../componentes/Campos.jsx';
import { estadoImport } from '../vista/facilitador.js';

// Pitido corto al importar: el facilitador mira el celular del equipo, no la pantalla del portátil.
// El contexto de audio se crea con un clic (los navegadores no dejan sonar sin un gesto del usuario).
function useAudio() {
  const ctx = useRef(null);
  useEffect(() => () => { try { ctx.current?.close(); } catch { /* nada */ } }, []);
  const preparar = () => {
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      if (!ctx.current) ctx.current = new C();
      if (ctx.current.state === 'suspended') ctx.current.resume();
    } catch { /* sin audio */ }
  };
  const pitido = () => {
    try {
      const c = ctx.current;
      if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.18, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.16);
    } catch { /* sin audio */ }
  };
  return { preparar, pitido };
}

function leerQRDeCanvas(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const r = jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' });
  return r ? r.data : null;
}

export default function Importar({ equipos, setEquipos }) {
  const [msg, setMsg] = useState(null);
  const [pegado, setPegado] = useState('');
  const [camara, setCamara] = useState(false);
  const [cortoEq, setCortoEq] = useState('');
  const [corto, setCorto] = useState('');
  const [nuevo, setNuevo] = useState('');
  const video = useRef(null);
  const ultimo = useRef({ t: '', at: 0 });
  // El bucle de la cámara guarda el «importar» del primer render: los equipos se leen de aquí, siempre al día.
  const equiposRef = useRef(equipos);
  equiposRef.current = equipos;
  const { preparar, pitido } = useAudio();
  const avisar = m => setMsg(prev => ({ ...m, n: (prev?.n || 0) + 1 }));
  const verbo = { nuevo: 'importado', actualizado: 'actualizado (reemplaza al anterior)', igual: 'ya estaba (sin cambios)' };

  const importar = texto => {
    try {
      if (String(texto || '').includes('#/probador/')) throw new Error('ese QR es el de «Probar en otro celular». Pídanle al equipo que abra «Entregar».');
      const { tipo, datos } = decodificar(texto);
      if (tipo === 'A') {
        const reg = sanearRegistro(datos);
        if (!reg.equipo) throw new Error('El registro no trae el nombre del equipo.');
        const k = claveEquipo(reg.equipo);
        const est = estadoImport(equipoDe(equiposRef.current, reg.equipo).registro, reg);
        setEquipos(prev => ({ ...prev, [k]: { ...equipoDe(prev, reg.equipo), registro: reg } }));
        avisar({ ok: true, t: `Registro II.A de «${reg.equipo}» ${verbo[est]}.` });
      } else {
        const cfg = sanearConfig(datos);
        if (!cfg.equipo) throw new Error('La configuración no trae el nombre del equipo.');
        const k = claveEquipo(cfg.equipo);
        const est = estadoImport(equipoDe(equiposRef.current, cfg.equipo).config, cfg);
        setEquipos(prev => ({ ...prev, [k]: { ...equipoDe(prev, cfg.equipo), config: cfg } }));
        avisar({ ok: true, t: `Agente II.B de «${cfg.equipo}» ${verbo[est]}: ${puntajeIIB(cfg).total}/40 con la evaluación.` });
      }
      pitido();
      return true;
    } catch (e) {
      avisar({ ok: false, t: 'No se pudo leer el código: ' + (e.message === 'formato' ? 'no es un código válido de esta app (¿quedó incompleto al copiarlo?).' : e.message) });
      return false;
    }
  };

  useEffect(() => {
    if (!camara) return undefined;
    let flujo = null, vivo = true, timer = null;
    const lienzo = document.createElement('canvas');
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });
    navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(s => {
        flujo = s;
        if (!vivo) { s.getTracks().forEach(t => t.stop()); return; }
        video.current.srcObject = s;
        video.current.play();
        const ciclo = () => {
          if (!vivo) return;
          const v = video.current;
          if (v && v.readyState >= 2 && v.videoWidth) {
            const esc = Math.min(1, 960 / v.videoWidth);
            lienzo.width = Math.round(v.videoWidth * esc); lienzo.height = Math.round(v.videoHeight * esc);
            ctx.drawImage(v, 0, 0, lienzo.width, lienzo.height);
            const t = leerQRDeCanvas(ctx, lienzo.width, lienzo.height);
            const ahora = Date.now();
            if (t && !(t === ultimo.current.t && ahora - ultimo.current.at < 4000)) {
              ultimo.current = { t, at: ahora };
              importar(t);
            }
          }
          timer = setTimeout(ciclo, 200);
        };
        ciclo();
      })
      .catch(e => { avisar({ ok: false, t: 'No se pudo abrir la cámara: ' + e.message + '. Usa «Subir imagen» o «Pegar código».' }); setCamara(false); });
    return () => { vivo = false; clearTimeout(timer); if (flujo) flujo.getTracks().forEach(t => t.stop()); };
  }, [camara]);

  const subirImagen = archivo => {
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const lienzo = document.createElement('canvas');
      const ctx = lienzo.getContext('2d', { willReadFrequently: true });
      let t = null;
      for (const esc of [1, 0.5, 0.25]) {
        lienzo.width = Math.round(img.width * esc); lienzo.height = Math.round(img.height * esc);
        ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
        t = leerQRDeCanvas(ctx, lienzo.width, lienzo.height);
        if (t) break;
      }
      URL.revokeObjectURL(url);
      if (t) importar(t); else avisar({ ok: false, t: 'No encontré un QR en esa imagen.' });
    };
    img.src = url;
  };

  const usarCorto = () => {
    const p = leerCodigoCorto(cortoEq, corto);
    if (p === null) { avisar({ ok: false, t: 'El código corto no coincide con ese nombre de equipo.' }); return; }
    const k = claveEquipo(cortoEq);
    setEquipos(prev => ({ ...prev, [k]: { ...equipoDe(prev, cortoEq), iibManual: p } }));
    avisar({ ok: true, t: `Puntaje de II.B de «${cortoEq.trim()}» registrado con el código corto: ${p}/40.` });
    pitido();
    setCorto('');
  };

  const lista = Object.values(equipos);
  return (
    <>
      <div role="status" aria-live="polite">
        {msg ? <div key={msg.n} className={(msg.ok ? 'exito-caja' : 'error-caja') + (msg.ok ? ' destello' : '')}>{msg.t}</div> : null}
      </div>
      <section className="tarjeta">
        <h2>Escanear con la cámara</h2>
        <p className="nota">Cada equipo acerca su celular con el QR (registro II.A o agente II.B). Se importa solo.</p>
        <button className="boton naranja" onClick={() => { preparar(); setCamara(!camara); }}>{camara ? 'Detener cámara' : 'Encender cámara'}</button>
        {camara ? <video ref={video} className="camara" muted playsInline style={{ marginTop: 10 }} /> : null}
      </section>
      <section className="tarjeta">
        <h2>Otras formas</h2>
        <label className="campo"><span>Subir imagen o captura del QR</span><input type="file" accept="image/*" onClick={preparar} onChange={e => subirImagen(e.target.files[0])} /></label>
        <Texto etiqueta="Pegar código (A1.… o B1.…)" valor={pegado} alCambiar={setPegado} max={3000} area />
        <button className="boton secundario" disabled={!pegado.trim()} onClick={() => { preparar(); if (importar(pegado)) setPegado(''); }}>Importar código</button>
        <h3 style={{ marginTop: 16 }}>Código corto de respaldo (solo II.B)</h3>
        <div className="rejilla-2">
          <Texto etiqueta="Nombre exacto del equipo" valor={cortoEq} alCambiar={setCortoEq} max={30} />
          <Texto etiqueta="Código de 6 caracteres" valor={corto} alCambiar={v => setCorto(v.toUpperCase())} max={6} />
        </div>
        <button className="boton secundario" disabled={!cortoEq.trim() || corto.length !== 6} onClick={() => { preparar(); usarCorto(); }}>Registrar código corto</button>
        <h3 style={{ marginTop: 16 }}>Agregar un equipo a mano</h3>
        <div className="fila">
          <input type="text" value={nuevo} maxLength={30} onChange={e => setNuevo(e.target.value)} placeholder="Nombre del equipo" style={{ flex: 1, minWidth: 0 }} aria-label="Nombre del equipo nuevo" />
          <button className="boton secundario" disabled={!nuevo.trim()} onClick={() => { const k = claveEquipo(nuevo); setEquipos(prev => ({ ...prev, [k]: equipoDe(prev, nuevo) })); setNuevo(''); }}>Agregar</button>
        </div>
      </section>
      <section className="tarjeta">
        <h2>Equipos ({lista.length})</h2>
        {lista.length === 0 ? <p className="nota">Todavía no hay equipos.</p> : (
          <div className="desplazable"><table className="tabla">
            <thead><tr><th>Equipo</th><th>II.A</th><th>II.B</th></tr></thead>
            <tbody>{lista.map(e => (
              <tr key={claveEquipo(e.nombre)}><td>{e.nombre}</td><td>{e.registro ? '✓ registro' : '—'}</td><td>{e.config ? '✓ QR' : Number.isFinite(e.iibManual) ? 'código: ' + e.iibManual : '—'}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
