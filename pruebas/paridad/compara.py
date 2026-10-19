"""Compara la salida de JS y de Python. Cuenta diferencias y muestra las primeras."""
import hashlib
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
js = json.loads((AQUI / "salida_js.json").read_text(encoding="utf-8"))
py = json.loads((AQUI / "salida_py.json").read_text(encoding="utf-8"))
dif = []


def comparar(a, b, ruta):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            comparar(a.get(k, "<falta>"), b.get(k, "<falta>"), ruta + "." + k)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            dif.append((ruta, f"len {len(a)} vs {len(b)}"))
        for i, (x, y) in enumerate(zip(a, b)):
            comparar(x, y, f"{ruta}[{i}]")
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool) and not isinstance(b, bool):
        if abs(a - b) > 1e-12:
            dif.append((ruta, f"{a!r} vs {b!r}"))
    elif a != b:
        dif.append((ruta, f"{a!r} vs {b!r}"))


comparar(js, py, "$")
n_casos = sum(len(x["resumen"]["practica"]) + len(x["resumen"]["evaluacion"]) + len(x["extra"]) for x in js)
print(f"configuraciones: {len(js)} · ejecuciones comparadas: {n_casos} · diferencias: {len(dif)}")
for d in dif[:15]:
    print("  ", d[0], "→", d[1][:300])
datos_app = AQUI.parents[1] / "datos"
datos_py = AQUI.parents[1] / "mock_agent" / "datos"
copias = [(f.name, hashlib.sha256(f.read_bytes()).hexdigest() == hashlib.sha256((datos_py / f.name).read_bytes()).hexdigest()) for f in sorted(datos_app.glob("*.json"))]
print("copias de datos idénticas:", all(ok for _, ok in copias), [n for n, ok in copias if not ok])
totales = {}
for x in js:
    t = x["resumen"]["total_evaluacion"]
    totales[t] = totales.get(t, 0) + 1
print("distribución del puntaje de evaluación (JS):", dict(sorted(totales.items())))
raise SystemExit(1 if dif or not all(ok for _, ok in copias) else 0)
