# Plan: helipuerto con helicóptero voxel en Orcadas (#68)

Rama: `68-helipuerto-con-helicóptero-voxel-en-la-escena-de-orcadas`, creada desde `main`.
Issue: #68. Antecedentes: `.agents/plans/plan-orcadas-pulido.md` y `docs/orcadas-emplazamiento.md`.

## Objetivo

Sumar al diorama de la Base Orcadas el helipuerto que ya está medido en `orcadas-site.ts` (OSM way 1198904156) y un helicóptero modelado en bloques posado encima, con el mismo estilo que el resto de la escena.

Criterio de terminado:
- El helipuerto se ve en el encuadre general del escenario y no choca con edificios, fauna ni costa.
- El helicóptero se ve posado sobre el helipuerto solo en la temporada de visitas (noviembre a marzo, COMNAP: «unas 25 visitas de buques por año entre noviembre y marzo»).
- Helipuerto y helicóptero registrados en `SCENE_MODELS`; la prueba de detalle mínimo los cubre.
- Punto de interés «Helipuerto» con una ficha con fuente verificada (COMNAP 2017 y Armada, 15 dic 2025).
- La leyenda de la escena declara que el helicóptero es ilustrativo, igual que los animales y los instrumentos.
- `pnpm test`, `pnpm typecheck` y `pnpm build` en verde. Captura headless revisada.

## Roles

- Implementa: `agy` con el modelo `gemini-4-hydrogen-high`, un paso por llamada.
- Planifica y revisa: Claude Code. Revisa el diff y corre la verificación después de cada paso. Si un paso falla la revisión, se le devuelve a `agy` con las correcciones.

## Reglas para quien implementa

- Leer `AGENTS.md`, `.agents/rules/project/30-estilo-voxel.md` y `.agents/rules/core/04-single-source-and-dead-code.md`.
- Código y comentarios en inglés. Textos de interfaz y docs en español rioplatense.
- Sin dependencias nuevas. Sin tocar archivos fuera de los listados.
- No debilitar pruebas. No commitear (los commits los hace el revisor).
- No inventar datos. El tipo de helicóptero, su librea y su escala son ilustrativos y así se dicen.

## Pasos

### 1. Ubicar el helipuerto en el escenario

Archivo: `packages/core/src/content/orcadas-layout.ts`.

- Agregar `helipad` a `STAGE`, a la derecha del pabellón `module-360745962` (por ejemplo `[9.0, 0, 0]`). Su footprint sale solo de OSM: 13,5 m / 3,5 = 3,86 unidades.
- Ajustar `x` y `z` hasta que pasen las pruebas de separación y de costa de `packages/core/test/orcadas-layout.test.ts`, y las de `packages/react-ui/test/seals.test.ts` y `penguins.test.ts`.
- El terreno se aplana solo alrededor del footprint (`padWeight`); no hace falta tocarlo.

Verificar: `pnpm --filter @antartida/core test` y `pnpm --filter @antartida/react-ui test`.

### 2. Modelos del helipuerto y del helicóptero

Archivo: `packages/react-ui/src/orcadas/stationModels.ts`.

- `buildHelipadBoxes(side: number): Box[]`: losa baja de hormigón gris que apoya en `y = 0`, borde perimetral claro, una «H» blanca hecha de tres cajas y luces de borde en las esquinas y los lados. Al menos 12 cajas y 2 colores.
- `HELICOPTER_BOXES: readonly Box[]`: helicóptero Sea King (el que usó la Armada en el relevo de Orcadas de diciembre de 2025, ver paso 5), nariz hacia `+x`, base en `y = 0`, largo 1. Rasgos: fuselaje con casco tipo bote, cabina con ventanas negras al frente y a los lados, carenado de motores arriba, mástil y buje, rotor principal detenido con palas en cruz (cajas alineadas a los ejes), botalón de cola, rotor de cola, flotadores laterales con ruedas.
- Colores: usar los existentes (`VOXEL_PALETTE` u otros ya definidos). Si hace falta uno nuevo, una constante con nombre y comentario «illustrative livery».
- Registrar ambos en `SCENE_MODELS` (`packages/react-ui/src/voyage/sightingModels.ts`) como getters, igual que `omond` y `radioTower`.

