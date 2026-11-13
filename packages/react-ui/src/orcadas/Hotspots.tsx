import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  HOTSPOT_BUILDING,
  hotspotFacts,
  layoutOf,
  tourStops,
  type BuildingId,
  type Chapter,
  type OrcadasHotspotId,
} from '@antartida/core';
import { useFocusReturn, useIsDesktop } from '../hooks.ts';
import { Icon } from '../ui.tsx';
import { FactCard } from './FactList.tsx';
import { beachPoint } from './penguins.ts';
import { PENGUIN_KNOLL, evaluateIsthmusTerrain } from './stationModels.ts';

export type HotspotId =
  | 'overview'
  | 'screen'
  | 'mast'
  | 'house'
  | 'bay'
  | 'colony'
  | 'flag'
  | 'boat'
  | 'helipad';

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
}

/**
 * Camera looking at `target` from a compass bearing (225 = from the south-west) and an elevation.
 * `right` moves the target to the right of the screen, so what is framed lands on the left
 * (clear of the desktop side panel); `near` moves it towards the camera, so what is framed
 * rises on screen (clear of the mobile bottom panel).
 */
function orbit(
  target: readonly [number, number, number],
  distance: number,
  bearingDeg: number,
  elevationDeg: number,
  right = 0,
  near = 0
): CameraPose {
  const b = (bearingDeg * Math.PI) / 180;
  const e = (elevationDeg * Math.PI) / 180;
  const dx = Math.sin(b);
  const dz = -Math.cos(b);
  const tx = target[0] + dz * right + dx * near;
  const tz = target[2] - dx * right + dz * near;
  const h = Math.cos(e) * distance;
  return {
    pos: [tx + dx * h, target[1] + Math.sin(e) * distance, tz + dz * h],
    target: [tx, target[1], tz],
  };
}

/** Centre of the stage, from the penguin knoll on the left to the pavilions on the right. */
const STATION_CENTRE = [-1.0, 2.6, 0.6] as const;

/**
 * Every view looks at the stage from Bahía Scotia (bearing 180 in stage axes), low over the
 * water, like a model on a table: the station in a row in front, hills at both ends and Bahía
 * Uruguay behind. The camera can only orbit a little around this bearing.
 */
export const VIEW_BEARING_DEG = 180;
/** How far the user can orbit to each side of VIEW_BEARING_DEG, in degrees. */
export const VIEW_ORBIT_DEG = 35;
/** Lowest and highest camera elevation the user can reach, in degrees. */
export const VIEW_ELEVATION_DEG: readonly [number, number] = [5, 38];

/** Entry view on desktop; the station sits left of the side panel. */
export const OVERVIEW_POSE_DESKTOP: CameraPose = orbit(STATION_CENTRE, 22, VIEW_BEARING_DEG, 12, 4.8);

/** Entry view on desktop with the side panel hidden; the station sits centred. */
export const OVERVIEW_POSE_DESKTOP_FULL: CameraPose = orbit(STATION_CENTRE, 22, VIEW_BEARING_DEG, 12, 0);

/** Portrait phones frame the whole row, from the penguin knoll to the helipad. */
const MOBILE_CENTRE_X = 0.4;

/** Portrait phone: farther back, the station high on the screen above the bottom panel. */
export const OVERVIEW_POSE_MOBILE: CameraPose = orbit([MOBILE_CENTRE_X, 0.4, STATION_CENTRE[2]], 50, VIEW_BEARING_DEG, 15, 0, 6);

/** Portrait phone with the panel expanded: only a strip at the top is left. */
export const OVERVIEW_POSE_MOBILE_EXPANDED: CameraPose = orbit([MOBILE_CENTRE_X, 0.4, STATION_CENTRE[2]], 58, VIEW_BEARING_DEG, 20, 0, 14);

/** Phone on its side: a short, wide screen with the panel on the right; closer, so no two dots overlap. */
export const OVERVIEW_POSE_LANDSCAPE: CameraPose = orbit(STATION_CENTRE, 16, VIEW_BEARING_DEG, 12, 4.6);

/** How far the user can zoom out, relative to the entry view of the device. */
export const VIEW_MAX_ZOOM_OUT = 1.2;

/** A portrait screen is narrow and its lower half is covered: pull back and aim lower. */
function mobilePose(pose: CameraPose, expanded = false): CameraPose {
  const [px, py, pz] = pose.pos;
  const [tx, ty, tz] = pose.target;
  const pullBack = expanded ? 1.35 : 1.7;
  const dx = (px - tx) * pullBack;
  const dy = (py - ty) * pullBack;
  const dz = (pz - tz) * pullBack;
  const drop = Math.hypot(dx, dy, dz) * (expanded ? 0.36 : 0.11);
  return { pos: [tx + dx, ty + dy, tz + dz], target: [tx, ty - drop, tz] };
}

const screenLayout = layoutOf('screen');
const mastLayout = layoutOf('windMast');
const omondLayout = layoutOf('omond');
const flagLayout = layoutOf('flag');
const helipadLayout = layoutOf('helipad');

