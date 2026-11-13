import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  PTS,
  IRIZAR_DEFAULT_PHASE,
  IRIZAR_DEFAULT_SPEED,
  MIN_ICEBERG_SCREEN_PX,
  SEA_ATLAS,
  SEA_POINTS,
  SEA_HINT_MIN_PX,
  homePose3D,
  screenPx,
  toWorld,
  computeWhaleRipples,
  depthAt,
  driftOffsetAtTime,
  generateSeaLifeInstances,
  getPtsLabelBox,
  overlapsLabelBox,
  irizarStateAtTime,
  parseOceanDepthGrid,
  projectInHomePose3D,
  routeAt,
  routePointAt,
  setOceanDepthGrid,
  whaleCyclePosition,
  whaleCycleState,
} from '../src/index.ts';

describe('sea (fauna, icebergs, and ARA Almirante Irizar)', () => {
  beforeAll(() => {
    const gridPath = join(__dirname, '../src/assets/ocean-depth-grid.bin');
    const buf = readFileSync(gridPath);
    const grid = parseOceanDepthGrid(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    );
    setOceanDepthGrid(grid);
  });

  it('moves the Irizar along the shared route of route.ts (the same line the 2D map draws)', () => {
    for (const t of [0, 0.13, 0.5, 0.77, 1]) {
      const onShared = routeAt(t);
      const onShip = routePointAt(t);
      // Chords of a 64-sample polyline stay within a fraction of a map unit of the curve.
      expect(Math.hypot(onShip.x - onShared.x, onShip.y - onShared.y)).toBeLessThan(0.5);
    }
  });

  it('starts the Irizar route at Ushuaia and ends at Marambio with unit tangents', () => {
    const ushuaia = PTS.find((p) => p.id === 'campana')!;
    const marambio = PTS.find((p) => p.id === 'fosiles')!;

    const start = routePointAt(0);
    const end = routePointAt(1);
    const mid = routePointAt(0.5);

    expect(Math.hypot(start.x - ushuaia.x, start.y - ushuaia.y)).toBeLessThan(10);
    expect(Math.hypot(end.x - marambio.x, end.y - marambio.y)).toBeLessThan(10);

    expect(Math.hypot(start.tx, start.ty)).toBeCloseTo(1, 5);
    expect(Math.hypot(mid.tx, mid.ty)).toBeCloseTo(1, 5);
    expect(Math.hypot(end.tx, end.ty)).toBeCloseTo(1, 5);

    // Along the open Drake Passage segment [0.15, 0.85], water depth is < -20 m
    for (let s = 0.15; s <= 0.85; s += 0.05) {
      const pt = routePointAt(s);
      expect(depthAt(pt.x, pt.y)).toBeLessThan(-20);
    }
  });

  it('sails Irizar round-trip continuously, moors at both route extremes with speed 0, and reverses heading on return', () => {
    const cycleDuration = 1 / IRIZAR_DEFAULT_SPEED; // 80 s
    const dt = 0.05;
    let prev = irizarStateAtTime(0);

    // 1. Continuity across two full round-trip cycles (160 s, 3200 samples)
    for (let t = dt; t <= cycleDuration * 2; t += dt) {
      const curr = irizarStateAtTime(t);
      const posStep = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const speedStep = Math.abs(curr.speed - prev.speed);
      expect(posStep, `Position jump at t=${t.toFixed(2)}`).toBeLessThan(0.45);
      expect(speedStep, `Speed jump at t=${t.toFixed(2)}`).toBeLessThan(0.02);
      prev = curr;
    }

    // 2. Mooring at route extremes: speed === 0 and position matches routePointAt(1) and routePointAt(0)
    const startPt = routePointAt(0);
    const endPt = routePointAt(1);

    for (const c of [0.405, 0.43, 0.47, 0.495]) {
      const uTime = (c - IRIZAR_DEFAULT_PHASE) / IRIZAR_DEFAULT_SPEED;
      const st = irizarStateAtTime(uTime);
      expect(st.speed).toBe(0);
      expect(st.routeT).toBe(1);
      expect(st.x).toBeCloseTo(endPt.x, 6);
      expect(st.y).toBeCloseTo(endPt.y, 6);
    }

    for (const c of [0.905, 0.93, 0.97, 0.995]) {
      const uTime = (c - IRIZAR_DEFAULT_PHASE) / IRIZAR_DEFAULT_SPEED;
      const st = irizarStateAtTime(uTime);
      expect(st.speed).toBe(0);
      expect(st.routeT).toBe(0);
      expect(st.x).toBeCloseTo(startPt.x, 6);
      expect(st.y).toBeCloseTo(startPt.y, 6);
    }

    // 3. Return trip heading is strictly opposite to outbound heading at the same route point
    for (const u of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const cOut = 0.4 * u;
      const cIn = 0.5 + 0.4 * (1 - u);
      const stOut = irizarStateAtTime((cOut - IRIZAR_DEFAULT_PHASE) / IRIZAR_DEFAULT_SPEED);
      const stIn = irizarStateAtTime((cIn - IRIZAR_DEFAULT_PHASE) / IRIZAR_DEFAULT_SPEED);

      expect(stIn.routeT).toBeCloseTo(stOut.routeT, 6);
      expect(stIn.x).toBeCloseTo(stOut.x, 5);
      expect(stIn.y).toBeCloseTo(stOut.y, 5);
      expect(stIn.hx).toBeCloseTo(-stOut.hx, 5);
      expect(stIn.hy).toBeCloseTo(-stOut.hy, 5);
      expect(stOut.hx * stIn.hx + stOut.hy * stIn.hy).toBeCloseTo(-1, 5);
    }
  });

  it('keeps whale and orca surfacing cycle alpha at 0 on boundaries and continuous across cycles', () => {
    for (const species of ['humpback', 'minke', 'orca'] as const) {
      expect(whaleCycleState(0, species).alpha).toBe(0);
      expect(whaleCycleState(1, species).alpha).toBe(0);
      expect(whaleCycleState(0, species).rippleAlpha).toBe(0);
      expect(whaleCycleState(1, species).rippleAlpha).toBe(0);

      let prev = whaleCycleState(0, species);
      for (let p = 0.001; p <= 2.0; p += 0.001) {
        const curr = whaleCycleState(p, species);
        expect(Math.abs(curr.alpha - prev.alpha), `${species} alpha jump at p=${p.toFixed(3)}`).toBeLessThan(
          0.03
        );
        expect(Math.abs(curr.bobY - prev.bobY), `${species} bobY jump at p=${p.toFixed(3)}`).toBeLessThan(
          0.02
        );
        // Sprite index must never change while visible
        if (curr.alpha > 0 || prev.alpha > 0) {
          expect(curr.spriteIndex).toBe(prev.spriteIndex);
        }
        prev = curr;
      }
    }

    // Drift offset for icebergs, penguins, and seals is continuous without resets
    let prevDrift = driftOffsetAtTime(0, 0.02, 0.3, 2.5);
    for (let t = 0.1; t <= 200; t += 0.1) {
      const currDrift = driftOffsetAtTime(t, 0.02, 0.3, 2.5);
      expect(Math.hypot(currDrift.dx - prevDrift.dx, currDrift.dy - prevDrift.dy)).toBeLessThan(0.05);
      prevDrift = currDrift;
    }
  });

  it('places all desktop (16) and mobile (8) instances in water (depthAt < -20)', () => {
    const desktop = generateSeaLifeInstances({ seed: 202611, mobile: false });
    const mobile = generateSeaLifeInstances({ seed: 202611, mobile: true });

    expect(desktop).toHaveLength(16);
    expect(mobile).toHaveLength(8);

    // Verify species breakdown on desktop: 1 Irizar (+wake), 3 humpbacks, 3 orcas, 1 minke, 2 penguins, 1 seal, 4 icebergs
    expect(desktop.filter((i) => i.species === 'irizar')).toHaveLength(1);
    expect(desktop.filter((i) => i.species === 'irizar-wake')).toHaveLength(1);
    expect(desktop.filter((i) => i.species === 'humpback')).toHaveLength(3);
    expect(desktop.filter((i) => i.species === 'orca')).toHaveLength(3);
    expect(desktop.filter((i) => i.species === 'minke')).toHaveLength(1);
    expect(desktop.filter((i) => i.species === 'penguins')).toHaveLength(2);
    expect(desktop.filter((i) => i.species === 'seal')).toHaveLength(1);
    expect(desktop.filter((i) => i.species === 'iceberg')).toHaveLength(4);

    for (const list of [desktop, mobile]) {
      for (const inst of list) {
        const d = depthAt(inst.x, inst.y);
        expect(d, `Instance ${inst.id} at (${inst.x}, ${inst.y})`).toBeLessThan(-20);

        // Also verify whale cycle emergence positions across 5 cycles stay in water
        if (inst.species === 'humpback' || inst.species === 'minke') {
          for (let c = 0; c < 5; c++) {
            const cPos = whaleCyclePosition(inst.x, inst.y, inst.radius, inst.seed, c);
            expect(depthAt(cPos.x, cPos.y)).toBeLessThan(-20);
          }
        }
      }
    }
  });

  it('returns identical instances for the same seed and different instances for a different seed', () => {
    const runA = generateSeaLifeInstances({ seed: 777, mobile: false });
    const runB = generateSeaLifeInstances({ seed: 777, mobile: false });
    const runC = generateSeaLifeInstances({ seed: 888, mobile: false });

    expect(runA).toEqual(runB);
    expect(runA.map((i) => i.x)).not.toEqual(runC.map((i) => i.x));
  });

  it('keeps all instances at least 40 px away on screen from visible PTS markers in homePose3D (1440 and 390)', () => {
    const desktop = generateSeaLifeInstances({ seed: 202611, mobile: false });
    const viewports: readonly [number, number][] = [
      [1440, 900],
      [390, 844],
    ];

    for (const [vw, vh] of viewports) {
      for (const inst of desktop) {
        const p = projectInHomePose3D(inst.x, inst.y, 0, vw, vh);
        for (const pt of PTS) {
          const m = projectInHomePose3D(pt.x, pt.y, 3.0, vw, vh);
          if (!m.visible) continue;
          const distPx = Math.hypot(p.sx - m.sx, p.sy - m.sy);
          expect(
            distPx,
            `${inst.id} too close to ${pt.id} at ${vw}x${vh} (${distPx.toFixed(1)} px)`
          ).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  it('keeps all icebergs at least 60 px apart from each other in homePose3D at 1440x900', () => {
    for (const mobile of [false, true]) {
      const instances = generateSeaLifeInstances({ seed: 202611, mobile });
      const icebergs = instances.filter((inst) => inst.species === 'iceberg');
      expect(icebergs.length).toBe(mobile ? 2 : 4);

      for (let i = 0; i < icebergs.length; i++) {
        const a = projectInHomePose3D(icebergs[i].x, icebergs[i].y, 0, 1440, 900);
        for (let j = i + 1; j < icebergs.length; j++) {
          const b = projectInHomePose3D(icebergs[j].x, icebergs[j].y, 0, 1440, 900);
          const distPx = Math.hypot(a.sx - b.sx, a.sy - b.sy);
          expect(
            distPx,
            `${icebergs[i].id} and ${icebergs[j].id} too close (${distPx.toFixed(1)} px)`
          ).toBeGreaterThanOrEqual(MIN_ICEBERG_SCREEN_PX);
        }
      }
    }
  });

  it('computes whale emergence ripples purely and only changes position when cycleIndex changes', () => {
    const desktop = generateSeaLifeInstances({ seed: 202611, mobile: false });
    const r0 = computeWhaleRipples(desktop, 0);
    const r1 = computeWhaleRipples(desktop, 0.5);

    expect(r0.length).toBeLessThanOrEqual(8);
    expect(r0.length).toBeGreaterThan(0);
    // Within the same cycle index, worldX and worldZ do not change
    expect(r0[0].cycleIndex).toBe(r1[0].cycleIndex);
    expect(r0[0].worldX).toBe(r1[0].worldX);
    expect(r0[0].worldZ).toBe(r1[0].worldZ);

    // Advance by one full cycle of whale 0: cycleIndex increments and emergence shifts within zone
    const nextCycleTime = 1 / r0[0].speed + 0.1;
    const rNext = computeWhaleRipples(desktop, nextCycleTime);
    expect(rNext[0].cycleIndex).toBeGreaterThan(r0[0].cycleIndex);
    expect(depthAt(rNext[0].worldX + 500, rNext[0].worldZ + 500)).toBeLessThan(-20);
  });

  it('includes all 11 sprites in SEA_ATLAS with valid normalized UV rects and anchors', () => {
    expect(SEA_ATLAS.size).toBe(2048);
    expect(Object.keys(SEA_ATLAS.sprites)).toHaveLength(11);
    for (const entry of Object.values(SEA_ATLAS.sprites)) {
      expect(entry.u0).toBeGreaterThanOrEqual(0);
      expect(entry.v0).toBeGreaterThanOrEqual(0);
      expect(entry.u1).toBeLessThanOrEqual(1);
      expect(entry.v1).toBeLessThanOrEqual(1);
      expect(entry.u1).toBeGreaterThan(entry.u0);
      expect(entry.v1).toBeGreaterThan(entry.v0);
      expect(entry.anchorX).toBeGreaterThan(0);
      expect(entry.anchorY).toBeGreaterThan(0);
    }
  });

  describe('sea points of interest (SEA_POINTS)', () => {
    it('has 8 sea points of interest with verified sources or pending tag', () => {
      expect(SEA_POINTS).toHaveLength(8);

      for (const p of SEA_POINTS) {
        expect(p.id).toMatch(/^sea-/);
        expect(p.title.length).toBeGreaterThan(3);
        expect(p.desc.length).toBeGreaterThan(20);

        if (p.pending) {
          expect(p.desc).toContain('[Fuente a definir]');
        } else {
          expect(p.sources.length).toBeGreaterThan(0);
          for (const s of p.sources) {
            expect(s.org.length).toBeGreaterThan(0);
            expect(s.label.length).toBeGreaterThan(0);
            expect(s.url).toMatch(/^https?:\/\//);
            expect(s.consulted).toMatch(/^2026-11-\d{2}$/);
          }
        }
      }
    });

    it('hides the hints over something drawn in homePose3D at 1440 and 390 px, where they would crowd the expeditions', () => {
      const hints = SEA_POINTS.filter((sp) => sp.over);
      expect(hints.map((sp) => sp.id)).toEqual(['sea-drake']);
      // The first sea marker is one that shows in the home view: tests and keyboard users reach it first.
      expect(SEA_POINTS[0].over).toBeUndefined();
      for (const [vw, vh] of [[1440, 900], [390, 844]]) {
        const { pos } = homePose3D(vw / vh);
        for (const sp of hints) {
          const at = toWorld(sp.fallbackX, sp.fallbackY, sp.over!.height);
          const distance = Math.hypot(pos.x - at.x, pos.y - at.y, pos.z - at.z);
          expect(screenPx(sp.over!.width, distance, vh), `${sp.id} at ${vw}x${vh}`).toBeLessThan(SEA_HINT_MIN_PX);
        }
      }
    });

    it('keeps fixed sea markers at least 40 px away from PTS markers and never overlapping PTS label rects in homePose3D at 1440 and 390 px', () => {
      for (const mobile of [false, true]) {
        const instances = generateSeaLifeInstances({ seed: 202611, mobile });
        const [vw, vh] = mobile ? [390, 844] : [1440, 900];
        // A hint over something drawn is not in the home view: it shows only from closer (checked below).
        const fixedSeaPoints = SEA_POINTS.filter((sp) => sp.id !== 'sea-irizar' && !sp.over);

        for (const sp of fixedSeaPoints) {
          const matchingInst = instances.filter((i) => i.species === sp.targetSpecies);
          // Test whichever instance or fallback is used as anchor
          const inst = matchingInst.find((i) => {
            const p = projectInHomePose3D(i.x, i.y, 0, vw, vh);
            return fixedSeaPoints.every(() => {
              for (const pt of PTS) {
                const m = projectInHomePose3D(pt.x, pt.y, 3.0, vw, vh);
                if (!m.visible) continue;
                if (Math.hypot(p.sx - m.sx, p.sy - m.sy) < 40) return false;
                const labelVis = vw >= 640 || pt.tier === 'A';
                if (labelVis) {
                  const box = getPtsLabelBox(pt, m);
                  if (overlapsLabelBox(p.sx, p.sy, box, 11)) return false;
                }
              }
              return true;
            });
          }) ?? matchingInst[0];

          const testPos = inst ? { x: inst.x, y: inst.y } : { x: sp.fallbackX, y: sp.fallbackY };
          const s = projectInHomePose3D(testPos.x, testPos.y, 0, vw, vh);

          // 1. Check distance to individual PTS markers
          for (const pt of PTS) {
            const m = projectInHomePose3D(pt.x, pt.y, 3.0, vw, vh);
            if (!m.visible) continue;
            const distPx = Math.hypot(s.sx - m.sx, s.sy - m.sy);
            expect(
              distPx,
              `${sp.id} at (${testPos.x.toFixed(1)}, ${testPos.y.toFixed(1)}) too close to ${pt.id} at ${vw}x${vh} (${distPx.toFixed(1)} px)`
            ).toBeGreaterThanOrEqual(40);

            // 2. Check no fixed sea marker crosses with any PTS label rectangle
            const labelVis = vw >= 640 || pt.tier === 'A';
            if (labelVis) {
              const box = getPtsLabelBox(pt, m);
              const overlaps = overlapsLabelBox(s.sx, s.sy, box, 11);
              expect(
                overlaps,
                `${sp.id} at (${testPos.x.toFixed(1)}, ${testPos.y.toFixed(1)}) crosses label rectangle of ${pt.id} at ${vw}x${vh}`
              ).toBe(false);
            }
          }
        }
      }
    });
  });
});
