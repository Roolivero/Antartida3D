# Plan: recorrido guiado y menos carga de información en Orcadas (#61, fase 9)

Rama: `61-expedición-orcadas-recorrido-guiado-y-menos-carga-de-información-fase-9`, creada desde `main` después de mergear el PR #60.
Issue: #61. Antecedentes: `.agents/plans/plan-orcadas-pulido.md` (fases 1 a 8, ya en `main`) y la sección «Expedición Orcadas: pulido» de `docs/decisiones.md`.

## Objetivo

Que la expedición se recorra como «Desde Ushuaia»: guiada, con un dato corto e interesante en cada parada, sin muros de texto y sin obligar a escribir números. En celular, el panel inferior pasa a ser el `BottomSheet` que se arrastra (#46) y la tira de meses se compacta.

Criterio de terminado del issue:
- Un recorrido completo en celular sin escribir ningún número.
- Como mucho una frase y una tarjeta a la vista por parada.
- Las e2e de Orcadas reescritas para el recorrido nuevo, siguiendo con el recorrido por teclado y la prueba de fuentes no verificadas.
- `pnpm test`, `pnpm typecheck`, `pnpm build` y `pnpm e2e` en verde, salvo los dos fallos de `ocean3d` en desktop. Esos ya estaban en `main` y son ajenos a este issue (ver «Fuera de alcance»).

## Entorno y reglas (leer antes de empezar)

- **Reglas del repo:** `AGENTS.md`, `.agents/rules/project/20-web.md` (accesibilidad y teclado, sin scroll horizontal, `prefers-reduced-motion`), `30-estilo-voxel.md` (si se agrega algún modelo) y `core/04-single-source-and-dead-code.md` (borrar lo que quede sin uso).
- **Capas:** la lógica y los datos van en `@antartida/core`, `packages/core/src/orcadas.ts` y `content/orcadas.ts`. La interfaz va en `packages/react-ui/src/orcadas/`. Los estilos, en `packages/core/src/styles/orcadas*.css`.
- **Idioma:** código y comentarios en inglés; textos de la interfaz en español rioplatense (voseo).
- **Fuentes:** no inventar datos. Cada texto de parada sale de una ficha publicable que ya existe (`ORCADAS_FACTS` con fuente verificada) o se marca `[Fuente a definir]` y no se muestra.
- **Dependencias:** ninguna nueva.
- **Pruebas:** no debilitarlas. Si cambia el requisito, se reescriben y se dice cuál cambió.
- **Commits:** un commit por paso grande, en español, con `#61`. Sin `Co-Authored-By` ni firma de agente.
- **Capturas headless:** Chromium del sistema (`/usr/bin/chromium`) con `--use-angle=vulkan`.
  - Abrir la expedición:
    1. si está visible el botón `/Grupo de .*Estación Orcadas/`, tocarlo;
    2. tocar el botón `/^Estación Orcadas, Islas Orcadas del Sur/`;
    3. esperar a que `window.__orcadasReady === true`.
  - La cámara se mueve con `window.__orcadasCamera.setLookAt(...)`.
  - Las capturas van fuera del repo.
- **e2e de Orcadas:** `cd apps/dibujado && npx playwright test -c ../../packages/e2e/playwright.config.ts orcadas --trace off`. Hay perfiles de 390x844, 360x740, 844x390 y 1440x900.

## Estado actual (lo que hay en `main`)

- **Capítulos** (`CHAPTERS` en core): Llegar, Observar, Viajar y Responder. Cada uno tiene su panel con `panelFacts` (como mucho 2 fichas, el resto en `<details class="orc-more">`).
- **Panel:**
  - en escritorio, a la derecha;
  - en celular, abajo, con el botón «Ver más / Ver menos» (`panelExpanded`, en `OrcadasExpedition.tsx`, clase `orc-panel`, líneas cercanas a la 339).
- **Puntos de interés** (`Hotspots.tsx`): screen, mast, house, flag, bay y colony. Cada uno tiene una pose de cámara (`orbit(...)`) y una ficha (`hotspotFacts`).
  - `CHAPTER_KEY_SPOTS` marca cuáles importan en cada capítulo.
  - En escritorio, los demás muestran su rótulo solo al pasar el mouse o con foco.
- **Cámara:** la toma de entrada es fija (`OVERVIEW_POSE_*`); se puede girar ±35° y el zoom tiene tope. Las poses de los puntos están en `HOTSPOTS[].pose`. Con `reduced` no hay vuelos.
- **Observar** (`observation/Observation.tsx`):
  - pestañas con 4 instrumentos (temperatura, presión, viento y nubes);
  - cada uno con deslizador, botones +/−, entrada numérica y el botón «Anotar lectura»;
  - las lecturas van a `s.guesses[kind]`;
  - `observationDone` exige las 4, pero `canAdvanceOrcadas` ya no obliga.
  - Responder (`Answer.tsx`) usa la lectura de temperatura, y si no hay ninguna usa la media del mes.
- **Tira de meses** (`MonthStrip.tsx`): 12 botones con barra de luz y franja de hielo, una leyenda y un «Saber más» con el arco del sol. Va fija arriba de la escena; en celular arranca en `top: 122px`.
- **`BottomSheet`** (`packages/react-ui/src/BottomSheet.tsx`, de #46):
  - props `className`, `labelledBy`, `sheetRef`, `onClose` y `children`;
  - dos tamaños, `small` y `tall` (`.sheet.grows.full`);
  - se arrastra desde cualquier parte del panel; arrastrar hacia abajo desde `small` llama a `onClose`;
  - la regla está en `sheetAfterDrag` (`packages/core/src/gestures.ts`), con `SheetSize = 'small' | 'tall' | 'closed'`;
  - lo usa el selector de transporte de «Desde Ushuaia».

## Pasos

### [x] Paso 1 · Paradas del recorrido en core

1. En `packages/core/src/content/orcadas.ts`, definir `ORCADAS_TOUR`: para cada capítulo, una lista corta de paradas (3 o 4 como mucho).
   - Cada parada tiene `{ id, chapter, spot: OrcadasHotspotId | 'overview', factId, line }`.
   - `line` es una frase de 1 o 2 líneas, como mucho 120 caracteres, sacada de la ficha `factId`.
   - Propuesta inicial, para ajustar con los textos reales de `ORCADAS_FACTS`:
     - **Llegar:**
       1. `overview`: ubicación del istmo (Cancillería);
       2. `flag`: la base más antigua, desde 1904 (Cancillería y Armada);
       3. `house`: Casa Omond, 1903 (HSM 42);
       4. `colony`: fauna (COMNAP).
     - **Observar:** `screen`, «el abrigo protege al termómetro del sol y del viento» (Mossman y OMM).
     - **Viajar:** `overview` con la serie del siglo; las paradas son las eras (1903, 1927, 1951, Hoy) y van de la mano del año.
     - **Responder:** `flag` con la respuesta.
2. `tourStops(chapter)` y `tourStop(chapter, index)` en `orcadas.ts`. Solo devuelven paradas cuya ficha sea publicable (`isPublishable`).
3. **Estado:** sumar `tourIndex: number` a `OrcadasState`, más las acciones `tourNext` y `tourPrev`. Al cambiar de capítulo, `tourIndex` vuelve a 0.
4. **Pruebas en `packages/core/test/`:**
   - cada parada apunta a una ficha publicable;
   - `line` mide como mucho 120 caracteres;
   - `tourNext` llega al final y el botón principal pasa a «Siguiente capítulo»;
   - cambiar de capítulo resetea el índice.

→ verificar: `pnpm --filter @antartida/core test`.

> Enmienda: la frase de Observar («el abrigo protege al termómetro del sol y del viento») no está en ninguna ficha, así que la parada usa `obs-instrumental-1903` («En 1903 había cuatro abrigos meteorológicos...»). La casa usa `done-monumento-hsm42`. Responder no tiene paradas: `Answer` ya es la tarjeta de la respuesta. Se suman `tourGo` (tocar un punto) y `tourAtEnd`; el reducer fija el año de cada parada de Viajar y la acción `year` sincroniza el índice.

### [x] Paso 2 · Tarjeta de parada y cámara que viaja

1. **Componente `TourCard.tsx`** en `react-ui/src/orcadas/`:
   - muestra el número de parada («2 de 4»), la frase `line` y el chip del tipo (Dato real, Simulación, Reconstrucción o Cálculo, con `KindChip`);
   - lleva un enlace corto a la fuente (`orc-src-link`, ya existe), un «Saber más» que despliega la ficha completa (`FactCard`), y los botones «Anterior» y «Siguiente».
   - Teclado: Enter o → para avanzar, ← para volver. El foco queda en «Siguiente».
2. **Cámara:** la parada activa fija `focus` con el `spot` de la parada (la cámara ya vuela a `HOTSPOTS[].pose`, y a la toma de entrada si es `overview`). Con `reduced` no hay vuelo: la cámara salta. Ya funciona así.
3. **Panel de cada capítulo:** queda el título, una frase de entrada (el lead) y la `TourCard`. Las fichas que hoy muestra `panelFacts` pasan a un solo «Saber más del capítulo» al final.
   - Borrar del panel lo que quede repetido entre la tarjeta y las fichas (regla 04).
   - Mantener `panelFacts`/`FactList` solo dentro de ese «Saber más».
4. **Puntos de interés:**
   - tocar un punto lleva a su parada si la tiene en el capítulo;
   - si no la tiene, abre su ficha como hoy (una sola capa flotante, B7);
   - el punto de la parada activa queda resaltado (`is-active`).
5. **Botón principal:** «Siguiente» mientras quedan paradas; «Seguir a Observar» y los demás capítulos en la última.
   - De paso, revisar que la barra del panel siga centrada (`.orc-panel .orc-bar .btn.primary { flex: 1 }`).

→ verificar: `pnpm typecheck`, más capturas de Llegar con sus 4 paradas en 1440 y 390 px.

> Enmienda: un solo botón para avanzar (el principal del panel) y uno para volver («Atrás», que recorre las paradas antes de cambiar de capítulo); la tarjeta no repite «Anterior/Siguiente», pero sigue respondiendo a ← y →. En Viajar se quitaron la regla del año, la fila de eras, las píldoras y la tarjeta de era: el gráfico del siglo ya es un control de año accesible y la tarjeta de parada recorre las eras. La leyenda del gráfico va plegada en «Cómo leer el gráfico». La pregunta guía pasa a ser el título de Llegar, que antes repetía «Estación Orcadas» de la barra superior.

### [x] Paso 3 · Observar sin escribir

1. **Temperatura, la única lectura obligatoria:**
   - el usuario toca o arrastra sobre la columna de la lupa (`Thermometer.tsx`, el cursor de la guía ya existe) y queda marcada con un toque, sin teclado obligatorio;
   - el botón «Anotar lectura» se mantiene para confirmar;
   - el deslizador y la entrada numérica quedan dentro de un `<details>` «Ajuste fino», por accesibilidad: teclado y lector de pantalla siguen pudiendo usarlos.
2. **Presión, viento y nubes pasan a «Mirá también», como opcionales:**
   - se muestran los instrumentos con su lectura real ya dibujada (la aguja, el contador, las nubes), sin pedir nada;
   - quien quiera puede anotarlas con el mismo control de hoy, plegado;
   - el panel no muestra «Te faltan 4 lecturas»: con la temperatura alcanza.
3. **Core:**
   - `observationDone` pasa a significar «temperatura anotada»;
   - sumar `optionalReadingsDone` si el sello de Responder lo necesita;
   - actualizar `orcadas.test.ts`, porque cambia el requisito: dejarlo dicho en el commit.
4. **Responder:** sin cambios de lógica (usa la temperatura). Revisar el texto si mencionaba las 4 lecturas.

→ verificar: `pnpm --filter @antartida/core test`, `pnpm typecheck`, más una captura de Observar en 360 px donde se vean juntos el termómetro y el botón de anotar.

> Enmienda: el cuaderno de lecturas (`Notebook`) sale de Observar porque repetía lo que ya muestra la confirmación; queda en Responder. Los números se muestran con coma decimal. Se quitaron los rótulos del dibujo del abrigo que se encimaban.

### [x] Paso 4 · Panel de celular con `BottomSheet`

1. **Tamaño mínimo:** sumar un tercer tamaño, `'peek'`, que deja a la vista solo el título del capítulo y el botón principal (unos 140 px). El panel de Orcadas nunca se cierra del todo.
   - En core (`gestures.ts`), extender la regla en lugar de duplicarla, por ejemplo con `sheetAfterDragWithPeek(size, draggedUp)` o con un parámetro `minSize`:
     - desde `small`, arrastrar hacia abajo lleva a `peek` (no a `closed`);
     - desde `peek`, arrastrar hacia arriba lleva a `small`;
     - un toque en el tirador cambia `peek` → `small` → `tall`.
   - Sumar las pruebas en `packages/core/test/gestures.test.ts`, o en el archivo donde estén las de `sheetAfterDrag`.
   - En `BottomSheet.tsx`, aceptar el tamaño mínimo como prop opcional, sin romper a «Desde Ushuaia»: su selector sigue cerrándose al arrastrar hacia abajo.
2. **En `OrcadasExpedition.tsx`:**
   - con pantalla menor a 900 px en vertical, el panel se arma con `<BottomSheet className="orc-panel ..." labelledBy=... sheetRef=... onClose={...}>`;
   - `panelExpanded` pasa a derivarse del tamaño (`tall`);
   - borrar el botón «Ver más / Ver menos» y su CSS (`.orc-panel-toggle*`).
3. **Escena:**
   - la cámara de celular sigue usando `OVERVIEW_POSE_MOBILE` y `OVERVIEW_POSE_MOBILE_EXPANDED` según el tamaño; en `peek` vale la pose normal;
   - el recorte de los puntos de interés por debajo del panel (`maxY` en `StationScene.tsx`) tiene que seguir el alto real del panel; leerlo del DOM igual que ya se hace con la tira de meses (`minY`).
4. **Escritorio y horizontal:** no cambian; el panel lateral queda como está.

→ verificar: tests de core, `pnpm typecheck` y la e2e de Orcadas en 390 y 360 px:
- arrastre hacia arriba y hacia abajo, simulado como en `flow.spec.ts`, con `touchscreen` o eventos de puntero;
- un toque en el tirador;
- Enter en el tirador;
- el panel nunca desaparece.

> Enmienda: `sheetAfterDrag` recibe `floor` (`'closed'` por defecto, `'peek'` para Orcadas) en lugar de una función nueva. Con `floor = 'peek'` el `BottomSheet` es una región, no un diálogo, y Escape no lo cierra; acepta `size` y `onSize` para que Orcadas encuadre la escena. El arrastre hacia abajo en tamaño alto mira el scroll del contenedor bajo el dedo, no solo el de la hoja. En peek se ven el nombre del capítulo y el botón principal; al cambiar de parada o tocar un punto, vuelve a small. Los pasos 1 a 4 van en un solo commit porque comparten `OrcadasExpedition.tsx` y `orcadas.css`.

### [x] Paso 5 · Tira de meses compacta en celular

1. Con pantalla menor a 900 px en vertical, la tira se muestra como un chip con el mes actual, la barra de luz y la franja de hielo de ese mes, más «▾» (por ejemplo «Noviembre ▾»).
   - Al tocarlo se despliega la tira completa de 12 meses (el `MonthStrip` de hoy) en una capa con la leyenda y el «Saber más».
   - Se cierra al elegir un mes, con Escape o tocando afuera; el foco vuelve al chip.
   - Accesibilidad: el chip es un `button` con `aria-expanded` y `aria-controls`. Las flechas ← y → siguen cambiando de mes con el chip enfocado.
2. En escritorio y en horizontal queda la tira completa, como hoy.
3. Recalcular `top` y la `minY` de los puntos de interés: se libera unos 100 px de escena en celular.
   - Revisar `OVERVIEW_POSE_MOBILE` y `OVERVIEW_POSE_MOBILE_EXPANDED` en `Hotspots.tsx` para que el escenario quede centrado en el espacio libre.

→ verificar: `pnpm typecheck` y capturas de la toma de entrada en 390 y 360 px, con el chip cerrado y abierto.

> Enmienda: el chip también se usa en celular horizontal (844x390), donde la tira completa tapaba un tercio de la escena y escondía la bandera y el mástil. La tira completa queda solo en pantallas de 900 px o más que no son un celular acostado (`useMediaQuery` en `hooks.ts`). En horizontal hay una toma propia (`OVERVIEW_POSE_LANDSCAPE`), más cerca, porque con la de escritorio el punto de Casa Omond tapaba el del abrigo; los puntos no pasan bajo el panel lateral (se lee su borde) y Fuentes ocupa el lugar del panel en vez de la mitad de abajo.

### [x] Paso 6 · e2e, documentación y cierre

1. **Reescribir las e2e de Orcadas** (`packages/e2e/tests/orcadas*.spec.ts`), porque el requisito cambia; decir cuáles en el commit:
   - **recorrido completo solo con teclado:** Tab y Enter avanzan por las paradas y los capítulos;
   - **recorrido completo en celular sin escribir:** Llegar recorre sus paradas; en Observar se toca el termómetro y se anota; en Viajar se pasan las eras; Responder muestra la respuesta;
   - **como mucho una tarjeta de parada a la vista** y, fuera de `details`, ninguna ficha más en el panel;
   - **se mantienen:** fuentes no verificadas nunca a la vista, B1 a B7 (adaptadas), G6 (puntos de interés dentro de la pantalla y tope del zoom) y la prueba de horizontal 844x390;
   - **nuevas:** el arrastre del `BottomSheet` con el tamaño `peek`, y el chip de meses que se abre, cambia de mes y se cierra.
2. **Documentación:**
   - `docs/decisiones.md`: recorrido guiado, Observar con una lectura obligatoria, `BottomSheet` con `peek` y tira compacta, cada una con su porqué;
   - el README, en la sección del recorrido de Orcadas.
3. **Suite completa:** `pnpm test`, `pnpm typecheck`, `pnpm build` y `pnpm e2e -- --trace off`.
4. **Ensayo del video:** llegar, recorrer las paradas, una lectura de temperatura con un toque, viajar a 1903 y a hoy, y responder. Tiene que entrar en unos 90 segundos.
5. **PR** con `Closes #61`, sin la línea «Generated with». Antes del PR: `git fetch` y `git rebase origin/main`.

> Enmienda: además se pulieron Responder (eje con grados enteros, bitácora en una línea y el detalle de la observación plegado) y la toma de la bandera. «Saber más» de la tarjeta de parada ya no se remonta al cambiar de parada (perdía el foco con ← y →) y la bitácora usa el signo menos tipográfico, como el resto de los gráficos. El PR queda para cuando Lk lo revise.

## Riesgos y decisiones abiertas

- **Paradas sin ficha con fuente:** si un `spot` no tiene una ficha publicable que sirva de `line`, la parada no se crea. Nunca se inventa el texto.
- **`BottomSheet` compartido:** el cambio tiene que ser compatible hacia atrás. Correr `flow.spec.ts` (Ushuaia) en celular antes del commit.
- **Movimiento reducido:** con `reduced`, las paradas cambian de cámara sin vuelo y el `BottomSheet` cambia de tamaño sin animación. Ya lo hacen así.
- **Si falta tiempo, el orden es:** paso 3 (Observar sin escribir), paso 4 (`BottomSheet`), paso 2 (recorrido) y paso 5 (chip de meses).

## Fuera de alcance

- Los dos fallos de `ocean3d` en desktop («seaTime advances», que es el #41, y «document hidden»): vienen de `main` (#56 y #59). Si se confirma que no hay issue para «document hidden», se registra aparte siguiendo la regla 15.
- Cambios a la escena 3D: escenario, hielo, pingüinos, focas y bote quedan como están en `main`.
- Sonido, instrumentos nuevos y capítulos nuevos.
