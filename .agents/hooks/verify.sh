#!/usr/bin/env bash
# Hook de cierre para Claude Code (Stop) y agy (Stop): corre la verificación y, si falla, devuelve el error al agente.
VERIFY_CMD='pnpm test && pnpm typecheck'

in=$(cat)
agy=$(jq -r 'has("conversationId")' <<<"$in")
pass() { [ "$agy" = true ] && echo '{}'; exit 0; }

if [ "$agy" = true ]; then
  [ "$(jq -r '.terminationReason // "NO_TOOL_CALL"' <<<"$in")" = "NO_TOOL_CALL" ] || pass
  [ "$(jq -r '.executionNum // 1' <<<"$in")" -le 3 ] || pass          # máximo 2 reintentos
else
  [ "$(jq -r '.stop_hook_active // false' <<<"$in")" = "true" ] && pass  # evita bucle infinito
fi
case "$VERIFY_CMD" in '['*) pass ;; esac
cd "$(dirname "$0")/../.." || pass
[ -n "$(git status --porcelain 2>/dev/null)" ] || pass                  # sin cambios, nada que verificar
out=$(bash -c "$VERIFY_CMD" 2>&1) && pass
msg="La verificación falló ($VERIFY_CMD). Corrige antes de terminar:
$(tail -40 <<<"$out")"
if [ "$agy" = true ]; then jq -nc --arg r "$msg" '{decision:"continue",reason:$r}'; exit 0; fi
echo "$msg" >&2; exit 2
