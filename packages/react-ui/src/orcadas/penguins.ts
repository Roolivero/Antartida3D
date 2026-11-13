import { worldCoastDistance } from '@antartida/core';
import type { Box } from '../voyage/vehicles.ts';
import { PENGUIN_KNOLL, SLIDE_DIRECTION, VOXEL_PALETTE } from './stationModels.ts';

/**
 * Penguin colony of the Orcadas diorama: a reconstruction (no source places the colony) of
 * Adélie and chinstrap penguins on a rocky knoll, with a few of them doing the round trip to the
 * sea: walk, toboggan down the snow, swim, leap back onto the beach and shake.
 *
 * Everything here is a pure function of time, so the scene can draw any instant and the tests
 * can check the whole loop (no overlap, nobody walks on water or through a building).
 */

const { BLACK, WHITE, ORANGE, RED, ROCK, ROCK_DARK, ROCK_LIGHT } = VOXEL_PALETTE;
/** Pink-cream guano of a krill-eating colony. */
const GUANO = 0xdcc2b4;
const GUANO_LIGHT = 0xeee2d6;
const PEBBLE = 0x5b605e;

/** Animals are drawn larger than real so they can be seen (declared in the scene label). */
export const PENGUIN_SCALE = 0.55;
/** Neck and shoulder pivots of the penguin model, in model units (feet on y = 0, beak to +x). */
export const PENGUIN_NECK: readonly [number, number, number] = [0, 0.53, 0];
export const PENGUIN_SHOULDER: readonly [number, number, number] = [-0.01, 0.47, 0.15];

export type PenguinSpecies = 'adelie' | 'chinstrap';

export interface PenguinParts {
  body: Box[];
  /** Relative to PENGUIN_NECK. */
  head: Box[];
  /** One flipper relative to its shoulder; the scene places it on both sides. */
  flipper: Box[];
}

const shift = (boxes: readonly Box[], dx: number, dy: number, dz: number): Box[] =>
  boxes.map(([x, y, z, sx, sy, sz, c]) => [x + dx, y + dy, z + dz, sx, sy, sz, c] as Box);

/** Standing penguin split in body, head and flippers so the scene can animate them. */
export function penguinParts(species: PenguinSpecies): PenguinParts {
  const body: Box[] = [
    // Webbed feet
    [0.05, 0.02, 0.075, 0.16, 0.04, 0.09, ORANGE],
    [0.05, 0.02, -0.075, 0.16, 0.04, 0.09, ORANGE],
    [0.12, 0.015, 0.075, 0.05, 0.028, 0.105, ORANGE],
    [0.12, 0.015, -0.075, 0.05, 0.028, 0.105, ORANGE],
    // Stiff tail
    [-0.14, 0.07, 0, 0.12, 0.045, 0.11, BLACK],
    [-0.19, 0.045, 0, 0.08, 0.03, 0.075, BLACK],
    // Black back, stepped towards the shoulders
    [-0.01, 0.19, 0, 0.23, 0.22, 0.26, BLACK],
    [-0.01, 0.37, 0, 0.22, 0.2, 0.24, BLACK],
    [-0.005, 0.5, 0, 0.19, 0.1, 0.21, BLACK],
    // White belly and chest
    [0.055, 0.19, 0, 0.14, 0.2, 0.245, WHITE],
    [0.06, 0.36, 0, 0.135, 0.2, 0.225, WHITE],
    [0.055, 0.48, 0, 0.12, 0.08, 0.19, WHITE],
  ];
  const crown: Box[] = [
    [0.01, 0.61, 0, 0.18, 0.13, 0.19, BLACK],
    [0.005, 0.685, 0, 0.14, 0.035, 0.15, BLACK],
  ];
  const face: Box[] =
    species === 'adelie'
      ? [
          // Adélie: black head, wide white eye ring, red-based bill
          [0.05, 0.625, 0.098, 0.07, 0.07, 0.014, WHITE],
          [0.05, 0.625, -0.098, 0.07, 0.07, 0.014, WHITE],
          [0.056, 0.625, 0.107, 0.028, 0.028, 0.008, BLACK],
          [0.056, 0.625, -0.107, 0.028, 0.028, 0.008, BLACK],
          [0.12, 0.6, 0, 0.06, 0.042, 0.056, RED],
          [0.165, 0.595, 0, 0.055, 0.028, 0.038, BLACK],
        ]
      : [
          // Chinstrap: white face, black cap and the thin black strap under the chin
          [0.045, 0.59, 0, 0.14, 0.11, 0.196, WHITE],
          [0.065, 0.625, 0.102, 0.028, 0.028, 0.01, BLACK],
          [0.065, 0.625, -0.102, 0.028, 0.028, 0.01, BLACK],
          [0.035, 0.56, 0.101, 0.026, 0.1, 0.01, BLACK],
          [0.035, 0.56, -0.101, 0.026, 0.1, 0.01, BLACK],
          [0.07, 0.535, 0, 0.05, 0.03, 0.206, BLACK],
          [0.13, 0.6, 0, 0.075, 0.04, 0.052, BLACK],
        ];
  const flipper: Box[] = [
    [0, -0.09, 0, 0.11, 0.18, 0.036, BLACK],
    [0.02, -0.23, 0.003, 0.085, 0.15, 0.032, BLACK],
    [0.04, -0.16, -0.002, 0.03, 0.24, 0.038, WHITE],
  ];
  const [nx, ny, nz] = PENGUIN_NECK;
  return { body, head: shift([...crown, ...face], -nx, -ny, -nz), flipper };
}

