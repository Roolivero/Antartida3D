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
- **Fichas de «Vida en el mar» (13-11-2026, issue #50):** la ficha de la ballena jorobada, la orca, la ballena minke, el pingüino emperador, la foca leopardo, el Irízar y el témpano tabular muestra el modelo de su punto arriba del texto. La ficha del Pasaje de Drake no tiene modelo y no muestra nada. Ver «Vista previa en las fichas».

## Tamaño (12-11-2026, issue #42)
- **Mapa abierto:** la fauna, los témpanos, el Irízar, el Hércules, Ushuaia y Orcadas mantienen su tamaño en pantalla hasta una distancia de cámara de 400 (`MODEL_REFERENCE_DISTANCE`), con `placeModelSize` (Ushuaia y Orcadas, #47) y `seaModelSize` (fauna, témpanos, Irízar y Hércules, #51). Antes de #51 el tamaño de estos últimos era fijo también de cerca, y junto a Tierra del Fuego, donde la cámara llega a 8, llenaban la pantalla. Más lejos de 400 el tamaño en el mundo queda fijo: al alejarse se achican, y con menos de 3 px (`MODEL_MIN_PX`) se ocultan. Antes ocupaban siempre lo mismo en pantalla y parecían agrandarse al alejar la cámara.
- **Expediciones:** el vehículo y los avistajes siguen escalando con la distancia, porque la cámara los acompaña de cerca.
- **Marcadores, etiquetas y retícula:** son interfaz y no cambian de tamaño en pantalla. Con ellos se encuentra cada cosa, también con teclado.

## Vista previa en las fichas (13-11-2026, issue #50)
- **Un solo lienzo:** `ModelPreview` (`packages/react-ui/src/voyage/ModelPreview.tsx`) dibuja cualquier modelo de bloques dentro de una ficha. Lo usan el selector de vehículos (`VehiclePreview`, sin cambios a la vista) y las fichas de «Vida en el mar» (`SeaPreview`).
- **Movimiento** (`motion`): `turn` gira (solo vehículos del selector); `swim` sube y baja suave con leve balanceo (ballena); `sway` balanceo mínimo de pie (pingüino); `still` quieto (Irízar, témpano). En las fichas el modelo no gira. Los movimientos son ilustrativos, no datos.
- **Movimiento reducido:** con «reducir movimiento» activo ningún modelo se mueve y el lienzo solo se dibuja a pedido.
- **Qué modelo va en cada ficha:** se elige por `targetSpecies` del punto, en `SeaPreview.tsx`. No cambió nada en `@antartida/core`.
- **Fondo de mar:** las fichas de mar usan `.vpreview.sea` (de `--glacier` a `--deep`). Con el fondo claro del selector de vehículos el témpano, que es casi blanco, no se distinguía.
- **Pingüino emperador:** modelo nuevo `emperorAt` (18 cajas): más alto que el otro pingüino, mancha amarilla y naranja a los lados de la cabeza, pecho amarillento, pico largo con línea naranja. El témpano con pingüinos del mapa (`penguins`) ahora usa emperadores; antes mostraba pingüinos con anillo blanco en el ojo (marca del Adelia) en el punto «Pingüino emperador». `SEA_MODELS.emperor` es un solo emperador sobre hielo, para la ficha. Colores y proporciones aproximados: es una ilustración.
- **Todos los animales del mapa abierto tienen ficha** (pedido de quien lleva el issue, 13-11-2026; amplía el alcance original de #50, que no sumaba puntos). Se agregaron tres puntos a `SEA_POINTS`: orca (`sea-orca`), ballena minke (`sea-minke`) y foca leopardo (`sea-leopardo`). El marcador sigue al animal dibujado, igual que los demás.
  - **Texto y fuentes:** la orca y la foca leopardo usan el mismo texto y la misma fuente (`I16`, Australian Antarctic Division) que su avistaje del viaje desde Ushuaia. La ballena minke tiene texto nuevo, tomado de la ficha «Minke whale» de la Australian Antarctic Division (consultada el 13-11-2026; la página dice que se actualizó el 12-08-2010). No se muestra nombre científico: esa página da *Balaenoptera acutorostrata* y aclara que hay dos formas, quizá especies distintas.
  - **En el celular:** el mapa dibuja menos animales en pantallas angostas (no dibuja la ballena minke ni la foca leopardo; viene del issue #16). Un marcador cuyo animal no está dibujado se oculta, para no señalar mar vacío. En el celular hay ficha de la orca, no de las otras dos.
  - **Movimiento:** orca y minke nadan (`swim`); la foca queda quieta (`still`).
  - **Conocido:** en la vista inicial de escritorio los marcadores de la orca y la minke quedan debajo del panel «Leyenda» (mismo problema del issue #48). Al mover el mapa se ven.
- **Sin WebGL:** los puntos de «Vida en el mar» solo existen en el mapa 3D, así que sin WebGL estas fichas no se abren. La vista previa se carga diferida (trozo aparte) y solo cuando el mapa está en 3D.
- **Verificación:** prueba e2e en `map3d.spec.ts` (cada ficha de animal, buque o témpano tiene un lienzo; la del Drake, ninguno). Movimiento y movimiento reducido se controlaron a mano con capturas a 1440 y 390 px.

## Qué se retiró
- El dibujado con sprites (`seaLife.glsl.ts`) y la carga de `sea-atlas.webp` en la interfaz.
- Queda sin uso en la interfaz, y sin borrar porque lo usan las pruebas y el script de #16: el manifiesto `sea-atlas.json`, `SEA_ATLAS`, los campos `sprite` y `spriteIndex` de cada instancia, el script `build-sea-atlas.ts` y la imagen `sea-atlas.webp`. La estela del Irízar no tiene modelo y no se dibuja.

## Uso de IA
Los modelos se escribieron con asistencia de IA. Son ilustraciones: los colores y proporciones son aproximados y el tamaño en pantalla está exagerado.
