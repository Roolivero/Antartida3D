---
trigger: always_on
description: Ante un bug, buscar si ya está registrado o arreglado en otra rama antes de tocarlo; si no existe, crear el issue.
---

# 15. Bugs e Issues

> **Por qué:** Las ramas todavía no mergeadas no ven los arreglos de las demás. Los issues sí se ven desde cualquier rama: son el registro común para no arreglar dos veces el mismo bug.

1. Si el bug es parte del issue en curso, se arregla ahí. Si es otro bug (fuera del alcance del issue), antes de tocar nada busca si ya está registrado o arreglado:
   - `.agents/scripts/bug-issue-check.sh <palabra> [<palabra>]` busca en issues, PRs (abiertos y cerrados) y commits de todas las ramas.
   - Usa una o dos palabras sueltas por búsqueda y repite con otras (síntoma, archivo, mensaje de error). Una frase larga no encuentra nada, y un solo intento no alcanza para decir que no existe.
   - Si el script sale con código 3, no pudo buscar: no lo tomes como «no existe». Revisa a mano o avisa a quien te usa.
2. Según lo que encuentres:
   - **Issue abierto y asignado a otra persona:** no lo arregles. Comenta en el issue si aportas datos nuevos y avisa a quien te usa.
   - **Issue abierto y asignado a quien te usa:** trabajalo en la rama de ese issue.
   - **Issue abierto sin asignar:** avisa a quien te usa. No lo reclames por tu cuenta.
   - **PR abierto en otra rama:** no lo rehagas. Espera ese merge o avisa a quien te usa si te bloquea.
   - **Issue cerrado como `COMPLETED`, PR `MERGED` o commit en `origin/main`:** el arreglo ya está. Con el árbol de trabajo limpio, corre `git fetch` y `git rebase origin/main`. Si el bug sigue después de eso, comenta en el issue con la evidencia en vez de abrir uno nuevo.
   - **Commit solo en otra rama:** el arreglo existe pero no está mergeado. No lo rehagas; avisa a quien te usa.
   - **Issue cerrado como `NOT_PLANNED` o duplicado, o PR `CLOSED` sin merge:** no está arreglado. Lee por qué se cerró y avisa a quien te usa antes de hacer nada.
3. Si no existe, crea el issue con título claro, pasos para reproducir y evidencia (salida del comando, captura, archivo y línea):

   ```sh
   gh issue create --label bug --assignee @me --title "..." --body "..."
   ```

   Asígnalo **solo a la persona que te usa** y avísale. No reasignes ni cierres issues de otras personas ni tomes issues existentes por tu cuenta (regla central de `AGENTS.md`).
4. Un issue de bug recién registrado **no cuenta como «issue en curso»** hasta que se empieza a trabajar. Si quien te usa no lo va a arreglar pronto, se libera (`gh issue edit <N> --remove-assignee @me`, con un comentario del estado) para que otra persona lo tome.
5. Un bug, un issue, una rama (`gh issue develop <N> --base main --checkout`) y un PR con `Closes #<N>`. Si el arreglo es chico y bloquea tu trabajo, pregunta a quien te usa si lo haces en una rama aparte (por ejemplo con `git worktree`) en lugar de mezclarlo con el issue en curso.
6. Vuelve a buscar duplicados justo antes de abrir el PR: otra rama pudo registrarlo mientras trabajabas.
7. No inventes bugs. Si no pudiste reproducirlo, dilo en el issue como «no reproducido».

## Guardián
Script de búsqueda y hook de recordatorio.

- Script: `.agents/scripts/bug-issue-check.sh`.
- Hook (solo Claude Code): `.agents/hooks/bug-reminder.sh`, registrado en `.claude/settings.json` como `PostToolUseFailure` de Bash. Cuando falla un comando de verificación recuerda buscar el bug. No bloquea nada. No cubre comandos cuyo fallo queda oculto por un pipe (`pnpm test | tail`) ni la verificación del hook de cierre.
