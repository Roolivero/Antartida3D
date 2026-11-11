#!/usr/bin/env bash
# Busca en los issues y PRs (abiertos y cerrados) si un bug ya está registrado.
# Uso: .agents/scripts/bug-issue-check.sh "<palabras clave>" [...]
# Regla: .agents/rules/core/15-bugs-and-issues.md. No modifica nada: solo lee.

if [ "$#" -eq 0 ]; then
  echo "Uso: $0 \"<palabras clave>\" [...]" >&2
  exit 2
fi
if ! command -v gh >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1; then
  echo "⚠ Faltan gh o jq: no se pudo buscar en los issues. Revisalos a mano en GitHub antes de arreglar." >&2
  exit 0
fi

query="$*"
found=0
for kind in issue pr; do
  out=$(gh "$kind" list --state all --search "$query" --limit 20 \
    --json number,title,state,assignees,url 2>/dev/null) || {
    echo "⚠ Sin conexión con GitHub: no se pudo buscar en los ${kind}s. Revisalos a mano antes de arreglar." >&2
    exit 0
  }
  lines=$(jq -r '.[] | "#\(.number)\t\(.state)\t\([.assignees[].login] | join(",") | if . == "" then "sin asignar" else . end)\t\(.title)\t\(.url)"' <<<"$out")
  if [ -n "$lines" ]; then
    found=1
    echo "== ${kind^^}S que coinciden con: $query"
    echo "$lines"
  fi
done

if [ "$found" -eq 0 ]; then
  echo "Sin coincidencias para: $query"
  echo "Prueba otras palabras (síntoma, archivo, mensaje de error) antes de crear un issue nuevo."
fi
