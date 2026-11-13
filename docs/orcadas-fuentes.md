# Fuentes de información - Base Orcadas

Registro de todas las fuentes documentales, científicas e históricas utilizadas para el contenido y los datos de la expedición a la Base Orcadas.

## Tabla de fuentes

| Referencia | Organismo | URL | Fecha de consulta | Licencia | Estado |
|---|---|---|---|---|---|
| Base Orcadas | Cancillería Argentina · Dirección Nacional del Antártico | https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas | 11 de noviembre de 2026 | - | Verificada |
| Bases permanentes | Armada Argentina | https://www.argentina.gob.ar/armada/antartida/bases-permanentes | 11 de noviembre de 2026 | - | Verificada |
| READER: datos de superficie de Orcadas | SCAR · British Antarctic Survey | https://legacy.bas.ac.uk/met/READER/surface/Orcadas.All.temperature.html | 11 de noviembre de 2026 | Open Government Licence v3.0 | Verificada |
| Zazulie, Rusticucci y Solomon (2010) | Journal of Climate 23(1) | https://doi.org/10.1175/2009JCLI3074.1 | 11 de noviembre de 2026 | - | Verificada |
| R. C. Mossman (1907) | Report on the Scientific Results of the Voyage of S.Y. Scotia, vol. II, Meteorology | https://archive.org/details/reportonscientif02scot | 12 de noviembre de 2026 | Dominio público (1907) | Verificada |
| OMM · OSCAR/Surface, estación 88968 | OMM | https://oscar.wmo.int/surface/#/search/station/stationReportDetails/12480 | 11 de noviembre de 2026 | - | Verificada |
| Antarctic Station Catalogue (Argentina) | COMNAP | https://www.comnap.aq/s/Argentina_Catalogue_Aug2017.pdf | 12 de noviembre de 2026 | - | Verificada |
| Murphy, Clarke, Symon y Priddle (1995) | Deep-Sea Research I | https://doi.org/10.1016/0967-0637(95)00057-D | 12 de noviembre de 2026 | - | Descartada: el resumen no es de acceso abierto y no se pudo confirmar el dato. Su contenido se quitó de la expedición. | |
| Sitio y Monumento Histórico N.º 42 | Secretaría del Tratado Antártico | https://www.ats.aq/devph/en/apa-database/119 | 12 de noviembre de 2026 | - | Verificada |
| OpenStreetMap: edificios y costa de la Base Orcadas | colaboradores de OpenStreetMap (trazado sobre imágenes Maxar 2019) | https://www.openstreetmap.org/#map=18/-60.7378/-44.7375 | 12 de noviembre de 2026 | ODbL 1.0 | Verificada. Se usa para qué edificios hay, su planta, color y techo; la disposición en la escena es ilustrativa. Detalle en `docs/orcadas-emplazamiento.md`. |

## Nota sobre datos meteorológicos

Los datos de temperatura, presión y viento provienen del proyecto READER del Scientific Committee on Antarctic Research (SCAR) y el British Antarctic Survey (BAS). Están publicados bajo los términos de la Open Government Licence v3.0 con atribución al SCAR y al British Antarctic Survey.

## Pendientes

- **Mástil de viento en tierra (diorama, desde 1905):** [Fuente a definir]. Según Mossman (1907), en 1903 el anemómetro estaba en la cubierta del Scotia. No se encontró en qué año se instaló un anemómetro en tierra. El diorama lo muestra desde la era de 1905 como parte de la reconstrucción ilustrada, no como dato.
- **Bandera desde 1904 (diorama):** se apoya en el traspaso del 22 de febrero de 1904 (Cancillería). La máquina del tiempo trabaja por años, así que la era «1904» la muestra todo ese año.

## Revisión de la fase 2 del pulido (12 de noviembre de 2026)

- **Elevación (C5):** el catálogo de COMNAP (2017) dice «Altitude of facility (m): 8». OSCAR/Surface de la OMM (estación 0-20000-0-88968, consultado por su API el 12 de noviembre de 2026) da una elevación de 8 m y el barómetro a 12 m. Las dos fuentes primarias coinciden en 8 m. El valor de 4 m aparece solo en fuentes secundarias y se descarta. La ficha `arrival-elevacion` cita las dos.
- **Hielo marino (C4):** COMNAP (2017) dice «Sea Ice Break Up: October». Es la base de la ficha `year-hielo-octubre`. El hielo de cada mes en la escena sigue siendo una simulación y se muestra con palabras («bahía abierta», «hielo suelto», «bahía cerrada»), sin porcentajes.
- **Temporada de cría de pingüinos (C4):** [Fuente a definir]. COMNAP solo menciona colonias de pingüinos barbijo y adelia. La presencia de fauna por mes sigue marcada como simulación.
- **Era «Hoy» (C2):** no se encontró una fecha con fuente para el laboratorio LABORC ni para los módulos actuales. La Cancillería no da fecha. Las noticias de 2023 sobre los nuevos laboratorios multidisciplinarios (Esperanza, Orcadas y San Martín) dicen que el de Orcadas seguía en obra. La era se llama «Hoy», no muestra año de inicio y lleva el chip «Fecha ilustrativa».
- **Fichas repetidas (C3):** se unieron `arrival-antiguedad` (Cancillería) y `arrival-base-mas-antigua` (Armada) en una sola ficha con las dos fuentes. Las fichas del LABORC y del HSM 42 quedan solo en el cierre.
- **Tendencia (C1):** la recta pasa a dos tramos, 1904–1950 y 1951–2025. Es un cálculo propio de mínimos cuadrados sobre la serie READER. La significancia estadística la da Zazulie, Rusticucci y Solomon (2010), no este cálculo.

## Escena (fases 5 y 7 del pulido, 13 de noviembre de 2026)

- **Disposición:** escenario de frente con una selección de ocho elementos del sitio medido en OpenStreetMap. La forma, el color y el techo de cada edificio salen de OSM. Dónde está cada uno es ilustrativo, y la etiqueta «Reconstrucción ilustrada» lo dice.
- **Altura de las torres de radio:** OSM no la da. Se dibujan de 15 m como ilustración.
- **Pingüinera y su loma:** [Fuente a definir]. COMNAP menciona colonias de pingüinos adelia y barbijo, pero ninguna fuente consultada las ubica. La loma, los nidos y el viaje al mar son una reconstrucción.
- **Hielo de la bahía por mes:** sigue siendo una simulación. Crece desde la costa y la bahía se cierra de julio a septiembre. El deshielo de octubre que dice COMNAP queda en la ficha `year-hielo-octubre`.

