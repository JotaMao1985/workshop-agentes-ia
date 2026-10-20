# Workshop «Agentes de IA» — app del mock

App web del **Workshop «Agentes de IA»** (Universidad El Bosque, 20 de octubre de 2026). Simula un agente **sin LLM real, sin créditos y sin claves de API**: el «LLM» es un conjunto de reglas, las herramientas están simuladas y todo corre en el navegador.

**Abrir la app:** https://jotamao1985.github.io/workshop-agentes-ia/

**Autores:** Javier Mauricio Sierra y Andrés Mauricio Suárez Mantilla.

## Qué hace

Un agente se organiza en 5 bloques: **LLM** (interpreta y propone; no ejecuta), **Orquestador** (decide el siguiente paso), **Herramientas** (tools, skills y MCP), **Memoria** (incluye el estado) y **Control** (hooks antes y después de actuar, evaluador y traza). La app deja ver la **traza paso a paso** de cada mensaje:

> Usuario → Orquestador → Memoria (leer) → LLM decide → Control (antes) → Herramienta → Observación ↺ → LLM redacta → Control (después) → Respuesta → Memoria (escribir) → Traza
>
> Si no hace falta ninguna herramienta, de «LLM decide» se pasa directo a «LLM redacta».

### Confirmación en dos turnos: la Memoria lleva el estado

Cuando Control (antes) bloquea una acción porque falta autorización («Pedir autorización explícita» en el envío de correos) o confirmación (el hook propio «Pedir confirmación antes de usar…»), la acción no se pierde: la Memoria guarda en la memoria de la sesión el **estado**, una acción pendiente con su herramienta y sus argumentos.

| Turno | Mensaje | Qué pasa |
|---|---|---|
| 1 | «Envía el plan a grupo.redes@ejemplo.edu» | Control (antes) bloquea: falta autorización. Memoria (escribir): *Guarda el estado: envío pendiente de autorización (grupo.redes@ejemplo.edu).* |
| 2 | «Sí, confirmo» | Memoria (leer): *Lee el estado: hay un envío pendiente…* → el LLM interpreta «confirmar la acción pendiente» → Control (antes): *autorización explícita recibida en este turno* → la herramienta se ejecuta con los argumentos guardados → *Listo: envié … (envío simulado).* → Memoria (escribir): *Borra el estado.* |

- Cuenta como confirmación un mensaje que solo confirma, sin otra acción ni otro destino: «sí», «sí, confirmo», «confirmo», «autorizo», «dale», «de acuerdo», «adelante», «hazlo», «ok», «claro», «envíalo»… (la lista está en `datos/lexico.json`, en `confirmacion` y `relleno_confirmacion`).
- Una negación («no», «cancela», «mejor no», «no lo envíes»…) borra el estado y el agente responde «Entendido: no lo envío.».
- Cualquier otro mensaje descarta el estado (la traza lo dice) y se procesa normal.
- Con «Bloquear siempre» no queda nada pendiente: el bloqueo es definitivo. El bloqueo de acciones peligrosas sigue aplicando siempre, y los demás controles (argumentos supuestos, hooks propios) se revisan otra vez al confirmar.
- Las baterías de escenarios corren cada mensaje con la memoria de sesión vacía, así que el estado no cambia el puntaje. En «Probar», en cambio, la memoria de la sesión pasa de un mensaje al siguiente hasta que se toca «Nueva conversación». Mientras hay una acción pendiente, «Probar» la muestra junto al campo de texto con los botones «Sí, confirmo» y «No».

Es lo que enseña el Reto 5: un agente que «te pidió permiso tres veces porque no sabía que ya se lo habías dado» no tiene estado en su memoria.

En la app cada equipo, desde el celular:

1. registra las decisiones del juego de roles (II.A);
2. configura su agente sin escribir código: identidad, instrucciones, memoria, herramientas, hooks y un caso de prueba;
3. lo prueba en un chat y corre 7 escenarios comunes;
4. entrega su registro y su agente con un QR.

Ayudas de la interfaz (vista, sin tocar el motor; código en `app/src/vista/`):

- **Marcador vivo** en «Mi agente»: puntos de práctica (escenarios y personalización) siempre a la vista, y un aviso cuando un cambio hace pasar o romper un escenario («✓ P4 … ahora pasa (+4)», «✗ P5 … dejó de pasar (−4)»).
- **Dueños de bloque**: cada sección de «Mi agente» lleva el rol de la II.A que la configura, en el color de su bloque, para que el celular rote dentro del equipo.
- **Ruta de colores**: debajo de cada respuesta, los bloques que recorrió el mensaje, con su sigla y en los colores del kit.
- **Registro II.A**: fichas en los colores del kit; se quita cualquier paso tocándolo, y «Vaciar» pide confirmación.
- **Entregar**: lista lo que quedó vacío y avisa si el registro o el agente cambiaron después de mostrar su QR.
- **Celular probador**: «Probar» › «Probar en otro celular» muestra un QR con un enlace `#/probador/…` que abre en otro celular una copia del agente solo para probar (no se guarda, no se edita ni se entrega). La «versión» de 4 caracteres permite comprobar que los dos celulares tienen el mismo agente.
- **Facilitador**: pitido y destello al importar («importado», «actualizado» o «ya estaba»), «Calificadas n/N» y «Siguiente equipo →» en la rúbrica II.A, y el **torneo de casos** en «II.B»: cada agente contra el caso de prueba propio de los otros equipos (mención, sin puntos).

El **agente base** viene incompleto a propósito: envía correos sin permiso, inventa fuentes y supone datos que nadie le dio. Arreglarlo es parte del taller. La evaluación final usa frases distintas de las de práctica para premiar agentes que generalizan y no los que memorizan frases.

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

La app (JavaScript) y el mock (Python) son dos implementaciones del mismo agente. `pruebas/paridad/` corre más de 200 configuraciones y 52 mensajes en las dos y compara traza, respuesta y puntaje, una por una. Además corre las secuencias de `secuencias.json` (varios mensajes seguidos con la memoria de sesión compartida, como la confirmación en dos turnos) sobre esas configuraciones y sobre las de `configs_secuencias.json`, y compara el resultado completo de cada turno:

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
