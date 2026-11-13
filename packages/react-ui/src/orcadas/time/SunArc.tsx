import { useMemo, useRef } from 'react';
import {
  ORCADAS_LAT,
  dayLengthHours,
  midMonthDayOfYear,
  solarElevationDeg,
} from '@antartida/core';
import { formatSolarClock, sunriseSunsetHours } from './timeMath.ts';

const STAR_COORDS = [
  { x: 26, y: 18, r: 1.3 },
  { x: 48, y: 31, r: 1.0 },
  { x: 64, y: 14, r: 1.4 },
  { x: 78, y: 24, r: 1.1 },
  // Cruz del Sur (Southern Cross)
  { x: 256, y: 14, r: 1.5 },
  { x: 256, y: 29, r: 1.5 },
  { x: 249, y: 21, r: 1.3 },
  { x: 263, y: 20, r: 1.2 },
  { x: 288, y: 16, r: 1.4 },
  { x: 302, y: 28, r: 1.1 },
] as const;

export function SunArc({
  month,
  hour,
  monthName,
  onHour,
}: {
  month: number;
  hour: number;
  monthName: string;
  onHour: (h: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  const doy = midMonthDayOfYear(month);
  const daylight = dayLengthHours(ORCADAS_LAT, doy);
  const { sunrise, sunset } = sunriseSunsetHours(daylight);
  const currentElev = solarElevationDeg(ORCADAS_LAT, doy, hour);
  const isNight = currentElev < -0.833;

  const geom = useMemo(() => {
    const w = 324;
    const h = 104;
    const padL = 22;
    const padR = 22;
    const padT = 14;
    const padB = 18;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const minDeg = -56;
    const maxDeg = 56;

    const xOf = (hr: number) => padL + (Math.max(0, Math.min(24, hr)) / 24) * plotW;
    const yOf = (deg: number) =>
      padT + ((maxDeg - Math.max(minDeg, Math.min(maxDeg, deg))) / (maxDeg - minDeg)) * plotH;

    const horizonY = yOf(0);

    const samples: { hr: number; x: number; y: number; deg: number }[] = [];
    const steps = 96;
    for (let i = 0; i <= steps; i++) {
      const hr = (i / steps) * 24;
      const deg = solarElevationDeg(ORCADAS_LAT, doy, hr);
      samples.push({ hr, x: xOf(hr), y: yOf(deg), deg });
    }

    const fullPath = samples
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const daySamples = samples.filter((p) => p.hr >= sunrise && p.hr <= sunset);
    const sunriseX = xOf(sunrise);
    const sunsetX = xOf(sunset);

    let dayAreaPath = '';
    let dayArcPath = '';
    if (daySamples.length >= 2) {
      dayArcPath = [
        `M ${sunriseX.toFixed(1)} ${horizonY.toFixed(1)}`,
        ...daySamples.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
        `L ${sunsetX.toFixed(1)} ${horizonY.toFixed(1)}`,
      ].join(' ');
      dayAreaPath = `${dayArcPath} Z`;
    }

    return {
      w,
      h,
      padL,
      padR,
      plotW,
      horizonY,
      fullPath,
      dayArcPath,
      dayAreaPath,
      sunriseX,
      sunsetX,
      xOf,
      yOf,
    };
  }, [doy, sunrise, sunset]);

  const sunX = geom.xOf(hour);
  const sunY = geom.yOf(currentElev);
  const sunriseLabel = formatSolarClock(sunrise);
  const sunsetLabel = formatSolarClock(sunset);

  function hourFromClientX(clientX: number): number {
    const svg = svgRef.current;
    if (!svg) return hour;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return hour;
    const svgX = ((clientX - rect.left) / rect.width) * geom.w;
    const ratio = (svgX - geom.padL) / geom.plotW;
    const rawHour = Math.round(ratio * 23);
    return Math.max(0, Math.min(23, rawHour));
  }

  return (
    <div className={`orc-sunarc-box${isNight ? ' is-night' : ' is-day'}`}>
      <div className="orc-sunarc-head">
        <span className="orc-sunarc-title">
          Arco del sol ({monthName}) · <strong>{String(hour).padStart(2, '0')}:00 h</strong>
        </span>
        <span className="orc-sunarc-elev">
          {isNight ? 'Noche estrellada' : 'Sol sobre el horizonte'} ({currentElev >= 0 ? '+' : ''}
          {currentElev.toFixed(1)}°)
        </span>
      </div>

      <div
        className="orc-sunarc-slider"
        role="slider"
        tabIndex={0}
        aria-label="Hora solar"
        aria-valuemin={0}
        aria-valuemax={23}
        aria-valuenow={hour}
        aria-valuetext={`${String(hour).padStart(2, '0')}:00 horas, ${
          isNight ? 'noche' : 'día'
        }, altura solar ${currentElev.toFixed(1)} grados`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onHour(Math.min(23, hour + 1));
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onHour(Math.max(0, hour - 1));
          } else if (e.key === 'Home') {
            e.preventDefault();
            onHour(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            onHour(23);
          }
        }}
        onPointerDown={(e) => {
          draggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          onHour(hourFromClientX(e.clientX));
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          onHour(hourFromClientX(e.clientX));
        }}
        onPointerUp={(e) => {
          if (draggingRef.current) {
            draggingRef.current = false;
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              // ignore if not captured
            }
          }
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${geom.w} ${geom.h}`}
          className="orc-sunarc-svg"
          aria-hidden="true"
        >
          {/* Sky background above horizon */}
          <rect
            x={geom.padL}
            y={8}
            width={geom.plotW}
            height={geom.horizonY - 8}
            rx={6}
            fill={isNight ? '#192B3E' : '#EFE3CC'}
          />

          {/* Below-horizon night band */}
          <rect
            x={geom.padL}
            y={geom.horizonY}
            width={geom.plotW}
            height={geom.h - 14 - geom.horizonY}
            rx={4}
            fill="#1D3146"
          />

          {/* Stars (visible in night band and across upper sky at night) */}
          <g className="orc-sunarc-stars" opacity={isNight ? 0.95 : 0.3}>
            {STAR_COORDS.map((st, idx) => (
              <circle
                key={idx}
                cx={st.x}
                cy={st.y}
                r={st.r}
                fill={isNight ? '#F7FAFB' : '#7FA8C4'}
              />
            ))}
            {/* Southern Cross axis ticks */}
            <line
              x1="256"
              y1="14"
              x2="256"
              y2="29"
              stroke="#F7FAFB"
              strokeWidth="0.6"
              opacity={isNight ? 0.65 : 0.15}
            />
            <line
              x1="249"
              y1="21"
              x2="263"
              y2="20"
              stroke="#F7FAFB"
              strokeWidth="0.6"
              opacity={isNight ? 0.65 : 0.15}
            />
          </g>

          {/* Golden daylight fill under the sun curve */}
          {geom.dayAreaPath && (
            <path d={geom.dayAreaPath} fill="rgba(192, 134, 47, 0.28)" />
          )}

          {/* Horizon line (0 deg) */}
          <line
            x1={geom.padL}
            y1={geom.horizonY}
            x2={geom.w - geom.padR}
            y2={geom.horizonY}
            stroke={isNight ? '#7FA8C4' : '#1F2A36'}
            strokeWidth="1.4"
          />
          <text
            x={geom.padL + 4}
            y={geom.horizonY - 5}
            fontSize="13"
            fontWeight="700"
            fill={isNight ? '#D6E5EF' : '#1F2A36'}
          >
            Horizonte 0°
          </text>

          {/* Full 24h elevation curve (dashed below horizon) */}
          <path
            d={geom.fullPath}
            fill="none"
            stroke="#7FA8C4"
            strokeWidth="1.4"
            strokeDasharray="3 2.5"
          />

          {/* Daylight arc above horizon */}
          {geom.dayArcPath && (
            <path
              d={geom.dayArcPath}
              fill="none"
              stroke="#C0862F"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          )}

          {/* Sunrise & Sunset markers on horizon */}
          <g className="orc-sunarc-markers">
            <circle
              cx={geom.sunriseX}
              cy={geom.horizonY}
              r="3.2"
              fill="#C0862F"
              stroke="#1F2A36"
              strokeWidth="1.2"
            />
            <circle
              cx={geom.sunsetX}
              cy={geom.horizonY}
              r="3.2"
              fill="#A4471F"
              stroke="#1F2A36"
              strokeWidth="1.2"
            />
          </g>

          {/* Vertical guide for selected hour */}
          <line
            x1={sunX}
            y1={10}
            x2={sunX}
            y2={geom.h - 14}
            stroke={isNight ? '#7FA8C4' : '#A4471F'}
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* Draggable Sun / Night-Sun token */}
          <g transform={`translate(${sunX.toFixed(1)}, ${sunY.toFixed(1)})`}>
            <circle cx="0" cy="0" r="18" fill="transparent" />
            {!isNight ? (
              <>
                <circle
                  cx="0"
                  cy="0"
                  r="10.5"
                  fill="rgba(192, 134, 47, 0.25)"
                />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  return (
                    <line
                      key={deg}
                      x1={Math.cos(rad) * 7.2}
                      y1={Math.sin(rad) * 7.2}
                      x2={Math.cos(rad) * 10.2}
                      y2={Math.sin(rad) * 10.2}
                      stroke="#A4471F"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  );
                })}
                <circle
                  cx="0"
                  cy="0"
                  r="6"
                  fill="#C0862F"
                  stroke="#1F2A36"
                  strokeWidth="1.6"
                />
              </>
            ) : (
              <>
                <circle
                  cx="0"
                  cy="0"
                  r="8.5"
                  fill="rgba(127, 168, 196, 0.22)"
                />
                <circle
                  cx="0"
                  cy="0"
                  r="5.5"
                  fill="#1E3E5C"
                  stroke="#F7FAFB"
                  strokeWidth="1.5"
                />
                <circle cx="1.8" cy="-1.5" r="1.2" fill="#F7FAFB" />
              </>
            )}
          </g>

          {/* Hour ticks along bottom */}
          {[0, 6, 12, 18, 24].map((hr) => {
            const x = geom.xOf(hr);
            return (
              <text
                key={hr}
                x={x}
                y={geom.h - 3}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fill="#2B3640"
              >
                {String(hr).padStart(2, '0')}h
              </text>
            );
          })}
        </svg>
      </div>

      <div className="orc-sunarc-foot">
        <span>
          Salida: <strong>{sunriseLabel}</strong>
        </span>
        <span>Mediodía: {(solarElevationDeg(ORCADAS_LAT, doy, 12)).toFixed(1)}°</span>
        <span>
          Puesta: <strong>{sunsetLabel}</strong>
        </span>
      </div>
    </div>
  );
}
