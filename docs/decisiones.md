# Decisiones y diferencias

Diferencias respecto del prototipo (`docs/diseno/design/Main.dc.html`) y entre stacks, y por qué.

> La app base es **dibujado**. El estado histórico del laboratorio se recupera con la etiqueta git `lab-comparacion`.

## Arquitectura del repo

El monorepo unifica las aplicaciones y paquetes en una sola estructura (S1):

```
/                       pnpm workspace (package.json, pnpm-workspace.yaml, pnpm-lock.yaml, tsconfig.base.json)
├─ apps/
│  ├─ dibujado/         app del mapa dibujado (2D pintado + 3D con relieve), puerto 5103
│  └─ atlas/            app del atlas, puerto 5175
├─ packages/
│  ├─ core/             core de la app dibujada (TypeScript puro)
│  ├─ react-ui/         componentes de interfaz
│  └─ e2e/              tests Playwright para apps/dibujado
├─ scripts/bench/       benchmark de rendimiento
├─ docs/
│  ├─ propuesta.pdf     documento original de propuesta
│  ├─ diseno/           especificación de diseño (HANDOFF.md y prototipo)
│  ├─ decisiones.md     registro de decisiones y diferencias
│  ├─ rendimiento.md    + rendimiento/ (results.json, capturas/)
│  └─ capturas/atlas/   capturas del atlas
├─ .agents/ .claude/ .githooks/
├─ AGENTS.md  ROADMAP.md  README.md  .gitignore
```

## Comunes a todas las apps

### Costa de Natural Earth

