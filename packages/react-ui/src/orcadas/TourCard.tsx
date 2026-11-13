import { useEffect, useRef } from 'react';
import { factById, type OrcadasTourStop } from '@antartida/core';
import { FactCard, FactSources } from './FactList.tsx';
import { KindChip } from './KindChip.tsx';

/**
 * The active stop of the guided tour: one short line, its kind and its source, with the full fact
 * folded under «Saber más». The panel's main button moves forward and «Atrás» moves back; with focus
 * inside the card, the arrow keys do the same.
 */
export function TourCard({
  stop,
  index,
  total,
  onPrev,
  onNext,
  onReachEnd,
}: {
  stop: OrcadasTourStop;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onReachEnd?: () => void;
}) {
  const fact = factById(stop.factId);
  // A new stop starts with «Saber más» folded. The element stays mounted so focus on it survives the arrow keys.
  const more = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (more.current) more.current.open = false;
  }, [stop.id]);

  if (!fact) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [role="slider"]')) return;

    if (e.key === 'ArrowRight') {
      if (index < total - 1) {
        e.preventDefault();
        onNext();
        if (index + 1 >= total - 1) {
          onReachEnd?.();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      if (index > 0) {
        e.preventDefault();
        onPrev();
      }
    }
  };

  return (
    <article className="orc-tour-card" onKeyDown={handleKeyDown}>
      <div className="orc-tour-meta">
        <KindChip kind={fact.kind} />
        {total > 1 && (
          <span className="orc-tour-count">
            {index + 1} de {total}
          </span>
        )}
      </div>

      <p className="orc-tour-line" aria-live="polite">
        {stop.line}
      </p>

      <FactSources fact={fact} />

      <details ref={more} className="orc-more orc-tour-more">
        <summary>Saber más</summary>
        <div className="orc-more-facts">
          <FactCard fact={fact} />
        </div>
      </details>
    </article>
  );
}
