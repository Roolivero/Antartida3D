import { useMemo, useRef } from 'react';
import {
  ORCADAS_ERAS,
  ORCADAS_FIRST_YEAR,
  eraAt,
  journeyFacts,
  recordSpanText,
} from '@antartida/core';
import { FactList } from './FactList.tsx';
import { KindChip } from './KindChip.tsx';
import { CenturySvg } from './century/CenturySvg.tsx';
import {
  computeCenturyDataset,
  formatSlope,
} from './century/centuryData.ts';
import { BUILDING_LABELS } from './time/timeMath.ts';

const DIGIT_STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function YearCounter({ year }: { year: number }) {
  const digits = String(year)
    .padStart(4, '0')
    .split('')
    .map((ch) => Number(ch) || 0);

  return (
    <div className="orc-year-counter" aria-label={`Año ${year}`}>
      <span className="orc-sr-only">{year}</span>
      <div className="orc-year-reels" aria-hidden="true">
        {digits.map((d, idx) => (
          <span key={idx} className="orc-digit-window">
            <span
              className="orc-digit-track"
              style={{ transform: `translate3d(0, -${d * 10}%, 0)` }}
            >
              {DIGIT_STRIP.map((n) => (
                <span key={n} className="orc-digit-cell">
                  {n}
                </span>
              ))}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Journey({
  year,
  maxYear,
  onYear,
}: {
  year: number;
  maxYear: number;
  onYear: (y: number) => void;
}) {
  const rulerRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  const safeMaxYear = Math.max(ORCADAS_FIRST_YEAR + 1, maxYear);
  const clampedYear = Math.max(ORCADAS_FIRST_YEAR, Math.min(safeMaxYear, Math.trunc(year)));
  const currentEra = eraAt(clampedYear);
  const eraIndex = ORCADAS_ERAS.findIndex((e) => e.id === currentEra.id);

  const eraFacts = useMemo(() => journeyFacts(clampedYear), [clampedYear]);
  const centuryData = useMemo(() => computeCenturyDataset(), []);

  const rulerGeom = useMemo(() => {
    const w = 336;
    const h = 84;
    const padL = 18;
    const padR = 18;
    const plotW = w - padL - padR;
    const span = Math.max(1, safeMaxYear - ORCADAS_FIRST_YEAR);

    const xOf = (yr: number) =>
      padL + ((Math.max(ORCADAS_FIRST_YEAR, Math.min(safeMaxYear, yr)) - ORCADAS_FIRST_YEAR) / span) * plotW;

    const ticks: { yr: number; x: number; major: boolean; medium: boolean }[] = [];
    for (let yr = ORCADAS_FIRST_YEAR; yr <= safeMaxYear; yr += 2) {
      const major = yr % 20 === 0 || yr === ORCADAS_FIRST_YEAR;
      const medium = yr % 10 === 0;
      ticks.push({ yr, x: xOf(yr), major, medium });
    }

    const eraSpans = ORCADAS_ERAS.map((era, i) => {
      const nextFrom = ORCADAS_ERAS[i + 1]?.fromYear ?? safeMaxYear;
      const x1 = xOf(era.fromYear);
      const x2 = xOf(nextFrom);
      return {
        id: era.id,
        fromYear: era.fromYear,
        title: era.title,
        illustrativeStart: era.illustrativeStart,
        x1,
        x2,
        width: Math.max(2, x2 - x1),
      };
    });

    return { w, h, padL, padR, plotW, span, xOf, ticks, eraSpans };
  }, [safeMaxYear]);

  const cursorX = rulerGeom.xOf(clampedYear);

  function yearFromClientX(clientX: number): number {
    const svg = rulerRef.current;
    if (!svg) return clampedYear;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return clampedYear;
    const svgX = ((clientX - rect.left) / rect.width) * rulerGeom.w;
    const ratio = (svgX - rulerGeom.padL) / rulerGeom.plotW;
    const rawYear = Math.round(ORCADAS_FIRST_YEAR + ratio * rulerGeom.span);
    return Math.max(ORCADAS_FIRST_YEAR, Math.min(safeMaxYear, rawYear));
  }

  return (
    <div className="orc-activity orc-eras">
      {/* Top Year Counter + Continuous Record Indicator */}
      <div className="orc-tm-top">
        <div className="orc-tm-year-block">
          <span className="orc-tm-kicker">Año en la estación</span>
          <YearCounter year={clampedYear} />
        </div>

        <div className="orc-tm-record-box">
          <KindChip kind="calc" />
          <strong className="orc-tm-record-num">
            {recordSpanText(clampedYear)}
          </strong>
        </div>
      </div>

      {/* Notebook Ruler Horizontal Slider */}
      <div
        className="orc-ruler-slider"
        role="slider"
        tabIndex={0}
        aria-label="Año en la estación"
        aria-valuemin={ORCADAS_FIRST_YEAR}
        aria-valuemax={safeMaxYear}
        aria-valuenow={clampedYear}
        aria-valuetext={`Año ${clampedYear}, ${currentEra.title}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onYear(Math.min(safeMaxYear, clampedYear + 1));
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onYear(Math.max(ORCADAS_FIRST_YEAR, clampedYear - 1));
          } else if (e.key === 'PageUp') {
            e.preventDefault();
            onYear(Math.min(safeMaxYear, clampedYear + 10));
          } else if (e.key === 'PageDown') {
            e.preventDefault();
            onYear(Math.max(ORCADAS_FIRST_YEAR, clampedYear - 10));
          } else if (e.key === 'Home') {
            e.preventDefault();
            onYear(ORCADAS_FIRST_YEAR);
          } else if (e.key === 'End') {
            e.preventDefault();
            onYear(safeMaxYear);
          }
        }}
        onPointerDown={(e) => {
          draggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          onYear(yearFromClientX(e.clientX));
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          onYear(yearFromClientX(e.clientX));
        }}
        onPointerUp={(e) => {
          if (draggingRef.current) {
            draggingRef.current = false;
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              // ignore
            }
          }
        }}
      >
        <svg
          ref={rulerRef}
          viewBox={`0 0 ${rulerGeom.w} ${rulerGeom.h}`}
          className="orc-ruler-svg"
          aria-hidden="true"
        >
          {/* Notebook wooden/brass ruler body */}
          <rect
            x="6"
            y="14"
            width={rulerGeom.w - 12}
            height="42"
            rx="5"
            fill="#EFE3CC"
            stroke="#1F2A36"
            strokeWidth="1.6"
          />

          {/* Era span color bars along top of ruler */}
          {rulerGeom.eraSpans.map((sp, idx) => {
            const isActive = sp.id === currentEra.id;
            return (
              <rect
                key={sp.id}
                x={sp.x1}
                y="15.5"
                width={sp.width}
                height="6"
                fill={
                  isActive
                    ? '#A4471F'
                    : idx % 2 === 0
                      ? '#7FA8C4'
                      : '#C0862F'
                }
                opacity={isActive ? 0.95 : 0.45}
              />
            );
          })}

          {/* Graduation millimeter/year ticks */}
          {rulerGeom.ticks.map((t) => {
            const tickH = t.major ? 14 : t.medium ? 10 : 6;
            return (
              <line
                key={t.yr}
                x1={t.x}
                y1={22}
                x2={t.x}
                y2={22 + tickH}
                stroke="#1F2A36"
                strokeWidth={t.major ? '1.2' : '0.7'}
                opacity={t.major || t.medium ? 0.85 : 0.45}
              />
            );
          })}

          {/* Era milestone notches and labels */}
          {rulerGeom.eraSpans.map((sp, i) => {
            const isActive = sp.id === currentEra.id;
            const labelY = 51 + (i <= 2 ? i : 0) * 10;
            return (
              <g key={sp.id}>
                <line
                  x1={sp.x1}
                  y1="14"
                  x2={sp.x1}
                  y2="42"
                  stroke={isActive ? '#A4471F' : '#1E3E5C'}
                  strokeWidth={isActive ? '1.8' : '1.2'}
                />
                <polygon
                  points={`${sp.x1},14 ${sp.x1 - 3.5},8 ${sp.x1 + 3.5},8`}
                  fill={isActive ? '#A4471F' : '#1E3E5C'}
                />
                <text
                  x={sp.x1}
                  y={labelY}
                  textAnchor={i === 0 ? 'start' : 'middle'}
                  fontSize="13"
                  fontWeight="800"
                  fill={isActive ? '#A4471F' : '#1F2A36'}
                >
                  {sp.illustrativeStart ? sp.title : sp.fromYear}
                </text>
              </g>
            );
          })}

          {/* End year label */}
          <text
            x={rulerGeom.w - rulerGeom.padR}
            y="51"
            textAnchor="end"
            fontSize="13"
            fontWeight="700"
            fill="#5E656C"
          >
            {safeMaxYear}
          </text>

          {/* Draggable vernier cursor */}
          <g transform={`translate(${cursorX.toFixed(1)}, 0)`}>
            <rect
              x="-16"
              y="2"
              width="32"
              height="62"
              fill="transparent"
            />
            <line
              x1="0"
              y1="8"
              x2="0"
              y2="56"
              stroke="#A4471F"
              strokeWidth="2.2"
            />
            <rect
              x="-8"
              y="22"
              width="16"
              height="16"
              rx="4"
              fill="#FBF4E6"
              stroke="#1F2A36"
              strokeWidth="1.8"
            />
            <circle cx="0" cy="30" r="2.8" fill="#A4471F" />
          </g>
        </svg>
      </div>

      {/* Era navigation buttons */}
      <div className="orc-era-nav-row">
        <button
          type="button"
          className="orc-era-step-btn"
          disabled={eraIndex <= 0}
          onClick={() => {
            if (eraIndex > 0) {
              onYear(ORCADAS_ERAS[eraIndex - 1].fromYear);
            }
          }}
        >
          ‹ Era anterior
        </button>

        <span className="orc-era-step-pos">
          Era {eraIndex + 1} de {ORCADAS_ERAS.length}
        </span>

        <button
          type="button"
          className="orc-era-step-btn"
          disabled={eraIndex >= ORCADAS_ERAS.length - 1}
          onClick={() => {
            if (eraIndex < ORCADAS_ERAS.length - 1) {
              onYear(ORCADAS_ERAS[eraIndex + 1].fromYear);
            }
          }}
        >
          Era siguiente ›
        </button>
      </div>

      <div className="orc-era-pills" role="group" aria-label="Hitos históricos">
        {ORCADAS_ERAS.map((era) => {
          const active = currentEra.id === era.id;
          return (
            <button
              key={era.id}
              type="button"
              className={`orc-era-btn${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onYear(era.fromYear)}
            >
              <span>{era.illustrativeStart ? era.title : era.fromYear}</span>
            </button>
          );
        })}
      </div>

      {/* Annual Series Chart from CenturySvg */}
      <div className="orc-century-chart-block">
        <CenturySvg
          data={centuryData}
          selectedYear={clampedYear}
          onSelectYear={onYear}
        />

        <div className="orc-century-legend-block">
          <div className="orc-century-legend-items" aria-label="Referencias del gráfico anual">
            <span className="orc-legend-item">
              <i className="orc-swatch orc-swatch-annual" aria-hidden="true" />
              Media anual real
            </span>
            <span className="orc-legend-item">
              <i className="orc-swatch orc-swatch-ma11" aria-hidden="true" />
              Media móvil 11 años
            </span>
            <span className="orc-legend-item">
              <i className="orc-swatch orc-swatch-trend" aria-hidden="true" />
              Recta de tendencia
            </span>
            <span className="orc-legend-item">
              <i className="orc-swatch orc-swatch-gap" aria-hidden="true" />
              Año incompleto (hueco)
            </span>
          </div>

          {centuryData.trendSegments.length > 0 && (
            <div className="orc-century-trend-banner">
              <div className="orc-century-trend-copy">
                <strong>
                  Recta de tendencia:{' '}
                  {centuryData.trendSegments
                    .map((seg) => `${seg.fromYear}–${seg.toYear}: ${formatSlope(seg.slopePerDecade)}`)
                    .join(' · ')}
                </strong>
                <span>
                  Si la tendencia es significativa lo dice el estudio citado (Zazulie,
                  Rusticucci y Solomon, 2010), no este cálculo.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Era Card */}
      <article className="orc-era-card" aria-live="polite">
        <div className="orc-era-head">
          <div className="orc-era-head-top">
            <span className="orc-era-from">
              {currentEra.illustrativeStart ? currentEra.title : `Desde ${currentEra.fromYear}`}
            </span>
            {currentEra.illustrativeStart ? (
              <KindChip kind="recon" label="Fecha ilustrativa" />
            ) : (
              <KindChip kind="recon" label="Diorama de época" />
            )}
          </div>
          <h3>{currentEra.title}</h3>
        </div>

        <p className="orc-era-summary">{currentEra.summary}</p>

        <div className="orc-era-buildings" aria-label="Construcciones en escena">
          {currentEra.buildings.map((bId) => (
            <span key={bId} className="orc-building-tag">
              {BUILDING_LABELS[bId]}
            </span>
          ))}
        </div>

        {/* Fact cards of active era */}
        <FactList facts={eraFacts} />
      </article>
    </div>
  );
}
