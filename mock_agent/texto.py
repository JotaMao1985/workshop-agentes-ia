"""Utilidades de texto. Espejo de app/src/motor/texto.js: si cambias algo aquí, cámbialo allá."""
import re
import unicodedata

_NO_ALFANUM = re.compile(r"[^a-z0-9]+")
_MARCAS = re.compile("[̀-ͯ]")
_CORREO = re.compile(r"[a-z0-9._-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}")


def normalizar(s):
    s = "" if s is None else str(s)
    s = unicodedata.normalize("NFD", s.lower())
    s = _MARCAS.sub("", s)
    return _NO_ALFANUM.sub(" ", s).strip()


def contiene(msg_norm, frase):
    """¿Aparece la frase como palabras completas dentro del mensaje normalizado?"""
    f = normalizar(frase)
    if not f:
        return False
    return (" " + f + " ") in (" " + msg_norm + " ")


def primera_frase(msg_norm, frases):
    for f in frases:
        if contiene(msg_norm, f):
            return f
    return None


def formatear(plantilla, datos=None):
    datos = datos or {}

    def cambiar(m):
        k = m.group(1)
        return str(datos[k]) if k in datos else m.group(0)

    return re.sub(r"\{([A-Za-z0-9_]+)\}", cambiar, plantilla)


def palabras_de_lista(s):
    """«a, b, c» → palabras normalizadas de 3 letras o más (máx. 8)."""
    partes = [normalizar(p) for p in str(s if s is not None else "").split(",")]
    return [p for p in partes if len(p) >= 3][:8]


def correos(crudo):
    return _CORREO.findall(str(crudo if crudo is not None else "").lower())


def formato_numero(x):
    """Coma decimal, sin separador de miles, a lo sumo 6 decimales."""
    s = f"{x:.6f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    if s == "-0":
        s = "0"
    return s.replace(".", ",")


def recortar(s, n):
    s = "" if s is None else str(s)
    return s[:n]


def minuscula_inicial(s):
    """Primera letra en minúscula para insertar un texto a mitad de frase, solo si la segunda letra es
    minúscula: «Ayudarte a estudiar» → «ayudarte a estudiar», pero «IA para todos» queda igual."""
    s = "" if s is None else str(s)
    if len(s) < 2:
        return s
    p, q = s[0], s[1]
    if p.lower() != p and q.upper() != q and q.lower() == q:
        return p.lower() + s[1:]
    return s


def cubre_por(msg_norm, principales, relleno):
    """¿El mensaje normalizado está hecho solo de estas frases? Exige al menos una de «principales» y deja
    pasar las de «relleno» («por favor», «gracias»…). Recorre de izquierda a derecha y prueba primero
    las frases más largas: «no lo envies» gana a «no»."""
    ws = [w for w in msg_norm.split(" ") if w]
    if not ws:
        return False
    frases = sorted([(f.split(" "), True) for f in principales] + [(f.split(" "), False) for f in relleno],
                    key=lambda x: -len(x[0]))
    i, alguna = 0, False
    while i < len(ws):
        f = next((x for x in frases if ws[i:i + len(x[0])] == x[0]), None)
        if f is None:
            return False
        if f[1]:
            alguna = True
        i += len(f[0])
    return alguna
