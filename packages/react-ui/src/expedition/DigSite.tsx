import { useRef, useState, type PointerEvent } from 'react';
import {
  BRUSH_INTERVAL, DIG_ROCK, DIG_ZONES, MAX_PUFFS, PASSES_PER_SPOT, PUFF_INTERVAL, SPOTS, spotAt,
} from '@antartida/core';

export interface DigSiteProps {
  active: boolean;
  prog: readonly number[];
  /** A card is open: brushing is paused. */
  paused: boolean;
  offset: string;
  onBrush: (spot: number) => void;
}

interface Puff { id: number; left: number; top: number }

export function DigSite({ active, prog, paused, offset, onBrush }: DigSiteProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const brushing = useRef(false);
  const last = useRef({ puff: 0, id: 0, spot: [0, 0, 0] });

  const brushAt = (e: PointerEvent) => {
    if (!active || paused || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const now = Date.now();
    const l = last.current;
    if (now - l.puff > PUFF_INTERVAL) {
      l.puff = now;
      const puff = { id: ++l.id, left: x, top: y };
      setPuffs((p) => p.concat(puff).slice(-MAX_PUFFS));
    }
    const hit = spotAt(x, y, r.width, r.height, prog);
    if (hit >= 0 && now - l.spot[hit] > BRUSH_INTERVAL) {
      l.spot[hit] = now;
      if (prog[hit] + 1 >= PASSES_PER_SPOT) brushing.current = false;
      onBrush(hit);
    }
  };

  const found = (i: number) => prog[i] >= PASSES_PER_SPOT;
  const cover = (i: number) => Math.max(0, 1 - prog[i] / PASSES_PER_SPOT);

  return (
    <div
      className={'dig' + (active ? ' on' : '')}
      ref={ref}
      style={{ transform: `translateX(-50%) ${offset}` }}
      onPointerDown={(e) => { if (!active) return; brushing.current = true; brushAt(e); }}
      onPointerMove={(e) => { if (brushing.current) brushAt(e); }}
      onPointerUp={() => { brushing.current = false; }}
      onPointerCancel={() => { brushing.current = false; }}
      onPointerLeave={() => { brushing.current = false; }}
    >
      <svg className="rock" viewBox="0 0 400 300" role="img" aria-label="Afloramiento rocoso con capas de sedimento">
        <g dangerouslySetInnerHTML={{ __html: DIG_ROCK }} />
        <g filter="url(#wc)" fill="#B89466">
          {DIG_ZONES.map((z, i) => <ellipse key={i} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} opacity={cover(i)} />)}
        </g>
        <g fill="#8F6C45" opacity="0.5">
          {DIG_ZONES.flatMap((z, i) => z.dots.map(([cx, cy, r], j) => <circle key={i + '-' + j} cx={cx} cy={cy} r={r} opacity={cover(i)} />))}
        </g>
        <g fill="none" stroke="#1F2A36" strokeWidth="1.4" strokeDasharray="3 5" filter="url(#ink)">
          {DIG_ZONES.map((z, i) => <ellipse key={i} cx={z.cx} cy={z.cy} rx={z.hx} ry={z.hy} opacity={active && !found(i) ? 0.75 : 0} />)}
        </g>
        <g fill="none" stroke="#C0862F" strokeWidth="3" filter="url(#ink)">
          {DIG_ZONES.map((z, i) => <ellipse key={i} cx={z.cx} cy={z.cy} rx={z.hx} ry={z.hy} opacity={found(i) ? 1 : 0} />)}
        </g>
        <g fontFamily="Caveat, cursive" fontSize="16" fill="#1F2A36">
          {DIG_ZONES.map((z, i) => <text key={i} x={z.label.x} y={z.label.y} opacity={found(i) ? 1 : 0}>{z.label.text}</text>)}
        </g>
      </svg>
      {puffs.map((p) => <span key={p.id} className="puff" style={{ left: p.left, top: p.top }} />)}
      {active && SPOTS.map((s, i) => (
        <button
          key={i}
          type="button"
          className="spot"
          style={{ left: s.x * 100 + '%', top: s.y * 100 + '%' }}
          aria-label={'Zona de excavación ' + (i + 1) + (found(i) ? ': resto encontrado' : ': limpiar sedimento, ' + prog[i] + ' de 4 pasadas')}
          onClick={(e) => { if (e.detail === 0) onBrush(i); }}
        />
      ))}
    </div>
  );
}
