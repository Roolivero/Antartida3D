# Datos del relieve 3D

Registro de los datos de elevación que usa la vista 3D de `apps/dibujado`: de dónde salen, qué significa cada archivo, cómo se generan y por qué se eligieron.

Fecha de consulta y descarga: 11 de noviembre de 2026.

## Fuente: Bedmap3

**Bedmap3** es el modelo de referencia de la superficie, el espesor del hielo y el lecho rocoso de toda la Antártida. Lo publicó en 2025 un consorcio internacional coordinado por el British Antarctic Survey. Integra décadas de mediciones de radar aéreo, satélites y campañas de campo.

| Dato | Valor |
|---|---|
| Organismo | UK Polar Data Centre, British Antarctic Survey (BAS), NERC |
| Licencia | [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). Permite usar y modificar los datos citando la fuente. |
| Ficha del dataset | https://data.bas.ac.uk/full-record.php?id=GB%2FNERC%2FBAS%2FPDC%2F01615 |
| DOI del dataset | https://doi.org/10.5285/2d0e4791-8e20-46a3-80e4-f5f6716025d2 |
| Página de descarga (RAMADDA) | http://ramadda.data.bas.ac.uk/repository/entry/show?entryid=2d0e4791-8e20-46a3-80e4-f5f6716025d2 |
| Paper | Pritchard, H.D., Fretwell, P.T., Fremand, A.C. et al. *Bedmap3 updated ice bed, surface and thickness gridded datasets for Antarctica.* Scientific Data 12, 414 (2025). https://doi.org/10.1038/s41597-025-04672-y |

**Cita requerida.** Al usar los datos hay que citar el dataset («BEDMAP3 - Ice thickness, bed and surface elevation for Antarctica - gridding products (Version 1.0) [Data set]. NERC EDS UK Polar Data Centre») y el paper.

### Qué se descargó

El paquete completo pesa 2,1 GB: siete grillas GeoTIFF y un shapefile. Solo se bajaron dos archivos, unos 690 MB en total:

| Archivo | Tamaño | Qué contiene |
|---|---|---|
| `bm3_surface.tif` | 345 MB | Altura de la superficie (hielo o roca) en metros sobre el nivel del mar. |
| `bm3_masks.tif` | 345 MB | Qué hay en cada celda: 1 = hielo apoyado sobre roca, 2 = barrera de hielo transitoriamente apoyada, 3 = barrera de hielo flotante, 4 = roca expuesta. |

**Formato de las dos grillas:**
- **Celdas:** 13 334 × 13 334, cada una de 500 m × 500 m.
- **Valores:** enteros de 16 bits. El −9999 significa «sin dato» (océano).
- **Proyección:** EPSG:3031, la estereográfica polar antártica, el sistema de coordenadas estándar para mapas de la Antártida.
- **Superficie:** Bedmap3 la deriva del modelo REMA (Reference Elevation Model of Antarctica, hecho con imágenes satelitales). La lleva a 500 m y la refiere al nivel medio del mar.

**Dónde están.** Los archivos viven en `~/.cache/antartida3d/bedmap3/`, fuera del repositorio. No se suben a GitHub: solo los lee el script que genera los datos livianos de abajo. Se puede usar otra carpeta con la variable `BEDMAP3_DIR`.

### Por qué Bedmap3

- **Es un dato real y citable.** La regla del eje pide no presentar simulaciones como datos reales. El relieve anterior del atlas era una fórmula inventada; este es una medición publicada por un organismo científico.
- **Cubre todo el continente sin huecos**, en un solo archivo, a una resolución (500 m) muy por encima de lo que necesita un mapa interactivo.
- **Trae la máscara de tipo de superficie.** Permite pintar distinto la roca expuesta y distinguir las barreras de hielo flotantes, como el 2D.
- **Usa el nivel del mar como referencia,** así la costa queda en altura 0 y coincide con el plano del océano.

**Alternativa descartada: REMA.** REMA (Polar Geospatial Center, CC BY 4.0) tiene más resolución (2 a 32 m), pero viene partido en miles de mosaicos que suman terabytes. No trae máscara y está referido al elipsoide, no al nivel del mar. Para este uso, Bedmap3 ya incluye la superficie de REMA procesada.

## Cómo se transforman los datos

El script `packages/core/scripts/build-terrain.ts` (`pnpm terrain` desde la raíz) toma los dos GeoTIFF y genera archivos livianos en `packages/core/src/assets/`. Hace estos pasos:

