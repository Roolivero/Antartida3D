import { METERS_PER_MAP_UNIT } from './relief.ts';

/**
 * Tierra del Fuego, southern Patagonia and the Malvinas in map space: the land the Antarctic
 * terrain (Bedmap3, south of 60° S) does not cover. Built from IBCSO v2 by scripts/build-fuegia.ts.
 * No asset imports here, so the build script (Node) can use it too; the loader is in fuegia-mesh.ts.
 */
export const FUEGIA_BOX = { minX: -96, maxX: 100, minY: 194, maxY: 390 };

/** IBCSO v2 ends at 50° S; the relief sinks to sea level over the last FUEGIA_EDGE_FADE_DEG degrees. */
export const FUEGIA_DATA_LIMIT_LAT = -50.05;
export const FUEGIA_EDGE_FADE_DEG = 0.6;

/**
 * Heights here are multiplied by this, not by the continental VERTICAL_EXAGGERATION: at x50 a
 * 1000 m ridge would stand six map units over a channel less than one unit wide and hide it.
 * The UI legend states it.
 */
export const FUEGIA_VERTICAL_EXAGGERATION = 10;

/**
 * The mesh also carries the water within this many map units of the shore (about 30 km), so the
 * channels show the real coast instead of the ocean plane's Natural Earth one. The paint fades
 * out over the outer FUEGIA_WATER_FADE of that reach.
 */
export const FUEGIA_WATER_REACH = 4;
export const FUEGIA_WATER_FADE = 0.35;
/** Vertex mask values: land, or on water the distance to the shore scaled to 0..FUEGIA_WATER_MASK_MAX. */
export const FUEGIA_LAND_MASK = 255;
export const FUEGIA_WATER_MASK_MAX = 200;

/** Elevation in meters to world height (map units) with the regional exaggeration. */
export function fuegiaWorldHeight(meters: number): number {
  return (meters * FUEGIA_VERTICAL_EXAGGERATION) / METERS_PER_MAP_UNIT;
}

/** Load the relief only when the camera is within this many map units of the region center. */
export const FUEGIA_LOAD_DISTANCE = 1500;
export const FUEGIA_CENTER = {
  x: (FUEGIA_BOX.minX + FUEGIA_BOX.maxX) / 2,
  y: (FUEGIA_BOX.minY + FUEGIA_BOX.maxY) / 2,
};

export function inFuegia(x: number, y: number): boolean {
  return x >= FUEGIA_BOX.minX && x <= FUEGIA_BOX.maxX && y >= FUEGIA_BOX.minY && y <= FUEGIA_BOX.maxY;
}

/**
 * Closest the orbit camera may get to its target (map units). Over Antarctica `base` keeps it off
 * the 4 km plateau; around Tierra del Fuego the land is low and narrow channels need a close look.
 */
export const FUEGIA_MIN_DISTANCE = 8;
export function minCameraDistance(x: number, y: number, base: number): number {
  return inFuegia(x, y) ? Math.min(base, FUEGIA_MIN_DISTANCE) : base;
}
