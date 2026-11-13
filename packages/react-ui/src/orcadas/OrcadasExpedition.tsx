import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  CHAPTERS,
  CHAPTER_HEADINGS,
  CHAPTER_NAMES,
  ORCADAS_CLIMATE,
  ORCADAS_FAUNA,
  ORCADAS_GUIDING_QUESTION,
  chapterIndex,
  eraAt,
  factsFor,
  hotspotFacts,
  initialOrcadas,
  orcadasProgress,
  orcadasReducer,
  readingFor,
  seaIceAt,
  sunsetHour,
  tourAtEnd,
  tourStop,
  tourStops,
  type Chapter,
} from '@antartida/core';
import { BottomSheet, type OpenSheetSize } from '../BottomSheet.tsx';
import { useFocusReturn, useIsDesktop, useMediaQuery } from '../hooks.ts';
import { Icon } from '../ui.tsx';
import { Answer } from './Answer.tsx';
import { FactCard, FactList, SourceContext } from './FactList.tsx';
import { HOTSPOTS, Hotspots, type HotspotId } from './Hotspots.tsx';
import { Journey } from './Journey.tsx';
import { KindChip } from './KindChip.tsx';
import { MonthStrip } from './MonthStrip.tsx';
import { Observation } from './observation/Observation.tsx';
import { SourcesPanel } from './SourcesPanel.tsx';
import { StationScene } from './StationScene.tsx';
import { TourCard } from './TourCard.tsx';

/** Camera target: the active tour stop, or the entry view (the answer is read at sunset over the whole station). */
function chapterFocus(chapter: Chapter, tourIndex: number): HotspotId {
  return tourStop(chapter, tourIndex)?.spot ?? 'overview';
}

function primaryButtonText(chapter: Chapter): string {
  switch (chapter) {
    case 'arrival':
      return 'Hacer la observación';
    case 'observation':
      return 'Viajar en el tiempo';
    case 'journey':
      return 'Ver la respuesta';
    case 'answer':
      return 'Terminar expedición';
  }
}