1. **Cambio de proyección.** El mapa dibujado usa su propio espacio de 0 a 1000 unidades (`packages/core/src/projection.ts`). Para cada punto de ese espacio, el script calcula la latitud y longitud (`unproject`). Después la convierte a EPSG:3031 con `proj4` y lee la altura de Bedmap3 por interpolación bilineal (promedio ponderado de las 4 celdas vecinas). Así el relieve cae exactamente debajo de la costa, los puntos y la acuarela del 2D.
2. **Grilla intermedia** de 4097 × 4097 puntos sobre el recuadro del continente (`TERRAIN_BOX`). Una unidad de mapa equivale a unos 8 km.
3. **Malla adaptativa (RTIN).** Con `@mapbox/martini`, la grilla (reducida a 2049 × 2049) se convierte en triángulos. Pone muchos triángulos donde el relieve cambia (cordilleras, costas) y pocos donde es plano (la meseta polar). Se descartan los triángulos que son enteramente océano.
4. **Texturas de relieve.** Para cada píxel se calcula la inclinación del terreno («normal»), que el shader usa para la luz y los hachures. También se guarda la altura, para las curvas de nivel.
5. **Luz precalculada.** Se generan dos datos sobre la grilla de 2049 × 2049:
   - **Oclusión ambiental:** cuánto cielo «ve» cada punto. Por eso valles, pies de montaña y escarpas se oscurecen.
   - **Sombra proyectada:** se calcula con un sol fijo desde el noroeste, a 35° sobre el horizonte. Es la convención de los mapas de relieve sombreado, con luz desde arriba a la izquierda.

   Son las dos pistas de profundidad más fuertes, y son demasiado caras para calcularlas en cada cuadro.

**Comprobación de los datos generados:**

| Lugar | Generado | Valor publicado |
|---|---|---|
| Polo Sur | 2834 m | ≈ 2835 m |
| Domo A, punto más alto de la meseta | 4083 m | ≈ 4093 m |
| Máximo del continente | 4709 m | Macizo Vinson, 4892 m |

El máximo da menos que el Vinson porque la grilla promedia la cima.

**Exageración vertical ×50.** La Antártida mide unos 4500 km de ancho y como mucho 4,9 km de alto; a escala real se vería como una lámina. Por eso las alturas se multiplican por 50 al dibujar.
- Primero se usó ×25. El domo del este, que sube 4 km a lo largo de 2000 km, casi no se notaba, así que se subió a ×50, un valor habitual en diagramas de relieve a escala continental.
- La leyenda de la interfaz toma el valor del código: «Relieve real · Bedmap3 (BAS) · exageración vertical ×50 · curvas cada 250 m».

Las constantes del relieve están en un solo lugar, `packages/core/src/relief.ts`, y las usan la app y el script:
- `VERTICAL_EXAGGERATION`, la exageración;
- `CONTOUR_M`, el intervalo de curvas;
- `SUN`, la dirección del sol;
- `METERS_PER_MAP_UNIT`, los metros por unidad de mapa.

Si cambia la exageración o el sol, hay que regenerar los archivos, porque la inclinación y las sombras se calculan con esos valores.

## Archivos generados (sí van al repositorio)

Todos están en `packages/core/src/assets/`. Son unos 28 MB en total.

| Archivo | Tamaño | Qué es | Quién lo usa |
|---|---|---|---|
| `terrain-mesh-hi.bin` | 7,1 MB | Malla de alta calidad: 330 108 triángulos (error máximo ≈ 40 m). Incluye la grilla de alturas de 1025 × 1025 para consultas rápidas. | Pantallas de 820 px o más. |
| `terrain-mesh-lo.bin` | 3,7 MB | Malla liviana: 109 927 triángulos (error máximo ≈ 155 m). Incluye la misma grilla de alturas. | Celulares (menos de 820 px). |
| `terrain-relief-4096.webp` | 11,7 MB | Textura de 4096 × 4096 sin pérdida. Los canales RGB guardan la inclinación del terreno («mapa de normales») y el canal alfa guarda la altura en 256 niveles (0 a 4200 m). | Escritorio. |
| `terrain-relief-2048.webp` | 2,9 MB | La misma textura a 2048 × 2048. | Celulares. |
| `terrain-light-2048.webp` | 0,55 MB | Textura de 2048 × 2048 con pérdida (calidad 90). El canal R guarda la oclusión ambiental y el G la sombra del sol del noroeste. Como son datos suaves, alcanza una sola versión para todas las pantallas. | Shader del terreno (celulares y escritorio). |
| `map-paint-3d-2048.webp`, `map-paint-3d-4096.webp` | 0,17 y 0,55 MB | La acuarela del mapa sin los trazos decorativos de glaciar, para el terreno y el océano 3D. Se generan con `pnpm map-raster` junto con las del 2D. No salen de Bedmap3. | Terreno y océano 3D. |
| `terrain-elevation-grid.bin` | 2,1 MB | Grilla de alturas de 1025 × 1025, en metros, como archivo aparte. | Nadie: la app usa la copia que va dentro de las mallas. Se puede borrar del script y del repositorio. |
| `paper-512.webp` | 44 kB | Textura de grano de papel, horneada del filtro SVG `#paperf` del 2D. | Shader del terreno. No sale de Bedmap3. |