/** The whole penguin at rest, for the voxel detail test. */
export function assemblePenguinBoxes(species: PenguinSpecies): Box[] {
  const { body, head, flipper } = penguinParts(species);
  const [sx, sy, sz] = PENGUIN_SHOULDER;
  return [
    ...body,
    ...shift(head, ...PENGUIN_NECK),
    ...shift(flipper, sx, sy, sz),
    ...shift(flipper, sx, sy, -sz),
  ];
}

// ---------------------------------------------------------------------------------------------
// Colony plan
// ---------------------------------------------------------------------------------------------

type V2 = readonly [number, number];
type HeightAt = (x: number, z: number) => number;

const [CX, CZ] = PENGUIN_KNOLL.center;
const S: V2 = SLIDE_DIRECTION;
/** Along the coast, perpendicular to the slide, towards the middle of the stage. */
const P: V2 = [S[1], -S[0]];

/** World point from knoll coordinates: `s` towards the water, `p` along the coast. */
const knollPoint = (s: number, p: number): V2 => [CX + S[0] * s + P[0] * p, CZ + S[1] * s + P[1] * p];

/** Nests on the knoll top, in knoll coordinates [s, p], in two groups. */
const NESTS: readonly V2[] = [
  [-0.2, -0.5],
  [0.25, -0.6],
  [-0.6, -0.15],
  [-0.1, -0.98],
  [0.4, -1.05],
  [-0.98, 0.25],
  [-0.62, 0.62],
  [-1.12, -0.22],
  [-0.2, 0.08],
];

/** Where each nest is, in world x/z. */
export const NEST_POSITIONS: readonly V2[] = NESTS.map(([s, p]) => knollPoint(s, p));

/**
 * Flat guano-stained rock of the colony with a ring of pebbles for each nest, relative to the
 * knoll centre and its top height (y = 0).
 */
export function buildRookeryBoxes(): Box[] {
  // Irregular stains of guano and bare rock, thin and flush with the knoll top.
  const boxes: Box[] = [
    [0.1, 0.0, -0.15, 1.1, 0.03, 0.8, GUANO],
    [-0.35, 0.0, 0.3, 0.8, 0.03, 0.6, GUANO],
    [0.45, 0.0, 0.3, 0.5, 0.03, 0.45, GUANO_LIGHT],
    [-0.6, 0.0, -0.45, 0.45, 0.03, 0.5, GUANO_LIGHT],
    [0.3, 0.0, -0.75, 0.55, 0.03, 0.3, GUANO],
    [-0.95, 0.0, 0.05, 0.3, 0.03, 0.55, GUANO_LIGHT],
    [0.75, 0.02, -0.45, 0.28, 0.08, 0.22, ROCK_DARK],
    [-0.85, 0.02, 0.6, 0.24, 0.07, 0.3, ROCK_LIGHT],
    [0.95, 0.02, 0.5, 0.2, 0.06, 0.2, ROCK],
  ];
  for (const [s, p] of NESTS) {
    const x = S[0] * s + P[0] * p;
    const z = S[1] * s + P[1] * p;
    // A low ring of pebbles: the nest the penguins build.
    boxes.push(
      [x + 0.11, 0.06, z, 0.06, 0.05, 0.2, PEBBLE],
      [x - 0.11, 0.06, z, 0.06, 0.05, 0.2, PEBBLE],
      [x, 0.06, z + 0.11, 0.16, 0.05, 0.06, PEBBLE],
      [x, 0.06, z - 0.11, 0.16, 0.05, 0.06, PEBBLE]
    );
  }
  return boxes;
}

