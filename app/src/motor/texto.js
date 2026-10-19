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

// Primera letra en minúscula para insertar un texto a mitad de frase, solo si la segunda letra es
// minúscula: «Ayudarte a estudiar» → «ayudarte a estudiar», pero «IA para todos» queda igual.
export function minusculaInicial(s) {
  const a = Array.from(String(s ?? ''));
  if (a.length < 2) return a.join('');
  const p = a[0], q = a[1];
  if (p.toLowerCase() !== p && q.toUpperCase() !== q && q.toLowerCase() === q) a[0] = p.toLowerCase();
  return a.join('');
}

// ¿El mensaje normalizado está hecho solo de estas frases? Exige al menos una de «principales» y deja
// pasar las de «relleno» («por favor», «gracias»…). Recorre de izquierda a derecha y prueba primero
// las frases más largas: «no lo envies» gana a «no».
export function cubrePor(msgNorm, principales, relleno) {
  const ws = msgNorm.split(' ').filter(Boolean);
  if (!ws.length) return false;
  const frases = principales.map(f => [f.split(' '), true]).concat(relleno.map(f => [f.split(' '), false]))
    .sort((a, b) => b[0].length - a[0].length);
  let i = 0, alguna = false;
  while (i < ws.length) {
    const f = frases.find(([pal]) => pal.every((w, j) => ws[i + j] === w));
    if (!f) return false;
    if (f[1]) alguna = true;
    i += f[0].length;
  }
  return alguna;
}
