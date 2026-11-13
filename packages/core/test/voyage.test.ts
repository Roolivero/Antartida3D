import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DRAKE_STORM,
  FLIGHT_CRUISE,
  PLANE_TURBULENCE,
  FUEGIA_MIN_DISTANCE,
  FUEGIA_LAND_MASK,
  GEAR_TAP_MS,
  ROUTE_LENGTH,
  SHIP_HEAD_START,
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
  minCameraDistance,
  expeditionAt,
  nextGear,
  quizScore,
  retreatVoyage,
  routeAt,
  sightingsInView,
  parseTerrainMesh,
  planeTurbulence,
  project,
  skipToNextStop,
  startVoyage,
  stormAt,
  stormCeiling,
  unproject,
  voyageArrived,
  voyageAt,
  voyageHeading,
  voyageLength,
  voyageProgress,
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
  it('ends in Marambio', () => {
    const end = voyageAt(kind, 1);
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
  it('starts in Ushuaia by plane', () => {
    const start = voyageAt('plane', 0);
    expect(Math.hypot(start.x - USHUAIA.x, start.y - USHUAIA.y)).toBeLessThan(0.01);
  });

  it('starts a ship on the sea route, out in the bay, clear of the town at its first point', () => {
    const start = voyageAt('ship', 0);
    expect(start).toEqual(routeAt(SHIP_HEAD_START / ROUTE_LENGTH));
    const fromTown = Math.hypot(start.x - USHUAIA.x, start.y - USHUAIA.y);
    expect(fromTown).toBeGreaterThan(1);
    expect(fromTown).toBeLessThanOrEqual(SHIP_HEAD_START);
  });

  it('skips the sea-only milestones on the plane', () => {
    const ids = voyageStops('plane').map((s) => s.milestone.id);
    expect(ids).toEqual(['beagle', 'drake', 'convergencia', 'paralelo-60', 'marambio']);
    expect(voyageStops('ship')).toHaveLength(MILESTONES.length);
  });

  it('stands the pin of Cabo de Hornos on the cape, not on the path, and every other pin on the path', () => {
    for (const stop of voyageStops('ship')) {
      const onPath = voyageAt('ship', stop.t);
      const off = Math.hypot(stop.pin.x - onPath.x, stop.pin.y - onPath.y);
      if (stop.milestone.id !== 'hornos') expect(off).toBe(0);
      else {
        const { lon, lat } = unproject(stop.pin.x, stop.pin.y);
        expect(lon).toBeCloseTo(-67.27, 2);
        expect(lat).toBeCloseTo(-55.97, 2);
        // The ship passes south-east of the cape, in open sea.
        expect(off).toBeGreaterThan(2);
      }
    }
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
    // Then it keeps climbing, to pass over the storm of the Drake: no step between two samples.
    for (let i = 20; i < 300; i++) {
      const rise = flightClearance((i + 1) / 1000, terrain) - flightClearance(i / 1000, terrain);
      expect(rise, `t=${i / 1000}`).toBeLessThan(FLIGHT_CRUISE * 0.1);
    }
    // Past the storm it is back at its cruise height.
    expect(flightClearance(0.85, terrain)).toBeCloseTo(FLIGHT_CRUISE);
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
      expect(spots[i].from).toBeGreaterThanOrEqual(0);
      expect(spots[i].to).toBeLessThan(1);
      expect(spots[i].to - spots[i].from).toBeGreaterThan(SIGHTING_WINDOW_BRIEF * 0.6);
      // The ship starts out in the bay: the first ones can already be in view at departure, together.
      if (i > 0) expect(spots[i].from).toBeGreaterThanOrEqual(spots[i - 1].from);
    }
  });

  it('has the ones near Ushuaia in view from the departure, not a moment later', () => {
    const atStart = sightingsInView('ship', 0).map((s) => s.sighting.id);
    expect(atStart).toEqual(expect.arrayContaining(['cormoran', 'eclaireurs', 'lobos']));
    // The rest still come later, along the trip.
    expect(atStart.length).toBeLessThan(spots.length / 2);
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

describe('storm over the Drake Passage', () => {
  const at = (kind: 'ship' | 'plane', t: number) => {
    const p = voyageAt(kind, t);
    return stormAt(p.x, p.y);
  };

  it('covers most of the passage, in open sea between Cape Horn and the South Shetland Islands', () => {
    const { from, to, radius } = DRAKE_STORM;
    const length = Math.hypot(to.x - from.x, to.y - from.y) + 2 * radius;
    const hornos = project(-67.27, -55.98);
    const livingston = project(-60.5, -62.6);
    expect(length).toBeGreaterThan(0.7 * Math.hypot(livingston.x - hornos.x, livingston.y - hornos.y));
    // Clear of the land at both ends, and of the Diego Ramírez Islands.
    for (const [lon, lat] of [[-67.27, -55.98], [-68.7, -56.5], [-60.5, -62.6], [-62.5, -63.0], [-55.2, -61.1]]) {
      const p = project(lon, lat);
      expect(stormAt(p.x, p.y), `${lon}, ${lat}`).toBe(0);
    }
    expect(stormAt(DRAKE_STORM.x, DRAKE_STORM.y)).toBe(1);
    expect(at('ship', 0)).toBe(0);
    expect(at('ship', 1)).toBe(0);
  });

  it('builds up from its edge, all around the band', () => {
    const { from, to, radius } = DRAKE_STORM;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const along = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
    // Past the end of the middle line, and to one side of its middle.
    const ways = [{ p: to, d: along }, { p: DRAKE_STORM, d: { x: -along.y, y: along.x } }];
    for (const { p, d } of ways) {
      const out = (r: number) => stormAt(p.x + d.x * r, p.y + d.y * r);
      expect(out(radius)).toBeCloseTo(0, 9);
      expect(out(radius - 1)).toBeGreaterThan(0);
      expect(out(radius - 1)).toBeLessThan(out(radius - 3));
    }
  });

  it('lets the camera get close all over it, so the trip camera stays under the clouds', () => {
    for (const kind of ['ship', 'plane'] as const) {
      for (let i = 0; i <= 400; i++) {
        const p = voyageAt(kind, i / 400);
        if (stormAt(p.x, p.y) > 0) expect(minCameraDistance(p.x, p.y, 60), `${kind} ${i}`).toBe(FUEGIA_MIN_DISTANCE);
      }
    }
    // Not past it: south of the storm the camera keeps off the plateau.
    const end = voyageAt('ship', 1);
    expect(minCameraDistance(end.x, end.y, 60)).toBe(60);
  });

  it('is over the ship from the Drake to the 60° S parallel', () => {
    for (const id of ['drake', 'convergencia', 'paralelo-60']) {
      expect(at('ship', voyageStops('ship').find((s) => s.milestone.id === id)!.t), id).toBe(1);
    }
  });

  it('is flown over by the plane: above the clouds all the way through, with a gentle climb before it', () => {
    let entered = false;
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      const p = voyageAt('plane', t);
      if (stormAt(p.x, p.y) === 0) continue;
      entered = true;
      expect(flightClearance(t), `t = ${t}`).toBeGreaterThan(DRAKE_STORM.cloudTop);
    }
    expect(entered).toBe(true);
    // Far from the storm the ceiling is gone, and it builds up without a step.
    const end = voyageAt('plane', 1);
    expect(stormCeiling(end.x, end.y)).toBe(0);
    for (let i = 1; i <= 400; i++) {
      const [a, b] = [voyageAt('plane', (i - 1) / 400), voyageAt('plane', i / 400)];
      expect(Math.abs(stormCeiling(b.x, b.y) - stormCeiling(a.x, a.y)), `step ${i}`).toBeLessThan(1);
    }
  });

  it('shakes the plane a little over it: not outside it, not with reduced motion, never past its limit', () => {
    const axes = ['roll', 'pitch', 'lift'] as const;
    // The plane is well inside the storm at some point of its trip.
    expect(Math.max(...Array.from({ length: 401 }, (_, i) => at('plane', i / 400)))).toBe(1);
    const moved = { roll: 0, pitch: 0, lift: 0 };
    for (let i = 0; i <= 600; i++) {
      const time = i / 30;
      const shake = planeTurbulence(time, 1);
      for (const axis of axes) {
        // Outside the storm the air is calm, at any time.
        expect(Math.abs(planeTurbulence(time, 0)[axis]), `${axis} outside`).toBe(0);
        expect(Math.abs(shake[axis]), `${axis} at ${time}`).toBeLessThanOrEqual(PLANE_TURBULENCE[axis]);
        // It builds up with the storm: half the storm, half the shake.
        expect(planeTurbulence(time, 0.5)[axis]).toBeCloseTo(shake[axis] / 2, 12);
        moved[axis] = Math.max(moved[axis], Math.abs(shake[axis]));
      }
    }
    // It does move, on its three axes.
    for (const axis of axes) expect(moved[axis], axis).toBeGreaterThan(0.6 * PLANE_TURBULENCE[axis]);
    // Reduced motion draws every frame at time 0: the plane stays still.
    for (const axis of axes) expect(Math.abs(planeTurbulence(0, 1)[axis]), `${axis} reduced`).toBe(0);
  });

  it('is where the ship and the plane are when the card of the Drake opens', () => {
    for (const kind of ['ship', 'plane'] as const) {
      const stop = voyageStops(kind).find((s) => s.milestone.id === 'drake')!;
      expect(at(kind, stop.t), kind).toBeGreaterThan(0);
    }
  });

  it('is explained in the card of the Drake, with its source, and owned up as a drawing', () => {
    const drake = MILESTONES.find((m) => m.id === 'drake')!;
    const facts = [drake.essential, ...drake.more];
    expect(facts.some((f) => f.kind === 'real' && f.sources.includes('O46') && /temporales/.test(f.text))).toBe(true);
    expect(facts.some((f) => f.kind === 'illustrative' && /tormenta/.test(f.text))).toBe(true);
  });
});

describe('distance and time travelled', () => {
  it('starts at zero and ends at the whole trip', () => {
    for (const { id } of TRANSPORTS) {
      const { totalKm } = voyageProgress(id, 0);
      expect(voyageProgress(id, 0)).toMatchObject({ km: 0, hours: 0 });
      expect(voyageProgress(id, 1).km).toBeCloseTo(totalKm, 6);
      expect(voyageProgress(id, 2).km).toBeCloseTo(totalKm, 6);
    }
  });

  it('grows along the trip', () => {
    for (const { id } of TRANSPORTS) {
      for (let i = 1; i <= 50; i++) {
        expect(voyageProgress(id, i / 50).km).toBeGreaterThan(voyageProgress(id, (i - 1) / 50).km);
      }
    }
  });

  it('measures the flight as the real distance between Ushuaia and Marambio, not in map units', () => {
    // The transport card gives about 1,230 km in a straight line.
    const { totalKm } = voyageProgress('hercules', 1);
    expect(totalKm).toBeGreaterThan(1230);
    expect(totalKm).toBeLessThan(1300);
  });

  it('has a longer way by sea than by air', () => {
    expect(voyageProgress('irizar', 1).totalKm).toBeGreaterThan(voyageProgress('hercules', 1).totalKm);
  });

  it('takes the hours of the distance at the cruise speed of each transport', () => {
    for (const { id, cruiseKmh } of TRANSPORTS) {
      const { km, hours } = voyageProgress(id, 0.5);
      expect(hours).toBeCloseTo(km / cruiseKmh, 9);
    }
    // 14 and 15 knots: the faster ship takes less over the same route.
    expect(voyageProgress('puerto-argentino', 1).hours).toBeLessThan(voyageProgress('irizar', 1).hours);
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
