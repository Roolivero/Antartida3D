import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  CHAPTERS,
  MONTH_NAMES,
  ORCADAS_CLIMATE,
  ORCADAS_FAUNA,
  SEAL_SVG,
  canAdvanceOrcadas,
  chapterIndex,
  eraAt,
  factsFor,
  initialOrcadas,
  observationFor,
  orcadasReducer,
  READING_KINDS,
  checkGuess,
  scoreObservation,
  truthFor,
  seaIceAt,
  sourcesOf,
  type Chapter,
  type OrcadasFact,
} from '@antartida/core';
import { Icon } from '../ui.tsx';
import { CenturyChart } from './CenturyChart.tsx';
import { NOTEBOOK_LABELS, formatRecorded } from './observation/Notebook.tsx';
import { Hotspots, type HotspotId } from './Hotspots.tsx';
import { KindChip } from './KindChip.tsx';
import { Observation } from './observation/Observation.tsx';
import { SourcesPanel } from './SourcesPanel.tsx';
import { StationScene } from './StationScene.tsx';
import { TimeMachine } from './TimeMachine.tsx';
import { YearWheel } from './YearWheel.tsx';

export const CHAPTER_NAMES: Record<Chapter, string> = {
  arrival: 'Llegada',
  observation: 'Observación',
  year: 'Un año',
  eras: 'Máquina del tiempo',
  century: 'El siglo',
  done: 'Cierre',
};

const CHAPTER_HEADINGS: Record<Chapter, string> = {
  arrival: 'Estación Orcadas',
  observation: 'Observación del día',
  year: 'Un año en Orcadas',
  eras: 'Máquina del tiempo',
  century: 'El siglo en datos',
  done: 'Cierre de la expedición',
};

const CHAPTER_DEFAULT_FOCUS: Record<Chapter, HotspotId> = {
  arrival: 'overview',
  observation: 'screen',
  year: 'overview',
  eras: 'overview',
  century: 'overview',
  done: 'flag',
};

function primaryButtonText(chapter: Chapter, canAdvance: boolean): string {
  switch (chapter) {
    case 'arrival':
      return 'Hacer la observación';
    case 'observation':
      return canAdvance ? 'Recorrer el año' : 'Completá las 4 lecturas';
    case 'year':
      return 'Viajar en el tiempo';
    case 'eras':
      return 'Ver el siglo en datos';
    case 'century':
      return 'Ir al cierre';
    case 'done':
      return 'Terminar expedición';
  }
}

