import { BLOQUES, ICONO_ESTADO } from '../etiquetas.js';

export default function Traza({ pasos, animada = false }) {
  return (
    <ol className={'traza' + (animada ? ' animada' : '')} aria-label="Traza del agente, paso a paso">
      {pasos.map((p, i) => (
        <li key={i} data-b={p.b} data-e={p.e} style={animada ? { animationDelay: i * 0.12 + 's' } : undefined}>
          <span className="bloque">{i + 1}. {BLOQUES[p.b] || p.b}</span>
          <span>{ICONO_ESTADO[p.e] ? <span aria-label={p.e}>{ICONO_ESTADO[p.e]} </span> : null}{p.t}</span>
        </li>
      ))}
    </ol>
  );
}
