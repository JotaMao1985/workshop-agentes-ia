// Utilidades de texto compartidas por el motor. El espejo en Python es mock_agent/texto.py:
// cualquier cambio aquí debe repetirse allá (la prueba de paridad lo vigila).

export function normalizar(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ¿Aparece la frase como palabras completas dentro del mensaje normalizado?
export function contiene(msgNorm, frase) {
  const f = normalizar(frase);
  if (!f) return false;
  return (' ' + msgNorm + ' ').includes(' ' + f + ' ');
}

export function primeraFrase(msgNorm, frases) {
  for (const f of frases) if (contiene(msgNorm, f)) return f;
  return null;
}

export function formatear(plantilla, datos = {}) {
  return plantilla.replace(/\{(\w+)\}/g, (m, k) => (k in datos ? String(datos[k]) : m));
}

// Lista «a, b, c» separada por comas → palabras normalizadas no vacías (máx. 8).
export function palabrasDeLista(s) {
  return String(s ?? '')
    .split(',')
    .map(normalizar)
    .filter(p => p.length >= 3)
    .slice(0, 8);
}

export function correos(crudo) {
  const m = String(crudo ?? '').toLowerCase().match(/[a-z0-9._-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/g);
  return m ? m : [];
}

// Número con coma decimal, sin separador de miles y a lo sumo 6 decimales.
export function formatoNumero(x) {
  let s = x.toFixed(6);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s.replace('.', ',');
}

// Recorta por puntos de código (no por unidades UTF-16) para coincidir con Python.
export function recortar(s, n) {
  const a = Array.from(String(s ?? ''));
  return a.length > n ? a.slice(0, n).join('') : a.join('');
}
