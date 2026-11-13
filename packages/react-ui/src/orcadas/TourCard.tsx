import { useEffect, useRef } from 'react';
import { factById, stopMoreFacts, type OrcadasTourStop } from '@antartida/core';
import { FactCard, FactSources } from './FactList.tsx';
import { KindChip } from './KindChip.tsx';

/**
 * The active stop of the guided tour: one short line, its kind and its source, with what the line
 * leaves out folded under «Saber más» (nothing, when the line already says it all). The panel's main button moves forward and «Atrás» moves back; with focus
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
  const moreFacts = stopMoreFacts(stop);
  // A new stop starts with «Saber más» folded. The element stays mounted so focus on it survives the
  // arrow keys; when the new stop has nothing to fold, focus moves to the card instead of being lost.
  const card = useRef<HTMLElement>(null);
  const more = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const details = more.current;
    if (!details) return;
    details.open = false;
    if (details.hidden && details.contains(document.activeElement)) card.current?.focus();
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
    <article ref={card} className="orc-tour-card" tabIndex={-1} onKeyDown={handleKeyDown}>
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

      <details ref={more} className="orc-more orc-tour-more" hidden={moreFacts.length === 0}>
        <summary>Saber más</summary>
        <div className="orc-more-facts">
          {moreFacts.map((f) => (
            <FactCard key={f.id} fact={f} />
          ))}
        </div>
      </details>
    </article>
  );
}
