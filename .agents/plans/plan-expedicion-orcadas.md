# Plan: Expedición Estación Orcadas (#3)

Rama: `3-expedición-estación-orcadas`. Issue #3, asignado a LucasA21.

Idea en una línea: **«Un siglo mirando el cielo»**. Volás a la isla Laurie, recorrés la estación en 3D, hacés vos la observación meteorológica del día, y tu dato se suma a un registro de más de cien años que podés recorrer hacia atrás.

## Objetivo y criterio de éxito

1. Desde el mapa (2D o 3D), tocar «Estación Orcadas» lleva la cámara hasta la isla Laurie y abre la escena de la estación. Sin WebGL o con movimiento reducido, entra con fundido y la escena usa una lámina ilustrada.
2. La escena de la estación es un diorama 3D propio, navegable (órbita limitada, toque, teclado), con puntos calientes: abrigo meteorológico, mástil de viento, casa, bahía, pingüinera.
3. Cuatro actividades completas, cada una con inicio, interacción y cierre:
   - **Observación del día:** leer termómetro, barómetro, viento y nubes; anotar en la libreta; recibir devolución.
   - **Máquina del tiempo:** deslizador de épocas que cambia edificios, instrumentos e hitos.
   - **Un año en Orcadas:** rueda de meses que cambia luz, hielo marino, fauna y dotación.
   - **El siglo en datos:** gráfico animado de la serie real de temperatura, con la observación del usuario marcada aparte.
4. Los tres niveles del issue quedan cubiertos: explorar (vuelo y recorrido libre), descubrir (observación y año), profundizar (máquina del tiempo, siglo en datos, fuentes).
5. Cada dato visible tiene fuente (URL, organismo, fecha de consulta) y una etiqueta: **dato real**, **simulación** o **reconstrucción**. Un contenido sin fuente no se renderiza (lo garantiza un test).
6. ~~Sonido sintetizado.~~ Quitado por decisión de Lk (11 nov): la expedición no lleva sonido.
7. Funciona a 390 px y 1440 px, con teclado y lector de pantalla, y respeta `prefers-reduced-motion`.
8. `pnpm test && pnpm typecheck && pnpm build && pnpm e2e` en verde.

## Entorno detectado

