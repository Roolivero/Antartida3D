import type { Box } from '../voyage/vehicles.ts';
import { beachPoint } from './penguins.ts';
// Shared muted voxel palette matching sightingModels.ts and stationModels.ts
const BLACK = 0x1f2a36;
const RED = 0xc8472a;
const WOOD = 0x8a6a4a;
const BROWN = 0x6b5443;
const BROWN_DARK = 0x4d3b2f;
const SEAL_DARK = 0x4f5a63;
const SEAL_BELLY = 0x9aa6ae;
const SEAL_SPOT = 0xc9d0d4;

export type SealSpecies = 'weddell' | 'elephant';

// Model pivots
export const WEDDELL_NECK: readonly [number, number, number] = [0.26, 0.18, 0];
export const WEDDELL_FLIPPER_R: readonly [number, number, number] = [0.18, 0.05, 0.17];
export const WEDDELL_FLIPPER_L: readonly [number, number, number] = [0.18, 0.05, -0.17];
export const WEDDELL_TAIL: readonly [number, number, number] = [-0.38, 0.07, 0];

export const ELEPHANT_NECK: readonly [number, number, number] = [0.30, 0.28, 0];
export const ELEPHANT_JAW: readonly [number, number, number] = [0.42, 0.27, 0];
export const ELEPHANT_FLIPPER_R: readonly [number, number, number] = [0.20, 0.06, 0.20];
export const ELEPHANT_FLIPPER_L: readonly [number, number, number] = [0.20, 0.06, -0.20];
export const ELEPHANT_TAIL: readonly [number, number, number] = [-0.46, 0.08, 0];

export interface SealParts {
  body: Box[];
  head: Box[];
  jaw?: Box[];
  flipperR: Box[];
  flipperL: Box[];
  tail: Box[];
}

const shift = (boxes: readonly Box[], dx: number, dy: number, dz: number): Box[] =>
  boxes.map(([x, y, z, sx, sy, sz, c]) => [x + dx, y + dy, z + dz, sx, sy, sz, c] as Box);

/**
 * Split Weddell seal into articulated components for animation.
 */
export function weddellSealParts(): SealParts {
  const body: Box[] = [
    // Torso segments tapering front and rear
    [0, 0.14, 0, 0.46, 0.2, 0.28, SEAL_DARK],
    [0.22, 0.16, 0, 0.2, 0.21, 0.24, SEAL_DARK],
    [-0.24, 0.12, 0, 0.2, 0.16, 0.22, SEAL_DARK],
    [-0.38, 0.09, 0, 0.14, 0.11, 0.15, SEAL_DARK],
    [0.02, 0.245, 0, 0.36, 0.03, 0.2, 0x3d4852],
    // Pale silver belly and throat
    [0.06, 0.06, 0, 0.48, 0.07, 0.24, SEAL_BELLY],
    [0.25, 0.11, 0, 0.18, 0.1, 0.2, SEAL_SPOT],
    [-0.18, 0.055, 0, 0.22, 0.05, 0.18, SEAL_BELLY],
    // Characteristic Weddell silver flank spots
    [0.08, 0.14, 0.142, 0.07, 0.05, 0.012, SEAL_SPOT],
    [-0.06, 0.12, 0.142, 0.08, 0.045, 0.012, SEAL_SPOT],
    [-0.18, 0.11, 0.112, 0.06, 0.04, 0.012, SEAL_SPOT],
    [0.06, 0.14, -0.142, 0.07, 0.05, 0.012, SEAL_SPOT],
    [-0.08, 0.12, -0.142, 0.08, 0.045, 0.012, SEAL_SPOT],
    [-0.19, 0.11, -0.112, 0.06, 0.04, 0.012, SEAL_SPOT],
  ];

  const headBoxes: Box[] = [
    [0.33, 0.25, 0, 0.15, 0.15, 0.17, SEAL_DARK],
    [0.42, 0.24, 0, 0.09, 0.09, 0.11, 0x5d6973],
    [0.47, 0.245, 0, 0.025, 0.038, 0.048, BLACK],
    [0.43, 0.21, 0, 0.07, 0.03, 0.09, SEAL_SPOT],
    [0.37, 0.285, 0.086, 0.028, 0.028, 0.01, BLACK],
    [0.37, 0.285, -0.086, 0.028, 0.028, 0.01, BLACK],
  ];

  const flipperR: Box[] = [[0.18, 0.05, 0.17, 0.14, 0.035, 0.11, 0x3d4852]];
  const flipperL: Box[] = [[0.18, 0.05, -0.17, 0.14, 0.035, 0.11, 0x3d4852]];

  const tail: Box[] = [
    [-0.48, 0.06, 0.07, 0.15, 0.035, 0.1, 0x3d4852],
    [-0.48, 0.06, -0.07, 0.15, 0.035, 0.1, 0x3d4852],
  ];

  return {
    body,
    head: shift(headBoxes, -WEDDELL_NECK[0], -WEDDELL_NECK[1], -WEDDELL_NECK[2]),
    flipperR: shift(flipperR, -WEDDELL_FLIPPER_R[0], -WEDDELL_FLIPPER_R[1], -WEDDELL_FLIPPER_R[2]),
    flipperL: shift(flipperL, -WEDDELL_FLIPPER_L[0], -WEDDELL_FLIPPER_L[1], -WEDDELL_FLIPPER_L[2]),
    tail: shift(tail, -WEDDELL_TAIL[0], -WEDDELL_TAIL[1], -WEDDELL_TAIL[2]),
  };
}

