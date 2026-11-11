import { useRef } from 'react';
import { TIER, type MapPoint } from '@antartida/core';
import { useFocusReturn } from '../hooks.ts';
import { Icon } from '../ui.tsx';

export function PointSheet({ point, onClose, fallbackFocus }: {
  point: MapPoint;
  onClose: () => void;
  fallbackFocus: () => HTMLElement | null;
}) {
  const ref = useRef<HTMLElement>(null);
  useFocusReturn(true, ref, 'button', fallbackFocus);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        ref={ref}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="grab" />
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={'tag t' + point.tier.toLowerCase()}>{TIER[point.tier]}</span>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar ficha">{Icon.close}</button>
        </div>
        <h2 id="sheet-title">{point.title}</h2>
        <p className="place">{point.place}</p>
        <div className="q">
          <p>{point.q}</p>
          <small>[Pregunta provisional] · [Contenido provisional]</small>
        </div>
        <p className="anno">Esta expedición todavía no está disponible. Se suma en una próxima etapa.</p>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={onClose}>Volver al mapa</button>
        </div>
      </section>
    </>
  );
}
