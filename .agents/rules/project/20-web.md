---
trigger:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.css"
  - "**/*.html"
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.css"
  - "**/*.html"
description: Frontend: accesibilidad, rendimiento, estados de UI y diseño dibujado.
---

# 20. Web / Frontend

> **Por qué:** La accesibilidad y el rendimiento se rompen en silencio; son baratos de hacer bien al inicio.

1. Usa HTML semántico y teclado operable. Cada elemento interactivo debe ser alcanzable y accionable por teclado.
   - Cada diálogo debe atrapar el foco mientras esté abierto y devolverlo a su disparador al cerrarse con Escape.
   - Todo botón lleva `aria-label` descriptivo o texto visible.
2. Sin desbordamiento horizontal: la página y sus paneles deben encajar en el viewport (`100dvh` / `100vw` sin scrollbar no deseada).
3. Rendimiento en rendering:
   - Los elementos que se mueven durante zoom o interacción usan transformaciones GPU (`transform: translate3d`) en lugar de `left`/`top`.
   - La acuarela pesada se pre-rasteriza o mapea como textura; los vectores superpuestos aportan nitidez.
4. Soporte para accesibilidad y preferencias de usuario:
   - Respeta `prefers-reduced-motion`: sin vuelos de cámara ni animaciones continuas.
   - Fallback automático cuando WebGL no esté disponible.
5. Usa los tokens de diseño existentes (`tokens.css`, paleta `--paper`, `--ink`, `--ocre`, etc.); no introduzcas valores arbitrarios.
6. Cubre con pruebas E2E los flujos principales (Playwright a 390 px mobile y 1440 px desktop).

## Guardián
Pruebas de interfaz y rendimiento.

<!-- adapt -->
- E2E: `pnpm e2e` (`packages/e2e/tests/`).
- Smoke UI atlas: `pnpm --filter @antartida/atlas test:ui`.
- Rendimiento: `pnpm bench`.
<!-- /adapt -->
