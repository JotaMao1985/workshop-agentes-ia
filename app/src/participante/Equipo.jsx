import { Texto } from '../componentes/Campos.jsx';

const BLOQUES = [
  ['LLM', 'Interpreta y propone. No ejecuta nada.'],
  ['Orquestador', 'Decide el siguiente paso y repite el ciclo.'],
  ['Herramientas', 'Tools, skills y MCP: ejecutan y devuelven lo que salió.'],
  ['Memoria', 'Lo que el agente sabe de ti y el estado del flujo.'],
  ['Control', 'Hooks antes y después de actuar, y la traza.'],
];

export default function Equipo({ equipo, setEquipo, ir }) {
  return (
    <>
      <section className="tarjeta">
        <h2>Tu equipo</h2>
        <p>Escribe el nombre de tu equipo. Es el mismo todo el día: con él se suman tus puntos.</p>
        <Texto etiqueta="Nombre del equipo" valor={equipo} alCambiar={setEquipo} max={30} placeholder="Ej.: Los Perceptrones" />
        <div className="fila">
          <button className="boton" disabled={!equipo.trim()} onClick={() => ir('mi-agente')}>Ir a «Mi agente»</button>
          <button className="boton secundario" disabled={!equipo.trim()} onClick={() => ir('registro')}>Ir al «Registro II.A»</button>
        </div>
        <p className="nota">No te pedimos datos personales: usa datos ficticios (correos de ejemplo, nada real). Todo se guarda solo en este celular y viaja en el QR solo cuando entregas.</p>
      </section>
      <section className="tarjeta">
        <h2>Los 5 bloques de un agente</h2>
        <ul>
          {BLOQUES.map(([b, d]) => <li key={b}><b>{b}:</b> {d}</li>)}
        </ul>
        <p className="nota">El ciclo: Usuario → Orquestador → Memoria (leer) → LLM decide → Control (antes) → Herramienta → Observación ↺ → LLM redacta → Control (después) → Respuesta → Memoria (escribir) → Traza. Si no hace falta ninguna herramienta, de «LLM decide» se pasa directo a «LLM redacta».</p>
      </section>
      <section className="tarjeta">
        <h2>Puntaje del día</h2>
        <p>Parte I (retos 1 a 5): 30 · II.A juego de roles: 30 · II.B tu agente: 40 · <b>Total: 100</b>. Hay premio para el 1.º y el 2.º puesto.</p>
      </section>
    </>
  );
}
