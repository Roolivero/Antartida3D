import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  depthAt,
  parseOceanDepthGrid,
  setOceanDepthGrid,
  project,
  OCEAN_SIZE,
  DEPTH_ABSORB,
  SEA_FPS,
  seaAnimationFps,
  shouldTick,
} from '../src/index.ts';

describe('ocean', () => {
  beforeAll(() => {
    const gridPath = join(__dirname, '../src/assets/ocean-depth-grid.bin');
    const buf = readFileSync(gridPath);
    const grid = parseOceanDepthGrid(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    );
    setOceanDepthGrid(grid);
  });

  it('exports ocean constants', () => {
    expect(OCEAN_SIZE).toBeGreaterThanOrEqual(10000);
    expect(DEPTH_ABSORB).toBeGreaterThan(0);
    expect(SEA_FPS).toBe(30);
  });

  it('verifies the Weddell Sea is deep', () => {
    // Weddell Sea abyssal plain: e.g. -35° lon, -70° lat
    const weddell = project(-35, -70);
    const d = depthAt(weddell.x, weddell.y);
    expect(d).toBeLessThan(-3000);
    expect(d).toBeGreaterThanOrEqual(-6000);
  });

  it('verifies the Antarctic Peninsula continental shelf is between 0 and -1000 m', () => {
    // Continental shelf off the Antarctic Peninsula: e.g. -60° lon, -64.8° lat
    const shelf = project(-60, -64.8);
    const d = depthAt(shelf.x, shelf.y);
    expect(d).toBeLessThan(0);
    expect(d).toBeGreaterThanOrEqual(-1000);
  });

  it('verifies a land point returns 0 elevation/depth', () => {
    // South Pole: (0, -90) -> (500, 500)
    const pole = project(0, -90);
    expect(depthAt(pole.x, pole.y)).toBe(0);

    // Another inland Antarctic point (Dome A)
    const domeA = project(77.35, -80.37);
    expect(depthAt(domeA.x, domeA.y)).toBe(0);
  });

  it('performs 10,000 depthAt calls in less than 50 ms', () => {
    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      const x = 100 + (i % 800);
      const y = 100 + ((i * 3) % 800);
      sum += depthAt(x, y);
    }
    const elapsed = performance.now() - start;
    expect(sum).toBeLessThan(0); // overall ocean points sum to negative depth
    expect(elapsed).toBeLessThan(50);
  });

  describe('seaAnimationFps', () => {
    it('returns SEA_FPS (30) in normal 3D view', () => {
      expect(seaAnimationFps({ is3D: true })).toBe(SEA_FPS);
      expect(seaAnimationFps({})).toBe(SEA_FPS);
    });

    it('returns 0 when hidden (visibilitychange)', () => {
      expect(seaAnimationFps({ is3D: true, hidden: true })).toBe(0);
      expect(seaAnimationFps({ hidden: true, lowQuality: true })).toBe(0);
    });

    it('returns 0 when not in 3D mode', () => {
      expect(seaAnimationFps({ is3D: false })).toBe(0);
    });

    it('returns 0 when prefers-reduced-motion is true', () => {
      expect(seaAnimationFps({ is3D: true, reducedMotion: true })).toBe(0);
      expect(seaAnimationFps({ is3D: true, reducedMotion: true, lowQuality: true })).toBe(0);
    });

    it('returns 15 when lowQuality is true under normal active 3D conditions', () => {
      expect(seaAnimationFps({ is3D: true, lowQuality: true })).toBe(15);
    });

    it('prioritizes paused states (hidden/reducedMotion/2D) over lowQuality', () => {
      expect(seaAnimationFps({ hidden: true, lowQuality: true, is3D: true })).toBe(0);
      expect(seaAnimationFps({ reducedMotion: true, lowQuality: true, is3D: true })).toBe(0);
      expect(seaAnimationFps({ is3D: false, lowQuality: true })).toBe(0);
    });
  });

  describe('shouldTick with simulated clock', () => {
    it('never ticks when fps <= 0', () => {
      expect(shouldTick(1000, 0, 0)).toBe(false);
      expect(shouldTick(1000, 0, -1)).toBe(false);
    });

    it('ticks at 30 fps (approx 33.33 ms intervals)', () => {
      const fps = 30;
      let lastTick = 0;

      // Before interval
      expect(shouldTick(10, lastTick, fps)).toBe(false);
      expect(shouldTick(30, lastTick, fps)).toBe(false);

      // Reaching ~33.33ms
      expect(shouldTick(33.4, lastTick, fps)).toBe(true);

      lastTick = 33.4;
      expect(shouldTick(50, lastTick, fps)).toBe(false);
      expect(shouldTick(66.8, lastTick, fps)).toBe(true);
    });

    it('ticks at 15 fps (approx 66.66 ms intervals)', () => {
      const fps = 15;
      let lastTick = 100;

      expect(shouldTick(130, lastTick, fps)).toBe(false);
      expect(shouldTick(165, lastTick, fps)).toBe(false);
      expect(shouldTick(167, lastTick, fps)).toBe(true);
    });
  });
});
