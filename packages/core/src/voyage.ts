import { MILESTONES, TRANSPORTS, type Milestone, type TransportId, type TransportKind } from './content/ushuaia.ts';
import { fuegiaWorldHeight, inFuegia } from './fuegia.ts';
import { project, unproject } from './projection.ts';
import { worldHeight } from './relief.ts';
import { ROUTE_WAYPOINTS, routeAt } from './route.ts';
import { heightAt, type TerrainMesh } from './terrain.ts';

type Point = { x: number; y: number };

const RAD = Math.PI / 180;

const toVector = ([lon, lat]: readonly [number, number]) => {
  const cosLat = Math.cos(lat * RAD);
  return [cosLat * Math.cos(lon * RAD), cosLat * Math.sin(lon * RAD), Math.sin(lat * RAD)];
};

const FLIGHT_FROM = toVector(ROUTE_WAYPOINTS[0]);
const FLIGHT_TO = toVector(ROUTE_WAYPOINTS[ROUTE_WAYPOINTS.length - 1]);
const FLIGHT_ANGLE = Math.acos(FLIGHT_FROM.reduce((sum, v, i) => sum + v * FLIGHT_TO[i], 0));

/**
 * Flight path: the great circle between the two ends of the sea route. ILLUSTRATIVE, like the sea
 * route: the real track of the C-130 has no public source.
 */
