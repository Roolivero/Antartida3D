#!/usr/bin/env bash
# Hook PostToolUse para Claude Code (Edit|Write|MultiEdit) y agy (edit_file|write_file): formatea el archivo editado. Nunca bloquea.
# /new-project completa FORMAT_CMD (recibe la ruta del archivo como último argumento). Con el placeholder no hace nada.
FORMAT_CMD='[comando de formato]'

in=$(cat)
agy=$(jq -r 'has("conversationId")' <<<"$in")
done_() { [ "$agy" = true ] && echo '{}'; exit 0; }
case "$FORMAT_CMD" in '['*) done_ ;; esac
if [ "$agy" = true ]; then
  f=$(jq -r '[.toolCall.args | .. | strings] | .[]' <<<"$in" | while IFS= read -r s; do [ -f "$s" ] && { echo "$s"; break; }; done)
else
  f=$(jq -r '.tool_input.file_path // ""' <<<"$in")
fi
[ -f "$f" ] || done_
cd "$(dirname "$0")/../.." || done_
$FORMAT_CMD "$f" >/dev/null 2>&1
done_
