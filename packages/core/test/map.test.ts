import { describe, expect, it } from 'vitest';
import {
  PTS, buildMarkers, clusterPoints, geometry, keyView, placeLabels, project, unproject, separationZoom,
  zoomAround, wheelFactor, HOME, MAX_K, MIN_K, toScreen,
} from '../src/index.ts';

describe('projection', () => {
  it('maps the south pole to the center', () => {
    expect(project(0, -90)).toEqual({ x: 500, y: 500 });
  });

  it('puts Greenwich up and the 60° S parallel at r = 426', () => {
    const p = project(0, -60);
    expect(p.x).toBeCloseTo(500, 6);
    expect(p.y).toBeCloseTo(500 - 426.04, 1);
  });

  it('places 90° E to the right of the pole', () => {
    const p = project(90, -70);
    expect(p.x).toBeGreaterThan(500);
    expect(p.y).toBeCloseTo(500, 6);
  });

  it.each([
    ['Isla Marambio', -56.62, -64.24, 196, 300],
    ['Ushuaia', -68.3, -54.8, 31, 314],
    ['Orcadas', -44.74, -60.74, 208, 205],
  ])('matches the prototype position of %s', (_, lon, lat, x, y) => {
    const p = project(lon, lat);
    expect(Math.abs(p.x - x)).toBeLessThan(2);
    expect(Math.abs(p.y - y)).toBeLessThan(2);
  });

  it.each([
    ['Isla Marambio', -56.62, -64.24],
    ['Orcadas', -44.74, -60.74],
    ['Polo Sur', 0, -90],
    ['Ushuaia', -68.3, -54.8],
  ])('round-trips through unproject for %s', (_, lon, lat) => {
    const p = project(lon, lat);
    const back = unproject(p.x, p.y);
    if (lat === -90) {
      expect(Math.abs(back.lat - lat)).toBeLessThan(1e-9);
    } else {
      expect(Math.abs(back.lon - lon)).toBeLessThan(1e-9);
      expect(Math.abs(back.lat - lat)).toBeLessThan(1e-9);
    }
  });
});

describe('clustering', () => {
  const a = { id: 'a', x: 100, y: 100 };
  const b = { id: 'b', x: 140, y: 100 };
  const c = { id: 'c', x: 600, y: 600 };

  it('groups points closer than 46 px on screen', () => {
    // 40 map units at 1 px/unit = 40 px < 46
    expect(clusterPoints([a, b, c], 1).map((g) => g.map((p) => p.id))).toEqual([['a', 'b'], ['c']]);
  });

  it('respects the threshold boundary', () => {
    expect(clusterPoints([a, b], 46 / 40 - 0.001)).toHaveLength(1);
    expect(clusterPoints([a, b], 46 / 40)).toHaveLength(2);
  });

  it('separates the Peninsula points as zoom increases', () => {
    const size = { vw: 390, vh: 844 };
    const { S } = geometry(size);
    const count = (k: number) => clusterPoints(PTS, (S * k) / 1000).length;
    expect(count(1)).toBeLessThan(PTS.length);
    expect(count(MAX_K)).toBe(PTS.length);
    for (let k = 1; k < MAX_K; k += 0.5) expect(count(k + 0.5)).toBeGreaterThanOrEqual(count(k));
  });

  it('buildMarkers with identity projector matches standard 2D markers', () => {
    const size = { vw: 1440, vh: 900 };
    const geo = geometry(size);
    const mStandard = buildMarkers(size, HOME, []);
    const mProjector = buildMarkers(size, HOME, [], PTS, (x, y) => toScreen(geo, HOME, x, y));
    expect(mProjector).toEqual(mStandard);
  });

  it('persists and loads view mode, handling storage errors gracefully', async () => {
    const store = new Map<string, string>();
    const fakeStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
    Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage, configurable: true, writable: true });

    const { loadViewMode, saveViewMode } = await import('../src/storage.ts');
    expect(loadViewMode()).toBeNull();
    saveViewMode('3d');
    expect(loadViewMode()).toBe('3d');
    saveViewMode('2d');
    expect(loadViewMode()).toBe('2d');
  });

  it('tapping a cluster zooms far enough to split it', () => {
    const size = { vw: 1440, vh: 900 };
    const markers = buildMarkers(size, HOME, []);
    const cluster = markers.find((m) => m.kind === 'cluster');
    expect(cluster).toBeDefined();
    if (cluster?.kind !== 'cluster') return;
    const after = buildMarkers(size, cluster.target, []);
    const ids = cluster.key.slice(2).split(',');
    const stillGrouped = after.some((m) => m.kind === 'cluster' && ids.every((id) => m.key.includes(id)));
    expect(stillGrouped).toBe(false);
    expect(separationZoom(PTS.filter((p) => ids.includes(p.id)), geometry(size).S)).toBeGreaterThan(1);
  });
});

