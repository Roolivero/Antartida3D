import { describe, expect, it } from 'vitest';
import { STATION_LAYOUT, footprintCorners, worldCoastDistance } from '@antartida/core';
import {
  buildPenguinColony,
  residentPose,
  restPose,
  travellerPose,
  PENGUIN_SCALE,
} from '../src/orcadas/penguins.ts';
import { PENGUIN_KNOLL, evaluateIsthmusTerrain } from '../src/orcadas/stationModels.ts';

const heightAt = (x: number, z: number) => evaluateIsthmusTerrain(x, z).y;
const colony = buildPenguinColony(heightAt);
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

/** Centre of the body: lying penguins stretch forward from their feet. */
function centre(p: ReturnType<typeof restPose>): Pt {
  const reach = 0.35 * PENGUIN_SCALE * p.lie;
  return [p.x + Math.cos(p.yaw) * reach, p.z - Math.sin(p.yaw) * reach];
}

function frames() {
  const out: { t: number; poses: ReturnType<typeof restPose>[] }[] = [];
  for (let t = 0; t < colony.route.duration; t += DT) {
    const poses = [
      ...colony.residents.map((r) => residentPose(r, t, restPose())),
      ...colony.travellers.map((v) => travellerPose(colony.route, t - v.delay, v.offset, restPose())),
    ];
    out.push({ t, poses });
  }
  return out;
}
const FRAMES = frames();

describe('penguin colony (reconstruction)', () => {
  it('has about fourteen penguins of both species', () => {
    const all = [...colony.residents.map((r) => r.species), ...colony.travellers.map((v) => v.species)];
    expect(all.length).toBe(14);
    expect(new Set(all)).toEqual(new Set(['adelie', 'chinstrap']));
  });

  it('keeps the nests on the knoll top', () => {
    const [cx, cz] = PENGUIN_KNOLL.center;
    for (const r of colony.residents) {
      expect(Math.hypot(r.x - cx, r.z - cz)).toBeLessThan(PENGUIN_KNOLL.topRadius);
    }
  });

  it('never lets two penguins overlap during the whole loop', () => {
    let worst = Infinity;
    for (const { poses } of FRAMES) {
      const c = poses.map(centre);
      for (let i = 0; i < c.length; i++) {
        for (let j = i + 1; j < c.length; j++) {
          worst = Math.min(worst, Math.hypot(c[i][0] - c[j][0], c[i][1] - c[j][1]));
        }
      }
    }
    expect(worst).toBeGreaterThan(0.3);
  });

  it('walks on land, swims in the water and stays clear of the buildings', () => {
    const polys = STATION_LAYOUT.map((e) =>
      footprintCorners(e.position[0], e.position[2], e.footprint[0] + 0.6, e.footprint[1] + 0.6, e.rotationY)
    );
    for (const { poses } of FRAMES) {
      for (const p of poses.slice(colony.residents.length)) {
        const d = worldCoastDistance(p.x, p.z);
        if (p.lie < 0.5) expect(d).toBeGreaterThan(-0.05);
        if (p.y < 0) expect(d).toBeLessThan(0);
        for (const poly of polys) expect(inside([p.x, p.z], poly)).toBe(false);
      }
    }
  });

  it('moves smoothly: no jumps in position or heading between frames', () => {
    let maxStep = 0;
    let maxTurn = 0;
    for (let f = 1; f < FRAMES.length; f++) {
      const a = FRAMES[f - 1].poses;
      const b = FRAMES[f].poses;
      for (let i = 0; i < a.length; i++) {
        maxStep = Math.max(maxStep, Math.hypot(b[i].x - a[i].x, b[i].y - a[i].y, b[i].z - a[i].z));
        let d = Math.abs(b[i].yaw - a[i].yaw) % (Math.PI * 2);
        if (d > Math.PI) d = Math.PI * 2 - d;
        maxTurn = Math.max(maxTurn, d);
      }
    }
    // 0.12 units in 0.05 s is 2.4 units per second: faster than the leap out of the water.
    expect(maxStep).toBeLessThan(0.12);
    expect(maxTurn).toBeLessThan(0.3);
  });
});
