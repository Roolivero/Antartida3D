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


## Benchmark

- Lighthouse, peso, pan y pinch corren en Chromium headless sin GPU. Las cifras de frames e interacción sirven para comparar las apps entre sí, no como valores absolutos de un teléfono real.
- El zoom se mide aparte con la GPU real (`scripts/bench/src/gpu.ts`, flags de ANGLE), sumando las tareas del proceso de GPU en una traza. Sin GPU disponible, Chromium cae a SwiftShader y los números no son comparables.
- **JS inicial** = scripts del HTML (y `component-url`/`renderer-url` de las islas de Astro), más todo lo que importan estáticamente y los scripts inline. Los `import()` diferidos no cuentan.
- Las capturas se toman con `prefers-reduced-motion: reduce` para que no dependan del momento exacto de una animación.