- Verificación canónica: `pnpm test && pnpm typecheck`. Antes del PR: `git rebase origin/main`, `pnpm test`, `pnpm build`. E2E: `pnpm e2e` (Playwright, 390 y 1440 px; falla ante cualquier error de consola).
- Capas: lógica pura, datos y fuentes en `packages/core`; componentes en `packages/react-ui`. Imports por nombre de workspace.
- Idioma: código y comentarios en inglés; textos de interfaz, commits y docs en español.
- Stack ya instalado y suficiente: React 19, three 0.187, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`. **No se agregan dependencias.**
- Escala del mapa: 1 unidad = 8 km. La isla Laurie mide unos 2,5 unidades y el relieve tiene ~1,4 km por celda: el terreno global no alcanza para mostrar la estación. Por eso la estación es una escena propia.

## Supuestos y decisiones

Decisiones de Lk (11 nov 2026):

- D1. Formato híbrido: vuelo en el mapa 3D y escena propia de la estación.
- D2. Entran las cuatro actividades.
- D3. Núcleo para el avance del 16 nov; el resto y el pulido entre el 16 y el 18.
- D4. ~~Sonido sintetizado.~~ Reemplazada el 11 nov: sin sonido.
- D5. Fósiles no es referencia de nivel: es solo el ejemplo de cómo se enchufa una expedición. Apuntar mucho más alto.
- D6. Calidad visual antes que peso. Se optimiza después si hace falta.
- D7. Higgsfield no se usa en la expedición (genera imagen y video, no interactividad; licencia sin documentar). Queda como opción para el video del pitch.

Supuestos del agente:

- S1. #2 (estructura común) no tiene dueño. Orcadas arma su propio módulo, como hizo #4. No se construye un componente genérico de expedición.
- S2. #4 cambia `explored` de booleano a lista de ids en `storage.ts`, `AntarcticaApp.tsx` y `MapView.tsx`, y aún no está mergeada. Se toman **esos mismos cambios, idénticos**, desde `origin/4-expedición-desde-ushuaia`, para que el segundo merge no tenga conflicto real. Se avisa en #3 y #4 antes de tocar archivos compartidos.
- S3. El diorama es una **reconstrucción ilustrada**: se construye con geometría procedural a partir de fotos y planos con licencia libre, y se rotula así en la interfaz. No pretende ser un modelo a escala.
- S4. El tiempo de «la observación del día» es una **simulación**: se sortea con semilla dentro de la climatología real del mes. Se rotula así.
- S5. Duración del día y altura del sol se calculan con la fórmula astronómica para 60°44′ S. Es un cálculo, se rotula como tal y se cita la fórmula.
- S6. Si no aparece una serie de temperatura descargable con licencia clara, «El siglo en datos» muestra solo los valores publicados en artículos (con DOI) y no un gráfico año por año. Se decide en el paso 2.
- S7. Toda afirmación histórica sobre personas reales (Bruce, Acuña, Mossman y otros) entra solo con fuente primaria abierta y verificada por el orquestador, no por el agente que la buscó.

## Reparto del trabajo

- **Fable (orquestador):** arquitectura, lógica de `core`, escena 3D y shaders, integración con el mapa, revisión de todo lo delegado, verificación de cada fuente.
- **agy, Gemini 3.8 Flash medio:** búsqueda de fuentes, borradores de contenido, script de descarga de la serie, arte SVG de instrumentos, textos alternativos. Sus salidas van al scratchpad y entran al repo solo después de revisión.
- **Opus 5.5 (subagentes):** componentes acotados con contrato ya definido (libreta, rueda del año, gráfico, panel de fuentes, tests e2e), en paralelo.
- Regla: nada delegado se commitea sin que el orquestador lo lea, lo corra y lo corrija o lo devuelva.

## Fuera de alcance

- Componente genérico de expedición (#2).
- Cambios en `apps/atlas`.
- Mejorar el relieve global de las Orcadas (datos nuevos de elevación).
- Temperatura en vivo de la base (#22).
- Optimización de peso del bundle (después de la entrega, si hace falta).

## Blast radius

Archivos compartidos que se tocan, todos con cambio mínimo:

- `packages/core/src/content/points.ts`: Orcadas pasa a `tier: 'A'`.
- `packages/core/src/storage.ts`, `packages/core/src/motion.ts`: lista de explorados (igual que #4).
- `packages/core/src/index.ts`: dos exports nuevos.
- `packages/core/src/camera.ts`: la pose de inmersión pasa de constante a función del punto.
- `packages/react-ui/src/AntarcticaApp.tsx`: pantalla `orcadas`, carga diferida.
- `packages/react-ui/src/map/MapView.tsx`: `onStart` recibe el punto.
- `packages/react-ui/src/map3d/Map3DLayer.tsx`: monta `OrcadasSite`.
- `packages/e2e/tests/flow.spec.ts` y `packages/core/test/*`: se ajustan a los explorados por id.
- `README.md`: fuentes, licencias y uso de IA.

Riesgo principal: conflicto con #4 (ver S2). Riesgo secundario: dos `Canvas` de WebGL; se resuelve desmontando el mapa al entrar a la escena, como ya hace la pantalla de Fósiles.

## Archivos

Crear:

- `packages/core/src/content/orcadas.ts`: fuentes, épocas, instrumentos, meses, fauna, textos, con `kind` y `sourceIds`.
- `packages/core/src/content/orcadas-series.ts`: serie generada (no se edita a mano).
- `packages/core/scripts/build-orcadas-series.ts`: descarga a `~/.cache/antartida3d/orcadas/`, valida y genera la serie.
- `packages/core/src/orcadas.ts`: lógica pura (estado, observación, sol, hielo, épocas, estadísticas).
- `packages/core/src/styles/orcadas.css`.
- `packages/core/test/orcadas.test.ts`, `packages/core/test/orcadas-content.test.ts`.
- `packages/react-ui/src/orcadas/`:
  - `OrcadasExpedition.tsx` (pantalla, capítulos, foco y teclado)
  - `StationScene.tsx`, `stationModels.ts`, `stationSky.glsl.ts`, `StationFallback.tsx`
  - `Hotspots.tsx`
  - `observation/Observation.tsx`, `Thermometer.tsx`, `Barometer.tsx`, `WindMast.tsx`, `CloudPicker.tsx`, `Notebook.tsx`
  - `TimeMachine.tsx`, `YearWheel.tsx`, `CenturyChart.tsx`
  - `SourcesPanel.tsx`, `KindChip.tsx`
- `packages/react-ui/src/map3d/OrcadasSite.tsx`: estación, bandera y vida alrededor de la isla en el mapa 3D.
- `packages/e2e/tests/orcadas.spec.ts`.
- `docs/orcadas-fuentes.md`: registro de fuentes y licencias.

Modificar: los de «Blast radius».

Eliminar: ninguno.

## Pasos

### Etapa A. Base (hasta jue 12)

- [x] 1. Línea base (88 tests unitarios, 36 e2e, typecheck y build en verde): correr `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm e2e` y anotar conteos. → verificar: los cuatro en verde, conteo anotado en este plan.
- [ ] 2. Fuentes. agy ya está buscando (salida en el scratchpad). El orquestador abre cada URL, confirma que dice lo que se afirma y escribe `docs/orcadas-fuentes.md` con referencia, organismo, fecha de consulta, licencia y estado. Decide S6 según la serie encontrada. → verificar: ninguna entrada sin URL abierta; las dudosas quedan como `[Fuente a definir]` y fuera del contenido.
- [x] 3. Avisar en #3 y #4 el plan sobre archivos compartidos (S2). → verificar: comentarios publicados.
- [x] 4. `packages/core/src/content/orcadas.ts`: tipos `OrcadasSource`, `Fact` (`kind: 'real' | 'sim' | 'recon' | 'calc'`, `sourceIds`), épocas, instrumentos, climatología mensual, fauna y textos, solo con lo verificado en el paso 2. Export en `index.ts`. → verificar: `pnpm --filter @antartida/core test orcadas-content` (todo `Fact` real tiene al menos una fuente con URL y fecha; ningún `sourceId` huérfano).
- [x] 5. `packages/core/scripts/build-orcadas-series.ts` y `content/orcadas-series.ts` (si S6 lo permite). → verificar: el script regenera el archivo idéntico; test de rango y de años sin huecos no declarados.
- [x] 6. `packages/core/src/orcadas.ts`: reductor de la expedición (capítulos, progreso, libreta), `observationFor(seed, month)`, `checkReading()` con tolerancia por instrumento, `beaufort()`, `sunAt(dayOfYear, hour)` y `dayLength()`, `seaIceAt(month)`, `eraAt(year)`, `decadeMeans()` y `linearTrend()`. → verificar: `pnpm --filter @antartida/core test orcadas`.
- [x] 7. Explorados por id, tomando los cambios de #4 sin modificar (`storage.ts`, `motion.ts`, `AntarcticaApp.tsx`, `MapView.tsx`, `ExplorationLog.tsx`, `ListView.tsx`, tests). → verificar: `git diff origin/4-expedición-desde-ushuaia -- packages/core/src/storage.ts` vacío; `pnpm test && pnpm e2e`.

> Enmienda (11 nov): la cuota de Gemini 4 Argon en agy se agotó durante la segunda ronda (se repone después de la entrega). Desde ahí los encargos van a Gemini 3.8 Flash en esfuerzo alto, por indicación de Lk.
> Enmienda (11 nov): los modelos 3D del diorama se hacen en el estilo voxel de cajas de #4 (ver `docs/decisiones.md`, «Estilo de los modelos 3D»), por pedido de Lk.
> Enmienda (11 nov): `createSeededRng` se movió de `sea.ts` a `packages/core/src/rng.ts` (sea.ts lo reexporta) para que la lógica pura de Orcadas no cargue los assets del mapa al importarse desde un test e2e.
> Estado del paso 2: 5 de 9 fuentes verificadas por el orquestador (Cancillería, Armada, SCAR READER, OMM OSCAR, Zazulie 2010). Pendientes: Mossman 1907, COMNAP, Murphy 1995, ficha del HSM 42. Sus datos están en el código pero ocultos.
> Hallazgo fuera de alcance: test e2e inestable de ocean3d, registrado como issue #41.

### Etapa B. Llegar y recorrer (hasta sáb 14)

- [x] 8. Entrada desde el mapa: Orcadas a `tier: 'A'`; `onStart(point)`; pose de inmersión por punto en `camera.ts`; pantalla `orcadas` con carga diferida en `AntarcticaApp.tsx`. → verificar: test de `camera.test.ts` para la pose de Orcadas; e2e «abrir Orcadas desde el mapa» en 2D y 3D.
- [x] 9. `OrcadasSite.tsx` en el mapa 3D: maqueta de la estación con bandera, témpanos y pingüinos alrededor de la isla Laurie, visibles al acercarse; rótulo «reconstrucción». → verificar: e2e de mapa 3D sin errores de consola; captura a 390 y 1440 px revisada.
- [x] 10. `StationScene.tsx`: diorama del istmo entre las dos bahías, con el mismo trazo de tinta y acuarela del mapa. Incluye cielo y luz según mes y hora, nieve y viento por partículas, mar con oleaje, hielo marino, edificios por época, mástil, abrigo meteorológico, pingüinos animados. Cámara con órbita limitada. `StationFallback.tsx` para sin WebGL. → verificar: e2e carga la escena sin errores; 30 fps o más en el perfil móvil de `pnpm bench`; captura revisada.
- [x] 11. `OrcadasExpedition.tsx` y `Hotspots.tsx`: capítulos (Llegada, Observación, Un año, Máquina del tiempo, El siglo, Cierre), puntos calientes como botones reales sobre la escena, foco al cambiar de capítulo, Escape, botón «Mapa». → verificar: e2e recorre todos los capítulos solo con teclado.
- [x] 12. `SourcesPanel.tsx` y `KindChip.tsx`: fuentes por capítulo y etiqueta de dato real, simulación, reconstrucción o cálculo en cada contenido. → verificar: test de que un `Fact` sin fuente no aparece en el DOM.

### Etapa C. Observación del día (hasta dom 15) — cierra el núcleo del avance

- [x] 13. Instrumentos interactivos en SVG: termómetro (columna que sube, lectura por arrastre o flechas), barómetro (aguja y escala), mástil (veleta y cazoletas que giran según el viento de la escena), nubes (se elige cuántos octavos del cielo están cubiertos mirando el cielo del diorama). → verificar: e2e completa cada lectura con puntero y con teclado.
- [x] 14. `Notebook.tsx`: libreta que se va llenando con letra manuscrita, devolución por lectura (acierto dentro de tolerancia), sello final. La observación queda guardada para «El siglo en datos». → verificar: test del reductor; e2e de la libreta completa.
- [x] 15. Verificación de avance (12 nov: 158 + 59 tests unitarios, typecheck, build y 54 de 54 e2e en verde; falta la prueba manual en teléfono, que hace Lk): `git rebase origin/main`, `pnpm test && pnpm typecheck && pnpm build && pnpm e2e`, prueba manual en celular. PR parcial si Lk quiere tenerlo en `main` para el 16. → verificar: todo en verde.

### Etapa D. Tiempo y datos (lun 16 y mar 17)

- [x] 16. `YearWheel.tsx`: rueda de 12 meses que mueve la escena (arco del sol, horas de luz, bahía que se congela y se abre, fauna que llega y se va, dotación, llegada del relevo). → verificar: test de `sunAt`, `dayLength` y `seaIceAt`; e2e mueve la rueda y lee el anuncio accesible.
- [x] 17. `TimeMachine.tsx`: deslizador de épocas con transición de edificios e instrumentos en el diorama, hitos con fuente y foto histórica con licencia libre si existe. → verificar: test de `eraAt`; e2e recorre las épocas.
- [x] 18. `CenturyChart.tsx` (con la skill `dataviz`): serie anual animada, medias por década, tendencia, marca de la observación del usuario rotulada como simulación, tabla accesible equivalente. → verificar: test de `decadeMeans` y `linearTrend` contra valores calculados a mano; e2e.
- [x] 19. ~~`audio.ts`~~ Quitado: sin sonido (decisión de Lk, 11 nov). No se crea `audio.ts` ni botón de sonido.
- [ ] 20. Cierre de la expedición: resumen de lo observado, punto marcado como explorado, vuelta al mapa con el foco en el marcador. → verificar: e2e de registro de exploración.

### Etapa E. Pulido y entrega (mié 18, antes de las 19:00)

- [ ] 21. Pasada de diseño con la skill `impeccable` (jerarquía, movimiento, textos, estados vacíos, móvil). → verificar: capturas antes y después a 390 y 1440 px.
- [ ] 22. Revisión con el subagente `code-reviewer` sobre el diff completo y corrección de hallazgos. → verificar: sin hallazgos abiertos de severidad alta.
- [x] 23. `README.md`: fuentes y licencias de Orcadas, declaración de uso de IA (Claude Code con Fable 5.2 y Opus 5.5; agy con Gemini 3.8 Flash). → verificar: cada fuente de `docs/orcadas-fuentes.md` figura en el README.
- [ ] 24. Buscar duplicados de bugs (`.agents/scripts/bug-issue-check.sh`), `git rebase origin/main`, verificación final y PR con `Closes #3`. → verificar: comando de «Verificación final» en verde.

### Etapa E2. Pedidos de Lk del 12 nov (antes del pulido final)

- [ ] 26. **Entrada con zoom continuo, como «Desde Ushuaia».** Hoy Orcadas entra con la inmersión de Fósiles (cámara baja y velo). Lk quiere que la cámara del mapa 3D haga zoom desde la vista general hasta la isla Laurie y que de ahí se pase a la estación, sin corte brusco. Mirar cómo lo hace el viaje (`packages/react-ui/src/voyage/Voyage3D.tsx`, `useVoyage.ts` y `startVoyage` en `AntarcticaApp.tsx`) y reusar ese mecanismo de cámara. La maqueta `map3d/OrcadasSite.tsx` ya está sobre la isla: el zoom debe terminar encuadrándola y fundir con el diorama (mismo punto de vista inicial que `OVERVIEW_POSE_*` de `orcadas/Hotspots.tsx`). Con movimiento reducido o sin WebGL: fundido simple. → verificar: e2e de entrada en 3D, 2D y movimiento reducido; captura de tres momentos del zoom.
- [ ] 27. **Tirones dentro de la expedición.** Lk nota que la escena va «a tirones» por momentos. Diagnosticar antes de tocar (skill `dev-debug`). Pistas ya vistas: `StationScene.tsx` usa `frameloop="demand"` pero varios `useFrame` llaman a `invalidate()` sin tope de cuadros (no usa `useAnimationClock` como el mapa, que limita a 30 fps); `PerformanceMonitor` alterna `lowQuality` y `enablePost`, y cada cambio remonta el `EffectComposer` y cambia `dpr` (posible causa de saltos); `preserveDrawingBuffer: true` y `antialias: true` cuestan; la proyección de puntos calientes corre en cada cuadro; revisar si algún `useMemo` de geometrías depende de props que cambian (hora, mes, viento) y se reconstruye. Medir con el panel de rendimiento de Chrome y con `scripts` de `scratchpad/tools/perf.mjs`. Meta: 60 fps estables en una notebook común y sin saltos al cambiar de capítulo. → verificar: medición antes y después anotada acá; `pnpm e2e`.
- [ ] 28. **Pulido de diseño** (skill `impeccable`). Ya detectado: el dibujo del termómetro queda chico en el panel; «Climatología de noviembre» es demasiado técnico (usar «Clima de noviembre»); se muestra el rumbo de la veleta antes de que el usuario la lea; en la línea de tiempo se pisan las marcas 1903 y 1905; el gráfico del siglo queda chico en la columna lateral de escritorio; revisar el capítulo de cierre (resumen de lo observado, sello, vuelta al mapa). → verificar: capturas antes y después a 390 y 1440 px.

### Etapa F. Relleno del resto del mundo (pedido de Lk, 12 nov) — al final y con confirmación

- [ ] 25. **Antes de empezar, volver a pedirle confirmación a Lk** (puede arrepentirse). Lk avisó al equipo que lo hace él; va en esta rama, sin issue aparte. Alcance acordado: solo vista 3D; siluetas planas del resto del hemisferio sur (Sudamérica completa, punta de África, Australia, Nueva Zelanda) con los datos de Natural Earth que ya usa `packages/core/scripts/build-coastline.ts`, sin relieve y sin fuente nueva; unión con el relieve de Tierra del Fuego bajando su altura a cero en el borde; desvanecido hacia el tono del papel; tope al alejar la cámara. Es contexto, no dato. Archivos compartidos: `build-coastline.ts`, `Map3DLayer.tsx`, `Fuegia.tsx`. → verificar: capturas del mapa 3D alejado sin mar infinito ni corte en Ushuaia; `pnpm test && pnpm typecheck && pnpm build && pnpm e2e`.

## Tests nuevos

- `packages/core/test/orcadas-content.test.ts`: todo dato real tiene fuente completa; ids de fuente válidos; épocas ordenadas y sin solaparse.
- `packages/core/test/orcadas.test.ts`: reductor; observación determinista por semilla y dentro de la climatología del mes; tolerancias de lectura; escala Beaufort; sol y duración del día (solsticios y equinoccios); hielo por mes; época por año; medias por década y tendencia.
- `packages/core/test/camera.test.ts`: pose de inmersión para Orcadas.
- `packages/e2e/tests/orcadas.spec.ts`: entrada desde el mapa (2D, 3D y movimiento reducido), recorrido completo con teclado, cada actividad, fuentes visibles, registro de exploración, 390 y 1440 px.

## Verificación final

```sh
git fetch && git rebase origin/main
pnpm test && pnpm typecheck && pnpm build && pnpm e2e
```

Más prueba manual en un teléfono real (criterio del issue #3).

## Preguntas abiertas: 0