**Formato de las mallas `.bin`.** Es binario propio. Una cabecera `MESH` con la cantidad de vértices e índices, el tamaño de la grilla y el recuadro. Después las coordenadas de cada vértice (Uint16), su altura en metros (Uint16), su tipo de superficie (Uint8), los índices de los triángulos (Uint32) y la grilla de alturas de 1025 × 1025. Lo lee `parseTerrainMesh` en `packages/core/src/terrain.ts`.

**Qué descarga cada usuario.** Un celular baja la malla `lo` y la textura 2048, unos 6,6 MB. Una computadora baja la malla `hi` y la textura 4096, unos 19 MB. El navegador los guarda en caché después de la primera visita.

**Por qué se commitean y no se generan en el build.** Generarlos requiere los 690 MB de Bedmap3 y unos minutos de proceso. Commiteados, cualquiera del equipo clona y corre la app sin descargar nada.

**Cuidado con el historial.** Cada vez que se regeneran y commitean, se agrega otra copia de unos 27 MB al historial de git, que no se borra. Regenerarlos solo si cambia algo de fondo: la costa, la proyección, la exageración o el formato.

## Cómo regenerarlos

1. Descargar `bm3_surface.tif` y `bm3_masks.tif` desde la página RAMADDA de arriba a `~/.cache/antartida3d/bedmap3/`, o a otra carpeta indicada con `BEDMAP3_DIR`.
2. Desde la raíz del repo, correr `pnpm terrain`.
3. Revisar que el script imprima el Polo Sur cerca de 2835 m y el Domo A cerca de 4090 m.
4. Correr `pnpm test`: `packages/core/test/terrain.test.ts` verifica esas alturas y la lectura de las mallas.

Si cambia `VERTICAL_EXAGGERATION` o `SUN` en `packages/core/src/relief.ts`, hay que regenerar: las normales y las sombras dependen de esos valores.

## Cómo se dibuja el relieve

El shader del terreno está en `packages/react-ui/src/map3d/paintedTerrain.glsl.ts`. Arma la imagen en este orden:

1. **Acuarela del 2D.** Es el color base. Encima va un lavado gris pardo sobre la roca expuesta y un celeste claro sobre las barreras flotantes. El 3D usa una versión horneada sin los 4 trazos decorativos de glaciar del 2D (`map-paint-3d-*.webp`): son ilustración, no datos, y sobre el relieve se veían como líneas rectas que lo cruzaban.
2. **Tinte por altura (hipsométrico).** El hielo bajo de la costa se ve más gris y frío, y la meseta alta más clara. Así se lee el domo.
3. **Luz rasante del noroeste,** con dos luces suaves de relleno (oeste y norte), más la oclusión y la sombra precalculadas. Las sombras se pintan como pigmento azul, no como gris, para mantener el estilo de acuarela.
4. **Hachures.** Son trazos que siguen la dirección de la pendiente en las laderas en sombra. Desaparecen al alejarse para no ensuciar.
5. **Curvas de nivel:** lápiz muy suave cada 250 m, algo más marcado cada 1000 m. Aparecen solo al acercarse. De lejos el sombreado ya muestra la forma, y las líneas lo tapaban.
6. **Brillo del hielo:** un reflejo suave del sol sobre el hielo liso, más fuerte en las barreras flotantes. Nunca aparece en la roca ni en las zonas en sombra.
7. **Bruma de distancia (perspectiva aérea):** el hielo lejano se aclara hacia un tono pálido, así la distancia se lee como profundidad.
8. **Grano de papel.**

La vista inicial del 3D encuadra el continente según el tamaño de la pantalla (`homePose3D` en `packages/core/src/camera.ts`), con una inclinación de 38° sobre el horizonte.

## Tierra del Fuego, Patagonia sur y Malvinas (IBCSO v2)

