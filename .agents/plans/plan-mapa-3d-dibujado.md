# Plan: Monorepo unificado + mapa 3D con relieve real y estilo dibujado

Ejecutor: `agy` (Gemini 3.8 Flash, esfuerzo medio). Revisor: Claude Code.
Marcá cada paso con `[x]` al terminarlo. Si un `→ verificar` falla, no sigas: corregí o frená y reportá el error exacto.

## Objetivo y criterio de éxito

**Fase A: orden del repo y agentes**

1. El repo es un solo monorepo pnpm en la raíz.
   - Las apps a comparar viven en `apps/`: `apps/dibujado` (2D + 3D) y `apps/atlas`.
   - El código compartido vive en `packages/`.
   - Hay un solo `README.md`, un solo `.gitignore`, una sola carpeta `docs/` y un solo lockfile.
   - Para quedarse con una app, alcanza con borrar su carpeta en `apps/`.
2. No queda la versión equivocada (`Lucas/`) ni la carpeta copiada `antartida-lab(dibujado)/`. El historial del lab está respaldado fuera del repo.
3. `.agents/` tiene reglas, hooks y skills, y `.claude/` apunta ahí.
   - El `.githooks/pre-commit` del equipo sigue igual.
   - No hay validación de formato de commits.
   - Ninguna regla prohíbe commitear o pushear.

**Fase B: mapa 3D**

4. `apps/dibujado` tiene un control «Mapa / Relieve 3D». Cambia la vista sin perder el encuadre, la ficha abierta ni el progreso, y recuerda la elección.
5. El relieve sale de Bedmap3 (datos reales, 500 m). Se reconocen la Península, los Montes Transantárticos, el Domo A y las barreras de hielo.
6. El 3D se ve dibujado:
   - la misma acuarela horneada del 2D como color;
   - hachures (sombreado a trazos de los mapas antiguos) en las pendientes;
   - curvas de nivel en tinta;
   - costa en tinta con temblor de mano;
   - grano de papel.
7. Rendimiento: 60 fps al orbitar y hacer zoom en escritorio (GPU real, 1440 px), sin tareas de más de 16 ms en el hilo principal durante la órbita, y ≥ 30 fps en un teléfono de gama media.
8. La «bajada» a Fósiles es un vuelo de cámara real hasta Isla Marambio.
9. Sin WebGL: sin toggle, y el 2D igual que hoy. Con `prefers-reduced-motion`: sin vuelos de cámara.
10. La interfaz declara «relieve real, exageración vertical ×25». Bedmap3 queda citado con URL, organismo y fecha.
11. `pnpm test`, `pnpm typecheck`, `pnpm build` y `pnpm e2e` pasan en la raíz.

## Entorno detectado

**Raíz actual**

- Archivos: `AGENTS.md`, `ROADMAP.md`, `Antartida_por_descubrir_Borrador.pdf`, `.githooks/pre-commit` (exige una rama `<N>-...` con el issue asignado; no valida mensajes), `.gitignore` (solo `.projectmem/*`) y `.projectmem/`.
- No hay `package.json` en la raíz.

**`Lucas/`**

- La versión equivocada (React + R3F oscuro). Se elimina.

**`antartida-atlas/`**

- React 19 + R3F en JS, con npm (`package-lock.json`) y puerto 5175.
- Scripts: `test` (`node --test src/data/*.test.js`) y `test:ui` (`node scripts/smoke.mjs`, Playwright).
- Tiene su propio `README.md`, `.gitignore` y `docs/capturas/*.png`.

**`antartida-lab(dibujado)/antartida-lab/`** (sin seguimiento en git)

- Monorepo pnpm 11 (`packageManager: pnpm@11.5.2`), con `.git` propio y la etiqueta `lab-comparacion`.
- Código:
  - `apps/preact-vite`: la app, puerto 5103.
  - `packages/core`: TS puro, 23 tests de Vitest.
  - `packages/react-ui`.
  - `packages/e2e`: Playwright.
  - `scripts/bench`.
- `pnpm-workspace.yaml` con `packages/*`, `apps/*`, `scripts/bench` y `allowBuilds: esbuild`.
- `tsconfig.base.json`.
- Docs:
  - `README.md`;
  - `.gitignore`;
  - `docs/handoff/` (`HANDOFF.md`, `design/Main.dc.html`: la especificación de diseño);
  - `docs/DECISIONES.md` y `docs/RENDIMIENTO.md`;
  - `docs/rendimiento/` (`results.json`, `capturas/preact-vite/*.jpg`);
  - `docs/lab/`: comparación congelada de stacks que ya no existen.

