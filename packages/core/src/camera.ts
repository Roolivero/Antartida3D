import { EXPEDITION_POINT } from './content/points.ts';
import { TERRAIN_BOX, heightAt } from './terrain.ts';
import { worldHeight } from './relief.ts';
import { MAX_K, clampView, type Size, type View, type Geometry } from './viewport.ts';

export const FOV = 40;

/**
 * Scene models (fauna, icebergs, ships, towns, stations) keep their on-screen size up to this camera
 * distance (placeModelSize, seaModelSize). Farther their exaggerated world size is fixed, the one they
 * have at this distance, so they shrink, which reads as distance.
 */
export const MODEL_REFERENCE_DISTANCE = 400;
/** Below this on-screen size a fixed-size model is hidden instead of flickering as a loose dot. */
export const MODEL_MIN_PX = 3;

/**
 * World size of a place model (town, station) that the camera also visits up close: up to
 * MODEL_REFERENCE_DISTANCE it keeps a constant on-screen size (sizePerDistance of the distance), so
 * it never covers what is around it; farther it stays fixed and shrinks with the distance.
 */
export function placeModelSize(distance: number, sizePerDistance: number, minSize: number): number {
  return Math.max(minSize, Math.min(MODEL_REFERENCE_DISTANCE, distance) * sizePerDistance);
}

/** Viewport height the sizes in px of the sea models are given for. */
const SEA_MODEL_VIEWPORT = 900;
/** Smallest world size of a sea model: closer than the camera ever gets it would be a speck. */
const SEA_MODEL_MIN_SIZE = 0.1;

/**
 * World size of a model of the open sea (fauna, icebergs, the ship and the plane) that measures
 * `px` on a 900 px tall viewport. Like a place model, it keeps that on-screen size up to
 * MODEL_REFERENCE_DISTANCE and stays fixed beyond it: around Tierra del Fuego the camera gets
 * 50 times closer than that, and a fixed size filled the screen.
 */
export function seaModelSize(px: number, distance: number): number {
  const perDistance = (2 * Math.tan((FOV * Math.PI) / 360) * px) / SEA_MODEL_VIEWPORT;
  return placeModelSize(distance, perDistance, SEA_MODEL_MIN_SIZE);
}

/** A sea marker that floats over something drawn shows only while that thing is at least this wide on screen. */
export const SEA_HINT_MIN_PX = 70;

/** On-screen height in px of a world length seen at a distance, for the vertical FOV. */
export function screenPx(worldSize: number, distance: number, viewportHeight: number): number {
  return (worldSize * viewportHeight) / (2 * Math.max(distance, 1e-6) * Math.tan((FOV * Math.PI) / 360));
}

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

/** Seconds the trip camera takes to come back to the vehicle from a place off the path. */
export const CAMERA_RETURN_SECONDS = 2;

/**
 * Point the trip camera looks at on its way back to the vehicle from a place off the path, at
 * fraction `u` of the time. The vehicle may be moving again by then: the point leaves `from` at
 * rest and ends on the vehicle wherever it is, moving with it, so there is no jump at either end.
 */
export function cameraReturn(from: Vector3Like, vehicle: Vector3Like, u: number): Vector3Like {
  const c = Math.min(1, Math.max(0, u));
  // Smootherstep: no speed and no acceleration at both ends.
  const k = c * c * c * (c * (c * 6 - 15) + 10);
  return { x: from.x + (vehicle.x - from.x) * k, y: from.y + (vehicle.y - from.y) * k, z: from.z + (vehicle.z - from.z) * k };
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

/** Steepest tilt of the orbit camera, in degrees from the vertical. */
export const MAX_POLAR_DEG = 60;
/** The target of the orbit camera stays within this many map units of the pole on each axis. */
export const PAN_LIMIT = 800;

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

/**
 * Pose at progress t (0..1) of a continuous zoom between two poses. The distance shrinks
 * geometrically, so the zoom looks even on screen, and the target moves with the distance, so it
 * settles while the camera is still far and the point does not slide at the end.
 */
export function approachPose3D(from: CameraPose, to: CameraPose, t: number): CameraPose {
  const u = Math.min(1, Math.max(0, t));
  const offset = (p: CameraPose) => ({ x: p.pos.x - p.target.x, y: p.pos.y - p.target.y, z: p.pos.z - p.target.z });
  const a = offset(from);
  const b = offset(to);
  const d0 = Math.hypot(a.x, a.y, a.z);
  const d1 = Math.hypot(b.x, b.y, b.z);
  if (d0 === 0 || d1 === 0) return to;
  const d = d0 * Math.pow(d1 / d0, u);
  const w = d0 === d1 ? u : (d0 - d) / (d0 - d1);
  const dir = { x: a.x / d0 + (b.x / d1 - a.x / d0) * u, y: a.y / d0 + (b.y / d1 - a.y / d0) * u, z: a.z / d0 + (b.z / d1 - a.z / d0) * u };
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const target = {
    x: from.target.x + (to.target.x - from.target.x) * w,
    y: from.target.y + (to.target.y - from.target.y) * w,
    z: from.target.z + (to.target.z - from.target.z) * w,
  };
  return {
    pos: { x: target.x + (dir.x / len) * d, y: target.y + (dir.y / len) * d, z: target.z + (dir.z / len) * d },
    target,
  };
}

/** DIVE_3D: Low, south of Marambio looking north over the island, above heightAt. */
export const DIVE_3D: CameraPose = divePose3D(EXPEDITION_POINT);
