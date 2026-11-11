import { describe, expect, it } from 'vitest';
import {
  geometry,
  poseFromView,
  viewFromPose,
  HOME,
  homePose3D,
  DIVE_3D,
  fromWorld,
  heightAt,
  worldHeight,
  EXPEDITION_POINT,
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

  it('has DIVE_3D above ground heightAt Marambio', () => {
    const marambioH = heightAt(EXPEDITION_POINT.x, EXPEDITION_POINT.y);
    const targetMap = fromWorld(DIVE_3D.target);
    expect(Math.abs(targetMap.x - EXPEDITION_POINT.x)).toBeLessThan(1e-4);
    expect(Math.abs(targetMap.y - EXPEDITION_POINT.y)).toBeLessThan(1e-4);

    // Camera position y must be strictly above target.y
    expect(DIVE_3D.pos.y).toBeGreaterThan(DIVE_3D.target.y);
    expect(DIVE_3D.pos.y).toBeGreaterThan(worldHeight(marambioH));
  });
});
