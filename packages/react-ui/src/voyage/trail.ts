import { BufferAttribute, BufferGeometry, DoubleSide, MeshBasicMaterial } from 'three';
import type { TransportKind } from '@antartida/core';

/** One ribbon behind the vehicle. Offsets and widths are in vehicle lengths, from its tail to the end of the trail. */
interface Strip {
  /** Sideways offset of the ribbon's center line: start and end. */
  offset: readonly [number, number];
  width: readonly [number, number];
  alpha: number;
}

interface TrailShape {
  /** Where the trail starts behind the vehicle's center, and how long it is. */
  start: number;
  length: number;
  strips: readonly Strip[];
}

/** ILLUSTRATIVE shapes: a ship's wake (churned water and the two arms of the V) and a plane's contrails. */
export const TRAILS: Record<TransportKind, TrailShape> = {
  ship: {
    start: 0.42,
    length: 5,
    strips: [
      { offset: [0, 0], width: [0.12, 0.36], alpha: 0.5 },
      { offset: [0.1, 0.6], width: [0.035, 0.08], alpha: 0.85 },
      { offset: [-0.1, -0.6], width: [0.035, 0.08], alpha: 0.85 },
    ],
  },
  plane: {
    start: 0.05,
    length: 9,
    strips: [
      { offset: [0.3, 0.3], width: [0.03, 0.11], alpha: 0.8 },
      { offset: [-0.3, -0.3], width: [0.03, 0.11], alpha: 0.8 },
    ],
  },
};

export const TRAIL_STEPS = 28;

/** Pale like --ice; the fade is in the vertex colors. */
export const trailMaterial = new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: DoubleSide });

/** Ribbons with a fixed fade towards the end; the positions are rewritten on every frame. */
export function buildTrailGeometry(kind: TransportKind): BufferGeometry {
  const { strips } = TRAILS[kind];
  const row = TRAIL_STEPS + 1;
  const colors = new Float32Array(strips.length * row * 2 * 4);
  const indices: number[] = [];
  strips.forEach((strip, s) => {
    for (let k = 0; k < row; k++) {
      const fade = strip.alpha * (1 - k / TRAIL_STEPS) ** 1.5;
      for (let side = 0; side < 2; side++) colors.set([0.93, 0.96, 0.97, fade], ((s * row + k) * 2 + side) * 4);
      if (k === TRAIL_STEPS) continue;
      const a = (s * row + k) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(strips.length * row * 2 * 3), 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 4));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Lays the ribbons along the path already travelled. `at(k)` gives the world position and heading
 * of the path `k` vehicle lengths behind the vehicle.
 */
export function updateTrail(
  geometry: BufferGeometry,
  kind: TransportKind,
  size: number,
  at: (lengthsBehind: number) => { x: number; y: number; z: number; heading: number },
): void {
  const { start, length, strips } = TRAILS[kind];
  const positions = geometry.getAttribute('position') as BufferAttribute;
  const row = TRAIL_STEPS + 1;
  for (let k = 0; k < row; k++) {
    const f = k / TRAIL_STEPS;
    const p = at(start + f * length);
    // Unit vector to the right of the direction of travel, on the ground.
    const rx = -Math.sin(p.heading);
    const rz = Math.cos(p.heading);
    strips.forEach((strip, s) => {
      const center = (strip.offset[0] + (strip.offset[1] - strip.offset[0]) * f) * size;
      const half = ((strip.width[0] + (strip.width[1] - strip.width[0]) * f) * size) / 2;
      const i = (s * row + k) * 2;
      positions.setXYZ(i, p.x + rx * (center - half), p.y, p.z + rz * (center - half));
      positions.setXYZ(i + 1, p.x + rx * (center + half), p.y, p.z + rz * (center + half));
    });
  }
  positions.needsUpdate = true;
}