/** Pose of one penguin at one instant. Angles in radians, lengths in world units. */
export interface PenguinPose {
  x: number;
  y: number;
  z: number;
  /** Heading around the vertical axis (three.js rotation.y; the beak looks along local +x). */
  yaw: number;
  /** 0 standing, 1 lying on the belly (tobogganing or swimming). */
  lie: number;
  /** Extra pitch of the body following the ground slope. */
  slope: number;
  /** Side to side rock of the waddle or the shake. */
  roll: number;
  /** Stretch of the body (ecstatic display), 1 = normal. */
  stretch: number;
  headPitch: number;
  headYaw: number;
  /** Flippers opened outwards, left and right. */
  flipL: number;
  flipR: number;
}

export const restPose = (): PenguinPose => ({
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  lie: 0,
  slope: 0,
  roll: 0,
  stretch: 1,
  headPitch: 0,
  headYaw: 0,
  flipL: 0.08,
  flipR: 0.08,
});

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Shortest turn from a to b. */
const lerpAngle = (a: number, b: number, t: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};
const yawOf = (dx: number, dz: number) => Math.atan2(-dz, dx);

/** Stateless hash in [0, 1). */
function hash(a: number, b: number): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---- Residents: penguins on their nests ------------------------------------------------------

export interface Resident {
  x: number;
  y: number;
  z: number;
  species: PenguinSpecies;
  seed: number;
  /** Base heading: roughly away from the centre of the colony. */
  yaw: number;
}

type Act = 'look' | 'preen' | 'display' | 'doze' | 'turn';
const ACTS: readonly Act[] = ['look', 'look', 'preen', 'turn', 'turn', 'display', 'doze'];
const SLOTS = 48;

interface Slot {
  start: number;
  length: number;
  act: Act;
  yaw: number;
  side: number;
}

const slotCache = new Map<number, { slots: Slot[]; period: number }>();

function residentSlots(seed: number, baseYaw: number) {
  const cached = slotCache.get(seed);
  if (cached) return cached;
  const slots: Slot[] = [];
  let start = 0;
  for (let i = 0; i < SLOTS; i++) {
    const length = 2.6 + hash(seed, i * 3) * 3.4;
    const act = ACTS[Math.floor(hash(seed, i * 3 + 1) * ACTS.length)];
    const side = hash(seed, i * 3 + 2) * 2 - 1;
    const prevYaw = slots.length ? slots[slots.length - 1].yaw : baseYaw;
    // Turning changes where the penguin faces for the next slots; it stays near its base.
    const yaw = act === 'turn' ? baseYaw + side * 1.1 : prevYaw;
    slots.push({ start, length, act, yaw, side });
    start += length;
  }
  const entry = { slots, period: start };
  slotCache.set(seed, entry);
  return entry;
}

