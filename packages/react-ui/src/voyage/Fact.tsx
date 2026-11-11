import { VOYAGE_SOURCES, voyageSourceNumber, type VoyageFact, type VoyageSourceCode } from '@antartida/core';

/** Opens the sources page at one source. */
export type OpenSources = (code: VoyageSourceCode) => void;

/** One statement, followed by the numbers of its sources. */
export function Fact({ fact, onSource }: { fact: VoyageFact; onSource: OpenSources }) {
  return (
    <li className="vfact">
      <span>
        {fact.text}
        {fact.sources.map((code) => (
          <button
            key={code}
            type="button"
            className="vref"
            onClick={() => onSource(code)}
            aria-label={`Fuente ${voyageSourceNumber(code)}: ${VOYAGE_SOURCES[code].org}`}
          >
            [{voyageSourceNumber(code)}]
          </button>
        ))}
      </span>
    </li>
  );
}
