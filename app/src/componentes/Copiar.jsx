import { useState } from 'react';

export default function Copiar({ texto, etiqueta = 'Copiar código' }) {
  const [ok, setOk] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); }
    catch { window.prompt('Copia esto:', texto); }
  };
  return <button className="boton secundario mini" onClick={copiar}>{ok ? 'Copiado ✓' : etiqueta}</button>;
}
