/**
 * Shared constants of the 3D relief. No asset imports, so the build script (Node) can use it too.
 * Changing VERTICAL_EXAGGERATION or SUN requires `pnpm terrain`: normals and shadows are baked with them.
 */

/** Heights are multiplied by this when drawn. The UI legend states it. */
export const VERTICAL_EXAGGERATION = 50;

/** Contour interval in meters (thin pencil lines; every 4th one is inked). */
export const CONTOUR_M = 250;

/** Approximate ground size of one map unit near the pole (stereographic radius 1590). */
export const METERS_PER_MAP_UNIT = 8000;

/** Fixed cartographic sun: from the northwest (top-left of the map), low enough to rake the ice sheet. */
export const SUN = { azimuthDeg: 315, elevationDeg: 35 };

/** Elevation in meters to world height (map units), exaggerated. */
export function worldHeight(meters: number): number {
  return (meters * VERTICAL_EXAGGERATION) / METERS_PER_MAP_UNIT;
}

/**
 * Unit vector pointing to the sun in world space (x = map x, y = up, z = map y).
 * Map north (Greenwich) is -z, so azimuth 315 (northwest) is (-x, -z).
 */
export function sunDirection(): [number, number, number] {
  const az = (SUN.azimuthDeg * Math.PI) / 180;
  const el = (SUN.elevationDeg * Math.PI) / 180;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
}

export interface ClampSpikesOptions {
  masks?: Uint8Array;
  radii?: readonly number[];
  passes?: number;
  smoothPasses?: number;
}

/**
 * Clamps isolated elevation spikes and narrow vertical needles on a square grid
 * against the median of their 8 neighbors at each radius `r` (`h <= median8 + r * maxDeltaPerCell`),
 * preserving broad mountain massifs, domes, and plateaus while bounding peak slopes under x50 exaggeration.
 */
export function clampTerrainSpikes(
  grid: Float32Array,
  size: number,
  maxDeltaPerCell = 35,
  options: ClampSpikesOptions = {}
): number {
  const { masks, radii = [3, 2, 1], passes = 3, smoothPasses = 0 } = options;
  const nb = new Float32Array(8);
  const next = new Float32Array(grid.length);
  const touched = new Uint8Array(grid.length);

  for (let p = 0; p < passes; p++) {
    for (const rad of radii) {
      if (rad < 1 || size <= 2 * rad) continue;
      const limit = maxDeltaPerCell * rad;
      next.set(grid);
      for (let r = rad; r < size - rad; r++) {
        const row = r * size;
        const rUp = (r - rad) * size;
        const rDn = (r + rad) * size;
        for (let c = rad; c < size - rad; c++) {
          const idx = row + c;
          const h = grid[idx];
          if ((masks && masks[idx] === 0) || h <= 0) continue;
          nb[0] = grid[rUp + c - rad];
          nb[1] = grid[rUp + c];
          nb[2] = grid[rUp + c + rad];
          nb[3] = grid[row + c - rad];
          nb[4] = grid[row + c + rad];
          nb[5] = grid[rDn + c - rad];
          nb[6] = grid[rDn + c];
          nb[7] = grid[rDn + c + rad];
          nb.sort();
          const med = (nb[3] + nb[4]) * 0.5;
          const diff = h - med;
          if (diff > limit) {
            next[idx] = med + limit;
            touched[idx] = 1;
          } else if (p === 0 && rad === 1 && diff < -limit) {
            next[idx] = Math.max(1, med - limit);
            touched[idx] = 1;
          }
        }
      }
      grid.set(next);
    }
  }

  // Smooth only the clamped vertices and their 1-ring neighbors when smoothPasses > 0
  // so multi-radius clamping leaves smooth mountain ridges without terraced rings.
  for (let s = 0; s < smoothPasses; s++) {
    next.set(grid);
    for (let r = 1; r < size - 1; r++) {
      const row = r * size;
      const rUp = (r - 1) * size;
      const rDn = (r + 1) * size;
      for (let c = 1; c < size - 1; c++) {
        const idx = row + c;
        if (masks && masks[idx] === 0) continue;
        const nearTouched =
          touched[idx] |
          touched[rUp + c] |
          touched[rDn + c] |
          touched[row + c - 1] |
          touched[row + c + 1];
        if (!nearTouched) continue;
        const avg =
          (grid[rUp + c - 1] +
            2 * grid[rUp + c] +
            grid[rUp + c + 1] +
            2 * grid[row + c - 1] +
            4 * grid[idx] +
            2 * grid[row + c + 1] +
            grid[rDn + c - 1] +
            2 * grid[rDn + c] +
            grid[rDn + c + 1]) /
          16;
        next[idx] = touched[idx] ? avg : grid[idx] * 0.5 + avg * 0.5;
      }
    }
    grid.set(next);
  }

  let clampedCount = 0;
  for (let i = 0; i < touched.length; i++) clampedCount += touched[i];
  return clampedCount;
}
