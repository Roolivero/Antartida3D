# Antártida por descubrir

Equipo **DOT ENV**, hackatón SoberaníaTech (Ushuaia, 2026), Eje 2: Antártida, Ciencia y Conocimiento Abierto.

*Antártida por descubrir* es una plataforma interactiva orientada a la divulgación y educación sobre el continente antártico, combinando cartografía interactiva y expediciones guiadas.

## Integrantes

- `[completar]`

## Aplicaciones a comparar

El repositorio contiene dos enfoques en `apps/` para evaluar y seleccionar la base definitiva:

- **`apps/dibujado`** (puerto 5103): mapa dibujado estilo acuarela con relieve (2D y 3D) y expedición interactiva en Marambio («¿Cómo era la Antártida antes del hielo?»). Máxima optimización de interacción, foco en accesibilidad completa por teclado y zoom fluido.
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