**Herramientas y plantillas**

- Node 26, pnpm, `/usr/bin/chromium`, `jq` y python3. Sin GDAL ni formateador.
- Plantilla de agentes: `~/agent-config/project-template/base` y `types/web`. Procedimiento: `~/agent-config/global/shared/skills/new-project/SKILL.md`, sección «Modo existente».

**Reglas de `AGENTS.md`**

- Un issue asignado y su rama antes de tocar código.
- Cada fuente lleva referencia, organismo y fecha.
- Nunca presentar una reconstrucción como dato.
- Licencias documentadas.
- Uso de IA declarado en el README.
- Código y comentarios en inglés; docs en español.

## Supuestos y decisiones

- **D1 (usuario):** 2D y 3D conviven en la misma app, y el usuario elige la vista.
- **D2 (usuario):** el peso del JS no importa por ahora; prioridad: fluidez y detalle del 3D.
- **D3 (usuario):** el atlas aporta ideas, no código.
- **D4 (usuario):** se elimina `Lucas/`, y las carpetas pasan a tener nombres representativos.
- **D5 (usuario):** antes de todo, esqueleto de agentes en `.agents/` según `~/agent-config`. Los hooks de commit existentes no se tocan, y no hay formato de commit obligatorio.
- **D6 (usuario):** Bedmap3 se descarga en segundo plano desde el primer paso.
- **D7 (usuario):** ninguna regla del proyecto prohíbe commitear o pushear sin orden, porque el equipo lo hace.
- **D8 (usuario):** apps comparables en un solo lugar, con docs, README y `.gitignore` unificados, y sin lo innecesario.
- **S1. Arquitectura (recomendada):**

  ```
  /                       pnpm workspace (package.json, pnpm-workspace.yaml, pnpm-lock.yaml, tsconfig.base.json)
  ├─ apps/
  │  ├─ dibujado/         lab app (2D painted map + 3D relief), port 5103
  │  └─ atlas/            former antartida-atlas, port 5175
  ├─ packages/
  │  ├─ core/             lab core (TS)
  │  ├─ react-ui/         lab components
  │  └─ e2e/              Playwright for apps/dibujado
  ├─ scripts/bench/       performance benchmark
  ├─ docs/
  │  ├─ propuesta.pdf     former Antartida_por_descubrir_Borrador.pdf
  │  ├─ diseno/           former docs/handoff (HANDOFF.md + design/)
  │  ├─ decisiones.md     former DECISIONES.md, without the archived-stacks section
  │  ├─ rendimiento.md    + rendimiento/ (results.json, capturas/)
  │  └─ capturas/atlas/   former antartida-atlas/docs/capturas
  ├─ .agents/ .claude/ .githooks/
  ├─ AGENTS.md  ROADMAP.md  README.md  .gitignore
  ```

  - El atlas pasa a ser un paquete más del workspace (`@antartida/atlas`): usa pnpm y pierde su `package-lock.json`.
  - Quedarse con una app = borrar `apps/<otra>` y sus scripts de la raíz.
  - Se elimina `docs/lab/` del lab: compara stacks que ya no existen, y queda en el respaldo git.
- **S2.** El `.git` del lab se mueve a `~/respaldos/antartida-lab.git`; no se borra. Se usa para recuperar el código 3D archivado (`lab-comparacion`).
- **S3. Esqueleto de agentes en modo «existente»**, versionado.
  - Se copian solo las reglas `core/` que `AGENTS.md` no cubre, más `types/web`.
  - `AGENTS.md` mantiene su contenido; solo cambian los comandos `npm` a `pnpm` y se agrega un índice al final.
- **S4. Commits y git.**
  - No se copian `.githooks/commit-msg` ni el `pre-commit` de la plantilla.
  - `10-git-and-commits` se adapta: sin la disciplina de «no commit ni push sin orden» y sin formato obligatorio. Queda: rama por issue según `AGENTS.md`, nada de `.env` ni secretos, y título claro en español con `#<N>` si aplica.
  - `.claude/settings.json` se copia sin el `deny` de `git push`.
  - En otras reglas copiadas se quita cualquier línea equivalente.
