# Diseño — Expedición #4: Desde Ushuaia («El cruce»)

Estado: **diseño acordado con el equipo; primera parte implementada** (elección de transporte, viaje sobre el mapa 3D con ritmo del usuario, hitos con fuentes, vehículos voxel, avistajes de fauna con ficha y cuaderno). Falta: icono del vehículo en el mapa 2D, sugerencia de la siguiente expedición y prueba en teléfonos reales. El contenido y las fuentes están en [desde-ushuaia.md](./desde-ushuaia.md) y [desde-ushuaia-fuentes.md](./desde-ushuaia-fuentes.md).

## Idea

Cada expedición del proyecto es una experiencia propia (Fósiles excava; Poncho será un minijuego con el perro). Esta es **el viaje de Ushuaia a la Antártida**, solo de ida. No se anima la vuelta: las expediciones se encadenan en un orden natural.

El viaje ocurre **dentro del mapa 3D que el usuario ya vio**, no en otra escena: el mapa «tiene vida». Después se le sumarán más animales y cosas vivas.

## Recorrido (tres niveles)

1. **Explorar:** el usuario toca Ushuaia y elige un medio real y científico: rompehielos *Almirante Irízar*, avión Hércules C-130 o aviso *Puerto Argentino*. Ve los modelos 3D y compara duración y rol.
2. **Descubrir:** el viaje animado sobre el mapa. **El usuario controla el ritmo** (arrastrar o mantener para avanzar; soltar para pausar; también teclado y botón «Continuar»). La cámara queda siempre centrada en el vehículo: se puede girar y acercar alrededor de él, pero no alejarse arrastrando (decisión posterior del equipo: soltar la cámara no aportaba). Aparecen datos en los hitos: Canal Beagle, salida al mar abierto, Cabo de Hornos, Drake, Convergencia Antártica, 60° S, Shetland, Marambio.
3. **Profundizar:** «Saber más» en cada dato y al llegar. Cierra con cuidado ambiental y logística.

El turismo se menciona como una línea de contexto: no es un transporte jugable (no es parte del eje).

## Fin del viaje y encadenado

- Cada medio llega a su destino real. El vehículo queda estacionado en el mapa.
- El mapa principal sugiere la siguiente expedición (por ejemplo Orcadas) y avisa: «si quedaste con curiosidad por otro medio, volvé a hacer la expedición». Esa sugerencia es una **pieza global del mapa**: se coordina en #2 o en un issue aparte, no se implementa desde #4.

## Logística y preguntas

- Contenido en `EXPEDITION` (`core/src/content/ushuaia.ts`), por id de hito. Cada nota vale para todos, para un tipo de vehículo (`kind`) o para un vehículo (`only`).
- `expeditionAt(hito, vehículo)` filtra notas y pregunta; `quizScore(vehículo, respuestas)` cuenta aciertos. Las dos son puras y tienen pruebas.
- `useVoyage` guarda la opción elegida por id de hito y la borra al empezar o salir del viaje. La primera respuesta queda fija.
- La tarjeta del hito muestra la pregunta, después los datos; la última tarjeta muestra «acertaste X de Y». Detalle del contenido en `desde-ushuaia.md`, sección 8 ter.

## Ushuaia al inicio del viaje

- `Town3D.tsx` dibuja un pueblo voxel (casas de colores con techo de chapa, chimeneas con humo) y el cartel «Ushuaia». No es un botón ni tiene ficha.
- En el centro va la iglesia amarilla y roja con torre, que se ve desde toda la ciudad: es lo que la distingue de un pueblo cualquiera. Se modeló a partir de una foto de referencia que aportó quien lleva el issue; no se usa la foto en la aplicación.
- El resto es una ilustración de una ciudad, no un mapa de sus edificios. El tamaño está exagerado, igual que el de los vehículos.
- **Posición aproximada:** la costa baja pegada al punto donde empieza la ruta (68,30° O, 54,81° S), a unos 2 km. Ahí el relieve mide menos de 20 m. Tierra adentro empiezan las laderas, dibujadas diez veces más altas que las reales: un pueblo apoyado ahí queda arriba de la montaña.
- **El barco no tapa el pueblo:** el viaje en barco arranca unos 10 km adentro de su propia ruta (`SHIP_HEAD_START` en `core/src/voyage.ts`), ya en la bahía. La ruta no cambia: el mapa 2D la dibuja completa desde Ushuaia y el avión sale del punto de siempre. La cámara de salida apunta al vehículo.
- El humo pide cuadros solo con la cámara cerca y se queda quieto con movimiento reducido.

## Avistajes (mapa vivo)

- Los avistajes cercanos a Ushuaia (cormorán, faro Les Éclaireurs, lobos marinos, pingüinera) ya están a la vista al empezar el viaje (`SIGHTING_AT_DEPARTURE` en `core/src/voyage.ts`). Antes aparecían de golpe apenas se avanzaba.

