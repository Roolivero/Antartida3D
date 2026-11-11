#!/usr/bin/env bash
# Hook PostToolUseFailure (Bash) para Claude Code: cuando falla un comando de verificación,
# recuerda buscar el bug en los issues antes de arreglarlo. Nunca bloquea: solo inyecta contexto.
# Regla: .agents/rules/core/15-bugs-and-issues.md
# Nota: se registra solo en .claude/settings.json; no se verificó el esquema de hooks de agy.

in=$(cat)
cmd=$(jq -r '.tool_input.command // ""' <<<"$in" 2>/dev/null) || exit 0

case "$cmd" in *bug-issue-check*) exit 0 ;; esac
# A verification command in command position: `pnpm [flags] <script>` or a direct vitest/playwright/tsc run.
grep -Eq '(^|[;&|(] *)pnpm( [^;&|]*)? (test|typecheck|build|e2e|test:ui|bench)([^[:alnum:]:_-]|$)|(^|[;&|(] *|npx |pnpm exec )(vitest|playwright|tsc)([^[:alnum:]._-]|$)' <<<"$cmd" || exit 0

msg="Falló un comando de verificación. Si el fallo es un bug de la aplicación que no es parte de tu issue en curso, antes de arreglarlo busca si ya está registrado: .agents/scripts/bug-issue-check.sh <palabra> [<palabra>] (regla .agents/rules/core/15-bugs-and-issues.md). Si ya existe y está resuelto, haz git fetch y git rebase origin/main en vez de arreglarlo de nuevo. Si no existe, créalo asignado a quien te usa."
jq -nc --arg m "$msg" '{hookSpecificOutput:{hookEventName:"PostToolUseFailure",additionalContext:$m}}'
exit 0