function flightAt(t: number): Point {
  const a = Math.sin((1 - t) * FLIGHT_ANGLE) / Math.sin(FLIGHT_ANGLE);
  const b = Math.sin(t * FLIGHT_ANGLE) / Math.sin(FLIGHT_ANGLE);
  const [x, y, z] = FLIGHT_FROM.map((v, i) => a * v + b * FLIGHT_TO[i]);
  return project(Math.atan2(y, x) / RAD, Math.asin(z) / RAD);
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth01 = (v: number) => {
  const c = clamp01(v);
  return c * c * (3 - 2 * c);
};

/** Above every summit of the Tierra del Fuego relief (highest IBCSO land cell there: 2622 m). */
const FUEGIA_SUMMIT = fuegiaWorldHeight(2700);
/** The plane stays this many world units above the relief under its path. */
const FLIGHT_MARGIN = 1.5;
/** Trip fraction over which the plane leaves the ground and comes back to it (about 15 km). */
const FLIGHT_WINDOW = 0.012;
/** Trip fraction of relief looked at ahead and behind (about 37 km): the wider, the gentler the climbs. */
const FLIGHT_LOOK = 0.03;
/** Map units looked at to each side of the path: the drawn plane is much wider than a real one. */
const FLIGHT_SIDES = [-2.5, -1.25, 0, 1.25, 2.5];

/** Highest ground under and beside the flight path within FLIGHT_LOOK of `at`, in world units. */
function groundEnvelope(at: number, mesh?: TerrainMesh): number {
  let ground = 0;
  for (let k = -4; k <= 4; k++) {
    const u = clamp01(at + (k * FLIGHT_LOOK) / 4);
    const p = flightAt(u);
    const heading = voyageHeading('plane', u);
    for (const side of FLIGHT_SIDES) {
      const x = p.x - Math.sin(heading) * side;
      const y = p.y + Math.cos(heading) * side;
      ground = Math.max(ground, inFuegia(x, y) ? FUEGIA_SUMMIT : worldHeight(heightAt(x, y, mesh)));
    }
  }
  return ground;
}

/**
 * World height the plane must fly at, at fraction `t`, to pass over the relief instead of through
 * it: the highest ground under and beside the path nearby plus a margin. The envelope is averaged
 * over a span no wider than its own window, so the plane climbs and descends in a smooth line and
 * still never goes below the ground under it. It starts on the ground in Ushuaia and ends on the
 * Marambio plateau. ILLUSTRATIVE: not a real flight profile.
 */
export function flightClearance(t: number, mesh?: TerrainMesh): number {
  const at = clamp01(t);
  let ground = 0;
  for (let k = -3; k <= 3; k++) ground += groundEnvelope(clamp01(at + (k * FLIGHT_LOOK) / 3), mesh) / 7;
  const end = flightAt(1);
  const runway = at < 0.5 ? 0 : worldHeight(heightAt(end.x, end.y, mesh));
  const airborne = Math.min(smooth01(at / FLIGHT_WINDOW), smooth01((1 - at) / FLIGHT_WINDOW));
  return runway + (ground + FLIGHT_MARGIN - runway) * airborne;
}

/** Position in map space at fraction `t` of the trip (0 = Ushuaia, 1 = Marambio). */
export function voyageAt(kind: TransportKind, t: number): Point {
  return kind === 'plane' ? flightAt(clamp01(t)) : routeAt(t);
}

const PATH_SAMPLES = 400;
const pathLength = (kind: TransportKind) => {
  let total = 0;
  for (let i = 1; i <= PATH_SAMPLES; i++) {
    const a = voyageAt(kind, (i - 1) / PATH_SAMPLES);
    const b = voyageAt(kind, i / PATH_SAMPLES);
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
};
const LENGTHS: Record<TransportKind, number> = { ship: pathLength('ship'), plane: pathLength('plane') };

/** Length of the whole trip in map units. */
export const voyageLength = (kind: TransportKind) => LENGTHS[kind];

/** Direction of travel at `t` in map space, as an angle from +x towards +y (radians). */
export function voyageHeading(kind: TransportKind, t: number): number {
  const step = 0.002;
  const from = voyageAt(kind, Math.max(0, clamp01(t) - step));
  const to = voyageAt(kind, Math.min(1, clamp01(t) + step));
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export interface VoyageStop {
  milestone: Milestone;
  /** Fraction of the trip where the milestone opens. */
  t: number;
}

const STOP_SAMPLES = 800;

function buildStops(kind: TransportKind): VoyageStop[] {
  const samples = Array.from({ length: STOP_SAMPLES + 1 }, (_, i) => voyageAt(kind, i / STOP_SAMPLES));
  const stops = MILESTONES.filter((m) => m.kinds.includes(kind)).map((milestone) => {
    const { anchor } = milestone;
    let index: number;
    if ('lat' in anchor) {
      index = samples.findIndex((p) => unproject(p.x, p.y).lat <= anchor.lat);
      if (index < 0) index = STOP_SAMPLES;
    } else {
      const target = project(anchor[0], anchor[1]);
      index = samples.reduce((best, p, i) => (Math.hypot(p.x - target.x, p.y - target.y) < Math.hypot(samples[best].x - target.x, samples[best].y - target.y) ? i : best), 0);
    }
    return { milestone, t: index / STOP_SAMPLES };
  });
  return stops;
}

const STOPS: Record<TransportKind, VoyageStop[]> = { ship: buildStops('ship'), plane: buildStops('plane') };

/** Milestones a transport passes, in trip order, with the fraction where each one opens. */
export function voyageStops(kind: TransportKind): readonly VoyageStop[] {
  return STOPS[kind];
}

/** Seconds the whole trip takes while the user keeps advancing. Not a real duration. */
export const VOYAGE_SECONDS: Record<TransportKind, number> = { ship: 48, plane: 30 };

/**
 * Speed multipliers of "advance". Pressing again right after the previous press shifts up one
 * gear, for whoever is in a hurry; a slower press goes back to the first.
 */
export const VOYAGE_GEARS = [1, 2, 3.5] as const;
export const GEAR_TAP_MS = 450;

/** Gear (index into VOYAGE_GEARS) for a press that comes `msSincePress` after the previous one. */
export function nextGear(gear: number, msSincePress: number): number {
  return msSincePress <= GEAR_TAP_MS ? Math.min(VOYAGE_GEARS.length - 1, gear + 1) : 0;
}

export interface VoyageState {
  transport: TransportId;
  kind: TransportKind;
  /** Fraction of the trip travelled. */
  t: number;
  /** Stops already opened (index into voyageStops). */
  reached: number;
  /** Index of the stop whose card is open, or -1. The trip does not advance while a card is open. */
  card: number;
}

export function startVoyage(transport: TransportId): VoyageState {
  const kind = TRANSPORTS.find((v) => v.id === transport)!.kind;
  // The first milestone is the departure: its card opens right away.
  return { transport, kind, t: 0, reached: 1, card: 0 };
}

export const voyageArrived = (s: VoyageState) => s.reached >= voyageStops(s.kind).length;

/**
 * Advances the trip by `seconds` of the user holding "advance". Stops exactly at the next
 * milestone and opens its card, so the user sets the pace and never skips one.
 */
export function advanceVoyage(s: VoyageState, seconds: number): VoyageState {
  if (s.card >= 0 || voyageArrived(s) || seconds <= 0) return s;
  const next = voyageStops(s.kind)[s.reached];
  const t = s.t + seconds / VOYAGE_SECONDS[s.kind];
  if (t < next.t) return { ...s, t };
  return { ...s, t: next.t, reached: s.reached + 1, card: s.reached };
}

/** Jumps to the next milestone: the step-by-step trip for reduced motion and the 2D map. */
export function skipToNextStop(s: VoyageState): VoyageState {
  if (s.card >= 0 || voyageArrived(s)) return s;
  return { ...s, t: voyageStops(s.kind)[s.reached].t, reached: s.reached + 1, card: s.reached };
}

export function closeVoyageCard(s: VoyageState): VoyageState {
  return s.card < 0 ? s : { ...s, card: -1 };
}