function FactList({ facts }: { facts: readonly OrcadasFact[] }) {
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

  const headingRef = useRef<HTMLHeadingElement>(null);
  const sourcesBtnRef = useRef<HTMLButtonElement>(null);
  const hotspotsRef = useRef<HTMLDivElement>(null);

  // Move focus to the chapter h2 heading and update camera framing whenever chapter changes
  useEffect(() => {
    setOpenSpot(null);
    setFocus(CHAPTER_DEFAULT_FOCUS[s.chapter]);
    headingRef.current?.focus();
  }, [s.chapter]);

  const climate = useMemo(
    () => ORCADAS_CLIMATE[(s.month - 1 + 12) % 12] ?? ORCADAS_CLIMATE[0],
    [s.month]
  );

  const reading = useMemo(
    () => observationFor(initDate.seed + s.month, climate),
    [initDate.seed, s.month, climate]
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
  const sceneBuildings =
    s.chapter === 'eras' ? era.buildings : eraAt(s.maxYear).buildings;

  const idx = chapterIndex(s.chapter);
  const canAdvance = canAdvanceOrcadas(s);
  const monthName = MONTH_NAMES[(s.month - 1 + 12) % 12] ?? 'enero';
  const obsScore = scoreObservation(s.guesses, reading);
  const recorded = READING_KINDS.filter((kind) => typeof s.guesses[kind] === 'number').length;

  return (
    <section
      className="orc"
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
        hour={s.hour}
        windKmh={sceneWindKmh}
        windDirDeg={sceneWindDirDeg}
        cloudOktas={sceneCloudOktas}
        seaIce={sceneSeaIce}
        buildings={sceneBuildings}
        animals={activeAnimals}
        focus={focus}
        reduced={reduced}
        overlayRef={hotspotsRef}
      />

      {/* Always-visible scene reconstruction label */}
      <div className="orc-scene-badge">
        <KindChip kind="recon" label="Reconstrucción ilustrada" />
      </div>

      {/* Interactive 3D-projected HTML hotspots */}
      <Hotspots
        overlayRef={hotspotsRef}
        activeSpot={focus}
        openCardSpot={openSpot}
        onSelectSpot={(id) => {
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
            <span>Isla Laurie · Un siglo mirando el cielo</span>
          </div>

          <button
            type="button"
            className="pill orc-top-btn"
            ref={sourcesBtnRef}
            onClick={() => dispatch({ type: 'togglePanel' })}
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

      {/* Field Notebook Chapter Panel (bottom sheet on mobile <= 45% vh, side column on desktop) */}
      <div className="orc-panel" role="region" aria-label={`Capítulo ${idx + 1}: ${CHAPTER_NAMES[s.chapter]}`}>
        <div className="orc-panel-scroll">
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
              <p className="orc-lead">
                En un angosto istmo entre las bahías Scotia y Uruguay, en la isla Laurie, se mide el
                tiempo sin pausa desde 1903. Explorá los puntos de la estación o avanzá para tomar
                la observación del día.
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
                month={s.month}
              />
              <FactList facts={chapterFacts} />
            </div>
          )}

          {s.chapter === 'year' && (
            <div className="orc-chapter-content">
              <YearWheel
                month={s.month}
                hour={s.hour}
                onMonth={(month) => dispatch({ type: 'month', month })}
                onHour={(hour) => dispatch({ type: 'hour', hour })}
              />
              <FactList facts={chapterFacts} />
            </div>
          )}

          {s.chapter === 'eras' && (
            <div className="orc-chapter-content">
              <TimeMachine
                year={s.year}
                maxYear={s.maxYear}
                onYear={(year) => dispatch({ type: 'year', year })}
              />
              <FactList facts={chapterFacts} />
            </div>
          )}

          {s.chapter === 'century' && (
            <div className="orc-chapter-content">
              <CenturyChart userTempC={s.guesses.temp} month={s.month} />
              <FactList facts={chapterFacts} />
            </div>
          )}

          {s.chapter === 'done' && (
            <div className="orc-chapter-content orc-done">
              <div className="orc-done-seal-row">
                <svg
                  className="orc-seal"
                  viewBox="0 0 120 120"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: SEAL_SVG }}
                />
                <div className="orc-done-summary">
                  <span className="orc-kicker hand">Bitácora sellada</span>
                  <p>
                    Recorriste el istmo de la isla Laurie y viajaste desde Omond House (1903) hasta
                    la serie climática actual.{' '}
                    {recorded === 0
                      ? 'No anotaste la observación del día: podés volver al capítulo 2 antes de terminar.'
                      : `Tu observación de ${monthName}: ${obsScore} de ${recorded} lecturas dentro del margen.`}
                  </p>
                </div>
              </div>
              {recorded > 0 && (
                <div className="orc-done-sim">
                  <KindChip kind="sim" />
                  <span>El tiempo del día se sorteó dentro del clima real de {monthName}.</span>
                </div>
              )}
              {recorded > 0 && (
                <dl className="orc-done-readings" aria-label="Tu observación del día">
                  {READING_KINDS.map((kind) => {
                    const val = s.guesses[kind];
                    if (typeof val !== 'number') return null;
                    const status = checkGuess(kind, val, reading);
                    return (
                      <div key={kind}>
                        <dt>{NOTEBOOK_LABELS[kind].title}</dt>
                        <dd className="hand">{formatRecorded(kind, val, reading)}</dd>
                        <small>
                          {status === 'off'
                            ? `Fuera del margen: el instrumento marcaba ${formatRecorded(kind, truthFor(kind, reading), reading)}.`
                            : status === 'exact'
                              ? 'Lectura exacta.'
                              : 'Dentro del margen.'}
                        </small>
                      </div>
                    );
                  })}
                </dl>
              )}
              <FactList facts={chapterFacts} />
            </div>
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
            disabled={s.chapter !== 'done' && !canAdvance}
            onClick={() =>
              s.chapter === 'done' ? onLeave(true) : dispatch({ type: 'next' })
            }
          >
            {primaryButtonText(s.chapter, canAdvance)}
          </button>
        </div>
      </div>

      {s.panel && (
        <SourcesPanel
          chapter={s.chapter}
          onClose={() => dispatch({ type: 'closePanel' })}
          fallbackFocus={() => sourcesBtnRef.current}
        />
      )}
    </section>
  );
}
