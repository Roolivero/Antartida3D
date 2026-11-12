import { describe, expect, it } from 'vitest';
import { STATION_LAYOUT, footprintBounds } from '../src/content/orcadas-layout.ts';

const MIN_GAP = 0.5;
const REQUIRED_IDS = [
  'omond',
  'moneta',
  'radioMast',
  'modern',
  'laborc',
  'flag',
  'windMast',
  'screen',
  'crates',
  'boat',
];

function gap(a: (typeof STATION_LAYOUT)[number], b: (typeof STATION_LAYOUT)[number]): number {
  const [ax0, ax1, az0, az1] = footprintBounds(a);
  const [bx0, bx1, bz0, bz1] = footprintBounds(b);
  const dx = Math.max(bx0 - ax1, ax0 - bx1, 0);
  const dz = Math.max(bz0 - az1, az0 - bz1, 0);
  return Math.hypot(dx, dz);
}

describe('station layout (B8)', () => {
  it('declares every fixed element once', () => {
    const ids = STATION_LAYOUT.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(REQUIRED_IDS));
    for (const e of STATION_LAYOUT) {
      expect(e.footprint[0]).toBeGreaterThan(0);
      expect(e.footprint[1]).toBeGreaterThan(0);
      for (const other of e.connectedTo ?? []) expect(ids).toContain(other);
    }
  });

  it('keeps every pair of footprints at least 0.5 units apart unless declared connected', () => {
    const overlaps: string[] = [];
    for (let i = 0; i < STATION_LAYOUT.length; i++) {
      for (let j = i + 1; j < STATION_LAYOUT.length; j++) {
        const a = STATION_LAYOUT[i];
        const b = STATION_LAYOUT[j];
        const connected = a.connectedTo?.includes(b.id) || b.connectedTo?.includes(a.id);
        if (connected) continue;
        const g = gap(a, b);
        if (g < MIN_GAP) overlaps.push(`${a.id} / ${b.id}: ${g.toFixed(2)}`);
      }
    }
    expect(overlaps).toEqual([]);
  });
});
