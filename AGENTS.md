# AGENTS.md

Reglas de trabajo para el equipo (5 integrantes) y para los agentes de IA que usen. Hackatón SoberaníaTech, eje 2. Fechas e hitos en `ROADMAP.md`.

## Configuración inicial (una vez por clon)

```sh
git config core.hooksPath .githooks
```

El hook `.githooks/pre-commit` bloquea commits:

- en `main`;
- en ramas que no empiezan con número de issue (`<N>-...`, el formato de `gh issue develop`);
- en ramas cuyo issue no está asignado a tu usuario de GitHub.

Si `gh` no está instalado o no hay conexión, avisa pero deja commitear. Saltarlo con `--no-verify` solo el día de entrega y por urgencia.

## Regla central: nadie trabaja sin reclamar el issue

Todo trabajo empieza en un issue de GitHub asignado a quien lo hace. Sin issue asignado, no hay rama, no hay commits.

### 1. Reclamar

```sh
# Ver issues libres del milestone actual
gh issue list --milestone "Avance 16 nov" --search "no:assignee"

# Reclamar
gh issue edit <N> --add-assignee @me
gh issue comment <N> --body "Lo tomo."
```

Después de reclamar, verificar que el único asignado seas vos:

```sh
gh issue view <N> --json assignees --jq '.assignees[].login'
```

Si hay dos asignados, gana el primer comentario "Lo tomo." en el issue. El otro se quita.

### 2. Trabajar

- Un issue en curso por persona. Terminarlo o liberarlo antes de tomar otro.
- Una rama por issue, creada desde `main` y vinculada al issue:

  ```sh
  gh issue develop <N> --base main --checkout
  ```

- Tocar solo los archivos que el issue necesita. Si hace falta cambiar algo compartido (por ejemplo `App.jsx`, `styles.css`, la estructura común de expedición), avisar en el issue antes de hacerlo.
- Cada expedición vive en su propio archivo, para que cinco personas puedan trabajar en paralelo sin conflictos.

### 3. Entregar

- Antes de abrir el PR: `git rebase origin/main`, `npm test` y `npm run build` sin errores.
- El PR incluye `Closes #<N>` en la descripción.
- PRs chicos. Un issue, un PR.
- Otra persona del equipo revisa y mergea. Nadie mergea su propio PR, salvo urgencia del día de entrega.

### 4. Liberar

Si no podés seguir con un issue:

```sh
gh issue edit <N> --remove-assignee @me
gh issue comment <N> --body "Lo libero. Estado: <qué quedó hecho y qué falta>."
```

Un issue asignado sin actividad por más de 24 h se puede reclamar, previo aviso en el issue.

## Reglas para agentes de IA

- Antes de cualquier cambio, confirmar el issue en curso y que esté asignado a la persona que te está usando. Si no hay issue asignado, detenerte y pedirlo.
- No reclamar, reasignar ni cerrar issues por cuenta propia.
- Trabajar solo en la rama del issue. Nunca commitear en `main`.
- No modificar archivos fuera del alcance del issue sin avisar a la persona.
- Todo uso de IA se declara en el README (lo exigen las bases).

## Contenido y datos (eje 2)

- Toda información lleva su fuente citada.
- Nunca presentar una simulación o reconstrucción como dato real. Marcar en la interfaz qué es cada cosa.
- Documentar la licencia de cada recurso de terceros (textos, imágenes, modelos, datos).

## Fechas de congelamiento

- **Lun 16 nov 23:00:** primer avance. Lo que esté en `main` a esa hora es el avance.
- **Mar 17 nov:** último día para sumar funcionalidades.
- **Mié 18 nov 19:00:** `main` congelado. Solo arreglos críticos.
- **Mié 18 nov 21:00:** entrega final.
