"""Memoria del agente: lo que sabe del usuario y de la tarea, más el estado del flujo.
Se lee (de_memoria), se escribe (escribir) y se olvida (olvidar)."""


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
