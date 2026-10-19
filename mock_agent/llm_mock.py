"""El «LLM» simulado: reglas que interpretan la intención, extraen argumentos (y los suponen
cuando faltan, como haría un modelo real) y redactan. Espejo de la parte «LLM decide» de agente.js."""
import re

from config import LEXICO
from texto import normalizar, primera_frase, palabras_de_lista, correos, recortar, cubre_por
from tools import TEXTOS, extraer_expresion, palabras_contenido

ORDEN_ARGS = {
    "calculadora": ["expresion"],
    "crear_plan_estudio": ["tema", "dias", "horas"],
    "buscar_recurso": ["tema"],
    "resumir_texto": ["texto"],
    "evaluar_entrega": ["texto"],
    "enviar_correo": ["destino", "contenido"],
    "consultar_calendario": [],
}


def tema_de(msg, marcadores):
    rel = " " + msg + " "
    for m in marcadores:
        clave = " " + m + " "
        i = rel.rfind(clave)
        if i < 0:
            continue
        palabras = [w for w in rel[i + len(clave):].strip().split(" ") if w]
        while palabras and palabras[0] in LEXICO["articulos"]:
            palabras = palabras[1:]
        palabras = palabras[:6]
        if palabras:
            return " ".join(palabras)
    return None


def numero_de(s):
    n = normalizar(s)
    m = re.search(r"(?:^| )([0-9]+)(?= |$)", n)
    if m:
        return int(m.group(1))
    for w in n.split(" "):
        if w in LEXICO["numeros"]:
            return LEXICO["numeros"][w]
    return None


def numero_antes(msg, unidades):
    palabras = "|".join(LEXICO["numeros"].keys())
    m = re.search(r"(?:^| )([0-9]+|" + palabras + r") (?:" + "|".join(unidades) + r")(?= |$)", msg)
    if not m:
        return None
    v = int(m.group(1)) if re.fullmatch(r"[0-9]+", m.group(1)) else LEXICO["numeros"][m.group(1)]
    return v if 1 <= v <= 14 else None


def texto_tras_dos_puntos(crudo):
    i = crudo.find(":")
    if i < 0:
        return None
    t = recortar(crudo[i + 1:].strip(), 200)
    return t or None


def extraer_args(base, crudo, msg, memoria):
    """Devuelve (args, procedencia, tomados_de_memoria, sin_expresion)."""
    args, proc, de_mem = {}, {}, []
    sup = TEXTOS["supuestos"]

    def poner(k, v, p):
        args[k] = v
        proc[k] = p

    if base == "calculadora":
        e = extraer_expresion(crudo)
        if e is None:
            return args, proc, de_mem, True
        poner("expresion", e, "mensaje")
    elif base == "crear_plan_estudio":
        tema = tema_de(msg, LEXICO["marcadores_tema"]["crear_plan_estudio"])
        dias = numero_antes(msg, ["dia", "dias"])
        horas = numero_antes(msg, ["hora", "horas"])
        if tema:
            poner("tema", tema, "mensaje")
        elif memoria.de_memoria("tema"):
            poner("tema", memoria.de_memoria("tema"), "memoria")
            de_mem.append("tema")
        else:
            poner("tema", sup["tema"], "supuesto")
        for k, v in (("dias", dias), ("horas", horas)):
            if v is not None:
                poner(k, str(v), "mensaje")
                continue
            mv = memoria.de_memoria(k)
            n = None if mv is None else numero_de(mv)
            if n is not None and 1 <= n <= 14:
                poner(k, str(n), "memoria")
                de_mem.append(k)
            else:
                poner(k, sup[k], "supuesto")
    elif base == "buscar_recurso":
        tema = tema_de(msg, LEXICO["marcadores_tema"]["buscar_recurso"])
        if tema:
            poner("tema", tema, "mensaje")
        elif memoria.de_memoria("tema"):
            poner("tema", memoria.de_memoria("tema"), "memoria")
            de_mem.append("tema")
        else:
            poner("tema", sup["tema"], "supuesto")
    elif base in ("resumir_texto", "evaluar_entrega"):
        t = texto_tras_dos_puntos(crudo)
        if t:
            poner("texto", t, "mensaje")
        else:
            poner("texto", sup["texto"], "supuesto")
    elif base == "enviar_correo":
        c = correos(crudo)
        mc = memoria.de_memoria("correo_grupo")
        cm = [] if mc is None else correos(mc)
        if c:
            poner("destino", c[0], "mensaje")
        elif cm:
            poner("destino", cm[0], "memoria")
            de_mem.append("destino")
        else:
            poner("destino", sup["destino"], "supuesto")
        poner("contenido", TEXTOS["contenido_por_defecto"], "defecto")
    return args, proc, de_mem, False


def interpretar(cfg, crudo, msg):
    """LLM decide: regla del equipo > «recuerda que» > herramienta adaptada > léxico base > conversación."""
    for rg in cfg["reglas"]:
        p = primera_frase(msg, palabras_de_lista(rg["p"]))
        if p:
            return {"intencion": "regla", "regla": rg, "palabra": p}
    frase = primera_frase(msg, LEXICO["recordar"])
    adaptada = primera_frase(msg, palabras_de_lista(cfg["adaptada"]["p"])) if cfg["adaptada"] else None
    if frase:
        rel = " " + msg + " "
        i = rel.find(" " + frase + " ")
        return {"intencion": "recordar", "texto": recortar(rel[i + len(frase) + 2:].strip(), 40)}
    if adaptada:
        return {"intencion": "adaptada"}
    for it in LEXICO["orden_intenciones"]:
        hay = primera_frase(msg, LEXICO["intenciones"][it]) is not None
        if not hay and it == "calcular":
            hay = extraer_expresion(crudo) is not None
        if hay:
            return {"intencion": it}
    return {"intencion": "conversacional"}


def tema_modo_siempre(crudo):
    return " ".join(palabras_contenido(crudo))


def es_confirmacion(msg):
    """¿El mensaje es solo una confirmación («sí», «sí, confirmo», «dale», «ok»…), sin otra acción ni destino?"""
    return cubre_por(msg, LEXICO["confirmacion"], LEXICO["relleno_confirmacion"])


def es_negacion(msg):
    """¿El mensaje es solo una negación («no», «cancela», «mejor no», «no lo envíes»…)?"""
    return cubre_por(msg, LEXICO["negacion"], LEXICO["relleno_confirmacion"])
