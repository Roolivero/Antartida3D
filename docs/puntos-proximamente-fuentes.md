# Fuentes y contenido verificado — Puntos «Próximamente» y «Ampliación prevista»

Registro de descripciones y fuentes primarias verificadas en línea para los puntos definidos en [`packages/core/src/content/points.ts`](../packages/core/src/content/points.ts) que actualmente muestran contenido provisional (`tier: 'C'` y `tier: 'B'`).

- **Fecha de consulta de todas las fuentes:** `2026-11-12`
- **Criterio de verificación:** URLs directas a organismos oficiales, instituciones científicas o publicaciones académicas abiertas (comprobadas en línea; sin portadas genéricas). Conforme a `AGENTS.md` (Eje 2), un humano debe revisar cada fuente antes del merge en el PR correspondiente.
- **Formato para código:** cada ficha incluye los campos actuales de `MapPoint` (`id`, `tier`, `title`, `place`, `q`), una propuesta de descripción breve (`desc`) basada exclusivamente en las fuentes listadas y la estructura compatible con `Source` (`label`, `org`, `url`, `consulted`).

---

## 1. Puntos «Próximamente» (`tier: 'C'`)

### 1.1. `polo` — El Polo Sur

- **Metadatos en `points.ts`:**
  - `id`: `'polo'`
  - `tier`: `'C'`
  - `title`: `'El Polo Sur'`
  - `place`: `'Centro del continente'`
  - `q`: `'¿Qué hay en el punto más austral del planeta?'`
- **Propuesta de `desc`:**
  > En el Polo Sur geográfico (90° S), a 2.835 metros sobre el nivel del mar sobre la meseta de hielo antártica, funciona de manera permanente desde noviembre de 1956 la Estación Amundsen-Scott, dedicada a estudios atmosféricos, climáticos, geofísicos y astrofísicos (como el observatorio de neutrinos IceCube). El 10 de diciembre de 1965, la primera expedición terrestre argentina (Operación 90), encabezada por el coronel Jorge Edgar Leal desde la Base Belgrano, alcanzó por tierra los 90° S.

| Referencia (`label`) | Organismo (`org`) | URL (`url`) | Consulta (`consulted`) | Estado |
|---|---|---|---|---|
| Amundsen-Scott South Pole Station | U.S. National Science Foundation (NSF) · Office of Polar Programs | https://www.nsf.gov/od/opp/ail/amundson-scott-south-pole-station | 2026-11-12 | Verificada (HTTP 200) |
| South Pole Baseline Observatory (2.835 m) | NOAA Global Monitoring Laboratory | https://gml.noaa.gov/grad/antuv/SouthPole.jsp | 2026-11-12 | Verificada (HTTP 200) |
| Ley N.º 19.659 — Exploradores del Polo Sur (Operación 90) | InfoLEG · Ministerio de Justicia (Argentina) | https://www.argentina.gob.ar/normativa/nacional/norma-86484/texto | 2026-11-12 | Verificada (HTTP 200) |

---

### 1.2. `testigos` — Testigos de hielo

- **Metadatos en `points.ts`:**
  - `id`: `'testigos'`
  - `tier`: `'C'`
  - `title`: `'Testigos de hielo'`
  - `place`: `'Domo C'`
  - `q`: `'¿Cómo puede el hielo guardar aire de otras épocas?'`
- **Propuesta de `desc`:**
  > Al acumularse y compactarse la nieve sin derretirse, el hielo glaciar encierra diminutas burbujas de aire que preservan muestras directas de la atmósfera antigua. En el Domo C (Meseta Antártica Oriental), el proyecto europeo EPICA perforó el manto de hielo y obtuvo un registro continuo de unos 800.000 años de temperatura, dióxido de carbono (CO2) y metano (CH4), hoy extendido por la campaña Beyond EPICA.

