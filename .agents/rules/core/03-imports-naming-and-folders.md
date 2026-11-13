---
trigger: always_on
description: Importaciones con paquetes workspace pnpm, sufijos por rol y carpetas por dominio.
---

# 03. Importaciones, Nomenclatura y Carpetas

> **Por qué:** Las rutas relativas profundas rompen refactorizaciones mecánicas y vuelven frágil el código.

1. Importa entre paquetes usando los nombres del workspace pnpm (`@antartida/core`, `@antartida/react-ui`, `@antartida/e2e`).
2. Evita rutas relativas complejas que crucen fronteras de paquetes.
3. Código, identificadores y comentarios en inglés; documentación, planes y reportes en español.
4. Cada expedición o funcionalidad aislada vive en su propio módulo.

## Guardián
Configuración de workspace y TypeScript.

<!-- adapt -->
- Workspace: `pnpm-workspace.yaml` y `tsconfig.base.json`.
- Paquetes: `@antartida/core`, `@antartida/react-ui`, `@antartida/e2e`, `@antartida/bench`, `@antartida/dibujado`.
<!-- /adapt -->
