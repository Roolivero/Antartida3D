import { MAP_SIZE } from './projection.ts';

export interface View {
  k: number;
  px: number;
  py: number;
}

export interface Size {
  vw: number;
  vh: number;
}

export interface Geometry {
  /** Side of the map layer in px at k = 1. */
  S: number;
  ox: number;
  oy: number;
}

export const MIN_K = 1;
export const MAX_K = 5;
export const DIVE_K = 3.4;
export const DRAG_THRESHOLD = 6;
export const KEY_PAN = 60;
export const HOME: View = { k: 1, px: 0, py: 0 };

export function geometry({ vw, vh }: Size): Geometry {
  const S = Math.max(240, Math.min(vw * 0.94, vh * 0.86));
  return { S, ox: (vw - S) / 2 + S * 0.025, oy: (vh - S) / 2 + 6 };
}

const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));

/** Keeps at least 8% of the map under the viewport center. */
export function clampView(size: Size, k: number, px: number, py: number): View {
  const { S, ox, oy } = geometry(size);
  const W = S * k;
  const minX = size.vw * 0.5 - ox - W * 0.92, maxX = size.vw * 0.5 - ox - W * 0.08;
  const minY = size.vh * 0.5 - oy - W * 0.92, maxY = size.vh * 0.5 - oy - W * 0.08;
  return { k, px: Math.min(maxX, Math.max(minX, px)), py: Math.min(maxY, Math.max(minY, py)) };
}

/** Zooms to `nk` keeping the map point under screen (cx, cy) fixed. */
export function zoomAround(size: Size, base: View, cx: number, cy: number, nk: number): View {
  const { S, ox, oy } = geometry(size);
  const k2 = clampK(nk);
  const u = (cx - ox - base.px) / (S * base.k);
  const v = (cy - oy - base.py) / (S * base.k);
  return clampView(size, k2, cx - ox - u * S * k2, cy - oy - v * S * k2);
}

export function zoomCenter(size: Size, view: View, factor: number): View {
  return zoomAround(size, view, size.vw / 2, size.vh / 2, view.k * factor);
}

/** Centers map point (wx, wy) at `anchorY` (fraction of viewport height). */
export function focusWorld(size: Size, wx: number, wy: number, nk: number, anchorY = 0.52): View {
  const { S, ox, oy } = geometry(size);
  const k2 = clampK(nk);
  return clampView(size, k2, size.vw / 2 - ox - (wx / MAP_SIZE) * S * k2, size.vh * anchorY - oy - (wy / MAP_SIZE) * S * k2);
}

/** Unclamped target for the dive into the expedition point. */
export function diveView(size: Size, wx: number, wy: number): View {
  const { S, ox, oy } = geometry(size);
  return { k: DIVE_K, px: size.vw / 2 - ox - (wx / MAP_SIZE) * S * DIVE_K, py: size.vh * 0.58 - oy - (wy / MAP_SIZE) * S * DIVE_K };
}

export function panBy(size: Size, view: View, dx: number, dy: number): View {
  return clampView(size, view.k, view.px + dx, view.py + dy);
}

const KEY_DELTAS: Record<string, [number, number]> = {
  ArrowLeft: [KEY_PAN, 0], ArrowRight: [-KEY_PAN, 0], ArrowUp: [0, KEY_PAN], ArrowDown: [0, -KEY_PAN],
};

/** Keyboard navigation on the focused map; null when the key is not handled. */
export function keyView(size: Size, view: View, key: string): View | null {
  const d = KEY_DELTAS[key];
  if (d) return panBy(size, view, d[0], d[1]);
  if (key === '+' || key === '=') return zoomCenter(size, view, 1.5);
  if (key === '-' || key === '_') return zoomCenter(size, view, 1 / 1.5);
  return null;
}

export function layerTransform({ ox, oy }: Geometry, view: View): string {
  return `translate(${ox + view.px}px, ${oy + view.py}px) scale(${view.k})`;
}

export function toScreen({ S, ox, oy }: Geometry, view: View, x: number, y: number): { left: number; top: number } {
  const sc = (S * view.k) / MAP_SIZE;
  return { left: ox + view.px + x * sc, top: oy + view.py + y * sc };
}

/** Line-mode wheel deltas (Firefox mouse wheels) are ~1/33 of pixel-mode ones. */
const LINE_HEIGHT = 33;
const WHEEL_SENSITIVITY = 0.0018;

/**
 * Zoom factor for a wheel event, proportional to its delta: a mouse notch (~100 px) zooms ~20%,
 * a trackpad pinch (many small ctrl+wheel deltas) zooms smoothly. Clamped so one event never jumps.
 */
export function wheelFactor(deltaY: number, deltaMode = 0): number {
  const px = deltaMode === 1 ? deltaY * LINE_HEIGHT : deltaY;
  return Math.exp(-Math.max(-150, Math.min(150, px)) * WHEEL_SENSITIVITY);
}

/** Discrete mouse-wheel notches get a short eased transition; trackpad streams apply directly. */
export const isWheelNotch = (deltaY: number, deltaMode = 0) => deltaMode === 1 || Math.abs(deltaY) >= 50;
