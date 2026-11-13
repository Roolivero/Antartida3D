# Expedición #4 — Desde Ushuaia

Contenido verificado para la expedición **«Desde Ushuaia»** (issue #4): el viaje, solo de ida, desde Ushuaia hasta la Antártida en los medios científicos argentinos.

- **Fecha de consulta de todas las fuentes:** 2026-11-11.
- **Fuentes:** cada afirmación lleva su código `[U#]`, `[O#]` o `[I#]`, del [catálogo de fuentes](./desde-ushuaia-fuentes.md).
- **Reglas del eje 2:** un dato sin fuente no se publica; queda en la sección «Pendiente». Las simulaciones y reconstrucciones se marcan como tales en la interfaz.
- **Alcance:** medios científicos y argentinos. El turismo se menciona solo como contexto (sección 7).
- Este texto fue redactado con asistencia de IA a partir de páginas abiertas por agentes. **Quien revise el PR debe abrir las fuentes nuevas** y confirmar que dicen lo que se afirma.

## Tipos de contenido en la interfaz

| Etiqueta | Qué es |
| :--- | :--- |
| **Dato real** | Afirmación respaldada por la fuente citada. |
| **Estimación** | Cálculo propio a partir de datos de fuente (se indica el cálculo). |
| **Ruta ilustrativa** | El trazado entre puntos de anclaje no es la derrota real: no existe fuente pública. |
| **Ilustración** | Animales, témpanos y modelos 3D. Representativos, no son posiciones ni medidas reales. |

---

## 1. Por qué se parte desde Ushuaia

- Ushuaia está a unos **1.000 km de la Península Antártica** `[U3]` `[O21]`.
- Tiene «características naturales de puerto de aguas profundas y bahía abrigada» `[U4]`.
- En una campaña antártica tradicional, el Irízar hace tres etapas: «Buenos Aires - Bahía Blanca - Antártida - Ushuaia», «Ushuaia - Antártida (Base Belgrano II) - Ushuaia» y «Ushuaia - Antártida - Buenos Aires» `[O1]`. En la campaña 2025/26 la etapa 3 salió de Ushuaia y volvió a Ushuaia `[O22]` `[O23]`.
- Tierra del Fuego, Antártida e Islas del Atlántico Sur es una provincia por la **Ley 23.775** (1990) `[O18]`. La capital, Ushuaia, la fija la **Constitución provincial (1991), art. 3** `[O19]`. El Sector Antártico Argentino «forma parte del territorio de la Provincia», aunque está sujeto al régimen del Tratado Antártico `[O28]`.

## 2. Tres formas de cruzar (elige el usuario)

### 2.1. Rompehielos ARA *Almirante Irízar* (Q-5)

- Es «el buque insignia del Comando Conjunto Antártico» `[O5]`.
- Datos de ficha: eslora 121,3 m, manga 25,2 m, desplazamiento 14.140 t a plena carga, velocidad de crucero 14 kt `[O5]`.
- Campaña 2025/26, etapa 3: salió de Ushuaia con 65 t de carga y 260 tambores y tubos de gasoil antártico, gas y aceites; abasteció San Martín, Esperanza y Carlini y cerró Brown y Primavera `[O22]`. Duró 20 días y volvió al muelle comercial de Ushuaia tras cruzar el Drake `[O23]`.
- En la campaña 2024/25, de regreso de Carlini a Ushuaia, cruzó el Drake «en menos de dos días», a 14 nudos de promedio `[O16]`.
- Lleva dos helicópteros Sea King `[O16]`. En Marambio, que está en una meseta, la carga y el personal pasan del buque a la base solo con un Sea King `[O24]`. (La página de logística de la Cancillería dice «Super Puma»; se usa lo que publica la Armada.)
- **Estimación** (cálculo propio): 1.000 km a 14 kt son unas 39 h. El recorrido dibujado, que termina frente a Marambio, mide unos 1.350 km: unas 52 h. La ficha del buque da las dos cifras, para que coincida con la barra del viaje.

### 2.2. Avión Hércules C-130 (Fuerza Aérea Argentina)

- Los C-130 cubren el cruce entre «Río Gallegos o Ushuaia» y la Base Marambio `[O10]`.
- En abril de 2026 un C-130 de la I Brigada Aérea acompañó el cruce de un Twin Otter con escala en Ushuaia `[O15]`.
- Desde Río Gallegos el vuelo dura unas tres horas y media `[O14]`.
- El primer C-130 aterrizó en Marambio el **11 de abril de 1970** (C-130H TC-61, salido de Río Gallegos) `[O13]`.
- Distancia Ushuaia–Marambio: unos 1.230 km. **Estimación** (ortodrómica calculada; ninguna fuente del catálogo da la distancia).

### 2.3. Aviso ARA *Puerto Argentino* (A-21)

- En la campaña 2025/26 zarpó de Puerto Belgrano a principios de noviembre Como Buque de Servicio Antártico hizo patrullas, mantuvo balizas y abasteció bases. Además cumplió tareas de **Buque de Estación desde la ciudad de Ushuaia** `[O7]`.
- Eslora 81,37 m, manga 16,3 m, desplazamiento 2.723 t, velocidad 15 kt, autonomía de 40 días a 12 kt `[O6]`.
- En la etapa final zarpó de Ushuaia junto al Irízar y cerraba el reaprovisionamiento de la base Petrel `[O22]`.

## 3. La ruta y sus hitos

**Ruta ilustrativa:** no existe fuente pública de la derrota real de los buques ni de los aviones. Solo algunos puntos de anclaje tienen fuente; el trazado entre ellos lo armó un agente de IA y es **aproximado**. Hay que validarlo contra la costa en alta resolución antes de publicarlo, porque el Beagle tiene 1,8 km de ancho en un punto.

Puntos `[lon, lat]` (WGS84) de partida para la ruta marítima. Marcados `fuente` si salen de una fuente citada; el resto es **estimación**:

1. `[-68.30, -54.81]` Puerto de Ushuaia (estimación: sin coordenada oficial, ver «Pendiente»)
2. `[-67.60, -54.90]` Canal Beagle hacia el este (estimación; el canal está a 54°53′ S `[U1]`)
3. `[-67.00, -54.92]` cerca del paso Mackinlay (estimación)
4. `[-66.50, -55.05]` boca oriental del Beagle (solo la longitud, unos 66°30′ O, sale de `[U1]`; la latitud es estimación)
5. `[-66.80, -56.20]` al sur y al este del Cabo de Hornos (estimación)
6. `[-65.20, -58.00]` Drake central (estimación)
7. `[-63.50, -60.00]` cruce de 60° S (estimación)
8. `[-61.80, -61.80]` llegada a las Shetland del Sur (estimación)
9. `[-60.63, -62.95]` Isla Decepción (`fuente` `[I9]`)
10. `[-58.50, -63.20]` Estrecho de Bransfield (estimación)
11. `[-57.00, -63.40]` Esperanza (`fuente` `[O2]`)
12. `[-56.62, -64.23]` Marambio (`fuente` `[O2]`)

**Los buques no llegan hasta la base.** El viaje en buque termina 7 unidades de mapa antes del final de la ruta (`SHIP_ANCHORAGE`, en `packages/core/src/voyage.ts`): en 63,79° S, 56,39° O, a unos 51 km de la base y con unos 46 km de mar hasta la costa de la isla (cálculo propio sobre el relieve del mapa). Queda tan lejos porque el buque se dibuja agrandado: más cerca taparía la isla. La base está sobre una meseta y el traslado es en helicóptero `[O24]`. **Ilustrativo:** la fuente solo dice que el rompehielos trabajó «frente a la base»; no dice dónde. El pin del hito «Base Marambio» queda en la base. La línea de la ruta del mapa 2D sigue llegando hasta la base.

La ruta aérea Ushuaia → Marambio es una **ortodrómica calculada** (la derrota real del C-130 es pendiente).

| Hito | Datos con fuente |
| :--- | :--- |
| **Canal Beagle y Ushuaia** | Mide unos 180 km y conecta el extremo sur del Pacífico con el del Atlántico. Profundidad máxima de 300 m. Ancho medio de 5 km y mínimo de 1,8 km en el paso Mackinlay (isla Gable), que tiene solo 30 m de profundidad. Es un valle tectónico cubierto por hielo en la última glaciación. La costa sur son las islas Hoste y Navarino (Chile) `[U1]`. |
| **Salida al mar abierto** | El canal se abre al Atlántico por su boca oriental, cerca de 66°30′ O `[U1]`. Desde allí la ruta ilustrativa gira al sur hacia el Drake. |
| **Fauna del Beagle** | Dos especies de lobo marino viven en las islas del canal (el sudamericano todo el año y el de dos pelos entre febrero y agosto). El cormorán imperial es el ave marina más abundante `[O20]`. |
| **Cabo de Hornos** | El holandés Willem Schouten trazó por primera vez un rumbo alrededor del cabo en 1616 `[I5]` (quién lo nombró queda en «Pendiente»). Cientos de barcos se hundieron allí. Al sudoeste el fondo sube de 4.020 m a 100 m en pocos kilómetros y, junto a los vientos del oeste, levanta olas enormes `[I5]`. |
| **Pasaje de Drake** | Unos 800 km de ancho entre el Cabo de Hornos y las Shetland del Sur. Es famoso por sus temporales, a causa de las bajas presiones y de profundidades de más de 4.000 m; se registraron vientos de más de 50 nudos y olas de 10 m `[O46]`. La tormenta dibujada en el mapa es ilustrativa. Por él pasa la Corriente Circumpolar Antártica, con un flujo medio de 173,3 Sv (30 % más que el valor clásico de 134 Sv), medido entre 2007 y 2011 `[I6]`. |
| **Convergencia Antártica** | Límite norte de la zona antártica. En el frente, la temperatura de la superficie del mar ronda los 5–6 °C `[I7]`. Alrededor del continente se ubica entre los 44° y los 64° S, con un cambio medio de 1,7 °C cada 100 km `[I8]`. |
| **Paralelo 60° S** | El Tratado Antártico se aplica al sur de los 60° de latitud sur, incluidas todas las barreras de hielo (art. VI; traducción propia del texto en inglés) `[I1]`. Argentina es uno de los 12 firmantes originales `[O12]`. El punto exacto en que la ruta lo cruza es una **estimación**. |
| **Islas Shetland del Sur y Decepción** | Isla Decepción es una caldera inundada, con forma de herradura, y su única entrada son los Fuelles de Neptuno, de unos 500 m de ancho. `[I9]`. Se registraron erupciones en 1842, 1967, 1969 y 1970 `[U2]`. |
| **Marambio** | Fundada el **29 de octubre de 1969**. Es la única base argentina con pista para aviones de carga y pasajeros, a unos 200 m sobre el nivel del mar `[O2]` `[O24]`. Fue «la primera pista de aterrizaje de tierra, precisamente permafrost, en el Continente Antártico» `[O12]`. |

## 4. Las bases argentinas

- La Argentina tiene **13 bases: 7 permanentes y 6 temporarias** `[O8]`.
  - Permanentes: Orcadas, Carlini, Esperanza, Marambio, San Martín, Belgrano II y Petrel.
  - Temporarias: Brown, Decepción, Cámara, Primavera, Melchior y Matienzo.
- **Discrepancia entre fuentes oficiales:** el Comando Conjunto Antártico `[O8]` y la Armada `[O2]` listan Petrel como permanente. Se reabrió el 15 de noviembre de 2021 `[O33]`. La página de bases de la Cancillería todavía la muestra como temporaria y cuenta 6 permanentes y 7 temporarias `[O34]`. Se usa la versión del COCOANTAR y la Armada.
- **Orcadas** (isla Laurie, 60°45′ S, 44°43′ O) se fundó el 22 de febrero de 1904 y es «la más antigua de todas las bases ubicadas en la Antártida» `[O2]`. El escocés William Bruce donó su observatorio al Estado argentino a fines de 1903 y lo entregó el 22 de febrero de 1904 `[O25]`.
- **Esperanza:** «la única base argentina en la que viven familias y tiene una escuela» `[O2]`.
- **San Martín:** «la primera instalación argentina al sur del Círculo Polar Antártico» `[O2]`.
- Coordenadas verificadas: Carlini 62°14′ S 58°40′ O, Marambio 64°14′ S 56°37′ O, Esperanza 63°24′ S 57°00′ O, Orcadas 60°45′ S 44°43′ O `[O2]`.
- **Decepción:** las fuentes no coinciden en la posición de la base. La Armada da 62°52′ S 60°43′ O `[O3]` y el plan de gestión ZAEA n.º 4 da 62°58′20″ S 60°41′40″ O `[I9]` (la isla está a 62°57′ S 60°38′ O). No se muestra una coordenada de la base hasta unificarla.

## 5. Historia que acompaña el viaje

- **Corbeta ARA *Uruguay*, 1903:** al mando de Julián Irízar, rescató a la expedición sueca de Nordenskjöld, en la que participaba el alférez José María Sobral. Según la Armada zarpó el 8 de octubre de 1903, con un paso por Ushuaia `[O17]`. La página histórica de la Armada dice «mayo de 1903», una contradicción interna de la fuente `[O4]`.
- **Orcadas, 22 de febrero de 1904:** ver sección 4.
- **Instituto Antártico Argentino, 1951:** según la Cancillería, «el primer organismo mundial dedicado exclusivamente a las investigaciones científicas antárticas». No hay confirmación independiente, por eso se atribuye `[O11]`.
- **Marambio, 1969–1970:** la base se fundó el 29 de octubre de 1969. La inauguró oficialmente el Fokker F-27 TC-77 `[O26]`. Las fuentes oficiales no coinciden en cuál fue el primer avión en aterrizar: la Fuerza Aérea da el Beaver P-03 (25 de septiembre de 1969) y luego el C-47 TA-05 `[O26]`; otra nota oficial da el C-47 TA-05 `[O27]`. No se afirma cuál. El primer C-130 llegó el 11 de abril de 1970 `[O13]`.
- **Primer viaje turístico, 1958:** el 16 de enero de 1958 zarpó de Ushuaia el ARA *Les Eclaireurs* con 98 pasajeros, por iniciativa del Estado argentino. En enero de 1958 hubo un segundo viaje con 96 pasajeros, `[U4]`: los dos suman 194 (suma propia). Fue una iniciativa estatal `[U5]`.

## 6. Cuidado del ambiente

- El **Protocolo de Madrid** se firmó el 4 de octubre de 1991 y entró en vigor en 1998. Designa a la Antártida como «reserva natural dedicada a la paz y a la ciencia» (art. 2) `[I2]`.
- **Residuos (Anexo III, art. 2.1):** «serán removidos del área del Tratado Antártico por los generadores de dichos residuos». La lista incluye baterías, combustibles, metales pesados, aceites lubricantes y plásticos. Solo los bidones y tambores y los residuos sólidos incombustibles pueden quedar si sacarlos causaría un daño ambiental mayor `[I3]`.
- **Perros:** el Anexo II original (1991, art. 4.2) pedía retirarlos antes del 1 de abril de 1994 `[I4]`. La versión enmendada (Medida 16 de 2009) dice: «No se introducirán perros en tierra, en las barreras de hielo o en el hielo marino» `[I19]`.

## 7. Turismo (contexto, sin mecánica propia)

- Ushuaia concentra entre el 85 % y el 90 % del flujo turístico antártico desde mediados de los años 90 `[U3]`. Los porcentajes de otras fuentes varían con el año y el criterio (INFUETUR da 92 % para 2008-09 `[O21]`; IAATO no da porcentaje `[I10]`).
- El cruce del Drake en buque turístico lleva unas 36 horas según la tesis de la UNS `[U6]`.
- El turismo no es parte del eje de este proyecto: no se ofrece como transporte jugable.

## 8. Fauna del viaje (avistajes)

Animales que pueden aparecer durante el viaje, por zona (ver [diseño](./desde-ushuaia-diseno.md)). Solo entran especies con fuente abierta y leída. Las **posiciones y los movimientos son ilustrativos**: ninguna fuente respalda dónde está cada animal en un momento dado, ni cómo se mueve en pantalla (planeo, nado a saltos). **La asignación a cada zona también es ilustrativa** salvo donde la fuente nombra el lugar: las fuentes de las zonas B y D dan rangos de latitud o son fichas circumpolares, y no mencionan el Drake ni la Península. No se publican categorías de la UICN hasta verificarlas.

**Zona de cada animal (revisado el 11-11-2026).** Los 14 animales del viaje tienen una fuente que los registra en el tramo donde aparecen. La ficha de cada uno incluye ese dato:

| Animal | Tramo | Qué dice la fuente | Fuente |
| :--- | :--- | :--- | :--- |
| Cormorán imperial, lobos marinos, delfín austral | Canal Beagle | Ver tabla A | `[O20]` `[O30]` `[U7]` |
| Albatros errante | Pasaje de Drake | Conteos desde barco el 19-20 de marzo de 1998 y 2000: de 0,14 a 0,52 aves por hora según la franja de latitud | `[I22]` |
| Petrel gigante del sur | Pasaje de Drake | Mismos conteos: de 1,40 a 4,70 aves por hora | `[I22]` |
| Delfín cruzado | Sur del Drake | Relevamientos de 2003 a 2011: avistajes en aguas profundas al norte de las Shetland del Sur, grupos de 2 a 6 | `[I23]` |
| Foca leopardo | Shetland del Sur | Censo semanal de focas en el cabo Shirreff (isla Livingston) en la mayoría de los veranos desde 1997 | `[I21]` |
| Pingüino barbijo | Shetland y Bransfield | ANTAR XXVI: 472 individuos (16,70 %); los pingüinos tuvieron mayor presencia en el Estrecho de Bransfield | `[O31]` |
| Ballena jorobada, petrel damero | Bransfield | Ver tabla C | `[O32]` `[O31]` |
| Orca | Bransfield | ANTAR XXVI: 1 avistamiento, 2 individuos, en el Estrecho de Bransfield cerca de la isla Trinidad | `[O32]` |
| Pingüino de Adelia | Bahía Esperanza | Colonia de unas 104.139 parejas en 2012-13, una de las más grandes de la Antártida | `[O36]` |
| Foca de Weddell | Bahía Esperanza | 217 muestras de heces recolectadas allí en los veranos de 2003 a 2005; come sobre todo plateado antártico | `[O38]` |
| Foca cangrejera | Isla Marambio | Relevamientos aéreos de 2015 a 2017 en el estrecho Bouchard; 96 ejemplares momificados en la isla | `[O37]` |

**Las fichas hablan del animal, no del registro.** Los conteos y campañas de la tabla de arriba respaldan la zona, pero no se muestran en la ficha: ahí va un dato sobre el animal (qué come, cómo caza, cómo es). Por eso `[I22]`, `[I21]`, `[O31]`, `[O32]`, `[O37]` y `[U8]` están en el catálogo de fuentes pero no en la página de fuentes de la aplicación. Datos de ficha sumados el 11-11-2026: orca, petrel damero y pingüino barbijo, de las fichas de especie de la Australian Antarctic Division `[I16]`; ballena jorobada, de `[O29]` y `[I15]`.

El punto exacto, el momento y los movimientos siguen siendo ilustrativos. La interfaz ya no lo dice: el aviso se quitó de la pantalla de elección de vehículo el 11-11-2026 y queda solo en esta documentación. La foca leopardo se movió de la costa de la Península a las Shetland porque solo ahí tiene registro (los estudios argentinos sobre ella son de la costa de Danco, fuera de la ruta).

**Fuentes universitarias:** no se encontró ninguna publicación de la UNTDF sobre la fauna de la ruta (su repositorio no está indexado en línea). Hay trabajos de CADIC-CONICET (Ushuaia), tesis de la UNLP y de la UBA. Alguien del equipo puede buscar a mano en el repositorio de la UNTDF.

### A. Canal Beagle (unos 54,8° S)

| Especie | Dato curioso | Fuente |
| :--- | :--- | :--- |
| Ballena jorobada (*Megaptera novaeangliae*) | Cada ballena se reconoce por el diseño de la parte inferior de la cola, «como si fuesen huellas digitales». El catálogo del Beagle superó los 100 individuos. En 2013 se quedaron de febrero a abril. | `[O29]` |
| Cormorán imperial (*Leucocarbo atriceps*) | Es el ave marina más abundante del canal `[O20]`. En el verano 2008-09 anidaba en 5 islas del sector argentino, con 7.703 nidos activos. Bucea hasta 40 m en el Beagle (dato de un trabajo inédito citado en la fuente) `[O30]`. | `[O20]` `[O30]` |
| Delfín austral (*Lagenorhynchus australis*) | Especie costera del archipiélago fueguino: se distribuye hasta el Cabo de Hornos. Se lo ve en los bosques de macroalgas (*Macrocystis pyrifera*) o cerca de ellos. | `[U7]` |
| Lobos marinos | Dos especies viven en las islas del canal: el sudamericano todo el año y el de dos pelos entre febrero y agosto. | `[O20]` |

### B. Pasaje de Drake (aprox. 55–62° S; el reparto norte/centro/sur no tiene fuente)

| Especie | Dato curioso | Fuente |
| :--- | :--- | :--- |
| Albatros errante (*Diomedea exulans*) | Los que crían en Georgias del Sur se mueven desde el sur de Brasil (25° S) hasta la Península Antártica (68° S). Las aves que crían se alimentan hasta a 4.000 km de su colonia (dato general de la especie). | `[I11]` |
| Petrel gigante del sur (*Macronectes giganteus*) | Es carroñero: en los regurgitados de los pichones aparecen sobre todo restos de pingüino y también carne de foca. Cría en Isla de los Estados, Diego Ramírez, Shetland del Sur y la Península. | `[I12]` |
| Delfín cruzado (*Lagenorhynchus cruciger*) | Es pelágico y circumpolar (de 45° S a cerca de 68° S). Nada en la proa de los barcos dando saltos. | `[I14]` |

### C. Shetland del Sur y Estrecho de Bransfield (aprox. 61–63,5° S)

| Especie | Dato curioso | Fuente |
| :--- | :--- | :--- |
| Ballena jorobada | Fue el cetáceo más abundante de la campaña peruana ANTAR XXVI: 207 individuos entre Bransfield, Joinville e isla Elefante, concentrados sobre todo en Bransfield. Algunas poblaciones del mundo nadan unas 5.000 millas entre zonas de cría y de alimentación. | `[O32]` `[I15]` |
| Rorcual común (*Balaenoptera physalus*) | Es la segunda ballena más grande del mundo, de 75 a 85 pies (unos 23 a 26 m, conversión propia). En esa campaña se vieron 49 individuos, sobre todo cerca de isla Elefante. | `[I15]` `[O32]` |
| Petrel damero (*Daption capense*) | Fue el ave más abundante de esa campaña en Bransfield e isla Elefante (809 individuos, 28,6 %). | `[O31]` |
| Pingüino barbijo (*Pygoscelis antarcticus*) | Los pingüinos del género *Pygoscelis* suman el 70 % de la biomasa de aves de la Antártida (dato de 1977 citado por la tesis). Anida en la Península y en islas al sur de la Convergencia. | `[U8]` `[O31]` |
| Elefante marino del sur (*Mirounga leonina*) | Se reproduce en la Península Potter (isla 25 de Mayo), donde está Punta Stranger. Los machos llegan a 3.000 kg y aguantan hasta 2 h bajo el agua. | `[U8]` `[I16]` |
| Lobo marino antártico (*Arctocephalus gazella*) | Se reproduce en Shetland del Sur y Orcadas. Los machos de lobo marino llegan a 200 kg (la ficha cubre tres especies). La caza lo diezmó y después se recuperó. | `[I16]` |

### D. Costa de la Península y norte del Weddell (aprox. 63–65° S; zona aproximada)

| Especie | Dato curioso | Fuente |
| :--- | :--- | :--- |
| Pingüino papúa (*Pygoscelis papua*) | Cría en la Península. Se registró un buceo de 146 m en Punta Stranger (isla 25 de Mayo, Shetland del Sur). | `[U8]` `[I16]` |
| Pingüino de Adelia (*Pygoscelis adeliae*) | Arma el nido con piedritas y nada a 4–8 km/h. En Punta Stranger (isla 25 de Mayo, Shetland del Sur) se registró un buceo de 118 m. | `[U8]` `[I16]` |
| Foca leopardo (*Hydrurga leptonyx*) | Caza pingüinos y los sacude para sacarles la piel. Las hembras superan los 3,5 m y los 500 kg. | `[I16]` |
| Foca cangrejera (*Lobodon carcinophagus*) | No come cangrejos sino krill, que filtra con dientes especiales. Con unos 15 millones, es la foca más abundante. | `[I16]` |
| Foca de Weddell (*Leptonychotes weddellii*) | Es el mamífero que vive permanentemente más al sur. Bucea hasta 720 m y 45 minutos, y abre agujeros en el hielo con los dientes. | `[I16]` |
| Ballena minke (la ficha usa *Balaenoptera acutorostrata* y habla de dos formas) | Es muy curiosa: rodea a los barcos chicos. En verano prefiere el hielo abierto (ficha de 2010). | `[I16]` |

### Témpanos

- Un témpano es hielo que se desprende de glaciares o barreras de hielo y flota en mar abierto. Los tabulares tienen paredes empinadas y techo plano. Según su altura sobre el agua, un témpano supera los 16 pies (unos 5 m); el *bergy bit* mide entre 3 y 16 pies; el *growler* queda por debajo de 3 pies, «del tamaño de un camión o un piano de cola» `[I17]`.
- Dato argentino: en 1986 se desprendieron unos 13.000 km² de la barrera Filchner y formaron tres témpanos (1986 A, B y C). Sobre el A estaba la base Belgrano I, abandonada en 1980. La barrera medía entre 230 y 520 m de espesor `[I18]`.
- La frase «el 90 % del témpano está bajo el agua» **no tiene fuente abierta**: no se publica.

**Descartadas o pendientes:** ballena azul (hay ficha de NOAA, pero ningún registro para esta ruta), «rorcual aliblanco» (nombre ambiguo), delfín cruzador, y el petrel damero en el Drake propiamente dicho (solo hay registros ciudadanos).

## 8 bis. Lugares del viaje

Lugares que se pueden abrir durante el viaje en barco, igual que los avistajes de fauna. Fuentes leídas el 11-11-2026. **La posición en el mapa es aproximada:** las coordenadas no salen de las fuentes citadas.

| Lugar | Dato | Fuente |
| :--- | :--- | :--- |
| Faro Les Éclaireurs (canal Beagle) | Torre de piedra de 11 m, pintada de rojo y blanco. Entró en servicio el 23 de diciembre de 1920. El nombre de los islotes, «los exploradores», se lo puso el capitán francés Louis Ferdinand Martial. | `[O35]` |
| Pingüinera de Isla Martillo (canal Beagle) | Colonia de pingüinos de Magallanes más cercana a Ushuaia, a unos 40 km al este. Investigadores del CADIC-CONICET vieron que aprovechan las corrientes de marea para ir y volver de los sitios donde comen. | `[O39]` |
| Faro San Juan de Salvamento (Isla de los Estados) | Bautizado «Faro del Fin del Mundo». Lo puso en servicio el 25 de mayo de 1884 la División Expedicionaria al Atlántico Sur, al mando del comodoro Augusto Lasserre. Es Monumento Histórico Nacional. Queda lejos de la ruta: en pantalla se sostiene en el borde, en su dirección. | `[O40]` |

No se publica (las fuentes leídas no lo dicen): la relación del faro San Juan de Salvamento con la novela de Julio Verne, el año en que dejó de funcionar, y los pingüinos papúa de Isla Martillo.

## 8 ter. Cómo funciona la expedición (logística y preguntas)

El issue #4 pide que el usuario descubra el trabajo necesario para trasladar personas, instrumentos y suministros. Por eso algunos hitos suman datos de logística, y algunos hacen antes una pregunta de tres opciones. Fuentes O41 a O45 consultadas el 11-11-2026.

Cada dato depende del vehículo elegido. Hay tres alcances: todos los vehículos, solo barcos (Irízar y Puerto Argentino comparten), solo avión. Además el Irízar tiene datos propios. Una prueba de `packages/core` controla que en el Hércules no aparezca nada sobre el rompehielos, buques o lanchas.

| Hito | Alcance | Dato | Fuente |
|---|---|---|---|
| Ushuaia y el Canal Beagle | todos | El personal se entrena antes en Caviahue, Neuquén: esquí, supervivencia, refugios, búsqueda y rescate, vehículos antárticos | [O44] |
| | Irízar | Tres etapas de campaña; la segunda sale de Ushuaia, llega a Belgrano II y vuelve | [O1] |
| | Puerto Argentino | Tareas de Buque de Estación desde Ushuaia | [O7] |
| | avión | Los Hércules C-130 son el único medio aéreo que mantiene el puente todo el año | [O10] [O45] |
| Mar abierto | barcos | Carga: combustible, víveres, materiales de construcción, maquinaria, material científico | [O43] |
| | Irízar | 565 toneladas de carga y más de 630.000 litros de gasoil antártico en una etapa (2022-23) | [O41] |
| Pasaje de Drake | Irízar | Más de 600 traslados de personal científico y militar en una etapa | [O41] |
| | avión | Pasajeros, víveres, equipos, maquinaria y evacuaciones sanitarias | [O45] |
| Paralelo 60° Sur | todos | Protocolo de Madrid: «reserva natural dedicada a la paz y a la ciencia» | [I2] |
| | todos | Los residuos salen de la Antártida y los retira quien los generó | [I3] |
| Shetland del Sur | barcos | Lanchas de desembarco y «Grupo Playa» en bases sin muelle | [O43] |
| | Irízar | Las cargas pesadas van en helicóptero Sea King | [O43] |
| Base Marambio | Irízar | Carga y personal pasan a la base solo en helicóptero: un Sea King va y viene entre el buque y la meseta | [O24] |
| | barcos | El lugar donde el buque espera frente a la isla es ilustrativo (sin fuente); se dibuja lejos porque el buque está agrandado | — |
| | todos | 227 personas invernaron en 2022 en las siete bases permanentes (179 varones, 31 mujeres, 17 niños) | [O42] |
| | barcos | Los residuos vuelven a Ushuaia para reciclaje o disposición final | [O41] |
| | avión | Pista de 1.200 m por 35 m, abierta por 21 hombres con barretas, picos y palas | [O45] |

Preguntas (la respuesta correcta sale de los datos del mismo hito):

| Hito | Pregunta | Respuesta | Se pregunta en |
|---|---|---|---|
| Ushuaia y el Canal Beagle | ¿Dónde se entrena el personal antes de pasar un año en la Antártida? | En la cordillera de Neuquén | todos |
| Paralelo 60° Sur | ¿Qué se hace con la basura que produce una base antártica? | Se saca de la Antártida | todos |
| Base Marambio | Marambio está sobre una meseta, a unos 200 m sobre el mar. ¿Cómo pasan del Irízar a la base las personas y la carga? | En helicóptero `[O24]` | solo el Irízar |

Cambios del 13-11-2026 (#46):

- La pregunta de Shetland del Sur («¿Cómo llega la carga de un buque a una base que no tiene muelle?») se quitó. Su dato, las lanchas de desembarco `[O43]`, sigue como nota de ese hito. Shetland del Sur queda sin pregunta hasta tener un dato nuevo con fuente.
- La pregunta de Marambio pasa a ser sobre el traslado del Irízar a la base. Sus opciones son «Por un puente», «En botes» y «En helicóptero». Se redacta con la meseta porque es lo que dice `[O24]`: la fuente no dice que la base no tenga puerto ni muelle.
- La pregunta «¿Cuánta gente vive en la Base Marambio durante el invierno?» y su nota (70 personas en invierno y 170 en verano, `[O45]`) salen de este viaje y pasan a la expedición de la base (#74).
- La ficha del Irízar en el selector ya no dice cómo se usa el helicóptero en Marambio, para no responder la pregunta antes de zarpar. Dice «Lleva dos helicópteros Sea King» `[O16]`.

No hay puntaje durante el viaje. La primera respuesta queda fija, se muestra si era correcta y recién después aparecen los datos. La tarjeta de llegada dice cuántas preguntas se acertaron.

Límites conocidos: [O44] describe el curso del personal de las Fuerzas Armadas, no el de los científicos. El dato de 227 personas es de la invernada 2022. Las cifras de carga son de una etapa de la campaña 2022-23, no un promedio.

## 9. Pendiente: no se publica hasta tener fuente

- Duración del vuelo del C-130 desde Ushuaia (hay 3,5 h desde Río Gallegos `[O14]`). La barra del viaje muestra una duración solo como **estimación** (cálculo propio, ver «Segunda iteración (#46)» en `desde-ushuaia-diseno.md`).
- Profundidad y largo del Pasaje de Drake, y latitud del frente polar dentro del Drake.
- Coordenada oficial del puerto de Ushuaia (pedir al Servicio de Hidrografía Naval; el Derrotero Argentino no está en línea).
- Historia de William Smith y Bransfield; origen del nombre «Beagle» (hay fuente secundaria); quién nombró el Cabo de Hornos (Le Maire y Hoorn).
- «Paso Mitre» y «Mar de Piedrabuena»: no se encontró ninguna fuente.
- Duración del cruce en buque turístico con fuente oficial.
- Tipo y largo actual de la pista de Marambio.
- Que la Base Marambio no tenga puerto ni muelle: `[O24]` no lo dice (solo dice que está sobre una meseta y que el traslado fue «exclusivamente» en helicóptero). No se afirma en el viaje.
- Dónde espera el buque frente a Marambio y a qué distancia de la costa: `[O24]` solo dice «frente a la base». La posición dibujada es ilustrativa.

## 10. Retirado del borrador anterior

Se eliminaron por no tener fuente o ser incorrectos: «capital tricontinental», jurisdicción «policial y electoral», «ciudad más austral del mundo», «90–93 %» del turismo, «48 h» y «3–3,5 h» sin fuente, el comandante «Llosa», el «Día del Turismo Antártico», «el primer C-130 aterrizó en 1969», «residuos al continente americano», la «prohibición» de desembarco para buques de más de 500 pasajeros (la Medida 15 de 2009, que lo haría obligatorio, figura como «Not yet effective» en la Secretaría del Tratado `[I20]`), vientos catabáticos de 150 km/h, el laboratorio LAJUB, el «registro civil» de Esperanza, los exámenes médicos y la vestimenta polar (se apoyaban en una portada genérica) y los itinerarios turísticos.
