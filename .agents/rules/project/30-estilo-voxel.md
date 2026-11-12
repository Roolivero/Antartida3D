# 30. Estilo visual: modelos de bloques (voxel)

> **Por qué:** Dos estilos de dibujo en el mismo mapa se leen como dos aplicaciones distintas. Un solo estilo y un mínimo de detalle hacen que todo se vea parte del mismo cuaderno.

1. Todo animal, vehículo, edificio, personaje u objeto que se dibuje sobre el mapa es un **modelo de bloques**: una lista de cajas `[cx, cy, cz, sx, sy, sz, color]` unidas con `buildBoxGeometry` y dibujadas con `vehicleMaterial`.
   - No: sprites, dibujos planos, texturas pintadas, modelos importados (`.glb`, `.obj`), sombreado con luces.
   - Sí: cajas de color plano; el sombreado va fijo por cara y lo pone `buildBoxGeometry`.
2. Antes de crear un modelo, busca si ya existe uno reutilizable en `packages/react-ui/src/voyage/vehicles.ts` o `sightingModels.ts` (por ejemplo `seal(...)`, `bird(...)`, `penguinAt(...)`).
3. Mínimo de detalle, igual para todos: al menos `VOXEL_MIN_BOXES` cajas (12) y `VOXEL_MIN_COLORS` colores (2). Además, el modelo debe tener el rasgo que lo distingue:
   - animal: ojos y la marca propia de la especie (barbijo, parche blanco, aleta);
   - vehículo: ventanas del puente o de la cabina y un rasgo propio (helicóptero, grúa, motores);
   - edificio: techo, puerta o ventanas.
4. Medidas comunes: una unidad es el largo (o el ancho) del modelo; el frente mira a `+x` en vehículos y animales, y a `+z` en edificios; `y` es arriba y la base apoya en `y = 0`.
5. Usa los colores ya definidos en esos archivos. Un color nuevo se agrega como constante con nombre, no suelto en una caja.
6. Los modelos de escena del mapa abierto (fauna, témpanos, Irízar, Hércules, Ushuaia, Orcadas) mantienen su tamaño en pantalla hasta una distancia de cámara de `MODEL_REFERENCE_DISTANCE` (`placeModelSize` y `seaModelSize`, en `@antartida/core`), para no tapar el mapa al acercarse. Más lejos tienen un **tamaño fijo y exagerado en el mundo**: así, al alejarse se achican y dan sensación de lejanía. Cuando miden menos de `MODEL_MIN_PX` en pantalla (`screenPx`) se ocultan. Solo lo que la cámara sigue en una expedición (vehículo, avistajes) se escala con la distancia. No es un dato: los modelos son ilustraciones con tamaño exagerado.
   - No: `g.scale.setScalar(distance * k)` sin tope, o un tamaño fijo que de cerca llena la pantalla.
   - Sí: `const size = seaModelSize(px, distance)` (o `placeModelSize`) y `g.visible = screenPx(size, distance, height) >= MODEL_MIN_PX`.
7. Todo modelo nuevo se registra en `VEHICLE_MODELS` o `SCENE_MODELS`, para que la prueba de detalle lo cubra.
8. Los efectos (humo, soplido de ballena, estela) no son modelos y no tienen mínimo, pero también se hacen con cajas.

## Guardián
Prueba del mínimo de detalle.

- Prueba: `pnpm --filter @antartida/react-ui test` (`packages/react-ui/test/models.test.ts`). Falla si un modelo registrado tiene menos cajas o colores que el mínimo.
- Documento de diseño: `docs/diseno/estilo-voxel.md`.
