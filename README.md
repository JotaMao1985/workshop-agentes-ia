# Workshop · Agentes de IA — app del mock

App web del **workshop «Agentes de IA»** (Universidad El Bosque, 20 de octubre de 2026). Simula un agente **sin LLM real, sin créditos y sin llaves de API**: el «LLM» es un conjunto de reglas, las herramientas están simuladas y todo corre en el navegador.

**Abrir la app:** https://jotamao1985.github.io/workshop-agentes-ia/

## Qué hace

Un agente se organiza en 5 bloques: **LLM** (interpreta y propone; no ejecuta), **Orquestador** (decide el siguiente paso), **Herramientas** (tools, skills y MCP), **Memoria** (incluye el estado) y **Control** (hooks antes y después de actuar, evaluador y traza). La app deja ver la **traza paso a paso** de cada mensaje:

> Usuario → Orquestador → Memoria (leer) → LLM decide → Control (antes) → Herramienta → Observación ↺ → LLM redacta → Control (después) → Respuesta → Memoria (escribir) → Traza
>
> Si no hace falta ninguna herramienta, del «LLM decide» se pasa directo a «LLM redacta».

En la app cada equipo, desde el celular:

1. registra las decisiones del juego de roles (II.A);
2. configura su agente sin escribir código: identidad, instrucciones, memoria, herramientas, hooks y un caso de prueba;
3. lo prueba en un chat y corre 7 escenarios comunes;
4. entrega su registro y su agente con un QR.

El **agente base** viene incompleto a propósito: envía correos sin permiso, inventa fuentes y supone datos que nadie le dio. Arreglarlo es parte del taller. La evaluación final usa frases distintas a las de práctica para premiar agentes que generalizan y no los que memorizan frases.

Todo se guarda solo en el navegador de quien la usa; la app no tiene servidor ni recoge datos personales.

## El mock en Python (para llevar)

`mock_agent/` es el mismo agente en Python, con la estructura de la propuesta del taller y **solo la biblioteca estándar** (Python 3.10 o superior):

```
mock_agent/
├── main.py        # línea de comandos
├── agent.py       # el ciclo del agente
├── llm_mock.py    # el «LLM» por reglas
├── tools.py       # herramientas simuladas (la calculadora no usa eval)
├── memory.py      # memoria y estado
├── hooks.py       # control antes y después
├── scenarios.py   # escenarios y puntaje
├── texto.py, config.py, codigo.py   # utilidades
├── datos/         # léxico, catálogo, textos y escenarios (los mismos que usa la app)
├── requirements.txt / environment.yml
└── tests/
```

```bash
cd mock_agent
python main.py                      # conversa con el agente base
python main.py --escenarios         # corre las baterías y muestra el puntaje
python main.py --config mi.json     # usa tu propia configuración
python main.py --codigo "B1.…"      # lee el código que entrega la app
python -m unittest discover -s tests
```

Prueba a cambiar `datos/lexico.json`, agregar una herramienta en `tools.py` o un hook en `hooks.py`, y mira cómo cambia la traza.

## Paridad entre la app y Python

La app (JavaScript) y el mock (Python) son dos implementaciones del mismo agente. `pruebas/paridad/` corre más de 200 configuraciones y 52 mensajes en las dos y compara traza, respuesta y puntaje, una por una:

```bash
cd app && npm ci
node ../pruebas/paridad/genera_configs.mjs
npx vite-node ../pruebas/paridad/corre_js.mjs
python3 ../pruebas/paridad/corre_py.py
python3 ../pruebas/paridad/compara.py
```

## Desarrollo de la app

```bash
cd app
npm ci
npm test          # pruebas del motor (vitest)
npm run dev       # servidor local
npm run build     # build + service worker para uso sin conexión
```

React 18 + Vite 5. Dependencias en versión exacta: `pako`, `qrcode`, `jsqr` y `@fontsource/montserrat`.
