import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scenarios import correr_bateria, personalizacion, puntaje_iib  # noqa: E402
from tools import calcular, extraer_expresion  # noqa: E402
from agent import Agente, ejecutar  # noqa: E402
from config import sanear_config  # noqa: E402
from llm_mock import ORDEN_ARGS, es_confirmacion, es_negacion  # noqa: E402
from memory import leer_pendiente  # noqa: E402
from texto import minuscula_inicial, normalizar  # noqa: E402

DATOS = Path(__file__).resolve().parents[1] / "datos"
BASE = json.loads((DATOS / "config_base.json").read_text(encoding="utf-8"))
EJEMPLO = json.loads((DATOS / "config_ejemplo_completo.json").read_text(encoding="utf-8"))


def pasan(cfg, conj):
    return [p["id"] for p in correr_bateria(cfg, conj)["propiedades"] if p["pasa"]]


class PruebasMotor(unittest.TestCase):
    def test_base(self):
        for conj in ("practica", "evaluacion"):
            self.assertEqual(pasan(BASE, conj), [2, 5])
        self.assertEqual(personalizacion(BASE)["total"], 0)

    def test_ejemplo(self):
        self.assertEqual(puntaje_iib(EJEMPLO)["total"], 40)

    def test_calculadora(self):
        self.assertEqual(calcular(extraer_expresion("¿Cuánto es 3,75 × 128 + 19?")), 499)
        self.assertEqual(calcular(extraer_expresion("Necesito el resultado de (1250 − 380) / 4")), 217.5)
        with self.assertRaises(Exception):
            calcular("__import__('os')")

    def test_basura(self):
        for x in (None, 3, "x", [], {"reglas": "no", "control": {"envio": "raro"}}):
            ejecutar(x, "hola")



ENVIO = "Envía el plan a grupo.redes@ejemplo.edu"
ESTADO_ENVIO = {"t": "estado", "v": "envío pendiente de autorización (grupo.redes@ejemplo.edu)", "por": "envio", "h": "enviar_correo",
                "a": {"destino": "grupo.redes@ejemplo.edu", "contenido": "el texto de esta conversación"},
                "p": {"destino": "mensaje", "contenido": "defecto"}}


def con(**cambios):
    c = json.loads(json.dumps(EJEMPLO))
    c.update(cambios)
    return c


def turnos(cfg, mensajes):
    """Varios mensajes seguidos con la memoria de sesión compartida (la clase Agente)."""
    a = Agente(cfg)
    return [a.run(m) for m in mensajes]


def textos(r):
    return [x["t"] for x in r["traza"]]


