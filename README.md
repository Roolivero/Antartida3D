# Antártida por descubrir

Equipo **DOT ENV**, hackatón SoberaníaTech (Ushuaia, 2026), Eje 2: Antártida, Ciencia y Conocimiento Abierto.

*Antártida por descubrir* es una plataforma interactiva orientada a la divulgación y educación sobre el continente antártico, combinando cartografía interactiva y expediciones guiadas.

## Integrantes

- `[completar]`

## Aplicaciones a comparar

El repositorio contiene dos enfoques en `apps/` para evaluar y seleccionar la base definitiva:

- **`apps/dibujado`** (puerto 5103): mapa dibujado estilo acuarela con relieve (2D y 3D) y expediciones interactivas en Marambio («¿Cómo era la Antártida antes del hielo?») y Estación Orcadas («¿Cómo es pasar un invierno entero en Orcadas?»). Máxima optimización de interacción, foco en accesibilidad completa por teclado y zoom fluido.
- **`apps/atlas`** (puerto 5175): prototipo exploratorio de atlas 3D con 5 propuestas temáticas, filtros por Naturaleza e Historias, vista 2D/3D y paneles informativos accesibles.

### Cómo descartar una app

El monorepo está estructurado de manera que para quedarse con una sola aplicación alcanza con:
1. Eliminar la carpeta no elegida (`apps/atlas` o `apps/dibujado`).
2. Remover el script de arranque correspondiente (`dev:atlas` o `dev`) del `package.json` raíz.

## Estructura del repositorio

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
│  ├─ datos-relieve.md  origen y archivos de los datos de relieve 3D (Bedmap3)
│  ├─ rendimiento.md    + rendimiento/ (results.json, capturas/)
│  └─ capturas/atlas/   capturas del atlas
├─ .agents/ .claude/ .githooks/
├─ AGENTS.md  ROADMAP.md  README.md  .gitignore
```

## Requisitos y uso

Requiere **Node.js >= 22** y **pnpm 11**. Para los tests E2E y el benchmark se requiere Chromium (`/usr/bin/chromium` o configurado mediante la variable `CHROMIUM_PATH`).

```sh
pnpm install

# Servidores de desarrollo
pnpm dev             # apps/dibujado en http://localhost:5103
pnpm dev:atlas       # apps/atlas en http://localhost:5175

# Build y preview
pnpm build           # compila todas las aplicaciones
pnpm preview         # vista previa de apps/dibujado

