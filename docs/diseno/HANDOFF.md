# Antártida por descubrir — handoff de diseño

Prototipo de referencia: `design/Main.dc.html`. Es la fuente de verdad visual y de comportamiento, pero **no se usa tal cual**: está escrito en un formato de canvas de diseño (Design Component) que depende de un runtime propio (`support.js`) que no viene incluido. La tarea es reimplementarlo con el stack de abajo, respetando look, textos, datos y comportamiento.

## Cómo leer `Main.dc.html`

| En el prototipo | Equivale a |
|---|---|
| `<x-dc>…</x-dc>` | El JSX/markup del componente raíz |
| `<helmet><style>` | CSS global (clases, keyframes, media queries) |
| `{{nombre}}` | Valor que devuelve `renderVals()` |
| `<sc-if value="{{x}}">` | Render condicional (`{x && …}`) |
| `<sc-for list="{{xs}}" as="it">` | `xs.map(it => …)` |
| `onClick="{{fn}}"` | Handler devuelto por `renderVals()` |
| `class Component extends DCLogic` | Componente con `state`/`setState` estilo React de clase |
| `this.props.accent` | Color de acento configurable (default `#C0862F`) |

Toda la lógica (proyección, clustering, pan/zoom, excavación, pasos) está en el `<script type="text/x-dc">` al final. Las constantes `PTS`, `EV`, `OPTS`, `KNOW` son el contenido.

## Stack propuesto

- **Astro** como shell (página estática, SEO, deploy simple).
- **Una isla interactiva** (`client:load`) con **React + TypeScript** para mapa + expedición. Alternativa más liviana: Preact con `preact/compat` (mismo código, ~10 kB menos) o Svelte si el equipo prefiere.
- **CSS**: Tailwind para layout y espaciado; el CSS "pintado" (filtros SVG, keyframes, marcadores) va en un CSS propio porque es muy específico. Los tokens van como variables CSS.
- **Sin librerías de mapas ni 3D.** SVG + CSS transforms, igual que el prototipo.
- **Natural Earth**: proyectar en build time con `d3-geo` (`geoStereographic().rotate([0, 90]).` con Greenwich arriba) y emitir un `path` SVG estático. `d3-geo` no se envía al cliente.

## Estructura sugerida

```
src/
  pages/index.astro
  components/
    AntarcticaApp.tsx        // estado global: screen, explored, transición
    map/
      MapView.tsx            // viewport, pan/zoom/pinch, teclado
      MapLayer.tsx           // SVG del continente (estático)
      Markers.tsx            // clustering + marcadores HTML
      PointSheet.tsx         // ficha B/C
      ListView.tsx           // "Ver como lista"
      Legend.tsx
      ExplorationLog.tsx     // registro 0/1
    expedition/
      Expedition.tsx         // pasos 1-5
      Scene.tsx              // capas con parallax
      DigSite.tsx            // excavación
      EvidenceCard.tsx
      Compare.tsx
      Reconstruction.tsx
      KnowledgePanel.tsx     // Explorar / Descubrir / Profundizar
    ui/Chip.tsx              // Dato real / Simulación educativa / Reconstrucción artística
    svg/Filters.tsx          // <defs> compartidos
  content/
    points.ts                // PTS
    fossils.ts               // EV, OPTS, KNOW
  lib/
    projection.ts            // lon/lat -> coordenadas 0..1000
    clustering.ts
    useReducedMotion.ts
scripts/
  build-coastline.ts         // Natural Earth -> path SVG
```

El contenido va separado del código para que el equipo pueda reemplazar los textos provisionales sin tocar componentes. Si después crece, se puede pasar a Astro Content Collections.

## Tokens

```css
--paper: #F3EBDD;    /* fondo papel */
--ink: #1F2A36;      /* tinta, texto */
--deep: #1E3E5C;     /* océano profundo, botón primario */
--glacier: #7FA8C4;  /* azul glaciar */
--ice: #F7FAFB;      /* blanco hielo */
--ocre: #C0862F;     /* acento: punto activo, progreso */
--oxide: #A4471F;    /* ruta, pines de evidencia */
--pencil: #5E656C;   /* puntos "Próximamente" (pasa 4.5:1 sobre papel) */
```

Tipografías (Google Fonts): **Fraunces** (títulos), **Atkinson Hyperlegible** (cuerpo), **Caveat** (solo anotaciones cortas).

Textura: filtros SVG en `Main.dc.html` → `#wc`, `#wcs`, `#ink`, `#bleed` (feTurbulence + feDisplacementMap) y `#paperf`, `#fibers` (ruido de papel). Copiarlos tal cual.

