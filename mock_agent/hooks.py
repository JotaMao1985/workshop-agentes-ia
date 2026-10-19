"""Control: hooks antes de actuar y evaluador después. Espejo de «Control (antes)» y
«Control (después)» en agente.js."""
from config import LEXICO
from texto import primera_frase, palabras_de_lista


def control_antes(cfg, msg, tipo, nombre, base, habilitada, args, supuestos, autorizado):
    """Devuelve (bloqueo, avisos). bloqueo es None o {"por": código, "datos": {...}}."""
    bloqueo, avisos = None, []
    for hk in cfg["hooks"]:
        if hk["k"] != "contiene":
            continue
        p = primera_frase(msg, palabras_de_lista(hk["v"]))
        if p:
            bloqueo = {"por": "regla", "datos": {"palabra": p}}
            break
    if not bloqueo and cfg["control"]["peligrosas"] and primera_frase(msg, LEXICO["intenciones"]["peligrosa"]):
        bloqueo = {"por": "peligrosa", "datos": {}}
    if not bloqueo and tipo == "herramienta" and habilitada:
        for hk in cfg["hooks"]:
            if hk["k"] == "confirmar" and (hk["v"] == nombre or hk["v"] == base) and not autorizado:
                bloqueo = {"por": "confirmar", "datos": {"herramienta": nombre}}
                break
        if not bloqueo and base == "enviar_correo":
            envio = cfg["control"]["envio"]
            if envio == "siempre_bloquear":
                bloqueo = {"por": "envio_siempre", "datos": {}}
            elif envio == "pedir" and not autorizado:
                bloqueo = {"por": "envio", "datos": {"destino": args.get("destino")}}
            elif envio == "apagado":
                avisos.append("ctrl_sin_hook_envio")
        if not bloqueo and supuestos:
            if cfg["control"]["args"]:
                bloqueo = {"por": "args", "datos": {"herramienta": nombre,
                                                    "supuestos": ", ".join(k + "=" + args[k] for k in supuestos)}}
            else:
                avisos.append("ctrl_sin_hook_args")
    if not bloqueo and tipo == "inexistente":
        avisos.append("ctrl_sin_hook_peligrosa")
    return bloqueo, avisos


def evaluador_activo(cfg):
    return cfg["control"]["fuentes"]