# Verificación
pnpm test            # tests unitarios de core y atlas
pnpm typecheck       # validación de tipos TypeScript
pnpm e2e             # tests de flujo e2e en apps/dibujado (Playwright)
pnpm --filter @antartida/atlas test:ui   # tests de interfaz de apps/atlas
pnpm bench           # benchmark de rendimiento
```

## Fuentes y licencias

- **Relieve Bedmap3 (apps/dibujado):** British Antarctic Survey (UK Polar Data Centre). Dataset de superficie y máscaras a 500 m en EPSG:3031, licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Detalle de archivos, transformación y cita en [`docs/datos-relieve.md`](docs/datos-relieve.md).
  - Organismo: UK Polar Data Centre, British Antarctic Survey.
  - Dataset DOI: [https://doi.org/10.5285/2d0e4791-8e20-46a3-80e4-f5f6716025d2](https://doi.org/10.5285/2d0e4791-8e20-46a3-80e4-f5f6716025d2).
  - Publicación científica: Pritchard et al. 2025, *Sci Data* 12:414, [https://doi.org/10.1038/s41597-025-04672-y](https://doi.org/10.1038/s41597-025-04672-y).
  - Repositorio RAMADDA: [http://ramadda.data.bas.ac.uk/repository/entry/show?entryid=2d0e4791-8e20-46a3-80e4-f5f6716025d2](http://ramadda.data.bas.ac.uk/repository/entry/show?entryid=2d0e4791-8e20-46a3-80e4-f5f6716025d2).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Relieve de Tierra del Fuego, Patagonia sur y Malvinas, IBCSO v2 (apps/dibujado):** Dorschel, B. et al. (2022), *The International Bathymetric Chart of the Southern Ocean Version 2 (IBCSO v2)*, SCAR / Alfred Wegener Institute, publicado en PANGAEA. Grilla de 500 m al sur de 50° S, licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Detalle en [`docs/datos-relieve.md`](docs/datos-relieve.md).
  - Dataset DOI: [https://doi.org/10.1594/PANGAEA.937574](https://doi.org/10.1594/PANGAEA.937574).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Batimetría IBCSO v2 (apps/dibujado):** Scientific Committee on Antarctic Research (SCAR) / Alfred-Wegener-Institut. Grilla batimétrica de 500 m al sur de 50° S en EPSG:9354, licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  - Organismo: SCAR / Alfred Wegener Institute (PANGAEA).
  - Dataset DOI: [https://doi.org/10.1594/PANGAEA.937574](https://doi.org/10.1594/PANGAEA.937574).
  - Publicación científica: Dorschel, B. et al. (2022), *The International Bathymetric Chart of the Southern Ocean Version 2*, Scientific Data 9:275, [https://doi.org/10.1038/s41597-022-01366-7](https://doi.org/10.1038/s41597-022-01366-7).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Distribución de fauna marina y aves antárticas (apps/dibujado):**
  - Publicación científica: Clarke, A. et al. (2026), *A Twenty-Six Year Record of Marine Mammals and Birds in Marguerite Bay, Antarctic Peninsula*, Ecology and Evolution 16(3): e73317, [https://doi.org/10.1002/ece3.73317](https://doi.org/10.1002/ece3.73317). Licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  - Población y distribución de pingüino emperador: Fretwell, P.T. et al. (2012), *An Emperor Penguin Population Estimate: The First Global, Synoptic Survey of a Species from Space*, PLOS ONE 7(4): e33751, [https://doi.org/10.1371/journal.pone.0033751](https://doi.org/10.1371/journal.pone.0033751). Licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  - Especies marinas: NOAA Fisheries (National Oceanic and Atmospheric Administration), [https://www.fisheries.noaa.gov/species/](https://www.fisheries.noaa.gov/species/). Dominio público / agencia gubernamental de EE. UU.
  - Fecha de consulta: 11 de noviembre de 2026.
- **Rompehielos ARA Almirante Irízar y logística antártica (apps/dibujado):**
  - Organismo: Armada Argentina — Campaña Antártica de Verano (CAV).
  - Fuentes oficiales: [https://www.argentina.gob.ar/armada/antartida/campana-antartica](https://www.argentina.gob.ar/armada/antartida/campana-antartica) y [https://www.argentina.gob.ar/armada/antartida/fauna-y-flora](https://www.argentina.gob.ar/armada/antartida/fauna-y-flora).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Témpanos tabulares y barreras de hielo (apps/dibujado):**
  - Publicación científica: Marsh, O.J. et al. (2025), *Ocean tides trigger ice shelf rift growth and calving*, Nature Communications 16: 6697, [https://doi.org/10.1038/s41467-025-61796-w](https://doi.org/10.1038/s41467-025-61796-w). Licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  - National Snow and Ice Data Center (NSIDC), [https://nsidc.org/learn/parts-cryosphere/ice-shelves](https://nsidc.org/learn/parts-cryosphere/ice-shelves).
  - Fecha de consulta: 11 de noviembre de 2026.
- **Expedición Estación Orcadas (apps/dibujado):**
  - **Base Orcadas:** Cancillería Argentina · Dirección Nacional del Antártico. URL: [https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas). Fecha de consulta: 11 de noviembre de 2026.
  - **Bases permanentes:** Armada Argentina. URL: [https://www.argentina.gob.ar/armada/antartida/bases-permanentes](https://www.argentina.gob.ar/armada/antartida/bases-permanentes). Fecha de consulta: 11 de noviembre de 2026.
  - **READER: datos de superficie de Orcadas:** SCAR · British Antarctic Survey. URL: [https://legacy.bas.ac.uk/met/READER/surface/Orcadas.All.temperature.html](https://legacy.bas.ac.uk/met/READER/surface/Orcadas.All.temperature.html). Fecha de consulta: 11 de noviembre de 2026. Licencia: Open Government Licence v3.0. Atribución de los datos de temperatura: SCAR READER, British Antarctic Survey, Open Government Licence v3.0.
  - **Zazulie, Rusticucci y Solomon (2010):** Journal of Climate 23(1). URL: [https://doi.org/10.1175/2009JCLI3074.1](https://doi.org/10.1175/2009JCLI3074.1). Fecha de consulta: 11 de noviembre de 2026.
  - **OMM · OSCAR/Surface, estación 88968:** OMM. URL: [https://oscar.wmo.int/surface/#/search/station/stationReportDetails/12480](https://oscar.wmo.int/surface/#/search/station/stationReportDetails/12480). Fecha de consulta: 11 de noviembre de 2026.
  - Las fuentes pendientes de verificación están en [`docs/orcadas-fuentes.md`](docs/orcadas-fuentes.md) y sus datos no se muestran en la interfaz.
  - La serie de temperatura es dato real.
  - La observación del día y el hielo de la bahía por mes son simulaciones rotuladas.
  - El diorama de la estación es una reconstrucción ilustrada; las horas de luz son un cálculo astronómico.
- **Librerías 3D (apps/dibujado y react-ui):** Three.js (licencia MIT), React Three Fiber (licencia MIT), @react-three/drei (licencia MIT), @react-three/postprocessing (licencia MIT).
- **Costa y barreras de hielo:** [Natural Earth](https://www.naturalearthdata.com/) (`ne_50m_land`, `ne_50m_antarctic_ice_shelves_polys`), dominio público. [Términos de uso](https://www.naturalearthdata.com/about/terms-of-use/).
- **Base Orcadas (apps/atlas):** coordenadas de [Armada Argentina · bases permanentes](https://www.argentina.gob.ar/armada/antartida/bases-permanentes) e historia y ubicación de [Cancillería Argentina](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas).
- **Relieve de apps/atlas:** ilustrativo, generado por una función del prototipo. No son datos reales de elevación.
- **Tipografías:** Fraunces, Atkinson Hyperlegible, Caveat, DM Sans y Libre Caslon Display (todas bajo licencia SIL Open Font License 1.1 vía `@fontsource`).
- **Contenido científico:** provisional y en proceso de validación por el equipo (`[Contenido provisional]`, `[Fuente a definir]`).

## Declaración de uso de IA

En cumplimiento con las bases de la hackatón, se declara el uso de herramientas de inteligencia artificial en el desarrollo de los prototipos:

- **App dibujada:**
  > Como exigen las bases de la hackatón: se dibujo un boceto con todas las posibles ideas y luego **el diseño se generó con Claude Design** (prototipo en `docs/diseno/design/Main.dc.html`) y **el código de este repositorio se escribió con Claude Code**, con multiples revisiones del equipo.
- **App atlas:**
  > Interfaz y código de este prototipo desarrollados con Codex a partir de la revisión de los dos proyectos y del borrador provisto por el equipo.
- **Expedición Estación Orcadas:**
  > Planificación, arquitectura, revisión y verificación de fuentes con Claude Code (modelo Claude Fable 5.2); implementación delegada a agentes de Antigravity (Gemini 4 Argon y Gemini 3.8 Flash) bajo revisión; búsqueda inicial de fuentes con Gemini 3.8 Flash, con cada fuente publicada abierta y confirmada después por el orquestador (Claude Code); la confirmación humana de cada fuente se hace en la revisión del PR; ninguna imagen ni texto generado se presenta como dato.
