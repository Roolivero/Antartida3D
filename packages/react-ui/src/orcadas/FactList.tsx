import { createContext, useContext } from 'react';
import { panelFacts, sourcesOf, type OrcadasFact } from '@antartida/core';
import { KindChip } from './KindChip.tsx';

export const SourceContext = createContext<((sourceId: string) => void) | null>(null);

export function FactSources({ fact }: { fact: OrcadasFact }) {
  const onOpenSource = useContext(SourceContext);
  const srcs = sourcesOf(fact);
  if (srcs.length === 0) return null;
  return (
    <div className="orc-fact-srcs">
      <span className="orc-src-prefix">Fuente:</span>
      {srcs.map((src) => (
        <button
          key={src.id}
          type="button"
          className="orc-src-link"
          onClick={() => onOpenSource?.(src.id)}
        >
          {src.short}
        </button>
      ))}
    </div>
  );
}

export function FactCard({ fact }: { fact: OrcadasFact }) {
  return (
    <article className="orc-fact-card">
      <div className="orc-fact-top">
        <KindChip kind={fact.kind} />
        {fact.title && <strong className="orc-fact-title">{fact.title}</strong>}
      </div>
      <p className="orc-fact-text">{fact.text}</p>
      <FactSources fact={fact} />
    </article>
  );
}

export function FactList({
  facts,
  fold = true,
  summary,
}: {
  facts: readonly OrcadasFact[];
  fold?: boolean;
  /** When set, all panel-filtered facts render inside a single folded <details className="orc-more">. */
  summary?: string;
}) {
  if (facts.length === 0) return null;

  if (!fold) {
    return (
      <div className="orc-facts-list">
        {facts.map((fact) => (
          <FactCard key={fact.id} fact={fact} />
        ))}
      </div>
    );
  }

  const { visible, more } = panelFacts(facts);
  if (visible.length === 0 && more.length === 0) return null;

  if (summary) {
    const all = [...visible, ...more];
    return (
      <details className="orc-more">
        <summary>{summary}</summary>
        <div className="orc-more-facts">
          {all.map((fact) => (
            <FactCard key={fact.id} fact={fact} />
          ))}
        </div>
      </details>
    );
  }

  return (
    <div className="orc-facts-list">
      {visible.map((fact) => (
        <FactCard key={fact.id} fact={fact} />
      ))}
      {more.length > 0 && (
        <details className="orc-more">
          <summary>Saber más ({more.length})</summary>
          <div className="orc-more-facts">
            {more.map((fact) => (
              <FactCard key={fact.id} fact={fact} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
