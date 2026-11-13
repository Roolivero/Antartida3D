export type LabelSide = 'right' | 'left';

/** Gap in px between the centre of a marker and its label (`.mlabel`). */
const GAP = 44;

/** Rough width of a `.mlabel`: 14px Fraunces bold title over a 12px sans subtitle. */
export function estimateLabelWidth(title: string, sub: string): number {
  return Math.max(title.length * 8.2, sub.length * 6.2) + 18;
}

/**
 * Side a label opens to: the right, unless it would run off the screen there and the left has
 * more room. Only one label shows at a time, over everything else, so nothing but the screen
 * edges is in its way.
 */
export function labelSide(left: number, title: string, sub: string, viewportWidth: number): LabelSide {
  const roomRight = viewportWidth - left;
  return roomRight >= estimateLabelWidth(title, sub) + GAP || roomRight >= left ? 'right' : 'left';
}