/** Pose of a penguin on its nest at time t (seconds). */
export function residentPose(r: Resident, t: number, out: PenguinPose): PenguinPose {
  const { slots, period } = residentSlots(r.seed, r.yaw);
  const tt = ((t + hash(r.seed, 999) * period) % period + period) % period;
  let i = 0;
  while (i < slots.length - 1 && slots[i + 1].start <= tt) i++;
  const slot = slots[i];
  const prev = slots[(i + slots.length - 1) % slots.length];
  const tau = tt - slot.start;
  const env = smooth(0, 0.7, tau) * (1 - smooth(slot.length - 0.7, slot.length, tau));

  out.x = r.x;
  out.y = r.y;
  out.z = r.z;
  out.lie = 0;
  out.slope = 0;
  out.yaw = lerpAngle(prev.yaw, slot.yaw, smooth(0, 1.1, tau));
  // Breathing, always there.
  out.stretch = 1 + Math.sin(t * 1.7 + r.seed) * 0.012;
  out.roll = 0;
  out.headPitch = 0;
  out.headYaw = Math.sin(t * 0.6 + r.seed) * 0.12;
  out.flipL = 0.08;
  out.flipR = 0.08;

  switch (slot.act) {
    case 'look':
      out.headYaw += env * slot.side * 1.0;
      out.headPitch += env * 0.15;
      break;
    case 'preen':
      // Beak into the feathers of one side, with small quick nibbles.
      out.headPitch -= env * 0.75;
      out.headYaw += env * (slot.side > 0 ? 1 : -1) * 0.85;
      out.headPitch += env * Math.sin(t * 9) * 0.06;
      if (slot.side > 0) out.flipL += env * 0.35;
      else out.flipR += env * 0.35;
      break;
    case 'turn': {
      // A few shuffling steps while it turns.
      const steps = smooth(0, 1.1, tau) * (1 - smooth(1.1, 1.5, tau));
      out.roll = Math.sin(tau * 13) * 0.1 * steps;
      break;
    }
    case 'display': {
      // Ecstatic display: chest up, beak to the sky, flippers out and beating.
      out.stretch += env * 0.09;
      out.headPitch += env * 1.15;
      const beat = 0.75 + Math.sin(t * 11) * 0.22;
      out.flipL += env * beat;
      out.flipR += env * beat;
      break;
    }
    case 'doze':
      // Hunched, head pulled in, very still.
      out.stretch -= env * 0.08;
      out.headPitch -= env * 0.3;
      out.headYaw *= 1 - env;
      break;
  }
  return out;
}

// ---- Travellers: the round trip to the sea ---------------------------------------------------

type Mode = 'walk' | 'flop' | 'slide' | 'standUp' | 'shake' | 'dive' | 'swim' | 'leap' | 'rest';

interface Sample {
  x: number;
  y: number;
  z: number;
  /** Cumulative distance along the path. */
  d: number;
}

interface Segment {
  mode: Mode;
  duration: number;
  path: Sample[];
  /** Heading at the start and the end (for the segments that do not move). */
  yaw0: number;
  yaw1: number;
  /** Pitch slope at the start and end of the segment so transitions stay continuous. */
  slope0: number;
  slope1: number;
}

export interface PenguinRoute {
  segments: Segment[];
  duration: number;
  heightAt: HeightAt;
}

const WALK_SPEED = 0.3;
const SLIDE_SPEED = 0.95;
const SWIM_SPEED = 1.0;
/** Height of the swimming penguin: the back just above the water. */
const SWIM_Y = -0.035;
/** Lateral clearance around the swim corridor to keep free of floating ice and icebergs. */
export const PENGUIN_SWIM_CLEARANCE = 0.6;

/** Extreme support points of the penguin body in tilt-local coordinates (feet at y = 0, beak +x). */
const BODY_SUPPORT_POINTS: readonly (readonly [number, number, number])[] = [
  [0.145, 0.001, 0.1275],
  [0.145, 0.001, -0.1275],
  [0.13, 0, 0.12],
  [0.13, 0, -0.12],
  [-0.03, 0, 0.12],
  [-0.03, 0, -0.12],
  [-0.23, 0.03, 0.0375],
  [-0.23, 0.03, -0.0375],
  [-0.125, 0.08, 0.13],
  [-0.125, 0.08, -0.13],
  [0.125, 0.09, 0.1225],
  [0.125, 0.09, -0.1225],
  [0.1275, 0.26, 0.1125],
  [0.1275, 0.26, -0.1125],
  [0.1275, 0.46, 0.1125],
  [0.1275, 0.46, -0.1125],
  [0.115, 0.52, 0.095],
  [0.115, 0.52, -0.095],
];

/** Extreme head points relative to PENGUIN_NECK (covering both Adélie and chinstrap). */
const HEAD_SUPPORT_POINTS: readonly (readonly [number, number, number])[] = [
  [0.115, 0.005, 0.098],
  [0.115, 0.005, -0.098],
  [0.115, 0.115, 0.098],
  [0.115, 0.115, -0.098],
  [0.1925, 0.051, 0],
  [0.08, 0.1725, 0],
];

