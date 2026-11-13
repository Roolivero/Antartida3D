import { describe, expect, it } from 'vitest';
import {
  DRAWN_SITE_ELEMENTS,
  SITE_ELEMENTS,
  SITE_HALF_EXTENT_M,
  siteCoastDistanceM,
  siteElement,
} from '../src/content/orcadas-site.ts';

const dist = (a: string, b: string) => {
  const [ax, az] = siteElement(a).center;
  const [bx, bz] = siteElement(b).center;
  return Math.hypot(ax - bx, az - bz);
};

describe('Orcadas measured site (G1, G6)', () => {
  it('puts both bays at sea and the station on land', () => {
    expect(siteCoastDistanceM(-248, 169)).toBeLessThan(0); // Bahía Uruguay (OSM node)
    expect(siteCoastDistanceM(378, -113)).toBeLessThan(0); // Bahía Scotia (OSM node)
    expect(siteCoastDistanceM(0, 0)).toBeGreaterThan(50); // WMO station
    for (const e of DRAWN_SITE_ELEMENTS) {
      expect(siteCoastDistanceM(...e.center), e.id).toBeGreaterThan(0);
      expect(Math.abs(e.center[0]), e.id).toBeLessThan(SITE_HALF_EXTENT_M);
      expect(Math.abs(e.center[1]), e.id).toBeLessThan(SITE_HALF_EXTENT_M);
    }
  });

  it('draws only elements with a source and leaves Casa Moneta out until one places it', () => {
    for (const e of SITE_ELEMENTS) {
      if (e.source === null) {
        expect(DRAWN_SITE_ELEMENTS).not.toContain(e);
        expect(e.confidence).toBeNull();
      } else {
        expect(e.confidence).not.toBeNull();
      }
    }
    expect(siteElement('moneta').source).toBeNull();
  });

  it('keeps the measured distances of the G1 table within 1 m', () => {
    expect(Math.abs(dist('omond', 'cemetery') - 285.1)).toBeLessThan(1);
    expect(Math.abs(dist('omond', 'screen') - 228)).toBeLessThan(1);
    expect(Math.abs(dist('omond', 'generator') - 42)).toBeLessThan(1);
  });
});
