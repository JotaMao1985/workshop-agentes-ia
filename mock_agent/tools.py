"""Herramientas simuladas. La calculadora no usa eval: tiene su propio analizador.
Espejo de app/src/motor/calculadora.js y de correrHerramienta() en agente.js."""
import json
import math
import re

from config import DATOS
from texto import normalizar, contiene, formatear, formato_numero

CATALOGO = json.loads((DATOS / "catalogo.json").read_text(encoding="utf-8"))
TEXTOS = json.loads((DATOS / "textos.json").read_text(encoding="utf-8"))
LEXICO = json.loads((DATOS / "lexico.json").read_text(encoding="utf-8"))


class ErrorCalculo(Exception):
    def __init__(self, codigo):
        super().__init__(codigo)
        self.codigo = codigo


def preparar_expresion(crudo):
    s = str(crudo if crudo is not None else "")
    s = s.replace("×", "*").replace("÷", "/").replace("−", "-").replace("–", "-")
    while True:
        nuevo = re.sub(r"([0-9]) *[xX] *([0-9])", r"\1*\2", s, count=1)
        if nuevo == s:
            return s
        s = nuevo


def extraer_expresion(crudo):
    """La subcadena aritmética más larga que tenga al menos un operador."""
    s = preparar_expresion(crudo)
    mejor = None
    for c in re.findall(r"[0-9(][0-9.,+\-*/^() ]*[0-9)]", s):
        t = c.strip()
        if not re.search(r"[+\-*/^]", re.sub(r"^-", "", t)):
            continue
        if mejor is None or len(t) > len(mejor):
            mejor = t
    return mejor


def _tokenizar(s):
    toks, i = [], 0
    while i < len(s):
        c = s[i]
        if c == " ":
            i += 1
            continue
        if c in "0123456789":
            j = i
            while j < len(s) and s[j] in "0123456789":
                j += 1
            if j < len(s) and s[j] in ",." and j + 1 < len(s) and s[j + 1] in "0123456789":
                j += 1
                while j < len(s) and s[j] in "0123456789":
                    j += 1
            toks.append(("n", float(s[i:j].replace(",", "."))))
            i = j
            continue
        if c in "+-*/^()":
            toks.append((c, None))
            i += 1
            continue
        raise ErrorCalculo("sintaxis")
    return toks


def calcular(expresion):
    """Gramática: expr = term (('+'|'-') term)* ; term = pot (('*'|'/') pot)* ;
    pot = unario ('^' entero 0..10)? ; unario = '-' unario | primario ; primario = número | '(' expr ')'"""
    toks = _tokenizar(expresion)
    k = [0]

    def ver():
        return toks[k[0]][0] if k[0] < len(toks) else None

    def tomar(t):
        if ver() != t:
            raise ErrorCalculo("sintaxis")
        k[0] += 1

    def expr():
        v = term()
        while ver() in ("+", "-"):
            op = toks[k[0]][0]
            k[0] += 1
            d = term()
            v = v + d if op == "+" else v - d
        return v

    def term():
        v = pot()
        while ver() in ("*", "/"):
            op = toks[k[0]][0]
            k[0] += 1
            d = pot()
            if op == "/":
                if d == 0:
                    raise ErrorCalculo("division_cero")
                v = v / d
            else:
                v = v * d
        return v

    def pot():
        b = unario()
        if ver() == "^":
            k[0] += 1
            if ver() != "n":
                raise ErrorCalculo("potencia")
            e = toks[k[0]][1]
            k[0] += 1
            if not float(e).is_integer() or e < 0 or e > 10:
                raise ErrorCalculo("potencia")
            r = 1.0
            for _ in range(int(e)):
                r = r * b
            return r
        return b

    def unario():
        if ver() == "-":
            k[0] += 1
            return -unario()
        return primario()

    def primario():
        if ver() == "n":
            v = toks[k[0]][1]
            k[0] += 1
            return v
        if ver() == "(":
            k[0] += 1
            v = expr()
            tomar(")")
            return v
        raise ErrorCalculo("sintaxis")

    v = expr()
    if k[0] != len(toks):
        raise ErrorCalculo("sintaxis")
    if not math.isfinite(v) or abs(v) >= 1e15:
        raise ErrorCalculo("grande")
    return v