Verificar: `pnpm --filter @antartida/react-ui test` (incluye `models.test.ts`).

### 3. Dibujarlos en la escena

Archivo: `packages/react-ui/src/orcadas/StationScene.tsx`.

- En el `switch` de `geometries`, `case 'helipad'`: `buildHelipadBoxes(length)`.
- Dentro del grupo del elemento `helipad`, el helicóptero posado sobre la losa, escalado para que el rotor ocupe más o menos el lado del helipuerto. Rotor detenido (sin animación).
- Visible solo de noviembre a marzo. Revisar la convención de `month` (0 a 11 o 1 a 12) en el componente antes de escribir la condición, y poner la regla en una función pura de `@antartida/core` (`helicopterOnPad(month)`) con su prueba en Vitest.
- Liberar la geometría nueva en el `useEffect` de limpieza, como las demás.
- El helipuerto pertenece a la era `modern` (ya está en `orcadas-site.ts`): aparece y desaparece como los demás módulos, sin código extra.

Verificar: `pnpm typecheck` y `pnpm --filter @antartida/core test`.

### 4. Leyenda y documentación

- `packages/react-ui/src/orcadas/OrcadasExpedition.tsx`, línea de «Disposición ilustrativa…»: agregar que el helicóptero es ilustrativo y se muestra en la temporada de visitas.
- `docs/orcadas-emplazamiento.md`, sección «Selección»: el helipuerto pasa a dibujarse (nueve elementos).
- `docs/decisiones.md`: entrada corta «Helipuerto y helicóptero en Orcadas» con fuentes (OSM way 1198904156; COMNAP 2017) y qué es ilustrativo (tipo de helicóptero, colores, escala, ubicación en el escenario).
- Si alguna e2e de Orcadas cuenta los elementos o el texto de la leyenda, actualizarla sin debilitarla.

Verificar: `pnpm test && pnpm typecheck && pnpm build`.

### 5. Punto de interés «Helipuerto»

Fuentes (consultadas el 13 de noviembre de 2026 por el planificador):
- COMNAP, Antarctic Station Catalogue (2017), ficha de Orcadas: «Helipad: Yes», «Access: Air, Sea», «Transport facility: Helicopter, Ship», «Period of ship visits per year: January, February, March, November». Ya está en `ORCADAS_SOURCES` como `comnap`.
- Armada Argentina, «El rompehielos ARA "Almirante Irízar" avanza en la Campaña Antártica de Verano» (15 dic 2025), https://www.argentina.gob.ar/noticias/el-rompehielos-ara-almirante-irizar-avanza-en-la-campana-antartica-de-verano. Dice: la campaña empezó «con un operativo de relevo de dotación en la Base Antártica Conjunta Orcadas»; «debido a la gran cantidad de hielo en la zona, el buque tuvo que quedar al garete -a la deriva- en Bahía Scotia» y debió «utilizar un helicóptero Sea King para realizar el traslado»; «en un operativo que duró más de dos horas, se efectuaron 23 vuelos» y se trasladó «a 21 personas de la dotación entrante de la base, combustible y científicos» de la DNA. Es nueva: agregarla.

Archivos:
- `packages/core/src/content/orcadas.ts`:
  - Fuente nueva en `ORCADAS_SOURCES`, id `armada-relevo-2025`, `short` «Armada, 2025», `verified: true`, `consulted` 13 de noviembre de 2026.
  - Ficha nueva `arrival-relevo-sea-king`, `chapter: 'arrival'`, `kind: 'real'`, título «Relevo en helicóptero», fuentes `['armada-relevo-2025', 'comnap']`. Texto: «La base tiene helipuerto. En diciembre de 2025 el hielo no dejó acercarse al rompehielos Irízar, que quedó a la deriva en Bahía Scotia: un helicóptero Sea King hizo 23 vuelos en más de dos horas y llevó a 21 personas de la dotación nueva, combustible y científicos.»
  - `OrcadasHotspotId` suma `'helipad'`; `ORCADAS_HOTSPOT_FACTS.helipad = ['arrival-relevo-sea-king']` (una sola ficha, como exige `orcadas-content.test.ts`).
