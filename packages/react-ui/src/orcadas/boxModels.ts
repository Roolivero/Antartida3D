// Copy of voyage/vehicles.ts (#4); replace with an import once #4 is on main
import { BufferAttribute, BufferGeometry, Color, MeshBasicMaterial } from 'three';

/** [centerX, centerY, centerZ, sizeX, sizeY, sizeZ, color]. The bow or nose points to +x, y is up. */
export type Box = readonly [number, number, number, number, number, number, number];

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
 * Voxel-style model: every box merged into one geometry with vertex colors, so each model is a
 * single draw call and needs no model file.
 */
export function buildBoxGeometry(boxes: readonly Box[]): BufferGeometry {
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