/** The Zodiac, beached with its bow on the gravel (StationScene strands it at the same point). */
const boatPoint: [number, number, number] = (() => {
  const boat = layoutOf('boat').position;
  const [x, z] = beachPoint([boat[0], boat[2]], -0.03);
  return [x, 0.45, z];
})();

/** A point in Bahía Scotia off the beach, to one side of the boat so the two dots never stack. */
const bayPoint: [number, number, number] = (() => {
  const boat = layoutOf('boat').position;
  const [x, z] = beachPoint([boat[0] - 3, boat[2]], -2.2);
  return [x, 0.4, z];
})();

/** The penguin colony on its knoll (reconstruction, see penguins.ts). */
const colonyPoint: [number, number, number] = (() => {
  const [x, z] = PENGUIN_KNOLL.center;
  return [x, evaluateIsthmusTerrain(x, z).y + 0.6, z];
})();

export const HOTSPOTS: readonly HotspotDef[] = [
  {
    id: 'screen',
    label: 'Abrigo meteorológico',
    shortLabel: 'Abrigo',
    subtitle: 'Termómetros e higrómetro al resguardo del sol y del viento',
    worldPos: [
      screenLayout.position[0],
      screenLayout.position[1] + 1.15,
      screenLayout.position[2],
    ],
    pose: orbit([screenLayout.position[0], screenLayout.position[1] + 0.5, screenLayout.position[2]], 5.5, 175, 12, 1.0),
    fallbackPct: [33, 52],
  },
  {
    id: 'mast',
    label: 'Mástil de viento',
    shortLabel: 'Anemómetro',
    subtitle: 'Veleta de rumbo y cazoletas que giran con las ráfagas del mar de Scotia',
    worldPos: [
      mastLayout.position[0],
      mastLayout.position[1] + 2.4,
      mastLayout.position[2],
    ],
    pose: orbit([mastLayout.position[0], mastLayout.position[1] + 1.2, mastLayout.position[2]], 6.5, 170, 12, 1.2),
    fallbackPct: [23, 38],
  },
  {
    id: 'house',
    label: 'Casas históricas',
    shortLabel: 'Casa Omond',
    subtitle: 'De la pirca de piedra de Omond House a los módulos actuales',
    worldPos: [
      omondLayout.position[0],
      omondLayout.position[1] + 0.7,
      omondLayout.position[2],
    ],
    pose: orbit([omondLayout.position[0], omondLayout.position[1] + 0.3, omondLayout.position[2]], 7, 185, 14, 1.4),
    fallbackPct: [45, 48],
  },
  {
    id: 'flag',
    label: 'Mástil y pabellón',
    shortLabel: 'Pabellón',
    subtitle: 'Permanencia ininterrumpida en el istmo de la isla Laurie desde 1904',
    worldPos: [
      flagLayout.position[0],
      flagLayout.position[1] + 2.7,
      flagLayout.position[2],
    ],
    pose: orbit([flagLayout.position[0], flagLayout.position[1] + 2.0, flagLayout.position[2]], 9.5, 190, 12, 1.6),
    fallbackPct: [48, 38],
  },
  {
    id: 'bay',
    label: 'Bahía Scotia y hielo marino',
    shortLabel: 'Bahía Scotia',
    subtitle: 'Aguas que se cierran de hielo en invierno y se abren en el deshielo austral',
    worldPos: bayPoint,
    pose: orbit([bayPoint[0], 0.3, bayPoint[2]], 12, 180, 16, 2.5),
    fallbackPct: [30, 66],
  },
  {
    id: 'boat',
    label: 'Bote Zodiac',
    shortLabel: 'Zodiac',
    subtitle: 'Bote neumático con motor fuera de borda: la base no tiene muelle',
    worldPos: boatPoint,
    pose: orbit([boatPoint[0], 0.2, boatPoint[2]], 6, 180, 14, 1.0),
    fallbackPct: [40, 60],
  },
  {
    id: 'colony',
    label: 'Pingüinera y fauna',
    shortLabel: 'Pingüinera',
    subtitle: 'Colonias de pingüinos adelia y barbijo en las laderas rocosas de Laurie',
    worldPos: colonyPoint,
    pose: orbit([colonyPoint[0], colonyPoint[1] - 0.4, colonyPoint[2]], 6, 165, 18, 1.2),
    fallbackPct: [74, 46],
  },
  {
    id: 'helipad',
    label: 'Helipuerto',
    shortLabel: 'Helipuerto',
    subtitle: 'Por acá llegan la dotación, el combustible y los científicos cuando el hielo no deja pasar al buque',
    worldPos: [
      helipadLayout.position[0],
      helipadLayout.position[1] + 2.0,
      helipadLayout.position[2],
    ],
    pose: orbit([helipadLayout.position[0], helipadLayout.position[1] + 0.6, helipadLayout.position[2]], 8, 180, 15, 1.5),
    fallbackPct: [64, 54],
  },
];

