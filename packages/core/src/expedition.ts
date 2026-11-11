import { SPOTS } from './content/fossils.ts';

export type Step = 1 | 2 | 3 | 4 | 5;

export const PASSES_PER_SPOT = 4;
export const SPOT_COUNT = SPOTS.length;

export interface ExpeditionState {
  step: Step;
  /** Brush passes per dig spot (0..4). */
  prog: readonly number[];
  /** Index of the open evidence card, or -1. */
  card: number;
  answer: number;
  panel: boolean;
  level: number;
}

export type ExpeditionAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'brush'; spot: number }
  | { type: 'closeCard' }
  | { type: 'cardAction' }
  | { type: 'pick'; option: number }
  | { type: 'togglePanel' }
  | { type: 'closePanel' }
  | { type: 'level'; level: number };

export const initialExpedition: ExpeditionState = {
  step: 1, prog: [0, 0, 0], card: -1, answer: -1, panel: false, level: 0,
};

export const foundCount = (s: ExpeditionState) => s.prog.filter((v) => v >= PASSES_PER_SPOT).length;
export const isFound = (s: ExpeditionState, spot: number) => s.prog[spot] >= PASSES_PER_SPOT;

/** Whether the primary button advances; step 5 hands control back to the map. */
export function canAdvance(s: ExpeditionState): boolean {
  if (s.step === 2) return foundCount(s) >= SPOT_COUNT;
  if (s.step === 3) return s.answer >= 0;
  return s.step < 5;
}

export function primaryLabel(s: ExpeditionState): string {
  const found = foundCount(s);
  switch (s.step) {
    case 1: return 'Empezar a excavar';
    case 2: return found < SPOT_COUNT ? `Encontrá los 3 restos (${found}/3)` : 'Comparar evidencias';
    case 3: return s.answer < 0 ? 'Elegí una hipótesis' : 'Ver la reconstrucción';
    case 4: return 'Terminar expedición';
    case 5: return 'Volver al mapa';
  }
}

export const cardButtonLabel = (s: ExpeditionState) =>
  foundCount(s) >= SPOT_COUNT ? 'Comparar evidencias' : 'Seguir excavando';

export function expeditionReducer(s: ExpeditionState, a: ExpeditionAction): ExpeditionState {
  switch (a.type) {
    case 'next':
      return canAdvance(s) ? { ...s, step: (s.step + 1) as Step } : s;
    case 'back':
      return s.step >= 2 && s.step <= 4 ? { ...s, step: (s.step - 1) as Step, card: -1 } : s;
    case 'brush': {
      if (s.step !== 2 || s.card >= 0 || isFound(s, a.spot)) return s;
      const prog = s.prog.slice();
      prog[a.spot] += 1;
      return { ...s, prog, card: prog[a.spot] >= PASSES_PER_SPOT ? a.spot : s.card };
    }
    case 'closeCard':
      return { ...s, card: -1 };
    case 'cardAction':
      return foundCount(s) >= SPOT_COUNT ? { ...s, card: -1, step: 3 } : { ...s, card: -1 };
    case 'pick':
      return { ...s, answer: a.option };
    case 'togglePanel':
      return { ...s, panel: !s.panel };
    case 'closePanel':
      return { ...s, panel: false };
    case 'level':
      return { ...s, level: a.level };
  }
}

/**
 * Hit-test for brushing, by coordinates on the dig container (not by element),
 * so touch drags work. Returns the spot under (x, y) that still needs passes, or -1.
 */
export function spotAt(x: number, y: number, width: number, height: number, prog: readonly number[]): number {
  const rad = Math.max(34, width * 0.12);
  let hit = -1;
  SPOTS.forEach((s, i) => {
    if (Math.hypot(x - s.x * width, y - s.y * height) < rad && prog[i] < PASSES_PER_SPOT) hit = i;
  });
  return hit;
}

/** Minimum ms between passes on the same spot while dragging. */
export const BRUSH_INTERVAL = 120;
/** Minimum ms between dust puffs. */
export const PUFF_INTERVAL = 70;
export const MAX_PUFFS = 8;
