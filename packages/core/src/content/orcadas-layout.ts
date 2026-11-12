/**
 * Placement of every fixed element of the Orcadas station diorama, in world units.
 * Provisional positions (plan B8): Phase 5 replaces them with sourced, measured ones.
 */
export interface StationLayoutEntry {
  id: string;
  /** Center of the element's base, in world units. */
  position: readonly [number, number, number];
  /** Rotation around the vertical axis, in radians. */
  rotationY: number;
  /** Plan size before rotation: [width along x, depth along z], in world units. */
  footprint: readonly [number, number];
  /** Ids this element touches on purpose (for example a walkway). */
  connectedTo?: readonly string[];
}

export const STATION_LAYOUT: readonly StationLayoutEntry[] = [
  {
    id: 'omond',
    position: [-1.6, 1.45, -1.5],
    rotationY: 0,
    footprint: [2.96, 2.69],
  },
  {
    id: 'moneta',
    position: [2.4, 1.45, -1.4],
    rotationY: 0,
    footprint: [3.72, 3.23],
  },
  {
    id: 'radioMast',
    position: [0, 1.45, -4.3],
    rotationY: 0,
    footprint: [13.66, 1.45],
  },
  {
    id: 'modern',
    position: [6.0, 1.45, 2.4],
    rotationY: 0,
    footprint: [5.30, 2.42],
  },
  {
    id: 'laborc',
    position: [6.6, 1.45, -1.8],
    rotationY: 0,
    footprint: [3.04, 2.04],
  },
  {
    id: 'flag',
    position: [0.2, 1.45, 3.6],
    rotationY: 0,
    footprint: [1.33, 1.33],
  },
  {
    id: 'windMast',
    position: [-7.2, 1.45, -1.2],
    rotationY: 0,
    footprint: [1.48, 1.48],
  },
  {
    id: 'screen',
    position: [-4.5, 1.45, 2.2],
    rotationY: 0,
    footprint: [1.28, 1.63],
  },
  {
    id: 'crates',
    position: [1.7, 1.45, 1.45],
    rotationY: 0,
    footprint: [1.85, 1.35],
  },
  {
    id: 'boat',
    position: [-2.8, 0.42, 8.2],
    rotationY: 0.35,
    footprint: [2.52, 1.00],
  },
];

export function layoutOf(id: string): StationLayoutEntry {
  const entry = STATION_LAYOUT.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown station layout id: ${id}`);
  return entry;
}

/** Axis-aligned bounds [minX, maxX, minZ, maxZ] of the rotated footprint. */
export function footprintBounds(e: StationLayoutEntry): [number, number, number, number] {
  const [w, d] = e.footprint;
  const c = Math.abs(Math.cos(e.rotationY));
  const s = Math.abs(Math.sin(e.rotationY));
  const hx = (w * c + d * s) / 2;
  const hz = (w * s + d * c) / 2;
  const [x, , z] = e.position;
  return [x - hx, x + hx, z - hz, z + hz];
}
