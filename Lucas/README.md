# Antártida3D

Prototipo web educativo para explorar una **maqueta tridimensional de la Antártida** y conversar sobre cinco propuestas de expedición. Mobile-first, sin instalación en el teléfono y sin servicios de datos externos en tiempo de ejecución.

## Ejecutar

Requiere Node.js 22.12 o posterior y npm. Desde la carpeta del repositorio:

```sh
npm ci
npm run dev
```

Abrir la dirección `Local` que muestra Vite, normalmente <http://localhost:5173>. Para verlo en un teléfono, conectar computadora y teléfono a la **misma red Wi-Fi** y abrir en el teléfono la dirección `Network` que aparece en la terminal, por ejemplo `http://192.168.x.x:5173`. Mantener la computadora y el servidor encendidos. Algunas redes de invitados aíslan dispositivos; en ese caso usar otra red compartida. No hace falta instalar una app.

Esto permite una demo en la red local. No crea un enlace público de Internet.

## Recorrido para la reunión

1. Abrir la vista inicial: arrastrar con un dedo o el mouse para girar; pellizcar con dos dedos o usar la rueda para acercar.
2. Probar los botones de acercar, alejar, restaurar vista y giro automático. El giro empieza apagado y se pausa al abrir una ficha o la información de la maqueta.
3. Tocar **Ver expediciones**. Aparecen las cinco propuestas y un marcador de referencia para Base Orcadas.
4. Abrir **Fósiles** y luego **Explorar propuesta** para recorrer un primer guion de ejemplo.
5. Abrir **Base Orcadas**, desde el punto o la lista, para ver su ubicación y las fuentes oficiales.
6. Abrir **Sobre la maqueta** para revisar qué proviene de fuentes y qué es ilustrativo.

Las fichas se cierran con la cruz, con Escape o tocando fuera. Hay controles con nombre accesible, foco visible y diálogos nativos. Si falla WebGL, se ofrece un contorno 2D y las fichas siguen disponibles.

## Qué incluye

- React 19 + Three.js + React Three Fiber 9 + Drei, con Vite.
- Contorno abierto del continente y las islas al sur de 60° S, en una vista polar estereográfica.
- Relieve procedural ilustrativo, hielo con espesor y océano de referencia.
- Rotación táctil, zoom, vista restaurable y giro automático opcional.
- Cinco fichas: Fósiles, Océano, Poncho, Desde Ushuaia y Base Orcadas.
- Un guion conceptual de tres pasos por ficha, siempre señalado como propuesta.
- Diseño adaptable a celular y escritorio; fuentes tipográficas y geografía incluidas localmente.
- Renderizado bajo demanda y resolución limitada para reducir trabajo en celulares.

## Fuentes y límites

| Elemento | Fuente / estado | Límites |
| --- | --- | --- |
| Contorno de tierras | [Natural Earth, 1:50m land](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-land/), [GeoJSON del repositorio del proyecto](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_land.geojson) | Generalizado; no representa el frente actual de hielo, ni límites políticos. |
| Licencia geográfica | [Natural Earth: dominio público](https://www.naturalearthdata.com/about/terms-of-use/) | No es cartografía para navegación o medición. |
| Relieve, montañas, espesor y colores | Reconstrucción visual procedural | **No hay datos de elevación reales.** No es un modelo científico del hielo o del terreno. |
| Base Orcadas | [Armada Argentina](https://www.argentina.gob.ar/armada/antartida/bases-permanentes): 60°45′ S, 44°43′ O. [Cancillería Argentina](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas): historia y ubicación | El marcador ubica la base, no una expedición o salida confirmada. |
| Fósiles, Océano, Poncho, Desde Ushuaia | Propuestas del planteo del proyecto | **Sin geolocalización definida ni ruta dibujada.** Poncho conserva solo su nombre, sin atribuirle identidad o contenido no acordado. |

Fuentes consultadas y contorno descargado el **8 de noviembre de 2026**. El GeoJSON incluido conserva las coordenadas de los polígonos originales seleccionados y registra URL, fecha, criterio de extracción y SHA-256 del archivo de origen en `metadata`. Las tipografías DM Sans y Libre Caslon Display se distribuyen mediante Fontsource bajo SIL Open Font License; sus licencias están incluidas en sus respectivos paquetes.

El muestreo, las fechas de campañas, las especies, los hallazgos, las rutas y los resultados científicos todavía deben seleccionarse y validarse con el equipo. Los textos narrativos actuales son propuestas, no informes de investigación.

## Dónde editar

| Archivo | Qué cambiar |
| --- | --- |
| `src/data/expeditions.js` | Nombres, textos, preguntas, pasos, fuentes y coordenadas. |
| `src/data/geography.js` | Proyección de visualización y relieve ilustrativo. |
| `src/terrain.js` | Triangulación, refinado y colores de la maqueta. |
| `src/AntarcticaScene.jsx` | Escena, cámara, luces, marcadores y controles táctiles. |
| `src/main.jsx` | Pantallas, fichas y explicación de fuentes. |
| `src/styles.css` | Diseño, colores y adaptación a pantallas. |
| `public/data/antarctica.geojson` | Geografía abierta incluida en la demo. |

Para una expedición sin ubicación, mantener `location: null`. Solo asignar `[longitud, latitud]` después de acordar y documentar su ubicación. Agregar `sources`, `locationLabel` y `coordinatesLabel`; la escena crea marcadores únicamente para fichas con coordenadas. Si se incorporan nuevos marcadores, revisar la leyenda de la escena y la prueba de localizaciones para reflejar la nueva información validada.

## Actualizar el contorno (opcional)

No es necesario para ejecutar la demo: los datos ya están incluidos. Para actualizar de forma deliberada:

```sh
mkdir -p scripts/source-cache
curl -L --fail https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson -o scripts/source-cache/natural-earth-land.geojson
node scripts/prepare-geography.mjs
node scripts/make-outline.mjs
```

Actualizar también la fecha de descarga de los metadatos, revisar la geometría y conservar la procedencia. El archivo global de origen se excluye del repositorio y del sitio compilado.

## Comprobar y generar la entrega

```sh
npm test
npm run build
npm run preview
```

Las pruebas comprueban la continuidad de la proyección, la procedencia del contorno y que no se creen coordenadas para expediciones pendientes. La revisión visual debe cubrir inicio, giro/zoom, marcador de Orcadas, apertura/cierre de fichas y lectura del guion en celular y escritorio. Probar además en un teléfono físico antes de la reunión: el rendimiento y los gestos dependen de cada dispositivo.

`npm run build` genera `dist/`, que puede servirse en cualquier alojamiento web estático. No abrir `index.html` con doble clic: la carga de módulos y datos necesita un servidor HTTP. Para compartir fuera de la red local será necesario elegir y configurar un alojamiento.

## Decisiones para construir en equipo

- Elegir la primera expedición a desarrollar y sus fuentes científicas.
- Definir qué es Poncho y cuál será su contenido.
- Acordar sitios y recorridos antes de incorporar coordenadas.
- Definir si una siguiente versión requiere elevaciones reales (por ejemplo, un conjunto abierto como REMA), y con qué resolución y criterio visual.
- Validar accesibilidad y rendimiento en los teléfonos del público objetivo.

Alcance intencional de prototipo: sin cuentas, base de datos, seguimiento de usuarios ni campañas reales administradas desde la aplicación.
