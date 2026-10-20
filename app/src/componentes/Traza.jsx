import { BLOQUES, ICONO_ESTADO } from '../etiquetas.js';
import { ABREV, rutaDeTraza, textoRuta } from '../vista/ruta.js';

// La ruta de un vistazo: los bloques recorridos en los colores del kit, con su sigla (nunca solo color).
export function RutaTraza({ pasos }) {
  const ruta = rutaDeTraza(pasos);
  if (!ruta.length) return null;
  return (
    <div>
      <span className="oculto-visual">Ruta: {textoRuta(ruta)}.</span>
      <ol className="ruta" aria-hidden="true">
        {ruta.map((g, i) => (
          <li key={i} data-b={g.b} className={g.bloqueado ? 'bloqueado' : g.error ? 'error' : undefined}
            title={(BLOQUES[g.b] || g.b) + (g.n > 1 ? ` (${g.n} pasos)` : '') + (g.bloqueado ? ': bloqueó' : '')}>
            {g.bloqueado ? '✋ ' : g.error ? '✗ ' : ''}{ABREV[g.b] || g.b}{g.n > 1 ? `×${g.n}` : ''}
          </li>
        ))}
      </ol>
    </div>
  );
}

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
