import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QR({ texto, titulo }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  useEffect(() => {
    let vivo = true;
    QRCode.toString(texto, { type: 'svg', errorCorrectionLevel: 'L', margin: 4, color: { dark: '#0D1F19', light: '#FFFFFF' } })
      .then(s => { if (vivo) { setSvg(s); setError(null); } })
      .catch(e => { if (vivo) setError(String(e.message || e)); });
    return () => { vivo = false; };
  }, [texto]);
  if (error) return <div className="error-caja">No se pudo dibujar el QR: {error}</div>;
  return <div className="qr-caja" role="img" aria-label={titulo || 'Código QR'} dangerouslySetInnerHTML={{ __html: svg }} />;
}
