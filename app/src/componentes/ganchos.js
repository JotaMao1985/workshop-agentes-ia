import { useEffect, useState } from 'react';

// Devuelve el valor con un retraso: mientras escriben no se recalcula en cada tecla.
export function useDiferido(valor, ms = 300) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}
