# Plan: Más realismo en el relieve 3D (para el 12 de noviembre)

Estado: **borrador para decidir.** No ejecutar hasta que Lk elija qué mejoras entran y exista su issue asignado (regla de `AGENTS.md`).

Contexto: el 3D de `apps/dibujado` ya usa la superficie real de Bedmap3, con luz rasante, sombras, oclusión, tinte por altura, brillo del hielo y bruma (ver `docs/datos-relieve.md`). Lo que falta para que se vea «real» es el detalle de la superficie del hielo y del fondo del mar.

Fechas que limitan (`ROADMAP.md`):
- **Mar 17 nov:** último día para sumar funcionalidades.
- **Mié 18 nov 19:00:** `main` congelado.

Cada mejora de abajo es independiente y entra como su propio issue y PR.

## Regla para todas las mejoras

Cada dataset nuevo se trata igual que Bedmap3:
- se registran URL, organismo, licencia, cita y fecha de consulta en `docs/datos-relieve.md`;
- se descarga a `~/.cache/antartida3d/<dataset>/`, fuera del repo;
- se agrega su script a `packages/core/scripts/`;
- solo se commitea el producto liviano generado.

**Las fuentes de abajo son nombres conocidos que hay que verificar antes de usar.** Las URLs exactas, licencias y condiciones de descarga quedan como pendientes. No se inventan.

## Mejoras propuestas

### M1. Imagen satelital de la superficie como capa de detalle

**Qué es.** Un mosaico satelital de todo el continente, reproyectado al espacio del mapa y mezclado en el shader como textura de detalle en escala de grises, sobre la acuarela. Mostraría lo que hoy no existe: líneas de flujo de los glaciares, campos de grietas, zonas de hielo azul, márgenes de barreras y costas rocosas.

**Fuentes candidatas, a verificar:**
- **LIMA** (Landsat Image Mosaic of Antarctica, USGS). Probablemente de dominio público.
- **MOA** (MODIS Mosaic of Antarctica, NSIDC). Puede requerir una cuenta de NASA Earthdata.

**Ventajas**
- Es el salto de realismo más grande: la superficie se ve como en las fotos satelitales.
- Es un dato real y citable, coherente con la regla del eje.
- Encaja con el estilo: se puede aplicar al 30-50 % como «textura de lápiz» sobre la acuarela, sin volverlo fotográfico.

**Desventajas**
- Agrega peso: una textura de 2048 en escala de grises con pérdida pesa unos 1-3 MB por resolución.
- Hay que reproyectar y recortar el mosaico (es pesado, del orden de GB), igual que con Bedmap3.
- Si se mezcla de más, choca con el estilo dibujado. Hay que calibrar la mezcla con capturas.
- Puede haber costuras o diferencias de iluminación entre escenas del mosaico.

**Esfuerzo estimado:** medio, entre medio día y un día.

### M2. Fondo del mar real (batimetría IBCSO)

**Qué es.** El océano deja de ser un plano: se modela el fondo con la batimetría del Océano Austral. El agua queda como una superficie semitransparente encima. Se verían la plataforma continental, el talud y las fosas, y el bloque se vería como una maqueta completa.

**Fuente candidata, a verificar:** **IBCSO** v2 (International Bathymetric Chart of the Southern Ocean). Probablemente con licencia CC BY 4.0.