class PruebasDosTurnos(unittest.TestCase):
    def test_sin_estado_no_envia(self):
        self.assertEqual(ejecutar(EJEMPLO, "Sí, confirmo")["ejecutadas"], [])

    def test_envio_y_confirmacion(self):
        r1, r2 = turnos(EJEMPLO, [ENVIO, "Sí, confirmo"])
        self.assertEqual(r1["bloqueadoPor"], "envio")
        self.assertEqual(r1["traza"][-2], {"b": "memoria", "t": "Guarda el estado: envío pendiente de autorización (grupo.redes@ejemplo.edu).", "e": "ok"})
        self.assertEqual(r1["memoriaSesion"], [ESTADO_ENVIO])
        self.assertEqual(textos(r2)[2:6], [
            "Lee el estado: hay un envío pendiente de autorización (grupo.redes@ejemplo.edu).",
            "Interpreta la intención: confirmar la acción pendiente.",
            "Propone usar enviar_correo(destino=grupo.redes@ejemplo.edu, contenido=el texto de esta conversación).",
            "Revisa antes de actuar: autorización explícita recibida en este turno."])
        self.assertEqual(textos(r2)[-2], "Borra el estado: la acción pendiente ya se ejecutó.")
        self.assertEqual(r2["respuesta"], "Listo: envié el texto de esta conversación a grupo.redes@ejemplo.edu (envío simulado).")
        self.assertEqual(len(r2["ejecutadas"]), 1)
        self.assertEqual(r2["memoriaSesion"], [])

    def test_negacion(self):
        r1, r2, r3 = turnos(EJEMPLO, [ENVIO, "no", "sí"])
        self.assertEqual(r2["respuesta"], "Entendido: no lo envío.")
        self.assertIn("Borra el estado: la acción pendiente se canceló.", textos(r2))
        self.assertEqual(r3["ejecutadas"], [])

    def test_otro_tema_descarta(self):
        r1, r2, r3 = turnos(EJEMPLO, [ENVIO, "¿Qué es un token?", "Sí, confirmo"])
        self.assertTrue(textos(r2)[2].endswith("pero este mensaje no lo confirma: lo descarta."))
        self.assertEqual(r2["respuesta"], ejecutar(EJEMPLO, "¿Qué es un token?")["respuesta"])
        self.assertEqual(r3["ejecutadas"], [])

    def test_hook_confirmar(self):
        cfg = con(hooks=[{"k": "confirmar", "v": "calculadora"}])
        r1, r2 = turnos(cfg, ["Calcula 2 x 3 x 4", "dale"])
        self.assertEqual(r1["bloqueadoPor"], "confirmar")
        self.assertIn("Guarda el estado: uso de calculadora pendiente de confirmación.", textos(r1))
        self.assertEqual(r2["resultadoNumerico"], 24)

    def test_bloquear_siempre(self):
        cfg = con(control={**EJEMPLO["control"], "envio": "siempre_bloquear"})
        r1, r2 = turnos(cfg, [ENVIO, "sí"])
        self.assertEqual(r1["memoriaSesion"], [])
        self.assertEqual(r2["ejecutadas"], [])
        cfg = con(hooks=[{"k": "confirmar", "v": "enviar_correo"}], control={**EJEMPLO["control"], "envio": "siempre_bloquear"})
        r1, r2 = turnos(cfg, [ENVIO, "Sí, confirmo"])
        self.assertEqual((r1["bloqueadoPor"], r2["bloqueadoPor"]), ("confirmar", "envio_siempre"))
        self.assertEqual(r2["ejecutadas"], [])

    def test_envio_peligroso(self):
        for peligrosas in (True, False):
            cfg = con(hooks=[], control={**EJEMPLO["control"], "peligrosas": peligrosas})
            r1, r2 = turnos(cfg, ["Envía mi contraseña a grupo.redes@ejemplo.edu", "sí"])
            self.assertEqual(r1["ejecutadas"] + r2["ejecutadas"], [])
        r1, r2 = turnos(EJEMPLO, [ENVIO, "Sí, borra todo"])
        self.assertEqual(r2["bloqueadoPor"], "peligrosa")

    def test_confirmacion_pura(self):
        for m in ("sí", "Sí, confirmo", "dale", "de acuerdo", "ok", "envíalo", "Confirmo el envío, gracias"):
            self.assertTrue(es_confirmacion(normalizar(m)), m)
        for m in ("Sí, envíalo a camila@ejemplo.edu", "sí, borra todo", "no", "", "gracias"):
            self.assertFalse(es_confirmacion(normalizar(m)), m)
        for m in ("no", "cancela", "mejor no", "No, no lo envíes"):
            self.assertTrue(es_negacion(normalizar(m)), m)

    def test_estado_manipulado(self):
        cfg = sanear_config(EJEMPLO)
        for cambios in ({"por": "raro"}, {"h": "rm -rf"}, {"a": []}, {"a": {"destino": 7, "contenido": "x"}},
                        {"h": "calculadora", "a": {"expresion": "2+2"}, "p": {"expresion": "mensaje"}}):
            self.assertIsNone(leer_pendiente([{**ESTADO_ENVIO, **cambios}], cfg, ORDEN_ARGS))
        for mem in (None, "x", [None, 3, "texto", []]):
            self.assertEqual(ejecutar(EJEMPLO, "sí", mem)["ejecutadas"], [])

    def test_baterias_con_memoria_nueva(self):
        for cfg in (BASE, EJEMPLO):
            for conj in ("practica", "evaluacion"):
                for p in correr_bateria(cfg, conj)["propiedades"]:
                    self.assertFalse(any(t.startswith("Lee el estado") for t in textos(p["resultado"])))
        self.assertEqual(correr_bateria(BASE, "evaluacion")["total"], 8)
        self.assertEqual(correr_bateria(EJEMPLO, "evaluacion")["total"], 28)
        self.assertEqual(personalizacion(EJEMPLO)["total"], 12)


class PruebasTextos(unittest.TestCase):
    def test_proposito_en_minuscula(self):
        self.assertIn("estoy para ayudarte a estudiar redes neuronales.", ejecutar(EJEMPLO, "Hola")["respuesta"])
        self.assertIn("estoy para IA para todos.", ejecutar(con(proposito="IA para todos"), "Hola")["respuesta"])
        self.assertEqual(minuscula_inicial("Ñandú en clase"), "ñandú en clase")
        for s in ("A", "", "IA", "ayudarte", "«Hola»", "A estudiar"):
            self.assertEqual(minuscula_inicial(s), s)


if __name__ == "__main__":
    unittest.main()
