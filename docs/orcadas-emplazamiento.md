# Emplazamiento de la Base Orcadas

Investigación de la fase 5 del plan `.agents/plans/plan-orcadas-pulido.md`. Es un **borrador para aprobar**: según la puerta de calidad de G1, no se modela nada hasta que el equipo apruebe la tabla. Un elemento sin fuente primaria queda fuera de la escena o como `[Fuente a definir]`, y nunca se ubica «a ojo».

Fecha de consulta de todo lo que sigue: 12 de noviembre de 2026.

## Lo que está confirmado por fuentes primarias

| Dato | Fuente | Organismo |
|---|---|---|
| El HSM 42 («Laurie Island observatories») está en 60°44′18″ S, 44°44′19″ O y comprende la casilla de piedra de 1903 (Casa Omond), la casilla meteorológica y observatorio magnético de 1905 (Casa Moneta) y un cementerio de doce tumbas, la más antigua de 1903. Todos sus elementos están dentro de los límites de la estación. Los muros de piedra de Casa Omond están en pie solo en parte; Casa Moneta está en buen estado y funciona como museo. | https://www.ats.aq/devph/en/apa-database/119 | Secretaría del Tratado Antártico |
| Coordenadas de la estación 60°44′25,6″ S, 44°44′24,3″ O; 8 m de altitud; 2101 m² bajo techo; 76 m² de laboratorios; 266 m² de área logística; 52 camas; suelo libre de hielo; costa con playas aptas para botes y morena. | https://www.comnap.aq/s/Argentina_Catalogue_Aug2017.pdf | COMNAP |
| Estación meteorológica 0-20000-0-88968 en −60,73775, −44,73846; elevación 8 m; barómetro a 12 m. | https://oscar.wmo.int/surface/rest/api/search/station?wigosId=0-20000-0-88968 | OMM (OSCAR/Surface) |
| La base está en el istmo Ibarguren, entre las bahías Scotia y Uruguay. | https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas | Cancillería Argentina |

## Lo que solo dicen fuentes secundarias (no se usa sin confirmar)

- Área total de 4800 m² y 11 edificios (6044sur.com). Otras listas secundarias (Hispanopedia, Fundación Marambio) nombran 14 o más instalaciones: casa principal, casa de emergencia, capilla, Casa Moneta, Casa Omond, laboratorio de biología, estación sismográfica, casa Pampa (radio), dos usinas, casa variómetro, depósitos y galpones. Las cuentas no coinciden.
- La casa principal se incendió el 25 de agosto de 1975 y la nueva casa se empezó a construir en la campaña 1979/80 (Hispanopedia).
- Distancia a la costa de 170 m y altitud de 4 m (Wikipedia). La altitud de 4 m contradice a COMNAP y OSCAR, que dan 8 m.

## Lo que no se pudo conseguir

- **Posición, planta y orientación de cada edificio.** Ninguna fuente primaria de texto las publica. El HSM 42 no tiene un plan de gestión con mapa: la «Medida 18 (2022)» solo actualiza la lista de sitios históricos. Los informes de inspección del Tratado revisados (2005, 2012 y 2023) no describen Orcadas; la última inspección registrada de la estación es de 1994-95.
- **Imagen satelital de referencia.** Sentinel-2 (10 m por píxel) sirve para la costa y el istmo, pero no para ubicar cada edificio, y descargarla pide una cuenta de Copernicus. No se midió nada todavía.
- **Relieve (REMA).** Sin revisar.

## Plantas medidas: OpenStreetMap (12 de noviembre de 2026)

OpenStreetMap tiene dibujadas las plantas de la base. Las cargaron en 2015 a partir de fotos de la base (changeset 32656012), en 2019 las corrigieron con imágenes satelitales Maxar (changesets 71749331 y 73047667) y les sumaron nombres.

- Fuente: https://www.openstreetmap.org/#map=18/-60.7378/-44.7375. Datos descargados con la API 0.6 (`map?bbox=-44.7480,-60.7420,-44.7300,-60.7340`).
- Licencia: ODbL 1.0. Si se usan las posiciones o las plantas en la app, hay que atribuir «© colaboradores de OpenStreetMap» en Fuentes.
- Coordenadas pasadas a metros locales con origen en la estación OMM 88968 (−60,73775, −44,73846; OSCAR), con x hacia el este y z hacia el norte.

Con esto, las plantas, posiciones y rumbos se pueden marcar como `medido`. La función de cada edificio solo está confirmada donde OSM la nombra: «Omond House», tanques de combustible, usina, cementerio, helipuerto, torres de comunicación y correo. Los demás figuran en OSM como `building=yes`, sin función. Casa Moneta no tiene nombre en OSM.

