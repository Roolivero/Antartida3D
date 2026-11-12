import { describe, expect, it } from 'vitest';
import { SOUTHERN_LANDS, project } from '../src/index.ts';

function inRing(ring: number[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const [xi, yi, xj, yj] = [ring[i], ring[i + 1], ring[j], ring[j + 1]];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

describe('SOUTHERN_LANDS', () => {
  it.each([
    ['Sydney', 151.0, -33.8],
    ['Perth', 116.0, -31.9],
    ['Cape Town', 18.6, -33.9],
    ['Wellington', 175.3, -41.2],
    ['Buenos Aires', -58.6, -34.6],
    ['Ushuaia', -68.3, -54.75],
  ])('covers %s', (_name, lon, lat) => {
    const p = project(lon, lat);
    expect(SOUTHERN_LANDS.some((r) => inRing(r, p.x, p.y))).toBe(true);
  });

  it('leaves Antarctica out', () => {
    const r60 = 500 - project(0, -60).y;
    for (const ring of SOUTHERN_LANDS) {
      for (let i = 0; i < ring.length; i += 2) {
        expect(Math.hypot(ring[i] - 500, ring[i + 1] - 500)).toBeGreaterThan(r60);
      }
    }
  });
});
