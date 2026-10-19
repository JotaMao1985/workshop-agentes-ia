"""El agente: el ciclo Orquestador → Memoria → LLM → Control → Herramienta → Observación → LLM →
Control (evaluador) → Memoria → Traza. Espejo de ejecutar() en app/src/motor/agente.js.

Uso mínimo:
    from agent import Agente
    print(Agente(config).run("¿Cuánto es 2 + 2?")["respuesta"])
"""
from config import LEXICO, sanear_config
from hooks import control_antes, evaluador_activo
from llm_mock import ORDEN_ARGS, extraer_args, interpretar, tema_modo_siempre
from memory import Memoria
from texto import normalizar, primera_frase, formatear, contiene, formato_numero, recortar
from tools import TEXTOS, CATALOGO, ErrorCalculo, calcular, correr_herramienta, aproximar, texto_resumen, texto_revision


def _texto_args(args):
    return ", ".join(k + "=" + str(v) for k, v in args.items())


def _mayuscula(s):
    return s[0].upper() + s[1:] if s else s


def ejecutar(cfg_entrada, mensaje, memoria_sesion=None):
    cfg = sanear_config(cfg_entrada)
    crudo = recortar("" if mensaje is None else str(mensaje), 300)
    msg = normalizar(crudo)
    T, R = TEXTOS["traza"], TEXTOS["respuesta"]
    traza = []

    def paso(b, clave, datos=None, e="ok"):
        traza.append({"b": b, "t": formatear(T[clave], datos or {}), "e": e})

    r = {"intencion": "conversacional", "accion": "responder", "herramienta": None, "ejecutadas": [],
         "bloqueado": False, "bloqueadoPor": None, "aclaracion": False, "fuentesInventadas": 0,
         "afirmoAccion": False, "resultadoNumerico": None, "respuesta": "", "memoriaEscrita": [], "traza": traza}
    extra = [e for e in (memoria_sesion if isinstance(memoria_sesion, list) else [])
             if isinstance(e, dict) and isinstance(e.get("v"), str)][:10]
    memoria = Memoria(cfg["memoria"] + extra)
    autorizado = primera_frase(msg, LEXICO["autorizacion"]) is not None

    paso("orquestador", "recibe")
    if len(memoria):
        paso("memoria", "mem_leer", {"n": len(memoria)})
    else:
        paso("memoria", "mem_vacia")

    # --- LLM decide ---
    tipo, nombre, faltan, texto_memoria = None, None, [], ""
    it = interpretar(cfg, crudo, msg)
    r["intencion"] = it["intencion"]
    if it["intencion"] == "regla":
        regla = it["regla"]
        paso("llm", "llm_intencion", {"intencion": TEXTOS["intencion"]["regla"]})
        if regla["a"].startswith("herramienta:"):
            etiqueta = formatear(TEXTOS["accion_regla"]["herramienta"], {"h": regla["a"][12:]})
        else:
            etiqueta = TEXTOS["accion_regla"][regla["a"]]
        paso("llm", "llm_regla", {"palabra": it["palabra"], "accion": etiqueta})
        if regla["a"] == "responder":
            tipo = "responder"
        elif regla["a"] == "aclarar":
            tipo, faltan = "aclarar", ["detalles"]
        elif regla["a"] == "bloquear":
            tipo = "bloquear_instruccion"
        else:
            tipo, nombre = "herramienta", regla["a"][12:]
    else:
        if it["intencion"] == "recordar":
            texto_memoria = it["texto"]
            tipo = "memoria"
        elif it["intencion"] == "adaptada":
            tipo, nombre = "herramienta", cfg["adaptada"]["n"]
        elif it["intencion"] == "peligrosa":
            tipo = "inexistente"
        elif it["intencion"] == "conversacional":
            tipo = "responder"
        else:
            tipo, nombre = "herramienta", LEXICO["herramienta_de_intencion"][it["intencion"]]
        paso("llm", "llm_intencion", {"intencion": TEXTOS["intencion"][r["intencion"]]})
        if tipo == "responder" and cfg["modo"] == "siempre" and "buscar_recurso" in cfg["herramientas"]:
            paso("llm", "llm_modo_siempre", {}, "aviso")
            tipo, nombre = "herramienta", "buscar_recurso"

    base, habilitada, args, proc, supuestos = None, False, {}, {}, []
    if tipo == "herramienta":
        es_adaptada = cfg["adaptada"] is not None and nombre == cfg["adaptada"]["n"]
        base = cfg["adaptada"]["b"] if es_adaptada else nombre
        habilitada = es_adaptada or nombre in cfg["herramientas"]
        r["herramienta"] = nombre
        if r["intencion"] == "conversacional":
            tema = tema_modo_siempre(crudo)
            if tema:
                args, proc = {"tema": tema}, {"tema": "mensaje"}
            else:
                args, proc = {"tema": TEXTOS["supuestos"]["tema"]}, {"tema": "supuesto"}
        else:
            args, proc, de_mem, sin_expresion = extraer_args(base, crudo, msg, memoria)
            if sin_expresion:
                tipo, faltan = "aclarar", ["expresion"]
            elif de_mem:
                paso("memoria", "mem_usa", {"datos": ", ".join(k + "=" + args[k] for k in de_mem)})
        if tipo == "herramienta":
            supuestos = [k for k in ORDEN_ARGS[base] if proc.get(k) == "supuesto"]
            if habilitada:
                paso("llm", "llm_propone", {"herramienta": nombre, "args": _texto_args(args)})
                if supuestos:
                    paso("llm", "llm_supone", {"supuestos": ", ".join(k + "=" + args[k] for k in supuestos)}, "aviso")
            else:
                paso("llm", "llm_sin_tool", {"herramienta": nombre}, "aviso")
    if tipo == "responder":
        paso("llm", "llm_responder")
    elif tipo == "aclarar":
        paso("llm", "llm_aclarar", {"faltan": TEXTOS["y"].join(TEXTOS["faltan"][k] for k in faltan)})
    elif tipo == "inexistente":
        paso("llm", "llm_inexistente")
    elif tipo == "memoria":
        paso("llm", "llm_memoria", {"texto": texto_memoria})
    elif tipo == "bloquear_instruccion":
        paso("llm", "llm_bloquear")
    r["accion"] = tipo

    # --- Control (antes) ---
    bloqueo, avisos = control_antes(cfg, msg, tipo, nombre, base, habilitada, args, supuestos, autorizado)
    if bloqueo:
        r["bloqueado"], r["bloqueadoPor"] = True, bloqueo["por"]
        claves = {"regla": "ctrl_bloq_regla", "peligrosa": "ctrl_bloq_peligrosa", "confirmar": "ctrl_bloq_confirmar",
                  "envio_siempre": "ctrl_bloq_envio_siempre", "envio": "ctrl_bloq_envio", "args": "ctrl_bloq_args"}
        paso("control", claves[bloqueo["por"]], bloqueo["datos"], "bloqueado")
        por = bloqueo["por"]
        if por == "regla":
            r["respuesta"] = R["bloq_regla"]
        elif por == "peligrosa":
            r["respuesta"] = R["bloq_peligrosa"]
        elif por == "confirmar":
            r["respuesta"] = formatear(R["bloq_confirmar"], {"herramienta": nombre})
        elif por == "envio_siempre":
            r["respuesta"] = R["bloq_envio_siempre"]
        elif por == "envio":
            r["respuesta"] = formatear(R["bloq_envio"], {"destino": args.get("destino")})
        else:
            r["aclaracion"] = True
            r["respuesta"] = formatear(R["aclarar"], {"faltan": TEXTOS["y"].join(TEXTOS["faltan"][k] for k in supuestos)})
    else:
        if avisos:
            for a in avisos:
                paso("control", a, {}, "aviso")
        else:
            paso("control", "ctrl_ok")

        # --- Herramienta y observación ---
        obs = None
        if tipo == "herramienta" and habilitada:
            es_adaptada = cfg["adaptada"] is not None and nombre == cfg["adaptada"]["n"]
            obs = correr_herramienta(base, args, cfg["adaptada"]["f"] if es_adaptada else "cualquiera")
            r["ejecutadas"].append({"nombre": nombre, "base": base, "args": args, "proc": proc, "ok": obs["ok"]})
            if obs["ok"]:
                paso("herramientas", "tool_ok", {"herramienta": nombre, "observacion": obs["texto"]})
            else:
                paso("herramientas", "tool_error", {"herramienta": nombre, "error": obs["texto"]}, "error")
            paso("orquestador", "orq_bucle")

        # --- LLM redacta ---
        paso("llm", "llm_redacta")
        if tipo == "herramienta":
            if base == "calculadora":
                if habilitada:
                    if obs["ok"]:
                        r["resultadoNumerico"] = obs["valor"]
                        r["respuesta"] = formatear(R["calc"], {"expr": args["expresion"], "res": formato_numero(obs["valor"])})
                    else:
                        r["respuesta"] = formatear(R["calc_error"], {"error": obs["texto"]})
                else:
                    try:
                        r["respuesta"] = formatear(R["calc_aprox"], {"aprox": formato_numero(aproximar(calcular(args["expresion"])))})
                    except ErrorCalculo as e:
                        r["respuesta"] = formatear(R["calc_error"], {"error": TEXTOS["errores"].get(e.codigo, TEXTOS["errores"]["sintaxis"])})
            elif base == "crear_plan_estudio":
                if habilitada:
                    r["respuesta"] = formatear(R["plan"], {"tema": args["tema"], "lineas": obs["texto2"]})
                    pref = memoria.de_memoria("preferencia")
                    if pref:
                        r["respuesta"] += formatear(R["plan_pref"], {"pref": pref})
                else:
                    r["respuesta"] = formatear(R["plan_sin_tool"], {"dias": args["dias"], "horas": args["horas"]})
            elif base == "buscar_recurso":
                if habilitada and obs["lista"]:
                    lista = TEXTOS["separador_lista"].join(
                        "«" + x["titulo"] + "» (" + TEXTOS["tipo_recurso"][x["tipo"]] + ")" for x in obs["lista"])
                    r["respuesta"] = formatear(R["buscar"], {"lista": lista})
                else:
                    paso("llm", "llm_inventa", {}, "aviso")
                    r["fuentesInventadas"] = 1
                    r["respuesta"] = formatear(R["buscar_inventa"], {"tema_titulo": _mayuscula(args["tema"])})
            elif base == "enviar_correo":
                r["respuesta"] = (formatear(R["enviar"], {"contenido": args["contenido"], "destino": args["destino"]})
                                  if habilitada else R["enviar_sin_tool"])
            elif base == "resumir_texto":
                r["respuesta"] = formatear(R["resumir"], {"res": texto_resumen(args["texto"])})
            elif base == "evaluar_entrega":
                r["respuesta"] = formatear(R["evaluar"], {"res": texto_revision(args["texto"])})
            elif base == "consultar_calendario":
                r["respuesta"] = formatear(R["calendario"], {"res": CATALOGO["calendario"]}) if habilitada else R["calendario_sin_tool"]
        elif tipo == "responder":
            definicion = None
            for term, txt in TEXTOS["glosario"]:
                if contiene(msg, term):
                    definicion = txt
                    break
            r["respuesta"] = definicion or formatear(R["por_defecto"], {
                "nombre": cfg["nombre"] or "Agente base",
                "proposito": cfg["proposito"] or TEXTOS["proposito_por_tipo"][cfg["tipo"]]})
        elif tipo == "inexistente":
            paso("llm", "llm_afirma", {}, "aviso")
            r["afirmoAccion"], r["respuesta"] = True, R["afirma"]
        elif tipo == "memoria":
            r["memoriaEscrita"].append({"t": "preferencia", "v": texto_memoria})
            r["respuesta"] = R["memoria"]
        elif tipo == "aclarar":
            r["aclaracion"] = True
            r["respuesta"] = formatear(R["aclarar"], {"faltan": TEXTOS["y"].join(TEXTOS["faltan"][k] for k in faltan)})
        elif tipo == "bloquear_instruccion":
            r["bloqueado"], r["bloqueadoPor"], r["respuesta"] = True, "instruccion", R["bloq_instruccion"]

        # --- Control (después): evaluador ---
        if r["fuentesInventadas"] > 0 and evaluador_activo(cfg):
            paso("control", "eval_corrige")
            r["fuentesInventadas"] = 0
            r["respuesta"] = formatear(R["buscar_honesto"], {"tema": args["tema"]})
        elif evaluador_activo(cfg):
            paso("control", "eval_ok")
        else:
            paso("control", "eval_apagado", {}, "aviso")

    # --- Memoria (escribir) y traza ---
    enviado = next((x for x in r["ejecutadas"] if x["base"] == "enviar_correo" and x["ok"]), None)
    if r["memoriaEscrita"]:
        paso("memoria", "mem_escribe", {"texto": r["memoriaEscrita"][0]["v"]})
    elif enviado:
        paso("memoria", "mem_estado", {"estado": formatear(TEXTOS["estado_envio"], {"destino": enviado["args"]["destino"]})})
    else:
        paso("memoria", "mem_nada")
    paso("control", "traza", {"n": len(traza) + 1})
    return r


class Agente:
    """Envoltorio con memoria de sesión: lo que se pide recordar persiste entre mensajes."""

    def __init__(self, config=None):
        self.config = sanear_config(config if config is not None else {})
        self.memoria_sesion = []

    def run(self, mensaje):
        r = ejecutar(self.config, mensaje, self.memoria_sesion)
        self.memoria_sesion.extend(r["memoriaEscrita"])
        return r
