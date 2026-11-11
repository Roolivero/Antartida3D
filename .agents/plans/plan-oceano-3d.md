# Plan: Océano 3D real, dibujado y vivo (M2 + fauna + barco + puntos de interés)

Estado: **aprobado por Lk (11 nov 2026).** Se trabaja en la misma rama del issue #15.

Ejecución: Claude Code orquesta y revisa; `agy` ejecuta cada fase.
- **Fases fáciles** (datos, componentes, animación, puntos de interés, tests y docs: F1, F2, F4, F6 y F7): `--model gemini-3.8-flash-medium`.
- **Fases difíciles** (shaders del agua F3, y fauna con sus ilustraciones y su shader F5): `--model gemini-4-argon-high`, porque en la fase B anterior Gemini Flash falló en la parte gráfica.
- **Si Argon se queda sin uso** (error de cuota o límite), según cuántas veces haya pasado:
  1. **La primera vez:** Claude frena la ejecución y le pide a Lk que cambie de cuenta de Gemini (tiene dos). Cuando Lk confirma el cambio, se relanza la misma fase con Argon.
  2. **La segunda vez** (ya con la segunda cuenta): Claude no vuelve a preguntar. Hace él mismo las fases difíciles que falten y sigue usando agy con Flash, en esa misma cuenta, para las fáciles.
- Después de cada fase, Claude revisa capturas y diff antes de lanzar la siguiente (puertas de revisión).

Marcá cada paso con `[x]` al terminarlo. Si un `→ verificar` falla, corregí la causa raíz o frená y reportá el error exacto.

## Objetivo y criterio de éxito

1. **Todo el fondo del 3D es mar.** Ya no hay un disco de acuarela flotando sobre papel. El agua llega hasta el horizonte en cualquier ángulo de cámara y se funde con una bruma del color del papel.
2. **El agua se lee real:**
   - El color sale de la profundidad real (batimetría IBCSO v2): la plataforma continental se ve más clara y verdosa, y el talud y la cuenca abisal más profundos.
   - El relieve del fondo se transparenta en la plataforma.
   - Tiene brillo del sol y efecto Fresnel (más reflejo al mirar en ángulo bajo).
   - Hay oleaje animado y espuma animada en la costa y en los frentes de barrera.
3. **El agua se ve dibujada.** Usa la paleta de `tokens.css`, lavados de acuarela, trazos de olas en tinta al estilo de las cartas náuticas antiguas, grano de papel y, de cerca, isobatas en lápiz (curvas de igual profundidad). No es agua «fotorrealista»: es una carta náutica que vive.
4. **El mar está vivo:**
   - **Fauna dibujada y animada:** ballenas jorobadas, orcas, ballenas minke, pingüinos y focas leopardo. Aparecen en zonas plausibles, con ciclos de nado, soplido y buceo.
   - **Témpanos tabulares** que derivan.
   - **El rompehielos ARA Almirante Irízar** navega la ruta Ushuaia-Antártida.
5. **Puntos de interés:** al menos 3 elementos del mar abren una ficha con un dato interesante y su fuente verificada (por ejemplo el Irízar, la ballena jorobada y un témpano). Reusan `PointSheet`. Si un dato no tiene fuente verificada, no se publica: se marca `[Fuente a definir]`.
6. **Transparencia:** la interfaz distingue lo que es dato real (batimetría, ruta) de lo que es ilustración (los animales y témpanos animados son representativos, no posiciones reales).
7. **Rendimiento:**
   - 60 fps estables en escritorio (RTX 3070, 1440 px) con todo animado.
   - ≥ 30 fps en un celular de gama media (probado en un teléfono físico).
   - Sin animación ni consumo cuando la pestaña está oculta, la vista es 2D o hay `prefers-reduced-motion`.
   - Peso nuevo ≤ 4 MB en escritorio y ≤ 2 MB en celular.
8. **Sin regresiones:** el 2D no cambia (la acuarela del 2D queda idéntica byte por byte), y `pnpm test && pnpm typecheck && pnpm build && pnpm e2e` pasan.

## Entorno detectado