/**
 * Split Southern Elephant seal into articulated components for animation.
 */
export function elephantSealParts(): SealParts {
  const body: Box[] = [
    // Massive warm-brown body core
    [-0.02, 0.16, 0, 0.52, 0.25, 0.34, BROWN],
    [0.24, 0.2, 0, 0.24, 0.27, 0.3, BROWN],
    [-0.28, 0.13, 0, 0.24, 0.19, 0.26, BROWN],
    [-0.44, 0.09, 0, 0.16, 0.13, 0.18, 0x5c4637],
    [0.02, 0.29, 0, 0.4, 0.035, 0.24, BROWN_DARK],
    // Lighter tan-ochre belly & chest shields
    [0.04, 0.06, 0, 0.54, 0.08, 0.28, 0xa6896a],
    [0.28, 0.16, 0, 0.18, 0.18, 0.26, WOOD],
    [0.32, 0.24, 0, 0.16, 0.16, 0.24, 0x9c7a58],
    // Creased neck rolls
    [0.3, 0.31, 0, 0.18, 0.12, 0.22, WOOD],
  ];

  const headBoxes: Box[] = [
    // Broad bull head & brow
    [0.38, 0.36, 0, 0.16, 0.14, 0.19, BROWN],
    [0.41, 0.42, 0, 0.11, 0.04, 0.15, BROWN_DARK],
    // Characteristic overhanging proboscis (trunk)
    [0.48, 0.35, 0, 0.09, 0.09, 0.11, 0x5c4637],
    [0.53, 0.3, 0, 0.06, 0.11, 0.09, BROWN_DARK],
    [0.54, 0.24, 0, 0.045, 0.06, 0.075, BLACK],
    // Eyes
    [0.41, 0.38, 0.096, 0.028, 0.028, 0.012, BLACK],
    [0.41, 0.38, -0.096, 0.028, 0.028, 0.012, BLACK],
  ];

  const jawBoxes: Box[] = [
    // Lower jaw & pink-red mouth crease
    [0.45, 0.27, 0, 0.1, 0.04, 0.12, BROWN_DARK],
    [0.47, 0.295, 0, 0.07, 0.02, 0.09, RED],
  ];

  const flipperR: Box[] = [
    [0.2, 0.06, 0.2, 0.18, 0.045, 0.13, BROWN_DARK],
    [0.24, 0.05, 0.27, 0.1, 0.03, 0.06, BLACK],
  ];

  const flipperL: Box[] = [
    [0.2, 0.06, -0.2, 0.18, 0.045, 0.13, BROWN_DARK],
    [0.24, 0.05, -0.27, 0.1, 0.03, 0.06, BLACK],
  ];

  const tail: Box[] = [
    [-0.52, 0.07, 0, 0.1, 0.08, 0.12, BROWN_DARK],
    [-0.6, 0.07, 0.08, 0.16, 0.04, 0.11, BROWN_DARK],
    [-0.6, 0.07, -0.08, 0.16, 0.04, 0.11, BROWN_DARK],
    [-0.66, 0.08, 0, 0.08, 0.03, 0.22, BLACK],
  ];

  return {
    body,
    head: shift(headBoxes, -ELEPHANT_NECK[0], -ELEPHANT_NECK[1], -ELEPHANT_NECK[2]),
    jaw: shift(jawBoxes, -ELEPHANT_JAW[0], -ELEPHANT_JAW[1], -ELEPHANT_JAW[2]),
    flipperR: shift(flipperR, -ELEPHANT_FLIPPER_R[0], -ELEPHANT_FLIPPER_R[1], -ELEPHANT_FLIPPER_R[2]),
    flipperL: shift(flipperL, -ELEPHANT_FLIPPER_L[0], -ELEPHANT_FLIPPER_L[1], -ELEPHANT_FLIPPER_L[2]),
    tail: shift(tail, -ELEPHANT_TAIL[0], -ELEPHANT_TAIL[1], -ELEPHANT_TAIL[2]),
  };
}

