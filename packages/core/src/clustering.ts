export const CLUSTER_PX = 46;

export interface Positioned {
  x: number;
  y: number;
}

/**
 * Greedy clustering by on-screen distance: each unused point takes every later
 * unused point closer than `threshold` px at the current scale (px per map unit),
 * or using a custom screen projection function (x, y) => { left, top } (e.g. for 3D camera).
 */
export function clusterPoints<T extends Positioned>(
  points: readonly T[],
  scaleOrProjector: number | ((x: number, y: number) => { left: number; top: number }),
  threshold = CLUSTER_PX
): T[][] {
  const isProjector = typeof scaleOrProjector === 'function';
  const getScreenPos = isProjector
    ? scaleOrProjector
    : (x: number, y: number) => ({ left: x * scaleOrProjector, top: y * scaleOrProjector });

  const screenCoords = points.map((p) => getScreenPos(p.x, p.y));
  const used = points.map(() => false);
  const groups: T[][] = [];

  points.forEach((p, i) => {
    if (used[i]) return;
    used[i] = true;
    const group = [p];
    const sp = screenCoords[i];
    points.forEach((q, j) => {
      if (!used[j]) {
        const sq = screenCoords[j];
        if (Math.hypot(sp.left - sq.left, sp.top - sq.top) < threshold) {
          used[j] = true;
          group.push(q);
        }
      }
    });
    groups.push(group);
  });
  return groups;
}

export function centroid(group: readonly Positioned[]): Positioned {
  return {
    x: group.reduce((a, g) => a + g.x, 0) / group.length,
    y: group.reduce((a, g) => a + g.y, 0) / group.length,
  };
}

/** Zoom needed for a cluster's members to separate. */
export function separationZoom(group: readonly Positioned[], S: number, threshold = CLUSTER_PX): number {
  let minDist = Infinity;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const d = Math.hypot(group[i].x - group[j].x, group[i].y - group[j].y);
      if (d < minDist) minDist = d;
    }
  }
  return (threshold * 1.25 * 1000) / (S * Math.max(4, minDist));
}
