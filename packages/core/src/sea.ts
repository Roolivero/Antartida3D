import { PTS, TIER, type MapPoint } from './content/points.ts';
import { FOV, HOME_TILT_DEG } from './camera.ts';
import { estimateLabelWidth } from './labels.ts';
import { depthAt, getOceanDepthGrid, type OceanDepthGrid } from './ocean.ts';
import { routeAt } from './route.ts';
import { createSeededRng } from './rng.ts';
import seaAtlasManifest from './assets/sea-atlas.json' with { type: 'json' };

export type SeaSpriteId =
  | 'humpback-back'
  | 'humpback-tail'
  | 'humpback-spout'
  | 'orca'
  | 'minke'
  | 'penguins-iceberg'
  | 'leopard-seal'
  | 'iceberg-lg'
  | 'iceberg-sm'
  | 'irizar'
  | 'irizar-wake';

export interface SeaSpriteAtlasEntry {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  anchorX: number;
  anchorY: number;
}

export const SEA_ATLAS = seaAtlasManifest as {
  size: number;
  cellSize: number;
  sprites: Record<SeaSpriteId, SeaSpriteAtlasEntry>;
};

export const SEA_SPRITE_INDEX: Record<SeaSpriteId, number> = {
  'humpback-back': 0,
  'humpback-tail': 1,
  'humpback-spout': 2,
  orca: 3,
  minke: 4,
  'penguins-iceberg': 5,
  'leopard-seal': 6,
  'iceberg-lg': 7,
  'iceberg-sm': 8,
  irizar: 9,
  'irizar-wake': 10,
};

export type SeaSpeciesKind =
  | 'humpback'
  | 'orca'
  | 'minke'
  | 'penguins'
  | 'seal'
  | 'iceberg'
  | 'irizar'
  | 'irizar-wake';

/** Numeric behavior code passed as per-instance attribute `aKind` to the vertex shader. */
export const SEA_KIND_CODE: Record<SeaSpeciesKind, number> = {
  humpback: 0,
  orca: 1,
  minke: 2,
  penguins: 3,
  seal: 4,
  iceberg: 5,
  irizar: 6,
  'irizar-wake': 7,
};

/** Number of evenly spaced (by arc length) samples of the shared route used by the Irizar. */
export const IRIZAR_ROUTE_SAMPLES = 64;

/**
 * The Ushuaia-Marambio route of `route.ts` (the same line the 2D map draws), sampled at equal
 * arc-length steps. CPU (`routePointAt`) and the sea life shader both walk this exact polyline,
 * so the 3D ship and its marker stay in sync.
 */
export const IRIZAR_ROUTE_POLYLINE: readonly { x: number; y: number }[] = Array.from(
  { length: IRIZAR_ROUTE_SAMPLES },
  (_, i) => routeAt(i / (IRIZAR_ROUTE_SAMPLES - 1))
);

export interface RoutePoint {
  x: number;
  y: number;
  tx: number;
  ty: number;
}

/**
 * Position `(x, y)` and unit tangent `(tx, ty)` on the route at `t` in [0, 1]
 * (0 = Ushuaia, 1 = Marambio), by linear interpolation of IRIZAR_ROUTE_POLYLINE.
 * Read by the sea life of the 3D map (`SeaLife.tsx`).
 */
export function routePointAt(t: number): RoutePoint {
  const last = IRIZAR_ROUTE_SAMPLES - 1;
  const f = Math.max(0, Math.min(1, t)) * last;
  const i = Math.min(last - 1, Math.floor(f));
  const s = f - i;
  const a = IRIZAR_ROUTE_POLYLINE[i];
  const b = IRIZAR_ROUTE_POLYLINE[i + 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: a.x + dx * s, y: a.y + dy * s, tx: dx / len, ty: dy / len };
}

export const IRIZAR_DEFAULT_SPEED = 0.0125;
export const IRIZAR_DEFAULT_PHASE = 0.19;

export interface IrizarState {
  /** Map-space position (0..1000). */
  x: number;
  y: number;
  /** Unit heading vector in map coordinates (points toward Marambio outbound, toward Ushuaia inbound). */
  hx: number;
  hy: number;
  /** Heading angle in radians: Math.atan2(hy, hx). */
  headingRad: number;
  /** Normalized speed in [0, 1]: 0 while moored, smooth ease-in/out to 1 at mid-passage. */
  speed: number;
  /** Parameter in [0, 1] along the Ushuaia (0) -> Marambio (1) route. */
  routeT: number;
  /** Normalized cycle progress in [0, 1). */
  cyclePhase: number;
  /** Direction sign: +1 outbound / moored at Marambio, -1 inbound / moored at Ushuaia. */
  dirSign: 1 | -1;
}

/**
 * Pure evaluation of the ARA Almirante Irizar round-trip cycle at animation time `uTime` (seconds):
 * - [0.00, 0.40): departs Ushuaia (t=0) and sails to Marambio (t=1) with smooth ease-in/out;
 * - [0.40, 0.50): moored at Marambio (t=1, speed=0, no wake);
 * - [0.50, 0.90): returns from Marambio (t=1) to Ushuaia (t=0) with bow oriented in reverse;
 * - [0.90, 1.00): moored at Ushuaia (t=0, speed=0, no wake).
 * Drives the ship of the 3D map (`SeaLife.tsx`).
 */