| Referencia (`label`) | Organismo (`org`) | URL (`url`) | Consulta (`consulted`) | Estado |
|---|---|---|---|---|
| EPICA Dome C Ice Core — 800KYr Carbon Dioxide Data | NOAA National Centers for Environmental Information (NCEI) | https://www.ncei.noaa.gov/access/paleo-search/study/6091 | 2026-11-12 | Verificada (HTTP 200) |
| Ice cores and climate change | British Antarctic Survey (BAS) | https://www.bas.ac.uk/data/our-data/publication/ice-cores-and-climate-change/ | 2026-11-12 | Verificada (HTTP 202) |
| Beyond EPICA — Oldest Ice (Domo C) | British Antarctic Survey (BAS) | https://www.bas.ac.uk/project/beyond-epica/ | 2026-11-12 | Verificada (HTTP 202) |

---

### 1.3. `vostok` — Un lago bajo el hielo

- **Metadatos en `points.ts`:**
  - `id`: `'vostok'`
  - `tier`: `'C'`
  - `title`: `'Un lago bajo el hielo'`
  - `place`: `'Lago Vostok'`
  - `q`: `'¿Puede haber agua líquida debajo de kilómetros de hielo?'`
- **Propuesta de `desc`:**
  > El Lago Vostok, en la Antártida Oriental, es el mayor de los lagos subglaciales antárticos y yace sepultado bajo casi 4.000 metros de hielo. El agua permanece líquida y aislada de la superficie gracias al efecto aislante del manto glaciar, al calor geotérmico del lecho rocoso y a la alta presión del hielo suprayacente, convirtiéndolo en un análogo terrestre para estudiar la vida extrema y mundos oceánicos helados.

| Referencia (`label`) | Organismo (`org`) | URL (`url`) | Consulta (`consulted`) | Estado |
|---|---|---|---|---|
| Newly Discovered Antarctic Lakes & Lake Vostok | NASA Science · Earth Observatory | https://science.nasa.gov/earth/earth-observatory/newly-discovered-antarctic-lakes-6258/ | 2026-11-12 | Verificada (HTTP 200) |
| Exploration of lake hidden beneath Antarctica's ice sheet | British Antarctic Survey (BAS) | https://www.bas.ac.uk/news/exploration-of-lake-hidden-beneath-antarcticas-ice-sheet-begins/ | 2026-11-12 | Verificada (HTTP 202) |

---

### 1.4. `erebus` — Volcán en el hielo

- **Metadatos en `points.ts`:**
  - `id`: `'erebus'`
  - `tier`: `'C'`
  - `title`: `'Volcán en el hielo'`
  - `place`: `'Monte Erebus, Isla de Ross'`
  - `q`: `'¿Cómo conviven un volcán activo y el hielo?'`
- **Propuesta de `desc`:**
  > Con 3.794 metros de altura en la Isla de Ross, el Monte Erebus es el volcán activo más austral de la Tierra. Aunque sus laderas están cubiertas de glaciares, su cráter principal aloja un raro lago de lava fonolítica persistente desde al menos 1972; el calor y los gases volcánicos excavan cuevas de hielo y forman chimeneas de vapor congelado en la superficie.

| Referencia (`label`) | Organismo (`org`) | URL (`url`) | Consulta (`consulted`) | Estado |
|---|---|---|---|---|
| Erebus Breaks Through | NASA Science · Earth Observatory | https://science.nasa.gov/earth/earth-observatory/erebus-breaks-through-152134/ | 2026-11-12 | Verificada (HTTP 200) |
| Mt. Erebus, Antarctica | NASA Science Photojournal (JPL) | https://science.nasa.gov/photojournal/mt-erebus-antarctica/ | 2026-11-12 | Verificada (HTTP 200) |

---

### 1.5. `thwaites` — Glaciares que cambian

- **Metadatos en `points.ts`:**
  - `id`: `'thwaites'`
  - `tier`: `'C'`
  - `title`: `'Glaciares que cambian'`
  - `place`: `'Glaciar Thwaites, Mar de Amundsen'`
  - `q`: `'¿Por qué la ciencia sigue tan de cerca a este glaciar?'`
- **Propuesta de `desc`:**
  > El Glaciar Thwaites, en la Antártida Occidental, es el glaciar más ancho del planeta (unos 120 km de frente) y el flujo de hielo que descarga al océano se duplicó en tres décadas por el ingreso de agua oceánica profunda más cálida bajo su plataforma flotante. Contiene suficiente hielo como para elevar el nivel global del mar en unos 65 centímetros si colapsara por completo, motivo por el cual la Colaboración Internacional del Glaciar Thwaites (ITGC) lo monitorea de forma continua.

