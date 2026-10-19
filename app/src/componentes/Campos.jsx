import { useId } from 'react';

export function Texto({ etiqueta, valor, alCambiar, max, area = false, ayuda, placeholder }) {
  const id = useId();
  const n = Array.from(valor || '').length;
  const Comp = area ? 'textarea' : 'input';
  return (
    <label className="campo" htmlFor={id}>
      <span>{etiqueta}</span>
      <Comp id={id} type={area ? undefined : 'text'} value={valor} maxLength={max} placeholder={placeholder}
        onChange={e => alCambiar(Array.from(e.target.value).slice(0, max).join(''))} />
      {ayuda ? <small className="nota">{ayuda}</small> : null}
      {max ? <div className="contador">{n}/{max}</div> : null}
    </label>
  );
}

export function Lista({ etiqueta, valor, alCambiar, opciones, ayuda }) {
  const id = useId();
  return (
    <label className="campo" htmlFor={id}>
      <span>{etiqueta}</span>
      <select id={id} value={valor} onChange={e => alCambiar(e.target.value)}>
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      {ayuda ? <small className="nota">{ayuda}</small> : null}
    </label>
  );
}

export function Interruptor({ titulo, detalle, activo, alCambiar }) {
  return (
    <label className="interruptor">
      <input type="checkbox" checked={!!activo} onChange={e => alCambiar(e.target.checked)} />
      <span><b>{titulo}</b>{detalle ? <small>{detalle}</small> : null}</span>
    </label>
  );
}

export function Estado({ si, children }) {
  return <span className={'estado ' + (si ? 'si' : 'no')}>{si ? '✓' : '✗'} {children}</span>;
}