- **S5. Hooks del agente:** `verify.sh` corre `pnpm test && pnpm typecheck` en la raíz. `format.sh` queda con su placeholder, porque no hay formateador y no se agrega uno.
- **S6. Tecnología del 3D:** React 19 + React Three Fiber 9 + drei + `@react-three/postprocessing`, y se abandona Preact (R3F no corre sobre `preact/compat`). `CameraControls` de drei da órbita amortiguada, transiciones, límites y eventos de reposo.
- **S7. Vista inicial:** 3D si hay WebGL2. Si hay `prefers-reduced-motion`, `Save-Data` o una elección previa de 2D, arranca en 2D. La elección se recuerda.
- **S8. Datos Bedmap3:** `bm3_surface.tif` y `bm3_masks.tif` (máscara: 1 hielo apoyado, 2 barrera transitoria, 3 barrera flotante, 4 roca). Son grillas de 500 m en EPSG:3031, con licencia CC BY 4.0.
  - Organismo: UK Polar Data Centre, British Antarctic Survey.
  - Dataset: https://doi.org/10.5285/2d0e4791-8e20-46a3-80e4-f5f6716025d2. Paper: Pritchard et al. 2025, *Sci Data* 12:414, https://doi.org/10.1038/s41597-025-04672-y.
  - Descarga (RAMADDA): http://ramadda.data.bas.ac.uk/repository/entry/show?entryid=2d0e4791-8e20-46a3-80e4-f5f6716025d2.
  - Consultado el 11 nov 2026.
  - Caché: `~/.cache/antartida3d/bedmap3/`, o `BEDMAP3_DIR` si está definida.
- **S9. Exageración vertical ×25:** constante única `VERTICAL_EXAGGERATION` en core, declarada en la interfaz.
- **S10. Malla RTIN** (`@mapbox/martini`, triángulos densos solo donde el relieve cambia), precalculada en el build en dos niveles: `lo` para < 820 px y `hi` para escritorio. El detalle fino lo da un mapa de normales.
- **S11. Mismo espacio que el 2D:** 0..1000 de `projection.ts`, con mundo `(x − 500, h, y − 500)`. La acuarela horneada se aplica con el mismo UV que el 2D.
- **S12. Marcadores y etiquetas en DOM** sobre el canvas, con `MarkerButton` posicionado por `transform` en cada frame, sin re-render de React.
- **S13. Dependencias nuevas, versiones exactas.**
  - Runtime de `apps/dibujado` y `react-ui`: `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei` y `@react-three/postprocessing`.
  - Desarrollo de `core`: `geotiff`, `proj4`, `@mapbox/martini` y `sharp`.
  - App: `@vitejs/plugin-react` y `@types/three`.
- **S14.** Sin commits durante esta ejecución. Todo queda en el árbol de trabajo para revisión.

## Fuera de alcance

- Batimetría, hielo marino y animación del agua.
- Reducir el peso del JS.
- 3D dentro de la expedición.
- Sudamérica en relieve.
- Cambiar contenidos o sumar expediciones.
- Cambiar el código de `apps/atlas` más allá de `package.json` y las rutas.
- Tocar `.githooks/pre-commit` o el flujo de issues de `AGENTS.md`.

## Blast radius

- **Raíz:** pasa a ser el workspace. Comandos: de `npm` por carpeta a `pnpm` en la raíz; `AGENTS.md` y `README.md` lo reflejan.
- **`apps/atlas`:** cambia de gestor (npm a pnpm). Sus tests y su build tienen que seguir pasando.
- **`packages/e2e/ports.ts` y `scripts/bench`:** referencian `apps/preact-vite`, y se actualizan.
- **`MapView.tsx`, `markers.ts` y `storage.ts`:** cambian para soportar el 3D. Los E2E existentes son la red de seguridad.
- **Assets nuevos commiteables (~3-6 MB).**

## Pasos

### Fase 0: precondición (la hace Lk antes de lanzar agy)

- [x] 0. Issue asignado a Lk y rama `<N>-...` creada con `gh issue develop <N> --base main --checkout`. → verificar: `git branch --show-current` empieza con un número.

### Fase A: orden del repo y agentes

