# Emplazamiento de la Base Orcadas (borrador G1)

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

## Tabla de elementos (borrador)

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

## Qué hace falta para seguir con G2 a G6

1. Una imagen de mayor resolución (o un plano oficial de la Dirección Nacional del Antártico o de la Armada) que se pueda usar **solo como referencia de medición**, con su fecha y licencia anotadas.
2. Fotos oficiales o de Wikimedia Commons con licencia explícita, para techos, colores, pisos y orientación.
3. Aprobación del equipo de esta tabla antes de modelar.

Mientras tanto, la escena sigue con las posiciones provisorias de `STATION_LAYOUT` (fase 1, B8), que ya garantizan que ninguna planta se superponga, y se declara como «Reconstrucción ilustrada».