- `packages/react-ui/src/orcadas/Hotspots.tsx`: `HotspotId` suma `'helipad'`; entrada en `HOTSPOTS` con `label` «Helipuerto», `shortLabel` «Helipuerto», `subtitle` «Por acá llegan la dotación, el combustible y los científicos cuando el hielo no deja pasar al buque», `worldPos` arriba del helicóptero (y de la losa), `pose` con `orbit(...)` como la del bote, `fallbackPct` que no pise los demás.
- `docs/orcadas-fuentes.md`: fila nueva en la tabla para la nota de la Armada, y una línea en «Escena» sobre helipuerto y helicóptero.

Verificar: `pnpm --filter @antartida/core test` (contenido, recorrido y fuentes), `pnpm typecheck`. Revisar si las e2e de Orcadas cuentan los puntos de interés; si lo hacen, actualizar el número esperado.

### 6. Llegada del helicóptero (agregado a pedido de Lk, 13 nov 2026)

Archivos: `packages/react-ui/src/orcadas/stationModels.ts`, `StationScene.tsx`.

- Separar el rotor principal (buje y palas) de `HELICOPTER_BOXES` en `HELICOPTER_ROTOR_BOXES`, con el origen en el eje del mástil, como `WIND_CUPS_BOXES`. `SCENE_MODELS.helicopter` registra los dos juntos para que la prueba de detalle siga cubriendo el modelo completo.
- Llegada, copiando el patrón del Zodiac (`arrivalRef`, `BOAT_ARRIVAL_DURATION`): al abrir la escena en temporada (`helicopterOnPad(month)`) y sin movimiento reducido, el helicóptero entra desde Bahía Scotia (frente, +z, y alto), baja con una curva suave y se posa en unos 6 s. El rotor gira rápido durante el vuelo y frena hasta detenerse unos 2 s después de posarse. Llamar `invalidate()` mientras se mueve (la escena renderiza a demanda).
- Si el mes cambia a temporada con la escena abierta, la llegada se repite; si sale de temporada, el helicóptero desaparece.
- Con `reduced`: posado y rotor quieto desde el inicio, sin animación.
- Sin dependencias nuevas; la rotación del rotor es `rotation.y` del grupo.

Verificar: `pnpm --filter @antartida/react-ui test`, `pnpm typecheck` y captura en enero a mitad de la llegada y al final.

## Estado (13 nov 2026, pausa)

Hecho y pusheado en la rama (`2ed474b`): pasos 1 a 6 y el panel ocultable en escritorio (lo que iba a ser #69, cerrado y sumado a #68). `pnpm test`, `pnpm typecheck` y `pnpm build` en verde.

Falta:
- [ ] `pnpm e2e` completo en esta rama (la corrida en el worktree de #69 se cortó sin resultado).
- [ ] Capturas headless: enero (llegada a mitad y posado), julio (sin helicóptero), panel oculto y visible, a 1440 y 390 px.
- [ ] Borrar el worktree `../Antartida3D-69` (`git worktree remove ../Antartida3D-69`) y la rama `69-ocultar-panel-del-capitulo-en-escritorio` (local y remota).
- [ ] Revisión final del diff contra `main` y PR con `Closes #68`.

### 7. Revisión final (Claude Code)

- Captura headless de la escena en enero (con helicóptero) y en julio (sin helicóptero), a 1440 y 390 px. Chromium del sistema con `--use-angle=vulkan`; abrir la expedición como indica `plan-orcadas-recorrido-guiado.md`.
- Revisar el diff completo contra las reglas del repo.
- Commit por paso grande, en español, con `#68`.

## Fuera de alcance

- Ocultar el punto del helipuerto en las eras antiguas del viaje en el tiempo. Hoy ningún punto de interés se filtra por era (tampoco la bandera); se respeta esa convención.
- El helicóptero sobre el Irízar en el mapa abierto (ya existe como cajas en `vehicles.ts`).
