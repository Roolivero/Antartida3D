import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MONTH_NAMES,
  ORCADAS_CLIMATE,
  ORCADAS_FAUNA,
  ORCADAS_LAT,
  ORCADAS_SOURCES,
  dayLengthHours,
  factsFor,
  midMonthDayOfYear,
  prefersReducedMotion,
  seaIceAt,
  solarElevationDeg,
  sourcesOf,
} from '@antartida/core';
import { KindChip } from './KindChip.tsx';
import { FaunaSketchIcon } from './time/FaunaIcons.tsx';
import { SunArc } from './time/SunArc.tsx';
import {
  MONTH_SHORT,
  angleDegFromTop,
  annularSectorPath,
  formatHoursMinutes,
  formatSignedTemp,
  polarFromTop,
  seaIceDescription,
  seasonForMonth,
} from './time/timeMath.ts';

export function YearWheel({
  month,
  hour,
  onMonth,
  onHour,
}: {
  month: number;
  hour: number;
  onMonth: (m: number) => void;
  onHour: (h: number) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const monthRef = useRef(month);
  monthRef.current = month;

  const wheelSvgRef = useRef<SVGSVGElement>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startAngle: number;
    startMonth: number;
    didDrag: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    if (prefersReducedMotion()) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setInterval(() => {
      const next = (monthRef.current % 12) + 1;
      onMonth(next);
    }, 650);
    return () => window.clearInterval(timer);
  }, [isPlaying, onMonth]);

  const normMonth = (((month - 1) % 12) + 12) % 12 + 1;
  const monthName = MONTH_NAMES[normMonth - 1] ?? 'enero';
  const seasonName = seasonForMonth(normMonth);
  const doy = midMonthDayOfYear(normMonth);
  const daylight = dayLengthHours(ORCADAS_LAT, doy);
  const sunElev = solarElevationDeg(ORCADAS_LAT, doy, hour);
  const iceFraction = seaIceAt(normMonth);
  const icePct = Math.round(iceFraction * 100);
  const climate = ORCADAS_CLIMATE[normMonth - 1] ?? ORCADAS_CLIMATE[0];
  const readerSource = useMemo(
    () => ORCADAS_SOURCES.find((s) => s.id === 'reader'),
    []
  );
  const activeFauna = useMemo(
    () => ORCADAS_FAUNA.filter((a) => a.months.includes(normMonth)),
    [normMonth]
  );
  const publishableYearFacts = useMemo(() => factsFor('year'), []);

  // Precompute all 12 sectors for the SVG wheel
  const sectors = useMemo(() => {
    const cx = 115;
    const cy = 115;
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const centerDeg = i * 30;
      const startDeg = centerDeg - 14.4;
      const endDeg = centerDeg + 14.4;
      const mDoy = midMonthDayOfYear(m);
      const mDaylight = dayLengthHours(ORCADAS_LAT, mDoy);
      const mIce = seaIceAt(m);
      const mFauna = ORCADAS_FAUNA.filter((a) => a.months.includes(m));

      // Outer month label ring (82..104)
      const labelBandPath = annularSectorPath(cx, cy, 82, 104, startDeg, endDeg);
      const labelPos = polarFromTop(cx, cy, 93, centerDeg);

      // Daylight ring (63..81): inner radius grows with daylight hours
      const daylightBgPath = annularSectorPath(cx, cy, 63, 81, startDeg, endDeg);
      const dlOuter = 63 + (mDaylight / 24) * 18;
      const daylightFillPath = annularSectorPath(cx, cy, 63, dlOuter, startDeg, endDeg);

      // Sea-ice ring (47..62)
      const iceBgPath = annularSectorPath(cx, cy, 47, 62, startDeg, endDeg);
      const iceOuter = 47 + mIce * 15;
      const iceFillPath = mIce > 0 ? annularSectorPath(cx, cy, 47, iceOuter, startDeg, endDeg) : '';

      // Fauna dots along radius 54.5 / 60
      const faunaDots = mFauna.map((animal, idx) => {
        const count = mFauna.length;
        const spread = Math.min(22, count * 4.2);
        const offsetDeg = count === 1 ? 0 : -spread / 2 + (idx / (count - 1)) * spread;
        const pos = polarFromTop(cx, cy, 43, centerDeg + offsetDeg);
        return { id: animal.id, x: pos.x, y: pos.y };
      });

      return {
        m,
        short: MONTH_SHORT[i],
        name: MONTH_NAMES[i],
        centerDeg,
        labelBandPath,
        labelPos,
        daylightBgPath,
        daylightFillPath,
        iceBgPath,
        iceFillPath,
        mIce,
        faunaDots,
      };
    });
  }, []);

  const wheelRotationDeg = -(normMonth - 1) * 30;

  function svgCoordsFromEvent(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = wheelSvgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 230,
      y: ((clientY - rect.top) / rect.height) * 230,
    };
  }

  function handlePlayYearClick() {
    if (prefersReducedMotion()) {
      onMonth((normMonth % 12) + 1);
      return;
    }
    setIsPlaying((prev) => !prev);
  }

  return (
    <div className="orc-activity orc-year">
      <div className="orc-time-header">
        <div>
          <p className="orc-time-question hand">
            ¿Cómo es pasar un invierno entero en Orcadas?
          </p>
          <span className="orc-time-sub">
            Girá la rueda de meses o mové el sol para ver cómo cambian la luz, el hielo y la vida.
          </span>
        </div>
        <button
          type="button"
          className={`orc-play-year-btn${isPlaying ? ' is-playing' : ''}`}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? 'Pausar recorrido del año' : 'Pasar el año'}
          onClick={handlePlayYearClick}
        >
          <span className="orc-play-ico" aria-hidden="true">
            {isPlaying ? '❚❚' : '▸'}
          </span>
          <span>{isPlaying ? 'Pausar el año' : 'Pasar el año'}</span>
        </button>
      </div>

      {/* Circular Year Wheel + Legend */}
      <div className="orc-wheel-layout">
        <div
          className="orc-wheel-focus"
          role="slider"
          tabIndex={0}
          aria-label="Rueda del año: mes en Orcadas"
          aria-valuemin={1}
          aria-valuemax={12}
          aria-valuenow={normMonth}
          aria-valuetext={monthName}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              setIsPlaying(false);
              onMonth((normMonth % 12) + 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              setIsPlaying(false);
              onMonth(((normMonth - 2 + 12) % 12) + 1);
            } else if (e.key === 'Home') {
              e.preventDefault();
              setIsPlaying(false);
              onMonth(1);
            } else if (e.key === 'End') {
              e.preventDefault();
              setIsPlaying(false);
              onMonth(12);
            }
          }}
          onPointerDown={(e) => {
            const pt = svgCoordsFromEvent(e.clientX, e.clientY);
            if (!pt) return;
            setIsPlaying(false);
            e.currentTarget.setPointerCapture(e.pointerId);
            dragStateRef.current = {
              active: true,
              startX: pt.x,
              startY: pt.y,
              startAngle: angleDegFromTop(115, 115, pt.x, pt.y),
              startMonth: normMonth,
              didDrag: false,
            };
          }}
          onPointerMove={(e) => {
            const st = dragStateRef.current;
            if (!st || !st.active) return;
            const pt = svgCoordsFromEvent(e.clientX, e.clientY);
            if (!pt) return;
            const dist = Math.hypot(pt.x - st.startX, pt.y - st.startY);
            if (dist > 5) {
              st.didDrag = true;
            }
            if (st.didDrag) {
              const curAngle = angleDegFromTop(115, 115, pt.x, pt.y);
              let diff = curAngle - st.startAngle;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              const stepDelta = Math.round(diff / 28);
              const targetMonth = (((st.startMonth - 1 - stepDelta) % 12) + 12) % 12 + 1;
              if (targetMonth !== normMonth) {
                onMonth(targetMonth);
              }
            }
          }}
          onPointerUp={(e) => {
            const st = dragStateRef.current;
            if (!st) return;
            dragStateRef.current = null;
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              // ignore
            }
            if (!st.didDrag) {
              const pt = svgCoordsFromEvent(e.clientX, e.clientY);
              if (!pt) return;
              const r = Math.hypot(pt.x - 115, pt.y - 115);
              if (r >= 34) {
                const clickAngle = angleDegFromTop(115, 115, pt.x, pt.y);
                const sectorOffset = Math.round(clickAngle / 30);
                const clickedMonth = (((st.startMonth - 1 + sectorOffset) % 12) + 12) % 12 + 1;
                onMonth(clickedMonth);
              }
            }
          }}
        >
          <svg
            ref={wheelSvgRef}
            viewBox="0 0 230 230"
            className="orc-wheel-svg"
            aria-hidden="true"
          >
            {/* Outer compass bezel */}
            <circle
              cx="115"
              cy="115"
              r="107"
              fill="#FBF4E6"
              stroke="#1F2A36"
              strokeWidth="2"
            />

            {/* Rotating wheel group: chosen month rotates to 12 o'clock (top) */}
            <g
              className="orc-wheel-rotor"
              transform={`rotate(${wheelRotationDeg} 115 115)`}
            >
              {sectors.map((sec) => {
                const isSelected = sec.m === normMonth;
                return (
                  <g key={sec.m}>
                    {/* Month outer band */}
                    <path
                      d={sec.labelBandPath}
                      fill={isSelected ? '#1F2A36' : '#F3EBDD'}
                      stroke="#1F2A36"
                      strokeWidth={isSelected ? '1.6' : '0.9'}
                    />
                    <text
                      x={sec.labelPos.x}
                      y={sec.labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${sec.centerDeg} ${sec.labelPos.x.toFixed(1)} ${sec.labelPos.y.toFixed(1)})`}
                      fontSize="9"
                      fontWeight="800"
                      fill={isSelected ? '#F7FAFB' : '#1F2A36'}
                    >
                      {sec.short}
                    </text>

                    {/* Ring 1: Daylight hours (night indigo base + golden sun fill) */}
                    <path
                      d={sec.daylightBgPath}
                      fill="#1E3E5C"
                      stroke="#1F2A36"
                      strokeWidth="0.6"
                    />
                    <path
                      d={sec.daylightFillPath}
                      fill={isSelected ? '#A4471F' : '#C0862F'}
                    />

                    {/* Ring 2: Bay sea ice (open water base + glacier pack-ice fill) */}
                    <path
                      d={sec.iceBgPath}
                      fill="#7FA8C4"
                      stroke="#1F2A36"
                      strokeWidth="0.6"
                    />
                    {sec.iceFillPath && (
                      <path
                        d={sec.iceFillPath}
                        fill="#F7FAFB"
                        stroke="#1E3E5C"
                        strokeWidth="0.6"
                      />
                    )}

                    {/* Ring 3: Fauna presence pips */}
                    {sec.faunaDots.map((dot) => (
                      <circle
                        key={dot.id}
                        cx={dot.x}
                        cy={dot.y}
                        r={isSelected ? '2.1' : '1.6'}
                        fill={isSelected ? '#A4471F' : '#1F2A36'}
                      />
                    ))}
                  </g>
                );
              })}

              {/* Inner fauna track ring border */}
              <circle
                cx="115"
                cy="115"
                r="39"
                fill="#FBF4E6"
                stroke="#1F2A36"
                strokeWidth="1.4"
              />
            </g>

            {/* Fixed top pointer needle indicating active month at 12 o'clock */}
            <polygon
              points="115,13 109,2 121,2"
              fill="#A4471F"
              stroke="#1F2A36"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />

            {/* Fixed upright center hub */}
            <circle
              cx="115"
              cy="115"
              r="37"
              fill="#FBF4E6"
              stroke="#1F2A36"
              strokeWidth="1.5"
            />
            <text
              x="115"
              y="103"
              textAnchor="middle"
              fontFamily="'Fraunces', Georgia, serif"
              fontSize="13.5"
              fontWeight="700"
              fill="#1F2A36"
            >
              {monthName}
            </text>
            <text
              x="115"
              y="116"
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="700"
              fill="#1E3E5C"
            >
              {seasonName}
            </text>
            <text
              x="115"
              y="129"
              textAnchor="middle"
              fontSize="8.8"
              fontWeight="700"
              fill="#A4471F"
            >
              {formatSignedTemp(climate.tempMeanC)} °C · {icePct} %
            </text>
          </svg>
        </div>

        {/* Ring legend + quick month step buttons */}
        <div className="orc-wheel-side">
          <div className="orc-wheel-stepper" role="group" aria-label="Cambiar mes">
            <button
              type="button"
              className="orc-step-month-btn"
              aria-label="Mes anterior"
              onClick={() => {
                setIsPlaying(false);
                onMonth(((normMonth - 2 + 12) % 12) + 1);
              }}
            >
              ‹
            </button>
            <div className="orc-step-month-Readout">
              <strong className="serif">{monthName}</strong>
              <span>Mes {normMonth} de 12</span>
            </div>
            <button
              type="button"
              className="orc-step-month-btn"
              aria-label="Mes siguiente"
              onClick={() => {
                setIsPlaying(false);
                onMonth((normMonth % 12) + 1);
              }}
            >
              ›
            </button>
          </div>

          <ul className="orc-ring-legend" aria-label="Anillos de la rueda">
            <li>
              <span className="orc-swatch orc-swatch-sun" aria-hidden="true" />
              <span>
                <strong>Anillo solar:</strong> {formatHoursMinutes(daylight)}
              </span>
            </li>
            <li>
              <span className="orc-swatch orc-swatch-ice" aria-hidden="true" />
              <span>
                <strong>Anillo bahía:</strong> {icePct} % hielo marino
              </span>
            </li>
            <li>
              <span className="orc-swatch orc-swatch-fauna" aria-hidden="true" />
              <span>
                <strong>Marcas fauna:</strong> {activeFauna.length} especies
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* 24-hour Solar Elevation Arc with draggable sun & night stars */}
      <SunArc
        month={normMonth}
        hour={hour}
        monthName={monthName}
        onHour={onHour}
      />

      {/* Clear readings with KindChips and verified sources */}
      <div className="orc-year-readings" role="status" aria-live="polite">
        {/* 1. Calculated daylight reading */}
        <article className="orc-reading-card">
          <div className="orc-reading-top">
            <KindChip kind="calc" />
            <span className="orc-reading-kicker">Fotoperíodo a 60° 44′ S</span>
          </div>
          <p className="orc-reading-main">
            En {monthName} el día dura <strong>{formatHoursMinutes(daylight)}</strong>
          </p>
          <span className="orc-reading-sub">
            {daylight.toFixed(1)} h de luz · Altura del sol a las{' '}
            {String(hour).padStart(2, '0')}:00 h: {sunElev.toFixed(1)}°
          </span>
        </article>

        {/* 2. Real monthly temperature reading from ORCADAS_CLIMATE */}
        <article className="orc-reading-card">
          <div className="orc-reading-top">
            <KindChip kind="real" />
            <span className="orc-reading-kicker">Climatología mensual</span>
          </div>
          <p className="orc-reading-main">
            Temperatura media de {monthName}:{' '}
            <strong>{formatSignedTemp(climate.tempMeanC)} °C</strong>
          </p>
          <span className="orc-reading-sub">
            Desvío típico ±{climate.tempSdC.toFixed(1).replace('.', ',')} °C · Viento medio{' '}
            {Math.round(climate.windMeanKmh)} km/h
          </span>
          {readerSource && (
            <small className="orc-fact-src">
              Fuente: {readerSource.label} ({readerSource.org})
            </small>
          )}
        </article>

        {/* 3. Simulated sea ice & fauna reading */}
        <article className="orc-reading-card">
          <div className="orc-reading-top">
            <KindChip kind="sim" />
            <span className="orc-reading-kicker">Bahía Scotia y costa</span>
          </div>
          <p className="orc-reading-main">
            Hielo marino: <strong>{icePct} % cubierto</strong> · {seaIceDescription(iceFraction)}
          </p>
          <div className="orc-fauna-tags" aria-label={`Fauna presente en ${monthName}`}>
            {activeFauna.map((animal) => (
              <span key={animal.id} className="orc-fauna-pill">
                <FaunaSketchIcon id={animal.id} />
                <span>{animal.name}</span>
              </span>
            ))}
          </div>
        </article>
      </div>

      {/* Publishable facts for 'year' chapter */}
      <div className="orc-facts-list orc-inline-facts">
        {publishableYearFacts.map((fact) => {
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
    </div>
  );
}