describe('markers and labels', () => {
  it('always labels the expedition point and hides B/C labels on a small map', () => {
    const markers = buildMarkers({ vw: 1440, vh: 900 }, { k: 2.5, px: -400, py: -400 }, []);
    const a = markers.find((m) => m.kind === 'point' && m.point.tier === 'A');
    expect(a?.kind === 'point' && a.label).toBeTruthy();
    const small = buildMarkers({ vw: 390, vh: 844 }, HOME, []);
    expect(
      small.every((m) => m.kind === 'cluster' || (m.kind === 'point' && m.point.tier === 'A') || m.label === null)
    ).toBe(true);
  });

  it('marks the explored point with a check and no pulse', () => {
    const size = { vw: 1440, vh: 900 };
    const markers = buildMarkers(size, { k: MAX_K, px: -800, py: -1000 }, ['orcadas']);
    const a = markers.find((m) => m.key === 'orcadas');
    expect(a?.kind === 'point' && a.check && !a.pulse).toBe(true);
  });

  it('flips or hides colliding labels', () => {
    const base = { title: 'Estación', sub: 'Ampliación prevista' };
    const sides = placeLabels(
      [
        { id: 'one', left: 100, top: 100, preferred: 'right', ...base },
        { id: 'two', left: 100, top: 120, preferred: 'right', ...base },
        { id: 'three', left: 100, top: 110, preferred: 'right', ...base },
      ],
      [],
    );
    expect(sides.get('one')).toBe('right');
    expect(sides.get('two')).toBe('left');
    expect(sides.get('three')).toBeNull();
  });
});

describe('viewport', () => {
  const size = { vw: 390, vh: 844 };

  it('keeps zoom between 1 and 5', () => {
    expect(zoomAround(size, HOME, 195, 400, 20).k).toBe(MAX_K);
    expect(zoomAround(size, HOME, 195, 400, 0.1).k).toBe(MIN_K);
  });

  it('keeps the map point under the cursor fixed when zooming', () => {
    const { S, ox, oy } = geometry(size);
    const v = zoomAround(size, HOME, 200, 420, 2);
    const before = { u: (200 - ox) / S, v: (420 - oy) / S };
    expect((200 - ox - v.px) / (S * v.k)).toBeCloseTo(before.u, 6);
    expect((420 - oy - v.py) / (S * v.k)).toBeCloseTo(before.v, 6);
  });

  it('zooms in proportion to the wheel delta, clamped per event', () => {
    expect(wheelFactor(-100)).toBeGreaterThan(1.15);
    expect(wheelFactor(-100)).toBeLessThan(1.25);
    expect(wheelFactor(100)).toBeCloseTo(1 / wheelFactor(-100), 6);
    expect(wheelFactor(-4)).toBeLessThan(1.01);
    expect(wheelFactor(-3, 1)).toBeCloseTo(wheelFactor(-99), 6);
    expect(wheelFactor(-5000)).toBe(wheelFactor(-150));
  });

  it('handles arrow and +/- keys', () => {
    expect(keyView(size, HOME, '+')!.k).toBeCloseTo(1.5);
    expect(keyView(size, { k: 2, px: -200, py: -200 }, 'ArrowLeft')!.px).toBe(-140);
    expect(keyView(size, HOME, 'a')).toBeNull();
  });
});
