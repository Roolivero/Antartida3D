import { describe, expect, it } from 'vitest';
import {
  FOV,
  MAX_POLAR_DEG,
  OCEAN_SIZE,
  PAN_LIMIT,
  WORLD_FADE_END,
  geometry,
  screenPx,
  placeModelSize,
  seaModelSize,
  MODEL_REFERENCE_DISTANCE,
  poseFromView,
  viewFromPose,
  HOME,
  homePose3D,
  DIVE_3D,
  approachPose3D,
  divePose3D,
  fromWorld,
  toWorld,
  heightAt,
  worldHeight,
  EXPEDITION_POINT,
  ORCADAS_POINT,
  homeDistance3D,
  kFromDistance3D,
  distanceFromK3D,
  viewFrom3D,
  MAX_K,
  MIN_K,
} from '../src/index.ts';

describe('camera', () => {
  const size = { vw: 1440, vh: 900 };
  const geo = geometry(size);

  it('round-trips view -> pose -> view within < 0.5 px', () => {
    const originalView = { ...HOME };
    const pose = poseFromView(size, geo, originalView);
    const restoredView = viewFromPose(pose, size, geo);

    expect(Math.abs(restoredView.k - originalView.k)).toBeLessThan(1e-4);
    expect(Math.abs(restoredView.px - originalView.px)).toBeLessThan(0.5);
    expect(Math.abs(restoredView.py - originalView.py)).toBeLessThan(0.5);
  });

  it('frames the continent closer on wide screens than on narrow ones', () => {
    const wide = homePose3D(16 / 10);
    const narrow = homePose3D(390 / 844);
    const dist = (p: typeof wide) => Math.hypot(p.pos.x - p.target.x, p.pos.y - p.target.y, p.pos.z - p.target.z);
    expect(wide.pos.y).toBeGreaterThan(0);
    expect(dist(wide)).toBeLessThan(dist(narrow));
    // Camera south of the target (+z), looking north.
    expect(wide.pos.z).toBeGreaterThan(wide.target.z);
  });

  it('maps the 3D overview to k = 1 and zooming in always moves the camera closer', () => {
    for (const s of [size, { vw: 390, vh: 844 }]) {
      const aspect = s.vw / s.vh;
      const home = homeDistance3D(aspect);
      expect(kFromDistance3D(aspect, home)).toBeCloseTo(1, 6);
      // Regression: the "+" button used to recompute a top-down height for k = 1.6 that was
      // farther than the overview on desktop, so the first zoom in moved the camera away.
      expect(distanceFromK3D(aspect, 1.6)).toBeLessThan(home);
      expect(kFromDistance3D(aspect, distanceFromK3D(aspect, 2.5))).toBeCloseTo(2.5, 6);
    }
  });

  it('viewFrom3D centers the 2D view on the camera target, caps k and lets it fall below 1 far away', () => {
    const aspect = size.vw / size.vh;
    const target = { x: 0, y: 0, z: 0 }; // map center (500, 500)
    const v = viewFrom3D(size, geo, target, distanceFromK3D(aspect, 2));
    expect(v.k).toBeCloseTo(2, 6);
    const pxPerUnit = (geo.S * v.k) / 1000;
    expect(geo.ox + v.px + 500 * pxPerUnit).toBeCloseTo(size.vw / 2, 3);
    expect(geo.oy + v.py + 500 * pxPerUnit).toBeCloseTo(size.vh / 2, 3);
    expect(viewFrom3D(size, geo, target, 1).k).toBe(MAX_K);
    expect(viewFrom3D(size, geo, target, 1e6).k).toBeLessThan(MIN_K);
  });

  it('has DIVE_3D above ground heightAt Orcadas', () => {
    const orcadasH = heightAt(EXPEDITION_POINT.x, EXPEDITION_POINT.y);
    const targetMap = fromWorld(DIVE_3D.target);
    expect(Math.abs(targetMap.x - EXPEDITION_POINT.x)).toBeLessThan(1e-4);
    expect(Math.abs(targetMap.y - EXPEDITION_POINT.y)).toBeLessThan(1e-4);

    // Camera position y must be strictly above target.y
    expect(DIVE_3D.pos.y).toBeGreaterThan(DIVE_3D.target.y);
    expect(DIVE_3D.pos.y).toBeGreaterThan(worldHeight(orcadasH));
  });

  it('approachPose3D starts and ends on the given poses and reaches the geometric mean of the distances at half time', () => {
    const from = { pos: { x: 0, y: 1600, z: 0.001 }, target: { x: 0, y: 0, z: 0 } };
    const to = divePose3D(ORCADAS_POINT);
    const dist = (p: typeof from) => Math.hypot(p.pos.x - p.target.x, p.pos.y - p.target.y, p.pos.z - p.target.z);
    const start = approachPose3D(from, to, 0);
    const end = approachPose3D(from, to, 1);
    expect(start.pos.y).toBeCloseTo(1600, 4);
    expect(end.pos.x).toBeCloseTo(to.pos.x, 4);
    expect(end.pos.y).toBeCloseTo(to.pos.y, 4);
    expect(end.pos.z).toBeCloseTo(to.pos.z, 4);
    expect(end.target.x).toBeCloseTo(to.target.x, 4);
    const mid = approachPose3D(from, to, 0.5);
    expect(dist(mid)).toBeCloseTo(Math.sqrt(dist(from) * dist(to)), 3);
    // The target is nearly settled at half time: the point does not slide at the end.
    expect(Math.abs(mid.target.x - to.target.x)).toBeLessThan(Math.abs(from.target.x - to.target.x) * 0.2);
  });

  it('divePose3D for Orcadas looks at Orcadas and matches DIVE_3D', () => {
    const pose = divePose3D(ORCADAS_POINT);
    const expected = toWorld(208, 205);
    expect(pose.target.x).toBeCloseTo(expected.x, 4);
    expect(pose.target.z).toBeCloseTo(expected.z, 4);
    expect(pose.pos.y).toBeGreaterThan(pose.target.y);
    expect(pose.target).toEqual(DIVE_3D.target);
    expect(pose.pos).toEqual(DIVE_3D.pos);
  });
});

