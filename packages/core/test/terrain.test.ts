import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseTerrainMesh,
  heightAt,
  VERTICAL_EXAGGERATION,
  CONTOUR_M,
  TERRAIN_BOX,
  project,
  isAntimeridianSeam,
  clampTerrainSpikes,
} from '../src/index.ts';

describe('terrain', () => {
  it('exports expected constants', () => {
    expect(VERTICAL_EXAGGERATION).toBe(50);
    expect(CONTOUR_M).toBe(250);
    expect(TERRAIN_BOX.minX).toBeLessThan(TERRAIN_BOX.maxX);
    expect(TERRAIN_BOX.minY).toBeLessThan(TERRAIN_BOX.maxY);
  });

  it('decodes a minimal .bin buffer correctly', () => {
    const numVerts = 3;
    const numIndices = 3;
    const gridSize = 2049;

    const header = Buffer.alloc(32);
    header.write('MESH', 0, 4, 'ascii');
    header.writeUInt32LE(numVerts, 4);
    header.writeUInt32LE(numIndices, 8);
    header.writeUInt32LE(gridSize, 12);
    header.writeFloatLE(100, 16);
    header.writeFloatLE(900, 20);
    header.writeFloatLE(100, 24);
    header.writeFloatLE(900, 28);

    const coordsXY = new Uint16Array([0, 0, 100, 100, 200, 200]);
    const heights = new Uint16Array([500, 1000, 1500]);
    const masks = new Uint8Array([1, 2, 3]);
    const padding = Buffer.alloc(3); // offset is 32 + 12 + 6 + 3 = 53 -> 3 bytes pad to align to 56
    const indices = new Uint32Array([0, 1, 2]);

    const buf = Buffer.concat([
      header,
      Buffer.from(coordsXY.buffer),
      Buffer.from(heights.buffer),
      Buffer.from(masks.buffer),
      padding,
      Buffer.from(indices.buffer),
    ]);

    const mesh = parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    expect(mesh.numVerts).toBe(3);
    expect(mesh.numIndices).toBe(3);
    expect(mesh.gridSize).toBe(2049);
    expect(mesh.minX).toBe(100);
    expect(mesh.maxX).toBe(900);
    expect(mesh.heights[0]).toBe(500);
    expect(mesh.masks[2]).toBe(3);
  });

  it('evaluates elevations on actual generated lo mesh', () => {
    const meshPath = join(__dirname, '../src/assets/terrain-mesh-lo.bin');
    const buf = readFileSync(meshPath);
    const mesh = parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

    // South Pole: (0, -90) -> (500, 500)
    const pole = project(0, -90);
    const poleH = heightAt(pole.x, pole.y, mesh);
    expect(poleH).toBeGreaterThanOrEqual(2700);
    expect(poleH).toBeLessThanOrEqual(2950);

    // Dome A: (77.35, -80.37)
    const domeA = project(77.35, -80.37);
    const domeAH = heightAt(domeA.x, domeA.y, mesh);
    expect(domeAH).toBeGreaterThan(3900);

    // Weddell Sea: e.g. (-45, -72) or outside coastline -> should be 0
    // In map space, Weddell Sea is near (330, 260)
    const weddell = project(-45, -72);
    expect(heightAt(weddell.x, weddell.y, mesh)).toBe(0);
    // Ocean in Weddell sea point
    const outerOceanH = heightAt(100, 100, mesh);
    expect(outerOceanH).toBe(0);
  });

  it('performs 10,000 heightAt calls in less than 50 ms', () => {
    const meshPath = join(__dirname, '../src/assets/terrain-mesh-lo.bin');
    const buf = readFileSync(meshPath);
    const mesh = parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

    expect(mesh.elevationGrid).toBeDefined();

    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      // Sample varying positions across the map
      const x = 200 + (i % 600);
      const y = 200 + ((i * 3) % 600);
      sum += heightAt(x, y, mesh);
    }
    const elapsed = performance.now() - start;
    expect(sum).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });

  it('clamps isolated elevation spikes on a synthetic grid without altering surrounding plateau', () => {
    const size = 7;
    const grid = new Float32Array(size * size).fill(600);
    const masks = new Uint8Array(size * size).fill(1);
    // Inject an isolated 1850 m needle at center (3, 3) on a 600 m plateau
    const centerIdx = 3 * size + 3;
    grid[centerIdx] = 1850;

    const clamped = clampTerrainSpikes(grid, size, 70, { masks, radii: [2, 1], passes: 2 });
    expect(clamped).toBe(1);
    expect(grid[centerIdx]).toBe(670);

    // All surrounding plateau cells remain untouched at 600 m
    for (let i = 0; i < grid.length; i++) {
      if (i !== centerIdx) {
        expect(grid[i]).toBe(600);
      }
    }
  });
});

describe('isAntimeridianSeam', () => {
  it('flags only the long vertical cut near x = 500 in the southern half', () => {
    // Both simplified edges of the Ross Ice Shelf cut, from coastline.ts.
    expect(isAntimeridianSeam(501.3, 669.2, 500.5, 579.6)).toBe(true);
    expect(isAntimeridianSeam(497.8, 578.6, 497.8, 668.1)).toBe(true);
    // Short real coastline segments near the cut, and the northern half, stay.
    expect(isAntimeridianSeam(500.5, 579.6, 494.5, 576)).toBe(false);
    expect(isAntimeridianSeam(500, 300, 500, 400)).toBe(false);
  });
});