- Monorepo pnpm. App: `apps/dibujado`. 3D: `packages/react-ui/src/map3d/`, con:
  - `Map3DLayer.tsx` (Canvas `frameloop="demand"`, `CameraControls`, `EffectComposer`, `PerformanceMonitor`);
  - `Terrain.tsx` y `paintedTerrain.glsl.ts`;
  - `OceanBlock.tsx`, que hoy es un plano con `map-paint-3d-*.webp` más las paredes en `--deep`;
  - `InkLines.tsx` e `InkEffect.ts`.
- Core: `packages/core/src/relief.ts` (`VERTICAL_EXAGGERATION = 50`, `SUN`, `worldHeight`, `METERS_PER_MAP_UNIT`), `terrain.ts`, `camera.ts` (`homePose3D`, `DIVE_3D`), `projection.ts` (`project`/`unproject`), `content/points.ts` (`PTS`) y `markers.ts`.
- Datos: el script de terreno `packages/core/scripts/build-terrain.ts` (`pnpm terrain`) lee Bedmap3 desde `~/.cache/antartida3d/bedmap3/`. Los datos están documentados en `docs/datos-relieve.md`.
- Capturas: `scripts/bench/src/captures.ts`, que escribe en `docs/rendimiento/capturas/3d/`. Rendimiento con GPU: `scripts/bench/src/gpu.ts`.
- Tests:
  - `pnpm test`: 39 tests de core (Vitest) más 4 de atlas.
  - `pnpm e2e`: 18 tests (Playwright, 390 y 1440 px).
- Herramientas: Node 26, pnpm, `/usr/bin/chromium` y una GPU RTX 3070. `sharp`, `geotiff`, `proj4` y `@mapbox/martini` ya están en core.
- Reglas: `AGENTS.md` y `.agents/rules/`.
  - Fuentes con URL, organismo y fecha.
  - No presentar ilustración como dato.
  - Licencias documentadas.
  - Código en inglés y docs en español.
  - Un issue por PR.

## Supuestos y decisiones

- **D1 (Lk):** M2 primero: agua real con batimetría.
- **D2 (Lk):** fauna dibujada y animada, un barco reconocido y elementos del mar, con algunos como puntos de información.
- **D3 (Lk):** todo el fondo es agua, no un disco.
- **D4 (Lk):** el agua tiene que quedar perfecta, muy optimizada, realista y con el estilo dibujado.
- **S1. Rama (D5 de Lk).** El mar es parte del issue #15: se trabaja en la misma rama, `15-unificar-repo-y-sumar-vista-3d-al-mapa-dibujado`, sin issue nuevo.
- **D5 (Lk):** las ilustraciones de fauna y barco las hace el agente por ahora. Si no gustan, el equipo las redibuja reemplazando los SVG, sin tocar código.
- **S2. Batimetría: IBCSO v2.**
  - Organismo: SCAR/IBCSO, Alfred Wegener Institute, publicado en PANGAEA. Licencia CC BY 4.0. Grilla de 500 m al sur de 50° S.
  - Dataset: Dorschel, B. et al. (2022), *The International Bathymetric Chart of the Southern Ocean Version 2 (IBCSO v2)*, PANGAEA, https://doi.org/10.1594/PANGAEA.937574.
  - Paper: Dorschel et al. 2022, *Sci Data* 9:275, https://doi.org/10.1038/s41597-022-01366-7.
  - Descarga: https://doi.pangaea.de/10.1594/PANGAEA.937574?format=html#download.
  - Consultado el 11 nov 2026.
  - Existe un «IBCSO 2025 Annual Release» en https://ibcso.org/current_version/. Usar v2 salvo que el 2025 tenga la misma licencia y sea igual de fácil de bajar; anotar cuál se usó.
  - **Ojo: la proyección es EPSG:9354** (WGS84 / IBCSO Polar Stereographic, paralelo estándar −65°). **No es EPSG:3031** como Bedmap3, así que hay que definirla aparte en `proj4`. Verificar la definición exacta en el archivo `.prj` o en los metadatos del GeoTIFF; no inventarla.
  - Más allá de 50° S (las esquinas del mapa) no hay dato: la profundidad se extiende con la abisal más cercana o un valor fijo de −4000 m, documentado como relleno.
