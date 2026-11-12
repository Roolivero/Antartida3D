import { useMemo, useRef, useState } from 'react';
import { recordSpanText } from '@antartida/core';
import { KindChip } from './KindChip.tsx';
import { CenturySvg } from './century/CenturySvg.tsx';
import {
  CENTURY_VIEWS,
  computeCenturyDataset,
  formatSlope,
  formatTempC,
  type CenturyViewId,
} from './century/centuryData.ts';

export function CenturyChart({
  userTempC,
  month,
  untilYear,
}: {
  userTempC?: number;
  month: number;
  untilYear?: number;
}) {
  const data = useMemo(() => computeCenturyDataset(month), [month]);
  const [view, setView] = useState<CenturyViewId>('annual');
  // Default to 2016 so both ArrowLeft (2015) and ArrowRight (2017) have complete annual & monthly data
  const [selectedYear, setSelectedYear] = useState<number>(2016);

  const tabRefs = useRef<Record<CenturyViewId, HTMLButtonElement | null>>({
    annual: null,
    stripes: null,
    month: null,
  });

  const hasUserTemp = typeof userTempC === 'number' && Number.isFinite(userTempC);
  const selectedRecord =
    data.recordsByYear.get(selectedYear) ??
    data.records[data.records.length - 2] ??
    data.records[0];

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const order = CENTURY_VIEWS.map((v) => v.id);
    const curIdx = order.indexOf(view);
    let nextIdx = curIdx;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (curIdx + 1) % order.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (curIdx - 1 + order.length) % order.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIdx = order.length - 1;
    } else {
      return;
    }

    const nextView = order[nextIdx];
    setView(nextView);
    tabRefs.current[nextView]?.focus();
  };

  const primaryValueText =
    view === 'month'
      ? selectedRecord.monthValue !== null
        ? `Mes de ${data.monthName}: ${formatTempC(selectedRecord.monthValue)}`
        : `Mes de ${data.monthName}: sin dato registrado`
      : selectedRecord.annual !== null
        ? `Media anual: ${formatTempC(selectedRecord.annual)} (${formatTempC(selectedRecord.anomaly ?? 0, 1, true)} frente a la media del siglo)`
        : `Año incompleto (${selectedRecord.validMonthsCount} de 12 meses medidos, sin media anual)`;

  const sliderValueText = `${selectedRecord.year} · ${primaryValueText} · Etapa: ${selectedRecord.era.title}`;

  return (
    <div className="orc-activity orc-century">
      <div className="orc-chip-row">
        <KindChip kind="real" />
        <KindChip kind="calc" />
        {hasUserTemp && <KindChip kind="sim" />}
      </div>

      {/* Kid-friendly explanation (10 years old & adults) preserving required phrase */}
      <p className="orc-century-summary">
        <strong>Serie histórica de temperatura media anual</strong>. {recordSpanText(untilYear ?? data.lastYear)} (archivo SCAR READER). Un termómetro de un solo
        día muestra el tiempo de esa tarde; más de cien años anotados sin pausa dejan ver cómo
        cambia el clima de la isla Laurie a lo largo de un siglo.
      </p>

      {/* Accessible View Tabs */}
      <div
        className="orc-century-tabs"
        role="tablist"
        aria-label="Vistas del registro histórico"
        onKeyDown={handleTabKeyDown}
      >
        {CENTURY_VIEWS.map((v) => {
          const isSelected = view === v.id;
          return (
            <button
              key={v.id}
              ref={(el) => {
                tabRefs.current[v.id] = el;
              }}
              id={`orc-century-tab-${v.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls="orc-century-tabpanel"
              tabIndex={isSelected ? 0 : -1}
              className={`orc-century-tab${isSelected ? ' is-active' : ''}`}
              onClick={() => setView(v.id)}
            >
              <span>{v.label}</span>
              {v.id === 'month' && (
                <small className="orc-century-tab-sub">{data.monthName}</small>
              )}
            </button>
          );
        })}
      </div>

      {/* Active View Panel */}
      <div
        id="orc-century-tabpanel"
        role="tabpanel"
        aria-labelledby={`orc-century-tab-${view}`}
        className="orc-century-panel"
      >
        <CenturySvg
          view={view}
          data={data}
          selectedYear={selectedYear}
          onSelectYear={setSelectedYear}
          userTempC={userTempC}
        />

        {/* View-specific legend and highlights */}
        {view === 'annual' && (
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

            {data.trendSegments.length > 0 && (
              <div className="orc-century-trend-banner">
                <KindChip kind="calc" label="Cálculo sobre la serie" />
                <div className="orc-century-trend-copy">
                  <strong>
                    Recta de tendencia:{' '}
                    {data.trendSegments
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
        )}

        {view === 'stripes' && (
          <div className="orc-century-legend-block">
            <div className="orc-century-legend-items" aria-label="Referencias de franjas climáticas">
              <span className="orc-legend-item">
                <i className="orc-swatch orc-swatch-cold" aria-hidden="true" />
                Más frío que la media (punto bajo)
              </span>
              <span className="orc-legend-item">
                <i className="orc-swatch orc-swatch-warm" aria-hidden="true" />
                Más cálido que la media (punto alto)
              </span>
              <span className="orc-legend-item">
                <i className="orc-swatch orc-swatch-gap" aria-hidden="true" />
                Sin dato anual (gris rayado)
              </span>
            </div>
            <div className="orc-century-trend-banner">
              <KindChip kind="calc" label="Referencia del siglo" />
              <div className="orc-century-trend-copy">
                <strong>Media histórica 1903–2026: {formatTempC(data.seriesMean)}</strong>
                <span>
                  Año más frío: {data.coldestAnnual.year} ({formatTempC(data.coldestAnnual.value)})
                  {' · '}Año más cálido: {data.warmestAnnual.year} (
                  {formatTempC(data.warmestAnnual.value)}).
                </span>
              </div>
            </div>
          </div>
        )}

        {view === 'month' && (
          <div className="orc-century-legend-block">
            <div className="orc-century-extremes-row">
              <div className="orc-extreme-pill is-cold">
                <small>Más frío en {data.monthName}</small>
                <strong>
                  {data.coldestMonth.year}: {formatTempC(data.coldestMonth.value)}
                </strong>
              </div>
              <div className="orc-extreme-pill is-warm">
                <small>Más cálido en {data.monthName}</small>
                <strong>
                  {data.warmestMonth.year}: {formatTempC(data.warmestMonth.value)}
                </strong>
              </div>
              <div className="orc-extreme-pill">
                <small>Media de {data.monthName}</small>
                <strong>{formatTempC(data.monthClimate.tempMeanC)}</strong>
              </div>
            </div>

            {hasUserTemp ? (
              <div
                className="orc-user-obs-note"
                data-testid="orc-user-obs-callout"
              >
                <KindChip kind="sim" />
                <span>
                  <strong>Tu observación (simulación): {formatTempC(userTempC)}</strong> en{' '}
                  {data.monthName} (frente a la media histórica de{' '}
                  {formatTempC(data.monthClimate.tempMeanC)}). Se dibuja como marca separada a la
                  derecha y no se une a la serie real.
                </span>
              </div>
            ) : (
              <div className="orc-user-obs-note is-empty">
                <KindChip kind="sim" />
                <span>
                  <strong>Tu observación (simulación):</strong> si anotás una temperatura en la
                  Observación del día (capítulo 2), aparece acá como una marca separada que no se
                  une a la serie real.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Year Cursor (role="slider") + Live Announcement Card */}
      <div className="orc-century-cursor-box">
        <div className="orc-slider-group">
          <label htmlFor="orc-century-year-slider" className="orc-slider-label">
            <span>Recorrer año del registro ({data.firstYear}–{data.lastYear})</span>
            <strong className="orc-slider-val">{selectedRecord.year}</strong>
          </label>
          <input
            id="orc-century-year-slider"
            type="range"
            className="orc-range orc-century-range"
            min={data.firstYear}
            max={data.lastYear}
            step={1}
            value={selectedYear}
            aria-label="Cursor de años del registro histórico"
            aria-valuemin={data.firstYear}
            aria-valuemax={data.lastYear}
            aria-valuenow={selectedYear}
            aria-valuetext={sliderValueText}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          />
        </div>

        <article
          className="orc-century-cursor-card"
          role="status"
          aria-live="polite"
          data-testid="orc-century-cursor-card"
        >
          <div className="orc-cursor-card-top">
            <span className="orc-cursor-year-badge">{selectedRecord.year}</span>
            <strong className="orc-cursor-temp-val">{primaryValueText}</strong>
          </div>
          <div className="orc-cursor-era-row">
            <span className="orc-cursor-era-tag hand">
              {selectedRecord.era.illustrativeStart
                ? `Etapa: ${selectedRecord.era.title}`
                : `Etapa desde ${selectedRecord.era.fromYear}: ${selectedRecord.era.title}`}
            </span>
            <p className="orc-cursor-era-desc">{selectedRecord.era.summary}</p>
          </div>
        </article>
      </div>

      {/* Secondary Reading: Decade Means (decadeMeans) */}
      <section className="orc-century-decades" aria-label="Medias por década">
        <div className="orc-century-decades-head">
          <span className="orc-sub-label">Medias por década (lectura secundaria)</span>
          <KindChip kind="calc" />
        </div>
        <div className="orc-decades-grid">
          {data.decades.map((d) => {
            const isCurrentDecade = Math.floor(selectedYear / 10) * 10 === d.decade;
            return (
              <div
                key={d.decade}
                className={`orc-decade-chip${isCurrentDecade ? ' is-current' : ''}`}
              >
                <span className="orc-decade-name">{d.decade}s</span>
                <strong className="orc-decade-val">{formatTempC(d.mean)}</strong>
                <small className="orc-decade-n">{d.n} a.</small>
              </div>
            );
          })}
        </div>
      </section>

      {/* Folded Accessible Data Table (<details> «Ver los datos en tabla») */}
      <details className="orc-century-details">
        <summary className="orc-century-details-summary">Ver los datos en tabla</summary>
        <div className="orc-century-table-wrap">
          <table className="orc-century-table">
            <caption>
              Temperatura media anual en Estación Orcadas ({data.firstYear}–{data.lastYear}), en °C
            </caption>
            <thead>
              <tr>
                <th scope="col">Año</th>
                <th scope="col">Media anual (°C)</th>
                <th scope="col">Mes ({data.monthName})</th>
                <th scope="col">Etapa histórica</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((rec) => (
                <tr key={rec.year}>
                  <th scope="row">{rec.year}</th>
                  <td>
                    {rec.annual !== null
                      ? formatTempC(rec.annual, 2)
                      : `Sin media (${rec.validMonthsCount}/12 meses)`}
                  </td>
                  <td>
                    {rec.monthValue !== null ? formatTempC(rec.monthValue, 1) : 'Sin dato'}
                  </td>
                  <td>{rec.era.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Visible Source and License Footer ('reader') */}
      <footer className="orc-century-source-footer">
        <p className="orc-century-source-line">
          <strong>
            Datos: SCAR READER, British Antarctic Survey.{' '}
            {data.readerSource.license ?? 'Open Government Licence v3.0'}
          </strong>
        </p>
        <small className="orc-century-source-meta">
          <a
            href={data.readerSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="orc-source-link"
          >
            {data.readerSource.label}
          </a>{' '}
          · Consultado: {data.readerSource.consulted}
        </small>
      </footer>
    </div>
  );
}