export function poseForHotspot(
  focus: HotspotId | null,
  mobile: boolean,
  panelExpanded = false,
  landscape = false,
  panelHidden = false
): CameraPose {
  if (!focus || focus === 'overview') {
    if (landscape) return OVERVIEW_POSE_LANDSCAPE;
    if (mobile) {
      return panelExpanded ? OVERVIEW_POSE_MOBILE_EXPANDED : OVERVIEW_POSE_MOBILE;
    }
    return panelHidden ? OVERVIEW_POSE_DESKTOP_FULL : OVERVIEW_POSE_DESKTOP;
  }
  const found = HOTSPOTS.find((h) => h.id === focus);
  if (!found) {
    if (mobile) {
      return panelExpanded ? OVERVIEW_POSE_MOBILE_EXPANDED : OVERVIEW_POSE_MOBILE;
    }
    return panelHidden ? OVERVIEW_POSE_DESKTOP_FULL : OVERVIEW_POSE_DESKTOP;
  }
  return mobile ? mobilePose(found.pose, panelExpanded) : found.pose;
}

export function Hotspots({
  overlayRef,
  activeSpot,
  openCardSpot,
  buildings,
  chapter,
  onSelectSpot,
  onCloseCard,
}: {
  overlayRef: RefObject<HTMLDivElement | null>;
  activeSpot: HotspotId | null;
  openCardSpot: Exclude<HotspotId, 'overview'> | null;
  buildings?: readonly BuildingId[];
  chapter?: Chapter;
  onSelectSpot: (id: Exclude<HotspotId, 'overview'>) => void;
  onCloseCard: () => void;
}) {
  const isDesktop = useIsDesktop(900);
  const cardRef = useRef<HTMLElement>(null);
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null);

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
  const spotFact = useMemo(
    () => (selectedDef ? hotspotFacts(selectedDef.id)[0] ?? null : null),
    [selectedDef]
  );

  // Position the card near its hotspot dot on desktop
  useEffect(() => {
    if (!openCardSpot || !isDesktop) {
      setCardPos(null);
      return;
    }
    const updatePos = () => {
      const btn = overlayRef.current?.querySelector<HTMLElement>(
        `[data-hotspot="${openCardSpot}"]`
      );
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const dotX = r.left + r.width / 2;
      const dotY = r.top + r.height / 2;
      const panelEl = document.querySelector('.orc-panel');
      const panelVisible = panelEl && !panelEl.classList.contains('is-hidden');
      const panelLeft = panelVisible ? panelEl.getBoundingClientRect().left : window.innerWidth - 24;
      const cardWidth = 320;
      const maxRight = panelLeft - 16;

      let left = dotX + 24;
      if (left + cardWidth > maxRight) {
        left = dotX - 24 - cardWidth;
      }
      left = Math.max(16, Math.min(maxRight - cardWidth, left));
      const top = Math.max(86, Math.min(window.innerHeight - 260, dotY - 40));
      setCardPos({ left, top });
    };

    updatePos();
    const id = requestAnimationFrame(updatePos);
    window.addEventListener('resize', updatePos);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', updatePos);
    };
  }, [openCardSpot, isDesktop, overlayRef]);

  useFocusReturn(
    Boolean(selectedDef && isDesktop),
    cardRef,
    'button',
    () =>
      overlayRef.current?.querySelector<HTMLElement>(
        `[data-hotspot="${openCardSpot ?? ''}"]`
      ) ?? null
  );

  const keySpots = useMemo(() => {
    if (!chapter) return null;
    const spots = tourStops(chapter)
      .map((stop) => stop.spot)
      .filter((spot): spot is Exclude<HotspotId, 'overview'> => spot !== 'overview');
    if (chapter === 'answer' && spots.length === 0) {
      return new Set<HotspotId>(['flag']);
    }
    return new Set<HotspotId>(spots);
  }, [chapter]);

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
          const isKeySpot = keySpots ? keySpots.has(spot.id) : true;
          return (
            <button
              key={spot.id}
              type="button"
              data-hotspot={spot.id}
              className={`orc-hs${isSelected ? ' is-active' : ''}${!isKeySpot && !isSelected ? ' is-dimmed' : ''}`}
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
              <span className="orc-hs-lbl">{spot.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {selectedDef && isDesktop && (
        <section
          className="orc-spot-card"
          role="dialog"
          aria-label={selectedDef.label}
          ref={cardRef}
          style={
            cardPos
              ? {
                  left: `${cardPos.left}px`,
                  top: `${cardPos.top}px`,
                  maxWidth: '320px',
                }
              : { maxWidth: '320px' }
          }
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              onCloseCard();
            }
          }}
        >
          <div className="orc-spot-head">
            <div>
              <span className="orc-kicker">Punto de exploración</span>
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
            {spotFact && <FactCard fact={spotFact} />}
          </div>
        </section>
      )}
    </>
  );
}
