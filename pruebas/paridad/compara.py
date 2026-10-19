"""Compara la salida de JS y de Python. Cuenta diferencias y muestra las primeras.
Dos partes: mensajes sueltos (baterías y mensajes.json) y secuencias con memoria de sesión compartida
(secuencias.json), donde se compara el resultado completo de cada turno."""
import hashlib
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent


def leer(n):
    return json.loads((AQUI / n).read_text(encoding="utf-8"))


def comparar(a, b, ruta, dif):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            comparar(a.get(k, "<falta>"), b.get(k, "<falta>"), ruta + "." + k, dif)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            dif.append((ruta, f"len {len(a)} vs {len(b)}"))
        for i, (x, y) in enumerate(zip(a, b)):
            comparar(x, y, f"{ruta}[{i}]", dif)
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool) and not isinstance(b, bool):
        if abs(a - b) > 1e-12:
            dif.append((ruta, f"{a!r} vs {b!r}"))
    elif a != b:
        dif.append((ruta, f"{a!r} vs {b!r}"))


def mostrar(dif):
    for d in dif[:15]:
        print("  ", d[0], "→", d[1][:300])


js, py = leer("salida_js.json"), leer("salida_py.json")
dif = []
comparar(js, py, "$", dif)
n_casos = sum(len(x["resumen"]["practica"]) + len(x["resumen"]["evaluacion"]) + len(x["extra"]) for x in js)
print(f"configuraciones: {len(js)} · ejecuciones comparadas: {n_casos} · diferencias: {len(dif)}")
mostrar(dif)

sjs, spy = leer("salida_sec_js.json"), leer("salida_sec_py.json")
dif_sec = []
comparar(sjs, spy, "$sec", dif_sec)
n_sec = sum(len(s) for c in sjs for s in c)
print(f"secuencias: {len(sjs)} configuraciones × {len(sjs[0]) if sjs else 0} secuencias · turnos comparados: {n_sec} · diferencias: {len(dif_sec)}")
mostrar(dif_sec)

datos_app = AQUI.parents[1] / "datos"
datos_py = AQUI.parents[1] / "mock_agent" / "datos"
copias = [(f.name, hashlib.sha256(f.read_bytes()).hexdigest() == hashlib.sha256((datos_py / f.name).read_bytes()).hexdigest()) for f in sorted(datos_app.glob("*.json"))]
print("copias de datos idénticas:", all(ok for _, ok in copias), [n for n, ok in copias if not ok])
totales = {}
for x in js:
    t = x["resumen"]["total_evaluacion"]
    totales[t] = totales.get(t, 0) + 1
print("distribución del puntaje de evaluación (JS):", dict(sorted(totales.items())))
raise SystemExit(1 if dif or dif_sec or not all(ok for _, ok in copias) else 0)