export function assembleWeddellSealBoxes(): Box[] {
  const parts = weddellSealParts();
  return [
    ...parts.body,
    ...shift(parts.head, ...WEDDELL_NECK),
    ...shift(parts.flipperR, ...WEDDELL_FLIPPER_R),
    ...shift(parts.flipperL, ...WEDDELL_FLIPPER_L),
    ...shift(parts.tail, ...WEDDELL_TAIL),
  ];
}

export function assembleElephantSealBoxes(): Box[] {
  const parts = elephantSealParts();
  return [
    ...parts.body,
    ...shift(parts.head, ...ELEPHANT_NECK),
    ...(parts.jaw ? shift(parts.jaw, ...ELEPHANT_JAW) : []),
    ...shift(parts.flipperR, ...ELEPHANT_FLIPPER_R),
    ...shift(parts.flipperL, ...ELEPHANT_FLIPPER_L),
    ...shift(parts.tail, ...ELEPHANT_TAIL),
  ];
}

// ---------------------------------------------------------------------------------------------
// Poses & animation
// ---------------------------------------------------------------------------------------------

export interface SealPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  /** Galumph hump deformation / wave: spine arch factor */
  hump: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  jawOpen: number;
  flipRPitch: number;
  flipRRoll: number;
  flipLPitch: number;
  flipLRoll: number;
  tailPitch: number;
  tailYaw: number;
  stretch: number;
}

