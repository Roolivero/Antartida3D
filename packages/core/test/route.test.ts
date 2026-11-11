import { describe, expect, it } from 'vitest';
import { ANTARCTICA_PATH, PTS, ROUTE_PATH, ROUTE_POINTS, SOUTH_AMERICA_PATH, project, routeAt } from '../src/index.ts';
import { MAP_INK } from '../src/svg/land.ts';

type Pt = { x: number; y: number };

const USHUAIA = project(-68.3, -54.81);
const MARAMBIO = project(-56.62, -64.23);
const pt = (id: string): Pt => PTS.find((p) => p.id === id)!;

/**
 * Ushuaia is a port: projected, it lands ~0.27 map units inside the simplified Tierra del Fuego
 * coastline (ne_50m). Samples on land are tolerated only within this radius of Ushuaia (~3.6 km).
 * Marambio's end needs no tolerance: it falls in open water with this coastline.
 */
const PORT_TOLERANCE = 0.5;

function rings(d: string): Pt[][] {
  return d.split('Z').filter((s) => s.trim()).map((s) => s.replace(/^M/, '').split('L').map((pair) => {
    const [x, y] = pair.split(',').map(Number);
    return { x, y };
  }));
}

const LAND = [...rings(SOUTH_AMERICA_PATH), ...rings(ANTARCTICA_PATH)];

/** Even-odd point-in-polygon over every coastline ring. */
function onLand(p: Pt): boolean {
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

  it('never crosses land, except right at the Ushuaia port', () => {
    const N = 20000;
    const onLandFar: number[] = [];
    for (let i = 0; i <= N; i++) {
      const p = routeAt(i / N);
      if (onLand(p) && dist(p, USHUAIA) > PORT_TOLERANCE) onLandFar.push(i / N);
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