export function irizarStateAtTime(
  uTime: number,
  speed = IRIZAR_DEFAULT_SPEED,
  phase = IRIZAR_DEFAULT_PHASE
): IrizarState {
  const c = (((uTime * speed + phase) % 1) + 1) % 1;
  let routeT = 0;
  let navSpeed = 0;
  let dirSign: 1 | -1 = 1;

  if (c < 0.4) {
    const u = c / 0.4;
    routeT = u * u * (3 - 2 * u);
    navSpeed = 4 * u * (1 - u);
    dirSign = 1;
  } else if (c < 0.5) {
    routeT = 1;
    navSpeed = 0;
    dirSign = 1;
  } else if (c < 0.9) {
    const u = (c - 0.5) / 0.4;
    routeT = 1 - u * u * (3 - 2 * u);
    navSpeed = 4 * u * (1 - u);
    dirSign = -1;
  } else {
    routeT = 0;
    navSpeed = 0;
    dirSign = -1;
  }

  const pt = routePointAt(routeT);
  const hx = pt.tx * dirSign;
  const hy = pt.ty * dirSign;
  return {
    x: pt.x,
    y: pt.y,
    hx,
    hy,
    headingRad: Math.atan2(hy, hx),
    speed: navSpeed,
    routeT,
    cyclePhase: c,
    dirSign,
  };
}

/**
 * Maps animation time `uTime` (in seconds) to the Bezier parameter `routeT` in [0, 1]
 * along the Ushuaia-Marambio round-trip cycle.
 */
export function irizarRouteTAtTime(
  uTime: number,
  speed = IRIZAR_DEFAULT_SPEED,
  phase = IRIZAR_DEFAULT_PHASE
): number {
  return irizarStateAtTime(uTime, speed, phase).routeT;
}

export interface MapPolygonZone {
  id: string;
  species: SeaSpeciesKind;
  polygon: readonly { x: number; y: number }[];
  source: string;
}

/**
 * Plausible illustrative habitat zones in map coordinates (0..1000).
 * Every zone comment records the verified primary source (organism, URL, date) where opened and
 * verified, and marks specific polygon coordinates or unverified regional bounds with `[Fuente a definir]`.
 */
