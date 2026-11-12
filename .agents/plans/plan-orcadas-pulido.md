# Plan de implementación: pulido de la expedición Estación Orcadas

Revisión hecha el 12 de noviembre de 2026 sobre `main` en `9f69ec1` (merge de #49). Base: recorrido completo a 1440, 390, 360 px y en horizontal (844 × 390), lectura del código de `packages/react-ui/src/orcadas/`, `packages/core/src/orcadas.ts` y `packages/core/src/content/orcadas.ts`, y bugs reproducidos en el navegador. Capturas y bocetos: lienzo «Revisión Expedición Orcadas» (tableros 1 a 4).

Las fases van en orden: cada una se apoya en la anterior. No hay tiempos asignados; el agente avanza a la siguiente cuando la fase actual está verificada y aprobada.

---

## Cómo usar este plan con Claude Code

1. Copiá este archivo a la raíz del repo como `.agents/plans/plan-orcadas-pulido.md`. Ese es el lugar donde el equipo guarda los planes, y así el agente lo lee con las reglas del repo cargadas.
2. Abrí Claude Code en la raíz del repo y pegale esto:

   > Leé `.agents/plans/plan-orcadas-pulido.md`, `AGENTS.md` y `.agents/rules/`. Ejecutá solo la fase que te indique. Antes de editar, confirmá conmigo el issue y la rama. En los bugs, escribí primero la prueba que falla. Al terminar la fase corré la verificación de la fase, mostrame la salida y detenete hasta que yo apruebe.

3. Arrancá por «Fase 0». Después pedile cada fase por número: «Ejecutá la Fase 1».
4. Cada fase termina en un PR con `Closes #<N>`. No mezcles fases en un PR: si una se cae, no arrastra a las demás.

### Reglas que el agente tiene que respetar en todas las fases

- Sin issue asignado a vos, no hay rama ni commits. El agente no reclama, no reasigna y no cierra issues. La única excepción son los issues de bug, que el agente sí puede crear después de buscar duplicados con `.agents/scripts/bug-issue-check.sh`.
- Una rama por issue, creada con `gh issue develop <N> --base main --checkout`. Nunca se commitea en `main`.
- Código, identificadores y comentarios en inglés. Commits, documentación y textos de la interfaz en español.
- No se inventan fuentes ni medidas. Un dato nuevo sin fuente verificada se marca como `[Fuente a definir]` y no se publica como «dato real». Una medida estimada se marca como estimada.
- Ninguna prueba se debilita para que pase. Si un requisito cambia (por ejemplo, la altura del panel en celular), la prueba se reescribe con el requisito nuevo y el PR explica por qué.
- La lógica y los datos van en `@antartida/core`; la interfaz en `@antartida/react-ui` (regla 01).
- Modelos 3D: solo cajas con `buildBoxGeometry` y `vehicleMaterial`, con el mínimo de detalle (regla 30).

### Verificación base (al cierre de cada fase)

```bash
pnpm test
```

```bash
pnpm typecheck
```

```bash
pnpm build
```

```bash
pnpm e2e -- --trace off
```

Durante la fase alcanza con las e2e de Orcadas; la suite completa va antes del PR:

```bash
pnpm --filter @antartida/dibujado e2e -- orcadas --trace off
```

---

## Fase 0 · Preparación

**Objetivo:** dejar issues y ramas listos para trabajar sin pisarse con el equipo.

1. El issue #3 está cerrado (se cerró con el PR #43). Hay que abrir issues nuevos, uno por fase:

   | Issue | Título sugerido | Fase | Tipo | Quién lo crea |
   |---|---|---|---|---|
   | A | Bugs de la expedición Orcadas (lectura, eras, scroll, candado, fichas, capas, edificios superpuestos) | 1 | `bug` | El agente, después de buscar duplicados |
   | B | Orcadas: rigor de contenido (tendencia en dos tramos, era 2000, fichas duplicadas) | 2 | mejora | Vos |
   | C | Orcadas: recorrido de 4 capítulos con pregunta guía | 3 | mejora | Vos |
   | D | Orcadas: fichas, paneles y fuentes sin saturar | 4 | mejora | Vos |
   | G | Orcadas: disposición real de la base y terreno ampliado | 5 | mejora | Vos |
   | E | Orcadas: experiencia en celular | 6 | mejora | Vos |
   | F | Orcadas: pulido visual de la escena y los instrumentos | 7 | mejora | Vos |

   Las fases 5 y 7 (escena 3D) casi no tocan los mismos archivos que las fases 3, 4 y 6 (interfaz). Si trabajás con dos agentes en paralelo, esa es la división natural. Cada uno en su rama, con su propio issue asignado.

2. **Antes de seguir, preguntá en el grupo por Fósiles.** El commit `fe5462e` borró `packages/react-ui/src/expedition/*`, `packages/core/src/content/fossils.ts`, `packages/core/src/expedition.ts` y `packages/core/test/expedition.test.ts`. Además, `start()` en `packages/react-ui/src/AntarcticaApp.tsx:106` ahora rechaza todo punto que no sea `'orcadas'`. Si era el andamio de S1 y estaba acordado, se deja así y se anota en `docs/decisiones.md`. Si no, quien tenga Fósiles lo tiene que saber. Dejá un comentario en el issue de Fósiles con qué se quitó y por qué. Este plan **no** restaura nada: es decisión del equipo.

3. Para la búsqueda de duplicados de la Fase 1, el agente corre, por ejemplo:

   ```bash
   .agents/scripts/bug-issue-check.sh orcadas lectura
   ```

   ```bash
   .agents/scripts/bug-issue-check.sh bandera 1903
   ```

   Y repite con `scroll panel`, `candado observación`, `hotspot fichas` y `edificios superpuestos`. Si el script sale con código 3, no pudo buscar: revisá a mano.

**Terminado cuando:** existen los issues y el de la Fase 1 está asignado a vos.

---

## Fase 1 · Bugs · Issue A

Cada bug sigue el mismo orden: prueba que falla, arreglo, prueba en verde.

### B1. El puntaje del cierre cambia si se mueve el mes (grave)

- **Síntoma:** anoté 4 lecturas en noviembre y el cierre decía «0 de 4». Avancé un mes en la rueda de «Un año» y pasó a «Tu observación de diciembre: 1 de 4».
- **Causa:** `packages/react-ui/src/orcadas/OrcadasExpedition.tsx:149` calcula `observationFor(initDate.seed + s.month, climate)`, y `climate` también depende de `s.month`. El capítulo «Un año» cambia `s.month`, así que la lectura del día cambia por detrás.
- **Arreglo:**
  1. Sumar `obsMonth: number` a `OrcadasState` en `packages/core/src/orcadas.ts`. Se inicializa en `initialOrcadas` con el mes actual y ninguna acción lo cambia.
  2. Crear en `core` una función pura `readingFor(state, seed)` que use `obsMonth`, no `month`.
  3. En `OrcadasExpedition.tsx`, la lectura, `monthName` en el cierre y `CenturyChart` (`userTempC`, pestaña «Tu mes») usan `obsMonth`. La escena y el selector de mes siguen usando `month`.
- **Prueba primero** (`packages/core/test/orcadas.test.ts`): anotar las 4 lecturas, despachar `{ type: 'month', month: s.month + 1 }` y comprobar que `scoreObservation` y la lectura no cambian.

### B2. Anacronismos en la máquina del tiempo (grave, rigor)

- **Síntoma:** en el año 1903 se ve la bandera argentina y un anemómetro en un mástil en tierra. El propio contenido dice que el traspaso fue el 22 de febrero de 1904 (`eras-traspaso-1904`) y que en 1903 el anemómetro estaba en la cubierta del Scotia (`obs-instrumental-1903`, Mossman 1907).
- **Causa:** la bandera y el mástil de viento se dibujan siempre en `StationScene.tsx`. Solo `omond`, `moneta`, `radioMast` y `modern` dependen de `era.buildings`.
- **Arreglo:**
  1. En `packages/core/src/content/orcadas.ts`, ampliar `BuildingId` con `'flag'` y `'windMast'`. Sumarlos a las eras desde 1905 (o desde 1904 si se agrega un corte en esa fecha). Antes de elegir el año del mástil, revisá en las fuentes cuándo hubo anemómetro en tierra. Si no se encuentra, la era 1905 lo muestra marcado como reconstrucción y se anota `[Fuente a definir]` en `docs/orcadas-fuentes.md`.
  2. En `StationScene.tsx`, la bandera y el mástil usan el mismo fundido por `presences` que los edificios.
  3. En `Hotspots.tsx`, los puntos `flag` y `mast` se ocultan cuando su modelo no está en la era activa.
- **Prueba primero:** en `core`, que `eraAt(1903).buildings` no incluya `flag` ni `windMast`. En e2e (`orcadas-time.spec.ts`), que en 1903 no exista el botón «Punto de interés: Mástil y pabellón».

### B3. El candado de la observación se saltea

- **Síntoma:** el botón principal dice «Completá las 4 lecturas» y queda deshabilitado, pero los botones de capítulo del encabezado (`goto`, `OrcadasExpedition.tsx:272`) llevan igual al cierre.
- **Decisión:** sacar el candado. El cierre ya contempla «No anotaste la observación del día».
- **Arreglo:** `canAdvanceOrcadas` devuelve `true` en la observación. El botón principal dice «Seguir» con 0 a 3 lecturas y el nombre del capítulo siguiente con 4. Mientras falten lecturas, debajo del botón se ve «Te faltan N lecturas, podés volver después».
- **Prueba:** actualizar `orcadas.test.ts` (los casos que hoy exigen 4 lecturas para avanzar pasan a exigir que se pueda avanzar con 0) y explicar el cambio de requisito en el PR.

### B4. El panel conserva el scroll del capítulo anterior

- **Síntoma:** en «Máquina del tiempo» y «El siglo», el «Capítulo N de 6» y el título quedan cortados arriba.
- **Arreglo:** en el efecto de `OrcadasExpedition.tsx` que mueve el foco (línea 140), resetear antes el scroll de `.orc-panel-scroll` con una ref (`scrollRef.current.scrollTop = 0`), y después llamar a `focus({ preventScroll: true })`.
- **Prueba e2e:** bajar el panel en «Llegada», ir a «Observación» y comprobar `scrollTop === 0` y el título visible.

### B5. Las fichas de los puntos de interés eligen datos por palabra suelta

- **Síntoma:** «Bahía Scotia» muestra «Ubicación de la base» (contiene «bahía») y «Fauna» (contiene «foca»). La misma ficha de fauna aparece en «Pingüinera», en «Bahía Scotia» y en el panel de Llegada. En celular se ven dos copias a la vez.
- **Causa:** `factsForHotspot` (`Hotspots.tsx:163`) busca subcadenas de `keywords` en el texto de todas las fichas publicables. Palabras como `'orcadas'` u `'observación'` coinciden con casi todo.
- **Arreglo:** borrar `keywords` y `factsForHotspot`. Cada punto declara `factIds: readonly string[]` explícitos, y esa relación vive en `core`, junto al contenido (`ORCADAS_HOTSPOT_FACTS` en `content/orcadas.ts`). Así el punto de interés deja de decidir el contenido en la capa de interfaz (regla 01).
- **Prueba en `core`** (`orcadas-content.test.ts`): cada `factId` de un punto existe y es publicable, y ninguna ficha aparece en dos puntos.

### B6. Dos cuentas de años distintas

- «Máquina del tiempo» dice «123 años de registro» (2026 − 1903) y «El siglo» dice «124 años» (cantidad de años con dato). Ninguna está mal, pero juntas parecen un error.
- **Arreglo:** una sola frase en los dos lugares, calculada en `core`: «Registro desde 1903: 123 años, 113 de ellos completos». Prueba unitaria del cálculo.

### B7. Se pueden abrir tres capas a la vez

- Con una ficha de punto abierta se puede abrir «Fuentes» encima, y el panel del capítulo sigue abajo. Son tres capas superpuestas.
- **Arreglo:** abrir «Fuentes» cierra la ficha del punto y viceversa. Una sola capa flotante por vez.
- **Prueba e2e:** abrir un punto, abrir Fuentes y comprobar que la ficha del punto no está en el DOM.

### B8. Edificios superpuestos

- **Síntoma:** visto desde arriba, el laboratorio (módulo ocre) se mete adentro de Casa Moneta, las cajas de suministros quedan pegadas a los dos y el cable de la antena de radio cruza por encima de los techos. Lo marcó Lucas con una captura.
- **Causa:** las posiciones están sueltas en el JSX de `StationScene.tsx`. Casa Moneta está en `[2.6, 1.45, -1.5]` y mide unos 3,64 × 2,44. El grupo moderno está en `[5.8, 1.45, 1.8]`, y dentro de `buildModernModulesBoxes` el laboratorio está corrido a `[-1.2, y, -4.4]`, o sea, en el mundo, en unos `[4.6, -2.6]` con 2,95 × 1,95. Las dos plantas se superponen en x 3,1 a 4,4 y z −2,7 a −1,6. Las cajas están en `[4.6, 1.45, -0.6]`, pegadas a ambos.
- **Arreglo en esta fase (provisorio):**
  1. Extraer todas las posiciones y rotaciones de edificios, instrumentos, bandera, cajas y bote a una sola constante `STATION_LAYOUT` en `core` (`packages/core/src/content/orcadas-layout.ts`). Cada entrada lleva `id`, `position`, `rotationY` y `footprint` (ancho y fondo de la planta en unidades del mundo).
  2. Separar el laboratorio del grupo moderno: hoy está atado al pabellón por una pasarela. Pasa a ser su propio modelo (`buildLaborcBoxes`), registrado en `SCENE_MODELS` (regla 30.7).
  3. Correr las piezas para que ninguna planta se toque. La Fase 5 reemplaza estas posiciones por las reales.
- **Prueba primero** (`packages/core/test/orcadas-layout.test.ts`): ningún par de plantas de `STATION_LAYOUT` se interseca, con un margen mínimo de 0,5 unidades, salvo los pares declarados como conectados (por ejemplo, una pasarela). Esta prueba queda como guardián para la Fase 5.

**Verificación de la fase:** la base, más la captura del cierre después de mover el mes y una captura cenital de la estación.

> Enmienda (12 nov 2026): B2 suma la era «Traspaso a la Argentina» (1904) con la bandera; el mástil de viento aparece desde 1905 como reconstrucción, `[Fuente a definir]` en `docs/orcadas-fuentes.md`. Los rótulos 1903, 1904 y 1905 de la regla del tiempo van en tres filas para no pisarse. Fase 1 verificada: `pnpm test` (238), `pnpm typecheck`, `pnpm build` y `pnpm e2e` (58) en verde.

> Enmienda (12 nov 2026): por pedido de Lk, un solo issue (#53), una rama (`53-orcadas-pulido`) y un solo PR global; cada fase en su propio commit.

---

## Fase 2 · Rigor del contenido · Issue B

### C1. Recta de tendencia en dos tramos

- Hoy hay una sola recta de +0,19 °C por década entre 1903 y 2026 (`linearTrend(ORCADAS_ANNUAL_TEMP)` en `packages/react-ui/src/orcadas/century/centuryData.ts:199`). En la misma pantalla se cita a Zazulie, Rusticucci y Solomon (2010): sin tendencia significativa entre 1903 y 1950, y calentamiento significativo desde 1950.
- **Arreglo:** `linearTrend` ya está en `packages/core/src/orcadas.ts:436`. Sumar al lado `segmentedTrend(series, splitYear)` y calcular dos tramos, 1903–1950 y 1951–último año completo. El gráfico dibuja los dos, con la pendiente de cada uno en su rótulo. Etiqueta «Cálculo sobre la serie». El texto aclara que la significancia estadística la da el paper y no este cálculo.
- **Prueba:** valores de control de las dos pendientes en `orcadas-content.test.ts`, calculados una vez y fijados.

### C2. La era «2000» es una fecha ilustrativa

- `packages/core/src/content/orcadas.ts:412` lo admite en un comentario, pero la interfaz muestra «Desde 2000» con la misma jerarquía que las fechas reales.
- **Arreglo:** buscar en Cancillería o en COMNAP una fecha con fuente para el laboratorio LABORC o para los módulos actuales. Si aparece, reemplazar la era 2000 por esa fecha y su fuente. Si no aparece, renombrar la era a «Hoy», sin año de inicio, con un chip «Fecha ilustrativa».

### C3. Fichas repetidas

- Fundir `arrival-antiguedad` (Cancillería) y `arrival-base-mas-antigua` (Armada) en una ficha con las dos fuentes.
- `done-laborc-actual` y `done-monumento-hsm42` aparecen en la era «today» y de nuevo en el cierre: dejarlas en un solo lugar (el cierre).
- **Prueba:** ninguna `factId` en dos capítulos ni en dos eras (`orcadas-content.test.ts`).

### C4. Fauna y hielo por mes

- Están marcados como simulación y eso está bien. Buscar una fuente para las temporadas de cría de pingüinos en Orcadas del Sur y para el hielo marino de la bahía. Sin fuente, se quedan como simulación y no se muestran porcentajes («30 % hielo marino» suena a medición).
- **Arreglo mínimo:** reemplazar los porcentajes por palabras («bahía abierta», «hielo suelto», «bahía cerrada»).

### C5. Elevación: 8 m o 4 m

- `arrival-elevacion` dice 8 m sobre el nivel del mar (COMNAP). Hay fuentes secundarias que dicen 4 m. Revisar en el catálogo de COMNAP y en OSCAR/OMM (que publica la altura de la estación meteorológica). Si no coinciden, decirlo en la ficha, como ya se hace con «1951 según Armada, 1952 según Cancillería».

### C6. Registrar en las fuentes

- Actualizar `docs/orcadas-fuentes.md` con lo que cambie, sea fuente nueva, descartada o `[Fuente a definir]`, con referencia, organismo, fecha de consulta y licencia.

**Verificación:** la base, más abrir cada fuente nueva y confirmar que dice lo que afirma la ficha (lo pide `AGENTS.md` para la revisión).

> Enmienda (12 nov 2026): fase 2 hecha. C5: 8 m confirmado por COMNAP y OSCAR (API, elevación 8, barómetro 12). C2: sin fecha con fuente para LABORC; la era pasa a «Hoy» con «Fecha ilustrativa». C4: ficha nueva `year-hielo-octubre` (COMNAP, «Sea Ice Break Up: October»); cría de pingüinos `[Fuente a definir]`. La e2e de fuentes no verificadas deja de buscar «Zazulie»: esa fuente está verificada y ahora se cita en el gráfico. Verificación: `pnpm test` y `pnpm typecheck` en verde; e2e 57 de 58, la que falla es `ocean3d` «seaTime advances» (#41, inestable y ajena a Orcadas).

---

## Fase 3 · Recorrido de 4 capítulos · Issue C

Es la fase que más suma en «Innovación» y «Comunicación». Detalle visual en el tablero «2 · Recorrido propuesto» del lienzo.

### Diseño

| # | Capítulo | `Chapter` | Qué hace | Qué cambia en la escena |
|---|---|---|---|---|
| 1 | Llegar | `arrival` | Una frase y la pregunta guía: «¿Cuánto cambió el clima de la isla Laurie en 120 años?». Los datos de la base salen de los puntos del diorama. | Vista general, puntos activos |
| 2 | Observar | `observation` | Las 4 lecturas, sin candado (B3). La lectura queda fija a `obsMonth` (B1). | La cámara va al instrumento activo |
| 3 | Viajar | `journey` | Un solo control de año: arma el diorama de esa época **y** mueve el cursor en el gráfico del siglo. Fusiona `TimeMachine` y `CenturyChart`. | Edificios, bandera y mástil por era |
| 4 | Responder | `answer` | Tu lectura del día al lado del mismo mes en cada año desde 1903 (lo que hoy es la pestaña «Tu mes»), con la respuesta a la pregunta guía y su fuente. Después, el sello y «Terminar expedición». | Atardecer, cámara en la bandera |

«Un año» deja de ser capítulo: la rueda se reemplaza por una tira de meses que funciona como control fijo de la escena, en todos los capítulos (ver la Fase 7, F3). Así el recorrido baja de 6 a 4 capítulos.

### Pasos

1. **`core`:** `CHAPTERS = ['arrival', 'observation', 'journey', 'answer']`. Ajustar `OrcadasState`, el reducer, `canAdvanceOrcadas`, `factsFor` y los `chapter` de cada ficha en `content/orcadas.ts`. Para el capítulo `journey`, las fichas de `eras` y `century` se ordenan por año, para mostrar solo las de la era activa.
2. **Pruebas de `core` primero:** actualizar `orcadas.test.ts` y `orcadas-content.test.ts` para los 4 capítulos. Que cada capítulo tenga al menos una ficha publicable salvo `observation`, y que `journey` filtre por era.
3. **Pregunta guía:** constante `ORCADAS_GUIDING_QUESTION` en `content/orcadas.ts`. Se muestra en Llegar (arriba del panel), en el encabezado como subtítulo en vez de «Un siglo mirando el cielo», y en Responder.
4. **`Journey.tsx`** (nuevo, en `packages/react-ui/src/orcadas/`): reutiliza el gráfico de `CenturySvg.tsx` y los botones de era de `TimeMachine.tsx`. Hay un solo estado `year` en el reducer: el cursor del gráfico y la escena lo leen de ahí. La regla de oro es que mover el año cambie a la vez el diorama y el punto del gráfico.
5. **`Answer.tsx`** (nuevo): gráfico de puntos del mismo mes por año (datos reales de `ORCADAS_MONTHLY_TEMP`, SCAR READER) con la lectura del usuario marcada como simulación. La frase de respuesta se calcula en `core`: cuántos años de cada tramo fueron tan fríos como la lectura o más. Ejemplo verificado con la serie para −3,0 °C en noviembre: 16 de 48 años entre 1903 y 1950, y 4 de 70 desde 1951. Sin lectura anotada, se muestra la media del mes y una invitación a volver a Observar.
6. **Borrar lo que quede sin uso** (regla 04): `YearWheel.tsx` cuando la tira lo reemplace, las vistas y pestañas de `CenturyChart.tsx` que no se usen y la grilla de medias por década (es redundante con el gráfico). También los nombres de capítulo duplicados: `CHAPTER_NAMES` y `CHAPTER_HEADINGS` en `OrcadasExpedition.tsx`, y `CHAPTER_LABELS` en `SourcesPanel.tsx`. Dejar una sola fuente de nombres en `core`.
7. **e2e:** reescribir `orcadas.spec.ts`, `orcadas-time.spec.ts` y `orcadas-century.spec.ts` para el recorrido nuevo. Que siga existiendo el recorrido completo solo con teclado y la prueba de que nunca se muestra una ficha de fuente no verificada.

**Verificación:** la base, más el recorrido completo a mano en 1440 y 390 px. Referencia: el recorrido central (llegar, una lectura, viajar a 1903 y a hoy, y responder) tiene que caber en unos 90 segundos del video de 3 minutos.

> Enmienda (12 nov 2026): fase 3 hecha. La tira de meses (`MonthStrip`, F3) se hizo en esta fase porque reemplaza al capítulo «Un año»; la Fase 7 solo la pule. Las fichas del antiguo capítulo «Un año» pasan a `'months'` (el «Saber más» de la tira). Las fichas de «El siglo» se asignan a la era que corresponde (récord de 1930 en la era de 1927, Zazulie en la de 1951, promedios en «Hoy»), así `journeyFacts(year)` filtra por era. Se suma `sunsetHour` en core para la luz de atardecer de Responder. En el gráfico de Responder los puntos se distinguen en «igual de frío o más» y «más cálido». Verificación: `pnpm test` (182 core, 61 react-ui), `pnpm typecheck`, `pnpm build` y e2e de Orcadas (30) en verde.

---

## Fase 4 · Fichas, paneles y fuentes sin saturar · Issue D

**Principio:** una idea por pantalla. En cada capítulo hay, a la vista, una frase, una actividad y como mucho dos fichas. El resto va plegado.

### D1. Presupuesto de información por capítulo

- A la vista: frase de entrada (≤ 2 líneas en 390 px), la actividad y ≤ 2 fichas.
- Lo demás, dentro de un `<details>` con un `<summary>` del estilo «Saber más (3)». Es nativo, accesible por teclado y no necesita estado.
- Hoy Llegada muestra 7 fichas antes de que el usuario haga nada. Después de este cambio, las de ubicación, coordenadas y elevación van al punto «Estación», la de fauna a «Pingüinera» y la del diorama a la etiqueta fija «Reconstrucción ilustrada», como texto de ayuda.

### D2. Fichas de los puntos de interés

- Cada punto muestra su subtítulo y **una** ficha propia (B5), sin repetir lo que está en el panel.
- **Escritorio:** tarjeta chica anclada cerca del punto, no abajo a la izquierda lejos de él. Ancho de 320 px como máximo.
- **Celular:** la ficha no flota sobre la escena (hoy tapa justo lo que la cámara acaba de encuadrar). Reemplaza el contenido del panel inferior, con un botón «Volver al capítulo». Una sola capa (B7).
- Mantener lo que ya está bien: `role="dialog"`, Escape cierra, el foco vuelve al punto (`useFocusReturn`).

### D3. Etiquetas dato / simulación / reconstrucción / cálculo

- La honestidad está perfecta, pero hoy hay una etiqueta en cada ficha, a veces dos, y se vuelve ruido.
- **Regla nueva:** una etiqueta por bloque. Si un bloque mezcla tipos (gráfico con datos reales y una recta calculada), la leyenda del gráfico distingue cada uno y el bloque no lleva etiqueta general.
- **En «Fuentes»:** hoy los cuatro chips aparecen sin explicación. Cambiarlos por una lista de definición de una línea cada uno, por ejemplo «Dato real: medido o documentado por la fuente citada».

### D4. Pie de fuente en cada ficha

- Hoy cada ficha repite «Fuente: Cancillería Argentina · Dirección Nacional del Antártico» a 11 px.
- **Cambio:** una referencia corta y clickeable («Cancillería») que abre «Fuentes» con esa fuente resaltada. Así el texto baja y la trazabilidad sigue igual.

### D5. Panel «Fuentes»

- Fondo semitransparente detrás (scrim) y cerrar al tocar afuera, además de la X y Escape.
- Enlaces de al menos 44 px de alto: hoy son de 20 px. Que toda la tarjeta de la fuente sea el enlace.
- Al pie, un enlace «Ver todas las fuentes de la expedición».

### D6. Letra manuscrita (Caveat)

- Hoy se usa en kickers, valores, rótulos de los puntos 3D y leyendas, a veces a 13 px.
- **Regla:** Caveat solo en el kicker del capítulo y en el sello del cierre. Los números (lecturas, años, temperaturas) siempre en la letra de lectura. Hay 33 usos de la clase `hand` en `orcadas/`: revisarlos uno por uno.

**Verificación:** la base, más contar a mano en 390 px cuántos elementos hay en la primera pantalla de cada capítulo sin scroll (objetivo: título, frase, actividad o 1 o 2 fichas, y la barra de botones).

---

## Fase 5 · Disposición real de la base y terreno ampliado · Issue G

**Objetivo:** que la estación se vea lo más fiel posible a la real. Cada edificio con su función, en su lugar relativo, con su orientación y con un tamaño proporcional, sobre un istmo con el ancho y las dos bahías donde corresponden. Si para eso hace falta más terreno, se amplía. La escena sigue siendo una reconstrucción ilustrada y se declara así en la interfaz, pero con posiciones respaldadas por fuentes.

### Lo que se sabe hoy (a verificar, no publicar todavía)

Durante la revisión no se pudieron abrir las fuentes primarias (la red de ese entorno bloqueaba `ats.aq` y `marambio.aq`). Lo que sigue sale de buscadores y de fuentes secundarias. **El agente lo tiene que confirmar en la fuente original antes de usarlo:**

- Según DefOnline, son once edificios en un área de unos 4800 m², entre ellos casa principal, casa de emergencia, capilla y Casa Museo Moneta.
- Casa Omond estaría a unos 30 m de la orilla, al pie de los cerros.
- El Sitio y Monumento Histórico N.º 42 incluye Casa Omond, Casa Moneta y un cementerio. Algunas fuentes mencionan además una casilla meteorológica.
- La base está en el istmo Ibarguren, entre las bahías Scotia y Uruguay (Cancillería, ya verificado en `arrival-istmo`).

Ningún dato de esta lista entra al código sin su fuente primaria registrada.

### G1. Investigación (sin tocar código)

El agente, con internet en tu PC, arma `docs/orcadas-emplazamiento.md`. Fuentes a consultar, en este orden:

1. **Primarias, de texto:**
   - Secretaría del Tratado Antártico, ficha del HSM 42: https://www.ats.aq/devph/en/apa-database/119. Qué construcciones protege y sus coordenadas.
   - Cancillería, Base Orcadas: https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas.
   - Catálogo de estaciones de COMNAP (Argentina): https://www.comnap.aq/s/Argentina_Catalogue_Aug2017.pdf. Cantidad de edificios, superficies y capacidad.
   - Armada Argentina, bases permanentes: https://www.argentina.gob.ar/armada/antartida/bases-permanentes.
   - Si existe, un plan de gestión del HSM 42 o un informe de inspección del Tratado Antártico (los informes de inspección suelen describir los edificios uno por uno).
2. **Imágenes para medir posiciones:**
   - Imágenes satelitales de libre uso con fecha: Copernicus Sentinel-2 (licencia libre con atribución) o USGS Landsat (dominio público). A 10 o 30 m por píxel sirven para el istmo, la costa y las bahías, no para cada edificio.
   - Para posiciones de edificios, una imagen de mayor resolución usada **solo como referencia de medición**, sin incrustarla en la app si su licencia no lo permite. En el documento se anota qué imagen se usó y de qué fecha.
   - Fotos oficiales (Cancillería, Armada, Instituto Antártico Argentino) o de Wikimedia Commons con licencia explícita, para colores, techos, cantidad de pisos y orientación. Se registran en `docs/orcadas-fuentes.md` con su licencia y no se incrustan.
3. **Relieve:** revisar si el modelo de elevación REMA (Polar Geospatial Center) o algún otro modelo abierto cubre la isla Laurie. Si lo cubre, sirve para el perfil del istmo y los cerros. Si no, el relieve queda como reconstrucción.

`docs/orcadas-emplazamiento.md` tiene una tabla con una fila por elemento:

| Columna | Contenido |
|---|---|
| `id` | El mismo que en `STATION_LAYOUT` |
| Nombre y función | Por ejemplo «Casa Moneta, museo» |
| Planta | Ancho × fondo en metros |
| Altura y pisos | Si se sabe |
| Posición | Metros al este y al norte desde un punto fijo (por ejemplo, el mástil de la bandera) |
| Orientación | Hacia dónde mira la fachada principal |
| Época | Desde qué año existe (para las eras) |
| Fuente | Referencia, organismo y fecha de consulta |
| Confianza | `medido` (de imagen o plano), `estimado` (de foto) o `[Fuente a definir]` |

**Puerta de calidad:** el agente se detiene al terminar G1 y te muestra la tabla. No se modela nada hasta que la apruebes. Un elemento sin fuente queda afuera o como `[Fuente a definir]`, y no se ubica «a ojo».

### G2. Escala y terreno

1. Definir en `core` una constante `STATION_METERS_PER_UNIT` y convertir la tabla de G1 a unidades del mundo. Así `STATION_LAYOUT` (creado en B8) guarda metros reales y la escena convierte.
2. Ampliar el terreno: hoy `createIsthmusTerrainGeometry` (`stationModels.ts:1011`) es un plano de 130 × 130 con 56 × 56 segmentos. Agrandarlo o recentrarlo hasta que entren los 4800 m² de la base con margen, el ancho real del istmo y las dos bahías a cada lado. Subir los segmentos solo lo necesario, porque el celular paga cada vértice.
3. `evaluateIsthmusTerrain` respeta la forma de la costa medida en G1: qué lado es la bahía Scotia, cuál la Uruguay y dónde arrancan los cerros. La ladera de la pingüinera se ubica donde indiquen las fuentes.
4. Revisar que el agua, el hielo marino (`generateSeaIcePlates`) y los témpanos sigan cayendo en el agua con la costa nueva.

### G3. Modelos con planta y proporciones reales

1. Cada edificio de la tabla tiene su modelo de bloques con la planta y la altura de G1, a escala con `STATION_METERS_PER_UNIT`. Los edificios que hoy existen (`buildOmondBoxes`, `buildMonetaBoxes`, `buildModernModulesBoxes`, `buildLaborcBoxes` de B8) se ajustan a esas medidas.
2. Los edificios nuevos que aparezcan en G1 con fuente (por ejemplo, casa de emergencia, capilla o cementerio del HSM 42) se modelan con el mínimo de detalle de la regla 30 y se registran en `SCENE_MODELS`.
3. Colores y techos según las fotos de G1, como constantes con nombre (regla 30.5).
4. Cada edificio con su `era` desde el año de G1. La máquina del tiempo (Fase 3) los suma y los quita.
5. **Excepción declarada:** los animales y los instrumentos pueden seguir exagerados para que se vean, pero eso se dice en la etiqueta de la escena.

### G4. Puntos de interés y cámaras

- `worldPos` de cada punto en `Hotspots.tsx` se calcula desde `STATION_LAYOUT`. No hay más coordenadas sueltas.
- Las poses de cámara (`OVERVIEW_POSE_DESKTOP`, `OVERVIEW_POSE_MOBILE` y la `pose` de cada punto) se recalculan para la base nueva, que va a ser más grande. La vista general tiene que mostrar el istmo completo con las dos bahías.

### G5. Etiqueta honesta en la interfaz

- La etiqueta «Reconstrucción ilustrada» suma un texto de ayuda: «Posiciones y tamaños de los edificios según [fuentes]; animales e instrumentos agrandados para que se vean.» Va con enlace a «Fuentes».

### G6. Pruebas

- `orcadas-layout.test.ts` (de B8) sigue en verde: ninguna planta se interseca.
- Cada entrada de `STATION_LAYOUT` tiene `source` o está marcada como `[Fuente a definir]`, y en ese caso no se dibuja.
- Las distancias entre pares clave coinciden con la tabla de G1, con una tolerancia de 1 m. Por ejemplo, de Casa Omond a la orilla y de Casa Omond a Casa Moneta.
- `pnpm --filter @antartida/react-ui test` (`models.test.ts`) cubre los modelos nuevos.
- e2e: ningún punto de interés queda fuera de pantalla en la vista general a 1440 y 390 px.

**Verificación:** la base, más una captura cenital de la escena puesta al lado de la imagen satelital de referencia, adjuntas al PR para que quien revise compare.

---

## Fase 6 · Celular · Issue E

Va después de la Fase 5 porque los encuadres de cámara dependen de la base nueva. Medido en 390 × 844, 360 × 740 y 844 × 390, con un script de Playwright.

| Problema | Medida hoy | Objetivo |
|---|---|---|
| Ventana de lectura del panel | 308 px en 390 × 844, 263 px en 360 × 740, **109 px en horizontal** | ≥ 45 % de la pantalla, y la actividad entera a la vista |
| Contenido del panel | 880 a 1635 px: de 3 a 6 pantallas de scroll en esa ventana | ≤ 2 pantallas (Fase 4) |
| Botones de capítulo | 36 px de alto, con scroll horizontal; el capítulo actual queda cortado («Máqui») | ≥ 44 px; los 4 capítulos entran sin scroll en 360 px |
| Texto HTML chico | 11 a 11,5 px en «Fuente», números de capítulo, «Pendiente», márgenes y leyendas | ≥ 12 px |
| Texto en SVG | 8,5 a 9,5 px: meses de la rueda, años de la regla del tiempo, horas del arco del sol, ejes del gráfico | ≥ 11 px renderizado |
| Enlaces de fuentes | 20 px de alto | ≥ 44 px |
| Subtítulo del encabezado | Cortado («Un siglo mirando el …») | Se oculta en < 420 px o se reemplaza por la pregunta guía en una segunda línea |

### E1. Panel inferior con dos alturas

- Hoy `.orc-panel` tiene `max-height: 44dvh` fijo (`packages/core/src/styles/orcadas.css:350`).
- **Cambio:** dos alturas, «compacta» (45dvh) y «expandida» (85dvh). Se alterna con un botón visible arriba del panel (`aria-expanded`, texto «Ver más» o «Ver menos»), sin gestos de arrastre: no hace falta una librería y funciona con teclado.
- La altura vive en el estado de la UI de `OrcadasExpedition`, no en `core`, porque no es dominio.
- Prueba e2e: reemplazar «keeps mobile sheet within 45% height» (`orcadas.spec.ts:177`) por dos casos: compacto ≤ 46 % y expandido ≥ 80 %. Es un cambio de requisito: explicarlo en el PR.

### E2. Observación: instrumento y control juntos

- Hoy en 390 px no se ven a la vez el instrumento (lupa del termómetro, visor del barómetro) y el deslizador: hay que leer, bajar, mover y volver a subir. Y la escena de arriba muestra el abrigo 3D, que durante la lectura no aporta nada.
- **Cambio:** en la observación en celular el panel arranca expandido (E1). Los cuatro instrumentos pasan a un selector de 4 pasos en una fila (1 a 4, con check al anotar), con el instrumento de unos 220 px de alto y el control justo debajo, sin texto entre medio. La instrucción larga va en un `<details>` «Cómo se lee».
- Sumar un campo numérico (`<input type="number" inputmode="decimal">`) al lado del deslizador. Ya existe el búfer de teclado (`typeBufferRef` en `Observation.tsx`), pero en el celular no hay teclado físico, y mover un deslizador de 0,1 °C con el dedo es frustrante.

### E3. Horizontal (844 × 390)

- Hoy la ventana de lectura es de 109 px y el encabezado se come la escena: queda inusable.
- **Cambio:** media query `(orientation: landscape) and (max-height: 500px)` con el diseño de escritorio, es decir, panel lateral a la derecha de unos 46 % de ancho y alto completo, y los botones de capítulo compactos en una fila.
- Prueba e2e en 844 × 390: el título del capítulo y el botón principal se ven sin scroll.

### E4. Puntos de interés en la escena

- En 390 px, los seis rótulos siempre encendidos se pisan con los edificios. En el cierre, el punto del «Abrigo» se superpone a la etiqueta «Reconstrucción ilustrada».
- **Cambio en celular:** se muestra solo el punto (44 × 44 px de área táctil) y el rótulo aparece solo en el punto activo. En cada capítulo se resaltan los 1 o 2 puntos que importan y el resto baja de opacidad.
- La etiqueta «Reconstrucción ilustrada» va abajo a la izquierda de la escena, por encima del borde del panel, igual que en escritorio.

### E5. Encuadres de cámara en celular

- `mobilePose()` (`Hotspots.tsx`) aleja la cámara 1,9 veces y la apunta más abajo. Hoy en la vista general sobra piso gris, y en el cierre la bandera queda cortada bajo el encabezado.
- **Cambio:** con la base nueva de la Fase 5, revisar `OVERVIEW_POSE_MOBILE` y la pose del cierre en 390 y 360 px con el panel compacto y con el expandido. Con el panel expandido, la escena queda como una franja: encuadrar solo el objeto del capítulo.

### E6. Prueba en celular físico

- Abrir el `dist/` (`pnpm build`, después `pnpm preview --host`) desde un celular de gama media en la misma red Wi-Fi.
- Grabar la pantalla de un recorrido completo. Si la escena baja de unos 30 cuadros por segundo (más probable con el terreno ampliado de la Fase 5), en celular bajar los segmentos del terreno, apagar el cielo animado (`stationSky.glsl.ts`) y las partículas de nieve.

**Verificación:** la base, más e2e en 360 × 740 y 844 × 390. Agregar esos tamaños a `packages/e2e/playwright.config.ts` solo para las pruebas de Orcadas, para no duplicar el tiempo de toda la suite.

---

## Fase 7 · Pulido visual · Issue F

Orden por impacto. Capturas en el tablero «4 · UI y gráficos» del lienzo.

### F1. Pingüinera

- Hoy `generatePenguinColony` (`stationModels.ts:1107`) arma a propósito una fila de 12 pingüinos «en marcha» y 4 deslizándose sobre nieve. Se lee como una cola, no como una colonia, y la ficha dice «laderas rocosas».
- **Cambio:**
  1. La colonia va en la ladera que ubicó la Fase 5, sobre un parche de piedra: cajas gris oscuro sin nieve, con un color de guano rosado-marrón como constante con nombre (regla 30.5).
  2. Dos o tres grupos de 5 a 8 pingüinos, con rotación y una variación chica de altura al azar con la semilla actual. Alguno acostado y 2 o 3 caminando hacia el agua.
  3. Menos pingüinos: el total baja de 16 a unos 14.
  4. Exagerar la marca de especie: la línea negra del barbijo más gruesa y el anillo blanco del ojo del adelia más visible, en `buildStandingPenguinBoxes`.
  5. El punto `colony` cae sobre los pingüinos, no sobre un edificio (sale de `STATION_LAYOUT`, G4).
- **Prueba:** `pnpm --filter @antartida/react-ui test` (`models.test.ts`, mínimo de cajas y colores) y una prueba nueva de que ningún par de pingüinos se superpone.

### F2. Hielo marino coherente con el mes

- Hoy `generateSeaIcePlates` (`stationModels.ts:1035`) genera placas cuadradas en grilla, y se ven como baldosas. En julio el panel dice «bahía cerrada», pero al fondo sigue el agua abierta con témpanos.
- **Cambio:** placas de tamaños variados, rotación al azar y canales irregulares. Con `seaIce === 1`, que cubran toda el agua visible desde las poses de cámara, o que el texto aclare qué bahía se cierra. Los témpanos quedan quietos y medio enterrados cuando la bahía está cerrada.
- **El bote:** se esconde cuando `seaIce > 0.5`, o se pone en la costa, no sobre el hielo.

### F3. Tira de meses en lugar de la rueda

- Hoy `YearWheel` pone tres anillos, una leyenda y doce meses en unos 130 px. En celular los rótulos miden unos 6 px y el mes queda cortado («Noviembr»).
- **Cambio:** componente `MonthStrip` con 12 botones (`aria-pressed`), cada uno con una barra de horas de luz (del cálculo que ya existe en `timeMath.ts`) y una franja de hielo (simulación). Va fijo sobre la escena y funciona en todos los capítulos. Las flechas del teclado mueven el mes. Hay un boceto que se puede tocar en el tablero 4 del lienzo.
- Mantener el arco del sol (`SunArc.tsx`), que funciona, y separar el rótulo «Horizonte 0°» de la curva. Se muestra dentro de un «Saber más» de la tira.

### F4. Instrumentos

- **Barómetro** (`Barometer.tsx`): «TEMPESTAD» y «CALMA» (líneas 165 y 171) se pisan con 950 y 1050. El visor muestra `{hpa}h` (línea 297): tiene que decir «hPa» o solo el número. El dial va de 950 a 1050 y el deslizador de 960 a 1030: unificar el rango.
- **Viento** (`WindMast.tsx`): el contador muestra `{v}k` (línea 334), que se lee «40k» y queda cortado. La veleta escribe «rumbo NE» como texto, que es justo lo que habría que leer en el dibujo. El rumbo no se anota: o se suma como quinta lectura, o la veleta se queda como contexto sin rótulo.
- **Nubes** (`CloudPicker.tsx`): los círculos de nubes se superponen entre sectores y no se puede contar qué octava está cubierta. Una nube por sector, recortada a su sector (`clipPath` por octava).
- En los cuatro: textos de SVG de al menos 11 px renderizados en 360 px (Fase 6).

### F5. Gráfico del siglo

- Jerarquía: la serie anual en gris fino, la media móvil más gruesa en azul y la tendencia en dos tramos (C1).
- Sacar las franjas rayadas de «año incompleto»: alcanza con cortar la línea en los huecos y decirlo en la leyenda.
- Etiquetas de los ejes de al menos 11 px.

### F6. Glaciar y terreno

- El glaciar es una cuña gris lisa con rayas en abanico, y del lado derecho cierra como una pared. En bloques: escalones de cajas blancas y celestes con una grieta azul, ubicados donde indique la Fase 5.
- El istmo es una losa vacía: sumar piedras sueltas, manchones de nieve y los senderos entre edificios que se vean en las imágenes de la Fase 5.

### F7. Bandera

- La tela usa su propio `ShaderMaterial` que ondea (`flagMat` en `StationScene.tsx`), y la regla 30 pide cajas con `vehicleMaterial`. Opción A: animar en `useFrame` los 5 segmentos de cajas que ya arma `buildFlagSegmentGeometries`, sin shader. Opción B: dejarla y anotarla como excepción en `docs/diseno/estilo-voxel.md`. Decidilo con el equipo, porque la regla es compartida.

**Verificación:** la base, más capturas antes y después de F1 a F6 en 1440 y 390 px, adjuntas al PR.

---

## Fase 8 · Cierre · sin issue nuevo

1. `docs/decisiones.md`: anotar el paso a 4 capítulos, la tira de meses, el candado quitado, la tendencia en dos tramos y la disposición real de la base, con el porqué de cada uno.
2. `README.md`: actualizar la sección de Orcadas (recorrido, qué es dato real, qué es simulación y qué es reconstrucción) y la declaración de uso de IA (esta revisión y el plan fueron asistidos por IA).
3. `docs/orcadas-fuentes.md` y `docs/orcadas-emplazamiento.md` al día.
4. Suite completa: `pnpm test`, `pnpm typecheck`, `pnpm build` y `pnpm e2e -- --trace off`.
5. Ensayo del recorrido para el video: llegar, una lectura, viajar a 1903 y a hoy, y responder.

---

## Si hay que recortar

Orden de prioridad, de lo que nunca se recorta a lo que se recorta primero:

1. Fase 1 (bugs) y Fase 2 (rigor): nunca se recortan.
2. Fase 3 (recorrido de 4 capítulos) y Fase 5 (disposición real): son las que más puntaje suman.
3. Fase 4 (fichas) y Fase 6 (celular).
4. Fase 7: si falta tiempo, quedarse con F1, F3 y F4.

## Fuera de alcance

- Partir `StationScene.tsx` (1364 líneas) o reescribir el shader del cielo (554 líneas) más allá de lo que piden las fases 5 y 7. Funcionan, y tocarlos es riesgo sin puntaje.
- Sumar instrumentos, capítulos o animaciones nuevas.
- Restaurar o rehacer Fósiles sin decisión del equipo (Fase 0, punto 2).
- Gestos de arrastre en el panel o librerías nuevas (regla 06.4: no agregar dependencias sin justificación).
- Incrustar en la app imágenes satelitales o fotos cuya licencia no lo permita.

## Checklist final

- [x] B1 a B8 con prueba en verde.
- [ ] Ningún dato real sin fuente verificada; fuentes nuevas abiertas y comprobadas.
- [ ] Disposición de la base respaldada por `docs/orcadas-emplazamiento.md`; ninguna planta se interseca; elementos sin fuente fuera de la escena.
- [x] 4 capítulos, pregunta guía en Llegar y respondida en Responder.
- [ ] Como mucho 2 fichas a la vista por capítulo; una sola capa flotante por vez.
- [ ] Celular: botones de 44 px o más, texto de 12 px o más (11 px en SVG), horizontal usable, instrumento y control a la vista juntos.
- [ ] Pingüinera en grupos sobre piedra; hielo coherente con el mes.
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm build` y `pnpm e2e` en verde.
- [ ] README, `docs/decisiones.md`, `docs/orcadas-fuentes.md` y `docs/orcadas-emplazamiento.md` al día.
- [ ] Probado en un celular físico.
