import { useMemo, useRef, type RefObject } from 'react';
import {
  CHAPTERS,
  factsFor,
  sourcesOf,
  type Chapter,
  type OrcadasFact,
} from '@antartida/core';
import { useFocusReturn } from '../hooks.ts';
import { Icon } from '../ui.tsx';
import { KindChip } from './KindChip.tsx';

export type HotspotId =
  | 'overview'
  | 'screen'
  | 'mast'
  | 'house'
  | 'bay'
  | 'colony'
  | 'flag';

export interface CameraPose {
  pos: readonly [number, number, number];
  target: readonly [number, number, number];
}

export interface HotspotDef {
  id: Exclude<HotspotId, 'overview'>;
  label: string;
  shortLabel: string;
  subtitle: string;
  worldPos: readonly [number, number, number];
  pose: CameraPose;
  fallbackPct: readonly [number, number];
  chapters: readonly Chapter[];
  keywords: readonly string[];
}

export const OVERVIEW_POSE_DESKTOP: CameraPose = {
  pos: [-6.0, 14.8, 31.5],
  target: [4.6, 1.4, 1.2],
};

export const OVERVIEW_POSE_MOBILE: CameraPose = {
  pos: [-7.5, 18.2, 36.5],
  target: [1.5, 0.0, 2.8],
};

export const HOTSPOTS: readonly HotspotDef[] = [
  {
    id: 'screen',
    label: 'Abrigo meteorológico',
    shortLabel: 'Abrigo',
    subtitle: 'Termómetros e higrómetro al resguardo del sol y del viento',
    worldPos: [-4.5, 2.4, 2.6],
    pose: {
      pos: [-9.2, 4.6, 8.8],
      target: [-4.0, 1.8, 2.2],
    },
    fallbackPct: [33, 52],
    chapters: ['observation', 'century'],
    keywords: ['termómetro', 'abrigo', 'temperatura', 'observación', 'presión'],
  },
  {
    id: 'mast',
    label: 'Mástil de viento',
    shortLabel: 'Anemómetro',
    subtitle: 'Veleta de rumbo y cazoletas que giran con las ráfagas del mar de Scotia',
    worldPos: [-6.8, 5.4, -1.2],
    pose: {
      pos: [-13.2, 6.4, 5.2],
      target: [-6.8, 3.5, -1.2],
    },
    fallbackPct: [23, 38],
    chapters: ['observation', 'arrival'],
    keywords: ['viento', 'anemómetro', 'temporal', 'nubes', 'observación'],
  },
  {
    id: 'house',
    label: 'Casas históricas',
    shortLabel: 'Estación',
    subtitle: 'De la pirca de piedra de Omond House a Casa Moneta y los módulos actuales',
    worldPos: [3.8, 3.4, -1.4],
    pose: {
      pos: [9.5, 6.0, 8.8],
      target: [2.8, 2.1, -1.2],
    },
    fallbackPct: [55, 43],
    chapters: ['eras', 'arrival'],
    keywords: ['omond', 'moneta', 'bruce', 'scotia', '1903', '1904', '1905', 'radio'],
  },
  {
    id: 'flag',
    label: 'Mástil y pabellón',
    shortLabel: 'Pabellón',
    subtitle: 'Permanencia ininterrumpida en el istmo de la isla Laurie desde 1904',
    worldPos: [-0.4, 6.2, 3.8],
    pose: {
      pos: [4.8, 5.8, 11.2],
      target: [0.2, 3.6, 3.6],
    },
    fallbackPct: [45, 37],
    chapters: ['arrival', 'eras'],
    keywords: ['1904', 'bandera', 'correo', 'acuña', 'soberanía', 'orcadas'],
  },
  {
    id: 'bay',
    label: 'Bahía Scotia y hielo marino',
    shortLabel: 'Bahía Scotia',
    subtitle: 'Aguas que se cierran de hielo en invierno y se abren en el deshielo austral',
    worldPos: [-2.4, 1.2, 12.5],
    pose: {
      pos: [-10.5, 7.8, 24.5],
      target: [-1.5, 0.8, 11.0],
    },
    fallbackPct: [30, 66],
    chapters: ['year', 'century'],
    keywords: ['hielo', 'bahía', 'mar', 'invierno', 'foca', 'weddell'],
  },
  {
    id: 'colony',
    label: 'Pingüinera y fauna',
    shortLabel: 'Pingüinera',
    subtitle: 'Colonias de pingüinos adelia y barbijo en las laderas rocosas de Laurie',
    worldPos: [8.2, 2.4, 5.4],
    pose: {
      pos: [3.8, 6.0, 16.0],
      target: [9.5, 2.2, 5.6],
    },
    fallbackPct: [74, 46],
    chapters: ['year', 'arrival'],
    keywords: ['pingüino', 'adelia', 'barbijo', 'fauna', 'foca', 'petrel'],
  },
];

