import { BufferAttribute, BufferGeometry, Color, MeshBasicMaterial } from 'three';
import type { TransportId } from '@antartida/core';

/** [centerX, centerY, centerZ, sizeX, sizeY, sizeZ, color]. The bow or nose points to +x, y is up. */
type Box = readonly [number, number, number, number, number, number, number];

// Approximate liveries, from photos. The models are illustrations, not measured.
const HULL_RED = 0xc8472a;
const CREAM = 0xf1e6c8;
const BLACK = 0x1f2a36;
const DECK = 0x5e656c;
const NAVY_GREY = 0x8e989f;
const LIGHT_GREY = 0xc9d0d4;
const PLANE_GREY = 0x9aa3a8;
const PLANE_DARK = 0x6f787e;

/** One unit is the length of the vehicle. */
const MODELS: Record<TransportId, readonly Box[]> = {
  // Icebreaker: superstructure on the forward half, hangar and flight deck aft, red hull.
  irizar: [
    [-0.03, 0.03, 0, 0.86, 0.1, 0.2, HULL_RED],
    [0.43, 0.035, 0, 0.08, 0.09, 0.14, HULL_RED],
    [0.485, 0.045, 0, 0.05, 0.07, 0.07, HULL_RED],
    [0.14, 0.125, 0, 0.3, 0.09, 0.17, CREAM],
    [0.2, 0.195, 0, 0.16, 0.05, 0.19, CREAM],
    [0.21, 0.25, 0, 0.015, 0.08, 0.015, BLACK],
    [0.04, 0.2, 0, 0.07, 0.08, 0.08, HULL_RED],
    [0.04, 0.25, 0, 0.07, 0.02, 0.08, BLACK],
    [-0.12, 0.115, 0, 0.16, 0.07, 0.16, CREAM],
    [-0.33, 0.085, 0, 0.24, 0.012, 0.19, DECK],
  ],
  // Antarctic service ship: superstructure on the forward third, long low work deck aft, crane.
  'puerto-argentino': [
    [-0.03, 0.025, 0, 0.86, 0.09, 0.2, NAVY_GREY],
    [0.43, 0.03, 0, 0.08, 0.08, 0.14, NAVY_GREY],
    [0.485, 0.04, 0, 0.05, 0.06, 0.07, NAVY_GREY],
    [0.24, 0.115, 0, 0.22, 0.09, 0.17, LIGHT_GREY],
    [0.27, 0.18, 0, 0.14, 0.04, 0.18, LIGHT_GREY],
    [0.28, 0.23, 0, 0.012, 0.07, 0.012, BLACK],
    [0.11, 0.14, 0.05, 0.04, 0.09, 0.035, DECK],
    [0.11, 0.14, -0.05, 0.04, 0.09, 0.035, DECK],
    [-0.02, 0.12, 0.06, 0.025, 0.1, 0.025, DECK],
    [-0.14, 0.175, 0.06, 0.26, 0.015, 0.02, DECK],
    [-0.25, 0.075, 0, 0.4, 0.01, 0.19, DECK],
  ],
  // C-130: high straight wing, four engines, conventional tail, blunt nose.
  hercules: [
    [0, 0, 0, 0.72, 0.11, 0.11, PLANE_GREY],
    [0.39, -0.008, 0, 0.07, 0.09, 0.09, PLANE_GREY],
    [0.435, -0.015, 0, 0.03, 0.06, 0.06, PLANE_DARK],
    [-0.42, 0.03, 0, 0.14, 0.06, 0.07, PLANE_GREY],
    [0.04, 0.065, 0, 0.13, 0.018, 1.2, PLANE_GREY],
    [-0.43, 0.14, 0, 0.12, 0.17, 0.015, PLANE_GREY],
    [-0.45, 0.065, 0, 0.08, 0.012, 0.4, PLANE_GREY],
    [0.09, 0.045, 0.2, 0.13, 0.04, 0.04, PLANE_DARK],
    [0.09, 0.045, -0.2, 0.13, 0.04, 0.04, PLANE_DARK],
    [0.09, 0.045, 0.4, 0.13, 0.04, 0.04, PLANE_DARK],
    [0.09, 0.045, -0.4, 0.13, 0.04, 0.04, PLANE_DARK],
    [0.16, 0.045, 0.2, 0.006, 0.11, 0.11, BLACK],
    [0.16, 0.045, -0.2, 0.006, 0.11, 0.11, BLACK],
    [0.16, 0.045, 0.4, 0.006, 0.11, 0.11, BLACK],
    [0.16, 0.045, -0.4, 0.006, 0.11, 0.11, BLACK],
  ],
};

/** Flat colors with the shading baked into the vertices: no lights needed. */
export const vehicleMaterial = new MeshBasicMaterial({ vertexColors: true });

/** Face corners of a unit cube (as -1/1 signs) with a flat brightness per face: no lights needed. */
const FACES: readonly { corners: readonly (readonly [number, number, number])[]; shade: number }[] = [
  { corners: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], shade: 0.82 },
  { corners: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]], shade: 0.7 },
  { corners: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]], shade: 1 },
  { corners: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]], shade: 0.5 },
  { corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], shade: 0.9 },
  { corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], shade: 0.62 },
];

/**
 * Voxel-style vehicle: every box merged into one geometry with vertex colors, so each vehicle is a
 * single draw call and needs no model file.
 */
export function buildVehicleGeometry(id: TransportId): BufferGeometry {
  const boxes = MODELS[id];
  const positions = new Float32Array(boxes.length * 6 * 6 * 3);
  const colors = new Float32Array(positions.length);
  const color = new Color();
  let o = 0;
  for (const [cx, cy, cz, sx, sy, sz, hex] of boxes) {
    color.setHex(hex);
    for (const { corners, shade } of FACES) {
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const [x, y, z] = corners[i];
        positions[o] = cx + (x * sx) / 2;
        positions[o + 1] = cy + (y * sy) / 2;
        positions[o + 2] = cz + (z * sz) / 2;
        colors[o] = color.r * shade;
        colors[o + 1] = color.g * shade;
        colors[o + 2] = color.b * shade;
        o += 3;
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}