- [x] 1. **Descarga de Bedmap3 en segundo plano.**
  1. Abrir la página RAMADDA de S8 y resolver los enlaces directos de `bm3_surface.tif` y `bm3_masks.tif`. No inventar URLs: si no aparecen, anotarlo en el reporte y seguir, porque Lk los baja a mano.
  2. `mkdir -p ~/.cache/antartida3d/bedmap3`.
  3. Por archivo: `nohup curl -L -C - -o ~/.cache/antartida3d/bedmap3/<archivo> "<url>" > ~/.cache/antartida3d/bedmap3/<archivo>.log 2>&1 &`.
  4. No esperar: seguir con el paso 2.

  → verificar: `ls -la ~/.cache/antartida3d/bedmap3/` muestra los archivos creciendo.

- [x] 2. **Respaldar y eliminar.**
  1. `mkdir -p ~/respaldos && mv "antartida-lab(dibujado)/antartida-lab/.git" ~/respaldos/antartida-lab.git`.
  2. `git rm -r -q Lucas`.

  → verificar:
  - `git --git-dir ~/respaldos/antartida-lab.git tag` imprime `lab-comparacion`;
  - `test ! -d Lucas`.

- [x] 3. **Mover a la arquitectura de S1.** Usar `mv` desde la raíz del repo, con `L="antartida-lab(dibujado)/antartida-lab"`:
  1. `$L/apps/preact-vite` → `apps/dibujado`; `$L/packages` → `packages`; `$L/scripts` → `scripts`.
  2. `$L/package.json`, `$L/pnpm-workspace.yaml`, `$L/pnpm-lock.yaml` y `$L/tsconfig.base.json` → raíz.
  3. `antartida-atlas` → `apps/atlas`; `rm apps/atlas/package-lock.json`.
  4. Docs:
     - `Antartida_por_descubrir_Borrador.pdf` → `docs/propuesta.pdf`;
     - `$L/docs/handoff` → `docs/diseno`;
     - `$L/docs/DECISIONES.md` → `docs/decisiones.md`;
     - `$L/docs/RENDIMIENTO.md` → `docs/rendimiento.md`;
     - `$L/docs/rendimiento` → `docs/rendimiento`;
     - `apps/atlas/docs/capturas` → `docs/capturas/atlas`, y después `rmdir apps/atlas/docs`.
  5. Borrar lo que queda sin uso:
     - `$L/docs/lab`;
     - `$L/README.md`, `$L/.gitignore` y `apps/atlas/.gitignore` (se fusionan en el paso 4);
     - `apps/dibujado/README.md`;
     - cualquier `node_modules/`, `dist/` o `scripts/bench/out/` que haya venido.

     Después: `rmdir "$L" "antartida-lab(dibujado)"`.

  → verificar: `test ! -e "antartida-lab(dibujado)"`, y `ls apps packages docs` muestra exactamente la estructura de S1.

- [x] 4. **Unificar la configuración.**
  - `package.json` de la raíz:
    - `"name": "antartida-por-descubrir"`.
    - Scripts:
      - `dev`: `pnpm --filter @antartida/dibujado dev`;
      - `dev:atlas`: `pnpm --filter @antartida/atlas dev`;
      - `build`: `pnpm -r --filter "./apps/*" build`;
      - `preview`: `pnpm --filter @antartida/dibujado preview`;
      - `test`: `pnpm -r --if-present test`;
      - `typecheck`: `pnpm -r --if-present typecheck`;
      - `e2e`: `pnpm --filter @antartida/dibujado e2e`;
      - `coastline` y `map-raster`: igual que hoy;
      - `bench`.
  - `apps/dibujado/package.json`: `"name": "@antartida/dibujado"`.
  - `apps/atlas/package.json`: `"name": "@antartida/atlas"`; scripts sin cambios.
  - Reemplazar `@antartida/preact-vite` y `preact-vite` en `packages/e2e/*`, `scripts/bench/src/*`, `docs/*.md` y `apps/dibujado/*` (buscar con `grep -rn "preact-vite"`). Las rutas de capturas de `docs/rendimiento/capturas/preact-vite` se mantienen, porque son datos históricos.
  - `.gitignore` de la raíz: la unión de los tres, sin duplicados, más `CLAUDE.local.md` y `.claude/settings.local.json`. Mantener las líneas de `.projectmem/` que ya tenía.
  - `pnpm install` en la raíz.

  → verificar: `pnpm install` termina sin errores, `test ! -e apps/atlas/package-lock.json` y `grep -rn "preact-vite" --exclude-dir=node_modules . | grep -v docs/rendimiento` no devuelve nada.

