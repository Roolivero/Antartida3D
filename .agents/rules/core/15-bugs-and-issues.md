# 15. Bugs e Issues

> **Por qué:** Las ramas todavía no mergeadas no ven los arreglos de las demás. Los issues sí se ven desde cualquier rama: son el registro común para no arreglar dos veces el mismo bug.

1. Si el bug es parte del issue en curso, se arregla ahí. Si es otro bug (fuera del alcance del issue), antes de tocar nada busca si ya está registrado:
   - `.agents/scripts/bug-issue-check.sh "<palabras clave>"` lista los issues y PRs, abiertos y cerrados, que coinciden.
   - Prueba con dos o tres búsquedas (síntoma, archivo, mensaje de error). Un solo intento no alcanza para decir que no existe.
2. Según lo que encuentres:
   - **Abierto y asignado a otra persona:** no lo arregles. Comenta en el issue si aportas datos nuevos y avisa a quien te usa.
   - **Abierto y asignado a quien te usa:** trabajalo en la rama de ese issue.
   - **Abierto sin asignar:** avisa a quien te usa. No lo reclames por tu cuenta.
   - **Con PR abierto en otra rama:** no lo rehagas. Espera ese merge o avisa a quien te usa si te bloquea.
   - **Cerrado:** el arreglo ya está en `main` o llega con su PR. Corre `git fetch` y `git rebase origin/main`. Si el bug sigue después de eso, comenta en el issue con la evidencia en vez de abrir uno nuevo.
3. Si no existe, crea el issue: título claro, pasos para reproducir y evidencia (salida del comando, captura, archivo y línea). Asígnalo **solo a la persona que te usa** y avísale. No reasignes ni cierres issues de otras personas ni tomes issues existentes por tu cuenta (regla central de `AGENTS.md`).
4. Un bug, un issue, una rama (`gh issue develop <N> --base main --checkout`) y un PR con `Closes #<N>`. Si el arreglo es chico y bloquea tu trabajo, pregunta a quien te usa si lo haces en una rama aparte (por ejemplo con `git worktree`) en lugar de mezclarlo con el issue en curso.
5. Vuelve a buscar duplicados justo antes de abrir el PR: otra rama pudo registrarlo mientras trabajabas.
6. No inventes bugs. Si no pudiste reproducirlo, dilo en el issue como «no reproducido».

## Guardián
Script de búsqueda y hook de recordatorio.

- Script: `.agents/scripts/bug-issue-check.sh`.
- Hook (Claude Code): `.agents/hooks/bug-reminder.sh`, registrado en `.claude/settings.json`. Cuando falla un comando de verificación recuerda buscar el bug en los issues. No bloquea nada.
