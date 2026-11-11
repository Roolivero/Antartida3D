---
trigger: always_on
description: Manejo de errores y logging en la interfaz y almacenamiento.
---

# 05. Errores y Logging

> **Por qué:** Un error tragado o un fallo de contexto rompe la experiencia de usuario sin diagnóstico claro.

1. No captures una excepción sin manejarla o recuperar el estado.
2. Manejo explícito con try/catch en accesos a storage local (`localStorage` bloqueado o en modo incógnito).
3. Fallback controlado ante pérdida de contexto WebGL o ausencia de soporte 3D: volver a la vista 2D accesible sin bloquear la interfaz.
4. No registres secretos, tokens ni datos personales en logs.
5. Los tests de Playwright fallan ante cualquier error no capturado en la consola del navegador.

## Guardián
Manejo de errores y red de seguridad en tests.

<!-- adapt -->
- Playwright captura errores de consola y excepciones no controladas en `packages/e2e/`.
<!-- /adapt -->