- **S3. Agua sin geometría de fondo, profundidad «falsa».** No se dibuja una malla del fondo debajo de un agua transparente: es caro (dos superficies, transparencia y orden de dibujo) y casi no se ve desde arriba. Se hornea una sola textura de batimetría:
  - R: profundidad;
  - G y B: normal del fondo;
  - A: distancia a la costa.

  El shader del agua calcula con eso el color como luz absorbida por la profundidad: `mix(fondo sombreado, agua profunda, 1 − exp(−profundidad·k))`. Una sola malla, un solo pase y sin transparencia real. Así se logra el «se ve el fondo en la plataforma» a costo mínimo.
- **S4. Mar infinito.** El plano del agua es grande (por ejemplo, 20× el mapa) y se recentra bajo el objetivo de la cámara. A partir de cierta distancia se funde con `--paper` mediante niebla exponencial en el mismo shader. Se elimina el disco y las paredes del bloque: la costa ahora termina en el agua.
  - La graticula y los textos de la acuarela («0° Greenwich», «60° S») se pasan a líneas en tinta finas sobre el agua (círculos de latitud y meridianos) y a etiquetas DOM. No quedan horneadas en la textura del océano.
- **S5. Animación sin gastar.**
  - El canvas sigue con `frameloop="demand"`. Mientras el 3D está visible y el movimiento está permitido, un único bucle pide un cuadro cada 33 ms (30 fps de animación), con `invalidate()`.
  - Las interacciones de cámara siguen a 60 fps.
  - Se pausa con `document.hidden`, con la vista 2D, con `prefers-reduced-motion`, o cuando el `PerformanceMonitor` detecta problemas (en ese caso baja a 15 fps).
  - El tiempo de animación se pasa al shader como uniform, sin recrear materiales.
- **S6. Fauna y objetos como sprites instanciados.**
  - Ilustraciones propias en SVG con el estilo dibujado (tinta y lavado), horneadas en un atlas de texturas con Chromium (mismo método que `build-map-raster.ts`).
  - Se dibujan con un solo `InstancedMesh` de billboards (planos que siempre miran a la cámara), en una sola llamada de dibujo para todos los animales.
  - Las animaciones son funciones del tiempo en el vertex shader (subir, soplido, bucear, desplazarse por una curva). Cero trabajo en CPU por cuadro.
  - Tope: ~40 instancias en total, ~20 en celular.
  - Las ilustraciones son obra del equipo o generadas en este repo, con licencia del proyecto. No se copian imágenes de terceros.
- **S7. Ubicación plausible, nunca «dato».** Los animales aparecen en zonas donde la especie es habitual (por ejemplo, la jorobada alrededor de la Península en verano y el pingüino emperador cerca de la costa de la Tierra de la Reina Maud, donde ya existe el punto `emperador` en `PTS`). La leyenda 3D dice «Fauna y témpanos: ilustración representativa, no posiciones reales». Las zonas usadas se documentan con su fuente; sin fuente, la especie va en una zona genérica de mar abierto y se marca pendiente.
- **S8. Rompehielos ARA Almirante Irízar.** Es el barco más reconocido de la campaña antártica argentina y se conecta con el punto `campana`, «La campaña desde Ushuaia». Navega en loop por la ruta Ushuaia-Marambio que ya dibuja `land.ts`. Su ficha lleva datos con fuente oficial (Armada Argentina u otra primaria), a verificar. Si no se verifica, la ficha queda con `[Fuente a definir]` y no se inventa nada.
- **S9. Puntos de interés del mar.** Se agregan a `core/src/content/` como un módulo propio, `sea.ts`, con el tipo `SeaPoint` (id, título, texto, fuentes[], posición o ruta). Se renderizan como marcadores de un tipo nuevo, con un icono pequeño distinto de las expediciones, y abren `PointSheet`. Los textos y fuentes los redacta el agente solo a partir de páginas abiertas y verificadas, y quedan para revisión humana en el PR (regla del eje).
- **S10. El 2D no cambia** en esta tarea. La acuarela del océano 2D sigue igual. Si después se quiere fauna en 2D, va en otro issue.

