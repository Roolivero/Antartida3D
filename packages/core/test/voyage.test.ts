import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GEAR_TAP_MS,
  MILESTONES,
  TRANSPORTS,
  VOYAGE_GEARS,
  VOYAGE_SECONDS,
  VOYAGE_SOURCES,
  VOYAGE_SOURCE_CODES,
  voyageSourceNumber,
  VOYAGE_TOURISM_NOTE,
  advanceVoyage,
  closeVoyageCard,
  flightClearance,
  heightAt,
  inFuegia,
  nextGear,
  parseTerrainMesh,
  project,
  skipToNextStop,
  startVoyage,
  unproject,
  voyageArrived,
  voyageAt,
  voyageHeading,
  voyageLength,
  voyageStops,
  worldHeight,
  type VoyageFact,
} from '../src/index.ts';

const USHUAIA = project(-68.3, -54.81);
const MARAMBIO = project(-56.62, -64.23);
const facts: VoyageFact[] = [
  VOYAGE_TOURISM_NOTE,
  ...TRANSPORTS.flatMap((v) => v.facts),
  ...MILESTONES.flatMap((m) => [m.essential, ...m.more]),
];

describe('voyage content', () => {
  it('cites a catalogued source for every real fact', () => {
    for (const fact of facts) {
      if (fact.kind === 'real') expect(fact.sources.length, fact.text).toBeGreaterThan(0);
      for (const code of fact.sources) expect(VOYAGE_SOURCES[code], code).toBeDefined();
    }
  });

  it('gives every source an organisation, a title and an https URL', () => {
    for (const source of Object.values(VOYAGE_SOURCES)) {
      expect(source.org).not.toBe('');
      expect(source.title).not.toBe('');
      expect(source.url).toMatch(/^https:\/\//);
    }
  });

  it('numbers the sources from 1, each with its own number', () => {
    const numbers = VOYAGE_SOURCE_CODES.map(voyageSourceNumber);
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
    expect(numbers).toHaveLength(Object.keys(VOYAGE_SOURCES).length);
  });

  it('lists no source that the content does not cite', () => {
    const cited = new Set(facts.flatMap((f) => f.sources));
    expect(VOYAGE_SOURCE_CODES.filter((code) => !cited.has(code))).toEqual([]);
  });

  it('offers only the Argentine scientific transports', () => {
    expect(TRANSPORTS.map((v) => v.id)).toEqual(['irizar', 'hercules', 'puerto-argentino']);
  });
});

describe.each(['ship', 'plane'] as const)('voyage path (%s)', (kind) => {
  it('goes from Ushuaia to Marambio', () => {
    const start = voyageAt(kind, 0);
    const end = voyageAt(kind, 1);
    expect(Math.hypot(start.x - USHUAIA.x, start.y - USHUAIA.y)).toBeLessThan(0.01);
    expect(Math.hypot(end.x - MARAMBIO.x, end.y - MARAMBIO.y)).toBeLessThan(0.01);
  });

  it('opens its milestones in order, the first at departure and the last on arrival', () => {
    const stops = voyageStops(kind);
    expect(stops[0].t).toBe(0);
    expect(stops[stops.length - 1].t).toBe(1);
    for (let i = 1; i < stops.length; i++) expect(stops[i].t).toBeGreaterThan(stops[i - 1].t);
  });

  it('crosses 60° S where that milestone opens', () => {
    const stop = voyageStops(kind).find((s) => s.milestone.id === 'paralelo-60')!;
    const at = voyageAt(kind, stop.t);
    expect(unproject(at.x, at.y).lat).toBeCloseTo(-60, 0);
  });

  it('heads away from Ushuaia at departure', () => {
    const heading = voyageHeading(kind, 0);
    const ahead = voyageAt(kind, 0.01);
    expect(Math.cos(heading) * (ahead.x - USHUAIA.x) + Math.sin(heading) * (ahead.y - USHUAIA.y)).toBeGreaterThan(0);
  });
});

describe('voyage path', () => {
  it('skips the sea-only milestones on the plane', () => {
    const ids = voyageStops('plane').map((s) => s.milestone.id);
    expect(ids).toEqual(['beagle', 'drake', 'convergencia', 'paralelo-60', 'marambio']);
    expect(voyageStops('ship')).toHaveLength(MILESTONES.length);
  });

  it('flies a shorter path than the ship sails', () => {
    const length = (kind: 'ship' | 'plane') => {
      let total = 0;
      for (let i = 1; i <= 200; i++) {
        const a = voyageAt(kind, (i - 1) / 200);
        const b = voyageAt(kind, i / 200);
        total += Math.hypot(b.x - a.x, b.y - a.y);
      }
      return total;
    };
    expect(length('plane')).toBeLessThan(length('ship'));
    expect(voyageLength('ship')).toBeCloseTo(length('ship'), 0);
    expect(voyageLength('plane')).toBeCloseTo(length('plane'), 0);
  });
});

describe('flight altitude', () => {
  const buf = readFileSync(join(import.meta.dirname, '../src/assets/terrain-mesh-hi.bin'));
  const terrain = parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const ground = (t: number) => {
    const p = voyageAt('plane', t);
    return worldHeight(heightAt(p.x, p.y, terrain));
  };

  it('takes off from the ground and lands on the Marambio plateau', () => {
    expect(flightClearance(0, terrain)).toBe(0);
    expect(flightClearance(1, terrain)).toBeCloseTo(ground(1));
    expect(ground(1)).toBeGreaterThan(0);
  });

  it('flies over the Antarctic relief under its path, never through it', () => {
    let highest = 0;
    for (let i = 0; i < 2000; i++) {
      const t = i / 2000;
      highest = Math.max(highest, ground(t));
      expect(flightClearance(t, terrain), `t=${t}`).toBeGreaterThanOrEqual(ground(t));
    }
    expect(highest).toBeGreaterThan(1); // the path does cross relief
  });

  it('climbs and descends without steps', () => {
    // Largest change of height between samples 1/2000 of the trip apart (about 0.6 km), in world units.
    let jump = 0;
    for (let i = 1; i <= 2000; i++) jump = Math.max(jump, Math.abs(flightClearance(i / 2000, terrain) - flightClearance((i - 1) / 2000, terrain)));
    expect(jump).toBeLessThan(1);
  });

  it('also clears the relief beside its path, where the wings of the drawn plane reach', () => {
    for (let i = 0; i < 1000; i++) {
      const t = i / 1000;
      const p = voyageAt('plane', t);
      const heading = voyageHeading('plane', t);
      for (const side of [-2.5, 2.5]) {
        const beside = worldHeight(heightAt(p.x - Math.sin(heading) * side, p.y + Math.cos(heading) * side, terrain));
        if (t < 0.98) expect(flightClearance(t, terrain), `t=${t}`).toBeGreaterThanOrEqual(beside);
      }
    }
  });

  it('flies over every summit of Tierra del Fuego', () => {
    // The highest land cell of the regional relief is 2622 m, drawn at x10.
    const summit = (2622 * 10) / 8000;
    for (let i = 30; i < 2000; i++) {
      const p = voyageAt('plane', i / 2000);
      if (inFuegia(p.x, p.y)) expect(flightClearance(i / 2000, terrain)).toBeGreaterThan(summit);
    }
  });
});

describe('advance gears', () => {
  it('shifts up on a quick second press and tops out', () => {
    expect(nextGear(0, GEAR_TAP_MS)).toBe(1);
    expect(nextGear(1, 100)).toBe(2);
    expect(nextGear(VOYAGE_GEARS.length - 1, 100)).toBe(VOYAGE_GEARS.length - 1);
  });

  it('goes back to the first gear after a pause', () => {
    expect(nextGear(2, GEAR_TAP_MS + 1)).toBe(0);
    expect(VOYAGE_GEARS[0]).toBe(1);
  });
});

describe('voyage state', () => {
  it('starts with the departure card open and does not move until it is closed', () => {
    const s = startVoyage('irizar');
    expect(s.card).toBe(0);
    expect(advanceVoyage(s, 5)).toBe(s);
    expect(advanceVoyage(closeVoyageCard(s), 1).t).toBeCloseTo(1 / VOYAGE_SECONDS.ship);
  });

  it('stops at every milestone, however long the user holds', () => {
    let s = closeVoyageCard(startVoyage('irizar'));
    const stops = voyageStops('ship');
    for (let i = 1; i < stops.length; i++) {
      s = advanceVoyage(s, 1000);
      expect(s.t).toBe(stops[i].t);
      expect(s.card).toBe(i);
      s = closeVoyageCard(s);
    }
    expect(voyageArrived(s)).toBe(true);
    expect(advanceVoyage(s, 10)).toBe(s);
  });

  it('can be travelled step by step', () => {
    let s = startVoyage('hercules');
    let steps = 0;
    while (!voyageArrived(s)) {
      s = skipToNextStop(closeVoyageCard(s));
      steps++;
    }
    expect(steps).toBe(voyageStops('plane').length - 1);
    expect(s.t).toBe(1);
  });
});