export function poseForHotspot(focus: HotspotId | null, mobile: boolean): CameraPose {
  if (!focus || focus === 'overview') {
    return mobile ? OVERVIEW_POSE_MOBILE : OVERVIEW_POSE_DESKTOP;
  }
  const found = HOTSPOTS.find((h) => h.id === focus);
  return found ? found.pose : mobile ? OVERVIEW_POSE_MOBILE : OVERVIEW_POSE_DESKTOP;
}

function factsForHotspot(spot: HotspotDef): OrcadasFact[] {
  const allPublishable = CHAPTERS.flatMap((c) => factsFor(c));
  const keywordMatches = allPublishable.filter((f) => {
    const hay = `${f.title ?? ''} ${f.text}`.toLowerCase();
    return spot.keywords.some((kw) => hay.includes(kw));
  });
  if (keywordMatches.length > 0) {
    return keywordMatches.slice(0, 2);
  }
  const chapterMatches = spot.chapters.flatMap((c) => factsFor(c));
  if (chapterMatches.length > 0) {
    return chapterMatches.slice(0, 2);
  }
  return allPublishable.slice(0, 2);
}

export function Hotspots({
  overlayRef,
  activeSpot,
  openCardSpot,
  onSelectSpot,
  onCloseCard,
}: {
  overlayRef: RefObject<HTMLDivElement | null>;
  activeSpot: HotspotId | null;
  openCardSpot: Exclude<HotspotId, 'overview'> | null;
  onSelectSpot: (id: Exclude<HotspotId, 'overview'>) => void;
  onCloseCard: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const selectedDef = useMemo(
    () => (openCardSpot ? HOTSPOTS.find((h) => h.id === openCardSpot) ?? null : null),
    [openCardSpot]
  );
  const relatedFacts = useMemo(
    () => (selectedDef ? factsForHotspot(selectedDef) : []),
    [selectedDef]
  );

  useFocusReturn(
    Boolean(selectedDef),
    cardRef,
    'button',
    () =>
      overlayRef.current?.querySelector<HTMLElement>(
        `[data-hotspot="${openCardSpot ?? ''}"]`
      ) ?? null
  );

  return (
    <>
      <div
        className="orc-hotspots"
        ref={overlayRef}
         role="group"
        aria-label="Puntos de interés en la estación"
      >
        {HOTSPOTS.map((spot) => {
          const isSelected = activeSpot === spot.id;
          return (
            <button
              key={spot.id}
              type="button"
              data-hotspot={spot.id}
              className={`orc-hs${isSelected ? ' is-active' : ''}`}
              style={{
                left: `${spot.fallbackPct[0]}%`,
                top: `${spot.fallbackPct[1]}%`,
              }}
              aria-label={`Punto de interés: ${spot.label}`}
              aria-pressed={isSelected}
              onClick={() => onSelectSpot(spot.id)}
            >
              <span className="orc-hs-ring" aria-hidden="true" />
              <span className="orc-hs-dot" aria-hidden="true" />
              <span className="orc-hs-lbl hand">{spot.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {selectedDef && (
        <section
          className="orc-spot-card"
          role="dialog"
          aria-label={selectedDef.label}
          ref={cardRef}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              onCloseCard();
            }
          }}
        >
          <div className="orc-spot-head">
            <div>
              <span className="orc-kicker hand">Punto de exploración</span>
              <h3>{selectedDef.label}</h3>
            </div>
            <button
              type="button"
              className="iconbtn orc-close-btn"
              onClick={onCloseCard}
              aria-label="Cerrar tarjeta de punto"
            >
              {Icon.close}
            </button>
          </div>
          <p className="orc-spot-sub">{selectedDef.subtitle}</p>
          <div className="orc-spot-facts">
            {relatedFacts.map((fact) => {
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
                      Fuente: {srcs.map((s) => s.org).join(', ')}
                    </small>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