## Comportamiento

### Mapa
- Coordenadas en un espacio 0..1000. Proyección estereográfica polar: `r = 1590 · tan((90 − |lat|)/2)`, `x = 500 + r·sin(lon)`, `y = 500 − r·cos(lon)`. Greenwich arriba, Península arriba a la izquierda.
- Capa del mapa con `transform: translate() scale(k)`, `k` entre 1 y 5. Pan con arrastre (umbral 6 px para no confundir con tap), pinch con dos punteros, rueda, botones +/−/reset, flechas y +/− con foco en el mapa.
- Los marcadores son **botones HTML** en una capa encima (no dentro del SVG), con posición calculada en px para que no escalen con el zoom. Área táctil 48 px.
- Clustering greedy por distancia **en pantalla** (< 46 px). El grupo muestra un contador; si contiene el punto activo, borde ocre. Tocarlo acerca hasta que se separen.
- Las etiquetas están cerradas de entrada (#54). Se muestran al pasar el cursor, con el foco del teclado o con el primer toque en celular; el segundo toque abre. Detalle en `docs/decisiones.md`, «Carteles del mapa cerrados».
- A abre la expedición. B/C abren una ficha (título, lugar, pregunta provisional, etiqueta). En celular, recién con el segundo toque.
- "Ver como lista" muestra los tres grupos con encabezados reales y botones; no depende del mapa.

### Transición (1,5 s)
1. La capa del mapa hace zoom a Marambio (`k = 3.4`) con transición CSS.
2. El escenario se inclina (`perspective: 900px` en el padre, `rotateX` hasta 48°) y funde a papel.
3. Al terminar se monta la expedición con fade-in.
- Con `prefers-reduced-motion: reduce`: solo el fundido (~0,5 s), sin pulso ni parallax.

### Expedición
1. **Pregunta:** "¿Cómo era la Antártida antes del hielo?"
2. **Excavación:** tres zonas sobre la roca. Cada una necesita 4 pasadas (tap o arrastre; hit-test por coordenadas sobre el contenedor, no por elemento, para que el arrastre táctil funcione). El sedimento baja de opacidad con cada pasada. Con teclado, cada zona es un botón (una pasada por Enter). Al completar una zona se abre su tarjeta de evidencia.
3. **Comparar:** las 3 tarjetas (scroll horizontal en mobile, grilla de 3 en escritorio) y tres hipótesis. Ninguna se marca como correcta hasta tener el hallazgo real.
4. **Conclusión:** ilustración con pines A/B/C y tres bloques: Evidencia, Interpretación, Reconstrucción artística.
5. **Regreso:** al volver, `explored = true`, el punto muestra un check y el registro pasa a 1/1, con un aviso `role="status"`.
- Panel "Saber más": no modal, no corta el recorrido, tres niveles por paso (`KNOW[paso][nivel]`).
- El botón "Mapa" del encabezado vuelve sin completar.

### Accesibilidad
- Fichas, lista y tarjeta: `role="dialog"`, foco al primer botón al abrir, Escape para cerrar, y devolver el foco al disparador (esto falta en el prototipo).
- Contraste mínimo 4.5:1 en texto. El ocre nunca se usa como color de texto sobre papel.
- Los chips de tipo de contenido usan además forma y borde (sólido, celeste, punteado), no solo color.

## Contenido

Todo lo científico es provisional y está marcado como `[Contenido provisional]` / `[Fuente a definir]`. No hay que inventar especies, fechas ni citas. Chips obligatorios: **Dato real**, **Simulación educativa**, **Reconstrucción artística**.

## Pendientes conocidos del prototipo

- Silueta de costa aproximada: reemplazar por Natural Earth (`ne_50m_land` o `ne_10m_antarctic_ice_shelves_polys`).
- Devolver el foco al cerrar diálogos.
- Persistir `explored` en `localStorage` (envuelto en try/catch).
- Las etiquetas de la Península pueden pisarse con zoom alto: evaluar colisión simple.
- Probar el rendimiento de los filtros SVG durante el pan en mobile de gama baja; si hace falta, rasterizar el continente a una imagen al terminar el build.

## Criterios de aceptación

- Funciona a 390 px y en escritorio, sin scroll horizontal.
- Se puede recorrer completo solo con teclado.
- Lighthouse: Accesibilidad ≥ 95, y JS de la isla < 80 kB gzip.
- Tests: proyección (puntos conocidos), clustering (umbral y separación por zoom) y flujo de pasos (de 1 a 5, registro 1/1).
