import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ANTARCTICA_PATH, FUEGIA_LAND_MASK, PTS, ROUTE_PATH, ROUTE_POINTS, SOUTH_AMERICA_PATH, inFuegia, parseTerrainMesh, project, routeAt,
} from '../src/index.ts';
import { MAP_INK } from '../src/svg/land.ts';

type Pt = { x: number; y: number };

const USHUAIA = project(-68.3, -54.81);
const MARAMBIO = project(-56.62, -64.23);
const pt = (id: string): Pt => PTS.find((p) => p.id === id)!;

/**
 * Around Tierra del Fuego the truth is the IBCSO relief the 3D map shows (fuegia-mesh), where the
 * Beagle Channel has its real shape; the simplified Natural Earth coastline of the 2D map closes
 * or shifts it. Everywhere else the route is checked against that 2D coastline.
 */
const FUEGIA = (() => {
  const buf = readFileSync(join(import.meta.dirname, '../src/assets/fuegia-mesh-hi.bin'));
  return parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
})();

/** Triangles of the relief mesh bucketed on a coarse grid, in mesh cell coordinates. */
const BUCKETS = 256;
const buckets: number[][] = Array.from({ length: BUCKETS * BUCKETS }, () => []);
const cellSize = (FUEGIA.gridSize - 1) / BUCKETS;
for (let t = 0; t < FUEGIA.indices.length; t += 3) {
  const xs = [0, 1, 2].map((k) => FUEGIA.coordsXY[FUEGIA.indices[t + k] * 2]);
  const ys = [0, 1, 2].map((k) => FUEGIA.coordsXY[FUEGIA.indices[t + k] * 2 + 1]);
  const c0 = Math.floor(Math.min(...xs) / cellSize), c1 = Math.min(BUCKETS - 1, Math.floor(Math.max(...xs) / cellSize));
  const r0 = Math.floor(Math.min(...ys) / cellSize), r1 = Math.min(BUCKETS - 1, Math.floor(Math.max(...ys) / cellSize));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) buckets[r * BUCKETS + c].push(t);
}

/** Land on the relief mesh: the 0.5 level of the land mask interpolated over the triangle, as the shader draws it. */
function onFuegiaLand(p: Pt): boolean {
  const cell = FUEGIA.gridSize - 1;
  const x = ((p.x - FUEGIA.minX) / (FUEGIA.maxX - FUEGIA.minX)) * cell;
  const y = ((p.y - FUEGIA.minY) / (FUEGIA.maxY - FUEGIA.minY)) * cell;
  const bucket = buckets[Math.min(BUCKETS - 1, Math.floor(y / cellSize)) * BUCKETS + Math.min(BUCKETS - 1, Math.floor(x / cellSize))];
  for (const t of bucket) {
    const [a, b, c] = [0, 1, 2].map((k) => FUEGIA.indices[t + k]);
    const [ax, ay, bx, by, cx, cy] = [a, b, c].flatMap((v) => [FUEGIA.coordsXY[v * 2], FUEGIA.coordsXY[v * 2 + 1]]);
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det;
    const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det;
    const w = 1 - u - v;
    if (u < 0 || v < 0 || w < 0) continue;
    const land = (i: number) => (FUEGIA.masks[i] === FUEGIA_LAND_MASK ? 1 : 0);
    return u * land(a) + v * land(b) + w * land(c) >= 0.5;
  }
  return false; // open sea: the mesh has no triangle there
}

/** The route starts at the Ushuaia waterfront and ends at a base on an island: land is tolerated only this close to either end. */
const PORT_TOLERANCE = 0.5;

function rings(d: string): Pt[][] {
  return d.split('Z').filter((s) => s.trim()).map((s) => s.replace(/^M/, '').split('L').map((pair) => {
    const [x, y] = pair.split(',').map(Number);
    return { x, y };
  }));
}

const LAND = [...rings(SOUTH_AMERICA_PATH), ...rings(ANTARCTICA_PATH)];

/** Even-odd point-in-polygon over every ring of the 2D coastline. */
function onCoastlineLand(p: Pt): boolean {
  let inside = false;
  for (const ring of LAND) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
  }
  return inside;
}

const onLand = (p: Pt) => (inFuegia(p.x, p.y) ? onFuegiaLand(p) : onCoastlineLand(p));

/**
 * Mackinlay Pass is 1.8 km wide and 30 m deep: the 500 m source grid cannot keep it open, and the
 * relief mesh closes it with a sliver of land a few hundred meters wide. Land is tolerated there.
 */
const MACKINLAY = project(-67.485, -54.916);
const PASS_TOLERANCE = 0.3;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

describe('Ushuaia–Marambio route', () => {
  it('starts in Ushuaia and ends in Marambio', () => {
    expect(dist(routeAt(0), USHUAIA)).toBeLessThan(0.01);
    expect(dist(routeAt(1), MARAMBIO)).toBeLessThan(0.01);
    expect(dist(routeAt(0), pt('campana'))).toBeLessThan(1);
    expect(dist(routeAt(1), pt('fosiles'))).toBeLessThan(1);
  });

  it('draws the SVG path from the same endpoints', () => {
    const start = ROUTE_PATH.match(/^M([\d.]+),([\d.]+)/)!;
    const end = ROUTE_PATH.match(/([\d.]+),([\d.]+)$/)!;
    expect(dist({ x: +start[1], y: +start[2] }, USHUAIA)).toBeLessThan(0.1);
    expect(dist({ x: +end[1], y: +end[2] }, MARAMBIO)).toBeLessThan(0.1);
  });

  it('never crosses land, except right at its two ends and in Mackinlay Pass', () => {
    const N = 20000;
    const onLandFar: number[] = [];
    for (let i = 0; i <= N; i++) {
      const p = routeAt(i / N);
      const tolerated = dist(p, USHUAIA) < PORT_TOLERANCE || dist(p, MARAMBIO) < PORT_TOLERANCE || dist(p, MACKINLAY) < PASS_TOLERANCE;
      if (onLand(p) && !tolerated) onLandFar.push(i / N);
    }
    expect(onLandFar).toEqual([]);
  });

  it('passes through every waypoint', () => {
    const samples = Array.from({ length: 20001 }, (_, i) => routeAt(i / 20000));
    for (const w of ROUTE_POINTS) {
      expect(Math.min(...samples.map((s) => dist(s, w)))).toBeLessThan(0.05);
    }
  });

  it('moves at constant speed along the path', () => {
    const N = 1000;
    const steps = Array.from({ length: N }, (_, i) => dist(routeAt(i / N), routeAt((i + 1) / N)));
    const mean = steps.reduce((a, b) => a + b, 0) / N;
    for (const s of steps) expect(Math.abs(s - mean) / mean).toBeLessThan(0.05);
  });

  it('clamps t outside 0..1', () => {
    expect(routeAt(-1)).toEqual(routeAt(0));
    expect(routeAt(2)).toEqual(routeAt(1));
  });

  it('is deterministic and drawn by the 2D ink layer', () => {
    expect(routeAt(0.37)).toEqual(routeAt(0.37));
    expect(MAP_INK.split(`d="${ROUTE_PATH}"`).length - 1).toBe(2);
    expect(MAP_INK).not.toContain('M36,318');
  });
});
