export type LabelSide = 'right' | 'left';

export interface LabelCandidate {
  id: string;
  left: number;
  top: number;
  title: string;
  sub: string;
  preferred: LabelSide;
  /** Always shown (on the preferred side if nothing fits). */
  force?: boolean;
}

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const MARKER_R = 22;
const GAP = 20;
const HEIGHT = 40;

/** Rough width of a `.mlabel`: 14px Fraunces bold title over a 12px sans subtitle. */
export function estimateLabelWidth(title: string, sub: string): number {
  return Math.max(title.length * 8.2, sub.length * 6.2) + 18;
}

function labelBox(c: LabelCandidate, side: LabelSide): Box {
  const w = estimateLabelWidth(c.title, c.sub);
  const x1 = side === 'right' ? c.left + GAP : c.left - GAP - w;
  return { x1, y1: c.top - HEIGHT / 2, x2: x1 + w, y2: c.top + HEIGHT / 2 };
}

const overlaps = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

/**
 * Simple collision pass: candidates are placed in priority order on their preferred
 * side, then the other side; a label that fits nowhere is hidden (null) unless forced.
 * Obstacles are every marker dot plus labels already placed.
 */
export function placeLabels(
  candidates: readonly LabelCandidate[],
  markers: readonly { left: number; top: number }[],
): Map<string, LabelSide | null> {
  const taken: Box[] = [];
  const result = new Map<string, LabelSide | null>();
  for (const c of candidates) {
    const obstacles = markers
      .filter((m) => m.left !== c.left || m.top !== c.top)
      .map((m) => ({ x1: m.left - MARKER_R, y1: m.top - MARKER_R, x2: m.left + MARKER_R, y2: m.top + MARKER_R }));
    const sides: LabelSide[] = c.preferred === 'right' ? ['right', 'left'] : ['left', 'right'];
    const side =
      sides.find((s) => {
        const box = labelBox(c, s);
        return !taken.some((t) => overlaps(t, box)) && !obstacles.some((o) => overlaps(o, box));
      }) ?? (c.force ? c.preferred : undefined);
    if (side) taken.push(labelBox(c, side));
    result.set(c.id, side ?? null);
  }
  return result;
}