Bedmap3 termina en 60° S, así que el 3D no tenía tierra en Sudamérica: Ushuaia quedaba sobre agua y el Canal Beagle no existía. Esa tierra se genera aparte, desde IBCSO v2.

| Dato | Valor |
| :--- | :--- |
| Dataset | Dorschel, B. et al. (2022), *The International Bathymetric Chart of the Southern Ocean Version 2 (IBCSO v2)* |
| Organismo | SCAR / IBCSO, Alfred Wegener Institute; publicado en PANGAEA |
| DOI | https://doi.org/10.1594/PANGAEA.937574 |
| Archivo | `IBCSO_v2_bed.tif` (unos 160 MB), https://download.pangaea.de/dataset/937574/files/IBCSO_v2_bed.tif |
| Licencia | CC BY 4.0 |
| Proyección | EPSG:9354 (estereográfica polar IBCSO, paralelo estándar 65° S) |
| Fecha de consulta | 11 de noviembre de 2026 |

- **Por qué este dataset:** cubre todo al sur de 50° S, incluida la tierra, en una grilla de 500 m. El Beagle, de unos 5 km de ancho, queda con unas 10 celdas. Es el mismo dataset que ya usa el fondo del mar, así que no se suma una fuente ni una licencia nueva.
- **Región:** caja del mapa `FUEGIA_BOX` (x de −96 a 100, y de 194 a 390), desde el Cabo de Hornos hasta 50° S, donde terminan los datos. Incluye las Islas Malvinas. En los últimos 0,6° la tierra baja suavemente al nivel del mar y se disuelve en el océano, para no terminar en una línea recta.
- **Costa:** sale de la propia elevación (tierra es todo lo que está sobre el nivel del mar), no de Natural Earth. Por eso relieve y costa coinciden.
- **Malla:** `fuegia-mesh-hi.bin` (unos 3,8 MB, 1,4 MB comprimido) para pantallas anchas y `fuegia-mesh-lo.bin` (unos 2,2 MB, 0,8 MB comprimido) para celular. Se arman sobre una grilla de 4097 × 4097 (celdas de unos 350 m). Usan el mismo formato `MESH` que el terreno antártico, sin grilla de elevación. Se descargan solo cuando la cámara se acerca a la región (`FUEGIA_LOAD_DISTANCE`).
- **Agua cercana a la costa:** la malla incluye también el agua a menos de 4 unidades de la costa (unos 30 km), pintada según la profundidad de IBCSO, y se funde con el plano del océano. Hace falta porque ese plano todavía toma su costa de Natural Earth y dibuja una banda de espuma más ancha que los canales. En esa franja el agua no tiene la animación del mar. Lo correcto a futuro es regenerar la batimetría del océano con esta misma costa.
- **Exageración vertical ×10**, no ×50: a ×50 una sierra de 1000 m mediría seis unidades del mapa junto a un canal de menos de una, y lo taparía. La leyenda lo declara.
- **Color:** tinte según la altura y la pendiente: pasto en la costa, verde de bosque hasta unos 600 m, roca arriba y en las laderas empinadas, nieve desde unos 1000 m. No representa la cobertura real del suelo; la leyenda dice «color según altura».
- **Precisión:** la simplificación de la malla conserva la costa, pero el relieve interior tiene un error de hasta unos 310 m (malla ancha) y 500 m (celular). Sirve para leer la forma del terreno, no para medir alturas.
- **Cámara:** sobre esta región se puede acercar hasta 8 unidades (`FUEGIA_MIN_DISTANCE`); sobre la Antártida el mínimo sigue en 60.
- **Regenerar:** bajar `IBCSO_v2_bed.tif` a `~/.cache/antartida3d/ibcso/` (o indicar la carpeta con `IBCSO_DIR`) y correr `pnpm --filter @antartida/core fuegia`.
- **El mapa 2D no cambia:** sigue con la costa de Natural Earth.

## Otros datos geográficos del mapa (ya existían)

- **Costa, islas y barreras de hielo:** Natural Earth (`ne_50m_land`, `ne_50m_antarctic_ice_shelves_polys`), dominio público, https://www.naturalearthdata.com/. Están en `packages/core/src/coastline.ts`, y se regeneran con `pnpm coastline`. Natural Earth corta el continente y la barrera de Ross sobre el antimeridiano (la línea de 180°). En 2D ese corte se tapa con un trazo, y en 3D se omite con `isAntimeridianSeam`.
- **Acuarela del mapa:** `map-paint-*.webp`, horneada de los filtros SVG del diseño con `pnpm map-raster`. No es un dato geográfico, es ilustración. Ver `docs/decisiones.md`.
