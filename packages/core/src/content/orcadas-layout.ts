import { DRAWN_SITE_ELEMENTS, type SiteElement, type SiteKind } from './orcadas-site.ts';

/**
 * The Orcadas diorama is a stage, not a map (approved by Lk on 13 Nov 2026): a selection of the
 * base's elements set in a row facing the camera, like a model on a table. Which buildings exist,
 * their kind, proportions, colours and roofs come from the measured site (orcadas-site.ts,
 * OpenStreetMap); where they stand on the stage is illustrative, and the scene label says so.
 *
 * World axes: x to the right of the stage, y up, z towards the viewer. Bahía Scotia is in front
 * (+z) and Bahía Uruguay behind (-z), as seen from the Scotia shore.
 */
export interface StationLayoutEntry {
  id: string;
  /** Center of the element's base, in world units. */
  position: readonly [number, number, number];
  /** Rotation around the vertical axis, in radians. */
  rotationY: number;
  /** Plan size before rotation: [width along x, depth along z], in world units. */
  footprint: readonly [number, number];
}

/** Metres per world unit for building sizes: chunky enough to read as a model. */
export const DIORAMA_METERS_PER_UNIT = 3.5;

/** Ground height of the stage, in world units (the station is 8 m above sea level, COMNAP). */
export const STATION_GROUND_Y = 1.1;

/**
 * Instruments and the flag are drawn larger than real so they can be seen (declared in the UI).
 * The scene draws their models at this scale; their footprints below match it.
 */
export const DIORAMA_PROP_SCALE = 0.75;

const PROP_FOOTPRINT: Partial<Record<SiteKind, readonly [number, number]>> = {
  screen: [0.9, 1.2],
  windMast: [1.1, 1.1],
  flag: [1.0, 1.0],
  boat: [1.43, 0.5],
};

/** Half side of the square of terrain and sea drawn around the stage, in world units. */
export const STAGE_HALF_EXTENT = 50;

/** Where each element stands on the stage: [x, z, rotation around y]. Illustrative. */
const STAGE: Readonly<Record<string, readonly [number, number, number]>> = {
  windMast: [-5.5, -1.1, 0],
  screen: [-3.9, 0.9, 0.12],
  omond: [-1.9, -0.5, -0.06],
  flag: [0.2, 1.4, 0],
  'module-360745961': [2.1, -0.3, 0.08],
  'tower-3653005104': [2.9, -2.5, 0],
  'module-360745962': [5.35, -0.5, -0.1],
  helipad: [9.4, 0, 0],
  boat: [2.4, 3.6, 0.3],
};

/** Ids of the site elements drawn on the stage, from left to right. */
export const DIORAMA_ELEMENT_IDS: readonly string[] = Object.keys(STAGE);

/** Measured site elements drawn in the diorama. */
export const DIORAMA_ELEMENTS: readonly SiteElement[] = DIORAMA_ELEMENT_IDS.map((id) => {
  const e = DRAWN_SITE_ELEMENTS.find((s) => s.id === id);
  if (!e) throw new Error(`Diorama element without a site entry: ${id}`);
  return e;
});

const wave = (x: number, a: number, f: number, p: number) => a * Math.sin(x * f + p);

/**
 * Signed distance to the coast in world units: positive on land, negative at sea. The isthmus
 * crosses the stage from left to right and widens into hills at both ends. Illustrative.
 */
export function worldCoastDistance(x: number, z: number): number {
  const t = Math.min(1, Math.max(0, (Math.abs(x) - 9) / 7));
  const widen = t * t * (3 - 2 * t) * 9;
  const front = 3.9 + widen + wave(x, 0.35, 0.55, 0.4) + wave(x, 0.2, 1.6, 1.3) - z;
  const back = z + 3.8 + widen + wave(x, 0.4, 0.45, 2.1) + wave(x, 0.15, 1.3, 0.2);
  return Math.min(front, back);
}

/** Corners of a rotated footprint in world x/z (local +x along r, like three.js). */
export function footprintCorners(
  x: number,
  z: number,
  w: number,
  d: number,
  r: number
): [number, number][] {
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([u, v]) => [x + (u * w * c) / 2 + (v * d * s) / 2, z - (u * w * s) / 2 + (v * d * c) / 2]);
}

/** Every element of the stage, in world units. */
export const STATION_LAYOUT: readonly StationLayoutEntry[] = DIORAMA_ELEMENTS.map((e) => {
  const [x, z, rotationY] = STAGE[e.id];
  const prop = PROP_FOOTPRINT[e.kind];
  return {
    id: e.id,
    position: [x, e.kind === 'boat' ? 0 : STATION_GROUND_Y, z],
    rotationY,
    footprint: prop ?? [e.footprint[0] / DIORAMA_METERS_PER_UNIT, e.footprint[1] / DIORAMA_METERS_PER_UNIT],
  };
});

export function layoutOf(id: string): StationLayoutEntry {
  const entry = STATION_LAYOUT.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown station layout id: ${id}`);
  return entry;
}
