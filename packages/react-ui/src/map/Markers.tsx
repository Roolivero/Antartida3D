import type { CSSProperties } from 'react';
import type { Marker } from '@antartida/core';
import { Icon } from '../ui.tsx';

export function MarkerButton({ m, style, onPick }: { m: Marker; style: CSSProperties; onPick: (m: Marker) => void }) {
  return (
    <button type="button" className={m.cls} style={style} onClick={() => onPick(m)} aria-label={m.aria}>
      <span className="dot">
        {m.kind === 'cluster' && m.count}
        {m.kind === 'point' && m.pulse && <span className="pulse" />}
        {m.kind === 'point' && m.check && Icon.check}
      </span>
      {m.kind === 'point' && m.label && (
        <span className="mlabel"><strong>{m.label.title}</strong><span>{m.label.sub}</span></span>
      )}
    </button>
  );
}

export function Markers({ markers, className, onPick }: {
  markers: Marker[];
  className: string;
  onPick: (m: Marker) => void;
}) {
  return (
    <div className={className}>
      {markers.map((m) => <MarkerButton key={m.key} m={m} style={{ transform: `translate3d(${m.left}px, ${m.top}px, 0)` }} onPick={onPick} />)}
    </div>
  );
}