function SceneBadge({ onOpenSource }: { onOpenSource?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const fact = useMemo(() => factsFor('scene')[0], []);
  return (
    <div className="orc-scene-badge">
      <div className="orc-scene-badge-row">
        <KindChip kind="recon" label="Reconstrucción ilustrada" />
        {fact && (
          <button
            type="button"
            className="orc-scene-help-btn"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            aria-label="Ayuda sobre la reconstrucción ilustrada"
          >
            ?
          </button>
        )}
      </div>
      {open && fact && (
        <div className="orc-scene-help-popover" role="note">
          <p>{fact.text}</p>
          <p>
            Disposición ilustrativa, no a escala: una selección de los edificios de la base, con su forma y sus colores según OpenStreetMap (imágenes Maxar 2019), acomodados en fila para que se vean; alturas aproximadas; animales, instrumentos y bandera agrandados para que se vean; relieve y pingüinera ilustrativos; helicóptero ilustrativo, se muestra en la temporada de visitas.{' '}
            <button
              type="button"
              className="orc-scene-sources-link"
              onClick={() => {
                setOpen(false);
                onOpenSource?.('osm-site');
              }}
            >
              Ver fuentes
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

export function OrcadasExpedition({
  reduced,
  onLeave,
}: {
  reduced: boolean;
  onLeave: (done: boolean) => void;
}) {
  const [initDate] = useState(() => {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      seed:
        now.getFullYear() * 10000 +
        (now.getMonth() + 1) * 100 +
        now.getDate(),
    };
  });

  const [s, dispatch] = useReducer(
    orcadasReducer,
    undefined,
    () => initialOrcadas(initDate.month, initDate.year)
  );

  const [focus, setFocus] = useState<HotspotId | null>(() => chapterFocus('arrival', 0));
  const [openSpot, setOpenSpot] = useState<Exclude<HotspotId, 'overview'> | null>(null);
  const [highlightSource, setHighlightSource] = useState<string | null>(null);
  const [sheetSize, setSheetSize] = useState<OpenSheetSize>('small');
  const [panelHidden, setPanelHidden] = useState(false);

  const isDesktop = useIsDesktop(900);
  const canHidePanel = useMediaQuery('(min-width: 900px) and (min-height: 501px)');
  const isPanelHidden = canHidePanel && panelHidden;
  // On a phone held upright the chapter panel is a bottom sheet; tall, it leaves the scene a strip.
  const panelExpanded = !isDesktop && sheetSize === 'tall';
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sourcesBtnRef = useRef<HTMLButtonElement>(null);
  const hotspotsRef = useRef<HTMLDivElement>(null);
  const mobileCardRef = useRef<HTMLElement>(null);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const showPanelBtnRef = useRef<HTMLButtonElement>(null);
  const focusTargetRef = useRef<'show' | 'heading' | null>(null);
  const isPanelHiddenRef = useRef(isPanelHidden);
  isPanelHiddenRef.current = isPanelHidden;

  // Move focus to the chapter h2 heading and reset panel scroll whenever chapter changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    if (isPanelHiddenRef.current) {
      focusTargetRef.current = 'heading';
    } else {
      headingRef.current?.focus({ preventScroll: true });
    }
    // Observing needs the thermometer and its button on screen: the sheet opens tall there.
    setSheetSize(s.chapter === 'observation' ? 'tall' : 'small');
  }, [s.chapter]);

  // Update camera framing whenever the active chapter or tour stop changes
  useEffect(() => {
    setOpenSpot(null);
    setFocus(chapterFocus(s.chapter, s.tourIndex));
    // A new stop has a line to read: a sheet folded down to its title comes back up.
    setSheetSize((size) => (size === 'peek' ? 'small' : size));
    setPanelHidden(false);
  }, [s.chapter, s.tourIndex]);

  useEffect(() => {
    if (!canHidePanel) {
      setPanelHidden(false);
    }
  }, [canHidePanel]);

  useEffect(() => {
    if (isPanelHidden && focusTargetRef.current === 'show') {
      focusTargetRef.current = null;
      showPanelBtnRef.current?.focus();
    } else if (!isPanelHidden && focusTargetRef.current === 'heading') {
      focusTargetRef.current = null;
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [isPanelHidden]);

  const activeSpotDef = useMemo(
    () => (openSpot ? HOTSPOTS.find((h) => h.id === openSpot) ?? null : null),
    [openSpot]
  );
  const activeSpotFact = useMemo(
    () => (openSpot ? hotspotFacts(openSpot)[0] ?? null : null),
    [openSpot]
  );

  useFocusReturn(
    Boolean(openSpot && !isDesktop),
    mobileCardRef,
    'button',
    () => hotspotsRef.current?.querySelector<HTMLElement>(`[data-hotspot="${openSpot ?? ''}"]`)
  );

  const handleOpenSource = (sourceId: string) => {
    setOpenSpot(null);
    setHighlightSource(sourceId);
    if (!s.panel) {
      dispatch({ type: 'togglePanel' });
    }
  };

  const climate = useMemo(
    () => ORCADAS_CLIMATE[(s.month - 1 + 12) % 12] ?? ORCADAS_CLIMATE[0],
    [s.month]
  );

  const reading = useMemo(
    () => readingFor(s, initDate.seed),
    [initDate.seed, s.obsMonth]
  );

  const chapterFacts = useMemo(() => factsFor(s.chapter), [s.chapter]);
  const era = useMemo(() => eraAt(s.year), [s.year]);
  const activeAnimals = useMemo(
    () =>
      ORCADAS_FAUNA.filter((a) => a.months.includes(s.month)).map((a) => a.id),
    [s.month]
  );

  const sceneWindKmh =
    s.chapter === 'observation'
      ? reading.windKmh
      : Math.round(climate?.windMeanKmh ?? 22);
  const sceneWindDirDeg =
    s.chapter === 'observation' ? reading.windDirDeg : 270;
  const sceneCloudOktas =
    s.chapter === 'observation'
      ? reading.cloudOktas
      : Math.round(climate?.cloudMeanOktas ?? 6);
  const sceneSeaIce = seaIceAt(s.month);
  const sceneHour = s.chapter === 'answer' ? sunsetHour(s.month) : s.hour;
  const sceneBuildings =
    s.chapter === 'journey' ? era.buildings : eraAt(s.maxYear).buildings;

  const idx = chapterIndex(s.chapter);
  const stops = useMemo(() => tourStops(s.chapter), [s.chapter]);
  const activeStop = tourStop(s.chapter, s.tourIndex);
  const atTourEnd = tourAtEnd(s);
  const defaultFocus = chapterFocus(s.chapter, s.tourIndex);

  const tourCardElement = activeStop ? (
    <TourCard
      stop={activeStop}
      index={s.tourIndex}
      total={stops.length}
      onPrev={() => dispatch({ type: 'tourPrev' })}
      onNext={() => dispatch({ type: 'tourNext' })}
      onReachEnd={() => primaryBtnRef.current?.focus()}
    />
  ) : null;

  const panelBody = (
    <>
      <span id="orc-panel-label" hidden>
        Capítulo {idx + 1}: {CHAPTER_NAMES[s.chapter]}
      </span>
      {openSpot && !isDesktop && activeSpotDef ? (
        <section
          className="orc-spot-card orc-spot-panel-card"
          role="dialog"
          aria-label={activeSpotDef.label}
          ref={mobileCardRef}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setOpenSpot(null);
              setFocus(defaultFocus);
            }
          }}
        >
          <div className="orc-spot-head">
            <div>
              <span className="orc-kicker">Punto de exploración</span>
              <h3>{activeSpotDef.label}</h3>
            </div>
            <button
              type="button"
              className="btn ghost orc-btn-return"
              onClick={() => {
                setOpenSpot(null);
                setFocus(defaultFocus);
              }}
            >
              Volver al capítulo
            </button>
          </div>
          <p className="orc-spot-sub">{activeSpotDef.subtitle}</p>
          <div className="orc-spot-facts">
            {activeSpotFact && <FactCard fact={activeSpotFact} />}
          </div>
        </section>
      ) : (
        <>
          <div className="orc-panel-scroll" ref={scrollRef}>
            <div className="orc-panel-head">
              <div className="orc-panel-head-title">
                <span className="orc-kicker hand">
                  Capítulo {idx + 1} de {CHAPTERS.length} · {CHAPTER_NAMES[s.chapter]}
                </span>
                <h2 ref={headingRef} tabIndex={-1} className="orc-chapter-h2">
                  {CHAPTER_HEADINGS[s.chapter]}
                </h2>
              </div>
              {canHidePanel && (
                <button
                  type="button"
                  className="btn ghost orc-panel-hide"
                  aria-expanded={!isPanelHidden}
                  aria-controls="orc-chapter-panel"
                  onClick={() => {
                    focusTargetRef.current = 'show';
                    setPanelHidden(true);
                  }}
                >
                  Ocultar panel
                </button>
              )}
            </div>

            {s.chapter === 'arrival' && (
              <div className="orc-chapter-content">
                <p className="orc-lead">
                  Acá se mide el tiempo sin pausa desde 1903.
                </p>
                {tourCardElement}
              </div>
            )}

            {s.chapter === 'observation' && (
              <div className="orc-chapter-content">
                <Observation
                  reading={reading}
                  guesses={s.guesses}
                  onGuess={(kind, value) => dispatch({ type: 'guess', kind, value })}
                  month={s.obsMonth}
                />
                {tourCardElement}
              </div>
            )}

            {s.chapter === 'journey' && (
              <div className="orc-chapter-content">
                <Journey
                  year={s.year}
                  maxYear={s.maxYear}
                  onYear={(year) => dispatch({ type: 'year', year })}
                  tourCard={tourCardElement}
                />
              </div>
            )}

            {s.chapter === 'answer' && (
              <Answer
                guesses={s.guesses}
                obsMonth={s.obsMonth}
                reading={reading}
                progress={orcadasProgress(s)}
                onGotoObservation={() => dispatch({ type: 'goto', chapter: 'observation' })}
              />
            )}

            <FactList facts={chapterFacts} summary="Saber más del capítulo" />
          </div>

          <div className="orc-bar ebar">
            {(idx > 0 || s.tourIndex > 0) && (
              <button
                type="button"
                className="btn ghost orc-btn-back"
                onClick={() => dispatch({ type: s.tourIndex > 0 ? 'tourPrev' : 'back' })}
              >
                Atrás
              </button>
            )}
            <button
              ref={primaryBtnRef}
              type="button"
              className="btn primary orc-btn-primary"
              onClick={() => {
                if (!atTourEnd) {
                  dispatch({ type: 'tourNext' });
                } else if (s.chapter === 'answer') {
                  onLeave(true);
                } else {
                  dispatch({ type: 'next' });
                }
              }}
            >
              {atTourEnd ? primaryButtonText(s.chapter) : 'Siguiente'}
            </button>
          </div>
        </>
      )}
    </>
  );

  return (
    <SourceContext.Provider value={handleOpenSource}>
      <section
        className={`orc${panelExpanded ? ' is-panel-expanded' : ''}${!isDesktop && sheetSize === 'peek' ? ' is-panel-peek' : ''}`}
        aria-label="Expedición Estación Orcadas"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (openSpot) {
              setOpenSpot(null);
              setFocus(defaultFocus);
            } else if (s.panel) {
              dispatch({ type: 'closePanel' });
            }
          }
        }}
      >
        {/* Full-bleed 3D Diorama (or SVG fallback when WebGL is unavailable) */}
        <StationScene
          month={s.month}
          hour={sceneHour}
          windKmh={sceneWindKmh}
          windDirDeg={sceneWindDirDeg}
          cloudOktas={sceneCloudOktas}
          seaIce={sceneSeaIce}
          buildings={sceneBuildings}
          animals={activeAnimals}
          focus={focus}
          reduced={reduced}
          panelExpanded={panelExpanded}
          panelHidden={isPanelHidden}
          overlayRef={hotspotsRef}
        />

        {/* Month strip fixed over scene */}
        <MonthStrip
          month={s.month}
          hour={s.hour}
          onMonth={(month) => dispatch({ type: 'month', month })}
          onHour={(hour) => dispatch({ type: 'hour', hour })}
        />

        {/* Always-visible scene reconstruction label with help toggle */}
        <SceneBadge
          onOpenSource={(id) => {
            if (openSpot) setOpenSpot(null);
            setHighlightSource(id);
            if (!s.panel) dispatch({ type: 'togglePanel' });
          }}
        />

        {/* Interactive 3D-projected HTML hotspots */}
        <Hotspots
          chapter={s.chapter}
          overlayRef={hotspotsRef}
          activeSpot={focus}
          openCardSpot={openSpot}
          buildings={sceneBuildings}
          onSelectSpot={(id) => {
            if (s.panel) {
              dispatch({ type: 'closePanel' });
              setHighlightSource(null);
            }
            const stopIdx = stops.findIndex((st) => st.spot === id);
            if (stopIdx >= 0) {
              setOpenSpot(null);
              setFocus(id);
              dispatch({ type: 'tourGo', index: stopIdx });
              return;
            }
            setFocus(id);
            setOpenSpot(id);
            setSheetSize((size) => (size === 'peek' ? 'small' : size));
          }}
          onCloseCard={() => {
            setOpenSpot(null);
            setFocus(defaultFocus);
          }}
        />

        {/* Top Navigation Header */}
        <header className="orc-top">
          <div className="orc-top-r1">
            <button
              type="button"
              className="pill orc-top-btn"
              onClick={() => onLeave(false)}
              aria-label="Volver al mapa"
            >
              {Icon.back}
              <span>Mapa</span>
            </button>

            <div className="orc-top-title">
              <strong>Estación Orcadas</strong>
              <span>{ORCADAS_GUIDING_QUESTION}</span>
            </div>

            <button
              type="button"
              className="pill orc-top-btn"
              ref={sourcesBtnRef}
              onClick={() => {
                if (openSpot) {
                  setOpenSpot(null);
                }
                setHighlightSource(null);
                dispatch({ type: 'togglePanel' });
              }}
              aria-expanded={s.panel}
              aria-controls="orc-sources-panel"
            >
              Fuentes
            </button>
          </div>

          <nav className="orc-steps-nav" aria-label="Capítulos de la expedición">
            <ol className="orc-steps">
              {CHAPTERS.map((ch, i) => {
                const isCurrent = s.chapter === ch;
                const isVisited = s.visited.includes(ch);
                return (
                  <li key={ch} className="orc-step-item">
                    <button
                      type="button"
                      className={`orc-step-btn${isCurrent ? ' is-current' : isVisited ? ' is-visited' : ''}`}
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => dispatch({ type: 'goto', chapter: ch })}
                    >
                      <span className="orc-step-num" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className="orc-step-name">{CHAPTER_NAMES[ch]}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </header>

        {/* Field Notebook Chapter Panel: a side card on wide screens, a bottom sheet on phones */}
        {isDesktop ? (
          <div
            id="orc-chapter-panel"
            className={`orc-panel${isPanelHidden ? ' is-hidden' : ''}`}
            role="region"
            aria-labelledby="orc-panel-label"
            inert={isPanelHidden || undefined}
          >
            {panelBody}
          </div>
        ) : (
          <BottomSheet
            className="orc-panel"
            labelledBy="orc-panel-label"
            sheetRef={panelRef}
            floor="peek"
            size={sheetSize}
            onSize={setSheetSize}
          >
            {panelBody}
          </BottomSheet>
        )}

        {isPanelHidden && (
          <button
            ref={showPanelBtnRef}
            type="button"
            className="orc-panel-show"
            aria-expanded={false}
            aria-controls="orc-chapter-panel"
            onClick={() => {
              focusTargetRef.current = 'heading';
              setPanelHidden(false);
            }}
          >
            Mostrar panel
          </button>
        )}

        {s.panel && (
          <SourcesPanel
            chapter={s.chapter}
            highlightSource={highlightSource}
            onClose={() => {
              dispatch({ type: 'closePanel' });
              setHighlightSource(null);
            }}
            fallbackFocus={() => sourcesBtnRef.current}
          />
        )}
      </section>
    </SourceContext.Provider>
  );
}
