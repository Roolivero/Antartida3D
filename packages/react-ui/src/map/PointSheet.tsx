import { lazy, Suspense, useRef } from 'react';
import { TIER, type MapPoint, type SeaPoint } from '@antartida/core';
import { useFocusReturn } from '../hooks.ts';
import { Icon } from '../ui.tsx';

// Its own chunk: it needs WebGL, which the 2D map does not.
const SeaPreview = lazy(() => import('../voyage/SeaPreview.tsx').then((m) => ({ default: m.SeaPreview })));

export function PointSheet({ point, onClose, fallbackFocus, preview = false, reduced = false }: {
  point: MapPoint | SeaPoint;
  onClose: () => void;
  fallbackFocus: () => HTMLElement | null;
  /** Show the block model of a sea point (needs WebGL). */
  preview?: boolean;
  reduced?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useFocusReturn(true, ref, 'button', fallbackFocus);

  const isSea = 'desc' in point;
  const tagLabel = isSea ? point.tag ?? 'Vida en el mar' : TIER[point.tier];
  const tagClass = isSea ? 'tag tsea' : 'tag t' + point.tier.toLowerCase();

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
          <span className={tagClass}>{tagLabel}</span>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar ficha">{Icon.close}</button>
        </div>
        <h2 id="sheet-title">{point.title}</h2>
        <p className="place">{point.place}</p>
        {isSea ? (
          <>
            {preview && point.targetSpecies && (
              <Suspense fallback={<div className="vpreview sea" />}>
                <SeaPreview species={point.targetSpecies} reduced={reduced} />
              </Suspense>
            )}
            <div className="q">
              <p>{point.desc}</p>
            </div>
            {point.sources && point.sources.length > 0 && (
              <div className="sheet-sources">
                <h3>Fuentes verificadas</h3>
                <ul>
                  {point.sources.map((s, idx) => (
                    <li key={idx}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.label}
                        </a>
                      ) : (
                        <span>{s.label}</span>
                      )}
                      <small>
                        {s.org}
                        {s.consulted ? ` · Consultado ${s.consulted}` : ''}
                      </small>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="anno" style={{ marginTop: 12 }}>
              Ilustración representativa para el cuaderno de campo antártico.
            </p>
          </>
        ) : (
          <>
            <div className="q">
              <p>{point.q}</p>
              <small>[Pregunta provisional] · [Contenido provisional]</small>
            </div>
            <p className="anno">Esta expedición todavía no está disponible. Se suma en una próxima etapa.</p>
          </>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={onClose}>Volver al mapa</button>
        </div>
      </section>
    </>
  );
}