| OSM way | Etiquetas OSM | Planta (m) | Centro (m E, m N) desde OMM 88968 | Rumbo del lado largo |
|---|---|---|---|---|
| 360745959 | building=yes, building:colour=#FF4500, building:levels=1, roof:colour=#FF4500, roof:shape=round | 29.2 × 10.6 | 110, -40 | 135° |
| 360745960 | building=yes | 48.4 × 9.6 | 69, -107 | 138° |
| 360745961 | building=yes, building:colour=#FF4500, building:levels=1, roof:colour=#FF4500, roof:shape=round | 8.1 × 6.2 | 81, -14 | 136° |
| 360745962 | building=yes, building:colour=#FF4500, building:levels=1, roof:colour=#FF4500, roof:shape=gabled | 10.6 × 10.4 | 33, -55 | 138° |
| 360745963 | building=yes, building:colour=#FF4500, building:levels=1, roof:colour=#FF4500, roof:shape=round | 7.4 × 6.6 | 63, -149 | 139° |
| 360745964 | building=yes, building:colour=#FF4500, building:levels=1, roof:colour=#FF4500 | 5.4 × 3.8 | 25, -84 | 47° |
| 360745965 | building=yes, building:colour=#FF4500, building:levels=1, roof:colour=#FF4500, roof:shape=gabled | 10.5 × 8.9 | 20, -67 | 138° |
| 360745966 | building=yes, building:colour=black, building:levels=1, roof:shape=gabled | 37.2 × 7.8 | 5, 33 | 136° |
| 360745967 | building=yes, building:colour=#FF4500, building:levels=1, roof:colour=#FF4500, roof:shape=gabled | 11.2 × 10.2 | 38, -77 | 48° |
| 360745969 | building=yes, building:colour=#FF4500, building:levels=1, roof:colour=#FF4500, roof:shape=gabled | 19.2 × 10.7 | 4, -82 | 48° |
| 360745970 | building=yes, building:colour=black, building:levels=1, roof:colour=black | 13.1 × 5.5 | 51, 2 | 164° |
| 360745971 | building=yes, building:colour=#FF4500, building:levels=1, roof:colour=#FF4500, roof:shape=gabled | 14.0 × 9.8 | 35, 18 | 138° |
| 360745972 | building=yes, building:colour=#FF4500, building:levels=1, roof:colour=#FF4500 | 7.7 × 5.3 | 6, 80 | 50° |
| 700625939 | landuse=cemetery | 20.3 × 19.9 | -141, -49 | 10° |
| 700625940 | generator:source=oil, power=generator | 9.0 × 6.6 | 80, -167 | 143° |
| 700625941 | building=yes, name=Omond House | 9.0 × 4.6 | 97, -206 | 45° |
| 700625942 | building=yes, content=fuel, man_made=storage_tank | 10.0 × 7.9 | 79, -187 | 129° |
| 711216662 | building=yes | 4.5 × 3.9 | 29, 76 | 46° |
| 711216663 | building=yes | 10.9 × 4.4 | 59, 45 | 52° |
| 711216664 | building=yes | 5.3 × 5.0 | 122, -25 | 127° |
| 711216665 | building=yes | 4.5 × 3.7 | -108, -46 | 0° |
| 711216666 | building=yes | 9.1 × 3.9 | -86, -24 | 91° |
| 1198904156 | aeroway=helipad | 24 vértices | 152, -80 | — |
| nodo 1042059541 | aeroway=aerodrome, capacity:persons=65, ele=4 | — | 42, -36 | — |
| nodo 3653005101 | man_made=tower, tower:type=communication | — | 48, 34 | — |
| nodo 3653005104 | man_made=tower, tower:type=communication | — | 56, 25 | — |
| nodo 3653005111 | man_made=tower, tower:type=communication | — | -26, 9 | — |
| nodo 3653005115 | man_made=tower, tower:type=communication | — | -15, -7 | — |
| nodo 3653006043 | man_made=tower, seamark:radio_station:category=omnidirectional, seamark:type=radio_station | — | 92, -85 | — |
| nodo 6579492672 | amenity=post_office, name=Correo Base Naval Orcada, operator=Correo Argentino | — | 101, -35 | — |
| nodo 6686670386 | man_made=tower, seamark:beacon_special_purpose:shape=pole, seamark:information=on radio | — | 57, -69 | — |


### Fotos de referencia (Wikimedia Commons; solo para colores y techos, no se incrustan)

| Archivo | Licencia | Autor | Fecha | Qué muestra |
|---|---|---|---|---|
| File:Orcadas Base.jpg | CC BY-SA 3.0 | Antarctic96 | 26 dic 1996 | Pabellones rojos de techo abovedado sobre pilotes, torres de radio de reticulado, casas oscuras de madera a la derecha. |
| File:SeMo-218 (49435353546).jpg | CC BY-SA 2.0 | SeMo (Flickr) | 15 ene 2020 | Mástil con la bandera, cartel «Bienvenidos Base Orcadas», pabellón naranja con zócalo negro, dos torres reticuladas. |
| File:SeMo-216 (49435352836).jpg | CC BY-SA 2.0 | SeMo (Flickr) | 15 ene 2020 | Cementerio junto a la costa, con cruces blancas y una pirca. |
| File:SeMo-214 (49435572862).jpg | CC BY-SA 2.0 | SeMo (Flickr) | 15 ene 2020 | Casilla roja de chapa a dos aguas junto a la costa de grava, con el frente de un glaciar al fondo. |

