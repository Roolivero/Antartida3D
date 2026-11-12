import { useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  HOTSPOT_BUILDING,
  hotspotFacts,
  layoutOf,
  sourcesOf,
  type BuildingId,
  type Chapter,
  type OrcadasHotspotId,
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
}

/**
 * Low, near-horizontal overview: the sky, the sea horizon and the glaciers stay in frame.
 * On desktop the target sits right of the station so it clears the side panel.
 */
export const OVERVIEW_POSE_DESKTOP: CameraPose = {
  pos: [-10.5, 7.6, 25],
  target: [4.2, 2.3, -1],
};

/** On a phone the target sits below the ground so the station lands above the bottom sheet. */
export const OVERVIEW_POSE_MOBILE: CameraPose = {
  pos: [-12, 11.5, 41],
  target: [0.6, -5.2, 0],
};

/** How far a hotspot framing pulls back on a phone, and how much its target drops (per unit of distance). */
const MOBILE_PULL_BACK = 1.9;
const MOBILE_TARGET_DROP = 0.16;

/** A portrait screen is narrow and its lower half is covered: pull back and aim lower. */
function mobilePose(pose: CameraPose): CameraPose {
  const [px, py, pz] = pose.pos;
  const [tx, ty, tz] = pose.target;
  const dx = (px - tx) * MOBILE_PULL_BACK, dy = (py - ty) * MOBILE_PULL_BACK, dz = (pz - tz) * MOBILE_PULL_BACK;
  const drop = Math.hypot(dx, dy, dz) * MOBILE_TARGET_DROP;
  return { pos: [tx + dx, ty + dy, tz + dz], target: [tx, ty - drop, tz] };
}

const screenLayout = layoutOf('screen');
const mastLayout = layoutOf('windMast');
const houseLayout = layoutOf('moneta');
const flagLayout = layoutOf('flag');

export const HOTSPOTS: readonly HotspotDef[] = [
  {
    id: 'screen',
    label: 'Abrigo meteorológico',
    shortLabel: 'Abrigo',
    subtitle: 'Termómetros e higrómetro al resguardo del sol y del viento',
    worldPos: [
      screenLayout.position[0],
      screenLayout.position[1] + 0.95,
      screenLayout.position[2] + 0.4,
    ],
    pose: {
      pos: [-9.2, 4.6, 8.8],
      target: [-4.0, 1.8, 2.2],
    },
    fallbackPct: [33, 52],
    chapters: ['observation', 'century'],
  },
  {
    id: 'mast',
    label: 'Mástil de viento',
    shortLabel: 'Anemómetro',
    subtitle: 'Veleta de rumbo y cazoletas que giran con las ráfagas del mar de Scotia',
    worldPos: [
      mastLayout.position[0] + 0.4,
      mastLayout.position[1] + 3.95,
      mastLayout.position[2],
    ],
    pose: {
      pos: [-13.2, 6.4, 5.2],
      target: [-6.8, 3.5, -1.2],
    },
    fallbackPct: [23, 38],
    chapters: ['observation', 'arrival'],
  },
  {
    id: 'house',
    label: 'Casas históricas',
    shortLabel: 'Estación',
    subtitle: 'De la pirca de piedra de Omond House a Casa Moneta y los módulos actuales',
    worldPos: [
      houseLayout.position[0] + 1.2,
      houseLayout.position[1] + 1.95,
      houseLayout.position[2] + 0.1,
    ],
    pose: {
      pos: [9.5, 6.0, 8.8],
      target: [2.8, 2.1, -1.2],
    },
    fallbackPct: [55, 43],
    chapters: ['eras', 'arrival'],
  },
  {
    id: 'flag',
    label: 'Mástil y pabellón',
    shortLabel: 'Pabellón',
    subtitle: 'Permanencia ininterrumpida en el istmo de la isla Laurie desde 1904',
    worldPos: [
      flagLayout.position[0] - 0.6,
      flagLayout.position[1] + 4.75,
      flagLayout.position[2] + 0.2,
    ],
    pose: {
      pos: [4.8, 5.8, 11.2],
      target: [0.2, 3.6, 3.6],
    },
    fallbackPct: [45, 37],
    chapters: ['arrival', 'eras'],
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
  },
];

export function poseForHotspot(focus: HotspotId | null, mobile: boolean): CameraPose {
  if (!focus || focus === 'overview') {
    return mobile ? OVERVIEW_POSE_MOBILE : OVERVIEW_POSE_DESKTOP;
  }
  const found = HOTSPOTS.find((h) => h.id === focus);
  if (!found) return mobile ? OVERVIEW_POSE_MOBILE : OVERVIEW_POSE_DESKTOP;
  return mobile ? mobilePose(found.pose) : found.pose;
}

export function Hotspots({
  overlayRef,
  activeSpot,
  openCardSpot,
  buildings,
  onSelectSpot,
  onCloseCard,
}: {
  overlayRef: RefObject<HTMLDivElement | null>;
  activeSpot: HotspotId | null;
  openCardSpot: Exclude<HotspotId, 'overview'> | null;
  buildings?: readonly BuildingId[];
  onSelectSpot: (id: Exclude<HotspotId, 'overview'>) => void;
  onCloseCard: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const visibleHotspots = useMemo(() => {
    if (!buildings) return HOTSPOTS;
    return HOTSPOTS.filter((spot) => {
      const req = HOTSPOT_BUILDING[spot.id as OrcadasHotspotId];
      return !req || buildings.includes(req);
    });
  }, [buildings]);

  useEffect(() => {
    if (openCardSpot && !visibleHotspots.some((h) => h.id === openCardSpot)) {
      onCloseCard();
    }
  }, [openCardSpot, visibleHotspots, onCloseCard]);

  const selectedDef = useMemo(
    () => (openCardSpot ? visibleHotspots.find((h) => h.id === openCardSpot) ?? null : null),
    [openCardSpot, visibleHotspots]
  );
  const relatedFacts = useMemo(
    () => (selectedDef ? hotspotFacts(selectedDef.id) : []),
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
        {visibleHotspots.map((spot) => {
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
