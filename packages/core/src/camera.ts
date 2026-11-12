import { EXPEDITION_POINT } from './content/points.ts';
import { TERRAIN_BOX, heightAt } from './terrain.ts';
import { worldHeight } from './relief.ts';
import { MAX_K, clampView, type Size, type View, type Geometry } from './viewport.ts';

export const FOV = 40;

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface CameraPose {
  pos: Vector3Like;
  target: Vector3Like;
}

/** World position from map space (0..1000): (x - 500, h, y - 500) */
export function toWorld(x: number, y: number, h = 0): Vector3Like {
  return { x: x - 500, y: h, z: y - 500 };
}

/** Map space (x, y) from world position (x - 500, y - 500) */
export function fromWorld(pos: Vector3Like): { x: number; y: number } {
  return { x: pos.x + 500, y: pos.z + 500 };
}

/**
 * Top-down camera that frames the plane exactly like the 2D layer frames the SVG for the
 * same view, so clustering, labels and gestures from core apply unchanged.
 */
export function poseFromView(size: Size, geo: Geometry, view: View): CameraPose {
  const pxPerUnit = (geo.S * view.k) / 1000;
  const h = size.vh / (2 * Math.tan((FOV * Math.PI) / 360) * pxPerUnit);
  const targetX = (size.vw / 2 - geo.ox - view.px) / pxPerUnit;
  const targetY = (size.vh / 2 - geo.oy - view.py) / pxPerUnit;
  const target = toWorld(targetX, targetY, 0);
  return {
    pos: { x: target.x, y: h, z: target.z + 0.001 },
    target,
  };
}

/**
 * Recovers {k, px, py} View from a top-down camera pose (or cenital projection of target & height).
 */
export function viewFromPose(pose: CameraPose, size: Size, geo: Geometry): View {
  const h = pose.pos.y;
  const pxPerUnit = size.vh / (2 * Math.tan((FOV * Math.PI) / 360) * h);
  const k = (pxPerUnit * 1000) / geo.S;
  const targetMap = fromWorld(pose.target);
  const px = size.vw / 2 - geo.ox - targetMap.x * pxPerUnit;
  const py = size.vh / 2 - geo.oy - targetMap.y * pxPerUnit;
  return { k, px, py };
}

/** Tilt of the 3D overview, in degrees above the horizon: low enough to show the relief. */
export const HOME_TILT_DEG = 38;

/**
 * Overview pose: north up, looking at the continent from the south at HOME_TILT_DEG,
 * as close as the viewport allows while the whole continent stays in frame.
 */
export function homePose3D(aspect: number, margin = 1.08): CameraPose {
  const target = toWorld((TERRAIN_BOX.minX + TERRAIN_BOX.maxX) / 2, (TERRAIN_BOX.minY + TERRAIN_BOX.maxY) / 2);
  const width = TERRAIN_BOX.maxX - TERRAIN_BOX.minX;
  const depth = TERRAIN_BOX.maxY - TERRAIN_BOX.minY;
  const tilt = (HOME_TILT_DEG * Math.PI) / 180;
  const tanV = Math.tan((FOV * Math.PI) / 360);
  // Ground width must fit the horizontal field of view; the tilted depth must fit the vertical one.
  const fitWidth = width / 2 / (tanV * aspect);
  const fitDepth = (depth * Math.sin(tilt)) / 2 / tanV + (depth / 2) * Math.cos(tilt);
  const distance = Math.max(fitWidth, fitDepth) * margin;
  return {
    pos: { x: target.x, y: distance * Math.sin(tilt), z: target.z + distance * Math.cos(tilt) },
    target,
  };
}

/** Camera-to-target distance of the 3D overview. */
export function homeDistance3D(aspect: number): number {
  const { pos, target } = homePose3D(aspect);
  return Math.hypot(pos.x - target.x, pos.y - target.y, pos.z - target.z);
}

/**
 * 3D zoom level as a 2D-style `k`: 1 at the overview, doubling each time the distance halves.
 * Lets clustering and the 2D/3D switch share one zoom scale with the orbit camera.
 */
export function kFromDistance3D(aspect: number, distance: number): number {
  return homeDistance3D(aspect) / Math.max(distance, 1e-6);
}

/** Inverse of kFromDistance3D. */
export function distanceFromK3D(aspect: number, k: number): number {
  return homeDistance3D(aspect) / k;
}

/**
 * 2D view centered on a 3D camera target at the zoom implied by its distance. k is capped at
 * MAX_K but may drop below MIN_K: farther than the overview, clusters must merge and labels hide
 * instead of overlapping. Switching back to 2D brings such a view back to HOME.
 */
export function viewFrom3D(size: Size, geo: Geometry, target: Vector3Like, distance: number): View {
  const k = Math.min(MAX_K, kFromDistance3D(size.vw / size.vh, distance));
  const pxPerUnit = (geo.S * k) / 1000;
  const map = fromWorld(target);
  return clampView(size, k, size.vw / 2 - geo.ox - map.x * pxPerUnit, size.vh / 2 - geo.oy - map.y * pxPerUnit);
}

/** Low pose south of a map point looking north over it, above heightAt. */
export function divePose3D(point: { x: number; y: number }): CameraPose {
  const elevM = heightAt(point.x, point.y);
  const groundH = worldHeight(elevM);
  const target = toWorld(point.x, point.y, groundH);
  // Camera south of target (+Z in world) and elevated above ground
  return {
    pos: {
      x: target.x,
      y: groundH + 35,
      z: target.z + 65,
    },
    target,
  };
}

/** DIVE_3D: Low, south of Marambio looking north over the island, above heightAt. */
export const DIVE_3D: CameraPose = divePose3D(EXPEDITION_POINT);