**Ventajas**
- El bloque gana mucha profundidad visual: el borde del continente deja de terminar en un plano.
- Sirve para la expedición Océano (#2) y para contar el Mar de Weddell.
- Es un dato real que hoy falta: el océano es la única parte «inventada» del 3D.

**Desventajas**
- Es la mejora más cara en trabajo: una malla nueva, un material de agua transparente y un orden de dibujo correcto entre agua, fondo y terreno.
- Agrega peso: otra malla y otra textura, unos 4-8 MB.
- Al pasar la cámara por debajo del nivel del mar en vistas bajas puede verse raro; hay que limitar la cámara.
- Se pierde la acuarela plana del océano que hoy une el 2D y el 3D.

**Esfuerzo estimado:** alto, entre 1 y 1,5 días.

### M3. Más detalle en las montañas (REMA a 100 m)

**Qué es.** Bedmap3 tiene celdas de 500 m, y después del remuestreo la malla queda en unos 2-4 km. En la Península y los Montes Transantárticos se pierde el filo de las crestas. La idea es generar normales de alta resolución solo para esas regiones con REMA y mezclarlas donde exista ese detalle.

**Fuente:** **REMA** (Reference Elevation Model of Antarctica, Polar Geospatial Center), con licencia CC BY 4.0 (confirmado el 11 nov 2026). Mosaicos de 2, 10 y 32 m; el de 100 m está por confirmar.

**Ventajas**
- Las cordilleras se ven nítidas al acercarse, que es donde hoy más se nota la falta de detalle.
- Mejora la «bajada» a Marambio, en la Península.
- Es la misma fuente que ya usa Bedmap3 para la superficie: no hay contradicción de datos.

**Desventajas**
- Solo se nota de cerca: en la vista general no cambia nada.
- REMA viene en miles de mosaicos (terabytes en total). Hay que bajar solo los de las regiones elegidas, y eso es engorroso.
- Agrega texturas por región (unos 2-5 MB) y lógica para mezclarlas.
- REMA está referido al elipsoide, no al nivel del mar. Para normales da igual, pero no se puede mezclar la altura directamente.

**Esfuerzo estimado:** medio, entre medio día y un día.

### M4. Hachures según la velocidad real del hielo

**Qué es.** Hoy los hachures siguen la pendiente. Con un mapa de velocidad del hielo, los trazos seguirían la dirección real en que fluye el hielo hacia la costa, y su densidad mostraría la velocidad. Los grandes glaciares (Thwaites, Pine Island, Lambert) aparecerían como ríos de trazos.

**Fuente candidata, a verificar:** **MEaSUREs**, mapa de velocidad del hielo antártico por InSAR (NSIDC). Probablemente requiere una cuenta de NASA Earthdata.

**Ventajas**
- Es lo más original y lo más cercano al estilo dibujado: es dato científico real dibujado a mano.
- Se conecta con contenidos del proyecto: «Glaciares que cambian» (Thwaites) y la expedición Océano.
- Agrega poco peso: un campo de velocidad de 1024 en dos canales pesa menos de 1 MB.

**Desventajas**
- Dibujar trazos continuos que sigan un flujo en un shader es difícil. La versión simple (rayas por píxel) se ve cortada donde el flujo curva.
- Si los trazos son pocos, se pierden. Si son muchos, ensucian. Necesita calibración con capturas.
- Puede requerir crear una cuenta en Earthdata para descargar.

**Esfuerzo estimado:** medio-alto, alrededor de un día.

## Recomendación

Si hay tiempo para una sola mejora, **M1 (imagen satelital)**: es la que más realismo suma por hora de trabajo.

Si hay tiempo para dos, **M1 + M4**. Las dos usan datos reales de la superficie del hielo y refuerzan el estilo dibujado en vez de competir con él.

M2 (batimetría) es la más vistosa en la demo, pero la más cara. Conviene solo si la expedición Océano la va a usar.

M3 conviene solo si la bajada a Marambio se ve pobre de cerca.

## Pendientes técnicos chicos (sin datos nuevos)

- [ ] **Borrar `terrain-elevation-grid.bin`** (2,1 MB) y su generación en `packages/core/scripts/build-terrain.ts`. La app no lo usa: lee la copia que va dentro de las mallas.
- [ ] **Comprimir `terrain-relief-4096.webp` con pérdida** (calidad ~90): pasaría de 11,7 MB a unos 2-3 MB. El canal alfa (altura) tiene que quedar sin pérdida o pasarse a otra textura. Verificarlo con capturas.
- [ ] **Revisar `preserveDrawingBuffer: true`** en `packages/react-ui/src/map3d/Map3DLayer.tsx`. Lo necesita el E2E que lee píxeles, pero cuesta rendimiento en celulares. Se podría activar solo en los tests.
- [ ] **Probar en un teléfono físico de gama media** y anotar los fps en `docs/rendimiento.md`.
- [ ] **Encuadre de la vista inicial en escritorio:** el borde sur del continente queda bajo el degradé inferior. Probar un `margin` de 1,15 en `homePose3D`.

## Verificación de cada mejora

```sh
pnpm test && pnpm typecheck && pnpm build && pnpm e2e
cd scripts/bench && npx tsx src/captures.ts
```

Las capturas se comparan con las actuales de `docs/rendimiento/capturas/3d/`. Cada mejora actualiza `docs/datos-relieve.md`, con fuente, licencia, archivos y peso.

## Preguntas para Lk

1. ¿Qué mejoras entran: M1, M2, M3, M4 o ninguna?
2. ¿Hay alguien del equipo con cuenta de NASA Earthdata? Haría falta para MOA y MEaSUREs.
