import { useMemo, type ReactNode } from 'react';
import { ORCADAS_FIRST_YEAR, recordSpanText } from '@antartida/core';
import { CenturySvg } from './century/CenturySvg.tsx';
import {
  computeCenturyDataset,
  formatSlope,
} from './century/centuryData.ts';

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
  tourCard,
}: {
  year: number;
  maxYear: number;
  onYear: (y: number) => void;
  /** Card of the active era stop of the guided tour. */
  tourCard?: ReactNode;
}) {
  const clampedYear = Math.max(ORCADAS_FIRST_YEAR, Math.min(Math.max(ORCADAS_FIRST_YEAR + 1, maxYear), Math.trunc(year)));
  const centuryData = useMemo(() => computeCenturyDataset(), []);

  // The century chart is the only year control (a slider with pointer and keyboard): the tour
  // stops jump between eras, and the chart moves year by year.
  return (
    <div className="orc-eras">
      <div className="orc-tm-top">
        <YearCounter year={clampedYear} />
        <p className="orc-tm-record-line">{recordSpanText(clampedYear)}</p>
      </div>

      {tourCard}

      {/* Annual Series Chart from CenturySvg */}
      <div className="orc-century-chart-block">
        <CenturySvg
          data={centuryData}
          selectedYear={clampedYear}
          onSelectYear={onYear}
        />

        <details className="orc-more orc-century-details">
          <summary>Cómo leer el gráfico</summary>
          <div className="orc-century-legend-block">
            <div className="orc-century-legend-items" aria-label="Referencias del gráfico anual">
              <span className="orc-legend-item">
                <i className="orc-swatch orc-swatch-annual" aria-hidden="true" />
                Media de cada año (dato real; la línea se corta en los años incompletos)
              </span>
              <span className="orc-legend-item">
                <i className="orc-swatch orc-swatch-ma11" aria-hidden="true" />
                Media móvil de 11 años (cálculo)
              </span>
              <span className="orc-legend-item">
                <i className="orc-swatch orc-swatch-trend" aria-hidden="true" />
                Tendencia en dos tramos (cálculo)
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
        </details>
      </div>
    </div>
  );
}
