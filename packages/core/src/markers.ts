import { PTS, TIER, type MapPoint } from './content/points.ts';
import type { SeaPoint } from './content/sea.ts';
import { centroid, clusterPoints, separationZoom } from './clustering.ts';
import { labelSide, type LabelSide } from './labels.ts';
import { focusWorld, geometry, toScreen, type Size, type View } from './viewport.ts';

/**
 * What a press on a marker does. Labels are closed: a finger has no hover, so its first press
 * shows the label and the second one opens; a mouse or the keyboard already see the label
 * (hover, focus) and open at once.
 */
export function markerPress(shown: string | null, key: string, touch: boolean): 'show' | 'open' {
  return touch && shown !== key ? 'show' : 'open';
}

interface MarkerBase {
  key: string;
  /** Position in screen px for the current view. */
  left: number;
  top: number;
  /** Map space coordinates (0..1000). */
  x: number;
  y: number;
  cls: string;
  aria: string;
}

export interface PointMarker extends MarkerBase {
  kind: 'point';
  point: MapPoint;
  pulse: boolean;
  check: boolean;
  label: { title: string; sub: string; side: LabelSide } | null;
}

export interface SeaMarker extends MarkerBase {
  kind: 'sea';
  point: SeaPoint;
  label: { title: string; sub: string; side: LabelSide } | null;
}

export interface ClusterMarker extends MarkerBase {
  kind: 'cluster';
  count: number;
  /** View that separates the cluster when tapped. */
  target: View;
}

export type Marker = PointMarker | SeaMarker | ClusterMarker;

export type ScreenProjector = (x: number, y: number) => { left: number; top: number; visible?: boolean };

/** Everything a framework needs to render the marker overlay for a given view. */
export function buildMarkers(
  size: Size,
  view: View,
  /** Ids of the expeditions already completed. */
  explored: readonly string[],
  points: readonly MapPoint[] = PTS,
  toScreenFn?: ScreenProjector
): Marker[] {
  const geo = geometry(size);
  const projector: ScreenProjector = toScreenFn || ((x, y) => toScreen(geo, view, x, y));
  const markers: Marker[] = [];

  for (const group of clusterPoints(points, projector)) {
    if (group.length > 1) {
      const c = centroid(group);
      const pos = projector(c.x, c.y);
      if (pos.visible === false) continue;
      const nk = Math.max(view.k * 1.8, separationZoom(group, geo.S));
      markers.push({
        kind: 'cluster',
        key: 'c:' + group.map((g) => g.id).join(','),
        left: pos.left,
        top: pos.top,
        x: c.x,
        y: c.y,
        count: group.length,
        cls: 'mk cluster' + (group.some((g) => g.tier === 'A') ? ' has-a' : ''),
        aria: 'Grupo de ' + group.length + ' puntos: ' + group.map((g) => g.title).join(', ') + '. Tocá para acercar.',
        target: focusWorld(size, c.x, c.y, nk),
      });
      continue;
    }
    const p = group[0];
    const pos = projector(p.x, p.y);
    if (pos.visible === false) continue;
    const isA = p.tier === 'A';
    const done = isA && explored.includes(p.id);
    markers.push({
      kind: 'point',
      key: p.id,
      left: pos.left,
      top: pos.top,
      x: p.x,
      y: p.y,
      point: p,
      pulse: isA && !done,
      check: done,
      label: null,
      cls: 'mk t' + p.tier.toLowerCase() + (done ? ' done' : ''),
      aria: p.title + ', ' + p.place + '. ' +
        (isA ? (done ? 'Expedición explorada. Volver a recorrerla.' : 'Expedición disponible. Empezar.') : TIER[p.tier] + '. Ver ficha.'),
    });
  }

  // Every marker carries its label; the interface shows one at a time (markerPress).
  for (const m of markers) {
    if (m.kind !== 'point') continue;
    const sub = m.point.tier === 'A' ? (m.check ? 'Explorado · ' + m.point.place : m.point.place) : TIER[m.point.tier];
    const side = labelSide(m.left, m.point.title, sub, size.vw);
    m.label = { title: m.point.title, sub, side };
    if (side === 'left') m.cls += ' lbl-left';
  }
  return markers;
}