- Durante el viaje aparecen animales cerca del vehículo. Se pueden tocar un rato para abrir una ficha con nombre, un dato curioso y su fuente.
- **La ventana se mide en avance del viaje, no en segundos:** si el usuario pausa, el animal espera. Es justo para cualquier edad y accesible. Si pasa de largo, el animal se aleja.
- Un animal ya visto no desaparece: queda en gris en el mapa y se puede volver a abrir. Los animales siguen visibles mientras hay una tarjeta de hito abierta. Desde el avión no hay avistajes.
- Más fauna cuanto más al sur. El cuaderno cuenta los avistajes («4 de 9»); los perdidos quedan como siluetas «sin ver», lo que invita a repetir el viaje con otro medio.
- Los animales son botones HTML proyectados sobre el canvas, como los marcadores actuales (`ProjectMarkers`): accesibles por teclado, con `aria-label`, sin raycasting. El cuaderno incluye la lista de avistajes alcanzable con Tab.
- También hay **lugares** (faros Les Éclaireurs y San Juan de Salvamento, pingüinera de Isla Martillo): se abren igual que los animales, se dibujan en su posición aproximada y el cuaderno los cuenta aparte. Un lugar fuera de la vista queda sostenido en el borde de la pantalla, en su dirección.
- Durante el viaje se puede retroceder manteniendo «◀»; los hitos ya vistos no repiten su tarjeta. Cada hito se marca en el mapa con un pin (ocre si falta llegar, gris si ya se pasó).
- Cada animal y cada lugar se ve en el mapa con un modelo voxel procedural, dentro de un aro punteado que late para mostrar que se puede tocar; el icono va en la esquina del aro. Los animales se mueven (las aves planean en círculo, los delfines saltan, la ballena sube a respirar, focas y pingüinos se mecen). **Modelos y movimientos son ilustrativos**; con movimiento reducido quedan quietos.
- Solo hay especies con ficha y fuente verificada. Las posiciones son **ilustrativas**. La interfaz ya no lo rotula (decisión del 11-11-2026, a pedido de quien lleva el issue); queda registrado en esta documentación.
- Solapa con #16 (fauna, Irízar, ruta Ushuaia–Marambio): ver «Coordinación».

## Estilo visual

- Vehículos **voxel / estilo Poly Bridge**: cuerpos de cajas, colores planos. Cada vehículo es una lista de cajas fusionadas en una geometría con colores por vértice: una draw call por vehículo, sin archivos `.glb`.
- Reconocibles. Notas de modelado (medidas y colores **aproximados**, de fotos; no se muestran como dato):
  - **Irízar:** superestructura en la mitad de proa, hangar y cubierta de vuelo a popa, casco rojo-anaranjado, superestructura crema, chimenea roja con tope negro, proa rompehielos.
  - **Hércules C-130:** ala alta recta, 4 góndolas con hélices de 4 palas, cola **convencional** (no en T), rampa trasera, nariz roma.
  - **Puerto Argentino:** superestructura en el tercio de proa, cubierta de trabajo larga y baja a popa, gran pluma de grúa, dos chimeneas, casco gris.
- El tamaño se agranda con la distancia de la cámara, como los marcadores (un barco de 120 m es invisible en un mapa de 4.000 km). La interfaz lo marca: «tamaño exagerado».
- Colores desde los tokens de `tokens.css`; los de la librea real, aproximados.

## Arquitectura

- **`packages/core`** (lógica pura, con tests): ruta como curva muestreable por distancia, definida con `project()` sobre puntos reales, transportes, hitos, encuentros con su ventana por avance, fuentes y tipo de dato. La ruta se define una sola vez y la comparte #16.
- **`packages/react-ui/src/map3d`:** capa de vehículos dentro del `Canvas` existente de `Map3DLayer`, con `useFrame`. El canvas usa `frameloop="demand"`, pero el reloj del mar (`useAnimationClock`) ya pide fotogramas a 30 fps (15 en baja calidad) mientras el 3D está visible. El viaje **no agrega fotogramas propios en pausa**: solo llama a `invalidate()` mientras el vehículo se mueve.
- **Cámara:** seguir al vehículo necesita lógica nueva por fotograma en `ControlsBridge`. Las órdenes actuales (`Camera3DCommand`) son de una sola vez. Hay que cuidar que el seguimiento no dispare en cada paso el evento `rest`, que alimenta el agrupado de marcadores.
- **Zoom:** la cámara no baja de 60 unidades de distancia (unos 440 km a esa latitud) y está limitada a ±800. Para ver la salida por el Beagle hay que bajar ese mínimo en la zona.
- **Trazo de tinta:** `InkEffect` detecta bordes por profundidad, así que los vehículos voxel reciben trazo, y lo pierden cuando el monitor de rendimiento apaga el efecto.
- **2D / sin WebGL / movimiento reducido:** el vehículo es un icono SVG sobre la ruta y el viaje avanza por hitos paso a paso.
- **Interfaz** (selector de transporte, ritmo, tarjetas de hito, cuaderno): superpuesta al mapa, no una pantalla aparte. Respeta `20-web.md`: foco, Escape, teclado, `translate3d`, `prefers-reduced-motion`.
- Archivos compartidos que habría que tocar, **con aviso previo en el issue**: `MapView`, `Map3DLayer`, `Map2DLayer`, `AntarcticaApp`, `points.ts` (el punto `campana` pasa a disponible) y la ruta fija de `land.ts`.
- **La ruta fija actual no sirve tal cual.** La curva de `land.ts` (`M36,318 C80,350 140,348 190,306`) solo se dibuja en 2D; en 3D no hay ninguna ruta. Arranca a unos 46 km de Ushuaia, del otro lado del Beagle, termina a 8,5 unidades de Marambio y cruza tierra en sus extremos sobre la costa actual. Hay que redefinirla, no extraerla.

