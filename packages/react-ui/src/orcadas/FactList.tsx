import { sourcesOf, type OrcadasFact } from '@antartida/core';
import { KindChip } from './KindChip.tsx';

export function FactList({ facts }: { facts: readonly OrcadasFact[] }) {
  if (facts.length === 0) return null;
  return (
    <div className="orc-facts-list">
      {facts.map((fact) => {
        const srcs = sourcesOf(fact);
        return (
          <article key={fact.id} className="orc-fact-card">
            <div className="orc-fact-top">
              <KindChip kind={fact.kind} />
              {fact.title && <strong className="orc-fact-title">{fact.title}</strong>}
            </div>
            <p className="orc-fact-text">{fact.text}</p>
            {srcs.length > 0 && (
              <small className="orc-fact-src">
                Fuente: {srcs.map((s) => s.org).join(' · ')}
              </small>
            )}
          </article>
        );
      })}
    </div>
  );
}
