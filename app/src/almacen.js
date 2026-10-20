import { useEffect, useState } from 'react';

// localStorage puede fallar (modo privado, sitio bloqueado): todo va envuelto y la app sigue funcionando.
export function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : porDefecto;
  } catch { return porDefecto; }
}

export function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}

export function usePersistente(clave, porDefecto) {
  const [v, setV] = useState(() => leer(clave, porDefecto));
  useEffect(() => { guardar(clave, v); }, [clave, v]);
  return [v, setV];
}

// ¿Este navegador guarda de verdad? (modo privado, navegador interno de otra app, sitio bloqueado…)
export function almacenDisponible() {
  try {
    const k = 'taller_prueba_almacen';
    localStorage.setItem(k, '1');
    const ok = localStorage.getItem(k) === '1';
    localStorage.removeItem(k);
    return ok;
  } catch { return false; }
}
