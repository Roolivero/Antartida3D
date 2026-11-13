# Antártida por descubrir

Equipo **DOT ENV**, hackatón SoberaníaTech (Ushuaia, 2026), Eje 2: Antártida, Ciencia y Conocimiento Abierto.

*Antártida por descubrir* es una plataforma interactiva orientada a la divulgación y educación sobre el continente antártico, combinando cartografía interactiva y expediciones guiadas.

## Integrantes

- `[completar]`

## Aplicación

**`apps/dibujado`** (puerto 5103): mapa dibujado estilo acuarela con relieve (2D y 3D) y expediciones interactivas en Marambio («¿Cómo era la Antártida antes del hielo?») y Estación Orcadas («¿Cuánto cambió el clima de la isla Laurie en 120 años?»). Máxima optimización de interacción, foco en accesibilidad completa por teclado y zoom fluido.

## Estructura del repositorio

```
/                       pnpm workspace (package.json, pnpm-workspace.yaml, pnpm-lock.yaml, tsconfig.base.json)
├─ apps/
│  └─ dibujado/         app del mapa dibujado (2D pintado + 3D con relieve), puerto 5103
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
│  ├─ tecnologias.md    guía fácil de leer de las tecnologías del proyecto
│  └─ rendimiento.md    + rendimiento/ (results.json, capturas/)
├─ .agents/ .claude/ .githooks/
├─ AGENTS.md  ROADMAP.md  README.md  .gitignore
```

## Requisitos y uso

Requiere **Node.js >= 22** y **pnpm 11**. Para los tests E2E y el benchmark se requiere Chromium (`/usr/bin/chromium` o configurado mediante la variable `CHROMIUM_PATH`).

