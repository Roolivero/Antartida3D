---
trigger: always_on
description: Reutilizar antes de escribir, fuente única, sin código muerto.
---

# 04. Fuente Única y Código Muerto

> **Por qué:** Lo duplicado diverge; lo muerto confunde y se vuelve a copiar.

1. Busca en el repo antes de escribir: helper, tipo, constante o patrón existente.
2. Si algo existe, reutilízalo. Si casi sirve, extiéndelo.
3. Define cada constante, tipo y regla de negocio en un solo lugar (proyecciones, límites de mapa y fórmulas en `@antartida/core`).
4. Elimina lo que tu cambio deje sin uso (imports, variables, funciones).
5. No borres código muerto previo que no sea tuyo; menciónalo.
6. No agregues abstracciones, parámetros ni configuración "por si acaso".

## Guardián
Verificación de tipos y referencias.

<!-- adapt -->
- Chequeo: `pnpm typecheck` en la raíz del workspace.
<!-- /adapt -->
