import { useRef } from 'react';
import { ORCADAS_ANNUAL_TEMP } from '@antartida/core';
import {
  buildMissingSpans,
  buildSegmentedPaths,
  formatSlope,
  formatTempC,
  stripeColorForAnomaly,
  type CenturyViewId,
  type computeCenturyDataset,
} from './centuryData.ts';

type Dataset = ReturnType<typeof computeCenturyDataset>;

export function CenturySvg({
  view,
  data,
  selectedYear,
  onSelectYear,
  userTempC,
}: {
  view: CenturyViewId;
  data: Dataset;
  selectedYear: number;
  onSelectYear: (year: number) => void;
  userTempC?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hasUserTemp = typeof userTempC === 'number' && Number.isFinite(userTempC);

  const W = 380;
  const H = 214;
  const padL = 36;
  const padR = view === 'month' && hasUserTemp ? 68 : 14;
  const padT = 18;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const yearSpan = Math.max(1, data.lastYear - data.firstYear);
  const xOfYear = (yr: number) => padL + ((yr - data.firstYear) / yearSpan) * plotW;
  const yearStepW = plotW / data.totalYears;

  const handlePointerYear = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * W;
    const clampedX = Math.max(padL, Math.min(padL + plotW, svgX));
    const ratio = (clampedX - padL) / plotW;
    const yr = Math.round(data.firstYear + ratio * yearSpan);
    onSelectYear(Math.max(data.firstYear, Math.min(data.lastYear, yr)));
  };

  // Annual view Y scale (-7.8 to -0.8 °C)
  const annMinY = -7.6;
  const annMaxY = -0.8;
  const yOfAnnual = (val: number) =>
    padT + plotH - ((val - annMinY) / (annMaxY - annMinY)) * plotH;

  // Month view dynamic Y scale including coldest, warmest, mean, and userTempC
  let mMin = Math.min(data.coldestMonth.value, data.monthClimate.tempMeanC);
  let mMax = Math.max(data.warmestMonth.value, data.monthClimate.tempMeanC);
  if (hasUserTemp) {
    mMin = Math.min(mMin, userTempC);
    mMax = Math.max(mMax, userTempC);
  }
  const mSpan = Math.max(4, mMax - mMin);
  const monthMinY = mMin - mSpan * 0.18;
  const monthMaxY = mMax + mSpan * 0.22;
  const yOfMonth = (val: number) =>
    padT + plotH - ((val - monthMinY) / (monthMaxY - monthMinY)) * plotH;

  const annualPaths = buildSegmentedPaths(ORCADAS_ANNUAL_TEMP, xOfYear, yOfAnnual);
  const ma11Paths = buildSegmentedPaths(data.ma11Series, xOfYear, yOfAnnual);
  const annualMissing = buildMissingSpans(ORCADAS_ANNUAL_TEMP);

  const monthPaths = buildSegmentedPaths(data.monthSeries, xOfYear, yOfMonth);
  const monthMissing = buildMissingSpans(data.monthSeries);

  const selectedRecord = data.recordsByYear.get(selectedYear) ?? data.records[0];
  const cursorX = xOfYear(selectedYear);

  const xTicks = [data.firstYear, 1930, 1960, 1990, data.lastYear];

  const ariaLabel =
    view === 'annual'
      ? `Gráfico año por año de temperatura media anual en Orcadas (${data.firstYear} a ${data.lastYear}), con media móvil de 11 años y tendencia en dos tramos.`
      : view === 'stripes'
        ? `Gráfico de franjas climáticas de Orcadas (${data.firstYear} a ${data.lastYear}) según la anomalía respecto de la media del siglo.`
        : `Gráfico histórico del mes de ${data.monthName} en Orcadas (${data.firstYear} a ${data.lastYear}), con récords de frío y calor${hasUserTemp ? ' y tu observación simulada separada' : ''}.`;

  // Month view nice ticks (3 ticks)
  const monthMidTick = Math.round(((mMin + mMax) / 2) * 2) / 2;
  const monthTopTick = Math.round(mMax * 2) / 2;
  const monthBotTick = Math.round(mMin * 2) / 2;
  const monthTicks = Array.from(new Set([monthTopTick, monthMidTick, monthBotTick]));

  return (
    <div className="orc-century-svg-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`orc-century-svg is-view-${view}`}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={(e) => {
          handlePointerYear(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) {
            handlePointerYear(e.clientX);
          }
        }}
      >
        <defs>
          <pattern
            id="orc-century-hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <rect width="6" height="6" fill="#E8E1D3" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#5E656C" strokeWidth="1.6" strokeOpacity="0.65" />
          </pattern>
        </defs>

        {/* Notebook plate background frame */}
        <rect
          x={padL}
          y={padT}
          width={plotW}
          height={plotH}
          rx="4"
          fill="#FAF4E8"
          stroke="#1F2A36"
          strokeOpacity="0.28"
          strokeWidth="1"
        />

        {/* ==================== VIEW 1: ANNUAL ==================== */}
        {view === 'annual' && (
          <g className="orc-layer-annual">
            {/* Y-axis grid lines & labels */}
            {[-2, -4, -6].map((tick) => {
              const y = yOfAnnual(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={padL + plotW}
                    y2={y}
                    stroke="#5E656C"
                    strokeOpacity="0.3"
                    strokeDasharray="2.5 2.5"
                    strokeWidth="0.8"
                  />
                  <text
                    x={padL - 5}
                    y={y + 3.5}
                    textAnchor="end"
                    className="orc-svg-axis-txt"
                  >
                    {tick} °C
                  </text>
                </g>
              );
            })}

            {/* Incomplete years: visible hatched gaps (no interpolation) */}
            {annualMissing.map((span) => {
              const x1 = Math.max(padL, xOfYear(span.startYear) - yearStepW * 0.48);
              const x2 = Math.min(padL + plotW, xOfYear(span.endYear) + yearStepW * 0.48);
              return (
                <g key={`gap-${span.startYear}`}>
                  <rect
                    x={x1}
                    y={padT + 1}
                    width={Math.max(2.2, x2 - x1)}
                    height={plotH - 2}
                    fill="url(#orc-century-hatch)"
                    stroke="#5E656C"
                    strokeOpacity="0.45"
                    strokeWidth="0.6"
                  />
                </g>
              );
            })}

            {/* 11-year moving average: watercolor wash + core stroke */}
            {ma11Paths.map((d, idx) => (
              <g key={`ma11-${idx}`}>
                <path
                  d={d}
                  fill="none"
                  stroke="#7FA8C4"
                  strokeOpacity="0.42"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  className="orc-century-draw-path"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="#1E3E5C"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  className="orc-century-draw-path"
                />
              </g>
            ))}

            {/* Segmented trend lines across the series */}
            {data.trendSegments.length > 0 && (
              <g className="orc-layer-trend">
                {data.trendSegments.map((seg, idx) => {
                  const x1 = xOfYear(seg.fromYear);
                  const y1 = yOfAnnual(
                    seg.intercept + (seg.slopePerDecade / 10) * seg.fromYear
                  );
                  const x2 = xOfYear(seg.toYear);
                  const y2 = yOfAnnual(
                    seg.intercept + (seg.slopePerDecade / 10) * seg.toYear
                  );
                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2;
                  return (
                    <g key={`trend-seg-${idx}`}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#A4471F"
                        strokeWidth="1.7"
                        strokeDasharray="5 3.5"
                      />
                      <text
                        x={midX}
                        y={midY - 6}
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="700"
                        fill="#A4471F"
                      >
                        {formatSlope(seg.slopePerDecade)}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Annual mean thin ink line (broken at missing years) */}
            {annualPaths.map((d, idx) => (
              <path
                key={`ann-path-${idx}`}
                d={d}
                fill="none"
                stroke="#1F2A36"
                strokeOpacity="0.72"
                strokeWidth="1.05"
                strokeLinejoin="round"
                pathLength={1}
                className="orc-century-draw-path"
              />
            ))}

            {/* Individual annual data points */}
            {data.records.map((rec) => {
              if (rec.annual === null) return null;
              const cx = xOfYear(rec.year);
              const cy = yOfAnnual(rec.annual);
              const isSelected = rec.year === selectedYear;
              return (
                <circle
                  key={`pt-${rec.year}`}
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 3.8 : 1.55}
                  fill={isSelected ? '#C0862F' : '#1F2A36'}
                  stroke={isSelected ? '#1F2A36' : 'none'}
                  strokeWidth={isSelected ? 1.4 : 0}
                />
              );
            })}

            {/* Active year cursor line */}
            <line
              x1={cursorX}
              y1={padT}
              x2={cursorX}
              y2={padT + plotH}
              stroke="#1F2A36"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
          </g>
        )}

        {/* ==================== VIEW 2: STRIPES ==================== */}
        {view === 'stripes' && (
          <g className="orc-layer-stripes">
            {/* Y-axis anomaly labels for non-color cues */}
            <text x={padL - 5} y={padT + 10} textAnchor="end" className="orc-svg-axis-txt">
              +2 °C
            </text>
            <text
              x={padL - 5}
              y={padT + plotH / 2 + 3.5}
              textAnchor="end"
              className="orc-svg-axis-txt"
            >
              Media
            </text>
            <text x={padL - 5} y={padT + plotH - 3} textAnchor="end" className="orc-svg-axis-txt">
              -2 °C
            </text>

            {/* 124 vertical climate stripes + non-color anomaly profile dot */}
            {data.records.map((rec) => {
              const x = xOfYear(rec.year) - yearStepW * 0.5;
              const w = Math.max(1.8, yearStepW + 0.35);
              if (rec.anomaly === null) {
                return (
                  <g key={`str-${rec.year}`}>
                    <rect
                      x={x}
                      y={padT + 1}
                      width={w}
                      height={plotH - 2}
                      fill="url(#orc-century-hatch)"
                    />
                    <line
                      x1={x + w * 0.5}
                      y1={padT + 2}
                      x2={x + w * 0.5}
                      y2={padT + 7}
                      stroke="#1F2A36"
                      strokeWidth="1.1"
                    />
                  </g>
                );
              }
              const { color } = stripeColorForAnomaly(rec.anomaly);
              const clampedAnom = Math.max(-2.6, Math.min(2.6, rec.anomaly));
              const profileY = padT + plotH * 0.5 - (clampedAnom / 2.6) * (plotH * 0.42);
              return (
                <g key={`str-${rec.year}`}>
                  <rect
                    x={x}
                    y={padT + 1}
                    width={w}
                    height={plotH - 2}
                    fill={color}
                  />
                  {/* Non-color geometric cue: anomaly height dot */}
                  <circle
                    cx={x + w * 0.5}
                    cy={profileY}
                    r="1.05"
                    fill="#FAF4E8"
                    stroke="#1F2A36"
                    strokeWidth="0.7"
                  />
                </g>
              );
            })}

            {/* Midline (0 °C anomaly = century mean) */}
            <line
              x1={padL}
              y1={padT + plotH * 0.5}
              x2={padL + plotW}
              y2={padT + plotH * 0.5}
              stroke="#1F2A36"
              strokeOpacity="0.65"
              strokeWidth="1"
              strokeDasharray="3 2.5"
            />

            {/* Selected year stripe highlight frame */}
            <rect
              x={cursorX - Math.max(2, yearStepW * 0.65)}
              y={padT - 2}
              width={Math.max(4, yearStepW * 1.3)}
              height={plotH + 4}
              fill="none"
              stroke="#1F2A36"
              strokeWidth="1.8"
              rx="1.5"
            />
          </g>
        )}

        {/* ==================== VIEW 3: TU MES ==================== */}
        {view === 'month' && (
          <g className="orc-layer-month">
            {/* Y-axis ticks */}
            {monthTicks.map((tick) => {
              const y = yOfMonth(tick);
              return (
                <g key={`mtick-${tick}`}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={padL + plotW}
                    y2={y}
                    stroke="#5E656C"
                    strokeOpacity="0.28"
                    strokeDasharray="2.5 2.5"
                    strokeWidth="0.8"
                  />
                  <text
                    x={padL - 5}
                    y={y + 3.5}
                    textAnchor="end"
                    className="orc-svg-axis-txt"
                  >
                    {tick.toFixed(0)} °C
                  </text>
                </g>
              );
            })}

            {/* Missing months as hatched bands */}
            {monthMissing.map((span) => {
              const x1 = Math.max(padL, xOfYear(span.startYear) - yearStepW * 0.48);
              const x2 = Math.min(padL + plotW, xOfYear(span.endYear) + yearStepW * 0.48);
              return (
                <rect
                  key={`mgap-${span.startYear}`}
                  x={x1}
                  y={padT + 1}
                  width={Math.max(2.2, x2 - x1)}
                  height={plotH - 2}
                  fill="url(#orc-century-hatch)"
                />
              );
            })}

            {/* Historical monthly mean reference line */}
            <line
              x1={padL}
              y1={yOfMonth(data.monthClimate.tempMeanC)}
              x2={padL + plotW}
              y2={yOfMonth(data.monthClimate.tempMeanC)}
              stroke="#1E3E5C"
              strokeOpacity="0.65"
              strokeDasharray="4 3"
              strokeWidth="1.2"
            />

            {/* Segmented path for the chosen month (never interpolated across missing years) */}
            {monthPaths.map((d, idx) => (
              <path
                key={`mpath-${idx}`}
                d={d}
                fill="none"
                stroke="#1E3E5C"
                strokeWidth="1.35"
                strokeLinejoin="round"
                pathLength={1}
                className="orc-century-draw-path"
              />
            ))}

            {/* Individual monthly points */}
            {data.records.map((rec) => {
              if (rec.monthValue === null) return null;
              const cx = xOfYear(rec.year);
              const cy = yOfMonth(rec.monthValue);
              const isSelected = rec.year === selectedYear;
              return (
                <circle
                  key={`mpt-${rec.year}`}
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 3.8 : 1.6}
                  fill={isSelected ? '#C0862F' : '#1E3E5C'}
                  stroke={isSelected ? '#1F2A36' : 'none'}
                  strokeWidth={isSelected ? 1.4 : 0}
                />
              );
            })}

            {/* Coldest record callout on chart */}
            {(() => {
              const cx = xOfYear(data.coldestMonth.year);
              const cy = yOfMonth(data.coldestMonth.value);
              const anchor =
                cx < padL + 65 ? 'start' : cx > padL + plotW - 65 ? 'end' : 'middle';
              const dx = anchor === 'start' ? 6 : anchor === 'end' ? -6 : 0;
              return (
                <g className="orc-month-extreme is-cold">
                  <polygon
                    points={`${cx},${cy - 4.5} ${cx - 4.2},${cy + 3.5} ${cx + 4.2},${cy + 3.5}`}
                    fill="#1E3E5C"
                    stroke="#FAF4E8"
                    strokeWidth="1"
                  />
                  <text
                    x={cx + dx}
                    y={Math.min(padT + plotH - 3, cy + 12.5)}
                    textAnchor={anchor}
                    className="orc-svg-callout-txt is-cold"
                  >
                    Más frío: {data.coldestMonth.year} ({formatTempC(data.coldestMonth.value)})
                  </text>
                </g>
              );
            })()}

            {/* Warmest record callout on chart */}
            {(() => {
              const cx = xOfYear(data.warmestMonth.year);
              const cy = yOfMonth(data.warmestMonth.value);
              const anchor =
                cx < padL + 65 ? 'start' : cx > padL + plotW - 65 ? 'end' : 'middle';
              const dx = anchor === 'start' ? 6 : anchor === 'end' ? -6 : 0;
              return (
                <g className="orc-month-extreme is-warm">
                  <polygon
                    points={`${cx},${cy + 4.5} ${cx - 4.2},${cy - 3.5} ${cx + 4.2},${cy - 3.5}`}
                    fill="#A4471F"
                    stroke="#FAF4E8"
                    strokeWidth="1"
                  />
                  <text
                    x={cx + dx}
                    y={Math.max(padT + 10, cy - 6.5)}
                    textAnchor={anchor}
                    className="orc-svg-callout-txt is-warm"
                  >
                    Más cálido: {data.warmestMonth.year} ({formatTempC(data.warmestMonth.value)})
                  </text>
                </g>
              );
            })()}

            {/* Active year cursor line */}
            <line
              x1={cursorX}
              y1={padT}
              x2={cursorX}
              y2={padT + plotH}
              stroke="#1F2A36"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />

            {/* Separated user simulated observation mark (NEVER joined to real series) */}
            {hasUserTemp && (() => {
              const sepX = padL + plotW + 8;
              const markX = padL + plotW + 37;
              const markY = Math.max(
                padT + 20,
                Math.min(padT + plotH - 18, yOfMonth(userTempC))
              );
              return (
                <g
                  className="orc-svg-user-sim"
                  data-testid="orc-user-sim-mark"
                  aria-label={`Tu observación (simulación): ${formatTempC(userTempC)}`}
                >
                  <title>{`Tu observación (simulación): ${formatTempC(userTempC)}`}</title>
                  {/* Double-dashed vertical boundary separating real archive from simulation */}
                  <line
                    x1={sepX}
                    y1={padT}
                    x2={sepX}
                    y2={padT + plotH}
                    stroke="#1E3E5C"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                  />
                  {/* Horizontal sightline to compare level without connecting to real data */}
                  <line
                    x1={padL}
                    y1={markY}
                    x2={markX}
                    y2={markY}
                    stroke="#C0862F"
                    strokeOpacity="0.65"
                    strokeWidth="1.1"
                    strokeDasharray="2 2.5"
                  />
                  {/* Outer halo + diamond symbol for simulated observation */}
                  <circle
                    cx={markX}
                    cy={markY}
                    r="7.5"
                    fill="#D6E5EF"
                    stroke="#1E3E5C"
                    strokeWidth="1.4"
                    strokeDasharray="2 1.5"
                  />
                  <polygon
                    points={`${markX},${markY - 4.8} ${markX + 4.8},${markY} ${markX},${markY + 4.8} ${markX - 4.8},${markY}`}
                    fill="#C0862F"
                    stroke="#1F2A36"
                    strokeWidth="1.3"
                  />
                  <text
                    x={markX}
                    y={padT + 8}
                    textAnchor="middle"
                    className="orc-svg-sim-lbl"
                  >
                    Tu observación
                  </text>
                  <text
                    x={markX}
                    y={padT + 16.5}
                    textAnchor="middle"
                    className="orc-svg-sim-lbl"
                  >
                    (simulación)
                  </text>
                  <text
                    x={markX}
                    y={Math.min(padT + plotH - 3, markY + 15.5)}
                    textAnchor="middle"
                    className="orc-svg-sim-val"
                  >
                    {formatTempC(userTempC)}
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* X-axis year ticks */}
        {xTicks.map((yr) => {
          const x = xOfYear(yr);
          return (
            <g key={`xtick-${yr}`}>
              <line
                x1={x}
                y1={padT + plotH}
                x2={x}
                y2={padT + plotH + 4}
                stroke="#1F2A36"
                strokeWidth="1"
              />
              <text
                x={x}
                y={H - 7}
                textAnchor={
                  yr === data.firstYear ? 'start' : yr === data.lastYear ? 'end' : 'middle'
                }
                className="orc-svg-axis-txt"
              >
                {yr}
              </text>
            </g>
          );
        })}

        {/* Floating year cursor pill at top of plot */}
        <g
          transform={`translate(${Math.max(
            padL + 22,
            Math.min(padL + plotW - 22, cursorX)
          )}, ${padT - 2})`}
        >
          <rect
            x="-20"
            y="-13"
            width="40"
            height="14"
            rx="4"
            fill="#1F2A36"
          />
          <text
            x="0"
            y="-3"
            textAnchor="middle"
            className="orc-svg-cursor-year"
          >
            {selectedRecord.year}
          </text>
        </g>
      </svg>
    </div>
  );
}
