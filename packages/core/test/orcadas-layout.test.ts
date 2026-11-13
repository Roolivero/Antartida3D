import { describe, expect, it } from 'vitest';
import {
  DIORAMA_ELEMENTS,
  DIORAMA_ELEMENT_IDS,
  STATION_LAYOUT,
  footprintCorners,
  worldCoastDistance,
} from '../src/content/orcadas-layout.ts';
import { DRAWN_SITE_ELEMENTS } from '../src/content/orcadas-site.ts';

// Requirement changed (13 Nov 2026, approved by Lk): the diorama is a stage with illustrative
// positions. Every element still needs a source in the measured site, must not touch another
// one, must stand on land (the boat on the beach) and must face the viewer.
const MIN_GAP = 0.25;
const REQUIRED_IDS = ['omond', 'flag', 'windMast', 'screen', 'boat'];

type Entry = (typeof STATION_LAYOUT)[number];
type Pt = [number, number];

/** Corners of the rotated footprint in world x/z (local +x along rotationY, like three.js). */
function corners(e: Entry): Pt[] {
  return footprintCorners(e.position[0], e.position[2], e.footprint[0], e.footprint[1], e.rotationY);
}

function pointSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}

/** True when two convex polygons overlap (separating axis test). */
function overlaps(pa: Pt[], pb: Pt[]): boolean {
  for (const poly of [pa, pb]) {
    for (let i = 0; i < poly.length; i++) {
      const [ax, az] = poly[i];
      const [bx, bz] = poly[(i + 1) % poly.length];
      const nx = bz - az;
      const nz = ax - bx;
      const proj = (q: Pt[]) => q.map((p) => p[0] * nx + p[1] * nz);
      const ra = proj(pa);
      const rb = proj(pb);
      if (Math.max(...ra) < Math.min(...rb) || Math.max(...rb) < Math.min(...ra)) return false;
    }
  }
  return true;
}

/** Minimum distance between two footprints; 0 when they overlap. */
function gap(a: Entry, b: Entry): number {
  const pa = corners(a);
  const pb = corners(b);
  if (overlaps(pa, pb)) return 0;
  let best = Infinity;
  for (const [p, q] of [
    [pa, pb],
    [pb, pa],
  ]) {
    for (const v of p) {
      for (let i = 0; i < q.length; i++) best = Math.min(best, pointSegment(v, q[i], q[(i + 1) % q.length]));
    }
  }
  return best;
}

describe('station layout (B8, G6)', () => {
  it('has one entry per element of the stage, all with a source, and none for Casa Moneta', () => {
    expect(STATION_LAYOUT.map((e) => e.id)).toEqual([...DIORAMA_ELEMENT_IDS]);
    expect(STATION_LAYOUT.map((e) => e.id)).toEqual(expect.arrayContaining(REQUIRED_IDS));
    for (const e of DIORAMA_ELEMENTS) expect(DRAWN_SITE_ELEMENTS).toContain(e);
    expect(STATION_LAYOUT.some((e) => e.id === 'moneta')).toBe(false);
  });

  it('keeps every pair of footprints apart', () => {
    const touching: string[] = [];
    for (let i = 0; i < STATION_LAYOUT.length; i++) {
      for (let j = i + 1; j < STATION_LAYOUT.length; j++) {
        const g = gap(STATION_LAYOUT[i], STATION_LAYOUT[j]);
        if (g < MIN_GAP) touching.push(`${STATION_LAYOUT[i].id} / ${STATION_LAYOUT[j].id}: ${g.toFixed(2)}`);
      }
    }
    expect(touching).toEqual([]);
  });

  it('stands on land, with the boat on the beach, and faces the viewer', () => {
    for (const e of STATION_LAYOUT) {
      const corners = footprintCorners(e.position[0], e.position[2], e.footprint[0], e.footprint[1], e.rotationY);
      if (e.id === 'boat') {
        const d = worldCoastDistance(e.position[0], e.position[2]);
        expect(d, e.id).toBeGreaterThan(0);
        expect(d, e.id).toBeLessThan(0.8);
        continue;
      }
      for (const [x, z] of corners) expect(worldCoastDistance(x, z), e.id).toBeGreaterThan(0.6);
      expect(Math.abs(e.rotationY), e.id).toBeLessThan(0.3);
    }
  });
});
