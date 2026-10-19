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