/** Minimum pivot y so no support point of the rotated penguin sinks below `heightAt(wx, wz)`. */
function groundSupportY(heightAt: HeightAt, p: PenguinPose): number {
  const zRot = -p.lie * (Math.PI / 2) + p.slope;
  const cz = Math.cos(zRot);
  const sz = Math.sin(zRot);
  const cx = Math.cos(p.roll);
  const sx = Math.sin(p.roll);
  const cy = Math.cos(p.yaw);
  const sy = Math.sin(p.yaw);
  const chp = Math.cos(p.headPitch);
  const shp = Math.sin(p.headPitch);
  const chy = Math.cos(p.headYaw);
  const shy = Math.sin(p.headYaw);
  const [nx, ny, nz] = PENGUIN_NECK;

  let neededY = -Infinity;
  const checkPoint = (lx: number, ly: number, lz: number) => {
    const syLy = ly * p.stretch;
    const x1 = lx * cz - syLy * sz;
    const y1 = lx * sz + syLy * cz;
    const y2 = y1 * cx - lz * sx;
    const z2 = y1 * sx + lz * cx;
    const wx = p.x + (x1 * cy + z2 * sy) * PENGUIN_SCALE;
    const wz = p.z + (-x1 * sy + z2 * cy) * PENGUIN_SCALE;
    const dy = y2 * PENGUIN_SCALE;
    const req = heightAt(wx, wz) - dy;
    if (req > neededY) neededY = req;
  };

  for (const [lx, ly, lz] of BODY_SUPPORT_POINTS) checkPoint(lx, ly, lz);
  for (const [hx, hy, hz] of HEAD_SUPPORT_POINTS) {
    // neck rotation is YZX with rx = 0: Z (headPitch) then Y (headYaw)
    const rx = hx * chp - hy * shp;
    const ry = hx * shp + hy * chp;
    const wxHead = rx * chy + hz * shy + nx;
    const wyHead = ry + ny;
    const wzHead = -rx * shy + hz * chy + nz;
    checkPoint(wxHead, wyHead, wzHead);
  }
  return neededY;
}

/** Point at a given distance to the coast, moving from p along the coast-distance gradient. */
export function beachPoint(p: V2, target: number): V2 {
  let [x, z] = p;
  const h = 0.05;
  for (let i = 0; i < 30; i++) {
    const d = worldCoastDistance(x, z);
    if (Math.abs(d - target) < 1e-3) break;
    const gx = (worldCoastDistance(x + h, z) - worldCoastDistance(x - h, z)) / (2 * h);
    const gz = (worldCoastDistance(x, z + h) - worldCoastDistance(x, z - h)) / (2 * h);
    const g2 = gx * gx + gz * gz || 1;
    x += (gx * (target - d)) / g2;
    z += (gz * (target - d)) / g2;
  }
  return [x, z];
}

/** Smooth curve through the points (Catmull-Rom), sampled about every `step` units. */
function curve(points: readonly V2[], step: number): V2[] {
  const out: V2[] = [];
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
  out.push(points[points.length - 1]);
  return out;
}

/** Samples along the points with their height; `d` is the distance along the path in 3D. */
function toSamples(points: readonly V2[], yAt: (x: number, z: number) => number): Sample[] {
  const out: Sample[] = [];
  for (const [x, z] of points) {
    const y = yAt(x, z);
    const prev = out[out.length - 1];
    const d = prev ? prev.d + Math.hypot(x - prev.x, y - prev.y, z - prev.z) : 0;
    out.push({ x, y, z, d });
  }
  return out;
}

function endYaw(path: Sample[], atEnd: boolean): number {
  const n = path.length;
  const [a, b] = atEnd ? [path[Math.max(0, n - 3)], path[n - 1]] : [path[0], path[Math.min(n - 1, 2)]];
  return yawOf(b.x - a.x, b.z - a.z);
}

/**
 * The round trip of a travelling penguin. `heightAt` is the terrain height; `restSpot` is where
 * the trip starts and ends on the knoll top.
 */
