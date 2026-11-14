import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MALVINAS_FLAG, SOUTH_AMERICA_PATH, fuegiaGroundHeight, fuegiaWorldHeight, parseTerrainMesh, type TerrainMesh } from '../src/index.ts';

describe('Malvinas flag ground', () => {
  const triangle: TerrainMesh = {
    numVerts: 3, numIndices: 3, gridSize: 11, minX: 0, minY: 0, maxX: 10, maxY: 10,
    coordsXY: new Uint16Array([0, 0, 10, 0, 0, 10]),
    heights: new Uint16Array([100, 200, 300]), masks: new Uint8Array([255, 255, 255]),
    indices: new Uint32Array([0, 1, 2]),
  };

  it('rests on the sloping triangle, not its nearest vertex or sea level', () => {
    expect(fuegiaGroundHeight(triangle, 2.5, 2.5)).toBeCloseTo(fuegiaWorldHeight(175));
    expect(fuegiaGroundHeight(triangle, 10, 0)).toBeCloseTo(fuegiaWorldHeight(200));
  });

  it('does not place the flag on water or outside the mesh', () => {
    expect(fuegiaGroundHeight({ ...triangle, masks: new Uint8Array(3) }, 2, 2)).toBeNull();
    expect(fuegiaGroundHeight(triangle, -1, 0)).toBeNull();
    expect(fuegiaGroundHeight(triangle, 9, 9)).toBeNull();
  });

  for (const level of ['hi', 'lo']) {
    it(`anchors on actual Malvinas land in the ${level} relief`, () => {
      const raw = readFileSync(new URL(`../src/assets/fuegia-mesh-${level}.bin`, import.meta.url));
      const mesh = parseTerrainMesh(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
      expect(fuegiaGroundHeight(mesh, MALVINAS_FLAG.x, MALVINAS_FLAG.y)).toBeGreaterThan(0);
    });
  }

  it('uses an anchor inside the simplified 2D coastline too', () => {
    const { x, y } = MALVINAS_FLAG;
    const rings = SOUTH_AMERICA_PATH.split('M').filter(Boolean).map((r) =>
      r.replace(/Z/g, '').split('L').map((p) => p.split(',').map(Number)));
    expect(rings.some((ring) => {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [ax, ay] = ring[i], [bx, by] = ring[j];
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      }
      return inside;
    })).toBe(true);
  });
});
