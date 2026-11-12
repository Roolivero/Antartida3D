import { useMemo, useRef } from 'react';
import {
  CHAPTERS,
  CHAPTER_NAMES,
  factsFor,
  sourcesOf,
  type Chapter,
  type OrcadasSource,
} from '@antartida/core';
import { useFocusReturn } from '../hooks.ts';
import { Icon } from '../ui.tsx';
import { KindChip } from './KindChip.tsx';

export function SourcesPanel({
  chapter,
  onClose,
  fallbackFocus,
}: {
  chapter: Chapter;
  onClose: () => void;
  fallbackFocus?: () => HTMLElement | null;
}) {
  const ref = useRef<HTMLElement>(null);
  useFocusReturn(true, ref, 'button', fallbackFocus);

  const sources = useMemo(() => {
    const seen = new Map<string, OrcadasSource>();
    let chapterFacts = factsFor(chapter);
    if (chapterFacts.length === 0) {
      chapterFacts = CHAPTERS.flatMap((c) => factsFor(c));
    }
    for (const fact of chapterFacts) {
      for (const src of sourcesOf(fact)) {
        if (!seen.has(src.id)) {
          seen.set(src.id, src);
        }
      }
    }
    if (seen.size === 0) {
      for (const c of CHAPTERS) {
        for (const fact of factsFor(c)) {
          for (const src of sourcesOf(fact)) {
            if (!seen.has(src.id)) {
              seen.set(src.id, src);
            }
          }
        }
      }
    }
    return Array.from(seen.values());
  }, [chapter]);

  return (
    <aside
      className="orc-sources"
      id="orc-sources-panel"
      role="dialog"
      aria-label="Fuentes"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="orc-sources-head">
        <div>
          <span className="orc-kicker hand">Registro documental</span>
          <h3>Fuentes · {CHAPTER_NAMES[chapter]}</h3>
        </div>
        <button
          type="button"
          className="iconbtn orc-close-btn"
          onClick={onClose}
          aria-label="Cerrar fuentes"
        >
          {Icon.close}
        </button>
      </div>

      <div className="orc-sources-chips" aria-label="Tipos de contenido">
        <KindChip kind="real" />
        <KindChip kind="sim" />
        <KindChip kind="recon" />
        <KindChip kind="calc" />
      </div>

      <ul className="orc-sources-list">
        {sources.map((src) => (
          <li key={src.id} className="orc-source-item">
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="orc-source-link"
            >
              {src.label}
            </a>
            <span className="orc-source-org">{src.org}</span>
            <small className="orc-source-meta">
              Consultado {src.consulted}
              {src.license ? ` · Licencia: ${src.license}` : ''}
            </small>
          </li>
        ))}
      </ul>
    </aside>
  );
}
