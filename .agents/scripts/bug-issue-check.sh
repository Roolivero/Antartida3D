#!/usr/bin/env bash
# Busca si un bug ya está registrado o arreglado: issues, PRs (abiertos y cerrados) y commits.
# Uso: .agents/scripts/bug-issue-check.sh <palabra> [<palabra> ...]
# Cada palabra se busca por separado (OR): usar una o dos palabras del síntoma por vez.
# Regla: .agents/rules/core/15-bugs-and-issues.md. No modifica issues ni archivos: solo lee
# (hace `git fetch` para ver los commits de las demás ramas).
# Salida: 0 = se pudo buscar; 2 = uso incorrecto; 3 = no se pudo buscar en GitHub.

if [ "$#" -eq 0 ]; then
  echo "Uso: $0 <palabra> [<palabra> ...]" >&2
  exit 2
fi
if ! command -v gh >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1; then
  echo "⚠ Faltan gh o jq: NO se buscó en los issues. Revisalos a mano en GitHub antes de arreglar." >&2
  exit 3
fi

LIMIT=20
# GitHub combines search terms with AND; join the words with OR instead.
query=""
for w in "$@"; do query="${query:+$query OR }$w"; done

found=0
search() { # $1 = issue|pr, $2 = header, $3 = json fields, $4 = jq row filter
  local out err lines
  err=$(mktemp)
  if ! out=$(gh "$1" list --state all --search "$query" --limit "$LIMIT" --json "$3" 2>"$err"); then
    echo "⚠ NO se pudo buscar en GitHub ($2): $(head -3 "$err")" >&2
    rm -f "$err"
    exit 3
  fi
  rm -f "$err"
  lines=$(jq -r ".[] | $4" <<<"$out")
  [ -n "$lines" ] || return 0
  found=1
  echo "== $2 que coinciden con: $query"
  echo "$lines"
  if [ "$(jq 'length' <<<"$out")" -ge "$LIMIT" ]; then
    echo "(se muestran los primeros $LIMIT: puede haber más, afina la búsqueda)"
  fi
}

who='([.assignees[].login] | join(",") | if . == "" then "sin asignar" else . end)'
# stateReason tells a real fix (COMPLETED) from a closed-without-fix issue (NOT_PLANNED, DUPLICATE).
search issue "ISSUES" "number,title,state,stateReason,assignees,url" \
  "\"#\(.number)\t\(.state)\(if .stateReason and .stateReason != \"\" then \" (\" + .stateReason + \")\" else \"\" end)\t\($who)\t\(.title)\t\(.url)\""
# For PRs only MERGED means the fix landed; CLOSED means it was discarded.
search pr "PRS" "number,title,state,assignees,url,headRefName" \
  "\"#\(.number)\t\(.state)\t\($who)\t\(.title)\trama \(.headRefName)\t\(.url)\""

# GitHub does not index commit messages: a bug fixed inside another issue's PR only shows up here.
if git rev-parse --git-dir >/dev/null 2>&1; then
  git fetch -q origin 2>/dev/null || echo "⚠ No se pudo hacer git fetch: los commits listados pueden estar desactualizados." >&2
  greps=()
  for w in "$@"; do greps+=(--grep "$w"); done
  commits=$(git log --all -i "${greps[@]}" --format='%h%x09%ad%x09%s' --date=short -n "$LIMIT" 2>/dev/null)
  if [ -n "$commits" ]; then
    found=1
    echo "== COMMITS (todas las ramas) que coinciden con: $query"
    while IFS= read -r line; do
      if git merge-base --is-ancestor "${line%%	*}" origin/main 2>/dev/null; then
        where="ya en main"
      else
        where="solo en otra rama (sin mergear)"
      fi
      printf '%s\t%s\n' "$line" "$where"
    done <<<"$commits"
  fi
fi

if [ "$found" -eq 0 ]; then
  echo "Sin coincidencias para: $query"
  echo "Prueba otras palabras sueltas (síntoma, archivo, mensaje de error) antes de crear un issue nuevo."
fi
exit 0