| Referencia (`label`) | Organismo (`org`) | URL (`url`) | Consulta (`consulted`) | Estado |
|---|---|---|---|---|
| Thwaites Glacier Facts | International Thwaites Glacier Collaboration (ITGC · NSF / NERC-BAS) | https://thwaitesglacier.org/about/facts | 2026-11-12 | Verificada (HTTP 200) |
| Thwaites Glacier Transformed | NASA Science · Earth Observatory | https://science.nasa.gov/earth/earth-observatory/thwaites-glacier-transformed-146247/ | 2026-11-12 | Verificada (HTTP 200) |
| First drilling mission on remote Thwaites Glacier | British Antarctic Survey (BAS) | https://www.bas.ac.uk/news/into-the-unknown-scientists-first-drilling-mission-on-remote-and-inaccessible-glacier/ | 2026-11-12 | Verificada (HTTP 202) |

---

### 1.6. `belgrano` — Base Belgrano II

- **Metadatos en `points.ts`:**
  - `id`: `'belgrano'`
  - `tier`: `'C'`
  - `title`: `'Base Belgrano II'`
  - `place`: `'Sur del Mar de Weddell'`
  - `q`: `'¿Cómo se trabaja tan cerca del Polo?'`
- **Propuesta de `desc`:**
  > Inaugurada el 5 de febrero de 1979 sobre el nunatak Bertrab (bahía Vahsel, Costa Confín), a unos 1.300 km del Polo Sur, la Base Antártica Conjunta Belgrano II es la base permanente más austral de la Argentina. En esa latitud se alternan cuatro meses de noche polar y cuatro meses de día continuo; en el Laboratorio Belgrano (LABEL) del Instituto Antártico Argentino se miden la capa de ozono, el geomagnetismo, la ionósfera y las auroras australes.

| Referencia (`label`) | Organismo (`org`) | URL (`url`) | Consulta (`consulted`) | Estado |
|---|---|---|---|---|
| Base Belgrano II | Cancillería Argentina · Dirección Nacional del Antártico (DNA) | https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/belgrano-ii | 2026-11-12 | Verificada (HTTP 200) |
| Base Belgrano II — Historia, clima y laboratorio | Ejército Argentino · Argentina.gob.ar | https://www.argentina.gob.ar/ejercito/antartida/base-belgrano2 | 2026-11-12 | Verificada (HTTP 200) |
| Bases antárticas permanentes | Armada Argentina · Argentina.gob.ar | https://www.argentina.gob.ar/armada/antartida/bases-permanentes | 2026-11-12 | Verificada (HTTP 200) |

---

### 1.7. `emperador` — Colonias de pingüino emperador

- **Metadatos en `points.ts`:**
  - `id`: `'emperador'`
  - `tier`: `'C'`
  - `title`: `'Colonias de pingüino emperador'`
  - `place`: `'Costa de Tierra de la Reina Maud'`
  - `q`: `'¿Cómo pasan el invierno polar los pingüinos emperador?'`
- **Propuesta de `desc`:**
  > El pingüino emperador (*Aptenodytes forsteri*) se reproduce durante el invierno antártico sobre el hielo marino costero, incluidas múltiples colonias en la costa de la Tierra de la Reina Maud monitoreadas incluso desde el espacio. Tras la puesta de un único huevo, la hembra regresa al mar y el macho lo incuba sobre sus patas sin alimentarse durante más de dos meses, agrupándose en formaciones compactas donde los individuos rotan para conservar el calor.

| Referencia (`label`) | Organismo (`org`) | URL (`url`) | Consulta (`consulted`) | Estado |
|---|---|---|---|---|
| An Emperor Penguin Population Estimate from Space (Fretwell et al., 2012) | PLOS ONE / British Antarctic Survey | https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0033751 | 2026-11-12 | Verificada (HTTP 200) |
| Emperor penguin (*Aptenodytes forsteri*) | Australian Antarctic Division (AAD) | https://www.antarctica.gov.au/about-antarctica/animals/penguins/emperor-penguin/ | 2026-11-12 | Verificada (HTTP 200) |
| Fauna y Flora Antártica | Armada Argentina · Argentina.gob.ar | https://www.argentina.gob.ar/armada/antartida/fauna-y-flora | 2026-11-12 | Verificada (HTTP 200) |