## Rendimiento (celular primero)

- Modelos procedurales y fusionados; materiales planos; pocas draw calls.
- Sin postprocesado extra: se reutiliza el `PerformanceMonitor` actual (baja `dpr` y desactiva el efecto de tinta).
- Código del viaje cargado con `lazy`, como el 3D del mapa.
- Una iteración de rendimiento posterior validará en teléfonos reales; al elegir tecnologías se priorizó esto.

## Bloque aparte: detalle del mapa en Tierra del Fuego y Canal Beagle

Pedido del equipo: al hacer zoom en Ushuaia y Tierra del Fuego el 3D pierde detalle, y el barco recorrerá el Beagle. Interesa que se vea **cómo sale el barco al mar abierto**: un niño ve montañas del otro lado y no entiende cómo se llega al océano.

Causas verificadas en el repo:
- **En 3D, Tierra del Fuego no se dibuja como tierra.** La malla de relieve empieza en x = 150,4 (`TERRAIN_BOX`) y Ushuaia está en x = 31,5. `InkLines` solo entinta la Antártida y las barreras de hielo. La acuarela que incluye Sudamérica se usa como textura de esa malla. En la zona solo queda el plano del océano. El plan del mapa 3D dejó «Sudamérica en relieve» fuera de alcance.
- El relieve viene de Bedmap3, que solo cubre la Antártida.
- Costa de Natural Earth `ne_50m_land` (1:50.000.000): el Beagle apenas se resuelve (queda un hueco de unas 0,5 unidades, cerca de 3,6 km, deformado).
- `build-coastline.ts` simplifica con una tolerancia de 0,9 unidades (unos 6,5 km, más que el ancho del canal) y descarta islas de menos de 4 unidades² (unos 210 km²). Pasar a una costa más fina sin cambiar esos valores no arregla el canal.
- El raster de 4096 px cubre 1240 unidades (lleva 120 de margen por lado): unos 2,2 km por píxel a 55° S, donde una unidad mide 7,3 km. En celular se usa el de 2048: unos 4,4 km por píxel.

Esto sale de leer el código y de cálculos; no se comprobó en pantalla.

Propuesta (a validar):
- **Inset regional en alta resolución** alrededor de Tierra del Fuego y el Drake norte. Hay que **crear la tierra desde cero** (malla, línea de costa y pintura), no solo refinarla: costa más fina (Natural Earth 10 m, dominio público), con tolerancia y área mínima propias, y relieve real.
- **Carga por distancia (LOD):** solo se carga y dibuja cuando la cámara se acerca.
- Relieve candidato: modelo de elevación del IGN argentino (MDE-Ar); revisar licencia y peso antes de elegir. No se agrega nada sin verificar la licencia.
- Mostrar la costa del Beagle, la isla Navarino del otro lado, las montañas y la salida al Atlántico por el paso Mackinlay.
- Es una pieza grande y toca generación de datos y mapa compartido: probablemente merezca un issue propio. Para el avance del 16 de noviembre el viaje puede salir primero con la costa actual, pero un test «la ruta no cruza tierra» fallaría hoy: la ruta nueva se valida contra la costa que esté vigente en cada momento.

## Coordinación con #16 (Lucas)

#16 planea fauna con billboards, el Irízar navegando en loop, una ruta Ushuaia–Marambio compartida entre `ocean.ts` y `land.ts`, y fichas del mar. Hoy nada de eso existe en el código (`ocean.ts` no tiene ninguna ruta). Se propone:
- La **ruta** se define una sola vez en `core`, con puntos reales, y la usan los dos issues.
- El **Irízar** de #16 es ambiente; el de #4 es el vehículo del usuario (modelo voxel). Durante un viaje el de ambiente se oculta.
- **Estilo de la fauna:** decidir con Lucas si todo lo vivo es voxel o si la fauna sigue como billboards ilustrados y solo los vehículos son voxel.
- #16 aporta la capa de fauna ambiental; #4 aporta el sistema de encuentros (ventana por avance, ficha, cuaderno) y los vehículos.
- Nada de esto se acuerda en el issue ajeno sin el visto bueno del equipo.

## Dependencias y alcance del issue

- #4 depende de #2 (estructura común), que aún no está hecha. Decisión: se trabaja sobre archivos propios de la expedición y se corrigen los bugs que aparezcan, avisando en el issue cuando se toquen archivos compartidos.
- Criterio de terminado (del issue): recorrido completo en los tres niveles, fuentes verificadas, simulaciones marcadas, probado en celular y escritorio, `pnpm test && pnpm typecheck` en verde.
