import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CHAPTERS,
  CHAPTER_NAMES,
  ORCADAS_FACTS,
  ORCADAS_SOURCES,
  factsFor,
  isPublishable,
  sourcesOf,
  type Chapter,
  type OrcadasSource,
} from '@antartida/core';
import { useFocusReturn } from '../hooks.ts';
import { Icon } from '../ui.tsx';
import { KindChip } from './KindChip.tsx';

export const OSM_SOURCE: OrcadasSource = {
  id: 'osm-site',
  label: 'OpenStreetMap: edificios y costa de la Base Orcadas',
  short: 'OpenStreetMap',
  org: 'colaboradores de OpenStreetMap',
  url: 'https://www.openstreetmap.org/#map=18/-60.7378/-44.7375',
  license: 'ODbL 1.0',
  consulted: '12 de noviembre de 2026',
  verified: true,
};

export function SourcesPanel({
  chapter,
  highlightSource,
  onClose,
  fallbackFocus,
}: {
  chapter: Chapter;
  highlightSource?: string | null;
  onClose: () => void;
  fallbackFocus?: () => HTMLElement | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const [showAll, setShowAll] = useState(false);
  useFocusReturn(true, ref, 'button', fallbackFocus);

  const chapterSources = useMemo(() => {
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

  const allExpeditionSources = useMemo(() => {
    const publishable = ORCADAS_FACTS.filter(isPublishable);
    const used = new Set(publishable.flatMap((f) => f.sourceIds));
    return ORCADAS_SOURCES.filter((s) => used.has(s.id));
  }, []);

  useEffect(() => {
    if (
      highlightSource &&
      highlightSource !== OSM_SOURCE.id &&
      !chapterSources.some((s) => s.id === highlightSource)
    ) {
      setShowAll(true);
    }
  }, [highlightSource, chapterSources]);

  const activeSources = showAll ? allExpeditionSources : chapterSources;

  useEffect(() => {
    if (!highlightSource) return;
    const el = ref.current?.querySelector<HTMLElement>(
      `[data-source-id="${highlightSource}"]`
    );
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightSource, activeSources]);

  return (
    <>
      <div
        className="orc-scrim"
        onClick={onClose}
        aria-hidden="true"
      />
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
            <span className="orc-kicker">Registro documental</span>
            <h3>
              {showAll
                ? 'Todas las fuentes de la expedición'
                : `Fuentes · ${CHAPTER_NAMES[chapter]}`}
            </h3>
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

        <dl className="orc-sources-defs" aria-label="Tipos de contenido">
          <div className="orc-sources-def">
            <dt><KindChip kind="real" /></dt>
            <dd>medido o documentado por la fuente citada.</dd>
          </div>
          <div className="orc-sources-def">
            <dt><KindChip kind="sim" /></dt>
            <dd>sorteado o ilustrado dentro de valores reales; no es una medición.</dd>
          </div>
          <div className="orc-sources-def">
            <dt><KindChip kind="recon" /></dt>
            <dd>dibujo o modelo hecho a partir de fuentes; no es una foto ni un plano.</dd>
          </div>
          <div className="orc-sources-def">
            <dt><KindChip kind="calc" /></dt>
            <dd>resultado de una cuenta sobre datos reales.</dd>
          </div>
        </dl>

        <ul className="orc-sources-list">
          {activeSources.map((src) => {
            const isHighlighted = highlightSource === src.id;
            return (
              <li key={src.id} className="orc-source-item">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="orc-source-card"
                  data-source-id={src.id}
                  data-highlight={isHighlighted ? true : undefined}
                  aria-current={isHighlighted ? 'true' : undefined}
                >
                  <strong className="orc-source-label">{src.label}</strong>
                  <span className="orc-source-org">{src.org}</span>
                  <small className="orc-source-meta">
                    Consultado {src.consulted}
                    {src.license ? ` · Licencia: ${src.license}` : ''}
                  </small>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="orc-sources-section">
          <span className="orc-kicker">Datos del mapa de la escena</span>
          <ul className="orc-sources-list">
            <li className="orc-source-item">
              <a
                href={OSM_SOURCE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="orc-source-card"
                data-source-id={OSM_SOURCE.id}
                data-highlight={highlightSource === OSM_SOURCE.id ? true : undefined}
                aria-current={highlightSource === OSM_SOURCE.id ? 'true' : undefined}
              >
                <strong className="orc-source-label">{OSM_SOURCE.label}</strong>
                <span className="orc-source-org">{OSM_SOURCE.org}</span>
                <small className="orc-source-meta">
                  Consultado {OSM_SOURCE.consulted}
                  {OSM_SOURCE.license ? ` · Licencia: ${OSM_SOURCE.license}` : ''}
                </small>
              </a>
            </li>
          </ul>
        </div>

        <div className="orc-sources-footer">
          <button
            type="button"
            className="btn ghost orc-sources-toggle-btn"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll
              ? 'Ver fuentes de este capítulo'
              : 'Ver todas las fuentes de la expedición'}
          </button>
        </div>
      </aside>
    </>
  );
}