export function buildPenguinRoute(heightAt: HeightAt): PenguinRoute {
  const ground = (x: number, z: number) => heightAt(x, z);
  const rest = knollPoint(0.2, 0.95);
  const rim = knollPoint(1.35, 0.15);
  const slideEnd = beachPoint(knollPoint(5, 0.3), 0.45);
  const edge = beachPoint(slideEnd, 0.15);
  const dive = beachPoint([edge[0] + S[0] * 0.4, edge[1] + S[1] * 0.4], -0.55);
  // Swim out into the bay, along the coast and back, about 3 units further along the shore.
  const out1: V2 = [dive[0] + S[0] * 2.4 + P[0] * 0.6, dive[1] + S[1] * 2.4 + P[1] * 0.6];
  const out2: V2 = [dive[0] + S[0] * 2.8 + P[0] * 3.6, dive[1] + S[1] * 2.8 + P[1] * 3.6];
  const back = beachPoint([dive[0] + P[0] * 5.2, dive[1] + P[1] * 5.2], -0.55);
  const landing = beachPoint([back[0] - S[0] * 0.9, back[1] - S[1] * 0.9], 0.55);
  const side = knollPoint(1.6, 1.6);

  const segs: Segment[] = [];
  const add = (mode: Mode, path: Sample[], duration: number) => {
    const moving = path.length > 1 && path[path.length - 1].d > 1e-6;
    const prevYaw = segs.length ? segs[segs.length - 1].yaw1 : 0;
    const yaw0 = moving ? endYaw(path, false) : prevYaw;
    const yaw1 = moving ? endYaw(path, true) : prevYaw;
    const total = path[path.length - 1].d;
    const slopeScale = mode === 'walk' ? 0.35 : 1;
    const slope0 =
      mode === 'leap' ? 0.55 : moving ? headingAt(path, 0).slope * slopeScale : 0;
    const slope1 =
      mode === 'dive' || mode === 'swim' ? 0 : moving ? headingAt(path, total).slope * slopeScale : 0;
    segs.push({ mode, path, duration, yaw0, yaw1, slope0, slope1 });
  };
  const still = (p: Sample): Sample[] => [{ ...p, d: 0 }];
  const last = () => {
    const path = segs[segs.length - 1].path;
    return path[path.length - 1];
  };

  const walk1 = toSamples(curve([rest, knollPoint(0.8, 0.7), rim], 0.15), ground);
  add('walk', walk1, walk1[walk1.length - 1].d / WALK_SPEED);
  add('flop', still(last()), 0.75);
  // The slide does not stop at the beach: it runs on to the water's edge and into the dive.
  const slide = toSamples(curve([rim, slideEnd, edge], 0.12), ground);
  add('slide', slide, slide[slide.length - 1].d / SLIDE_SPEED);
  const diveP = toSamples(curve([edge, dive], 0.1), (x, z) => Math.max(SWIM_Y, ground(x, z)));
  add('dive', diveP, 0.9);
  const swim = toSamples(curve([dive, out1, out2, back], 0.15), () => SWIM_Y);
  add('swim', swim, swim[swim.length - 1].d / SWIM_SPEED);
  const leap = toSamples(curve([back, landing], 0.08), (x, z) => Math.max(SWIM_Y, ground(x, z)));
  add('leap', leap, Math.max(0.9, leap[leap.length - 1].d / 1.4));
  add('standUp', still(last()), 0.8);
  add('shake', still(last()), 1.3);
  const walk3 = toSamples(curve([landing, side, rest], 0.15), ground);
  add('walk', walk3, walk3[walk3.length - 1].d / WALK_SPEED);
  // At rest the penguin turns back towards the rim, ready for the next trip.
  const restSeg = still(last());
  segs.push({
    mode: 'rest',
    path: restSeg,
    duration: 2,
    yaw0: segs[segs.length - 1].yaw1,
    yaw1: segs[0].yaw0,
    slope0: segs[segs.length - 1].slope1,
    slope1: segs[0].slope0,
  });

  // A segment that does not move turns in place from the previous heading to the next one.
  for (let k = 0; k < segs.length; k++) {
    const seg = segs[k];
    if (seg.path.length > 1) continue;
    const prev = segs[(k + segs.length - 1) % segs.length];
    const next = segs[(k + 1) % segs.length];
    seg.yaw0 = prev.yaw1;
    seg.yaw1 = next.path.length > 1 ? next.yaw0 : prev.yaw1;
    seg.slope0 = prev.slope1;
    seg.slope1 = seg.mode === 'flop' ? next.slope0 : 0;
  }

  return { segments: segs, duration: segs.reduce((a, s) => a + s.duration, 0), heightAt };
}