export const restPose = (): SealPose => ({
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  hump: 0,
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  jawOpen: 0,
  flipRPitch: 0,
  flipRRoll: 0,
  flipLPitch: 0,
  flipLRoll: 0,
  tailPitch: 0,
  tailYaw: 0,
  stretch: 1,
});

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpAngle = (a: number, b: number, t: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

const yawOf = (dx: number, dz: number) => Math.atan2(-dz, dx);

function hash(a: number, b: number): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------------------------
// Residents: lying on beach, looking, rolling, scratching, yawning/roaring
// ---------------------------------------------------------------------------------------------

export interface SealResident {
  species: SealSpecies;
  x: number;
  y: number;
  z: number;
  yaw: number;
  seed: number;
}

type ResidentAct = 'rest' | 'look' | 'roll' | 'scratch' | 'yawn' | 'turn';
const RESIDENT_ACTS: readonly ResidentAct[] = ['rest', 'look', 'rest', 'scratch', 'roll', 'yawn', 'look', 'turn'];
const RESIDENT_SLOTS = 40;

interface SealSlot {
  start: number;
  length: number;
  act: ResidentAct;
  yaw: number;
  side: number;
}

const sealSlotCache = new Map<number, { slots: SealSlot[]; period: number }>();

function sealResidentSlots(seed: number, baseYaw: number) {
  const cached = sealSlotCache.get(seed);
  if (cached) return cached;
  const slots: SealSlot[] = [];
  let start = 0;
  for (let i = 0; i < RESIDENT_SLOTS; i++) {
    const length = 3.2 + hash(seed, i * 4) * 4.2;
    const act = RESIDENT_ACTS[Math.floor(hash(seed, i * 4 + 1) * RESIDENT_ACTS.length)];
    const side = hash(seed, i * 4 + 2) * 2 - 1;
    const prevYaw = slots.length ? slots[slots.length - 1].yaw : baseYaw;
    const yaw = act === 'turn' ? baseYaw + side * 0.45 : prevYaw;
    slots.push({ start, length, act, yaw, side });
    start += length;
  }
  const entry = { slots, period: start };
  sealSlotCache.set(seed, entry);
  return entry;
}

export function residentPose(r: SealResident, t: number, out: SealPose): SealPose {
  const { slots, period } = sealResidentSlots(r.seed, r.yaw);
  const tt = ((t + hash(r.seed, 777) * period) % period + period) % period;
  let i = 0;
  while (i < slots.length - 1 && slots[i + 1].start <= tt) i++;
  const slot = slots[i];
  const prev = slots[(i + slots.length - 1) % slots.length];
  const tau = tt - slot.start;
  const env = smooth(0, 0.8, tau) * (1 - smooth(slot.length - 0.8, slot.length, tau));

  out.x = r.x;
  out.y = r.y;
  out.z = r.z;
  out.yaw = lerpAngle(prev.yaw, slot.yaw, smooth(0, 1.2, tau));
  out.pitch = 0;
  out.roll = 0;
  out.hump = 0;
  out.stretch = 1 + Math.sin(t * 1.4 + r.seed) * 0.018;
  out.headPitch = 0;
  out.headYaw = Math.sin(t * 0.5 + r.seed) * 0.08;
  out.headRoll = 0;
  out.jawOpen = 0;
  out.flipRPitch = 0;
  out.flipRRoll = 0;
  out.flipLPitch = 0;
  out.flipLRoll = 0;
  out.tailPitch = 0;
  out.tailYaw = 0;

  switch (slot.act) {
    case 'look':
      out.headPitch += env * 0.32;
      out.headYaw += env * slot.side * 0.65;
      out.headRoll += env * slot.side * 0.12;
      break;
    case 'roll':
      // Rolls slightly onto one side, exposing belly
      out.roll += env * (slot.side > 0 ? 0.22 : -0.22);
      out.headPitch += env * 0.15;
      if (slot.side > 0) out.flipRPitch -= env * 0.25;
      else out.flipLPitch -= env * 0.25;
      break;
    case 'scratch': {
      // Rolls slightly and rapidly flutters front flipper against the flank
      const scratchSide = slot.side > 0 ? 1 : -1;
      out.roll += env * scratchSide * 0.18;
      const flutter = Math.sin(tau * 16) * 0.35;
      if (scratchSide > 0) {
        out.flipRPitch += env * (0.35 + flutter);
        out.flipRRoll += env * 0.2;
      } else {
        out.flipLPitch += env * (0.35 + flutter);
        out.flipLRoll -= env * 0.2;
      }
      out.headPitch += env * 0.18;
      out.headYaw -= env * scratchSide * 0.3;
      break;
    }
    case 'yawn':
      if (r.species === 'elephant') {
        // Classic elephant seal roar: raises massive head high, opens lower jaw wide
        out.headPitch += env * 0.65;
        out.jawOpen += env * 1.0;
        out.stretch += env * 0.08;
        out.flipRPitch += env * 0.15;
        out.flipLPitch += env * 0.15;
      } else {
        // Weddell seal yawn: stretches body, lifts head, opens mouth moderately
        out.headPitch += env * 0.38;
        out.jawOpen += env * 0.55;
        out.stretch += env * 0.05;
        out.flipRPitch += env * 0.2;
        out.flipLPitch += env * 0.2;
      }
      break;
    case 'turn':
      out.roll += Math.sin(tau * 8) * 0.06 * env;
      break;
    case 'rest':
    default:
      break;
  }

  return out;
}

// ---------------------------------------------------------------------------------------------
// Traveller Weddell seal: galumphs to water, swims along shore, hauls out
// ---------------------------------------------------------------------------------------------

type SealMode = 'crawl' | 'dive' | 'swim' | 'haulOut' | 'rest';

interface SealSample {
  x: number;
  y: number;
  z: number;
  d: number;
}

interface SealSegment {
  mode: SealMode;
  duration: number;
  path: SealSample[];
  yaw0: number;
  yaw1: number;
  joinYawPrev: number;
  joinYawNext: number;
}

export interface SealRoute {
  segments: SealSegment[];
  duration: number;
}

const CRAWL_SPEED = 0.24;
const SWIM_SPEED = 0.70;
const SWIM_Y = -0.04;

function curve(points: readonly (readonly [number, number])[], step: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([points[points.length - 1][0], points[points.length - 1][1]]);
  return out;
}

function toSamples(
  points: readonly (readonly [number, number])[],
  yAt: (x: number, z: number) => number
): SealSample[] {
  const out: SealSample[] = [];
  for (const [x, z] of points) {
    const y = yAt(x, z);
    const prev = out[out.length - 1];
    const d = prev ? prev.d + Math.hypot(x - prev.x, y - prev.y, z - prev.z) : 0;
    out.push({ x, y, z, d });
  }
  return out;
}

function endYaw(path: SealSample[], atEnd: boolean): number {
  const n = path.length;
  const [a, b] = atEnd ? [path[Math.max(0, n - 3)], path[n - 1]] : [path[0], path[Math.min(n - 1, 2)]];
  return yawOf(b.x - a.x, b.z - a.z);
}

export function buildSealRoute(heightAt: (x: number, z: number) => number): SealRoute {
  const ground = (x: number, z: number) => heightAt(x, z);

  // Waypoints using beachPoint to strictly follow signed coast distance
  const restSpot = beachPoint([5.2, 4.0], 0.35);
  const edgeOut = beachPoint([5.2, 4.0], 0.04);
  const divePt = beachPoint([5.3, 4.0], -0.42);
  const swim1 = beachPoint([5.8, 4.0], -0.62);
  const swim2 = beachPoint([6.4, 4.0], -0.60);
  const swim3 = beachPoint([6.7, 4.0], -0.38);
  const edgeIn = beachPoint([6.5, 4.0], 0.04);
  const beachMid = beachPoint([6.2, 4.0], 0.35);
  const beachTurn = beachPoint([5.7, 4.0], 0.35);

  const segs: SealSegment[] = [];
  const add = (mode: SealMode, path: SealSample[], duration: number) => {
    const moving = path.length > 1 && path[path.length - 1].d > 1e-6;
    const prevYaw = segs.length ? segs[segs.length - 1].yaw1 : 0;
    const yaw0 = moving ? endYaw(path, false) : prevYaw;
    const yaw1 = moving ? endYaw(path, true) : prevYaw;
    segs.push({ mode, path, duration, yaw0, yaw1, joinYawPrev: yaw0, joinYawNext: yaw1 });
  };
  const still = (p: SealSample): SealSample[] => [{ ...p, d: 0 }];
  const last = () => segs[segs.length - 1].path[segs[segs.length - 1].path.length - 1];

  // 1. Crawl down beach towards water
  const crawlDown = toSamples(curve([restSpot, edgeOut], 0.1), ground);
  add('crawl', crawlDown, Math.max(1.5, crawlDown[crawlDown.length - 1].d / CRAWL_SPEED));

  // 2. Dive / slide into the bay
  const diveSamples = toSamples(curve([edgeOut, divePt], 0.08), (x, z) => Math.max(SWIM_Y, ground(x, z)));
  add('dive', diveSamples, 1.2);

  // 3. Swim along the shoreline (only back and head above water)
  const swimSamples = toSamples(curve([divePt, swim1, swim2, swim3], 0.12), () => SWIM_Y);
  add('swim', swimSamples, Math.max(3.0, swimSamples[swimSamples.length - 1].d / SWIM_SPEED));

  // 4. Haul out onto the beach
  const haulSamples = toSamples(curve([swim3, edgeIn, beachMid], 0.08), (x, z) => Math.max(SWIM_Y, ground(x, z)));
  add('haulOut', haulSamples, 1.8);

  // 5. Galumph back along beach to resting spot
  const crawlBack = toSamples(curve([beachMid, beachTurn, restSpot], 0.1), ground);
  add('crawl', crawlBack, Math.max(2.5, crawlBack[crawlBack.length - 1].d / CRAWL_SPEED));

  // 6. Rest at beach spot
  const restSamples = still(last());
  segs.push({
    mode: 'rest',
    path: restSamples,
    duration: 5.5,
    yaw0: segs[segs.length - 1].yaw1,
    yaw1: segs[0].yaw0,
    joinYawPrev: segs[segs.length - 1].yaw1,
    joinYawNext: segs[0].yaw0,
  });

  // Ensure yaw continuity across segments
  for (let k = 0; k < segs.length; k++) {
    const seg = segs[k];
    if (seg.path.length > 1) {
      seg.yaw0 = headingAt(seg.path, 0).yaw;
      seg.yaw1 = headingAt(seg.path, seg.path[seg.path.length - 1].d).yaw;
    }
  }
  for (let k = 0; k < segs.length; k++) {
    const seg = segs[k];
    if (seg.path.length > 1) continue;
    seg.yaw0 = segs[(k + segs.length - 1) % segs.length].yaw1;
    const next = segs[(k + 1) % segs.length];
    seg.yaw1 = next.path.length > 1 ? next.yaw0 : seg.yaw0;
  }
  for (let k = 0; k < segs.length; k++) {
    const next = segs[(k + 1) % segs.length];
    const joinYaw = lerpAngle(segs[k].yaw1, next.yaw0, 0.5);
    segs[k].joinYawNext = joinYaw;
    next.joinYawPrev = joinYaw;
  }

  return { segments: segs, duration: segs.reduce((a, s) => a + s.duration, 0) };
}

function sampleAt(path: SealSample[], dist: number): SealSample {
  if (path.length === 1 || dist <= 0) return path[0];
  const total = path[path.length - 1].d;
  if (dist >= total) return path[path.length - 1];
  let lo = 0;
  let hi = path.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path[mid].d <= dist) lo = mid;
    else hi = mid;
  }
  const a = path[lo];
  const b = path[hi];
  const t = (dist - a.d) / (b.d - a.d || 1);
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), d: dist };
}

