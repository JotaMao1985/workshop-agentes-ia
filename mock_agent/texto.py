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
