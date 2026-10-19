"""Lee los códigos que entrega la app: «A1.…» (registro de II.A) y «B1.…» (configuración de II.B),
y el código corto de respaldo de 6 caracteres. Espejo de app/src/motor/codigo.js."""
import base64
import json
import re
import zlib

from texto import normalizar

B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def decodificar(texto):
    m = re.fullmatch(r"([AB])1\.([A-Za-z0-9_-]+)", str(texto or "").strip())
    if not m:
        raise ValueError("El código no tiene el formato A1.… o B1.…")
    datos = m.group(2)
    crudo = base64.urlsafe_b64decode(datos + "=" * ((4 - len(datos) % 4) % 4))
    return m.group(1), json.loads(zlib.decompress(crudo, -15).decode("utf-8"))


def fnv1a(s):
    h = 0x811C9DC5
    for b in s.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def codigo_corto(equipo, puntaje):
    p = max(0, min(40, int(round(puntaje))))
    h = fnv1a(normalizar(equipo) + "|" + str(p)) & 0xFFFFFF
    v = p * 0x1000000 + h
    s = ""
    for _ in range(6):
        s = B32[v % 32] + s
        v //= 32
    return s
