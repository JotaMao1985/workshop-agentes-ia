"""Memoria del agente: lo que sabe del usuario y de la tarea, más el estado del flujo.
Se lee (de_memoria), se escribe (escribir) y se olvida (olvidar).

El estado es una acción pendiente: cuando Control (antes) bloquea una acción porque falta autorización
o confirmación, se guarda en la memoria de la sesión una entrada {"t": "estado", "v", "por", "h", "a", "p"}
con la herramienta y sus argumentos. El turno siguiente la lee: «sí» la ejecuta, «no» la cancela y
cualquier otro mensaje la descarta. Espejo de entradasDeSesion() y leerPendiente() en agente.js."""
from config import LEXICO
from texto import recortar

TIPO_ESTADO = "estado"
MOTIVOS = ("envio", "confirmar")
PROCEDENCIAS = ("mensaje", "memoria", "supuesto", "defecto")


class Memoria:
    def __init__(self, entradas=None):
        self.entradas = [dict(e) for e in (entradas or [])]

    def __len__(self):
        return len(self.entradas)

    def de_memoria(self, tipo):
        """Primer valor no vacío de un tipo (dias, horas, tema, correo_grupo, preferencia, otro)."""
        for e in self.entradas:
            if e.get("t") == tipo and str(e.get("v", "")).strip():
                return str(e["v"]).strip()
        return None

    def escribir(self, tipo, valor):
        self.entradas.append({"t": tipo, "v": valor})

    def olvidar(self, tipo):
        self.entradas = [e for e in self.entradas if e.get("t") != tipo]


def entradas_de_sesion(memoria_sesion):
    """Las entradas de la memoria de sesión, sin el estado."""
    lista = memoria_sesion if isinstance(memoria_sesion, list) else []
    return [e for e in lista if isinstance(e, dict) and isinstance(e.get("v"), str) and e.get("t") != TIPO_ESTADO]


def leer_pendiente(memoria_sesion, cfg, orden_args):
    """La acción pendiente de la memoria de sesión, validada contra la configuración, o None.
    Devuelve {"por", "h", "base", "args", "proc"}; la descripción la agrega el agente."""
    lista = memoria_sesion if isinstance(memoria_sesion, list) else []
    e = next((x for x in lista if isinstance(x, dict) and x.get("t") == TIPO_ESTADO), None)
    if e is None or e.get("por") not in MOTIVOS:
        return None
    h, ad = e.get("h"), cfg["adaptada"]
    es_adaptada = ad is not None and h == ad["n"]
    if not es_adaptada and not (h in LEXICO["herramientas_base"] and h in cfg["herramientas"]):
        return None
    base = ad["b"] if es_adaptada else h
    if e["por"] == "envio" and base != "enviar_correo":
        return None
    a, pr = e.get("a"), e.get("p")
    if not isinstance(a, dict) or not isinstance(pr, dict):
        return None
    args, proc = {}, {}
    for k in orden_args[base]:
        if not isinstance(a.get(k), str) or pr.get(k) not in PROCEDENCIAS:
            return None
        args[k] = recortar(a[k], 300)
        proc[k] = pr[k]
    return {"por": e["por"], "h": h, "base": base, "args": args, "proc": proc}
