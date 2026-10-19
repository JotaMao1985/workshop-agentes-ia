import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scenarios import correr_bateria, personalizacion, puntaje_iib  # noqa: E402
from tools import calcular, extraer_expresion  # noqa: E402
from agent import ejecutar  # noqa: E402

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


if __name__ == "__main__":
    unittest.main()