/** Water corridor (dive, swim, leap) in world [x, z] derived from the route as single source of truth. */
export function penguinSwimCorridor(route: PenguinRoute): readonly V2[] {
  return route.segments
    .filter((s) => s.mode === 'dive' || s.mode === 'swim' || s.mode === 'leap')
    .flatMap((s) => s.path.map((p) => [p.x, p.z] as const));
}

function sampleAt(path: Sample[], dist: number): Sample {
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

/** Heading and ground slope around a distance along the path (looks a little ahead). */
function headingAt(path: Sample[], dist: number): { yaw: number; slope: number } {
  const a = sampleAt(path, dist - 0.12);
  const b = sampleAt(path, dist + 0.12);
  const h = Math.hypot(b.x - a.x, b.z - a.z);
  return { yaw: yawOf(b.x - a.x, b.z - a.z), slope: Math.atan2(b.y - a.y, h || 1) };
}

/**
 * Pose of a travelling penguin at time t. `offset` shifts it sideways (world units) so several
 * penguins on the same route do not walk in exactly the same footprints.
 */
export function travellerPose(route: PenguinRoute, t: number, offset: number, out: PenguinPose): PenguinPose {
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

  out.roll = 0;
  out.stretch = 1;
  out.headPitch = 0;
  out.headYaw = 0;
  out.flipL = 0.1;
  out.flipR = 0.1;
  out.slope = 0;

  let dist = total * u;
  let lie = 0;
  let lift = 0;
  switch (seg.mode) {
    case 'walk': {
      // Waddle: rock side to side at each step, flippers held a little out for balance.
      const steps = (dist / 0.11) * Math.PI;
      out.roll = Math.sin(steps) * 0.13;
      lift = Math.abs(Math.sin(steps)) * 0.012;
      out.flipL = 0.3 + Math.sin(steps) * 0.08;
      out.flipR = 0.3 - Math.sin(steps) * 0.08;
      out.headYaw = Math.sin(steps * 0.5) * 0.05;
      break;
    }
    case 'flop':
      // Drops forward onto the belly, flippers opening to steer.
      lie = smooth(0.15, 0.85, u);
      out.slope = lerp(seg.slope0, seg.slope1, smooth(0.45, 1, u));
      out.flipL = out.flipR = 0.1 + smooth(0.2, 0.9, u) * 0.9;
      out.headPitch = smooth(0.4, 1, u) * 1.2;
      break;
    case 'slide': {
      // Accelerates down the slope and keeps its speed to the water; kicks with the feet at the start.
      dist = total * u ** 1.3;
      lie = 1;
      out.flipL = out.flipR = 1.0 + Math.sin(u * 20) * 0.08;
      out.headPitch = 1.2;
      out.roll = Math.sin(u * 9) * 0.05;
      break;
    }
    case 'standUp':
      lie = 1 - smooth(0.1, 0.9, u);
      out.slope = seg.slope0 * (1 - smooth(0, 0.7, u));
      out.flipL = out.flipR = 1.0 - smooth(0.2, 1, u) * 0.85;
      out.headPitch = (1 - smooth(0, 0.7, u)) * 1.2;
      break;
    case 'shake': {
      // Quick shake to get the water off, fading out.
      const fade = Math.sin(u * Math.PI);
      out.roll = Math.sin(u * 44) * 0.24 * fade;
      out.flipL = out.flipR = 0.2 + fade * (0.55 + Math.sin(u * 44) * 0.25);
      out.headYaw = Math.sin(u * 38 + 1) * 0.35 * fade;
      out.stretch = 1 + fade * 0.04;
      break;
    }
    case 'dive':
      // Already on its belly from the slide.
      lie = 1;
      out.flipL = out.flipR = 0.3 + smooth(0, 0.6, u) * 0.4;
      out.headPitch = smooth(0.3, 1, u) * 0.6;
      break;
    case 'swim': {
      // Fast and smooth, with two porpoising hops halfway.
      lie = 1;
      out.headPitch = 0.6;
      const hop = u > 0.35 && u < 0.65 ? Math.sin(((u - 0.35) / 0.15) * Math.PI) : 0;
      lift = Math.max(0, hop) * 0.32 + Math.sin(t * 3) * 0.01;
      out.slope = Math.cos(((u - 0.35) / 0.15) * Math.PI) * (u > 0.35 && u < 0.65 ? 0.5 : 0);
      out.flipL = out.flipR = 0.7 + Math.sin(t * 9) * 0.35;
      break;
    }
    case 'leap':
      // Shoots out of the water and lands flat on its belly along the beach slope.
      lie = 1;
      lift = Math.sin(u * Math.PI) * 0.55;
      out.slope = lerp(seg.slope0, seg.slope1, u) - Math.sin(u * Math.PI) * 0.35;
      out.flipL = out.flipR = 1.0;
      out.headPitch = 1.0;
      break;
    case 'rest':
      out.headYaw = Math.sin(u * Math.PI * 2) * 0.5;
      break;
  }

  const p = sampleAt(path, dist);
  const moving = total > 1e-6;
  const h = moving ? headingAt(path, dist) : null;
  out.yaw = h ? h.yaw : lerpAngle(seg.yaw0, seg.yaw1, smooth(0.1, 0.9, u));
  // Blend the heading into the next segment's so turns at joins never snap.
  const prev = route.segments[(i + route.segments.length - 1) % route.segments.length];
  const next = route.segments[(i + 1) % route.segments.length];
  const remaining = seg.duration - tt;
  if (remaining < 0.3 && moving) out.yaw = lerpAngle(out.yaw, next.yaw0, (0.3 - remaining) / 0.6);

  if (seg.mode === 'slide' && h) out.slope = h.slope;
  if (seg.mode === 'walk' && h) out.slope = h.slope * 0.35;
  if (seg.mode === 'dive' && h) {
    out.slope = lerp(prev.slope1, h.slope, smooth(0.05, 0.4, u)) * (1 - smooth(0.65, 1, u));
  }

  out.lie = lie;
  out.x = p.x + P[0] * offset;
  out.z = p.z + P[1] * offset;
  const swimPivotY = SWIM_Y + 0.125 * PENGUIN_SCALE;
  if (seg.mode === 'swim') {
    out.y = swimPivotY + lift;
  } else {
    const supportY = groundSupportY(route.heightAt, out);
    const baseY = seg.mode === 'dive' || seg.mode === 'leap' ? Math.max(swimPivotY, supportY) : supportY;
    out.y = baseY + lift;
  }
  return out;
}

/** Knoll-top spots for the 5 travellers when the bay is frozen (`seaIce >= 0.5`). */
const FROZEN_TRAVELLER_SPOTS: readonly V2[] = [
  [0.2, 0.95],
  [0.75, 0.85],
  [1.25, 0.45],
  [0.85, -0.15],
  [1.15, 1.2],
];

/** The penguins of the colony: residents on the nests, `travellers` doing the round trip. */
export function buildPenguinColony(heightAt: HeightAt): {
  residents: Resident[];
  route: PenguinRoute;
  travellers: readonly { delay: number; offset: number; species: PenguinSpecies }[];
  frozenTravellers: Resident[];
} {
  const residents = NEST_POSITIONS.map(([x, z], i) => ({
    x,
    y: heightAt(x, z) + 0.04,
    z,
    species: (i % 3 === 1 ? 'chinstrap' : 'adelie') as PenguinSpecies,
    seed: 4101 + i * 17,
    yaw: yawOf(x - CX, z - CZ) + (hash(i, 7) - 0.5) * 0.8,
  }));
  const route = buildPenguinRoute(heightAt);
  const n = 5;
  const travellers = Array.from({ length: n }, (_, i) => ({
    delay: (route.duration / n) * i,
    offset: (i % 3) * 0.14 - 0.14,
    species: (i % 2 === 0 ? 'chinstrap' : 'adelie') as PenguinSpecies,
  }));
  const frozenTravellers = FROZEN_TRAVELLER_SPOTS.map(([s, p], i) => {
    const [x, z] = knollPoint(s, p);
    return {
      x,
      y: heightAt(x, z),
      z,
      species: travellers[i].species,
      seed: 5201 + i * 23,
      yaw: yawOf(x - CX, z - CZ) + (hash(i, 19) - 0.5) * 0.6,
    };
  });
  return { residents, route, travellers, frozenTravellers };
}