export const SEA_ZONES: readonly MapPolygonZone[] = [
  {
    // Source: British Antarctic Survey (BAS) & University of East Anglia — Clarke, A., Fisher, A.,
    // Venables, H.J., Allen, L., & Davies, R.G. (2026), "A 26-Year Record of Seasonality and
    // Interannual Variability in Marine Mammal Sightings From Northern Marguerite Bay, Antarctica",
    // Ecology and Evolution 16(3): e73317, https://doi.org/10.1002/ece3.73317 (consulted 2026-11-11);
    // NOAA Fisheries, "Humpback Whale", https://www.fisheries.noaa.gov/species/humpback-whale (consulted 2026-11-11).
    id: 'humpback-peninsula-west',
    species: 'humpback',
    polygon: [
      { x: 70, y: 445 },
      { x: 195, y: 465 },
      { x: 198, y: 635 },
      { x: 68, y: 615 },
    ],
    source:
      'British Antarctic Survey (Clarke et al. 2026, https://doi.org/10.1002/ece3.73317, consultado 2026-11-11) y NOAA Fisheries (https://www.fisheries.noaa.gov/species/humpback-whale, consultado 2026-11-11).',
  },
  {
    // General Southern Ocean summer feeding habitat verified in NOAA Fisheries
    // (https://www.fisheries.noaa.gov/species/humpback-whale, consulted 2026-11-11) and Armada Argentina
    // (https://www.argentina.gob.ar/armada/antartida/fauna-y-flora, consulted 2026-11-11).
    // Specific open-sea polygon coordinates: [Fuente a definir].
    id: 'humpback-open-south',
    species: 'humpback',
    polygon: [
      { x: 470, y: 85 },
      { x: 690, y: 85 },
      { x: 690, y: 175 },
      { x: 470, y: 175 },
    ],
    source:
      'NOAA Fisheries (https://www.fisheries.noaa.gov/species/humpback-whale, consultado 2026-11-11). Polígono regional específico: [Fuente a definir].',
  },
  {
    // Source: British Antarctic Survey (Clarke et al. 2026, https://doi.org/10.1002/ece3.73317, consulted 2026-11-11)
    // and NOAA Fisheries, "Killer Whale", https://www.fisheries.noaa.gov/species/killer-whale (consulted 2026-11-11).
    id: 'orca-peninsula-bellingshausen',
    species: 'orca',
    polygon: [
      { x: 80, y: 640 },
      { x: 195, y: 650 },
      { x: 205, y: 765 },
      { x: 80, y: 750 },
    ],
    source:
      'British Antarctic Survey (Clarke et al. 2026, https://doi.org/10.1002/ece3.73317, consultado 2026-11-11) y NOAA Fisheries (https://www.fisheries.noaa.gov/species/killer-whale, consultado 2026-11-11).',
  },
  {
    // Source: NOAA Fisheries, "Killer Whale", https://www.fisheries.noaa.gov/species/killer-whale (consulted 2026-11-11).
    // Specific open-sea Ross/Southern Ocean polygon coordinates: [Fuente a definir].
    id: 'orca-ross-open',
    species: 'orca',
    polygon: [
      { x: 350, y: 785 },
      { x: 520, y: 805 },
      { x: 520, y: 895 },
      { x: 340, y: 885 },
    ],
    source:
      'NOAA Fisheries (https://www.fisheries.noaa.gov/species/killer-whale, consultado 2026-11-11). Polígono regional específico: [Fuente a definir].',
  },
  {
    // Source: British Antarctic Survey (Clarke et al. 2026, https://doi.org/10.1002/ece3.73317, consulted 2026-11-11)
    // and NOAA Fisheries, "Minke Whale", https://www.fisheries.noaa.gov/species/minke-whale (consulted 2026-11-11).
    // Specific open-ocean polygon coordinates: [Fuente a definir].
    id: 'minke-open-ocean',
    species: 'minke',
    polygon: [
      { x: 185, y: 725 },
      { x: 340, y: 735 },
      { x: 340, y: 870 },
      { x: 175, y: 860 },
    ],
    source:
      'NOAA Fisheries (https://www.fisheries.noaa.gov/species/minke-whale, consultado 2026-11-11) y BAS (Clarke et al. 2026, https://doi.org/10.1002/ece3.73317, consultado 2026-11-11). Polígono regional específico: [Fuente a definir].',
  },
  {
    // Source: NOAA Fisheries, "Minke Whale", https://www.fisheries.noaa.gov/species/minke-whale (consulted 2026-11-11).
    // Specific East Antarctic open-ocean polygon coordinates: [Fuente a definir].
    id: 'minke-east-ocean',
    species: 'minke',
    polygon: [
      { x: 830, y: 380 },
      { x: 940, y: 380 },
      { x: 940, y: 620 },
      { x: 830, y: 620 },
    ],
    source:
      'NOAA Fisheries (https://www.fisheries.noaa.gov/species/minke-whale, consultado 2026-11-11). Polígono regional específico: [Fuente a definir].',
  },
  {
    // Source: British Antarctic Survey — Fretwell, P.T. et al. (2012), "An emperor penguin population
    // estimate: the first global, synoptic survey of a species from space", PLOS ONE 7(4): e33751,
    // https://doi.org/10.1371/journal.pone.0033751 (consulted 2026-11-11);
    // Armada Argentina, "Fauna y Flora", https://www.argentina.gob.ar/armada/antartida/fauna-y-flora (consulted 2026-11-11).
    id: 'penguins-coastal-pack',
    species: 'penguins',
    polygon: [
      { x: 705, y: 140 },
      { x: 880, y: 165 },
      { x: 890, y: 370 },
      { x: 715, y: 320 },
    ],
    source:
      'British Antarctic Survey (Fretwell et al. 2012, https://doi.org/10.1371/journal.pone.0033751, consultado 2026-11-11) y Armada Argentina (https://www.argentina.gob.ar/armada/antartida/fauna-y-flora, consultado 2026-11-11).',
  },
  {
    // Source: British Antarctic Survey (Clarke et al. 2026, https://doi.org/10.1002/ece3.73317, consulted 2026-11-11)
    // and Armada Argentina, "Fauna y Flora", https://www.argentina.gob.ar/armada/antartida/fauna-y-flora (consulted 2026-11-11).
    id: 'seal-pack-ice',
    species: 'seal',
    polygon: [
      { x: 80, y: 455 },
      { x: 195, y: 475 },
      { x: 205, y: 650 },
      { x: 80, y: 635 },
    ],
    source:
      'British Antarctic Survey (Clarke et al. 2026, https://doi.org/10.1002/ece3.73317, consultado 2026-11-11) y Armada Argentina (https://www.argentina.gob.ar/armada/antartida/fauna-y-flora, consultado 2026-11-11).',
  },
  {
    // Source: Armada Argentina, "Fauna y Flora", https://www.argentina.gob.ar/armada/antartida/fauna-y-flora (consulted 2026-11-11).
    // Specific Weddell pack-ice polygon coordinates: [Fuente a definir].
    id: 'seal-weddell-pack',
    species: 'seal',
    polygon: [
      { x: 345, y: 115 },
      { x: 465, y: 115 },
      { x: 465, y: 235 },
      { x: 345, y: 235 },
    ],
    source:
      'Armada Argentina (https://www.argentina.gob.ar/armada/antartida/fauna-y-flora, consultado 2026-11-11). Polígono regional específico: [Fuente a definir].',
  },
  {
    // Source: British Antarctic Survey — Marsh, O.J., Arthern, R.J., & De Rydt, J. (2025),
    // "Ocean tides trigger ice shelf rift growth and calving", Nature Communications 16: 6697,
    // https://doi.org/10.1038/s41467-025-61796-w (consulted 2026-11-11);
    // NSIDC, "Ice Shelves", https://nsidc.org/learn/parts-cryosphere/ice-shelves (consulted 2026-11-11).
    id: 'iceberg-weddell-east',
    species: 'iceberg',
    polygon: [
      { x: 255, y: 95 },
      { x: 865, y: 100 },
      { x: 875, y: 215 },
      { x: 255, y: 215 },
    ],
    source:
      'British Antarctic Survey (Marsh et al. 2025, https://doi.org/10.1038/s41467-025-61796-w, consultado 2026-11-11) y NSIDC (https://nsidc.org/learn/parts-cryosphere/ice-shelves, consultado 2026-11-11).',
  },
  {
    // Source: NSIDC, "Ice Shelves", https://nsidc.org/learn/parts-cryosphere/ice-shelves (consulted 2026-11-11).
    // Specific Ross/East Antarctica drift polygon: [Fuente a definir].
    id: 'iceberg-ross-amundsen',
    species: 'iceberg',
    polygon: [
      { x: 240, y: 745 },
      { x: 760, y: 755 },
      { x: 780, y: 890 },
      { x: 220, y: 885 },
    ],
    source:
      'NSIDC (https://nsidc.org/learn/parts-cryosphere/ice-shelves, consultado 2026-11-11). Polígono regional específico: [Fuente a definir].',
  },
];