## Fuera de alcance

- Una malla real del fondo del mar visible bajo el agua (se usa el truco de S3).
- Hielo marino estacional como dato. Si se dibuja algo de hielo suelto, va como decoración marcada.
- Física del agua, olas reales o barcos navegables por el usuario.
- Fauna en 2D, sonido y nuevas expediciones.
- M1, M3 y M4 de `plan-realismo-3d.md`.

## Blast radius

- **`OceanBlock.tsx`:** se reemplaza por `Ocean.tsx`. Desaparecen las paredes del bloque y el disco.
- **`Map3DLayer.tsx`:** bucle de animación, capas nuevas (fauna, barco, marcadores del mar) y límites de cámara. La cámara no debe ver «el borde del mundo».
- **`markers.ts` y `react-ui/src/map/Markers.tsx`:** nuevo tipo de marcador del mar. Los tests de marcadores existentes no deben cambiar.
- **`Legend.tsx`:** nueva fila de transparencia.
- **`captures.ts`, `gpu.ts` y E2E:** nuevos escenarios.
- **Assets:** batimetría, atlas de fauna y, posiblemente, una textura de olas en tinta, de unos 2-4 MB.

## Archivos

**Crear**

- `packages/core/scripts/build-bathymetry.ts` (`pnpm bathymetry`): lee IBCSO y genera `packages/core/src/assets/ocean-bathy-{2048,1024}.webp`.
- `packages/core/scripts/build-sea-atlas.ts` (`pnpm sea-atlas`): hornea los SVG de fauna y objetos en `packages/core/src/assets/sea-atlas.webp` y genera `sea-atlas.json` (coordenadas de cada sprite).
- `packages/core/src/art/sea/*.svg`: las ilustraciones (ballena jorobada en lomo, cola y soplido; orca; minke; pingüino; foca; témpano tabular; Irízar).
- `packages/core/src/ocean.ts`: constantes (`OCEAN_SIZE`, `DEPTH_ABSORB`, `SEA_FPS`), `depthAt(x, y)` y las rutas y zonas de fauna (datos puros, testeables).
- `packages/core/src/content/sea.ts`: los puntos de interés del mar con sus fuentes.
- `packages/core/test/ocean.test.ts` y `packages/core/test/sea.test.ts`.
- `packages/react-ui/src/map3d/Ocean.tsx` y `packages/react-ui/src/map3d/ocean.glsl.ts`.
- `packages/react-ui/src/map3d/SeaLife.tsx` y `packages/react-ui/src/map3d/seaLife.glsl.ts`.
- `packages/react-ui/src/map3d/useAnimationClock.ts`: el bucle de animación de S5.
- `packages/e2e/tests/ocean3d.spec.ts`.

**Modificar**

- `packages/core/package.json` y `package.json` (raíz): scripts `bathymetry` y `sea-atlas`.
- `packages/core/src/index.ts`, `markers.ts` y `camera.ts` (límites).
- `packages/react-ui/src/map3d/Map3DLayer.tsx`, `Terrain.tsx` (espuma en la costa), `map/Markers.tsx` y `map/Legend.tsx`.
- `packages/core/src/styles/painted.css`: el marcador del mar.
- `scripts/bench/src/captures.ts` y `gpu.ts`.
- `docs/datos-relieve.md`: sección IBCSO y archivos nuevos.
- `docs/decisiones.md`, `README.md` (fuentes y licencias) y `docs/rendimiento.md`.

**Eliminar**

- `packages/react-ui/src/map3d/OceanBlock.tsx`.
- `terrain-elevation-grid.bin` y su generación: no se usa (pendiente de `plan-realismo-3d.md`).

## Pasos

### F0: precondición

- [x] 0. Estar en la rama del issue #15 con el árbol limpio. → verificar:
  - `git branch --show-current` imprime `15-unificar-repo-y-sumar-vista-3d-al-mapa-dibujado`;
  - `gh issue view 15 --json assignees --jq '.assignees[].login'` imprime solo `LucasA21`.

### F1: datos de batimetría (agy medium)

