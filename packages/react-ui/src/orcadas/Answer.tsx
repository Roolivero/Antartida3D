import { useContext, useMemo } from 'react';
import {
  MONTH_NAMES,
  ORCADAS_GUIDING_QUESTION,
  READING_KINDS,
  SEAL_SVG,
  answerFor,
  checkGuess,
  climateFor,
  factsFor,
  sameMonthSeries,
  scoreObservation,
  truthFor,
  type Reading,
  type ReadingKind,
} from '@antartida/core';
import { FactList, SourceContext } from './FactList.tsx';
import { KindChip } from './KindChip.tsx';
import { formatTempC, getReaderSource } from './century/centuryData.ts';
import { NOTEBOOK_LABELS, formatRecorded } from './observation/Notebook.tsx';

export function Answer({
  guesses,
  obsMonth,
  reading,
  onGotoObservation,
}: {
  guesses: Partial<Record<ReadingKind, number>>;
  obsMonth: number;
  reading: Reading;
  onGotoObservation: () => void;
}) {
  const normMonth = (((obsMonth - 1) % 12) + 12) % 12 + 1;
  const monthName = MONTH_NAMES[normMonth - 1] ?? 'enero';
  const pluralMonth = monthName.endsWith('l') ? `${monthName}es` : `${monthName}s`;

  const hasUserTemp = typeof guesses.temp === 'number' && Number.isFinite(guesses.temp);
  const climate = climateFor(normMonth);
  const threshold = hasUserTemp ? guesses.temp! : climate.tempMeanC;

  const [seg1, seg2] = useMemo(
    () => answerFor(threshold, normMonth),
    [threshold, normMonth]
  );

  const series = useMemo(() => sameMonthSeries(normMonth), [normMonth]);
  const readerSource = useMemo(() => getReaderSource(), []);
  const answerFacts = useMemo(() => factsFor('answer'), []);

  const recorded = READING_KINDS.filter((k) => typeof guesses[k] === 'number').length;
  const obsScore = scoreObservation(guesses, reading);

  const referenceText = hasUserTemp
    ? `tu lectura (${formatTempC(threshold)})`
    : `la media de ${monthName} (${formatTempC(threshold)})`;

  const onOpenSource = useContext(SourceContext);

  // Dot chart calculations
  const chartGeom = useMemo(() => {
    const W = 380;
    const H = 190;
    const padL = 36;
    const padR = 16;
    const padT = 20;
    const padB = 26;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const validValues = series
      .filter((p) => p.value !== null && Number.isFinite(p.value))
      .map((p) => p.value as number);

    const minV = Math.min(...validValues, threshold);
    const maxV = Math.max(...validValues, threshold);
    const span = Math.max(3, maxV - minV);
    const chartMinY = Math.floor(minV - span * 0.12);
    const chartMaxY = Math.ceil(maxV + span * 0.15);

    const firstYear = series[0]?.year ?? 1903;
    const lastYear = series[series.length - 1]?.year ?? 2026;
    const yearSpan = Math.max(1, lastYear - firstYear);

    const xOf = (yr: number) => padL + ((yr - firstYear) / yearSpan) * plotW;
    const yOf = (val: number) =>
      padT + plotH - ((val - chartMinY) / (chartMaxY - chartMinY)) * plotH;

    const splitX = xOf(1950.5);
    const threshY = yOf(threshold);

    const xTicks = [firstYear, 1930, 1960, 1990, lastYear];
    const midTick = Math.round(((chartMinY + chartMaxY) / 2) * 2) / 2;
    const yTicks = [chartMaxY, midTick, chartMinY];

    return {
      W,
      H,
      padL,
      padR,
      padT,
      padB,
      plotW,
      plotH,
      firstYear,
      lastYear,
      xOf,
      yOf,
      splitX,
      threshY,
      xTicks,
      yTicks,
    };
  }, [series, threshold]);

  return (
    <div className="orc-chapter-content orc-answer">
      {/* Guiding Question as prominent heading / lead */}
      <p className="orc-question">{ORCADAS_GUIDING_QUESTION}</p>

      {/* Dot chart of same month across the century */}
      <div className="orc-chart-frame">
        <svg
          viewBox={`0 0 ${chartGeom.W} ${chartGeom.H}`}
          className="orc-chart-svg orc-answer-svg"
          role="img"
          aria-label={`Gráfico de puntos de temperatura media de ${monthName} en Orcadas (${chartGeom.firstYear} a ${chartGeom.lastYear}), con umbral de referencia en ${formatTempC(threshold)}`}
        >
          {/* Background */}
          <rect
            x={chartGeom.padL}
            y={chartGeom.padT}
            width={chartGeom.plotW}
            height={chartGeom.plotH}
            rx="4"
            fill="#FAF4E8"
            stroke="#1F2A36"
            strokeOpacity="0.28"
            strokeWidth="1"
          />

          {/* Y ticks & grid lines */}
          {chartGeom.yTicks.map((tick) => {
            const y = chartGeom.yOf(tick);
            return (
              <g key={tick}>
                <line
                  x1={chartGeom.padL}
                  y1={y}
                  x2={chartGeom.padL + chartGeom.plotW}
                  y2={y}
                  stroke="#5E656C"
                  strokeOpacity="0.25"
                  strokeDasharray="2.5 2.5"
                  strokeWidth="0.8"
                />
                <text
                  x={chartGeom.padL - 5}
                  y={y + 3.5}
                  textAnchor="end"
                  className="orc-svg-axis-txt"
                >
                  {tick} °C
                </text>
              </g>
            );
          })}

          {/* Vertical dashed separator between 1950 and 1951 */}
          <line
            x1={chartGeom.splitX}
            y1={chartGeom.padT}
            x2={chartGeom.splitX}
            y2={chartGeom.padT + chartGeom.plotH}
            stroke="#5E656C"
            strokeWidth="1.3"
            strokeDasharray="3 3"
          />
          <text
            x={chartGeom.splitX - 4}
            y={chartGeom.padT + 10}
            textAnchor="end"
            fontSize="8"
            fontWeight="700"
            fill="#5E656C"
          >
            1950
          </text>
          <text
            x={chartGeom.splitX + 4}
            y={chartGeom.padT + 10}
            textAnchor="start"
            fontSize="8"
            fontWeight="700"
            fill="#5E656C"
          >
            1951
          </text>

          {/* Horizontal line at threshold */}
          <line
            x1={chartGeom.padL}
            y1={chartGeom.threshY}
            x2={chartGeom.padL + chartGeom.plotW}
            y2={chartGeom.threshY}
            stroke={hasUserTemp ? '#A4471F' : '#1E3E5C'}
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
          <text
            x={chartGeom.padL + chartGeom.plotW - 4}
            y={chartGeom.threshY - 4}
            textAnchor="end"
            fontSize="9"
            fontWeight="800"
            fill={hasUserTemp ? '#A4471F' : '#1E3E5C'}
          >
            {formatTempC(threshold)}
          </text>

          {/* Dots for each year */}
          {series.map((pt) => {
            if (pt.value === null || !Number.isFinite(pt.value)) return null;
            const cx = chartGeom.xOf(pt.year);
            const cy = chartGeom.yOf(pt.value);
            const isCold = pt.value <= threshold;
            return (
              <circle
                key={pt.year}
                cx={cx}
                cy={cy}
                r={2.4}
                fill={isCold ? '#3D6B8E' : '#CE8F3A'}
                stroke="#1F2A36"
                strokeWidth="0.6"
              />
            );
          })}

          {/* X ticks */}
          {chartGeom.xTicks.map((yr) => {
            const x = chartGeom.xOf(yr);
            return (
              <g key={`xtick-${yr}`}>
                <line
                  x1={x}
                  y1={chartGeom.padT + chartGeom.plotH}
                  x2={x}
                  y2={chartGeom.padT + chartGeom.plotH + 4}
                  stroke="#1F2A36"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={chartGeom.H - 7}
                  textAnchor={
                    yr === chartGeom.firstYear
                      ? 'start'
                      : yr === chartGeom.lastYear
                        ? 'end'
                        : 'middle'
                  }
                  className="orc-svg-axis-txt"
                >
                  {yr}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="orc-century-legend-items" aria-label="Referencias del gráfico">
          <span className="orc-legend-item">
            <i className="orc-swatch orc-swatch-dot" aria-hidden="true" />
            Dato real: {monthName} igual de frío o más (SCAR READER)
          </span>
          <span className="orc-legend-item">
            <i className="orc-swatch orc-swatch-dot-warm" aria-hidden="true" />
            Dato real: {monthName} más cálido
          </span>
          <span className="orc-legend-item">
            <i className="orc-swatch orc-swatch-thresh" aria-hidden="true" />
            {hasUserTemp ? 'Tu lectura (simulación)' : `Media de ${monthName}`}
          </span>
        </div>
      </div>

      {/* Answer sentence block computed only from answerFor */}
      <div className="orc-answer-sentence-block">
        <p className="orc-answer-sentence">
          Entre {seg1.fromYear} y {seg1.toYear}, {seg1.asCold} de {seg1.years}{' '}
          {pluralMonth} fueron tan fríos como {referenceText} o más. Desde {seg2.fromYear}, solo{' '}
          {seg2.asCold} de {seg2.years}.
        </p>
        {!hasUserTemp && (
          <div className="orc-answer-cta-row">
            <button
              type="button"
              className="btn ghost orc-btn-goto-obs"
              onClick={onGotoObservation}
            >
              Volver a Observar
            </button>
          </div>
        )}
        <div className="orc-fact-srcs">
          <span className="orc-src-prefix">Fuente:</span>
          <button
            type="button"
            className="orc-src-link"
            onClick={() => onOpenSource?.(readerSource.id)}
          >
            {readerSource.short}
          </button>
        </div>
      </div>

      {/* Closing content moved from 'done' */}
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
              : `Tu observación de ${monthName}: ${obsScore} de ${recorded} ${recorded === 1 ? 'lectura' : 'lecturas'} dentro del margen.`}
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
            const val = guesses[kind];
            if (typeof val !== 'number') return null;
            const status = checkGuess(kind, val, reading);
            return (
              <div key={kind}>
                <dt>{NOTEBOOK_LABELS[kind].title}</dt>
                <dd>{formatRecorded(kind, val, reading)}</dd>
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

      <FactList facts={answerFacts} />
    </div>
  );
}