def palabras_contenido(s):
    return [w for w in normalizar(s).split(" ") if len(w) >= 3 and w not in LEXICO["vacias"]]


def buscar_en_catalogo(tema, filtro):
    ws = palabras_contenido(tema)
    if not ws:
        return []
    hallados = []
    for i, r in enumerate(CATALOGO["recursos"]):
        if filtro and filtro != "cualquiera" and r["tipo"] != filtro:
            continue
        s = 0
        for w in ws:
            if w in r["etiquetas"] or (w.endswith("s") and w[:-1] in r["etiquetas"]):
                s += 1
        if s * 5 >= len(ws) * 3:
            hallados.append((s, i, r))
    hallados.sort(key=lambda h: (-h[0], h[1]))
    return [h[2] for h in hallados[:3]]


def _entero(v, defecto=1):
    try:
        return int(str(v).strip())
    except ValueError:
        return defecto


def texto_plan(tema, dias, horas):
    d = min(max(_entero(dias) or 1, 1), 7)
    h = min(max(_entero(horas) or 1, 1), 6)
    ws = normalizar(tema).split(" ")
    redes = any(w in CATALOGO["palabras_redes"] for w in ws)
    temas = CATALOGO["temas_plan_redes"] if redes else CATALOGO["temas_plan_general"]
    lineas = [f"Día {i} ({h} h): {temas[(i - 1) % len(temas)]}" for i in range(1, d + 1)]
    return d, TEXTOS["separador_plan"].join(lineas)


def texto_resumen(t):
    partes = [x.strip() for x in re.split(r"[.!?]", t)]
    partes = [x for x in partes if x]
    primera = partes[0] if partes else t.strip()
    return primera[:120] + "…" if len(primera) > 120 else primera


def texto_revision(t):
    n = normalizar(t)
    ok = [
        len(t) >= 40,
        re.search(r"[0-9]", t) is not None or contiene(n, "porque") or contiene(n, "datos"),
        contiene(n, "en conclusion") or contiene(n, "por lo tanto") or contiene(n, "conclusion"),
    ]
    return " · ".join(c + ": " + (TEXTOS["si"] if ok[i] else TEXTOS["no"]) for i, c in enumerate(TEXTOS["evaluar_criterios"]))


def aproximar(v):
    if v == 0:
        return 0.0
    a = abs(v)
    if a < 1:
        return math.floor(v * 10 + 0.5) / 10
    p = 1
    while a >= p * 10:
        p *= 10
    return math.floor(v / p + 0.5) * p


def correr_herramienta(base, args, filtro):
    """Ejecuta una herramienta y devuelve la observación."""
    O = TEXTOS["observacion"]
    if base == "calculadora":
        try:
            v = calcular(args["expresion"])
            return {"ok": True, "valor": v, "texto": formatear(O["calc"], {"res": formato_numero(v)})}
        except ErrorCalculo as e:
            return {"ok": False, "texto": TEXTOS["errores"].get(e.codigo, TEXTOS["errores"]["sintaxis"])}
    if base == "crear_plan_estudio":
        d, txt = texto_plan(args["tema"], args["dias"], args["horas"])
        return {"ok": True, "texto": formatear(O["plan"], {"d": d}), "texto2": txt}
    if base == "buscar_recurso":
        lista = buscar_en_catalogo(args["tema"], filtro)
        return {"ok": True, "lista": lista, "texto": formatear(O["buscar"], {"n": len(lista)}) if lista else O["buscar_vacio"]}
    if base == "enviar_correo":
        return {"ok": True, "texto": formatear(O["enviar"], {"destino": args["destino"]})}
    if base == "resumir_texto":
        return {"ok": True, "texto": O["resumir"]}
    if base == "evaluar_entrega":
        return {"ok": True, "texto": O["evaluar"]}
    return {"ok": True, "texto": formatear(O["calendario"], {"res": CATALOGO["calendario"]})}