- [x] 1. **Descarga en segundo plano.** Abrir la sección de descarga de PANGAEA (S2) e identificar el GeoTIFF de profundidad en la proyección IBCSO (no el RGB ni el de hielo). Bajarlo con `nohup curl -L -C - ... &` a `~/.cache/antartida3d/ibcso/`. No inventar URLs: si no se resuelve el enlace, frenar y pedírselo a Lk. → verificar: el archivo existe, crece y termina. El header muestra EPSG:9354, 500 m.
- [x] 2. **`build-bathymetry.ts`.**
  - Grilla de 2049² sobre el cuadro **completo** del mapa, con margen (`−MAP_RASTER_PAD .. 1000 + MAP_RASTER_PAD`, el mismo que la acuarela).
  - Por celda: `unproject`, después `proj4(EPSG:4326 → EPSG:9354)` y muestreo bilineal. La definición de EPSG:9354 se toma del GeoTIFF o del `.prj`.
  - Fuera de cobertura (al norte de 50° S): relleno según S2.
  - Tierra (altura > 0 o máscara de Bedmap3 ≠ 0): profundidad 0.
  - Canales:
    - R: profundidad 0-6000 m con curva raíz cuadrada (más precisión en la plataforma, que es lo que se ve);
    - G y B: normal del fondo con exageración `VERTICAL_EXAGGERATION`;
    - A: distancia a la costa en unidades de mapa, recortada a 0-12 (para la espuma y las olas cerca de la costa).
  - Salida: `ocean-bathy-2048.webp` (escritorio) y `ocean-bathy-1024.webp` (celular), sin pérdida en R y A. Si sin pérdida pesa más de 3 MB, separar los canales y comprimir las normales con pérdida.

  → verificar: el script imprime la profundidad en el centro del Mar de Weddell (≈ −4000 a −5000 m), en el borde de la plataforma frente a la Península (≈ −500 m) y en el Pasaje de Drake (≈ −3500 a −4500 m). Guardar en el scratchpad una vista previa de cada canal y mirarla.
- [x] 3. **`core/src/ocean.ts`** con `depthAt(x, y)` (lee la grilla, O(1), bilineal) y constantes. Tests en `test/ocean.test.ts`:
  - el Weddell es profundo;
  - la costa de la Península está entre 0 y −1000 m;
  - un punto en tierra da 0;
  - 10 000 llamadas tardan menos de 50 ms.

  → verificar: `pnpm --filter @antartida/core test`.
- [x] 4. **Borrar `terrain-elevation-grid.bin`** y su bloque en `build-terrain.ts`. Correr `pnpm terrain` y confirmar con `git status` que solo cambia ese archivo (las mallas y texturas deben quedar iguales). → verificar: `pnpm test` en verde.

**Puerta de revisión 1 (Claude):** mirar las vistas previas de la batimetría. Tiene que reconocerse la plataforma, el talud, las cuencas, el Pasaje de Drake y la dorsal de Scotia.

### F2: mar infinito base (agy medium)

- [x] 5. **`Ocean.tsx` reemplaza a `OceanBlock.tsx`.**
  - Plano de `OCEAN_SIZE` con pocas divisiones. Las olas van en el shader de fragmentos, no en vértices.
  - Se recentra cada cuadro bajo el objetivo de `CameraControls`, redondeado a la celda de la textura de olas para que no «nade».
  - Material `ShaderMaterial` provisorio (color por profundidad simple) para validar la geometría y la proyección UV con la batimetría (mismo UV que la acuarela: `(x + MAP_RASTER_PAD) / MAP_RASTER_SPAN`).
  - Borrar `OceanBlock.tsx` y sus imports.
- [x] 6. **Niebla al papel y límites de cámara.** Niebla exponencial hacia `--paper` en el shader del agua y del terreno (función compartida en un `chunk` GLSL, no copiada). Ajustar `setBoundary` y la distancia máxima de `CameraControls`, y `far` de la cámara, para que en ningún ángulo permitido se vea el borde del plano. → verificar: capturas a 0°, 38° y 60° de inclinación y al máximo alejamiento, en 1440 y 390 px. El fondo es agua y bruma, no papel liso ni un borde recto.
- [x] 7. **Graticula en tinta sobre el agua**: círculos de 60° y 70° S y 12 meridianos, con `Line` de drei y opacidad baja. Más las etiquetas «0° Greenwich» y «60° S» en DOM, en Caveat, con el mismo mecanismo de posicionamiento que las etiquetas de mares. → verificar: captura cenital comparada con `mapa-2d-1440.jpg`. La graticula coincide en posición.

