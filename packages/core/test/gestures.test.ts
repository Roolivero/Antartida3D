import { describe, expect, it } from 'vitest';
import { SHEET_SNAP_PX, moveTwoFingers, sheetAfterDrag, startTwoFingers, type TwoFingerState } from '../src/index.ts';

type Point = { x: number; y: number };
/** Runs a gesture through its moves and adds up what it did. */
function run(a: Point, b: Point, moves: readonly (readonly [Point, Point])[]) {
  let state: TwoFingerState = startTwoFingers(a, b);
  const total = { zoom: 1, turn: 0, tilt: 0 };
  for (const [p, q] of moves) {
    const step = moveTwoFingers(state, p, q);
    state = step.state;
    total.zoom *= step.zoom;
    total.turn += step.turn;
    total.tilt += step.tilt;
  }
  return { ...total, mode: state.mode };
}
const steps = (n: number, at: (i: number) => readonly [Point, Point]) => Array.from({ length: n }, (_, i) => at(i + 1));

describe('two fingers on the 3D map', () => {
  const a = { x: 150, y: 400 };
  const b = { x: 250, y: 400 };

  it('does nothing until the fingers have moved enough to tell the gesture', () => {
    const still = run(a, b, [[{ x: 152, y: 401 }, { x: 251, y: 399 }]]);
    expect(still).toEqual({ zoom: 1, turn: 0, tilt: 0, mode: 'undecided' });
  });

  it('zooms in when the fingers spread and out when they pinch, without tilting', () => {
    const spread = run(a, b, steps(10, (i) => [{ x: 150 - i * 5, y: 400 }, { x: 250 + i * 5, y: 400 }]));
    expect(spread.mode).toBe('zoomTurn');
    expect(spread.zoom).toBeCloseTo(2, 6); // 100 px apart to 200 px
    expect(spread.tilt).toBe(0);
    const pinch = run(a, b, steps(10, (i) => [{ x: 150 + i * 2.5, y: 400 }, { x: 250 - i * 2.5, y: 400 }]));
    expect(pinch.zoom).toBeCloseTo(0.5, 6);
  });

  it('turns by the angle the fingers twist, clockwise on screen positive', () => {
    const mid = { x: 200, y: 400 };
    const at = (deg: number) => {
      const r = (deg * Math.PI) / 180;
      return [
        { x: mid.x - 50 * Math.cos(r), y: mid.y - 50 * Math.sin(r) },
        { x: mid.x + 50 * Math.cos(r), y: mid.y + 50 * Math.sin(r) },
      ] as const;
    };
    const twist = run(a, b, steps(9, (i) => at(i * 5)));
    expect(twist.mode).toBe('zoomTurn');
    expect(twist.turn).toBeCloseTo(Math.PI / 4, 6);
    expect(twist.zoom).toBeCloseTo(1, 6);
    expect(run(a, b, steps(9, (i) => at(-i * 5))).turn).toBeCloseTo(-Math.PI / 4, 6);
  });

  it('tilts when both fingers go up or down together, without zooming or turning', () => {
    const up = run(a, b, steps(10, (i) => [{ x: 150, y: 400 - i * 6 }, { x: 251, y: 400 - i * 6 }]));
    expect(up.mode).toBe('tilt');
    expect(up.tilt).toBeCloseTo(-60, 6);
    expect(up.zoom).toBe(1);
    expect(up.turn).toBe(0);
  });

  it('keeps its mode until a finger lifts: a pinch that drifts does not tilt', () => {
    const moves = [
      ...steps(5, (i) => [{ x: 150 - i * 6, y: 400 }, { x: 250 + i * 6, y: 400 }] as const),
      ...steps(5, (i) => [{ x: 120, y: 400 + i * 10 }, { x: 280, y: 400 + i * 10 }] as const),
    ];
    const drifted = run(a, b, moves);
    expect(drifted.mode).toBe('zoomTurn');
    expect(drifted.tilt).toBe(0);
  });

  it('does not take two fingers moving sideways together for a tilt', () => {
    const sideways = run(a, b, steps(10, (i) => [{ x: 150 + i * 6, y: 400 + i }, { x: 250 + i * 6, y: 400 + i }]));
    expect(sideways.mode).not.toBe('tilt');
    expect(sideways.tilt).toBe(0);
  });
});

describe('bottom sheet handle', () => {
  it('switches between small and tall on a tap', () => {
    expect(sheetAfterDrag('small', 0)).toBe('tall');
    expect(sheetAfterDrag('tall', 3)).toBe('small');
  });

  it('goes one step the way it is dragged, past the snap distance', () => {
    expect(sheetAfterDrag('small', SHEET_SNAP_PX)).toBe('tall');
    expect(sheetAfterDrag('tall', -SHEET_SNAP_PX)).toBe('small');
    // Dragging a tall sheet further up changes nothing.
    expect(sheetAfterDrag('tall', 200)).toBe('tall');
  });

  it('closes when a small sheet is dragged down', () => {
    expect(sheetAfterDrag('small', -SHEET_SNAP_PX)).toBe('closed');
    // A tall one only comes down to small, however far it is dragged.
    expect(sheetAfterDrag('tall', -600)).toBe('small');
  });

  it('falls back to the size it had after a short drag', () => {
    expect(sheetAfterDrag('small', SHEET_SNAP_PX - 1)).toBe('small');
    expect(sheetAfterDrag('small', -(SHEET_SNAP_PX - 1))).toBe('small');
    expect(sheetAfterDrag('tall', -(SHEET_SNAP_PX - 1))).toBe('tall');
  });
});
