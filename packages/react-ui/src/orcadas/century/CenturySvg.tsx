import { useRef } from 'react';
import { ORCADAS_ANNUAL_TEMP } from '@antartida/core';
import {
  buildSegmentedPaths,
  type computeCenturyDataset,
} from './centuryData.ts';

type Dataset = ReturnType<typeof computeCenturyDataset>;

export function CenturySvg({
  data,
  selectedYear,
  onSelectYear,
}: {
  data: Dataset;
  selectedYear: number;
  onSelectYear: (year: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 380;
  const H = 214;
  const padL = 36;
  const padR = 14;
  const padT = 18;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const yearSpan = Math.max(1, data.lastYear - data.firstYear);
  const xOfYear = (yr: number) => padL + ((yr - data.firstYear) / yearSpan) * plotW;

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

  // Annual view Y scale (-7.6 to -0.8 °C)
  const annMinY = -7.6;
  const annMaxY = -0.8;
  const yOfAnnual = (val: number) =>
    padT + plotH - ((val - annMinY) / (annMaxY - annMinY)) * plotH;

  const annualPaths = buildSegmentedPaths(ORCADAS_ANNUAL_TEMP, xOfYear, yOfAnnual);
  const ma11Paths = buildSegmentedPaths(data.ma11Series, xOfYear, yOfAnnual);

  const selectedRecord = data.recordsByYear.get(selectedYear) ?? data.records[0];
  const cursorX = xOfYear(selectedYear);

  const xTicks = [data.firstYear, 1930, 1960, 1990, data.lastYear];

  const ariaLabel = `Gráfico año por año de temperatura media anual en Orcadas (${data.firstYear} a ${data.lastYear}), con media móvil de 11 años y tendencia en dos tramos. Año seleccionado: ${selectedYear}.`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSelectYear(Math.min(data.lastYear, selectedYear + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSelectYear(Math.max(data.firstYear, selectedYear - 1));
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      onSelectYear(Math.min(data.lastYear, selectedYear + 10));
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      onSelectYear(Math.max(data.firstYear, selectedYear - 10));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSelectYear(data.firstYear);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSelectYear(data.lastYear);
    }
  };

  return (
    <div
      className="orc-century-svg-wrap"
      tabIndex={0}
      role="slider"
      aria-label="Cursor de años en el gráfico histórico"
      aria-valuemin={data.firstYear}
      aria-valuemax={data.lastYear}
      aria-valuenow={selectedYear}
      aria-valuetext={`Año ${selectedYear}`}
      onKeyDown={handleKeyDown}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="orc-century-svg is-view-annual"
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

          {/* Annual means: thin grey line under everything (broken at incomplete years) (broken at missing years) */}
          {annualPaths.map((d, idx) => (
            <path
              key={`ann-path-${idx}`}
              d={d}
              fill="none"
              stroke="#8A9096"
              strokeWidth="1"
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
            return (
              <circle
                key={`pt-${rec.year}`}
                cx={cx}
                cy={cy}
                r={1.3}
                fill="#8A9096"
              />
            );
          })}

          {/* 11-year moving average: watercolor wash + core stroke */}
          {ma11Paths.map((d, idx) => (
            <g key={`ma11-${idx}`}>
              <path
                d={d}
                fill="none"
                stroke="#7FA8C4"
                strokeOpacity="0.3"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="orc-century-draw-path"
              />
              <path
                d={d}
                fill="none"
                stroke="#1E3E5C"
                strokeWidth="2.8"
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
                return (
                  <g key={`trend-seg-${idx}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#A4471F"
                      strokeWidth="2"
                      strokeDasharray="6 3.5"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Selected year, on top of every line */}
          {selectedRecord.annual !== null && (
            <circle
              cx={xOfYear(selectedRecord.year)}
              cy={yOfAnnual(selectedRecord.annual)}
              r={3.8}
              fill="#C0862F"
              stroke="#1F2A36"
              strokeWidth={1.4}
            />
          )}

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
