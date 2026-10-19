import json
import os
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, os.environ.get("MOCK_DIR", str(AQUI.parents[1] / "mock_agent")))
from scenarios import resumen_paridad  # noqa: E402
from agent import ejecutar  # noqa: E402


def leer(n):
    return json.loads((AQUI / n).read_text(encoding="utf-8"))


configs = leer("configs.json")
mensajes = leer("mensajes.json")
CLAVES = ("respuesta", "traza", "ejecutadas", "bloqueadoPor", "aclaracion", "memoriaEscrita", "resultadoNumerico", "memoriaSesion")
out = []
for c in configs:
    extra = []
    for m in mensajes:
        r = ejecutar(c, m)
        extra.append({k: r[k] for k in CLAVES})
    out.append({"resumen": resumen_paridad(c), "extra": extra})
(AQUI / "salida_py.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
print("Python listo:", len(out))

# Secuencias: varios mensajes seguidos con la memoria de sesión compartida (r["memoriaSesion"] pasa al siguiente).
secuencias = leer("secuencias.json")
todas = configs + leer("configs_secuencias.json")
sec = []
for c in todas:
    por_config = []
    for s in secuencias:
        mem, pasos = s.get("memoria", []), []
        for m in s["mensajes"]:
            r = ejecutar(c, m, mem)
            mem = r["memoriaSesion"]
            pasos.append(r)
        por_config.append(pasos)
    sec.append(por_config)
(AQUI / "salida_sec_py.json").write_text(json.dumps(sec, ensure_ascii=False), encoding="utf-8")
print("Python secuencias:", len(todas), "configuraciones ×", len(secuencias), "secuencias")
