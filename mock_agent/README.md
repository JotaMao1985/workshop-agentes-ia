# mock_agent · el agente del workshop, en Python

Un agente de IA **simulado**: no usa un LLM real, ni créditos, ni llaves de API. El «LLM» son reglas (`llm_mock.py`), las herramientas están simuladas (`tools.py`) y el ciclo completo está en `agent.py`. Solo usa la biblioteca estándar (Python 3.10 o superior).

```bash
python main.py                      # conversa con el agente base
python main.py --escenarios         # 7 escenarios de práctica y 7 de evaluación, con puntaje
python main.py --config mi.json     # tu configuración (la misma que configuras en la app)
python main.py --codigo "B1.…"      # lee el código que entrega la app y calcula el puntaje
python -m unittest discover -s tests
```

## El ciclo (`agent.py`)

Usuario → Orquestador → Memoria (leer) → LLM decide → Control (antes) → Herramienta → Observación ↺ → LLM redacta → Control (después: evaluador) → Respuesta → Memoria (escribir) → Traza.
Si no hace falta ninguna herramienta, del «LLM decide» se pasa directo a «LLM redacta».

| Archivo | Bloque | Qué hace |
|---|---|---|
| `llm_mock.py` | LLM | Interpreta la intención, extrae argumentos y, si faltan, **los supone** (como un LLM real) |
| `agent.py` | Orquestador | Ejecuta el ciclo y arma la traza |
| `tools.py` | Herramientas | Calculadora sin `eval`, plan de estudio, catálogo de recursos, correo simulado… |
| `memory.py` | Memoria | Leer, escribir y olvidar, más el estado |
| `hooks.py` | Control | Antes: permiso, argumentos completos, acciones peligrosas, hooks propios. Después: el evaluador de fuentes |
| `scenarios.py` | — | Las 7 propiedades y el puntaje |

## Ideas para modificarlo

- Agrega una palabra en `datos/lexico.json` y mira cómo cambia la intención detectada.
- Crea una herramienta nueva en `tools.py` (por ejemplo, `traducir`) y conéctala en `llm_mock.py`.
- Escribe un hook nuevo en `hooks.py`: por ejemplo, que no se envíen correos fuera de `@ejemplo.edu`.

La app web hace exactamente lo mismo en JavaScript: `../pruebas/paridad/` comprueba que las dos dan la misma traza.
