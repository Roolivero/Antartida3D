import { MALVINAS_FLAG, MAP_SIZE, toScreen, type Geometry, type View } from '@antartida/core';
import { MALVINAS_FLAG_BOXES } from '../map3d/malvinasFlagModel.ts';

/** Front elevation of the same Blender-authored model, anchored by the foot of its mast. */
export function MalvinasFlag2D({ geo, view, transition }: { geo: Geometry; view: View; transition: string }) {
  const { left, top } = toScreen(geo, view, MALVINAS_FLAG.x, MALVINAS_FLAG.y);
  const height = MALVINAS_FLAG.height * geo.S * view.k / MAP_SIZE;
  return (
    <svg
      role="img"
      aria-label={MALVINAS_FLAG.label}
      viewBox="-0.03 -1 0.75 1"
      width={height * 0.75}
      height={height}
      style={{ position: 'absolute', left: -height * 0.03, top: -height, overflow: 'visible', pointerEvents: 'none',
        transform: `translate3d(${left}px, ${top}px, 0)`, transition }}
    >
      <title>{MALVINAS_FLAG.description}</title>
      {MALVINAS_FLAG_BOXES.map(([x, y, , sx, sy, , color], i) => (
        <rect key={i} x={x - sx / 2} y={-y - sy / 2} width={sx} height={sy} fill={`#${color.toString(16).padStart(6, '0')}`} />
      ))}
    </svg>
  );
}