- Fuente: `ne_50m_land` y `ne_50m_antarctic_ice_shelves_polys` (Natural Earth, dominio público). `packages/core/scripts/build-coastline.ts` los descarga, los proyecta con `d3-geo` y genera `packages/core/src/coastline.ts`. `d3-geo` es solo dependencia de desarrollo y no llega al cliente.
- Proyección: `geoStereographic().rotate([0, 90]).scale(1590).translate([500, 500])`. El script verifica que coincida con la fórmula del handoff (`r = 1590 · tan((90 − |lat|)/2)`) en cinco puntos, y los tests comprueban que Marambio, Ushuaia y Orcadas caen donde los pone `PTS`.
- Simplificación Douglas-Peucker con tolerancia de 0,9 unidades de mapa (≈ 13 kB gzip entre continente, barreras de hielo y Sudamérica).
- Natural Earth parte la Antártida y la barrera de Ross sobre el antimeridiano. El script descarta la costura del continente y tapa la de la barrera con un trazo del mismo color (`ICE_SHELF_SEAM`).
- Se agregan las barreras de hielo (Ross, Ronne-Filchner, etc.) con un celeste más claro que el continente. El prototipo no las distinguía.
- La silueta de Sudamérica y las tres islas dibujadas a mano del prototipo se reemplazan por las reales.
- Con la costa real, algunas etiquetas decorativas quedaban sobre tierra o tapadas. Se movieron: «Pasaje de Drake» (62,384 → 50,404), «Mar de Weddell» (330,282 → 252,258) y «Antártida Occidental» (sube 20 unidades). También se acortó un trazo de glaciar que salía del continente.
- La ruta Ushuaia–Marambio del prototipo (`M36,318 C80,350 140,348 190,306`) arrancaba a ~46 km de Ushuaia, terminaba a ~67 km de Marambio y cruzaba tierra en ambos extremos (#20). Ahora se define una sola vez en `packages/core/src/route.ts` como puntos lon/lat proyectados con `project()`: Ushuaia → Canal Beagle al norte de Navarino → Cabo de Hornos → Pasaje de Drake → entre las islas Rey Jorge y Livingston → Estrecho de Bransfield → Estrecho Antártico → Marambio. El trazado es **ilustrativo** (no es la derrota real de ningún buque; no hay fuente pública) y está elegido para no cruzar tierra con esta costa simplificada. Única tolerancia: el puerto de Ushuaia cae ~0,27 unidades de mapa dentro de la costa de `ne_50m`, y el test admite tierra solo a menos de 0,5 unidades (~3,6 km) de Ushuaia. `routeAt(t)` da el punto a una fracción `t` del largo (velocidad constante) para animar un barco.
- Las capas del prototipo se separan en dos (ver «Zoom fluido» más abajo): la acuarela (halo `#bleed`, relleno `#wcs`, océano, graticulado) se hornea a imagen y el contorno se dibuja como vector sin el filtro `#ink`. El contorno pierde el temblor de tinta del prototipo y gana nitidez con zoom.
- **Ruta Ushuaia–Marambio retrazada sobre el relieve real (#4).** La ruta de #20 se había validado contra la costa simplificada del mapa 2D (Natural Earth). Con el relieve de IBCSO v2 en el 3D, el barco quedaba sobre la orilla de Navarino. Ahora los puntos siguen el agua real: Canal Beagle por el paso Mackinlay, norte de la isla Picton, este de la isla Nueva, este del Cabo de Hornos, estrecho Nelson en las Shetland del Sur y Estrecho Antártico. Sigue siendo una **ruta ilustrativa**, no la derrota real. En el mapa 2D la línea toca la costa dibujada del Beagle, porque esa costa simplificada cierra el canal. El paso Mackinlay (1,8 km de ancho) no se resuelve con la grilla de 500 m: el test lo tolera de forma explícita.
- **Registro de exploración por expedición (#4).** El registro pasó de un solo indicador (Fósiles) a una lista de expediciones completadas, para sumar «Desde Ushuaia». El valor guardado con el formato anterior se sigue leyendo.

### Peso y carga

- **El JS inicial de la referencia tiene que quedar por debajo de 80 kB gzip.** Con todo en un bundle, React superaba los 95 kB. La costa (`loadMapLand()`, ~13 kB gzip) y la expedición se cargan con `import()`: la costa al montar el mapa y la expedición al tocar Fósiles (se precarga durante la transición).
- **Sin Tailwind.** El handoff lo sugiere para el layout, pero el CSS del prototipo ya resuelve todo. Sumarlo a cinco apps solo agrega ruido al benchmark. El CSS está en `core/src/styles/` (`tokens.css`, `painted.css`, `fonts.css`).
- **Tipografías con `@fontsource`** (subconjunto latino, solo los pesos que se usan), para no depender de Google Fonts.
- **Acento fijo `#C0862F`.** La prop `accent` del prototipo es un control del canvas de diseño, no del producto.

### Zoom fluido (mapa horneado a imagen)

El zoom se trababa. Lo medimos con la GPU real de la máquina (Intel Arc, Chromium con ANGLE) y trazas del proceso de GPU, porque en headless sin GPU no se ve. Tres zooms animados con el botón + en dibujado a 1440 px:

| | Trabajo de GPU | Tarea más larga | Tareas > 16 ms |
|---|---|---|---|
| Antes | 1177 ms | 63 ms | 17 |
| Marcadores con `transform` | 457 ms | 58 ms | 6 |
| + acuarela horneada a WebP | 229 ms | 80 ms | 3 |
| + imagen nítida cargada en tiempo ocioso | **159 ms** | **19 ms** | **2** |

En mobile (390 px, DPR 3) no queda ninguna tarea de más de 16 ms. Las causas y los cambios:

1. **Marcadores animados con `left`/`top`.** Obligaban a repintar el overlay en cada frame del zoom (~60 % del costo). Ahora se mueven con `transform: translate3d()`, que compone la GPU sin repintar.
2. **Filtros SVG re-rasterizados.** `feTurbulence` y `feDisplacementMap` se recalculaban a la escala nueva en cada zoom. Toda la acuarela (`core/src/svg/paint.ts`) se hornea en el build a WebP de 768, 2048 y 4096 px (59, 172 y 560 kB) con `pnpm map-raster`, que usa Chromium. Encima queda una capa vectorial sin filtros (`land.ts`: contornos, ruta y textos) que se mantiene nítida con cualquier zoom. Era la alternativa que el handoff ya preveía («rasterizar el continente a una imagen»).
3. **Imagen nítida en el momento justo.** Cambiar a la imagen de 4096 px durante un zoom subía 64 MB de textura y producía un pico de ~80 ms. Ahora la primera pintura usa la de 768 px, precargada desde el HTML con `<link rel="preload" fetchpriority="high">`. La nítida se descarga y decodifica en tiempo ocioso (`loadHiResWhenIdle`): 2048 px en pantallas de menos de 820 px de ancho (menos memoria de GPU en celulares) y 4096 px en escritorio. Con `Save-Data` o conexión 2G/3G no se descarga.
4. **Rueda y trackpad.** El factor de zoom es proporcional al delta de la rueda (`wheelFactor`): el pellizco del trackpad deja de dar saltos de 18 %. Cada paso de una rueda de mouse se anima 180 ms. El listener es nativo y no pasivo, así que el pellizco del trackpad (ctrl+rueda) ya no hace zoom de toda la página.

Costos:

- La imagen base (59 kB) se descarga siempre, y la nítida (172 o 560 kB) en tiempo ocioso.
- **El LCP que informa Lighthouse sube** (en dibujado, de 1,2 s a ~2,1 s), y no porque el mapa tarde más. El mapa SVG no cuenta como candidato a LCP: antes Lighthouse medía el título, que llega antes, aunque el mapa apareciera recién al ejecutar el JS. Ahora la imagen del mapa sí cuenta y es el elemento más grande.
- (Archivado) En Astro la imagen se montaba recién en el cliente, porque durante el prerender las URLs de los assets se resolvían a rutas `file://`. Al quedar solo dibujado, la imagen vuelve a renderizarse desde el primer render.

### Correcciones al prototipo

- **Cepillado con puntero.** En el prototipo, `.ebody` (z-index 2) tapa la roca (`.dig`, z-index 1), y en navegadores reales el puntero nunca llega a la roca. Se agregó `.ebody{pointer-events:none}` y se lo devolvió (`auto`) a sus bloques de contenido.
- **Panel «Saber más» en mobile.** El bottom sheet tapaba el botón principal. Como el handoff pide que no corte el recorrido, en pantallas angostas se ubica por encima de la barra de acciones.
- **Escape cierra el panel** desde cualquier lugar de la expedición, no solo con el foco dentro. Si la tarjeta de evidencia está abierta, Escape cierra la tarjeta.
- **Foco.** Los diálogos (ficha, lista, tarjeta) devuelven el foco a su disparador al cerrarse. Si el disparador ya no existe, lo devuelven al mapa. Al cambiar de paso, el foco va al título del paso (o a la primera zona de excavación, o al botón final en el paso 5), así se puede recorrer todo con teclado.
- **Persistencia** de `explored` en `localStorage` con try/catch (`core/src/storage.ts`). Se lee después del primer render para no romper la hidratación de Astro.
- **Colisión de etiquetas** (`core/src/labels.ts`). Las etiquetas se ubican en orden. Cada una prueba su lado preferido y después el opuesto. Si no entra en ninguno, se oculta. La de la expedición disponible se muestra siempre.
- **Altura** `100dvh` además de `100vh`, para que las barras del navegador mobile no tapen los controles.
- **Favicon** SVG inline, para evitar el 404 que los tests cuentan como error de consola.

### Herramientas

- **TypeScript 6.0.3**, no 7.0. `svelte-check` 4.7.8 todavía pide TypeScript ^5 o ^6, y se usa la misma versión en todo el repo.
- **Un solo spec de Playwright** (`packages/e2e`) para todas las apps, con roles y textos del handoff como selectores. Además del flujo, falla ante cualquier error de consola (hidratación, excepciones, 404).

### Estilo de los modelos 3D (voxel de cajas)

Decisión del 11 nov 2026 (Lucas, a partir del trabajo de #4): **todo modelo 3D nuevo —animales, vehículos, edificios, instrumentos— se hace con el estilo voxel de cajas de la expedición «Desde Ushuaia»**, para que las expediciones se vean como una sola obra. Responde la pregunta abierta de `docs/expediciones/desde-ushuaia-diseno.md` («Estilo de la fauna»): todo lo vivo es voxel.

- Un modelo es una lista de cajas `[centroX, centroY, centroZ, tamañoX, tamañoY, tamañoZ, color]`. La proa o el hocico apunta a `+x`; `y` es arriba; una unidad es más o menos el largo del modelo.
- Las cajas se funden en una sola geometría con color por vértice y el sombreado ya pintado en las caras (`buildBoxGeometry` en `packages/react-ui/src/voyage/vehicles.ts`, de #4). Material: `MeshBasicMaterial({ vertexColors: true })`. Sin luces ni archivos `.glb`: una draw call por modelo.
- Colores planos y apagados, de la paleta de `voyage/sightingModels.ts`. Son aproximados: los modelos son ilustraciones, no retratos, y se rotulan como tales.
- El movimiento es por partes rígidas (alas que baten, cuerpo que se mece). Con movimiento reducido quedan quietos.
- El trazo de tinta lo pone `InkEffect`; se pierde cuando el monitor de rendimiento apaga el posprocesado.
- Hasta que #4 esté en `main`, otra rama que necesite `buildBoxGeometry` lleva una copia idéntica y la reemplaza por el import al hacer rebase.

Pendiente, con issue propio: la fauna y el Irízar de ambiente de #16 son láminas SVG (billboards), no voxel. Convertirlos queda fuera de #3 y #4.

## Por stack (laboratorio)

### dibujado

- Migrada de Preact a React 19.3.1 para compatibilidad con React Three Fiber 9 y Drei en la vista 3D (R3F no corre sobre `preact/compat`).
- Se eliminaron los alias a `preact/compat` y se adoptó `@vitejs/plugin-react`.


### Vista 3D (Relieve real de Bedmap3)

- **Tecnología:** React 19 + React Three Fiber 9 + Drei 10 + Three.js 0.187. `CameraControls` de drei proporciona órbita suave amortiguada, límites configurados al continente, transiciones animadas y eventos de reposo (`smoothTime = 0.25`).
- **Relieve Bedmap3:** Grillas raster de 500 m en EPSG:3031 descargadas de BAS (`bm3_surface.tif` y `bm3_masks.tif`).
- **Malla RTIN Martini:** Calculada en build a partir de grilla 2049² en dos niveles: `hi` para escritorio (168k vértices, 330k triángulos, error 40m) y `lo` para mobile < 820 px (56k vértices, 109k triángulos, error 155m). Triángulos íntegramente de océano son filtrados para ahorrar memoria y GPU.
- **Exageración vertical:** `VERTICAL_EXAGGERATION = 50` en `packages/core/src/relief.ts`, declarada en la leyenda. Con ×25 el domo de hielo casi no se leía. El mismo archivo define el sol fijo del noroeste y el intervalo de curvas.
- **Lectura del relieve:** luz rasante del noroeste con oclusión ambiental y sombras precalculadas (`terrain-light-2048.webp`), tinte por altura y hachures según la pendiente. La vista inicial encuadra el continente según la pantalla (`homePose3D`). Detalle en `docs/datos-relieve.md`.
- **Material dibujado:** Shader personalizado que combina:
  1. Color: acuarela horneada 2D mapeada con UVs del mapa, con lavado ocre en roca y celeste claro en barreras de hielo.
  2. Iluminación: sol fijo del noroeste con 3 bandas toon posterizadas y sombras suaves.
  3. Hachures: sombreado a trazos en pendientes pronunciadas con antialias.
  4. Curvas de nivel: cada 250 m en lápiz y cada 1000 m en tinta con atenuación y temblor.
  5. Grano de papel: textura `paper-512.webp` en espacio de pantalla.
- **Tinta:** Contornos de costa y barreras de hielo generados con `Line` sobre `heightAt + ε` con micro-jitter determinista.
- **Rendimiento medido (GPU real NVIDIA RTX 3070):** 0 tareas > 16 ms durante órbita y zoom con botones (9 ms de GPU) y rueda (152 ms de GPU, tarea máxima 3 ms).

### Bordes del mapa 3D, límites de zoom y gestos (#46, 12 nov)

Pedido de quien lleva el issue: los bordes del mapa se veían color crema y borrosos, y arrastrar tenía que mover el mapa.

- **Sin papel en los bordes:** se quitó la niebla hacia color papel de los cuatro materiales del mapa (terreno, mar, Tierra del Fuego y tierras lejanas) y el desvanecido radial del mar hacia papel. El mar se dibuja hasta donde llega la vista.
- **Resto del mundo:** las tierras de contexto pasan de 10° S a 60° N. Fuente, licencia y límites en `docs/datos-relieve.md`. La leyenda dice «Resto del mundo, hasta 60° N».
- **Tope de alejamiento:** la vista más lejana es la vista general (`homeDistance3D`, donde entra todo el continente: unas 785 unidades en escritorio y 2250 en celular). Antes era un valor fijo de 3600, y de lejos el mundo quedaba como un disco rodeado de papel. Se descartó un tope más cercano (470) porque el continente entero no entraba en pantalla.
- **Límites de cámara en `@antartida/core`:** `MAX_POLAR_DEG` (60°) y `PAN_LIMIT` (800) pasaron de `Map3DLayer.tsx` a `core/src/camera.ts`. Una prueba (`camera.test.ts`) calcula el punto más lejano que ve la cámara con esos límites y falla si queda más allá de las tierras dibujadas o del plano del mar. Quien cambie un límite tiene que extender los datos.
- **Gestos:** arrastrar con el botón izquierdo mueve el mapa sobre el suelo, igual que en 2D. El botón derecho gira e inclina. En pantalla táctil, un dedo mueve y dos dedos acercan y giran. Antes arrastrar giraba la cámara. La rueda y las teclas no cambian.
- **Gestos con dos dedos, como en una app de globo (12 nov, segunda vuelta):** pedido de quien lleva el issue. Reemplaza «dos dedos acercan y giran» de la línea anterior.
  - Un dedo mueve el mapa (sin cambios).
  - Separar o juntar los dedos (pellizco) acerca o aleja.
  - Girar los dedos gira la cámara: el mapa gira con los dedos, el mismo ángulo.
  - Arrastrar los dos dedos hacia arriba inclina la vista hacia el horizonte; hacia abajo la vuelve a poner desde arriba. Recorrer el 40 % del alto de la pantalla cubre todo el rango (`TILT_SCREEN_FRACTION`).
  - **Un modo por gesto:** cuando los dedos se movieron 10 px (`TWO_FINGER_START_PX`) el gesto elige entre «inclinar» y «acercar y girar», y lo mantiene hasta que se levanta un dedo. Así un pellizco no inclina por accidente. Acercar y girar sí van juntos.
  - **Interpretación:** el pedido decía «zoom si los movés horizontalmente». Se tomó como el pellizco habitual (separar o juntar los dedos, en cualquier dirección). Si se quería otra cosa, se ajusta en `pickMode`.
  - **Dónde está:** la regla del gesto, sin nada de pantalla, en `core/src/gestures.ts` (con pruebas). `Map3DLayer.tsx` la conecta a la cámara; la acción de dos dedos de la biblioteca queda apagada porque no distingue un giro de un arrastre.
  - **Computadora:** no cambia. Arrastrar con el botón izquierdo mueve, la rueda acerca, el botón derecho gira (horizontal) e inclina (vertical). El pellizco del panel táctil acerca.
  - **Arreglo de paso:** la biblioteca de cámara solo avisa que la cámara se detuvo si ve el último paso, muy chico, de un movimiento. Si el movimiento termina dentro de un cuadro, la cámara quedaba marcada como «en movimiento» para siempre: los marcadores no se reagrupaban y se seguían dibujando cuadros. Ahora, cuando la cámara deja de moverse, se da por detenida.
  - **Verificación:** prueba e2e con dos toques simulados (pellizco, giro y arrastre vertical) en el perfil de celular. No se probó en un teléfono real.
- **Acercamiento en Tierra del Fuego:** el mínimo baja de 8 a 3 unidades (`FUEGIA_MIN_DISTANCE`). Es un valor a ajustar con el uso. Límite conocido en `docs/datos-relieve.md`.
- **`project()` vale también al norte del ecuador:** antes tomaba el valor absoluto de la latitud y espejaba el norte sobre el sur. Al sur del ecuador da los mismos valores que antes.
- **Halo del título:** el halo crema detrás del título en la vista 3D no cambia. Sin él, el título oscuro no se lee sobre el mar.

### Océano 3D, fauna, batimetría y mejoras visuales (F5 a F8)

- **Costa 3D desde Bedmap3 (F8):** Se retiraron del 3D los vectores `ANTARCTICA_PATH` e `ICE_SHELVES_PATH` de Natural Earth. Como no coincidían con la elevación de Bedmap3, se cortaban en guiones discontinuos y cruzaban por dentro las barreras flotantes de Ross y Ronne. La costa 3D se extrae de la máscara de Bedmap3 (`masks > 0`) en el shader de terreno, logrando un trazo continuo y fiel al relieve real.
- **Recorte de agujas en montañas (F8):** La exageración vertical ×50 transformaba vértices individuales aislados en espinas en la Península y cordilleras. La función `clampTerrainSpikes` en `packages/core/src/relief.ts` y `build-terrain.ts` limita el desnivel a 35 m por celda contra la mediana vecina (radios 6, 4, 2 y 1), eliminando agujas artificiales sin reducir la altura de mesetas ni macizos montañosos.
- **Aspecto del hielo glaciar (F8):** Paleta blanca fría y azulada en lugar del tono crema del papel sobre el manto de hielo, tinte azul profundo en depresiones y sombras (emulando la absorción óptica de luz en hielo denso), paredes verticales de hielo azul con estratos en las barreras flotantes, textura suave de sastrugi visible con zoom cercano y brillo Fresnel sobre el hielo liso.
- **Batimetría real con IBCSO v2 (S3):** Grilla batimétrica de 500 m en proyección polar estereográfica EPSG:9354 al sur de 50° S. Al norte de 50° S, extensión y gradiente de 2° hacia la cuenca abisal de −4000 m. Texturas `ocean-bathy-2048.webp` y `1024.webp` (profundidad, normales de fondo y distancia a costa) y grilla compacta `ocean-depth-grid.bin` para consultas instantáneas en CPU.
- **Superficie marina y animación eficiente (S4 y S5):** Malla en `y = 0` con shader dibujado que combina acuarela, sombras submarinas, orilla con rompiente suave y dos capas de oleaje sutil (`ocean-waves-a/b-256.webp`). Reloj único de animación (`__seaTime`) a 30 fps con `invalidate()`; se detiene automáticamente en vista 2D, con la pestaña oculta (`document.hidden`) o con `prefers-reduced-motion: reduce`.
- **Fauna marina y témpanos representativos (S6):**
  - Se redujo a 16 instancias en escritorio y 8 en celulares (en vez de las 40 planteadas inicialmente en el borrador) a pedido de Lk el 11 nov, despejando la lectura cartográfica y asegurando rendimiento holgado en GPU.
  - Distribución determinista basada en zonas de presencia real documentadas en literatura científica marina, con validación batimétrica (`depthAt < -20 m`) y separación mínima estricta de >= 40 px en pantalla respecto de cualquier marcador `PTS` y sus etiquetas en `homePose3D` (1440 y 390 px).
  - Renderizado en una única llamada de dibujo (`InstancedMesh`) con atlas de texturas (`sea-atlas.webp`) y animación de vaivén y respiración en vertex shader sin costo de CPU.
- **Rompehielos ARA Almirante Irízar (S8):** Navega con trayecto de ida y vuelta con maniobra y estadía de amarre en puerto entre Ushuaia y Base Marambio (en vez de un bucle circular cerrado instantáneo), representando la Campaña Antártica de Verano.
- **Marcadores del mar (S7 y S9):** Muestran solo el icono circular en reposo para no saturar el mapa con texto; el nombre y lugar emergen en hover o foco de teclado con Tab. Al activarse abren la ficha temática con fuentes oficiales verificadas. Se apilan en z-index por debajo de paneles, controles y leyenda.


### Carteles del mapa cerrados (#54, 12-11-2026)

Pedido de quien lleva el issue: los carteles de los marcadores no están abiertos de entrada, para que dé curiosidad tocar el marcador.

- **Ningún cartel abierto de entrada**, ni en el relieve 3D ni en el mapa 2D. Vale para todos los marcadores: expediciones, ampliaciones previstas, próximamente y puntos del mar.
- **Celular (toque o lápiz):** el primer toque muestra el cartel del marcador. El segundo toque abre la expedición o la ficha. Tocar otro marcador muestra el cartel de ese otro. Tocar el mapa cierra el cartel.
- **Mouse:** pasar el cursor por encima muestra el cartel. Un clic abre.
- **Teclado:** el foco muestra el cartel. Enter abre.
- **Grupos de marcadores:** no cambian; un toque acerca.
- **Dónde está la regla:** `markerPress(shown, key, touch)` en `core/src/markers.ts`, con pruebas. La interfaz distingue el dedo del mouse por el `pointerType` del clic (`MarkerButton` en `react-ui/src/map/Markers.tsx`). El cartel mostrado se guarda en `MapView.tsx` y se marca con la clase `.mk.shown`.
- **Lado del cartel:** se abre a la derecha, salvo que ahí se salga de la pantalla y a la izquierda haya más lugar (`labelSide` en `core/src/labels.ts`). Se muestra uno solo por vez y por encima de todo, así que ya no hace falta evitar choques entre carteles: se quitó `placeLabels` y la constante `LABELS_MIN_PX`.
- **Marcador sobre un palito (relieve 3D, 12-11-2026):** pedido de quien lleva el issue #46. El círculo que se toca va 34 px por encima de su lugar, sobre un palito fino que termina justo en el punto del mapa. Así no tapa el modelo de bloques dibujado ahí (Ushuaia, Orcadas, el Irízar, los témpanos). Vale para todos los marcadores del 3D menos los grupos. En el mapa 2D no cambia: ahí no hay modelos. Solo el círculo recibe toques; el palito no. Es una regla de `painted.css` (`.m3d .ov .mk:not(.cluster)`), con el alto en la variable `--stick`.
- **Pruebas e2e:** entran a las expediciones con clic de mouse, así que siguen entrando con un clic. No se cambió ninguna.
- **Queda igual:** el texto que lee un lector de pantalla en cada marcador. Con un lector de pantalla en celular puede hacer falta activar dos veces; no se probó con uno real.
- **Reemplaza** lo que decía `docs/diseno/HANDOFF.md` sobre etiquetas siempre visibles y la nota «Marcadores del mar» de más arriba en lo que hace al toque en celular.


### Panel inferior que se agranda (`BottomSheet`, #46, 12-11-2026)

Pedido de quien lleva el issue: en el celular, el panel que sale desde abajo tiene una rayita arriba; al arrastrarla hacia arriba el panel se agranda para ver más información. Tiene que ser un componente reutilizable. Por ahora se usa solo en el selector de transporte de «Desde Ushuaia».

- **Componente:** `BottomSheet` en `packages/react-ui/src/BottomSheet.tsx`. Recibe las clases extra, el id del título, la referencia al panel, `onClose` (Escape) y el contenido. Dibuja el panel (`role="dialog"`) y el tirador. El fondo oscuro (`.scrim`) lo sigue poniendo quien lo usa.
- **Dos tamaños:** el chico es el `max-height` que el panel ya tenía en CSS (54 % en el selector). El grande es el 92 % del alto (`.sheet.grows.full`). Si el contenido es más corto, el panel no crece más que su contenido.
- **Cómo se usa el tirador:**
  - Arrastrar hacia arriba: el panel sigue al dedo. Al soltar, si se arrastró 40 px o más queda grande; si no, vuelve.
  - Arrastrar hacia abajo: lo mismo, hacia el tamaño chico.
  - Arrastrar hacia abajo desde el tamaño chico: el panel se cierra (llama a `onClose`). Pedido de quien lleva el issue. Desde el tamaño grande solo baja al chico, por más lejos que se arrastre.
  - Un toque en el tirador cambia de tamaño.
  - **Se arrastra desde cualquier parte del panel, no solo desde el tirador** (pedido de quien lleva el issue: al tirar hacia abajo fuera del tirador, el celular recargaba la página). Con el panel chico, el dedo lo arrastra hacia arriba o hacia abajo desde cualquier lugar; el texto no se desplaza en ese tamaño. Con el panel grande, el texto se desplaza normal; tirar hacia abajo cuando el texto está arriba de todo baja el panel.
  - Un arrastre que empieza sobre un botón no lo aprieta: es un arrastre, no un toque.
  - Teclado y lector de pantalla: el tirador es un botón con nombre («Agrandar el panel para ver más» / «Achicar el panel») y `aria-expanded`. Enter o Espacio cambian de tamaño.
- **Regla en `@antartida/core`:** `sheetAfterDrag(size, draggedUp, floor)` en `core/src/gestures.ts`, con pruebas. Orcadas usa `floor = 'peek'` (ver #61).
- **Por encima del título:** el panel grande tapa el título y el registro de exploración. Mientras está grande o se arrastra sube a `z-index: 21`; si no, el título quedaba encima y el tirador no recibía toques.
- **Sin recarga al tirar hacia abajo:** `html` y `body` llevan `overscroll-behavior: none` (`painted.css`). La app ocupa toda la pantalla y maneja sus propios gestos; vale para toda la app, no solo para el panel. El panel además lleva `overscroll-behavior: contain`.
- **Sin botón X en el selector de transporte** (pedido de quien lleva el issue): el panel se cierra arrastrándolo hacia abajo, con «Volver al mapa», con Escape o tocando el mapa. En pantallas anchas, donde no hay tirador, quedan «Volver al mapa», Escape y el clic fuera del panel.
- **Pantallas anchas:** el panel es una tarjeta en una esquina y el tirador no se muestra.
- **Movimiento reducido:** cambia de tamaño sin animación.
- **Para usarlo en otro panel:** reemplazar su `<section className="sheet ...">` por `<BottomSheet className="..." labelledBy="..." sheetRef={ref} onClose={...}>`. `PointSheet` y las fichas de los hitos siguen como estaban.
- **Verificación:** prueba e2e en el perfil de celular (`flow.spec.ts`): arrastre hacia arriba, hacia abajo y cierre con un toque simulado, desde el tirador y desde el cuerpo del panel, y Enter. La recarga al tirar hacia abajo no se puede probar con toques simulados: hay que confirmarla en un teléfono real.


### Expedición Orcadas: pulido (#53, 12 y 13-11-2026)

Plan: `.agents/plans/plan-orcadas-pulido.md`. Cada decisión la aprobó quien lleva el issue.

- **Cuatro capítulos (Llegar, Observar, Viajar, Responder):** antes eran seis y el recorrido se perdía. Todo gira alrededor de una pregunta guía: «¿Cuánto cambió el clima de la isla Laurie en 120 años?». Se pregunta en Llegar y se responde en Responder, con la lectura del usuario comparada con el mismo mes de cada año. Los nombres de los capítulos tienen una sola fuente, en `@antartida/core`.
- **Tira de meses en vez de la rueda del año:** la rueda ponía tres anillos y doce meses en 130 px, y en el celular los rótulos medían 6 px. La tira va fija sobre la escena y funciona en todos los capítulos. Cada mes tiene una barra con las horas de luz (cálculo) y una franja de hielo (simulación).
- **Sin candado entre capítulos:** se puede avanzar sin completar las lecturas, y el texto avisa cuántas faltan. Un candado frenaba a quien solo quería mirar.
- **Tendencia en dos tramos:** una sola recta de 1904 a 2025 escondía que el calentamiento empieza a mediados de siglo. Ahora hay dos tramos: 1904–1950, −0,02 °C por década, y 1951–2025, +0,13 °C por década. Es un cálculo propio de mínimos cuadrados. La significancia la da Zazulie, Rusticucci y Solomon (2010).
- **Escenario de frente en vez de plano real:** se probó dibujar la base con las posiciones de OpenStreetMap, a escala y comprimida, y en los dos casos se leía como un plano, con edificios tapados y mucho suelo vacío. Quedó un escenario con ocho elementos en fila: forma, color y techo reales, posiciones ilustrativas. No hay cementerio ni usina. La etiqueta de la escena lo declara. Detalle en `docs/orcadas-emplazamiento.md`.
- **Cámara fija:** al entrar se ve siempre la misma toma desde Bahía Scotia. Se puede girar 35° a cada lado y alejar hasta 1,2 veces la distancia de entrada, así nunca se ve dónde termina el escenario.
- **Pingüinera animada:** catorce pingüinos. Los residentes miran, se acicalan, hacen la exhibición y duermen. Los viajeros caminan, se tiran de panza, se sacuden, nadan y vuelven a la playa. Cada pose es una función pura del tiempo (`penguins.ts`), y hay pruebas de que no se superponen, no caminan sobre el agua, no atraviesan edificios y no saltan entre cuadros. Es una reconstrucción: ninguna fuente ubica la colonia.
- **Hielo marino con una sola regla:** el hielo crece desde la costa (`iceThreshold`). La usan las placas de cajas y el sombreador del agua, a través de un atributo con la distancia a la costa. Así las dos capas nunca se contradicen.
- **Bandera de cajas:** cinco segmentos encadenados que se mueven en `useFrame`. Ya no usa un sombreador propio, así cumple la regla del estilo voxel.

### Expedición Orcadas: recorrido guiado y menos carga de información (#61, 13-11-2026)

Plan: `.agents/plans/plan-orcadas-recorrido-guiado.md`. Objetivo: que la expedición se recorra como «Desde Ushuaia», guiada y sin muros de texto, y que en el celular se pueda hacer entera sin escribir números.

- **Paradas en vez de listas de fichas:** cada capítulo tiene de una a cuatro paradas (`ORCADAS_TOUR` en `@antartida/core`). Cada parada mueve la cámara a un punto de la base y muestra una sola frase de 120 caracteres como mucho, sacada de una ficha con fuente verificada; lo que la frase deja afuera queda en el «Saber más» de esa parada (`more` en `ORCADAS_TOUR`), que cambia con cada «Siguiente». La ficha propia de la parada entra ahí solo si la frase la resume; si la frase ya lo dice todo, «Saber más» no aparece, para no repetir lo mismo. Cada ficha de un capítulo con paradas va a una sola parada (prueba en `orcadas-tour.test.ts`), así que el «Saber más del capítulo» queda solo en Responder, que no tiene paradas. Antes cada panel mostraba hasta dos fichas abiertas y varias más plegadas, y se leía como un documento. Las fichas que no son paradas quedan en un solo «Saber más del capítulo», sin repetir las de las paradas. Una parada sin ficha publicable no se crea: la frase de Observar se tomó de la ficha del instrumental de 1903 porque la del abrigo que protegía al termómetro no tenía fuente.
- **Un botón para avanzar y uno para volver:** el botón principal dice «Siguiente» mientras quedan paradas y el nombre del capítulo siguiente en la última. «Atrás» recorre las paradas y después cambia de capítulo. Con dos pares de botones (tarjeta y barra) no quedaba claro cuál usar. Tocar un punto de la escena que es parada lleva a esa parada.
- **Viajar sin la regla del año:** el gráfico del siglo ya era un control del año (con puntero y teclado), así que la regla, la fila de eras, las píldoras y la tarjeta de era repetían lo mismo. Las paradas recorren 1903, 1927, 1951 y hoy, y cada una fija el año en el reducer; mover el año en el gráfico mueve la tarjeta a la parada que corresponde. La leyenda del gráfico va plegada.
- **Observar con una sola lectura obligatoria:** la temperatura se marca tocando o arrastrando la lupa del termómetro y se confirma con «Anotar lectura». El deslizador y la entrada numérica quedan en «Ajuste fino» para teclado y lector de pantalla. Presión, viento y nubes pasan a «Mirá también», opcionales. Cuatro lecturas con número eran demasiado para un celular y Responder solo usa la temperatura. `observationDone` pasa a ser «temperatura anotada».
- **Panel del celular arrastrable con tamaño mínimo:** el panel es el `BottomSheet` de #46, con un tercer tamaño, peek, que deja a la vista solo el nombre del capítulo y el botón principal. En Orcadas el panel nunca se cierra (`sheetAfterDrag(size, draggedUp, floor = 'peek')`), es una región y no un diálogo, y Escape no lo cierra. El selector de «Desde Ushuaia» sigue cerrándose al arrastrarlo hacia abajo. Reemplaza al botón «Ver más / Ver menos». Al cambiar de parada, un panel en peek vuelve a su tamaño chico para mostrar la frase nueva. Los puntos de la escena se recortan por el alto real del panel.
- **Tira de meses compacta en el celular:** un chip con el mes, su barra de luz y su franja de hielo; al tocarlo se despliega la tira completa. Libera unos 100 px de escena. El celular horizontal (844x390) también usa el chip: ahí la tira completa tapaba un tercio de la escena y escondía la bandera y el mástil. La tira completa queda solo en escritorio. En horizontal la cámara entra más cerca (`OVERVIEW_POSE_LANDSCAPE`) para que no se encimen dos puntos, los puntos no pasan bajo el panel lateral y Fuentes ocupa el lugar del panel.
- **Lista de lo hecho al final:** Responder muestra, como el cuaderno de avistajes de «Desde Ushuaia», qué se completó: paradas de Llegar vistas, temperatura anotada, lecturas opcionales y épocas visitadas en Viajar (`orcadasProgress` en `@antartida/core`, con `seenStops` en el estado). Lo hecho va lleno y lo que faltó, punteado; las lecturas opcionales nunca cuentan como falta.
- **Bote Zodiac varado, sin muelle:** la ficha de Orcadas de COMNAP (Antarctic Station Catalogue, 2017) dice «Ship landing facilities: None», «Two Zodiac boats with outboard motors» y «Beaches suitable for landing small boats». El bote de madera a remo amarrado a una bita no era fiel: ahora es un Zodiac con motor fuera de borda que, con la bahía abierta, entra desde el agua con estela y queda varado con la proa en la playa (unos 6 s, sin animación con movimiento reducido); con la bahía helada descansa en la costa sobre tacos. El Zodiac tiene su propio punto de interés con esa ficha («Cómo se llega»: buque o helicóptero, unas 25 visitas de buques por año entre noviembre y marzo); la bahía vuelve a mostrar la del deshielo. Los colores del Zodiac son ilustrativos.
- **Camino de ripio continuo:** el camino era una fila de baldosas sueltas con huecos, y en pendiente se hundían porque tomaban la altura solo del centro. Ahora son tramos cortos que se solapan y siguen la curva; cada uno cubre desde la esquina más baja hasta la más alta del terreno, con grano y piedras sueltas en los bordes. Las fotos muestran ripio gris, no baldosas.
- **Bandera con un solo sol:** el Sol de Mayo estaba partido entre dos franjas de la tela, que ondean por separado, y se veían dos. Ahora va entero en la franja del medio.
- **La calidad vuelve sola:** al tapar la ventana con otra, el navegador frena los cuadros, el monitor de rendimiento bajaba la resolución (dpr 0,7) y no la subía nunca, porque en calidad baja el tope de 30 fps quedaba bajo el umbral de subida. Ahora los umbrales dependen de la calidad (como en el mapa 3D, `performanceBounds`), se mide de nuevo al volver a la ventana y, si el navegador descarta el contexto WebGL, se esperan 4 s a que lo devuelva antes de pasar al dibujo 2D.
- **Menos rótulos repetidos:** el título de Llegar es la pregunta guía (antes repetía «Estación Orcadas» de la barra superior), Responder usa la toma general al atardecer, la bitácora queda en una línea y los números se muestran con coma decimal.

## Benchmark

- Lighthouse, peso, pan y pinch corren en Chromium headless sin GPU. Las cifras de frames e interacción sirven para comparar las apps entre sí, no como valores absolutos de un teléfono real.
- El zoom se mide aparte con la GPU real (`scripts/bench/src/gpu.ts`, flags de ANGLE), sumando las tareas del proceso de GPU en una traza. Sin GPU disponible, Chromium cae a SwiftShader y los números no son comparables.
- **JS inicial** = scripts del HTML (y `component-url`/`renderer-url` de las islas de Astro), más todo lo que importan estáticamente y los scripts inline. Los `import()` diferidos no cuentan.
- Las capturas se toman con `prefers-reduced-motion: reduce` para que no dependan del momento exacto de una animación.
