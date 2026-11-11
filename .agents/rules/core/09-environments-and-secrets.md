---
trigger: always_on
description: Configuración por entorno y prevención de fugas de credenciales.
---

# 09. Entornos y Secretos

> **Por qué:** Compartir secretos entre ambientes provoca fugas e incidentes.

1. Mantén la configuración pública y estática en constantes del código o archivos de configuración.
2. No commitees `.env` ni credenciales locales.
3. El agente nunca escribe ni sube secretos a servicios remotos.

## Guardián
Prevención de secretos en git.

<!-- adapt -->
- `.gitignore` ignora archivos `.env` y variables locales.
<!-- /adapt -->