function headingAt(path: SealSample[], dist: number): { yaw: number; slope: number } {
  const a = sampleAt(path, dist - 0.1);
  const b = sampleAt(path, dist + 0.1);
  const h = Math.hypot(b.x - a.x, b.z - a.z);
  return { yaw: yawOf(b.x - a.x, b.z - a.z), slope: Math.atan2(b.y - a.y, h || 1) };
}

export function travellerPose(route: SealRoute, t: number, out: SealPose): SealPose {
  const T = route.duration;
  let tt = ((t % T) + T) % T;
  let seg = route.segments[0];
  let i = 0;
  for (; i < route.segments.length; i++) {
    seg = route.segments[i];
    if (tt < seg.duration) break;
    tt -= seg.duration;
  }
  const u = Math.min(1, tt / seg.duration);
  const path = seg.path;
  const total = path[path.length - 1].d;

  out.pitch = 0;
  out.roll = 0;
  out.hump = 0;
  out.stretch = 1;
  out.headPitch = 0;
  out.headYaw = 0;
  out.headRoll = 0;
  out.jawOpen = 0;
  out.flipRPitch = 0;
  out.flipRRoll = 0;
  out.flipLPitch = 0;
  out.flipLRoll = 0;
  out.tailPitch = 0;
  out.tailYaw = 0;

  const dist = total * u;
  let lift = 0;

  switch (seg.mode) {
    case 'crawl': {
      // Galumphing hump-crawl: body flexes in waves, slow
      const wave = (dist / 0.32) * Math.PI * 2;
      out.hump = Math.sin(wave);
      out.pitch = Math.sin(wave) * 0.12;
      lift = Math.max(0, Math.sin(wave)) * 0.025;
      out.headPitch = 0.12 - Math.cos(wave) * 0.12;
      out.tailPitch = Math.sin(wave) * 0.22;
      out.flipRPitch = out.flipLPitch = -Math.cos(wave) * 0.22;
      out.stretch = 1 + Math.sin(wave) * 0.04;
      break;
    }
    case 'dive': {
      // Slithers smoothly into water
      out.pitch = -smooth(0, 0.4, u) * 0.15 + smooth(0.6, 1, u) * 0.15;
      out.headPitch = smooth(0.2, 0.8, u) * 0.22;
      out.tailPitch = Math.sin(u * 12) * 0.15;
      break;
    }
    case 'swim': {
      // Swims with only head and back above water; sculls with hind flippers
      out.headPitch = 0.24;
      out.tailYaw = Math.sin(t * 5.5) * 0.32;
      out.tailPitch = Math.cos(t * 2.8) * 0.06;
      out.roll = Math.sin(t * 1.6) * 0.03;
      lift = Math.sin(t * 2.2) * 0.012;
      out.flipRPitch = 0.12;
      out.flipLPitch = 0.12;
      break;
    }
    case 'haulOut': {
      // Surges out of water onto sand, head lifting up
      out.pitch = smooth(0, 0.5, u) * 0.18 - smooth(0.5, 1, u) * 0.18;
      out.headPitch = 0.28;
      out.flipRPitch = out.flipLPitch = Math.sin(u * 10) * 0.25;
      out.tailPitch = -0.1;
      break;
    }
    case 'rest': {
      out.headYaw = Math.sin(u * Math.PI * 2) * 0.45;
      out.headPitch = Math.abs(Math.sin(u * Math.PI * 2)) * 0.15;
      out.stretch = 1 + Math.sin(t * 1.5) * 0.02;
      break;
    }
  }

  const p = sampleAt(path, dist);
  const moving = total > 1e-6;
  let yaw = moving ? headingAt(path, dist).yaw : lerpAngle(seg.yaw0, seg.yaw1, smooth(0.1, 0.9, u));

  // Blend heading at joins so transitions never snap
  const blendTime = Math.min(0.65, seg.duration * 0.45);

  if (tt < blendTime) {
    const factor = smooth(0, blendTime, tt);
    yaw = lerpAngle(seg.joinYawPrev, yaw, factor);
  } else if (seg.duration - tt < blendTime) {
    const factor = smooth(0, blendTime, blendTime - (seg.duration - tt));
    yaw = lerpAngle(yaw, seg.joinYawNext, factor);
  }

  out.yaw = yaw;
  out.x = p.x;
  out.z = p.z;
  out.y = p.y + lift;

  return out;
}