- [x] 5. **Línea base del monorepo.**
  - `pnpm test`: los 23 tests de core más los de atlas.
  - `pnpm typecheck`.
  - `pnpm build`: las dos apps.
  - `pnpm e2e`.
  - `pnpm --filter @antartida/atlas test:ui`.
  - Anotar los conteos.

  → verificar: todo en verde. Si algo falla por la mudanza, corregir rutas. Si falla algo previo a la mudanza, reportarlo y frenar.

- [x] 6. **Unificar la documentación.**
  - `README.md` en la raíz (nuevo), en español. Secciones:
    - qué es el proyecto y el eje;
    - apps a comparar (`apps/dibujado`, `apps/atlas`), con puerto y qué tiene cada una;
    - estructura (el árbol de S1);
    - requisitos y uso (`pnpm install`, `pnpm dev`, `pnpm dev:atlas`, `test`, `build`, `e2e`);
    - cómo descartar una app;
    - fuentes y licencias (las de los dos README originales: Natural Earth, Armada Argentina, y las tipografías Fraunces, Atkinson Hyperlegible, Caveat, DM Sans y Libre Caslon Display, todas OFL);
    - uso de IA (las dos declaraciones originales, textuales);
    - integrantes (dejar `[completar]`).

    El contenido sale de los README originales (recuperables con `git show HEAD:antartida-atlas/README.md` y del respaldo `git --git-dir ~/respaldos/antartida-lab.git show HEAD:README.md`). No inventar fuentes.
  - `docs/decisiones.md`: quitar la sección «Por stack (laboratorio)», salvo `preact-vite` y `r3f-3d`, y las menciones a `docs/lab/`. Agregar «Arquitectura del repo» con S1.
  - Arreglar los links internos rotos de `docs/*.md` (`docs/handoff` → `docs/diseno`).
  - `AGENTS.md`: cambiar solo `npm test` y `npm run build` por `pnpm test` y `pnpm build`. Sumar una línea de configuración inicial `pnpm install`.
  - `ROADMAP.md`: marcar «Elegir prototipo base», con la nota «comparación en `apps/`».

  → verificar: `grep -rn "docs/handoff\|docs/lab\|antartida-lab\|Lucas/" README.md AGENTS.md docs/*.md` no devuelve nada, y `git diff AGENTS.md` muestra solo esos cambios.

- [x] 7. **Esqueleto de agentes.** Seguir el «Modo existente» de `new-project`, con plantilla `~/agent-config/project-template/base` y `types/web`, sin pisar nada:
  1. Copiar a `.agents/rules/core/`: `00-agent-workflow`, `01-architecture-and-layers`, `03-imports-naming-and-folders`, `04-single-source-and-dead-code`, `05-error-handling-and-logging`, `06-security-baseline`, `07-testing`, `09-environments-and-secrets`, `10-git-and-commits`, `13-honesty-and-verification` y `14-ambiguous-requests`.
     - Omitir `02` (no hay límite de líneas) y `08` (`AGENTS.md` ya cubre fuentes).
     - Adaptar los bloques `<!-- adapt -->` a pnpm, Vitest y Playwright.
  2. `10-git-and-commits` según S4: borrar la sección «Disciplina» de commit y push sin orden, y todo el formato obligatorio. Dejar rama por issue, sin secretos y título claro en español con `#<N>`.
  3. Revisar todas las reglas copiadas y quitar cualquier línea que prohíba commit o push sin orden: `grep -rniE "push|commit" .agents/rules`.
  4. `.agents/rules/project/00-convenciones-del-proyecto.md` (`trigger: always_on`): flujo de issues, idioma, regla de fuentes, arquitectura S1, comandos pnpm y cómo descartar una app.
  5. `.agents/rules/project/20-web.md`, desde `types/web`, adaptado.
  6. `.agents/rules/README.md` (índice) y `.agents/skills/.gitkeep`.
  7. Hooks del agente: `.agents/hooks.json`, `.agents/hooks/verify.sh` (`VERIFY_CMD='pnpm test && pnpm typecheck'`), `.agents/hooks/format.sh` (placeholder) y `.claude/settings.json` sin el bloque `permissions.deny` de `git push`. Correr `chmod +x .agents/hooks/*.sh`.
  8. `mkdir -p .claude && ln -sfn ../.agents/rules .claude/rules && ln -sfn ../.agents/skills .claude/skills`.
  9. No copiar `.githooks/*` de la plantilla. No tocar `.githooks/pre-commit`. No cambiar `core.hooksPath`.
  10. `AGENTS.md`: agregar al final la sección «Reglas para agentes» con el índice de `.agents/rules/`.

  → verificar:
  - `git diff --stat .githooks` está vacío;
  - `test ! -e .githooks/commit-msg`;
  - `grep -rniE "sin orden|without.*order|git push" .agents/rules .claude/settings.json` no devuelve nada;
  - `echo '{}' | .agents/hooks/verify.sh; echo $?` imprime 0.

