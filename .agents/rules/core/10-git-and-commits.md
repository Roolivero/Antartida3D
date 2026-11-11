---
trigger: always_on
description: Ramas por issue, sin secretos y títulos descriptivos en español.
---

# 10. Git y Ramas

> **Por qué:** El flujo de trabajo del equipo se organiza por issues en ramas dedicadas para evitar colisiones y mantener el historial ordenado.

1. Trabaja en una rama vinculada al issue asignado (`<N>-...`), creada desde `main` con `gh issue develop <N> --base main --checkout`.
2. Nunca commitees directamente en `main`.
3. No commitees `.env`, credenciales ni secretos.
4. Los títulos de commits deben ser claros y descriptivos en español, referenciando `#<N>` cuando corresponda.
5. Toca solo los archivos necesarios para el issue asignado.
