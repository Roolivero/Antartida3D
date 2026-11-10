# Antártida por descubrir — Atlas

Prototipo independiente para evaluar la interfaz general de un mapa 3D de la Antártida dirigido al público general. Se construyó a partir de la versión oscura de este repositorio, conservando sus cinco propuestas y su tecnología.

## Iniciar

Requiere **Node.js 22.12 o posterior** y npm.

```sh
cd antartida-atlas
npm ci
npm run dev
```

Abrir **http://localhost:5175**. El puerto está fijado para que no se confunda con los otros prototipos. Si ya hay un servidor en ese puerto, cerrarlo antes de iniciar otro.

Para verlo desde un teléfono en la misma red Wi-Fi, usar la dirección `Network` que imprime Vite. La computadora debe permanecer encendida y algunas redes de invitados bloquean la comunicación entre dispositivos.

## Qué evaluar

- El mapa está abierto desde el inicio, con rotación limitada, zoom y restauración de vista.
- El selector **2D / 3D** cambia la representación conservando la propuesta seleccionada.
- Las cinco expediciones se pueden filtrar por Naturaleza e Historias.
- Las fichas reemplazan la lista en el lateral: el mapa permanece visible e interactivo.
- En celular, una tarjeta inferior se puede expandir u ocultar, y una barra permite volver al mapa.
- Las capas permiten mostrar u ocultar referencias, regiones y sitios ubicados.
- La información del proyecto y la guía de navegación están en diálogos accesibles.
- Si WebGL falla, se ofrece automáticamente el mapa 2D. Si falla la geografía, las propuestas siguen disponibles y se puede reintentar.

**Las expediciones no se desarrollaron:** sus textos, preguntas, guiones y fuentes se copiaron sin cambios de `Lucas/src/data/expeditions.js`, la versión 3D oscura existente al iniciar el trabajo. El botón «Ver recorrido propuesto» muestra esos guiones; no inicia una actividad científica ni registra una expedición completada.

Solo **Base Orcadas** tiene un marcador: las otras cuatro propuestas conservan su ubicación pendiente. Los filtros son una organización de interfaz, no nuevas expediciones.

## Tecnología y archivos

React 19, Three.js, React Three Fiber, Drei, Vite, CSS y Lucide. Las tipografías DM Sans y Libre Caslon Display se sirven localmente con Fontsource. No hay cuentas, backend ni servicios externos necesarios durante el uso.

| Archivo | Responsabilidad |
| --- | --- |
| `src/App.jsx` | Estado general, mapa, modos, capas, navegación móvil y recuperación de errores. |
| `src/components/Expeditions.jsx` | Lista, filtros y fichas de las propuestas. |
| `src/components/AboutDialog.jsx` | Proyecto, fuentes y ayuda. |
| `src/map/Scene.jsx` | Escena 3D, cámara, luces y proyección de marcadores HTML. |
| `src/map/FlatMap.jsx` | Alternativa SVG 2D con arrastre, zoom, marcadores y teclado. |
| `src/map/geometry.js` | Malla con subdivisión de aristas compartidas y relieve ilustrativo. |
| `src/map/coastline.js` | Eliminación de la costura artificial del cierre polar para la visualización. |
| `src/data/expeditions.js` | Contenido original de las cinco propuestas. |
| `src/styles.css` | Dirección visual y adaptación a pantallas. |

Las etiquetas y botones se dibujan en el DOM principal y se proyectan sobre el mapa. Esto mantiene legibles sus tamaños y evita desmontajes de raíces React anidadas al cambiar entre 2D y 3D. La escena y su geometría se reutilizan; el renderizado se realiza bajo demanda, sin giro automático ni bucles de animación en reposo. Se respeta `prefers-reduced-motion`.

## Fuentes y límites de la representación

- **Contorno:** Natural Earth, `ne_50m_land`, dominio público. Se reutiliza íntegramente `public/data/antarctica.geojson` de la versión 3D original, con su metadata de procedencia. [Fuente y licencia](https://www.naturalearthdata.com/about/terms-of-use/).
- **Relieve, montañas, alturas y espesor:** ilustrativos, generados a partir de la función del prototipo original. Se suaviza el relieve hacia la costa para dar continuidad a la maqueta. **No hay datos reales de elevación** ni cartografía apta para mediciones o navegación.
- **Cierre polar:** el GeoJSON original contiene un recorrido por el antimeridiano hasta el polo. Se elimina esa costura únicamente de la representación proyectada; el archivo fuente permanece intacto.
- **Orcadas:** se conservan las coordenadas y las fuentes de Armada y Cancillería incluidas en la propuesta original. El marcador ubica la base, no una campaña confirmada.
- **Etiquetas regionales:** orientativas, sin límites políticos.
- **Tipografías:** DM Sans y Libre Caslon Display, SIL Open Font License; licencias en sus paquetes Fontsource.
- **Contenido científico:** pendiente de selección y validación con el equipo. El prototipo no agrega hallazgos, rutas, especies, fechas de campañas ni conclusiones científicas.
- **Uso de IA:** interfaz y código de este prototipo desarrollados con Codex a partir de la revisión de los dos proyectos y del borrador provisto por el equipo.

## Verificar y compilar

```sh
npm test
npm run build
npm run preview
```

Las pruebas unitarias comprueban procedencia, proyección y marcadores; además, verifican que la malla tenga coordenadas finitas y no presente aberturas interiores. `dist/` es una entrega estática independiente.

Para la prueba de interfaz, con el servidor iniciado en otra terminal:

```sh
npx playwright install chromium
npm run test:ui
```

La prueba recorre filtros, fichas, devolución de foco, fuentes, capas, cambios repetidos 2D/3D, teclado, navegación móvil y ausencia de desbordamientos a 360, 390, 768, 1024 y 1440 px. También simula falta de WebGL y una descarga fallida de la geografía. Usa renderizado por software para comprobar el funcionamiento; no mide el rendimiento de un teléfono real.

Opciones de verificación:

```sh
ATLAS_URL=http://localhost:5175 CAPTURE_DIR=docs/capturas npm run test:ui
```

Las capturas de referencia están en `docs/capturas/`. Antes de una presentación, conviene probar gestos y fluidez en un teléfono físico.
