import { beforeEach, describe, expect, it } from 'vitest';
import {
  EXPLORED_KEY, SPOTS, canAdvance, expeditionReducer as reduce, foundCount, initialExpedition,
  loadExplored, primaryLabel, saveExplored, spotAt, type ExpeditionAction, type ExpeditionState,
} from '../src/index.ts';

const run = (actions: ExpeditionAction[], from: ExpeditionState = initialExpedition) => actions.reduce(reduce, from);
const brush4 = (spot: number): ExpeditionAction[] => Array.from({ length: 4 }, () => ({ type: 'brush', spot }));

describe('dig', () => {
  const atDig = run([{ type: 'next' }]);

  it('opens the evidence card after exactly 4 passes', () => {
    const three = run(brush4(1).slice(0, 3), atDig);
    expect(three.card).toBe(-1);
    expect(three.prog[1]).toBe(3);
    const four = reduce(three, { type: 'brush', spot: 1 });
    expect(four.card).toBe(1);
    expect(foundCount(four)).toBe(1);
  });

  it('ignores passes while a card is open, on found spots and outside step 2', () => {
    const open = run(brush4(0), atDig);
    expect(reduce(open, { type: 'brush', spot: 2 })).toBe(open);
    const closed = reduce(open, { type: 'closeCard' });
    expect(reduce(closed, { type: 'brush', spot: 0 })).toBe(closed);
    expect(reduce(initialExpedition, { type: 'brush', spot: 0 })).toBe(initialExpedition);
  });

  it('hit-tests spots by container coordinates', () => {
    const w = 400, h = 300;
    expect(spotAt(SPOTS[2].x * w + 5, SPOTS[2].y * h - 5, w, h, [0, 0, 0])).toBe(2);
    expect(spotAt(5, 5, w, h, [0, 0, 0])).toBe(-1);
    expect(spotAt(SPOTS[2].x * w, SPOTS[2].y * h, w, h, [0, 0, 4])).toBe(-1);
  });
});

describe('steps', () => {
  it('walks from 1 to 5 only when each step is complete', () => {
    let s = initialExpedition;
    expect(primaryLabel(s)).toBe('Empezar a excavar');
    s = reduce(s, { type: 'next' });
    expect(s.step).toBe(2);
    expect(reduce(s, { type: 'next' })).toBe(s);
    expect(primaryLabel(s)).toBe('Encontrá los 3 restos (0/3)');

    for (const spot of [0, 1, 2]) s = reduce(run(brush4(spot), s), { type: 'cardAction' });
    expect(s.step).toBe(3);
    expect(canAdvance(s)).toBe(false);
    expect(primaryLabel(s)).toBe('Elegí una hipótesis');

    s = run([{ type: 'pick', option: 2 }, { type: 'next' }], s);
    expect(s.step).toBe(4);
    s = reduce(s, { type: 'next' });
    expect(s.step).toBe(5);
    expect(primaryLabel(s)).toBe('Volver al mapa');
    expect(reduce(s, { type: 'next' })).toBe(s);
  });

  it('goes back only from steps 2 to 4 and closes the card', () => {
    expect(reduce(initialExpedition, { type: 'back' })).toBe(initialExpedition);
    const s = run([{ type: 'next' }, ...brush4(0)]);
    expect(s.card).toBe(0);
    const back = reduce(s, { type: 'back' });
    expect(back.step).toBe(1);
    expect(back.card).toBe(-1);
  });

  it('toggles the knowledge panel and its level', () => {
    const s = run([{ type: 'togglePanel' }, { type: 'level', level: 2 }]);
    expect(s.panel).toBe(true);
    expect(s.level).toBe(2);
    expect(reduce(s, { type: 'closePanel' }).panel).toBe(false);
  });
});

describe('storage', () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    };
  });

  it('persists explored', () => {
    expect(loadExplored()).toBe(false);
    saveExplored(true);
    expect(mem.get(EXPLORED_KEY)).toBe('1');
    expect(loadExplored()).toBe(true);
  });

  it('survives a throwing localStorage', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(loadExplored()).toBe(false);
    expect(() => saveExplored(true)).not.toThrow();
  });
});
