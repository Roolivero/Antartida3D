import oceanDepthUrl from './assets/ocean-depth-grid.bin?url';

/** Large ocean plane size (in map units) to reach horizon in all camera angles. */
export const OCEAN_SIZE = 20000;

/** Water depth absorption coefficient for depth color mix: 1 - exp(-depth * DEPTH_ABSORB). */
export const DEPTH_ABSORB = 0.0025;

/** Animation frame rate for ocean waves and sea life. */
export const SEA_FPS = 30;

export interface SeaAnimationFpsOptions {
  hidden?: boolean;
  is3D?: boolean;
  reducedMotion?: boolean;
  lowQuality?: boolean;
}

/**
 * Pure function determining target FPS for ocean and sea life animation.
 * Returns 0 when paused (hidden, 2D view, or prefers-reduced-motion),
 * 15 when under low performance / degraded quality, or SEA_FPS (30) in normal 3D view.
 */
export function seaAnimationFps(options: SeaAnimationFpsOptions): number {
  if (options.hidden) return 0;
  if (options.is3D === false) return 0;
  if (options.reducedMotion) return 0;
  if (options.lowQuality) return 15;
  return SEA_FPS;
}

/**
 * fps bounds for the quality monitor of the 3D view: [decline below, incline above].
 * With the camera still, only the sea animation draws, capped at seaAnimationFps. The default
 * bounds (40-60 fps) read that cap as a slow GPU and kept lowering quality until post-processing
 * switched off. Decline only when frames fall clearly behind the cap; incline on the full-rate
 * frames of a camera move.
 */
export function performanceBounds(lowQuality: boolean): [number, number] {
  const fps = seaAnimationFps({ hidden: false, is3D: true, reducedMotion: false, lowQuality });
  return [fps * 0.8, 50];
}

/**
 * Pure frame-rate limiter helper.
 * Returns true if enough time has elapsed since lastTickMs to emit a frame at the given target fps.
 */
export function shouldTick(nowMs: number, lastTickMs: number, fps: number): boolean {
  if (fps <= 0) return false;
  const intervalMs = 1000 / fps;
  return nowMs - lastTickMs >= intervalMs - 0.5;
}

export interface OceanDepthGrid {
  dim: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  grid: Int16Array;
}

/** Parses raw array buffer of an ocean depth grid .bin file. */
export function parseOceanDepthGrid(buffer: ArrayBuffer): OceanDepthGrid {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3)
  );
  if (magic !== 'DPTH') {
    throw new Error(`Invalid ocean depth grid magic: ${magic}`);
  }
  const dim = view.getUint32(4, true);
  const minX = view.getFloat32(8, true);
  const maxX = view.getFloat32(12, true);
  const minY = view.getFloat32(16, true);
  const maxY = view.getFloat32(20, true);

  const grid = new Int16Array(buffer, 24, dim * dim);
  return { dim, minX, maxX, minY, maxY, grid };
}

let cachedOceanGrid: OceanDepthGrid | null = null;

export function setOceanDepthGrid(grid: OceanDepthGrid | null): void {
  cachedOceanGrid = grid;
}

export function getOceanDepthGrid(): OceanDepthGrid | null {
  return cachedOceanGrid;
}

/**
 * Loads ocean depth grid asynchronously in browser or test environments.
 */
export async function loadOceanDepth(url?: string): Promise<OceanDepthGrid> {
  if (cachedOceanGrid && !url) return cachedOceanGrid;
  const targetUrl = url || oceanDepthUrl;
  const res = await fetch(targetUrl);
  const buf = await res.arrayBuffer();
  cachedOceanGrid = parseOceanDepthGrid(buf);
  return cachedOceanGrid;
}

/**
 * Returns water depth / seabed elevation in meters at map coordinates (x, y).
 * Elevation is <= 0 for ocean (e.g. ≈ -4000 for deep ocean, ≈ -500 for shelf) and 0 for land.
 * Uses O(1) bilinear interpolation over regular depth grid.
 */
export function depthAt(x: number, y: number, customGrid?: OceanDepthGrid): number {
  const g = customGrid || cachedOceanGrid;
  if (!g) return 0;

  if (x < g.minX || x > g.maxX || y < g.minY || y > g.maxY) {
    return -4000;
  }

  const u = (x - g.minX) / (g.maxX - g.minX);
  const v = (y - g.minY) / (g.maxY - g.minY);

  const gx = u * (g.dim - 1);
  const gy = v * (g.dim - 1);

  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(g.dim - 1, x0 + 1);
  const y1 = Math.min(g.dim - 1, y0 + 1);

  const fx = gx - x0;
  const fy = gy - y0;

  const row0 = y0 * g.dim;
  const row1 = y1 * g.dim;

  const v00 = g.grid[row0 + x0];
  const v10 = g.grid[row0 + x1];
  const v01 = g.grid[row1 + x0];
  const v11 = g.grid[row1 + x1];

  const top = v00 + (v10 - v00) * fx;
  const bot = v01 + (v11 - v01) * fx;
  return top + (bot - top) * fy;
}