/** Point-in-polygon check (ray casting) in 2D map coordinates. */
export function pointInPolygon(
  x: number,
  y: number,
  poly: readonly { x: number; y: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Deterministic Mulberry32 PRNG returning values in [0, 1). */
export { createSeededRng } from './rng.ts';

/**
 * Deterministic hash matching GLSL `fract(sin(x) * 43758.5453123)` so CPU ripple positions
 * and GPU vertex shader whale cycle positions evaluate to the exact same point.
 */
export function fractSin(val: number): number {
  const s = Math.sin(val) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Pure GLSL-equivalent smoothstep in [0, 1].
 */
export function glslSmoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export interface WhaleCycleState {
  /** Opacity in [0, 1]. Guaranteed 0 at cycle boundaries (p = 0 and p = 1) and between poses. */
  alpha: number;
  /** Vertical offset in local quad space (negative when submerged, positive at crest). */
  bobY: number;
  /** Pitch rotation angle in radians (unflipped). */
  rotAngle: number;
  /** Forward progress offset in map units along swimming direction. */
  slideX: number;
  /** Atlas sprite index (2 = spout, 0 = back, 1 = tail, 4 = minke, 3 = orca). */
  spriteIndex: number;
  /** Synchronized ink ripple envelope in [0, 1] for `ocean.glsl.ts` (0 at cycle boundaries). */
  rippleAlpha: number;
}

/**
 * Pure function evaluating the surfacing cycle for whales (`humpback`, `minke`) and `orca`
 * at normalized cycle phase `cyclePhase`.
 * - Starts and ends submerged and invisible (`alpha = 0` at `fract = 0` and `1`);
 * - Emerges rising from the water (`bobY` from negative to crest) with alpha fade-in,
 *   and disappears sinking into the water with alpha fade-out;
 * - Pose changes occur strictly while `alpha === 0` so there are no sprite or scale pops;
 * - Evaluated by `SeaLife.tsx` and, for the ripples, identically in `ocean.glsl.ts`.
 */
export function whaleCycleState(
  cyclePhase: number,
  species: 'humpback' | 'minke' | 'orca' = 'humpback'
): WhaleCycleState {
  const p = (((cyclePhase % 1) + 1) % 1);
  const rippleAlpha =
    species === 'orca' || p <= 0.06 || p >= 0.9
      ? 0
      : Math.sin(((p - 0.06) / 0.84) * Math.PI);

  if (species === 'humpback') {
    const slideX = (p - 0.46) * 4.5;
    if (p >= 0.08 && p < 0.3) {
      const u = (p - 0.08) / 0.22;
      const alpha = glslSmoothstep(0.0, 0.35, u) * (1.0 - glslSmoothstep(0.65, 1.0, u));
      const bobY = -0.22 + 0.26 * Math.sin(u * Math.PI);
      const rotAngle = (u - 0.5) * 0.12;
      return { alpha, bobY, rotAngle, slideX, spriteIndex: 2, rippleAlpha };
    }
    if (p >= 0.35 && p < 0.57) {
      const u = (p - 0.35) / 0.22;
      const alpha = glslSmoothstep(0.0, 0.35, u) * (1.0 - glslSmoothstep(0.65, 1.0, u));
      const bobY = -0.22 + 0.26 * Math.sin(u * Math.PI);
      const rotAngle = (u - 0.5) * 0.22;
      return { alpha, bobY, rotAngle, slideX, spriteIndex: 0, rippleAlpha };
    }
    if (p >= 0.62 && p < 0.84) {
      const u = (p - 0.62) / 0.22;
      const alpha = glslSmoothstep(0.0, 0.35, u) * (1.0 - glslSmoothstep(0.65, 1.0, u));
      const bobY = -0.22 + 0.28 * Math.sin(u * Math.PI);
      const rotAngle = (u - 0.4) * 0.2;
      return { alpha, bobY, rotAngle, slideX, spriteIndex: 1, rippleAlpha };
    }
    const spriteIndex = p < 0.325 ? 2 : p < 0.595 ? 0 : 1;
    return { alpha: 0, bobY: -0.22, rotAngle: 0, slideX, spriteIndex, rippleAlpha };
  }

  if (species === 'minke') {
    const slideX = (p - 0.45) * 5.5;
    if (p >= 0.12 && p < 0.78) {
      const u = (p - 0.12) / 0.66;
      const alpha = glslSmoothstep(0.0, 0.28, u) * (1.0 - glslSmoothstep(0.72, 1.0, u));
      const bobY = -0.22 + 0.26 * Math.sin(u * Math.PI);
      const rotAngle = (u - 0.5) * 0.18;
      return { alpha, bobY, rotAngle, slideX, spriteIndex: 4, rippleAlpha };
    }
    return { alpha: 0, bobY: -0.22, rotAngle: 0, slideX, spriteIndex: 4, rippleAlpha };
  }

  // Orca pod member: surfacing with fade-in/out and rising/sinking arc
  const slideX = (p - 0.43) * 6.0;
  if (p >= 0.1 && p < 0.76) {
    const u = (p - 0.1) / 0.66;
    const alpha = glslSmoothstep(0.0, 0.28, u) * (1.0 - glslSmoothstep(0.72, 1.0, u));
    const bobY = -0.22 + 0.26 * Math.sin(u * Math.PI);
    const rotAngle = (u - 0.5) * 0.2;
    return { alpha, bobY, rotAngle, slideX, spriteIndex: 3, rippleAlpha: 0 };
  }
  return { alpha: 0, bobY: -0.22, rotAngle: 0, slideX, spriteIndex: 3, rippleAlpha: 0 };
}

/**
 * Continuous periodic lemniscate drift around a stationary center (without `fract()` resets).
 * Used by tabular icebergs, penguins on ice floes, and leopard seals.
 */
export function driftOffsetAtTime(
  uTime: number,
  speed: number,
  phase: number,
  radius: number
): { dx: number; dy: number } {
  const t = (uTime * speed + phase) * Math.PI * 2;
  return {
    dx: Math.cos(t) * radius,
    dy: Math.sin(2 * t) * 0.5 * radius,
  };
}

/**
 * Pure function computing a whale's map-space surfacing position `(x, y)` during cycle `cycleIndex`.
 * Used both by `SeaLife.tsx` and when updating ocean ink ripples.
 */
export function whaleCyclePosition(
  centerX: number,
  centerY: number,
  radius: number,
  instanceSeed: number,
  cycleIndex: number
): { x: number; y: number } {
  if (cycleIndex <= 0) {
    return { x: centerX, y: centerY };
  }
  const h1 = fractSin(instanceSeed * 12.9898 + cycleIndex * 78.233);
  const h2 = fractSin(instanceSeed * 39.346 + cycleIndex * 11.135);
  const angle = h1 * Math.PI * 2;
  const dist = radius * (0.2 + 0.65 * h2);
  return {
    x: centerX + Math.cos(angle) * dist,
    y: centerY + Math.sin(angle) * dist,
  };
}

/**
 * Projects a map-space point `(x, y)` at world height `h` into screen pixels `(sx, sy)`
 * for `homePose3D(vw / vh)`. Used to guarantee that no generated sea life instance is
 * within 40 px of any `PTS` marker in the initial 3D overview at 1440x900 or 390x844.
 */
export function projectInHomePose3D(
  x: number,
  y: number,
  h: number,
  vw: number,
  vh: number
): { sx: number; sy: number; visible: boolean } {
  const aspect = vw / vh;
  const tilt = (HOME_TILT_DEG * Math.PI) / 180;
  const tanV = Math.tan((FOV * Math.PI) / 360);
  const fitWidth = 360 / (tanV * aspect);
  const fitDepth = (360 * Math.sin(tilt)) / tanV + 360 * Math.cos(tilt);
  const distance = Math.max(fitWidth, fitDepth) * 1.08;

  const camY = distance * Math.sin(tilt);
  const camZ = distance * Math.cos(tilt);

  const wx = x - 500;
  const wy = h;
  const wz = y - 500;

  const rx = wx;
  const ry = wy - camY;
  const rz = wz - camZ;

  const cx = rx;
  const cy = ry * Math.cos(tilt) - rz * Math.sin(tilt);
  const cz = -ry * Math.sin(tilt) - rz * Math.cos(tilt);

  if (cz <= 10) {
    return { sx: -9999, sy: -9999, visible: false };
  }

  const ndcX = cx / (cz * tanV * aspect);
  const ndcY = cy / (cz * tanV);
  const visible = ndcX >= -1.1 && ndcX <= 1.1 && ndcY >= -1.1 && ndcY <= 1.1;

  return {
    sx: ((ndcX + 1) * vw) / 2,
    sy: ((-ndcY + 1) * vh) / 2,
    visible,
  };
}

/** Minimum map-space distance to any `PTS` point to guarantee >= 40 px separation in homePose3D. */
export const MIN_PTS_MAP_DISTANCE = 86;
export const MIN_PTS_SCREEN_PX = 40;
/** Minimum screen-space distance (in px) between any two icebergs in `homePose3D` at 1440x900. */
export const MIN_ICEBERG_SCREEN_PX = 60;

/** Computes the screen-space label bounding box for a `MapPoint` in `homePose3D`. */
export function getPtsLabelBox(
  pt: MapPoint,
  m: { sx: number; sy: number }
): { x1: number; y1: number; x2: number; y2: number } {
  const sub = pt.tier === 'A' ? 'Expedición disponible' : TIER[pt.tier];
  const w = estimateLabelWidth(pt.title, sub);
  // The label side is chosen at runtime by labelSide (labels.ts) from the room on screen, so cover both
  // possible sides instead of guessing one.
  const x1 = m.sx - 20 - w;
  const x2 = m.sx + 20 + w;
  const y1 = m.sy - 20;
  const y2 = m.sy + 20;
  return { x1, y1, x2, y2 };
}

/**
 * Checks whether screen coordinate `(sx, sy)` with icon margin `margin` overlaps with `[x1, y1, x2, y2]`.
 */
export function overlapsLabelBox(
  sx: number,
  sy: number,
  box: { x1: number; y1: number; x2: number; y2: number },
  margin = 11
): boolean {
  return sx >= box.x1 - margin && sx <= box.x2 + margin && sy >= box.y1 - margin && sy <= box.y2 + margin;
}

/**
 * Checks that `(x, y)` (including a movement radius `radius`) stays at least `MIN_PTS_MAP_DISTANCE`
 * in map space, `>= 40 px` on screen in `homePose3D` (both 1440x900 and 390x844) from all `PTS`,
 * and does not cross with any visible `PTS` label rectangle in either viewport.
 */
export function isFarFromPts(
  x: number,
  y: number,
  radius = 0,
  points: readonly MapPoint[] = PTS
): boolean {
  for (const pt of points) {
    if (Math.hypot(x - pt.x, y - pt.y) - radius < MIN_PTS_MAP_DISTANCE) {
      return false;
    }
  }
  const viewports: readonly [number, number][] = [
    [1440, 900],
    [390, 844],
  ];
  for (const [vw, vh] of viewports) {
    const p = projectInHomePose3D(x, y, 0, vw, vh);
    for (const pt of points) {
      const m = projectInHomePose3D(pt.x, pt.y, 3.0, vw, vh);
      if (!m.visible) continue;
      if (Math.hypot(p.sx - m.sx, p.sy - m.sy) < MIN_PTS_SCREEN_PX + 2) {
        return false;
      }
      // Check PTS label rectangle intersection in desktop overview (and mobile overview for Tier A)
      const labelVisible = vw >= 640 || pt.tier === 'A';
      if (labelVisible) {
        const box = getPtsLabelBox(pt, m);
        if (overlapsLabelBox(p.sx, p.sy, box, 11)) {
          return false;
        }
      }
    }
  }
  return true;
}

export interface SeaLifeInstance {
  id: string;
  species: SeaSpeciesKind;
  kindCode: number;
  sprite: SeaSpriteId;
  spriteIndex: number;
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;
  scale: number;
  seed: number;
  zoneId: string;
}

export interface GenerateSeaLifeOptions {
  seed?: number;
  mobile?: boolean;
  customGrid?: OceanDepthGrid;
}

function isDeepEnoughCircle(
  x: number,
  y: number,
  radius: number,
  customGrid?: OceanDepthGrid
): boolean {
  const g = customGrid || getOceanDepthGrid();
  if (!g) return true;
  if (depthAt(x, y, g) >= -25) return false;
  if (radius <= 0) return true;
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const ang = (i / steps) * Math.PI * 2;
    const px = x + Math.cos(ang) * radius;
    const py = y + Math.sin(ang) * radius;
    if (depthAt(px, py, g) >= -25) return false;
  }
  return true;
}

function samplePointInZones(
  zones: readonly MapPolygonZone[],
  rng: () => number,
  radius: number,
  existing: readonly { x: number; y: number }[],
  minSep: number,
  customGrid?: OceanDepthGrid,
  minScreenPx1440 = 0,
  sameSpeciesExisting: readonly { x: number; y: number }[] = []
): { x: number; y: number; zoneId: string } {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const zone = zones[Math.floor(rng() * zones.length)];
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of zone.polygon) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const x = minX + rng() * (maxX - minX);
    const y = minY + rng() * (maxY - minY);
    if (!pointInPolygon(x, y, zone.polygon)) continue;
    if (!isDeepEnoughCircle(x, y, radius, customGrid)) continue;
    if (!isFarFromPts(x, y, radius)) continue;

    let tooClose = false;
    for (const e of existing) {
      if (Math.hypot(x - e.x, y - e.y) < minSep) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    if (minScreenPx1440 > 0 && sameSpeciesExisting.length > 0) {
      const pScreen = projectInHomePose3D(x, y, 0, 1440, 900);
      for (const s of sameSpeciesExisting) {
        const sScreen = projectInHomePose3D(s.x, s.y, 0, 1440, 900);
        if (Math.hypot(pScreen.sx - sScreen.sx, pScreen.sy - sScreen.sy) < minScreenPx1440) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
    }

    return { x, y, zoneId: zone.id };
  }
  throw new Error(`Could not find valid water point for species ${zones[0]?.species}`);
}

/**
 * Generates deterministic sea life, iceberg, and ARA Almirante Irizar instances.
 * Desktop (`mobile = false`): 16 instances (1 Irizar + wake, 3 humpbacks, 1 pod of 3 orcas,
 * 1 minke, 2 penguin groups, 1 leopard seal, 4 tabular icebergs).
 * Mobile (`mobile = true`): 8 instances (half of desktop: 1 Irizar + wake, 1 humpback,
 * 1 pod of 2 orcas, 1 penguin group, 2 tabular icebergs).
 * Every instance is guaranteed to fall in water (`depthAt < -20`) and at least 40 px
 * away on screen from any visible `PTS` marker in `homePose3D` (1440 and 390).
 */
export function generateSeaLifeInstances(
  options: GenerateSeaLifeOptions = {}
): SeaLifeInstance[] {
  const { seed = 202611, mobile = false, customGrid } = options;
  const rng = createSeededRng(seed);
  const instances: SeaLifeInstance[] = [];
  const placedCenters: { x: number; y: number }[] = [];

  // 1. ARA Almirante Irizar + wake (2 instances on both desktop and mobile)
  const irizarInitial = irizarStateAtTime(0, IRIZAR_DEFAULT_SPEED, IRIZAR_DEFAULT_PHASE);
  instances.push({
    id: 'irizar-ship',
    species: 'irizar',
    kindCode: SEA_KIND_CODE.irizar,
    sprite: 'irizar',
    spriteIndex: SEA_SPRITE_INDEX.irizar,
    x: irizarInitial.x,
    y: irizarInitial.y,
    radius: 0,
    phase: IRIZAR_DEFAULT_PHASE,
    speed: IRIZAR_DEFAULT_SPEED,
    scale: 1.25,
    seed: 1,
    zoneId: 'ushuaia-marambio-route',
  });
  instances.push({
    id: 'irizar-wake',
    species: 'irizar-wake',
    kindCode: SEA_KIND_CODE['irizar-wake'],
    sprite: 'irizar-wake',
    spriteIndex: SEA_SPRITE_INDEX['irizar-wake'],
    x: irizarInitial.x - irizarInitial.hx * 8,
    y: irizarInitial.y - irizarInitial.hy * 8,
    radius: 0,
    phase: IRIZAR_DEFAULT_PHASE,
    speed: IRIZAR_DEFAULT_SPEED,
    scale: 1.2,
    seed: 2,
    zoneId: 'ushuaia-marambio-route',
  });
  placedCenters.push({ x: irizarInitial.x, y: irizarInitial.y });

  // 2. Humpback whales: 3 on desktop, 1 on mobile (24..28 s surfacing cycle)
  const humpbackCount = mobile ? 1 : 3;
  const peninsulaHumpbackZone = SEA_ZONES.filter((z) => z.id === 'humpback-peninsula-west');
  const openHumpbackZone = SEA_ZONES.filter((z) => z.id === 'humpback-open-south');
  const humpbackPhases = [0.58, 0.32, 0.06];
  const humpbackCycleSecs = [24, 25, 28];
  const poseSprites: SeaSpriteId[] = ['humpback-back', 'humpback-tail', 'humpback-spout'];
  for (let i = 0; i < humpbackCount; i++) {
    const zones = i < 2 ? peninsulaHumpbackZone : openHumpbackZone;
    const radius = 5.5;
    const pt = samplePointInZones(zones, rng, radius, placedCenters, 38, customGrid);
    placedCenters.push(pt);
    const phase = humpbackPhases[i % humpbackPhases.length];
    const cycleSec = humpbackCycleSecs[i % humpbackCycleSecs.length] + rng() * 0.5;
    const baseSprite = poseSprites[i % 3];
    instances.push({
      id: `humpback-${i}`,
      species: 'humpback',
      kindCode: SEA_KIND_CODE.humpback,
      sprite: baseSprite,
      spriteIndex: SEA_SPRITE_INDEX[baseSprite],
      x: pt.x,
      y: pt.y,
      radius,
      phase,
      speed: 1 / cycleSec,
      scale: 1.05 + (i % 3) * 0.06,
      seed: 100 + i * 17,
      zoneId: pt.zoneId,
    });
  }

  // 3. Orcas: 1 pod of 3 on desktop, 1 pod of 2 on mobile (staggered surfacing with fade)
  const orcaPodSize = mobile ? 2 : 3;
  const orcaZones = SEA_ZONES.filter((z) => z.species === 'orca');
  const podZone = [orcaZones[0]];
  const podRadius = 12;
  const podCenter = samplePointInZones(podZone, rng, podRadius, placedCenters, 38, customGrid);
  placedCenters.push(podCenter);
  const podBasePhase = 0.22 + rng() * 0.04;
  const podSpeed = 1 / (21 + rng() * 3);
  const offsets = [
    { dx: -4.5, dy: -2.0 },
    { dx: 4.2, dy: -1.5 },
    { dx: 0.0, dy: 4.0 },
  ];
  for (let m = 0; m < orcaPodSize; m++) {
    const ox = podCenter.x + offsets[m].dx;
    const oy = podCenter.y + offsets[m].dy;
    instances.push({
      id: `orca-0-${m}`,
      species: 'orca',
      kindCode: SEA_KIND_CODE.orca,
      sprite: 'orca',
      spriteIndex: SEA_SPRITE_INDEX.orca,
      x: ox,
      y: oy,
      radius: 4.5,
      phase: (podBasePhase + m * 0.11) % 1,
      speed: podSpeed,
      scale: m === 0 ? 1.04 : 0.9 + m * 0.04,
      seed: 200,
      zoneId: podCenter.zoneId,
    });
  }

  // 4. Minke whale: 1 on desktop, 0 on mobile
  const minkeCount = mobile ? 0 : 1;
  const minkeZones = SEA_ZONES.filter((z) => z.species === 'minke');
  for (let i = 0; i < minkeCount; i++) {
    const zone = [minkeZones[i % minkeZones.length]];
    const radius = 5.0;
    const pt = samplePointInZones(zone, rng, radius, placedCenters, 38, customGrid);
    placedCenters.push(pt);
    instances.push({
      id: `minke-${i}`,
      species: 'minke',
      kindCode: SEA_KIND_CODE.minke,
      sprite: 'minke',
      spriteIndex: SEA_SPRITE_INDEX.minke,
      x: pt.x,
      y: pt.y,
      radius,
      phase: 0.26,
      speed: 1 / (23 + rng() * 4),
      scale: 0.94,
      seed: 300 + i * 19,
      zoneId: pt.zoneId,
    });
  }

  // 5. Penguins on small ice floe: 2 on desktop, 1 on mobile
  const penguinCount = mobile ? 1 : 2;
  const penguinZones = SEA_ZONES.filter((z) => z.species === 'penguins');
  for (let i = 0; i < penguinCount; i++) {
    const radius = 1.2;
    const pt = samplePointInZones(penguinZones, rng, radius, placedCenters, 38, customGrid);
    placedCenters.push(pt);
    instances.push({
      id: `penguins-${i}`,
      species: 'penguins',
      kindCode: SEA_KIND_CODE.penguins,
      sprite: 'penguins-iceberg',
      spriteIndex: SEA_SPRITE_INDEX['penguins-iceberg'],
      x: pt.x,
      y: pt.y,
      radius,
      phase: rng(),
      speed: 0.025,
      scale: 1.0,
      seed: 400 + i * 23,
      zoneId: pt.zoneId,
    });
  }

  // 6. Leopard seal on sea ice: 1 on desktop, 0 on mobile
  const sealCount = mobile ? 0 : 1;
  const sealZones = SEA_ZONES.filter((z) => z.species === 'seal');
  for (let i = 0; i < sealCount; i++) {
    const zone = [sealZones[i % sealZones.length]];
    const radius = 1.2;
    const pt = samplePointInZones(zone, rng, radius, placedCenters, 38, customGrid);
    placedCenters.push(pt);
    instances.push({
      id: `seal-${i}`,
      species: 'seal',
      kindCode: SEA_KIND_CODE.seal,
      sprite: 'leopard-seal',
      spriteIndex: SEA_SPRITE_INDEX['leopard-seal'],
      x: pt.x,
      y: pt.y,
      radius,
      phase: rng(),
      speed: 0.022,
      scale: 0.96,
      seed: 500 + i * 29,
      zoneId: pt.zoneId,
    });
  }

  // 7. Tabular icebergs (large and small): 4 on desktop, 2 on mobile
  const icebergCount = mobile ? 2 : 4;
  const icebergZones = SEA_ZONES.filter((z) => z.species === 'iceberg');
  const placedIcebergs: { x: number; y: number }[] = [];
  for (let i = 0; i < icebergCount; i++) {
    const zone = [icebergZones[i % icebergZones.length]];
    const radius = 2.5;
    const pt = samplePointInZones(
      zone,
      rng,
      radius,
      placedCenters,
      56,
      customGrid,
      MIN_ICEBERG_SCREEN_PX + 16,
      placedIcebergs
    );
    placedCenters.push(pt);
    placedIcebergs.push(pt);
    const isLarge = i % 2 === 0;
    const sprite: SeaSpriteId = isLarge ? 'iceberg-lg' : 'iceberg-sm';
    instances.push({
      id: `iceberg-${i}`,
      species: 'iceberg',
      kindCode: SEA_KIND_CODE.iceberg,
      sprite,
      spriteIndex: SEA_SPRITE_INDEX[sprite],
      x: pt.x,
      y: pt.y,
      radius,
      phase: rng(),
      speed: 0.008 + rng() * 0.005,
      scale: isLarge ? 1.15 : 0.92,
      seed: 600 + i * 37,
      zoneId: pt.zoneId,
    });
  }

  return instances;
}

export const MAX_WHALE_RIPPLES = 8;

export interface WhaleRippleUniform {
  worldX: number;
  worldZ: number;
  speed: number;
  phase: number;
  cycleIndex: number;
}

/**
 * Pure function computing the up to 8 whale emergence positions and cycle parameters
 * for the ocean shader's ink water ripples (`uWhaleRipples` in `ocean.glsl.ts`).
 * Evaluates the exact same `whaleCyclePosition` formula as the vertex shader.
 */
export function computeWhaleRipples(
  instances: readonly SeaLifeInstance[],
  uTime: number
): WhaleRippleUniform[] {
  const whales = instances
    .filter((inst) => inst.species === 'humpback' || inst.species === 'minke')
    .slice(0, MAX_WHALE_RIPPLES);

  return whales.map((w) => {
    const cycleIndex = Math.floor(uTime * w.speed + w.phase);
    const pos = whaleCyclePosition(w.x, w.y, w.radius, w.seed, cycleIndex);
    return {
      worldX: pos.x - 500,
      worldZ: pos.y - 500,
      speed: w.speed,
      phase: w.phase,
      cycleIndex,
    };
  });
}