**Puerta de revisión 2 (Claude):** capturas de F2 y prueba de que el 2D no cambió (`md5sum` de `map-paint-768/2048/4096.webp`).

### F3: el agua dibujada (agy con Argon; si no hay cuota, Claude)

- [x] 8. **`ocean.glsl.ts`**, con una uniform por capa, en este orden:
  1. **Absorción por profundidad.** Tres colores de la paleta (`tokens.css`): plataforma clara y fría (glaciar más blanco y verde mínimo), media `--glacier` y profunda `--deep`, mezclados por `1 − exp(−d·k)`. El fondo de la plataforma se sombrea con la normal de batimetría y el `SUN` de `relief.ts`, y se ve a través del agua solo donde es poco profunda.
  2. **Lavado de acuarela.** Variación de tono de baja frecuencia con la misma textura de papel, más bordes de «charco» más oscuros en los cambios de profundidad (el talud). Es lo que la hace parecer pintada.
  3. **Oleaje.** Dos texturas de normales de olas pequeñas, generadas en el build como ruido repetible (no imágenes de terceros), desplazadas en direcciones distintas con `uTime`. Se usan solo para el brillo y el Fresnel, no para el color.
  4. **Fresnel y cielo.** Más reflejo de un cielo pálido (`--ice` / `--paper`) al mirar en ángulo bajo, menos desde arriba.
  5. **Brillo del sol.** Especular con el `SUN` fijo, cortado en «pinceladas» por una máscara de ruido, para que el brillo sean trazos y no un punto fotográfico.
  6. **Trazos de olas en tinta.** Marcas cortas tipo «~» de carta náutica en mar abierto, en espacio de mundo, que aparecen y desaparecen lento con `uTime`. Desaparecen al alejarse con `fwidth`, igual que los hachures, para no ensuciar.
  7. **Isobatas en lápiz.** Cada 500 m y más marcada cada 2000 m, solo de cerca (mismo `contourFade` que el terreno, por distancia de cámara). Ayudan a leer el talud.
  8. **Espuma en la costa y frentes de barrera.** Bandas que avanzan hacia la costa usando el canal A (distancia a la costa) más ruido, en blanco papel con borde de tinta suave. Animadas con `uTime`.
  9. **Niebla al papel y grano de papel**, iguales al terreno.
- [x] 9. **Unión costa-agua.** Revisar que no haya costura entre el terreno y el agua. Si el terreno tiene altura ~0 en la costa, el agua a `y = 0` puede parpadear (z-fighting): resolverlo con `polygonOffset` en el agua o bajándola apenas, no con un valor mágico sin explicar.
- [x] 10. **Capturas y ajuste** (cenital, 38°, de cerca en la Península y en la barrera de Ross, y 390 px). Comparar con el estilo del 2D. Iterar los uniforms hasta que el agua tenga la paleta de la acuarela. Las capturas se miran de verdad, no solo se generan.

**Puerta de revisión 3 (Claude):** juicio visual completo del agua. Si no cumple «real + dibujada», se corrige antes de seguir con la fauna.

### F4: animación eficiente (agy medium)

- [x] 11. **`useAnimationClock.ts`** según S5: un solo intervalo con `requestAnimationFrame` limitado a `SEA_FPS = 30`, que actualiza un uniform compartido `uTime` y llama a `invalidate()`. Se apaga con `document.hidden`, en la vista 2D, con `prefers-reduced-motion` y cuando el `PerformanceMonitor` baja la calidad (en ese caso pasa a 15 fps). Con movimiento reducido, `uTime` queda fijo: el agua se ve igual, pero quieta. → verificar: un test de Vitest con reloj falso para la lógica de pausa (la función pura de «debe animar»), y en el navegador, con la pestaña oculta, cero cuadros (medido con `performance` en un spec E2E).

