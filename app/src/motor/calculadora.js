// Calculadora sin eval: analizador descendente recursivo. Espejo: mock_agent/tools.py (Calculadora).
// Gramática: expr = term (('+'|'-') term)* ; term = pot (('*'|'/') pot)* ;
//            pot = unario ('^' entero 0..10)? ; unario = '-' unario | primario ; primario = número | '(' expr ')'

export class ErrorCalculo extends Error {
  constructor(codigo) { super(codigo); this.codigo = codigo; }
}

// Pasa los símbolos tipográficos a ASCII y la «x» entre cifras a «*».
export function prepararExpresion(crudo) {
  let s = String(crudo ?? '')
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-');
  let antes;
  do { antes = s; s = s.replace(/([0-9]) *[xX] *([0-9])/, '$1*$2'); } while (s !== antes);
  return s;
}

// La subcadena aritmética más larga que tenga al menos un operador.
export function extraerExpresion(crudo) {
  const s = prepararExpresion(crudo);
  const candidatos = s.match(/[0-9(][0-9.,+\-*/^() ]*[0-9)]/g) || [];
  let mejor = null;
  for (const c of candidatos) {
    const t = c.trim();
    if (!/[+\-*/^]/.test(t.replace(/^-/, ''))) continue;
    if (mejor === null || t.length > mejor.length) mejor = t;
  }
  return mejor;
}

function tokenizar(s) {
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9]/.test(s[j])) j++;
      if (j < s.length && (s[j] === ',' || s[j] === '.') && j + 1 < s.length && /[0-9]/.test(s[j + 1])) {
        j++;
        while (j < s.length && /[0-9]/.test(s[j])) j++;
      }
      toks.push({ t: 'n', v: parseFloat(s.slice(i, j).replace(',', '.')) });
      i = j; continue;
    }
    if ('+-*/^()'.includes(c)) { toks.push({ t: c }); i++; continue; }
    throw new ErrorCalculo('sintaxis');
  }
  return toks;
}

export function calcular(expresion) {
  const toks = tokenizar(expresion);
  let k = 0;
  const ver = () => (k < toks.length ? toks[k].t : null);
  const tomar = t => { if (ver() !== t) throw new ErrorCalculo('sintaxis'); k++; };
  function expr() {
    let v = term();
    while (ver() === '+' || ver() === '-') { const op = toks[k++].t; const d = term(); v = op === '+' ? v + d : v - d; }
    return v;
  }
  function term() {
    let v = pot();
    while (ver() === '*' || ver() === '/') {
      const op = toks[k++].t; const d = pot();
      if (op === '/') { if (d === 0) throw new ErrorCalculo('division_cero'); v = v / d; } else v = v * d;
    }
    return v;
  }
  function pot() {
    const b = unario();
    if (ver() === '^') {
      k++;
      if (ver() !== 'n') throw new ErrorCalculo('potencia');
      const e = toks[k++].v;
      if (!Number.isInteger(e) || e < 0 || e > 10) throw new ErrorCalculo('potencia');
      let r = 1; for (let i = 0; i < e; i++) r = r * b;
      return r;
    }
    return b;
  }
  function unario() {
    if (ver() === '-') { k++; return -unario(); }
    return primario();
  }
  function primario() {
    if (ver() === 'n') return toks[k++].v;
    if (ver() === '(') { k++; const v = expr(); tomar(')'); return v; }
    throw new ErrorCalculo('sintaxis');
  }
  const v = expr();
  if (k !== toks.length) throw new ErrorCalculo('sintaxis');
  if (!Number.isFinite(v) || Math.abs(v) >= 1e15) throw new ErrorCalculo('grande');
  return v;
}
