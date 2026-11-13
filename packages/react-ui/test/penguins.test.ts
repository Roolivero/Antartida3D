import { describe, expect, it } from 'vitest';
import { STATION_LAYOUT, footprintCorners, seaIceAt, worldCoastDistance } from '@antartida/core';
import {
  PENGUIN_NECK,
  PENGUIN_SCALE,
  PENGUIN_SWIM_CLEARANCE,
  buildPenguinColony,
  penguinParts,
  penguinSwimCorridor,
  residentPose,
  restPose,
  travellerPose,
  type PenguinPose,
  type PenguinSpecies,
} from '../src/orcadas/penguins.ts';
import {
  PENGUIN_KNOLL,
  evaluateIsthmusTerrain,
  floeVisibility,
  generateIcebergs,
  generateSeaIcePlates,
  icebergRadius,
  seaIcePlateRadius,
} from '../src/orcadas/stationModels.ts';

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

  it('keeps body and feet resting on the terrain when landing, diving and walking', () => {
    const minGroundClearance = (p: PenguinPose, species: PenguinSpecies) => {
      const parts = penguinParts(species);
      const zRot = -p.lie * (Math.PI / 2) + p.slope;
      const cz = Math.cos(zRot);
      const sz = Math.sin(zRot);
      const cx = Math.cos(p.roll);
      const sx = Math.sin(p.roll);
      const cy = Math.cos(p.yaw);
      const sy = Math.sin(p.yaw);
      const chp = Math.cos(p.headPitch);
      const shp = Math.sin(p.headPitch);
      const chy = Math.cos(p.headYaw);
      const shy = Math.sin(p.headYaw);
      let minClear = Infinity;
      const scan = (boxes: typeof parts.body, isHead: boolean) => {
        for (const [bx, by, bz, bsx, bsy, bsz] of boxes) {
          for (const ox of [-bsx / 2, bsx / 2]) {
            for (const oy of [-bsy / 2, bsy / 2]) {
              for (const oz of [-bsz / 2, bsz / 2]) {
                let lx = bx + ox;
                let ly = by + oy;
                let lz = bz + oz;
                if (isHead) {
                  const rx = lx * chp - ly * shp;
                  const ry = lx * shp + ly * chp;
                  lx = rx * chy + lz * shy + PENGUIN_NECK[0];
                  ly = ry + PENGUIN_NECK[1];
                  lz = -rx * shy + lz * chy + PENGUIN_NECK[2];
                }
                ly *= p.stretch;
                const x1 = lx * cz - ly * sz;
                const y1 = lx * sz + ly * cz;
                const y2 = y1 * cx - lz * sx;
                const z2 = y1 * sx + lz * cx;
                const wx = p.x + (x1 * cy + z2 * sy) * PENGUIN_SCALE;
                const wz = p.z + (-x1 * sy + z2 * cy) * PENGUIN_SCALE;
                const wy = p.y + y2 * PENGUIN_SCALE;
                minClear = Math.min(minClear, wy - heightAt(wx, wz));
              }
            }
          }
        }
      };
      scan(parts.body, false);
      scan(parts.head, true);
      return minClear;
    };

    const pose = restPose();
    let tAcc = 0;
    for (const seg of colony.route.segments) {
      for (let k = 0; k <= 20; k++) {
        const t = tAcc + (k / 20) * (seg.duration - 1e-6);
        for (const v of colony.travellers) {
          travellerPose(colony.route, t, v.offset, pose);
          const clear = minGroundClearance(pose, v.species);
          if (seg.mode !== 'swim') {
            expect(clear).toBeGreaterThan(-0.005);
          }
          if (seg.mode !== 'swim' && seg.mode !== 'dive' && seg.mode !== 'leap') {
            expect(clear).toBeLessThan(0.025);
          }
        }
      }
      tAcc += seg.duration;
    }
  });

  it('keeps the swimming corridor free of floes and icebergs and stays on land when the bay freezes', () => {
    const corridor = penguinSwimCorridor(colony.route);
    const plates = generateSeaIcePlates(190406, corridor, PENGUIN_SWIM_CLEARANCE);
    const icebergs = generateIcebergs(190409, corridor, PENGUIN_SWIM_CLEARANCE);
    expect(plates.length).toBeGreaterThan(700);
    expect(icebergs.length).toBeGreaterThanOrEqual(4);

    for (let month = 1; month <= 12; month++) {
      const seaIce = seaIceAt(month);
      if (seaIce >= 0.5) {
        const allFrozen = [...colony.residents, ...colony.frozenTravellers];
        for (const f of colony.frozenTravellers) {
          expect(worldCoastDistance(f.x, f.z)).toBeGreaterThan(0.2);
        }
        for (let i = 0; i < allFrozen.length; i++) {
          for (let j = i + 1; j < allFrozen.length; j++) {
            expect(Math.hypot(allFrozen[i].x - allFrozen[j].x, allFrozen[i].z - allFrozen[j].z)).toBeGreaterThan(0.3);
          }
        }
        continue;
      }

      const activePlates = plates.filter((pl) => floeVisibility(pl.threshold, seaIce) > 0.01);
      for (const { poses } of FRAMES) {
        for (const p of poses.slice(colony.residents.length)) {
          if (worldCoastDistance(p.x, p.z) > 0.1) continue;
          for (const pl of activePlates) {
            expect(Math.hypot(p.x - pl.x, p.z - pl.z)).toBeGreaterThanOrEqual(
              seaIcePlateRadius(pl) + PENGUIN_SWIM_CLEARANCE - 0.14 - 1e-6
            );
          }
          for (const b of icebergs) {
            expect(Math.hypot(p.x - b.x, p.z - b.z)).toBeGreaterThanOrEqual(
              icebergRadius(b) + PENGUIN_SWIM_CLEARANCE - 0.14 - 1e-6
            );
          }
        }
      }
    }
  });
});
