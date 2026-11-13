import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  CHAPTERS,
  CHAPTER_HEADINGS,
  CHAPTER_NAMES,
  ORCADAS_CLIMATE,
  ORCADAS_FAUNA,
  ORCADAS_GUIDING_QUESTION,
  READING_KINDS,
  chapterIndex,
  eraAt,
  factsFor,
  hotspotFacts,
  initialOrcadas,
  orcadasReducer,
  readingFor,
  seaIceAt,
  sunsetHour,
  type Chapter,
} from '@antartida/core';
import { useFocusReturn, useIsDesktop } from '../hooks.ts';
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

const CHAPTER_DEFAULT_FOCUS: Record<Chapter, HotspotId> = {
  arrival: 'overview',
  observation: 'screen',
  journey: 'overview',
  answer: 'flag',
};

function primaryButtonText(chapter: Chapter, recorded: number): string {
  switch (chapter) {
    case 'arrival':
      return 'Hacer la observación';
    case 'observation':
      return recorded >= 4 ? 'Viajar en el tiempo' : 'Seguir';
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
            Disposición ilustrativa, no a escala: una selección de los edificios de la base, con su forma y sus colores según OpenStreetMap (imágenes Maxar 2019), acomodados en fila para que se vean; alturas aproximadas; animales, instrumentos y bandera agrandados para que se vean; relieve y pingüinera ilustrativos.{' '}
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

  const [focus, setFocus] = useState<HotspotId | null>('overview');
  const [openSpot, setOpenSpot] = useState<Exclude<HotspotId, 'overview'> | null>(null);
  const [highlightSource, setHighlightSource] = useState<string | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);

  const isDesktop = useIsDesktop(900);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sourcesBtnRef = useRef<HTMLButtonElement>(null);
  const hotspotsRef = useRef<HTMLDivElement>(null);
  const mobileCardRef = useRef<HTMLElement>(null);

  // Move focus to the chapter h2 heading and update camera framing whenever chapter changes
  useEffect(() => {
    setOpenSpot(null);
    setFocus(CHAPTER_DEFAULT_FOCUS[s.chapter]);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    headingRef.current?.focus({ preventScroll: true });
    if (s.chapter === 'observation') {
      setPanelExpanded(true);
    } else {
      setPanelExpanded(false);
    }
  }, [s.chapter]);

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
  const recorded = READING_KINDS.filter((kind) => typeof s.guesses[kind] === 'number').length;

  return (
    <SourceContext.Provider value={handleOpenSource}>
      <section
        className={`orc${panelExpanded ? ' is-panel-expanded' : ''}`}
        aria-label="Expedición Estación Orcadas"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (openSpot) {
              setOpenSpot(null);
              setFocus('overview');
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
            setFocus(id);
            setOpenSpot(id);
          }}
          onCloseCard={() => {
            setOpenSpot(null);
            setFocus('overview');
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

        {/* Field Notebook Chapter Panel */}
        <div
          className={`orc-panel${panelExpanded ? ' is-expanded' : ''}`}
          role="region"
          aria-label={`Capítulo ${idx + 1}: ${CHAPTER_NAMES[s.chapter]}`}
        >
          <button
            type="button"
            className="orc-panel-toggle"
            aria-expanded={panelExpanded}
            onClick={() => setPanelExpanded((v) => !v)}
          >
            <span className="orc-panel-toggle-bar" aria-hidden="true" />
            <span className="orc-panel-toggle-text">
              {panelExpanded ? 'Ver menos' : 'Ver más'}
            </span>
          </button>
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
                  setFocus('overview');
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
                    setFocus('overview');
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
                  <span className="orc-kicker hand">
                    Capítulo {idx + 1} de {CHAPTERS.length} · {CHAPTER_NAMES[s.chapter]}
                  </span>
                  <h2 ref={headingRef} tabIndex={-1} className="orc-chapter-h2">
                    {CHAPTER_HEADINGS[s.chapter]}
                  </h2>
                </div>

                {s.chapter === 'arrival' && (
                  <div className="orc-chapter-content">
                    <p className="orc-question">{ORCADAS_GUIDING_QUESTION}</p>
                    <p className="orc-lead">
                      En el istmo entre las bahías Scotia y Uruguay se mide el tiempo sin pausa desde 1903.
                    </p>
                    <FactList facts={chapterFacts} />
                  </div>
                )}

                {s.chapter === 'observation' && (
                  <div className="orc-chapter-content">
                    <Observation
                      reading={reading}
                      guesses={s.guesses}
                      onGuess={(kind, value) => dispatch({ type: 'guess', kind, value })}
                      onClear={() => dispatch({ type: 'clearGuesses' })}
                      month={s.obsMonth}
                    />
                    <FactList facts={chapterFacts} />
                  </div>
                )}

                {s.chapter === 'journey' && (
                  <div className="orc-chapter-content">
                    <Journey
                      year={s.year}
                      maxYear={s.maxYear}
                      onYear={(year) => dispatch({ type: 'year', year })}
                    />
                  </div>
                )}

                {s.chapter === 'answer' && (
                  <Answer
                    guesses={s.guesses}
                    obsMonth={s.obsMonth}
                    reading={reading}
                    onGotoObservation={() => dispatch({ type: 'goto', chapter: 'observation' })}
                  />
                )}
              </div>

              <div className="orc-bar ebar">
                {idx > 0 && (
                  <button
                    type="button"
                    className="btn ghost orc-btn-back"
                    onClick={() => dispatch({ type: 'back' })}
                  >
                    Atrás
                  </button>
                )}
                <button
                  type="button"
                  className="btn primary orc-btn-primary"
                  onClick={() =>
                    s.chapter === 'answer' ? onLeave(true) : dispatch({ type: 'next' })
                  }
                >
                  {primaryButtonText(s.chapter, recorded)}
                </button>
              </div>
              {s.chapter === 'observation' && recorded < 4 && (
                <small className="orc-obs-status" role="status">
                  {4 - recorded === 1
                    ? 'Te falta 1 lectura, podés volver después.'
                    : `Te faltan ${4 - recorded} lecturas, podés volver después.`}
                </small>
              )}
            </>
          )}
        </div>

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