// ---------------------------------------------------------------------------------------------
// Seal colony builder
// ---------------------------------------------------------------------------------------------

export function buildSealColony(heightAt: (x: number, z: number) => number): {
  residents: SealResident[];
  traveller: {
    species: 'weddell';
    rest: SealResident;
    route: SealRoute;
  };
} {
  // Residents on the front beach of Bahía Scotia, completely clear of the boat (x=2.4)
  const elPos = beachPoint([7.2, 4.0], 0.35);
  const wedPos = beachPoint([9.0, 4.0], 0.35);
  const travRestPos = beachPoint([5.2, 4.0], 0.35);

  const residents: SealResident[] = [
    {
      species: 'elephant',
      x: elPos[0],
      y: heightAt(elPos[0], elPos[1]),
      z: elPos[1],
      yaw: -0.35,
      seed: 8801,
    },
    {
      species: 'weddell',
      x: wedPos[0],
      y: heightAt(wedPos[0], wedPos[1]),
      z: wedPos[1],
      yaw: 0.65,
      seed: 8802,
    },
  ];

  const travRest: SealResident = {
    species: 'weddell',
    x: travRestPos[0],
    y: heightAt(travRestPos[0], travRestPos[1]),
    z: travRestPos[1],
    yaw: -0.4,
    seed: 8803,
  };

  const route = buildSealRoute(heightAt);

  return {
    residents,
    traveller: {
      species: 'weddell',
      rest: travRest,
      route,
    },
  };
}
