import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FUEGIA_BOX,
  FUEGIA_LAND_MASK,
  FUEGIA_MIN_DISTANCE,
  FUEGIA_VERTICAL_EXAGGERATION,
  FUEGIA_WATER_MASK_MAX,
  METERS_PER_MAP_UNIT,
  fuegiaWorldHeight,
  inFuegia,
  minCameraDistance,
  parseTerrainMesh,
  project,
  type TerrainMesh,
} from '../src/index.ts';

const load = (level: 'hi' | 'lo') => {
  const buf = readFileSync(join(import.meta.dirname, `../src/assets/fuegia-mesh-${level}.bin`));
  return parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};

/** Vertices of the mesh within `radius` map units of a lon/lat point. */
function near(mesh: TerrainMesh, lon: number, lat: number, radius: number): number[] {
  const p = project(lon, lat);
  const cell = mesh.gridSize - 1;
  const found: number[] = [];
  for (let i = 0; i < mesh.numVerts; i++) {
    const x = mesh.minX + (mesh.coordsXY[i * 2] / cell) * (mesh.maxX - mesh.minX);
    const y = mesh.minY + (mesh.coordsXY[i * 2 + 1] / cell) * (mesh.maxY - mesh.minY);
    if (Math.hypot(x - p.x, y - p.y) < radius) found.push(i);
  }
  return found;
}

describe('fuegia region', () => {
  it('covers the Malvinas', () => {
    const corners = [project(-61.4, -51.7), project(-57.7, -51.7), project(-59.5, -51.0), project(-59.5, -52.5)];
    for (const c of corners) expect(inFuegia(c.x, c.y)).toBe(true);
  });

  it('covers Tierra del Fuego and Cape Horn but not Antarctica', () => {
    const ushuaia = project(-68.3, -54.81);
    const capeHorn = project(-67.29, -55.98);
    const marambio = project(-56.62, -64.23);
    expect(inFuegia(ushuaia.x, ushuaia.y)).toBe(true);
    expect(inFuegia(capeHorn.x, capeHorn.y)).toBe(true);
    expect(inFuegia(marambio.x, marambio.y)).toBe(false);
  });

  it('lets the camera closer only inside the region', () => {
    const ushuaia = project(-68.3, -54.81);
    expect(minCameraDistance(ushuaia.x, ushuaia.y, 60)).toBe(FUEGIA_MIN_DISTANCE);
    expect(minCameraDistance(500, 500, 60)).toBe(60);
    expect(minCameraDistance(ushuaia.x, ushuaia.y, 5)).toBe(5);
  });

  it('uses its own vertical exaggeration', () => {
    expect(fuegiaWorldHeight(METERS_PER_MAP_UNIT)).toBe(FUEGIA_VERTICAL_EXAGGERATION);
    expect(fuegiaWorldHeight(0)).toBe(0);
  });
});

describe.each(['hi', 'lo'] as const)('fuegia mesh (%s)', (level) => {
  const mesh = load(level);

  it('has land on both main islands of the Malvinas', () => {
    for (const [lon, lat] of [[-58.8, -51.7], [-60.0, -51.7]]) {
      const land = near(mesh, lon, lat, 2).filter((i) => mesh.masks[i] === FUEGIA_LAND_MASK);
      expect(land.length).toBeGreaterThan(0);
    }
  });

  it('is a valid mesh over the region box', () => {
    expect(mesh.minX).toBe(FUEGIA_BOX.minX);
    expect(mesh.maxX).toBe(FUEGIA_BOX.maxX);
    expect(mesh.minY).toBe(FUEGIA_BOX.minY);
    expect(mesh.maxY).toBe(FUEGIA_BOX.maxY);
    expect(mesh.numVerts).toBeGreaterThan(1000);
    expect(mesh.numIndices % 3).toBe(0);
    expect(Math.max(...mesh.indices.subarray(0, 3000))).toBeLessThan(mesh.numVerts);
    expect(mesh.masks.every((m) => m === FUEGIA_LAND_MASK || m <= FUEGIA_WATER_MASK_MAX)).toBe(true);
  });

  it('has land north and south of the Beagle Channel and water in it', () => {
    const isLand = (i: number) => mesh.masks[i] === FUEGIA_LAND_MASK;
    // Mountains behind Ushuaia and the middle of Navarino Island.
    const north = near(mesh, -68.1, -54.72, 1);
    const south = near(mesh, -67.6, -55.08, 1);
    expect(north.length).toBeGreaterThan(0);
    expect(south.length).toBeGreaterThan(0);
    expect(north.some((i) => isLand(i) && mesh.heights[i] > 300)).toBe(true);
    expect(south.some((i) => isLand(i) && mesh.heights[i] > 100)).toBe(true);
    // The channel off Ushuaia: water vertices, a few tens of meters deep and close to the shore.
    const channel = near(mesh, -68.28, -54.86, 0.35).filter((i) => !isLand(i));
    expect(channel.length).toBeGreaterThan(0);
    expect(channel.some((i) => mesh.heights[i] > 10)).toBe(true);
    expect(channel.every((i) => mesh.masks[i] < FUEGIA_WATER_MASK_MAX * 0.5)).toBe(true);
  });

  it('never writes a land vertex at sea level', () => {
    for (let i = 0; i < mesh.numVerts; i++) {
      if (mesh.masks[i] === FUEGIA_LAND_MASK) expect(mesh.heights[i]).toBeGreaterThan(0);
    }
  });
});
