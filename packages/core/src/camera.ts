import { EXPEDITION_POINT } from './content/points.ts';
import { TERRAIN_BOX, heightAt } from './terrain.ts';
import { worldHeight } from './relief.ts';
import type { Size, View, Geometry } from './viewport.ts';

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

/** DIVE_3D: Low, south of Marambio looking north over the island, above heightAt. */
export const DIVE_3D: CameraPose = (() => {
  const elevM = heightAt(EXPEDITION_POINT.x, EXPEDITION_POINT.y);
  const groundH = worldHeight(elevM);
  const target = toWorld(EXPEDITION_POINT.x, EXPEDITION_POINT.y, groundH);
  // Camera south of Marambio (+Z in world) and elevated above ground
  return {
    pos: {
      x: target.x,
      y: groundH + 35,
      z: target.z + 65,
    },
    target,
  };
})();
