import { describe, expect, it } from 'vitest';
import { STATION_LAYOUT, footprintCorners, layoutOf, worldCoastDistance } from '@antartida/core';
import { beachPoint, buildPenguinColony, restPose as restPenguinPose, travellerPose as penguinTravellerPose } from '../src/orcadas/penguins.ts';
import {
  buildSealColony,
  residentPose,
  restPose,
  travellerPose,
} from '../src/orcadas/seals.ts';
import { evaluateIsthmusTerrain } from '../src/orcadas/stationModels.ts';

const heightAt = (x: number, z: number) => evaluateIsthmusTerrain(x, z).y;
const sealColony = buildSealColony(heightAt);
const penguinColony = buildPenguinColony(heightAt);
const DT = 0.05;

type Pt = readonly [number, number];

function inside(p: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

function frames() {
  const out: {
    t: number;
    residents: ReturnType<typeof restPose>[];
    traveller: ReturnType<typeof restPose>;
    mode: string;
  }[] = [];
  const route = sealColony.traveller.route;
  for (let t = 0; t < route.duration; t += DT) {
    const residents = sealColony.residents.map((r) => residentPose(r, t, restPose()));
    const traveller = travellerPose(route, t, restPose());

    let tt = ((t % route.duration) + route.duration) % route.duration;
    let mode = route.segments[0].mode;
    for (const seg of route.segments) {
      if (tt < seg.duration) {
        mode = seg.mode;
        break;
      }
      tt -= seg.duration;
    }

    out.push({ t, residents, traveller, mode });
  }
  return out;
}

const FRAMES = frames();

describe('seals of orcadas (illustrative)', () => {
  it('places residents and traveller on the front beach of Bahía Scotia', () => {
    expect(sealColony.residents.length).toBe(2);
    expect(sealColony.residents.map((r) => r.species)).toEqual(['elephant', 'weddell']);
    expect(sealColony.traveller.species).toBe('weddell');

    // All resting spots on land
    for (const r of sealColony.residents) {
      expect(worldCoastDistance(r.x, r.z)).toBeGreaterThan(0.2);
    }
    expect(worldCoastDistance(sealColony.traveller.rest.x, sealColony.traveller.rest.z)).toBeGreaterThan(0.2);
  });

  it('never lets two seals overlap during the whole loop', () => {
    let worst = Infinity;
    for (const { residents, traveller } of FRAMES) {
      const all = [...residents, traveller];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const d = Math.hypot(all[i].x - all[j].x, all[i].z - all[j].z);
          worst = Math.min(worst, d);
        }
      }
    }
    // Radius of seals is ~0.35, min separation should be well above 0.5
    expect(worst).toBeGreaterThan(0.65);
  });

  it('never lets any seal overlap the boat or its mooring line', () => {
    const boat = layoutOf('boat');
    const beachCorners = footprintCorners(
      boat.position[0],
      boat.position[2],
      boat.footprint[0] + 0.6,
      boat.footprint[1] + 0.6,
      boat.rotationY
    );
    const mooredPoint = beachPoint([boat.position[0], boat.position[2]], -0.9);

    for (const { residents, traveller } of FRAMES) {
      const all = [...residents, traveller];
      for (const s of all) {
        // Must not be inside beach footprint of boat
        expect(inside([s.x, s.z], beachCorners)).toBe(false);
        // Must stay well clear of moored boat in water (boat is at x ≈ 2.4, seals are at x >= 5.0)
        const dMoored = Math.hypot(s.x - mooredPoint[0], s.z - mooredPoint[1]);
        expect(dMoored).toBeGreaterThan(2.0);
      }
    }
  });

  it('never lets any seal overlap a penguin traveller', () => {
    let minPenguinDist = Infinity;
    const pRoute = penguinColony.route;
    for (const { t, residents, traveller } of FRAMES) {
      const allSeals = [...residents, traveller];
      const pTraveller = penguinTravellerPose(pRoute, t, 0, restPenguinPose());
      for (const s of allSeals) {
        const d = Math.hypot(s.x - pTraveller.x, s.z - pTraveller.z);
        minPenguinDist = Math.min(minPenguinDist, d);
      }
    }
    // Penguins are on the west side (x < 0), seals on the east side (x > 5)
    expect(minPenguinDist).toBeGreaterThan(4.0);
  });

  it('crawls only on land and swims only in water', () => {
    for (const { traveller, mode } of FRAMES) {
      const d = worldCoastDistance(traveller.x, traveller.z);
      if (mode === 'crawl' || mode === 'rest') {
        expect(d).toBeGreaterThan(-0.05);
      }
      if (mode === 'swim') {
        expect(d).toBeLessThan(0.0);
        expect(traveller.y).toBeLessThanOrEqual(-0.02);
      }
    }
  });

  it('stays clear of all building footprints', () => {
    const polys = STATION_LAYOUT.filter((e) => e.id !== 'boat').map((e) =>
      footprintCorners(e.position[0], e.position[2], e.footprint[0] + 0.6, e.footprint[1] + 0.6, e.rotationY)
    );

    for (const { residents, traveller } of FRAMES) {
      const all = [...residents, traveller];
      for (const s of all) {
        for (const poly of polys) {
          expect(inside([s.x, s.z], poly)).toBe(false);
        }
      }
    }
  });

  it('moves smoothly: no jumps in position or heading between 0.05 s frames', () => {
    let maxStep = 0;
    let maxTurn = 0;
    for (let f = 1; f < FRAMES.length; f++) {
      const prev = FRAMES[f - 1].traveller;
      const curr = FRAMES[f].traveller;
      const step = Math.hypot(curr.x - prev.x, curr.y - prev.y, curr.z - prev.z);
      maxStep = Math.max(maxStep, step);

      let dYaw = Math.abs(curr.yaw - prev.yaw) % (Math.PI * 2);
      if (dYaw > Math.PI) dYaw = Math.PI * 2 - dYaw;
      maxTurn = Math.max(maxTurn, dYaw);
    }

    expect(maxStep).toBeLessThan(0.12);
    expect(maxTurn).toBeLessThan(0.3);
  });
});