### Fase B: mapa 3D (rutas relativas a la raíz)

- [x] 8. **Pasar `apps/dibujado` de Preact a React.**
  - En `apps/dibujado/vite.config.ts`, quitar los alias a `preact/compat` y usar `@vitejs/plugin-react`.
  - `react` y `react-dom` 19.3.1 con sus `@types`, y quitar `preact`.
  - Registrar la decisión en `docs/decisiones.md`.

  → verificar: `pnpm build && pnpm e2e` en verde, con el conteo del paso 5.

- [x] 9. **Proyección inversa.** En `packages/core/src/projection.ts`, `unproject(x, y) → {lon, lat}`: `r = hypot(x − 500, y − 500)`, `lat = −(90 − 2·atan(r/1590)·180/π)`, `lon = atan2(x − 500, 500 − y)·180/π`. Test de ida y vuelta en `packages/core/test/map.test.ts` (Marambio, Orcadas, Polo, Ushuaia; < 1e-9). → verificar: `pnpm --filter @antartida/core test`.

- [x] 10. **Script de terreno, parte de datos** (`packages/core/scripts/build-terrain.ts`, script `terrain` en core y en la raíz).
  1. Confirmar que la descarga del paso 1 terminó: tamaño estable, y `tail` del `.log` sin error. Si falta, reanudar con `curl -C -`.
  2. Leer con `geotiff` por ventanas (`readRasters({ window })`).
  3. Grilla de salida de 4097² sobre `TERRAIN_BOX` (bbox de `ANTARCTICA_PATH` de `coastline.ts` más un margen de 10 unidades). Por celda: `unproject`, después `proj4('EPSG:4326','EPSG:3031')`, después bilineal sobre la superficie. Para la máscara, vecino más cercano. −9999 u océano: 0.

  → verificar:
  - los GeoTIFF son de 13334² en EPSG:3031;
  - el script imprime un máximo de ≈ 4 000-4 100 m y el Polo en ≈ 2 800-2 850 m.

- [x] 11. **Script de terreno, parte de productos.** Salida en `packages/core/src/assets/`.
  - `terrain-mesh-hi.bin` y `terrain-mesh-lo.bin`: martini sobre 2049², con error de 25 m y 70 m. Se ajusta para que queden en ≤ 400 k y ≤ 120 k triángulos, y se descartan los triángulos enteros de océano.
    - Formato `[header][Uint16 x,y][Uint16 altura m][Uint8 máscara][Uint32 índices]`, con los bordes de costa para las paredes.
  - `terrain-relief-4096.webp` y `terrain-relief-2048.webp`, sin pérdida: RGB = normal con `VERTICAL_EXAGGERATION`, y A = altura en 8 bits.
  - `paper-512.webp`: el filtro `#paperf` horneado con el mismo método de Chromium que `scripts/build-map-raster.ts`.

  → verificar: los archivos existen, y el conteo de triángulos impreso está dentro de los límites.

- [x] 12. **`packages/core/src/terrain.ts`.**
  - `loadTerrainMesh(level)`, `heightAt(x, y)`, `VERTICAL_EXAGGERATION = 25`, `CONTOUR_M = 250` y `TERRAIN_BOX`. Exportarlos en `index.ts`.
  - Tests en `packages/core/test/terrain.test.ts`:
    - decodificación de un `.bin` mínimo;
    - Polo entre 2 700 y 2 950 m;
    - Domo A (80,37° S, 77,35° E) > 3 900 m;
    - un punto del Mar de Weddell = 0.

  → verificar: `pnpm --filter @antartida/core test`.

