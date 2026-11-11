import { describe, expect, it } from 'vitest';
import {
  MILESTONES,
  TRANSPORTS,
  VOYAGE_SECONDS,
  VOYAGE_SOURCES,
  VOYAGE_TOURISM_NOTE,
  advanceVoyage,
  closeVoyageCard,
  project,
  skipToNextStop,
  startVoyage,
  unproject,
  voyageArrived,
  voyageAt,
  voyageHeading,
  voyageStops,
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
