# Plan: Pendientes del 3D (mejoras de realismo y deuda técnica)

Estado: **alcance elegido por Lk (11 nov 2026): entran M1, M3, M4 y los pendientes técnicos.** Cada uno se ejecuta cuando exista su issue asignado (regla de `AGENTS.md`), en su propio PR.

Restricción: **nadie del equipo tiene cuenta de NASA Earthdata.** Las fuentes que la exigen quedan descartadas. Si al verificarla una fuente pide esa cuenta, se frena y se busca otra; no se crea una cuenta por el proyecto.

Origen: lo que quedó sin hacer de `plan-realismo-3d.md` y de `plan-oceano-3d.md` (issues #15 y #16), más lo que salió en la revisión del 11 nov 2026. Esos dos planes se borraron al terminar; quedan en el historial de git.

Ya hecho, no repetir:
- M2: batimetría IBCSO v2 y océano dibujado y animado (#15 y #16).
- Fauna, témpanos, Irízar y puntos de interés del mar (#16).
- Costa del 3D sacada de la máscara de Bedmap3, recorte de picos aislados, aspecto del hielo y tono propio del hielo flotante (#16).
- Borrado de `terrain-elevation-grid.bin`.

Fechas que limitan (`ROADMAP.md`):
- **Mar 17 nov:** último día para sumar funcionalidades.
- **Mié 18 nov 19:00:** `main` congelado.

## Regla para todo dataset nuevo

Cada dataset nuevo se trata igual que Bedmap3 e IBCSO:
- se registran URL, organismo, licencia, cita y fecha de consulta en `docs/datos-relieve.md`;
- se descarga a `~/.cache/antartida3d/<dataset>/`, fuera del repo;
- se agrega su script a `packages/core/scripts/`;
- solo se commitea el producto liviano generado.

**Las fuentes de abajo son nombres conocidos que hay que verificar antes de usar.** Las URLs exactas, licencias y condiciones de descarga quedan como pendientes. No se inventan.

## Mejoras con datos nuevos

### M1. Imagen satelital de la superficie como capa de detalle

**Qué es.** Un mosaico satelital de todo el continente, reproyectado al espacio del mapa y mezclado en el shader del relieve como textura de detalle en escala de grises, sobre la acuarela. Mostraría lo que hoy falta:
- las estrías de flujo de las barreras de hielo (Ross, Ronne), que Lk extrañó el 11 nov;
- los campos de grietas, las zonas de hielo azul y las costas rocosas.

**Fuente candidata, a verificar:** **LIMA** (Landsat Image Mosaic of Antarctica, USGS), en https://lima.usgs.gov/. El sitio respondía el 11 nov 2026. Probablemente es de dominio público. Hay que confirmar la licencia y que la descarga no pida cuenta.

Descartado: MOA (NSIDC), porque NSIDC pide cuenta de Earthdata.

**Ventajas.** Es el salto de realismo más grande, con dato real y citable. Se puede aplicar al 30-50 % como «textura de lápiz», sin volverse fotográfico.

**Desventajas.**
- Suma unos 1-3 MB por resolución.
- El mosaico original pesa del orden de GB y hay que reproyectarlo.
- Si se mezcla de más, choca con el estilo dibujado.
- Puede tener costuras entre escenas.

**Esfuerzo:** medio, entre medio día y un día.

### M3. Más detalle en las montañas (REMA)

**Qué es.** Normales de alta resolución solo para la Península y los Transantárticos, mezcladas donde exista el detalle. Bedmap3 queda en unos 2-4 km por celda después del remuestreo, y las crestas se pierden de cerca.

**Fuente:** **REMA** (Polar Geospatial Center). La licencia CC BY 4.0 se confirmó el 11 nov 2026. Falta confirmar el mosaico de 100 m.

**Ventajas.** Las cordilleras se ven nítidas al acercarse, también en la bajada a Marambio.

**Desventajas.**
- Solo se nota de cerca.
- Hay que bajar los mosaicos regionales, que vienen en miles de archivos.
- Suma unos 2-5 MB.
- REMA va referido al elipsoide: sirve para las normales, pero no para mezclar alturas.

**Esfuerzo:** medio, entre medio día y un día.

### M4. Hachures y estrías según la velocidad real del hielo

**Qué es.** Con un mapa de velocidad del hielo, los trazos siguen la dirección real del flujo y su densidad muestra la velocidad. Los grandes glaciares (Thwaites, Pine Island, Lambert) se verían como ríos de trazos, y las barreras de hielo mostrarían sus estrías de flujo desde la boca de cada glaciar.

**Fuente candidata, a verificar:** **ITS_LIVE** (NASA JPL, programa MEaSUREs), mosaicos de velocidad del hielo, en https://its-live.jpl.nasa.gov/. Los datos están en un bucket S3 público (`its-live-data`), que el 11 nov 2026 respondió sin login a un listado. Hay que confirmar la licencia, el mosaico antártico que conviene y la cita.

Descartado: el mapa de velocidad InSAR de NSIDC (NSIDC-0484), porque su página dice «Earthdata Login account is required to access these data» (consultado el 11 nov 2026).

**Ventajas.**
- Es dato científico real dibujado a mano: lo más afín al estilo.
- Se conecta con «Glaciares que cambian» (Thwaites).
- Pesa menos de 1 MB.

**Desventajas.**
- Trazos continuos que sigan un flujo en un shader son difíciles de lograr.
- Necesita calibración con capturas.
- Si ITS_LIVE terminara pidiendo cuenta, M4 se frena: no hay otra fuente sin cuenta identificada.

**Esfuerzo:** medio-alto, alrededor de un día.

## Pendientes técnicos chicos (sin datos nuevos)

- [ ] **Comprimir `terrain-relief-4096.webp` con pérdida** (calidad ~90). Hoy pesa unos 14 MB y podría quedar en 2-3 MB. El canal alfa (altura) tiene que quedar sin pérdida o pasar a otra textura. Verificar con capturas.
- [ ] **Revisar `preserveDrawingBuffer: true`** en `packages/react-ui/src/map3d/Map3DLayer.tsx`. Lo necesitan los E2E que leen píxeles, pero cuesta rendimiento en celulares. Se podría activar solo en los tests.
- [ ] **Encuadre de la vista inicial en escritorio:** el borde sur del continente queda bajo el degradé inferior. Probar `margin` 1,15 en `homePose3D` (`packages/core/src/camera.ts`, hoy 1,08).
- [ ] **Prueba en un teléfono físico de gama media**, con los fps anotados en `docs/rendimiento.md`. La hace Lk más adelante, no en el #16.

## Ideas fuera de alcance por ahora

- Fauna e Irízar en el mapa 2D (S10 de `plan-oceano-3d.md`): el 2D no se tocó en el #16.

## Orden sugerido

1. Los pendientes técnicos: son chicos y bajan el peso en celulares.
2. M1, que da más realismo por hora de trabajo.
3. M4, que agrega las estrías y los ríos de trazos.
4. M3, si queda tiempo antes del 17 nov.

## Verificación de cada mejora

```sh
pnpm test && pnpm typecheck && pnpm build && pnpm e2e
md5sum packages/core/src/assets/map-paint-{768,2048,4096}.webp   # 2D sin cambios
cd scripts/bench && npx tsx src/captures.ts
```

Las capturas se comparan con las actuales de `docs/rendimiento/capturas/3d/`. Cada mejora actualiza `docs/datos-relieve.md` con fuente, licencia, archivos y peso.