Lo que surge de las fotos: los edificios actuales son naranja o rojo (OSM: `#FF4500`), con zócalo negro y techo abovedado (`roof:shape=round`) o a dos aguas. El suelo es grava gris. Las torres de radio son de reticulado rojo y blanco.

## Tabla de elementos (borrador anterior, sin OSM)

Posición en metros desde el mástil de la bandera (x al este, z al norte). Todo lo marcado `[Fuente a definir]` no se dibuja hasta tener fuente.

| id | Nombre y función | Planta (m) | Altura y pisos | Posición | Orientación | Época | Fuente | Confianza |
|---|---|---|---|---|---|---|---|---|
| `omond` | Casa Omond, casilla de piedra (ruina parcial) | [Fuente a definir] | [Fuente a definir] | [Fuente a definir] | [Fuente a definir] | 1903 | HSM 42 (ATS) | existencia y época: medido; resto: `[Fuente a definir]` |
| `moneta` | Casa Moneta, casilla meteorológica y observatorio magnético; hoy museo | [Fuente a definir] | [Fuente a definir] | [Fuente a definir] | [Fuente a definir] | 1905 | HSM 42 (ATS), Cancillería | existencia y época: medido; resto: `[Fuente a definir]` |
| `cemetery` | Cementerio de 12 tumbas | [Fuente a definir] | — | «junto a» las casas (COMNAP) | — | 1903 | HSM 42 (ATS), COMNAP | existencia: medido; posición: `[Fuente a definir]` |
| `radioMast` | Estación radiotelegráfica | [Fuente a definir] | [Fuente a definir] | [Fuente a definir] | — | 1927 | Cancillería | existencia y época: medido; resto: `[Fuente a definir]` |
| `modern` | Casa principal actual | [Fuente a definir] | [Fuente a definir] | [Fuente a definir] | [Fuente a definir] | 1979/80 (secundaria) | Hispanopedia | `[Fuente a definir]` |
| `laborc` | Laboratorio LABORC | [Fuente a definir] | [Fuente a definir] | [Fuente a definir] | [Fuente a definir] | [Fuente a definir] | Cancillería (existencia) | existencia: medido; resto: `[Fuente a definir]` |
| `flag` | Mástil de la bandera (punto fijo) | — | — | 0, 0 | — | 1904 | Cancillería (traspaso) | referencia del sistema |
| `screen` / `windMast` | Instrumentos meteorológicos | — | — | [Fuente a definir] | — | [Fuente a definir] | OSCAR (estación activa) | `[Fuente a definir]` |

## Cómo se dibuja: escenario de frente (decisión del 13 de noviembre de 2026)

Se probaron dos versiones sobre el plano real: a escala (6 m por unidad) y como maqueta compacta (distancias acortadas). En las dos la base quedaba desparramada, con edificios tapados y mucho suelo vacío, y la escena se leía como un plano. Lk aprobó cambiarla por un escenario:

- **Selección:** se dibujan ocho elementos del sitio medido (`DIORAMA_ELEMENT_IDS` en `orcadas-layout.ts`): mástil de viento, abrigo, Casa Omond, bandera, dos pabellones naranjas (OSM 360745961, de techo abovedado, y 360745962, a dos aguas), una torre de radio y el bote. No se dibujan el cementerio, la usina, el tanque, el helipuerto ni los demás módulos.
- **Qué sale de OSM:** qué edificio es, su planta (largo y ancho, a 3,5 m por unidad), su color y su techo.
- **Qué es ilustrativo:** dónde está cada pieza. Van en fila frente a la cámara, de izquierda a derecha, sobre un istmo dibujado entre Bahía Scotia (adelante) y Bahía Uruguay (atrás). También son ilustrativos el relieve, la loma de la pingüinera y la altura de la torre (OSM no la da; se dibuja de 15 m).
- **Agrandados para que se vean:** abrigo, mástil de viento, bandera y animales.
- **Vista fija:** la cámara mira el escenario de frente, baja, desde Bahía Scotia. Al entrar se ve siempre la misma toma. Se puede girar 35° a cada lado, subir hasta 38° y acercar o alejar dentro de un rango.

La etiqueta «Reconstrucción ilustrada» lo dice así: disposición ilustrativa, no a escala; una selección de edificios con su forma y sus colores según OpenStreetMap, acomodados en fila para que se vean; alturas aproximadas; animales, instrumentos y bandera agrandados; relieve y pingüinera ilustrativos.

Las plantas, rumbos y posiciones medidas de la tabla de arriba siguen en `orcadas-site.ts` como referencia, con su prueba (`orcadas-site.test.ts`).
