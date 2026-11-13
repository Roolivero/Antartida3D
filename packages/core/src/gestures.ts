type Point = { x: number; y: number };

/**
 * Two fingers on the 3D map, like in a globe app: spreading or pinching zooms, twisting turns the
 * camera, and dragging both up or down tilts it. The gesture picks one of two modes when the
 * fingers have moved enough to tell, and keeps it until a finger lifts: a pinch never tilts by
 * accident, and a tilt never zooms.
 */
export type TwoFingerMode = 'undecided' | 'tilt' | 'zoomTurn';

export interface TwoFingerState {
  mode: TwoFingerMode;
  /** Where the fingers were when the second one landed. */
  start: readonly [Point, Point];
  /** Where they were at the last move. */
  last: readonly [Point, Point];
}

export interface TwoFingerStep {
  state: TwoFingerState;
  /** Factor to multiply the scale of the view by: over 1 zooms in. */
  zoom: number;
  /** Radians the fingers twisted, clockwise on screen positive. */
  turn: number;
  /** Px both fingers moved down the screen. */
  tilt: number;
}

/** Px a finger moves before the gesture picks its mode. */
export const TWO_FINGER_START_PX = 10;
/** Dragging both fingers this fraction of the screen height tilts through the whole range. */
export const TILT_SCREEN_FRACTION = 0.4;

const distance = ([a, b]: readonly [Point, Point]) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = ([a, b]: readonly [Point, Point]) => Math.atan2(b.y - a.y, b.x - a.x);
/** Difference between two angles, in -π..π. */
const turnBetween = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export function startTwoFingers(a: Point, b: Point): TwoFingerState {
  return { mode: 'undecided', start: [a, b], last: [a, b] };
}

function pickMode(start: readonly [Point, Point], now: readonly [Point, Point]): TwoFingerMode {
  const moved = [0, 1].map((i) => ({ x: now[i].x - start[i].x, y: now[i].y - start[i].y }));
  const spread = Math.abs(distance(now) - distance(start));
  // Arc each finger travelled around the middle while twisting.
  const twist = (Math.abs(turnBetween(angle(start), angle(now))) * distance(start)) / 2;
  // Both fingers go the same way, up or down, more than they go sideways or apart.
  const together = Math.sign(moved[0].y) === Math.sign(moved[1].y);
  const down = Math.min(Math.abs(moved[0].y), Math.abs(moved[1].y));
  const sideways = Math.max(Math.abs(moved[0].x), Math.abs(moved[1].x));
  if (together && down >= TWO_FINGER_START_PX && down > sideways && down > spread && down > twist) return 'tilt';
  if (spread >= TWO_FINGER_START_PX || twist >= TWO_FINGER_START_PX) return 'zoomTurn';
  return 'undecided';
}

/** What the fingers did since the last move. Nothing happens until the gesture has picked its mode. */
export function moveTwoFingers(state: TwoFingerState, a: Point, b: Point): TwoFingerStep {
  const now = [a, b] as const;
  const mode = state.mode === 'undecided' ? pickMode(state.start, now) : state.mode;
  // The move that picks the mode counts from the start, so the first px are not lost.
  const from = state.mode === 'undecided' ? state.start : state.last;
  const next = { mode, start: state.start, last: now };
  if (mode === 'undecided') return { state: { ...next, last: state.last }, zoom: 1, turn: 0, tilt: 0 };
  if (mode === 'tilt') return { state: next, zoom: 1, turn: 0, tilt: (a.y - from[0].y + b.y - from[1].y) / 2 };
  return { state: next, zoom: distance(now) / Math.max(distance(from), 1), turn: turnBetween(angle(from), angle(now)), tilt: 0 };
}
