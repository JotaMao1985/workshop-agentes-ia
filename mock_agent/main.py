"""Mock local de un agente de IA, sin LLM real, sin créditos y sin claves de API.

Uso:
    python main.py                         # conversa con el agente base
    python main.py --config mi_agente.json # conversa con tu agente (exportado desde la app)
    python main.py --escenarios            # corre la batería de práctica y de evaluación
    python main.py --codigo "B1.…"         # lee el código que entrega la app y calcula su puntaje
"""
import argparse
import json
import sys

from agent import Agente
from codigo import decodificar
from config import config_base, sanear_config
from scenarios import correr_bateria, personalizacion, puntaje_iib

ICONO = {"ok": " ", "aviso": "!", "bloqueado": "✋", "error": "✗"}


def imprimir_traza(r):
    for t in r["traza"]:
        print(f"  {ICONO.get(t['e'], ' ')} [{t['b']:<12}] {t['t']}")


def imprimir_bateria(cfg):
    for conjunto in ("practica", "evaluacion"):
        b = correr_bateria(cfg, conjunto)
        print(f"\nEscenarios de {conjunto}: {b['total']}/28")
        for p in b["propiedades"]:
            print(f"  {'✓' if p['pasa'] else '✗'} P{p['id']} {p['nombre']}: «{p['mensaje']}»")
            print(f"      → {p['resultado']['respuesta']}")
    pz = personalizacion(cfg)
    print(f"\nPersonalización: {pz['total']}/12")
    for it in pz["items"]:
        print(f"  {'✓' if it['pasa'] else '✗'} {it['nombre']}")
    print(f"\nPuntaje oficial de II.B (evaluación + personalización): {puntaje_iib(cfg)['total']}/40")


def main():
    ap = argparse.ArgumentParser(description="Mock local de un agente de IA")
    ap.add_argument("--config", help="archivo JSON con la configuración del agente")
    ap.add_argument("--codigo", help="código B1.… o A1.… copiado desde la app")
    ap.add_argument("--escenarios", action="store_true", help="corre las baterías y muestra el puntaje")
    a = ap.parse_args()

    cfg = config_base()
    if a.config:
        with open(a.config, encoding="utf-8") as f:
            cfg = json.load(f)
    if a.codigo:
        tipo, datos = decodificar(a.codigo)
        if tipo == "A":
            print(json.dumps(datos, ensure_ascii=False, indent=2))
            return
        cfg = datos
    cfg = sanear_config(cfg)
    print(f"Agente: {cfg['nombre'] or 'Agente base'} ({cfg['tipo']})")
    if a.escenarios or a.codigo:
        imprimir_bateria(cfg)
        return
    agente = Agente(cfg)
    print("Escribe un mensaje (o «salir»).")
    for linea in sys.stdin:
        msg = linea.strip()
        if msg.lower() in ("salir", "exit", "quit"):
            break
        if not msg:
            continue
        r = agente.run(msg)
        imprimir_traza(r)
        print(f"\n🤖 {r['respuesta']}\n")


if __name__ == "__main__":
    main()
