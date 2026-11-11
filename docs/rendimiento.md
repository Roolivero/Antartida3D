# Rendimiento

> Generado por `pnpm bench` (`scripts/bench`). No editar a mano. La comparación de stacks que eligió esta app está congelada en [`docs/lab/COMPARACION.md`](lab/COMPARACION.md).

Fecha: 2026-11-11 · Máquina: AMD Ryzen 5 7600 6-Core Processor × 12 · Chromium 156.0.8078.47 Arch Linux

## Criterios del handoff

| App | Accesibilidad ≥ 95 | JS inicial < 80 kB gzip | E2E |
|---|---|---|---|
| dibujado | sí (100) | sí (75.9 kB) | ver `pnpm e2e` |

## Peso (kB)

JS inicial = scripts del HTML más todo lo que importan estáticamente. Los `import()` diferidos (costa y expedición) quedan fuera.

| App | JS inicial raw | gzip | brotli | JS total raw | gzip | brotli | CSS raw | gzip | brotli |
|---|---|---|---|---|---|---|---|---|---|
| dibujado | 242.2 | 75.9 | 65.5 | 1270.0 | 349.8 | 291.1 | 20.4 | 4.8 | 4.3 |

## Build y red

| App | Build (s) | Requests en la carga |
|---|---|---|
| dibujado | 0.6 | 16 |

## Lighthouse (mobile, throttling por defecto, mediana de 3)

| App | Performance | Accesibilidad | LCP (ms) | TBT (ms) | CLS |
|---|---|---|---|---|---|
| dibujado | 96 | 100 | 1414 | 216 | 0.001 |

## Interacción con CPU 4x (390 px, táctil)

Formato: tareas largas (tiempo total) · frames > 50 ms / frames medidos · p95 del frame.

| App | Pan | Pinch | Bajada a la expedición |
|---|---|---|---|
| dibujado | 0 (0 ms) · 5/93 · p95 50 ms | 0 (0 ms) · 0/102 · p95 33 ms | 3 (703 ms) · 2/119 · p95 33 ms |

## Zoom con GPU real (1440 px)

GPU: ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 3070/PCIe/SSE2, OpenGL ES 3.2). Trabajo del proceso de GPU mientras se hace zoom: es donde aparecían las trabas (los filtros SVG se re-rasterizan fuera del hilo principal y no se ven en las métricas de arriba). Formato: total · tarea más larga · tareas > 16 ms.

| App | Botones + (3 zooms animados) | Rueda (10 pasos) |
|---|---|---|
| dibujado | 9 ms · máx 3 ms · 0 | 152 ms · máx 3 ms · 0 |

## Océano 3D con animación y fauna (11 de noviembre de 2026)

Escenario medido con `scripts/bench/src/gpu.ts`: 10 s quieto en vista general inclinada a 38° con animación continua de oleaje y fauna marina (16 instancias en escritorio, 8 en móvil), más una rotación orbital de 30° y un acercamiento con zoom.

| Vista y DPR | Tareas largas hilo principal (>50 ms) | GPU total (ms) | Cuadros | GPU por cuadro (ms) | Tarea GPU más larga | Tareas GPU > 16 ms | Llamadas de dibujo (`window.__gl`) |
|---|---|---|---|---|---|---|---|
| 1440×900, dpr 1 (escritorio) | 0 | 306 ms | 425 | 0.72 ms | 3 ms | 0 | 1 (7 en pase de escena) |
| 390×844, dpr 2 (móvil) | 0 | 353 ms | 424 | 0.83 ms | 3 ms | 0 | 1 (7 en pase de escena) |

- **Criterio de escritorio:** 0 tareas largas en hilo principal (cumplido: 0), GPU < 8 ms por cuadro (cumplido: 0.72 ms), llamadas de dibujo nuevas ≤ 5 (cumplido: 2 llamadas nuevas en escena —superficie de agua y malla instanciada de fauna—; 1 llamada en el pase final del compositor).
- **Móvil (390 px, dpr 2):** 0 tareas largas registradas; GPU promedio 0.83 ms por cuadro, tarea máxima 3 ms.

## Capturas

En `docs/rendimiento/capturas/<app>/`: `mapa`, `ficha`, `lista`, `excavacion` y `conclusion`, a 390 y 1440 px.
