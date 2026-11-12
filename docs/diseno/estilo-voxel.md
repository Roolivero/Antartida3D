# Estilo visual: modelos de bloques (voxel)

Decisión del 11-11-2026 (issue #40): toda la aplicación usa un solo estilo para lo que se dibuja sobre el mapa. La regla para agentes está en `.agents/rules/project/30-estilo-voxel.md`.

## Qué es un modelo
Una lista de cajas de color plano. No hay texturas, luces ni archivos de modelo: cada cara lleva un brillo fijo y el modelo entero es una sola geometría.

- Constructor: `buildBoxGeometry` (`packages/react-ui/src/voyage/vehicles.ts`).
- Material: `vehicleMaterial` (colores por vértice).
- Vehículos: `VEHICLE_MODELS` en `vehicles.ts`.
- Animales, hielo, faros, pingüinera y Ushuaia: `SCENE_MODELS` en `sightingModels.ts`.

## Mínimo de detalle
- Al menos 12 cajas y 2 colores por modelo (`VOXEL_MIN_BOXES`, `VOXEL_MIN_COLORS`).
- El rasgo que distingue al modelo: ojos y marca de la especie en un animal; ventanas y un rasgo propio en un vehículo; techo y aberturas en un edificio.
- Una prueba (`packages/react-ui/test/models.test.ts`) revisa el mínimo en todos los modelos registrados. Cuando se sumó, encontró que el Irízar y el Puerto Argentino tenían 10 y 11 cajas; se les agregó ventanas, botes y carga.

## Dónde se ven
- **Mapa abierto:** vida del océano (ballena jorobada, minke, orca, pingüinos y foca sobre hielo, témpanos), el Irízar recorriendo la ruta Ushuaia–Marambio ida y vuelta, y el Hércules C-130 haciendo el mismo viaje por aire. Las posiciones, zonas y ciclos son los del issue #16; solo cambió el dibujo.
- **Viaje «Desde Ushuaia»:** el vehículo elegido, los avistajes, los lugares y Ushuaia. Durante el viaje se oculta la vida del océano del mapa abierto, para no ver dos veces el mismo barco o animal.

## Tamaño (12-11-2026, issue #42)
- **Mapa abierto:** la fauna, los témpanos, el Irízar, el Hércules, Ushuaia y Orcadas tienen un tamaño fijo en el mundo. Es el que tenían en pantalla a una distancia de cámara de 400 (`MODEL_REFERENCE_DISTANCE`). De cerca se ven igual que antes. Al alejarse se achican, y con menos de 3 px (`MODEL_MIN_PX`) se ocultan. Antes ocupaban siempre lo mismo en pantalla y parecían agrandarse al alejar la cámara.
- **Expediciones:** el vehículo y los avistajes siguen escalando con la distancia, porque la cámara los acompaña de cerca.
- **Marcadores, etiquetas y retícula:** son interfaz y no cambian de tamaño en pantalla. Con ellos se encuentra cada cosa, también con teclado.

## Qué se retiró
- El dibujado con sprites (`seaLife.glsl.ts`) y la carga de `sea-atlas.webp` en la interfaz.
- Queda sin uso en la interfaz, y sin borrar porque lo usan las pruebas y el script de #16: el manifiesto `sea-atlas.json`, `SEA_ATLAS`, los campos `sprite` y `spriteIndex` de cada instancia, el script `build-sea-atlas.ts` y la imagen `sea-atlas.webp`. La estela del Irízar no tiene modelo y no se dibuja.

## Uso de IA
Los modelos se escribieron con asistencia de IA. Son ilustraciones: los colores y proporciones son aproximados y el tamaño en pantalla está exagerado.