- [x] 13. **`packages/core/src/camera.ts`.**
  - `poseFromView` y `viewFromPose`. Partir de `poseFromView` en `git --git-dir ~/respaldos/antartida-lab.git show lab-comparacion:apps/r3f-3d/src/Map3DLayer.tsx`.
  - `HOME_3D`: inclinación 38°, norte arriba.
  - `DIVE_3D`: baja, al sur de Marambio, por encima de `heightAt`.
  - Tests en `packages/core/test/camera.test.ts`: ida y vuelta < 0,5 px, y `DIVE_3D` sobre el terreno.

  → verificar: `pnpm --filter @antartida/core test`.

- [x] 14. **Marcadores con proyector.** `buildMarkers(size, view, explored, points, toScreen?)`. Si recibe `toScreen`, la usa para posiciones y clustering. Generalizar `clusterPoints` sin duplicar lógica. Test en `map.test.ts`: proyector identidad × escala igual al 2D. → verificar: todos los tests anteriores y los nuevos en verde.

- [x] 15. **Separar la capa 2D.** `MapLayer` de `packages/react-ui/src/map/MapView.tsx` pasa a `map/Map2DLayer.tsx` sin cambios de comportamiento. `MapView` elige la capa por `mode`. En 3D, el teclado sigue el mapa de teclas de `keyView`, con Q/E para girar documentadas en el `aria-label`. → verificar: `pnpm e2e` en verde.

- [x] 16. **Escena 3D base** (`packages/react-ui/src/map3d/Map3DLayer.tsx`, `Terrain.tsx`, `OceanBlock.tsx`).
  - Canvas con `frameloop="demand"`, `dpr={[1,2]}`, `antialias` y `powerPreference: 'high-performance'`, y fondo `--paper`.
  - Malla `hi` o `lo` por ancho (< 820 px), en Suspense. Mientras carga, se ve el 2D.
  - Océano con la acuarela `map-paint-*`, mapeada con `MAP_RASTER_PAD`/`MAP_RASTER_SPAN`.
  - Paredes del bloque en `--deep`.
  - `CameraControls`:
    - inclinación entre 0° y 60°;
    - distancia según `MIN_K`/`MAX_K`;
    - `setBoundary` en el continente;
    - `smoothTime` 0,25;
    - `invalidate()` solo mientras se mueve.

  → verificar: `pnpm dev` a 1440 y 390 px, orbitar, hacer zoom y usar el teclado. Capturas en `docs/rendimiento/capturas/3d/`.

- [x] 17. **Material dibujado** (`packages/react-ui/src/map3d/paintedTerrain.glsl.ts`). Un `ShaderMaterial` con una uniform por capa:
  1. **Color:** la acuarela del 2D por UV de mapa. Roca (máscara 4) con lavado `--ocre`/`--pencil`; barreras (3) en celeste claro.
  2. **Luz:** sol fijo del noroeste, Lambert con la normal del relieve, 3 bandas con `smoothstep`, bordes rotos por ruido y algo oscurecidos.
  3. **Hachures:** según la pendiente, con antialias por `fwidth` y fundido al alejar.
  4. **Curvas de nivel:** cada 250 m en `--pencil` y cada 1 000 m en `--ink`, con `fwidth` y temblor por ruido.
  5. **Papel:** `paper-512.webp` en espacio de pantalla.

  → verificar: capturas cenital, a 38° y en los Transantárticos, comparadas con `docs/rendimiento/capturas/preact-vite/mapa-1440.jpg`. La paleta coincide.

- [x] 18. **Tinta** (`InkLines.tsx`, `InkEffect.ts`).
  - Costa, frentes de barrera y ruta Ushuaia-Marambio con `Line` de drei sobre `heightAt` + ε, en `--ink`, con jitter determinista de ±0,3.
  - Postproceso de bordes por profundidad y normal (Sobel) en tinta, con desplazamiento de ruido estático.
  - `PerformanceMonitor`: baja el `dpr` y después apaga el postproceso si caen los fps.

  → verificar: las crestas tienen tinta a 38°.

- [x] 19. **Marcadores y etiquetas 3D.**
  - Overlay `.ov` hermano del canvas, con posiciones por `useFrame` y `style.transform` sobre refs.
  - Clustering solo en el evento `rest` y al cambiar el tamaño. Se ocultan los puntos fuera de la vista de la cámara.
  - Etiquetas de mares y regiones en DOM, con las posiciones de `land.ts`.
  - Palito de tinta en cada marcador.
  - Brújula que gira con el acimut y vuelve al norte al tocarla.

  → verificar: Tab recorre los marcadores en el mismo orden que en 2D, y Fósiles inicia la expedición.