---

## 2. Puntos «Ampliación prevista» (`tier: 'B'`)

### 2.1. `fosiles` — Fósiles

- **Metadatos en `points.ts`:**
  - `id`: `'fosiles'`
  - `tier`: `'B'`
  - `title`: `'Fósiles'`
  - `place`: `'Isla Marambio'`
  - `q`: `'¿Cómo era la Antártida antes del hielo?'`
- **Propuesta de `desc`:**
  > La Isla Marambio (Seymour Island) presenta amplios sectores libres de hielo con estratos del Cretácico superior y del Cenozoico que conservan un registro paleontológico excepcional. Investigaciones del Instituto Antártico Argentino (IAA) y del CONICET documentaron allí bosques templados antiguos, aves marinas extintas y reptiles marinos del Cretácico como el elasmosaurio *Marambionectes molinai*.

| Referencia (`label`) | Organismo (`org`) | URL (`url`) | Consulta (`consulted`) | Estado |
|---|---|---|---|---|
| Descubren nueva especie de reptil marino (*Marambionectes molinai*) en Isla Marambio | CONICET | https://www.conicet.gov.ar/web-accesible/?nota_id=136847 | 2026-11-12 | Verificada (HTTP 200) |
| Registro paleontológico antártico (Isla Marambio, PDF) | CONICET Digital | https://ri.conicet.gov.ar/bitstream/handle/11336/239939/CONICET_Digital_Nro.df77378f-4107-4351-9e25-f42db3f32ceb_B.pdf?sequence=2 | 2026-11-12 | Verificada (HTTP 200) |
| Base Marambio | Cancillería Argentina · Dirección Nacional del Antártico (DNA) | https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/marambio | 2026-11-12 | Verificada (HTTP 200) |

---

### 2.2. `oceano` — Océano

- **Metadatos en `points.ts`:**
  - `id`: `'oceano'`
  - `tier`: `'B'`
  - `title`: `'Océano'`
  - `place`: `'Mar de Weddell'`
  - `q`: `'¿Qué pasa debajo del hielo marino del Mar de Weddell?'`
- **Propuesta de `desc`:**
  > Bajo la banquisa del Mar de Weddell se sostiene una pieza clave de la red trófica y del clima global: el krill antártico (*Euphausia superba*), alimento central de ballenas, focas y pingüinos, depende en sus estadios juveniles de las microalgas asociadas al hielo marino, mientras el agua fría y salina formada en sus costas impulsa la circulación oceánica profunda.

| Referencia (`label`) | Organismo (`org`) | URL (`url`) | Consulta (`consulted`) | Estado |
|---|---|---|---|---|
| Fauna y Flora Antártica (krill y cadena trófica) | Armada Argentina · Argentina.gob.ar | https://www.argentina.gob.ar/armada/antartida/fauna-y-flora | 2026-11-12 | Verificada (HTTP 200) |
| Registros de focas cangrejeras en islas del Mar de Weddell (solo resumen abierto) | CONICET Digital · IAA / UNLP / CONICET | https://ri.conicet.gov.ar/handle/11336/128016 | 2026-11-12 | Verificada (resumen abierto) |

---

### 2.3. `poncho` — Poncho

- **Metadatos en `points.ts`:**
  - `id`: `'poncho'`
  - `tier`: `'B'`
  - `title`: `'Poncho'`
  - `place`: `'Península Antártica · ubicación a definir'`
  - `q`: `'¿Qué historia puede contar un poncho en la Antártida?'`
- **Estado:** cuenta con desarrollo propio y catálogo de fuentes en las ramas del grupo Poncho (`origin/26-poncho-b-0-contrato-de-datos-tipos-del-hito-y-la-fuente` a `origin/31-poncho-b-fichas-y-cuaderno`, issues `#9` y `#26`–`#33`). No duplicar aquí hasta consolidar esas ramas en `main`.