### F5: fauna, témpanos y el Irízar (agy con Argon; si no hay cuota, Claude)

- [ ] 12. **Ilustraciones.** SVG propios en `packages/core/src/art/sea/`, con trazo de tinta `--ink`, lavado de acuarela con los filtros de `svg/filters.ts` y siluetas reconocibles:
  - ballena jorobada en tres poses: lomo, cola al bucear y soplido;
  - orca: aleta dorsal y lomo;
  - minke;
  - grupo de pingüinos sobre un témpano chico;
  - foca leopardo sobre el hielo;
  - témpano tabular en dos tamaños;
  - ARA Almirante Irízar: casco rojo, superestructura blanca y estela.

  Las siluetas del barco se toman de fotos públicas oficiales **solo como referencia de forma**; no se calca ni se incorpora una imagen ajena. `build-sea-atlas.ts` hornea todo en `sea-atlas.webp` (2048, con alfa) más `sea-atlas.json`.
- [ ] 13. **`core/src/ocean.ts`: zonas y rutas.**
  - Zonas por especie: polígonos simples en coordenadas de mapa, con la fuente de cada zona en un comentario y en `docs/datos-relieve.md`.
  - Ruta del Irízar: Ushuaia → Pasaje de Drake → Marambio, la misma curva que la ruta de `land.ts`, sin duplicarla: extraer los puntos a una constante compartida.
  - Semillas deterministas para las posiciones, así las capturas y los tests son estables.

  Tests en `test/sea.test.ts`:
  - todas las instancias caen en el agua (`depthAt < −20`);
  - la ruta empieza en Ushuaia y termina en Marambio;
  - el mismo resultado con la misma semilla.
- [ ] 14. **`SeaLife.tsx` y `seaLife.glsl.ts`.**
  - Un `InstancedMesh` de billboards, con atributos por instancia: sprite, fase, velocidad, centro y radio de la deriva.
  - Las animaciones se resuelven en el vertex shader con `uTime`:
    - ballenas: ciclo de 20-40 s de emerger, soplido (sprite de chorro con fundido), lomo y cola al bucear, desaparecer; reaparecen en otro punto de su zona;
    - orcas: en grupos de 3 a 5, con un desfase entre sí;
    - témpanos: deriva muy lenta;
    - pingüinos y focas: fijos sobre su témpano, con un balanceo mínimo;
    - Irízar: avanza por la ruta, orientado según su tangente, con la estela como sprite que se desvanece.
  - Ondas de agua (anillos en tinta) donde emerge una ballena, en el mismo shader del agua: se pasan hasta 8 posiciones y fases como uniform.
  - Tamaño en pantalla con mínimo y máximo, para que no desaparezcan al alejarse ni tapen todo al acercarse.
  - En celular, la mitad de las instancias.
- [ ] 15. **Ocultar durante la bajada (`phase === 'dive'`)**, como los marcadores. Que no tapen las etiquetas: los sprites se dibujan antes del overlay DOM, y ninguno se ubica a menos de N px de un marcador de `PTS`.

**Puerta de revisión 4 (Claude):** capturas y un video corto (Playwright `recordVideo`) de 10 s a 38°. Revisar que las animaciones se vean naturales y dibujadas.

### F6: puntos de interés del mar (agy medium)

- [ ] 16. **`core/src/content/sea.ts`** con 3 a 5 puntos: Irízar, ballena jorobada, témpano tabular y, opcionalmente, orca y pingüino emperador. Cada uno lleva título, 2-3 oraciones y `sources: [{ label, url, org, consulted }]`.
  - Solo con datos de páginas abiertas y leídas: organismos oficiales (Armada Argentina, Dirección Nacional del Antártico, Instituto Antártico Argentino), IUCN, NOAA, BAS y papers.
  - Si un dato no se encuentra, el texto dice `[Fuente a definir]` y el punto se marca como pendiente. **No se inventa ni se completa.**
