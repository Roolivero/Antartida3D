---
trigger: always_on
description: Capas con dependencias en una sola dirección y acceso a datos centralizado.
---

# 01. Arquitectura y Capas

> **Por qué:** El acoplamiento entre capas dificulta las pruebas aisladas y filtra lógica interna o credenciales.

1. Respeta la jerarquía: presentación → lógica de dominio/proyección → datos/assets.
2. Centraliza la lógica de negocio y datos en `packages/core`. La interfaz en `packages/react-ui` o las apps no reinventa proyecciones ni reglas.
3. Valida esquemas en cada frontera de datos y assets externos.
4. Mantén datos estáticos y de referencia en módulos dedicados (`core/src/content/`).
5. Cada app vive en `apps/` y el código reusable en `packages/`.

## Guardián
Estructura y límites de paquetes.

<!-- adapt -->
- Paquetes: `packages/core` (dominio, proyección, lógica pura), `packages/react-ui` (componentes), `packages/e2e` (tests).
- Aplicación: `apps/dibujado` (2D + 3D).
<!-- /adapt -->
