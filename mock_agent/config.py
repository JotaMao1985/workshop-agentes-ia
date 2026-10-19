"""Saneamiento de la configuración de un equipo. Espejo de app/src/motor/config.js."""
import json
import re
from pathlib import Path

from texto import normalizar, palabras_de_lista, recortar

DATOS = Path(__file__).resolve().parent / "datos"
LEXICO = json.loads((DATOS / "lexico.json").read_text(encoding="utf-8"))

LIMITES = {"equipo": 30, "nombre": 30, "proposito": 60, "reglas": 3, "palabras": 30, "memoria": 4,
           "valorMemoria": 30, "adaptadaNombre": 24, "hooks": 2, "casoMensaje": 80}
ACCIONES_REGLA = ["responder", "aclarar", "bloquear"]
MODOS = ["siempre", "solo_si_hace_falta"]
ENVIO = ["apagado", "pedir", "siempre_bloquear"]
ESPERAS = ["sin_herramienta", "bloqueo", "aclaracion"]
_NOMBRE = re.compile(r"[a-z][a-z0-9_]{2,23}")


def nombre_adaptada_valido(n):
    return isinstance(n, str) and _NOMBRE.fullmatch(n) is not None and n not in LEXICO["herramientas_base"]


def _texto(v, n):
    return recortar(v if isinstance(v, str) else "", n).strip()


def config_base():
    return json.loads((DATOS / "config_base.json").read_text(encoding="utf-8"))


def sanear_config(c):
    c = c if isinstance(c, dict) else {}
    out = {
        "v": 1,
        "equipo": _texto(c.get("equipo"), LIMITES["equipo"]),
        "nombre": _texto(c.get("nombre"), LIMITES["nombre"]),
        "tipo": c.get("tipo") if c.get("tipo") in LEXICO["tipos_agente"] else "tutor",
        "proposito": _texto(c.get("proposito"), LIMITES["proposito"]),
        "modo": c.get("modo") if c.get("modo") in MODOS else "siempre",
        "reglas": [],
        "memoria": [],
        "herramientas": [],
        "adaptada": None,
        "control": {"envio": "apagado", "args": False, "fuentes": False, "peligrosas": False},
        "hooks": [],
        "caso": None,
    }
    ad = c.get("adaptada") if isinstance(c.get("adaptada"), dict) else None
    if ad and nombre_adaptada_valido(ad.get("n")) and ad.get("b") in LEXICO["herramientas_base"]:
        out["adaptada"] = {
            "n": ad["n"],
            "b": ad["b"],
            "p": _texto(ad.get("p"), LIMITES["palabras"]),
            "f": ad.get("f") if ad["b"] == "buscar_recurso" and ad.get("f") in LEXICO["tipos_recurso"] else "cualquiera",
        }
    nombres = LEXICO["herramientas_base"] + ([out["adaptada"]["n"]] if out["adaptada"] else [])
    reglas = c.get("reglas") if isinstance(c.get("reglas"), list) else []
    for r in reglas[: LIMITES["reglas"]]:
        if not isinstance(r, dict):
            continue
        a = r.get("a") if isinstance(r.get("a"), str) else ""
        ok = a in ACCIONES_REGLA or (a.startswith("herramienta:") and a[12:] in nombres)
        if ok:
            out["reglas"].append({"p": _texto(r.get("p"), LIMITES["palabras"]), "a": a})
    memoria = c.get("memoria") if isinstance(c.get("memoria"), list) else []
    for m in memoria[: LIMITES["memoria"]]:
        if not isinstance(m, dict) or m.get("t") not in LEXICO["tipos_memoria"]:
            continue
        out["memoria"].append({"t": m["t"], "v": _texto(m.get("v"), LIMITES["valorMemoria"])})
    h = c.get("herramientas") if isinstance(c.get("herramientas"), list) else []
    out["herramientas"] = [n for n in LEXICO["herramientas_base"] if n in h]
    ct = c.get("control") if isinstance(c.get("control"), dict) else {}
    out["control"] = {
        "envio": ct.get("envio") if ct.get("envio") in ENVIO else "apagado",
        "args": ct.get("args") is True,
        "fuentes": ct.get("fuentes") is True,
        "peligrosas": ct.get("peligrosas") is True,
    }
    hooks = c.get("hooks") if isinstance(c.get("hooks"), list) else []
    for k in hooks[: LIMITES["hooks"]]:
        if not isinstance(k, dict):
            continue
        if k.get("k") == "contiene":
            out["hooks"].append({"k": "contiene", "v": _texto(k.get("v"), LIMITES["palabras"])})
        elif k.get("k") == "confirmar" and k.get("v") in nombres:
            out["hooks"].append({"k": "confirmar", "v": k["v"]})
    cs = c.get("caso") if isinstance(c.get("caso"), dict) else None
    if cs:
        e = cs.get("e") if isinstance(cs.get("e"), str) else ""
        if e in ESPERAS or (e.startswith("herramienta:") and e[12:] in nombres):
            out["caso"] = {"m": _texto(cs.get("m"), LIMITES["casoMensaje"]), "e": e}
    return out


def regla_valida(r):
    return len(palabras_de_lista(r["p"])) > 0


__all__ = ["sanear_config", "config_base", "LEXICO", "DATOS", "LIMITES", "normalizar", "regla_valida"]