describe('screenPx', () => {
  it('halves when the distance doubles and grows with the viewport', () => {
    const near = screenPx(10, 400, 900);
    expect(screenPx(10, 800, 900)).toBeCloseTo(near / 2, 6);
    expect(screenPx(10, 400, 1800)).toBeCloseTo(near * 2, 6);
  });

  it('fills the viewport height with the frustum height at that distance', () => {
    const frustum = 2 * 500 * Math.tan((FOV * Math.PI) / 360);
    expect(screenPx(frustum, 500, 844)).toBeCloseTo(844, 6);
  });
});

describe('seaModelSize', () => {
  it('keeps a sea model at its size in px up close, instead of filling the screen (#51)', () => {
    // Around Tierra del Fuego the camera gets as close as 8: a 72 px ship must still be about 72 px.
    for (const distance of [8, 15, 60, MODEL_REFERENCE_DISTANCE]) {
      expect(screenPx(seaModelSize(72, distance), distance, 900)).toBeCloseTo(72, 6);
    }
  });

  it('stops growing beyond the reference distance, so it shrinks on screen', () => {
    const fixed = seaModelSize(72, MODEL_REFERENCE_DISTANCE);
    expect(seaModelSize(72, MODEL_REFERENCE_DISTANCE * 4)).toBe(fixed);
    expect(screenPx(fixed, MODEL_REFERENCE_DISTANCE * 4, 900)).toBeCloseTo(18, 6);
  });
});

describe('placeModelSize', () => {
  it('stays small up close, where a trip starts (#47)', () => {
    // The Ushuaia trip starts with the camera at about 15: the town must not cover the channel.
    expect(placeModelSize(15, 0.036, 0.25)).toBeCloseTo(0.54, 6);
    expect(placeModelSize(1, 0.036, 0.25)).toBe(0.25);
  });

  it('stops growing beyond the reference distance, so it shrinks on screen', () => {
    const fixed = placeModelSize(MODEL_REFERENCE_DISTANCE, 0.036, 0.25);
    expect(placeModelSize(MODEL_REFERENCE_DISTANCE * 4, 0.036, 0.25)).toBe(fixed);
  });
});

describe('camera limits and the drawn world', () => {
  /**
   * Farthest ground point seen by the farthest, most tilted camera, over every target of the pan
   * area and every heading: its distance from the pole and from the camera target. The farthest
   * points on the ground are at the top corners of the screen.
   */
  function farthestGround(vw: number, vh: number) {
    const aspect = vw / vh;
    const distance = homeDistance3D(aspect);
    const polar = (MAX_POLAR_DEG * Math.PI) / 180;
    const tanV = Math.tan((FOV * Math.PI) / 360);
    let fromPole = 0;
    let fromTarget = 0;
    for (let tx = -PAN_LIMIT; tx <= PAN_LIMIT; tx += PAN_LIMIT / 4) {
      for (let tz = -PAN_LIMIT; tz <= PAN_LIMIT; tz += PAN_LIMIT / 4) {
        for (let deg = 0; deg < 360; deg += 5) {
          const az = (deg * Math.PI) / 180;
          const cam = [tx + distance * Math.sin(polar) * Math.sin(az), distance * Math.cos(polar), tz + distance * Math.sin(polar) * Math.cos(az)];
          const fwd = [(tx - cam[0]) / distance, -cam[1] / distance, (tz - cam[2]) / distance];
          const rightLen = Math.hypot(fwd[2], fwd[0]);
          const right = [-fwd[2] / rightLen, 0, fwd[0] / rightLen];
          const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
          for (const side of [-1, 1]) {
            const ray = [0, 1, 2].map((i) => fwd[i] + side * tanV * aspect * right[i] + tanV * up[i]);
            // The camera never looks above the horizon, so the ray reaches the ground.
            expect(ray[1]).toBeLessThan(0);
            const t = -cam[1] / ray[1];
            const gx = cam[0] + t * ray[0];
            const gz = cam[2] + t * ray[2];
            fromPole = Math.max(fromPole, Math.hypot(gx, gz));
            fromTarget = Math.max(fromTarget, Math.hypot(gx - tx, gz - tz));
          }
        }
      }
    }
    return { fromPole, fromTarget };
  }

  it.each([
    ['a phone', 390, 844],
    ['a desktop', 1440, 900],
    ['an ultrawide screen', 2560, 1080],
  ])('never shows the paper beyond the world on %s', (_name, vw, vh) => {
    const { fromPole, fromTarget } = farthestGround(vw, vh);
    // The lands of the rest of the world are drawn up to there.
    expect(fromPole).toBeLessThan(WORLD_FADE_END);
    // The ocean plane follows the camera target.
    expect(fromTarget).toBeLessThan(OCEAN_SIZE / 2);
  });
});
