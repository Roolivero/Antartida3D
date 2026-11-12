import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FLIGHT_CRUISE,
  FUEGIA_LAND_MASK,
  GEAR_TAP_MS,
  MILESTONES,
  EXPEDITION,
  SIGHTINGS,
  SIGHTING_WINDOW_BRIEF,
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
  fuegiaWorldHeight,
  heightAt,
  expeditionAt,
  nextGear,
  quizScore,
  retreatVoyage,
  sightingsInView,
  parseTerrainMesh,
  project,
  skipToNextStop,
  startVoyage,
  unproject,
  voyageArrived,
  voyageAt,
  voyageHeading,
  voyageLength,
  voyageSightings,
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
  ...SIGHTINGS.map((s) => s.fact),
  ...Object.values(EXPEDITION).flatMap((stop) => stop.notes.map((n) => n.fact)),
];

describe('voyage content', () => {
  it('cites a catalogued source for every real fact', () => {
    for (const fact of facts) {
      if (fact.kind === 'real') expect(fact.sources.length, fact.text).toBeGreaterThan(0);
      for (const code of fact.sources) expect(VOYAGE_SOURCES[code], code).toBeDefined();
    }
  });

  it('words what is not a sourced fact so the reader can tell', () => {
    for (const fact of facts) {
      if (fact.kind === 'estimate') expect(fact.text).toMatch(/^Aproximadamente .*\(cálculo propio\)\.$/);
      if (fact.kind === 'illustrative') expect(fact.text).toMatch(/ilustrativ/);
      if (fact.kind !== 'real') expect(fact.sources).toEqual([]);
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

  it('flies over the land of Tierra del Fuego under its path', () => {
    // Checked against the regional relief mesh, which is built apart from the baked flight profile.
    const raw = readFileSync(join(import.meta.dirname, '../src/assets/fuegia-mesh-hi.bin'));
    const fuegia = parseTerrainMesh(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
    const path = Array.from({ length: 301 }, (_, i) => ({ t: (i / 300) * 0.13, ...voyageAt('plane', (i / 300) * 0.13) }));
    const cell = fuegia.gridSize - 1;
    let checked = 0;
    for (let v = 0; v < fuegia.numVerts; v++) {
      if (fuegia.masks[v] !== FUEGIA_LAND_MASK) continue;
      const x = fuegia.minX + (fuegia.coordsXY[v * 2] / cell) * (fuegia.maxX - fuegia.minX);
      const y = fuegia.minY + (fuegia.coordsXY[v * 2 + 1] / cell) * (fuegia.maxY - fuegia.minY);
      const near = path.reduce((best, p) => (Math.hypot(p.x - x, p.y - y) < Math.hypot(best.x - x, best.y - y) ? p : best));
      // Half the wingspan of the plane as drawn from the departure camera, past the first kilometers of the climb.
      if (Math.hypot(near.x - x, near.y - y) > 0.6 || near.t < 0.012) continue;
      checked++;
      expect(flightClearance(near.t, terrain), `t=${near.t}`).toBeGreaterThan(fuegiaWorldHeight(fuegia.heights[v]));
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('climbs little by little to its cruise height instead of shooting up', () => {
    // Soon after take-off it is only as high as the hills of Navarino need.
    expect(flightClearance(0.02, terrain)).toBeLessThan(FLIGHT_CRUISE * 0.6);
    expect(flightClearance(0.1, terrain)).toBeLessThan(FLIGHT_CRUISE * 0.6);
    expect(flightClearance(0.3, terrain)).toBeCloseTo(FLIGHT_CRUISE);
    // Past the last islands (Cape Horn) it only climbs.
    for (let i = 130; i < 250; i++) {
      expect(flightClearance((i + 1) / 1000, terrain), `t=${i / 1000}`).toBeGreaterThanOrEqual(flightClearance(i / 1000, terrain));
    }
  });
});

describe('how the expedition works', () => {
  it('belongs to milestones of the trip', () => {
    const ids = MILESTONES.map((m) => m.id);
    for (const id of Object.keys(EXPEDITION)) expect(ids).toContain(id);
  });

  it('never tells about one transport on another', () => {
    for (const transport of TRANSPORTS) {
      for (const id of Object.keys(EXPEDITION)) {
        const shown = expeditionAt(id, transport.id).notes;
        for (const note of EXPEDITION[id].notes) {
          const fits = (!note.kind || note.kind === transport.kind) && (!note.only || note.only === transport.id);
          expect(shown.includes(note.fact), `${transport.id} at ${id}: ${note.fact.text}`).toBe(fits);
        }
      }
    }
    const plane = Object.keys(EXPEDITION).flatMap((id) => expeditionAt(id, 'hercules').notes.map((f) => f.text)).join(' ');
    expect(plane).not.toMatch(/Irízar|rompehielos|buque|lancha/i);
  });

  it('has something to tell at every stop that has an entry, and a valid question', () => {
    for (const transport of TRANSPORTS) {
      for (const stop of voyageStops(transport.kind)) {
        const { notes, question } = expeditionAt(stop.milestone.id, transport.id);
        if (question) {
          expect(notes.length, `${transport.id} at ${stop.milestone.id}`).toBeGreaterThan(0);
          expect(question.options.length).toBe(3);
          expect(question.options[question.answer]).toBeDefined();
        }
      }
    }
  });

  it('counts the questions answered right', () => {
    expect(quizScore('irizar', {})).toEqual({ right: 0, total: 4 });
    expect(quizScore('hercules', {})).toEqual({ right: 0, total: 3 });
    expect(quizScore('irizar', { beagle: 0, 'paralelo-60': 1, shetland: 2, marambio: 0 })).toEqual({ right: 3, total: 4 });
    // The Shetland question is not asked on the plane: its answer does not count there.
    expect(quizScore('hercules', { beagle: 0, 'paralelo-60': 1, shetland: 0, marambio: 0 })).toEqual({ right: 3, total: 3 });
  });
});

describe('sightings', () => {
  const spots = voyageSightings('ship');

  it('gives every animal and place a sourced fact', () => {
    for (const s of SIGHTINGS) {
      expect(s.fact.kind).toBe('real');
      expect(s.fact.sources.length, s.name).toBeGreaterThan(0);
    }
  });

  it('shows them in trip order, with a window inside the trip', () => {
    for (let i = 0; i < spots.length; i++) {
      expect(spots[i].from).toBeGreaterThan(0);
      expect(spots[i].to).toBeLessThan(1);
      expect(spots[i].to - spots[i].from).toBeGreaterThan(SIGHTING_WINDOW_BRIEF * 0.6);
      if (i > 0) expect(spots[i].from).toBeGreaterThan(spots[i - 1].from);
    }
  });

  it('has more of them the farther south', () => {
    const fauna = spots.filter((s) => !s.sighting.place);
    const south = fauna.filter((s) => unproject(s.x, s.y).lat < -60).length;
    expect(south).toBeGreaterThan(fauna.length - south);
  });

  it('draws each animal near its anchor on the route and each place where it is', () => {
    for (const s of spots) {
      if (s.sighting.place) {
        const at = project(s.sighting.place[0], s.sighting.place[1]);
        expect(s.x, s.sighting.name).toBeCloseTo(at.x);
        expect(s.y, s.sighting.name).toBeCloseTo(at.y);
        continue;
      }
      const anchor = project(s.sighting.anchor[0], s.sighting.anchor[1]);
      expect(Math.hypot(s.x - anchor.x, s.y - anchor.y), s.sighting.name).toBeLessThan(Math.abs(s.sighting.offset) + 4);
    }
  });

  it('keeps one in view through its window and not after it', () => {
    const first = spots[0];
    const mid = (first.from + first.to) / 2;
    expect(sightingsInView('ship', mid).map((s) => s.sighting.id)).toContain(first.sighting.id);
    expect(sightingsInView('ship', first.from - 0.001).map((s) => s.sighting.id)).not.toContain(first.sighting.id);
    expect(sightingsInView('ship', first.to + 0.001).map((s) => s.sighting.id)).not.toContain(first.sighting.id);
  });

  it('has none from the plane', () => {
    expect(voyageSightings('plane')).toEqual([]);
    expect(sightingsInView('plane', 0.5)).toEqual([]);
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

  it('goes back without reopening the milestones already seen', () => {
    let s = closeVoyageCard(advanceVoyage(closeVoyageCard(startVoyage('irizar')), 1000));
    const reached = s.reached;
    const at = s.t;
    s = retreatVoyage(s, 1);
    expect(s.t).toBeCloseTo(at - 1 / VOYAGE_SECONDS.ship);
    expect(s.reached).toBe(reached);
    expect(s.card).toBe(-1);
    // Forward again: straight past the milestone it came back from, up to the next one.
    s = advanceVoyage(s, 1000);
    expect(s.card).toBe(reached);
    expect(s.t).toBe(voyageStops('ship')[reached].t);
  });

  it('does not go back past Ushuaia nor while a card is open', () => {
    const open = startVoyage('irizar');
    expect(retreatVoyage(open, 5)).toBe(open);
    const start = closeVoyageCard(open);
    expect(retreatVoyage(start, 5)).toBe(start);
    expect(retreatVoyage(advanceVoyage(start, 1), 1000).t).toBe(0);
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