```sh
pnpm install

# Servidores de desarrollo
pnpm dev             # apps/dibujado en http://localhost:5103

# Build y preview
pnpm build           # compila todas las aplicaciones
pnpm preview         # vista previa de apps/dibujado

# Verificación
pnpm test            # tests unitarios de core
pnpm typecheck       # validación de tipos TypeScript
pnpm e2e             # tests de flujo e2e en apps/dibujado (Playwright)
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
  - Fichas de la orca, la ballena minke y la foca leopardo: Australian Antarctic Division, fichas de especie, [https://www.antarctica.gov.au/about-antarctica/animals/](https://www.antarctica.gov.au/about-antarctica/animals/) y [https://www.antarctica.gov.au/about-antarctica/animals/whales/minke-whale/](https://www.antarctica.gov.au/about-antarctica/animals/whales/minke-whale/) (ballena minke, consultada el 13 de noviembre de 2026).
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
  - **R. C. Mossman (1907):** Report on the Scientific Results of the Voyage of S.Y. Scotia, vol. II, Meteorology. URL: [https://archive.org/details/reportonscientif02scot](https://archive.org/details/reportonscientif02scot). Fecha de consulta: 12 de noviembre de 2026. Licencia: dominio público.
  - **Antarctic Station Catalogue (Argentina):** COMNAP. URL: [https://www.comnap.aq/s/Argentina_Catalogue_Aug2017.pdf](https://www.comnap.aq/s/Argentina_Catalogue_Aug2017.pdf). Fecha de consulta: 12 de noviembre de 2026.
  - **Sitio y Monumento Histórico N.º 42:** Secretaría del Tratado Antártico. URL: [https://www.ats.aq/devph/en/apa-database/119](https://www.ats.aq/devph/en/apa-database/119). Fecha de consulta: 12 de noviembre de 2026.
  - **OpenStreetMap: edificios y costa de la Base Orcadas:** colaboradores de OpenStreetMap, trazado sobre imágenes Maxar 2019. URL: [https://www.openstreetmap.org/#map=18/-60.7378/-44.7375](https://www.openstreetmap.org/#map=18/-60.7378/-44.7375). Fecha de consulta: 12 de noviembre de 2026. Licencia: [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) (© colaboradores de OpenStreetMap).
  - Las fuentes pendientes de verificación están en [`docs/orcadas-fuentes.md`](docs/orcadas-fuentes.md) y sus datos no se muestran en la interfaz.
  - **Recorrido guiado:** cuatro capítulos alrededor de una pregunta guía, «¿Cuánto cambió el clima de la isla Laurie en 120 años?». Cada capítulo tiene unas pocas paradas: la cámara viaja a un punto de la base y una tarjeta muestra una frase corta con su fuente; «Siguiente» pasa a la parada siguiente y, en la última, al capítulo siguiente.
    1. Llegar: el istmo, la bandera, Casa Omond y la pingüinera.
    2. Observar: una lectura de temperatura tocando la lupa del termómetro. Presión, viento y nubes son opcionales.
    3. Viajar: 1903, 1927, 1951 y hoy, con la serie del siglo.
    4. Responder: la lectura comparada con el mismo mes de todos los años.

    Se recorre entero sin escribir ningún número. Lo que cada frase deja afuera queda en el «Saber más» de esa parada. Al final, Responder muestra qué se completó y qué faltó. La tira de meses cambia la luz y el hielo de la escena en cualquier capítulo; en el celular es un chip con el mes que se despliega, y el panel del capítulo se arrastra para agrandarlo o achicarlo hasta dejar solo su nombre y el botón principal.
  - **Dato real:** la serie de temperatura (SCAR READER), las fechas de la historia y la elevación.
  - **Simulación (rotulada):** la observación del día, el hielo de la bahía por mes y la fauna por mes.
  - **Cálculo:** las horas de luz, la media móvil y la tendencia en dos tramos (1904–1950 y 1951–2025).
  - **Reconstrucción:** el diorama. Es un escenario de frente con una selección de edificios. La forma y el color de cada uno salen de OpenStreetMap, pero dónde está cada uno es ilustrativo. Los animales, instrumentos y la bandera están agrandados.
  - La explicación de la disposición está en [`docs/orcadas-emplazamiento.md`](docs/orcadas-emplazamiento.md).
- **Librerías 3D (apps/dibujado y react-ui):** Three.js (licencia MIT), React Three Fiber (licencia MIT), @react-three/drei (licencia MIT), @react-three/postprocessing (licencia MIT).
- **Costa y barreras de hielo:** [Natural Earth](https://www.naturalearthdata.com/) (`ne_50m_land`, `ne_50m_antarctic_ice_shelves_polys`), dominio público. [Términos de uso](https://www.naturalearthdata.com/about/terms-of-use/).
- **Base Orcadas:** coordenadas de [Armada Argentina · bases permanentes](https://www.argentina.gob.ar/armada/antartida/bases-permanentes) e historia y ubicación de [Cancillería Argentina](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas).
- **Tipografías:** Fraunces, Atkinson Hyperlegible, Caveat, DM Sans y Libre Caslon Display (todas bajo licencia SIL Open Font License 1.1 vía `@fontsource`).
- **Contenido científico:** provisional y en proceso de validación por el equipo (`[Contenido provisional]`, `[Fuente a definir]`).

## Declaración de uso de IA

En cumplimiento con las bases de la hackatón, se declara el uso de herramientas de inteligencia artificial en el desarrollo de los prototipos:

- **App dibujada:**
  > Como exigen las bases de la hackatón: se dibujo un boceto con todas las posibles ideas y luego **el diseño se generó con Claude Design** (prototipo en `docs/diseno/design/Main.dc.html`) y **el código de este repositorio se escribió con Claude Code**, con multiples revisiones del equipo.
- **Prototipo atlas (descartado, ya no está en el repositorio; se recupera en el commit `2ab6f80`):**
  > Interfaz y código de este prototipo desarrollados con Codex a partir de la revisión de los dos proyectos y del borrador provisto por el equipo.
- **Expedición Estación Orcadas:**
  > Planificación, arquitectura, revisión y verificación de fuentes con Claude Code (modelo Claude Fable 5.2); implementación delegada a agentes de Antigravity (Gemini 4 Argon y Gemini 3.8 Flash) bajo revisión; búsqueda inicial de fuentes con Gemini 3.8 Flash, con cada fuente publicada abierta y confirmada después por el orquestador (Claude Code); la confirmación humana de cada fuente se hace en la revisión del PR; ninguna imagen ni texto generado se presenta como dato.
- **Pulido de la expedición Estación Orcadas (#53):**
  > Auditoría, plan, revisión, verificación de fuentes y pulido visual con Claude Code (modelo Claude Opus 5.5); parte de la implementación delegada a Antigravity (Gemini 3.8 Flash) bajo revisión. Cada decisión de producto (cuatro capítulos, escenario de frente, selección de edificios) la aprobó quien lleva el issue. Las plantas de los edificios salen de OpenStreetMap (ODbL); ninguna imagen generada se presenta como dato.
- **Recorrido guiado de la expedición Estación Orcadas (#61):**
  > Plan, decisiones de diseño, revisión, verificación con capturas y parte de la implementación con Claude Code (modelo Claude Opus 5.5); implementación de los pasos delegada a Antigravity (Gemini 4 Hydrogen) bajo revisión. Cada frase de parada sale de una ficha con fuente verificada; no se agregaron datos nuevos.
- **Helipuerto y helicóptero en la expedición Estación Orcadas (#68):**
  > Plan, búsqueda y verificación de fuentes, revisión de cada paso, capturas y ajustes con Claude Code (modelo Claude Opus 5.5); implementación de los pasos delegada a Antigravity (Gemini 4 Hydrogen) bajo revisión. El helipuerto sale de OpenStreetMap (ODbL); la ficha del relevo en helicóptero cita a la Armada Argentina (15 dic 2025) y a COMNAP (2017). El tipo de helicóptero, sus colores, su escala y su vuelo de llegada son ilustrativos.
- **Pruebas e2e de Orcadas y tobogán de los pingüinos (#84):**
  > Diagnóstico de las pruebas, ajuste del tiempo límite y cambio de la ruta de los pingüinos con Claude Code (modelo Claude Sonnet 5.5). No se agregaron datos ni fuentes; el movimiento de los pingüinos es una reconstrucción ilustrada.
- **Prueba e2e del reloj del mar 3D (#41):**
  > Diagnóstico y arreglo de la prueba con asistencia de IA, con revisión del equipo. Solo cambia la prueba; no se agregaron datos ni fuentes.
- **Resto del hemisferio sur en el mapa 3D (#42):**
  > Planificación, revisión y ajustes visuales con Claude Code (modelo Claude Opus 5.5); implementación de partes delegada a Antigravity (Gemini 3.8 Flash) bajo revisión. Las siluetas salen de Natural Earth y su color de Natural Earth II (ambos de dominio público); son contexto geográfico, no datos.
- **La lista de puntos tapa los cartelitos del mapa (#48):**
  > Diagnóstico, arreglo y prueba e2e con asistencia de IA, con revisión del equipo. No se agregaron datos ni fuentes.
- **Documento de tecnologías (#82):**
  > Redactado con asistencia de IA a partir del código y la documentación del repositorio, con revisión del equipo. No agrega datos nuevos.
- **Bordes del mapa 3D, resto del mundo hasta 60° N y gestos de la cámara (#46):**
  > Planificación, implementación y pruebas con asistencia de IA, con revisión del equipo. Las siluetas salen de Natural Earth y su color de Natural Earth II (ambos de dominio público); son contexto geográfico, no datos.
