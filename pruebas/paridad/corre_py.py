import json
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
import os
sys.path.insert(0, os.environ.get("MOCK_DIR", str(AQUI.parents[1] / "mock_agent")))
from scenarios import resumen_paridad  # noqa: E402
from agent import ejecutar  # noqa: E402

configs = json.loads((AQUI / "configs.json").read_text(encoding="utf-8"))
mensajes = json.loads((AQUI / "mensajes.json").read_text(encoding="utf-8"))
out = []
for c in configs:
    extra = []
    for m in mensajes:
        r = ejecutar(c, m)
        extra.append({k: r[k] for k in ("respuesta", "traza", "ejecutadas", "bloqueadoPor", "aclaracion", "memoriaEscrita", "resultadoNumerico")})
    out.append({"resumen": resumen_paridad(c), "extra": extra})
(AQUI / "salida_py.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
print("Python listo:", len(out))