- [ ] 17. **Marcador del mar.**
  - Tipo nuevo en `markers.ts` (`kind: 'sea'`), con un icono propio pequeño en tinta y estilo en `painted.css`, distinto de las expediciones y alineado con la leyenda.
  - El del Irízar sigue al barco: su posición sale de la misma función de ruta que el shader, evaluada en la CPU con el mismo `uTime`.
  - Abre `PointSheet` con las fuentes.
  - Teclado y `aria-label` como los demás marcadores.
- [ ] 18. **`Legend.tsx`.** En 3D, agregar «Profundidad: IBCSO v2 (SCAR)» y «Fauna y témpanos: ilustración representativa, no posiciones reales», más el símbolo del marcador del mar.

### F7: rendimiento, tests y documentación (agy medium)

- [ ] 19. **Rendimiento.**
  - Escenario «océano» en `gpu.ts`: 10 s quieto a 38° con animación, más órbita y zoom.
  - Criterio: 0 tareas largas en el hilo principal, GPU < 8 ms por cuadro en escritorio, y llamadas de dibujo nuevas ≤ 5 (agua, fauna, graticula y espuma, en el mismo pase si se puede).
  - Medir también con `dpr` 2 a 390 px.
  - Anotar en `docs/rendimiento.md`.
- [ ] 20. **E2E `ocean3d.spec.ts`** a 390 y 1440 px:
  - en vista inclinada, el píxel de una esquina de la pantalla es color agua o bruma, no papel liso ni negro;
  - el marcador del Irízar existe, es enfocable con Tab y abre una ficha con al menos una fuente o `[Fuente a definir]`;
  - con `prefers-reduced-motion`, dos capturas separadas por 1 s son idénticas;
  - con la pestaña oculta no se piden cuadros;
  - ningún error de consola.
- [ ] 21. **Documentación.**
  - `docs/datos-relieve.md`: sección IBCSO (fuente, licencia, cita, EPSG:9354, el relleno al norte de 50° S y los archivos nuevos con su peso) y sección «Mar ilustrado» (qué es ilustración, zonas y sus fuentes).
  - `README.md`: fuentes y licencias.
  - `docs/decisiones.md`: S3 a S9.
- [ ] 22. **Verificación final completa** y prueba en un teléfono físico por la red local (`pnpm dev`). Si no se puede probar en el teléfono, queda como pendiente explícito.

## Tests nuevos

| Comportamiento | Archivo |
|---|---|
| `depthAt`: Weddell profundo, plataforma de la Península poco profunda, tierra 0, O(1) | `packages/core/test/ocean.test.ts` |
| Fauna siempre en el agua, ruta del Irízar Ushuaia-Marambio, determinismo | `packages/core/test/sea.test.ts` |
| Lógica de pausa de la animación (oculto, 2D, movimiento reducido, baja calidad) | `packages/core/test/ocean.test.ts` |
| Puntos del mar: cada uno tiene fuente o `[Fuente a definir]` | `packages/core/test/sea.test.ts` |
| Fondo de agua en cualquier ángulo, marcador del Irízar, movimiento reducido, pestaña oculta | `packages/e2e/tests/ocean3d.spec.ts` |

## Verificación final

```sh
pnpm test && pnpm typecheck && pnpm build && pnpm e2e
md5sum packages/core/src/assets/map-paint-{768,2048,4096}.webp   # 2D unchanged
cd scripts/bench && npx tsx src/captures.ts && npx tsx src/gpu.ts
```

**Reporte final del ejecutor:**
- pasos hechos;
- profundidades de control;
- conteos de tests;
- fps y ms de GPU;
- peso de los assets nuevos;
- rutas de capturas y video;
- fuentes usadas por punto;
- lo pendiente.

## Riesgos

- **El estilo es lo más difícil de lograr** (agua real y dibujada a la vez). Por eso hay puertas de revisión visual y Argon (o Claude) en F3 y F5.
- **EPSG:9354 mal definido corre la batimetría** respecto de la costa. La puerta de revisión 1 compara la costa de IBCSO con la de Natural Earth.
- **Animación continua en celulares:** S5 la limita, y la puerta de rendimiento en F7 lo mide.
- **Fuentes de los puntos del mar:** pueden quedar en `[Fuente a definir]`. Es aceptable y es preferible a un dato inventado.

## Preguntas abiertas: 0