- [x] 20. **Cambio de vista** (`map/ViewToggle.tsx`, `MapView`, `AntarcticaApp`, `packages/core/src/storage.ts`).
  - Toggle «Mapa / Relieve 3D» con estilo de chip, con `aria-pressed`, junto a «Ver como lista».
  - 2D → 3D: desde `poseFromView` hasta `HOME_3D`, en 900 ms.
  - 3D → 2D: a vista cenital, después `viewFromPose` sin salto.
  - La ficha, la lista, la leyenda y `explored` se conservan.
  - `loadViewMode` y `saveViewMode` (`antartida:view`, con try/catch), con tests.
  - Vista inicial según S7, y precarga ociosa del 3D.

  → verificar: alternar varias veces sin saltos, y recargar conserva la vista.

- [x] 21. **Bajada 3D, movimiento reducido y fallback.**
  - En 3D, `phase === 'dive'` hace `setLookAt(DIVE_3D, true)` en `DIVE_MS`, oculta los marcadores y después el `veil` existente.
  - Al volver: `HOME_3D` con foco en Fósiles.
  - Con movimiento reducido: transiciones en 0 ms.
  - `hasWebGL` (de `lab-comparacion:apps/r3f-3d/src/main.tsx`) antes de mostrar el toggle.
  - Con `webglcontextlost` o un error en la escena: volver a 2D y avisar con un toast.

  → verificar: el recorrido completo en 3D con mouse y teclado. Sin WebGL, arranca en 2D sin toggle.

- [x] 22. **Rendimiento.**
  - Escenario 3D en `scripts/bench/src/gpu.ts`: órbita de 3 s, 3 zooms con botón y rueda × 10, a 1440 px.
  - Ajustar en este orden: malla, tamaño del relieve, `dpr`, postproceso y hachures.
  - Anotar en `docs/rendimiento.md`.

  → verificar: `pnpm bench` con 0 tareas > 16 ms durante la órbita en escritorio.

- [x] 23. **Transparencia y fuentes.**
  - `Legend.tsx`, en 3D: «Relieve real · Bedmap3 (BAS) · exageración vertical ×25 · curvas cada 250 m».
  - `README.md`: Bedmap3 con los DOI, el organismo, CC BY 4.0, la cita y la fecha. Licencias MIT de three, R3F, drei y postprocessing.
  - `docs/decisiones.md`: sección «Vista 3D» con S6-S13 y los números del paso 22.

  → verificar: `grep -n "Bedmap3" README.md` muestra URL, organismo y fecha.

- [x] 24. **E2E nuevos.**
  - `packages/e2e/tests/map3d.spec.ts` a 390 y 1440 px:
    - toggle y canvas;
    - marcadores enfocables;
    - Fósiles hace la bajada y abre la expedición;
    - al volver, sigue en 3D;
    - se recuerda la vista;
    - ningún error de consola.
  - `packages/e2e/tests/no-webgl.spec.ts`, adaptado de `lab-comparacion:packages/e2e/tests/r3f-fallback.spec.ts`.

  → verificar: `pnpm e2e` en verde.

## Tests nuevos

| Comportamiento | Archivo |
|---|---|
| `unproject` inverso de `project` | `packages/core/test/map.test.ts` |
| `buildMarkers` con proyector equivale al 2D | `packages/core/test/map.test.ts` |
| Malla y `heightAt` (Polo, Domo A, océano) | `packages/core/test/terrain.test.ts` |
| Ida y vuelta de cámara, y `DIVE_3D` sobre el terreno | `packages/core/test/camera.test.ts` |
| `loadViewMode`/`saveViewMode` con storage bloqueado | `packages/core/test/map.test.ts` |
| Flujo 3D completo y persistencia de la vista | `packages/e2e/tests/map3d.spec.ts` |
| Sin WebGL: solo 2D | `packages/e2e/tests/no-webgl.spec.ts` |

## Verificación final

En la raíz:

```sh
pnpm test && pnpm typecheck && pnpm build && pnpm e2e
pnpm --filter @antartida/atlas test:ui
git diff --stat .githooks   # empty
```

Sin commits (S14).

**Reporte final del ejecutor:**
- pasos completados;
- conteos de tests;
- números de rendimiento;
- todo lo que no pudo hacer o que se desvió del plan, con el motivo.

## Preguntas abiertas: 0
