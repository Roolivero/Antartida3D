import {
  MONTH_NAMES,
  ORCADAS_FACTS,
  READING_KINDS,
  SEAL_SVG,
  beaufort,
  checkGuess,
  compassPoint,
  scoreObservation,
  type Reading,
  type ReadingKind,
} from '@antartida/core';
import { KindChip } from '../KindChip.tsx';

export const NOTEBOOK_LABELS: Record<ReadingKind, { title: string; unit: string }> = {
  temp: { title: 'Termómetro (abrigo)', unit: '°C' },
  pressure: { title: 'Barómetro', unit: 'hPa' },
  wind: { title: 'Anemómetro y veleta', unit: 'km/h' },
  clouds: { title: 'Nubosidad', unit: 'octas' },
};

export function formatRecorded(kind: ReadingKind, val: number, reading: Reading): string {
  switch (kind) {
    case 'temp':
      return `${val > 0 ? '+' : ''}${val.toFixed(1)} °C`;
    case 'pressure':
      return `${val.toFixed(1)} hPa`;
    case 'wind': {
      const rumbo = compassPoint(reading.windDirDeg);
      const bf = beaufort(reading.windKmh);
      return `${Math.round(val)} km/h · ${rumbo} (${bf.name})`;
    }
    case 'clouds':
      return `${Math.round(val)}/8 octas`;
  }
}

export function Notebook({
  reading,
  guesses,
  activeKind,
  onSelectKind,
  onClear,
  month,
  reduced,
}: {
  reading: Reading;
  guesses: Partial<Record<ReadingKind, number>>;
  activeKind: ReadingKind;
  onSelectKind: (kind: ReadingKind) => void;
  onClear: () => void;
  month: number;
  reduced: boolean;
}) {
  const now = new Date();
  const dayNum = now.getDate();
  const yearNum = now.getFullYear();
  const monthName = MONTH_NAMES[(month - 1 + 12) % 12] ?? 'enero';

  const completedCount = READING_KINDS.filter(
    (k) => typeof guesses[k] === 'number' && Number.isFinite(guesses[k])
  ).length;
  const allDone = completedCount === READING_KINDS.length;
  const score = scoreObservation(guesses, reading);

  const simFact = ORCADAS_FACTS.find(
    (f) => f.chapter === 'observation' && f.kind === 'sim'
  );

  return (
    <div
      className={`orc-notebook${allDone ? ' is-complete' : ''}${reduced ? ' is-reduced' : ''}`}
      aria-label="Libreta meteorológica"
    >
      {/* Left notebook binding holes */}
      <div className="orc-notebook-holes" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="orc-notebook-page">
        <div className="orc-notebook-head">
          <div>
            <strong className="orc-notebook-title hand">
              Planilla de observación diaria
            </strong>
            <span className="orc-notebook-date">
              Fecha: {dayNum} de {monthName} de {yearNum} · Hora: 12:00 h
            </span>
          </div>
          <span className="orc-notebook-count" role="status" aria-live="polite">
            {completedCount}/4 anotadas
          </span>
        </div>

        <div className="orc-notebook-cells">
          {READING_KINDS.map((kind) => {
            const val = guesses[kind];
            const hasVal = typeof val === 'number' && Number.isFinite(val);
            const status = hasVal ? checkGuess(kind, val, reading) : null;
            const isCurrent = activeKind === kind;
            const meta = NOTEBOOK_LABELS[kind];

            return (
              <button
                key={kind}
                type="button"
                className={`orc-notebook-cell${isCurrent ? ' is-active' : ''}${status ? ` is-${status}` : ''}`}
                onClick={() => onSelectKind(kind)}
                aria-label={`Casillero de libreta: ${meta.title}, ${
                  hasVal ? formatRecorded(kind, val, reading) : 'sin anotar'
                }`}
              >
                <span className="orc-notebook-cell-lbl">{meta.title}</span>
                {hasVal ? (
                  <span className="orc-notebook-cell-val hand">
                    {formatRecorded(kind, val, reading)}
                  </span>
                ) : (
                  <span className="orc-notebook-cell-empty hand">— sin anotar —</span>
                )}
                {status && (
                  <small className={`orc-notebook-cell-status is-${status}`}>
                    {status === 'exact'
                      ? 'Exacta'
                      : status === 'close'
                        ? 'En margen'
                        : 'Revisar'}
                  </small>
                )}
              </button>
            );
          })}
        </div>

        {allDone && (
          <div className="orc-notebook-complete" role="status" aria-live="polite">
            <div className="orc-notebook-stamp">
              <svg
                className="orc-notebook-seal-svg"
                viewBox="0 0 120 120"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: SEAL_SVG }}
              />
              <div className="orc-notebook-stamp-txt">
                <strong className="orc-notebook-stamp-title hand">
                  Observación registrada
                </strong>
                <span>
                  {score} de 4 lecturas dentro del margen instrumental de {monthName}.
                </span>
              </div>
            </div>

            {simFact && (
              <div className="orc-notebook-sim-note">
                <KindChip kind={simFact.kind} />
                <span>{simFact.text}</span>
              </div>
            )}
          </div>
        )}

        <div className="orc-notebook-actions">
          <button
            type="button"
            className="orc-notebook-reset-btn"
            onClick={onClear}
            disabled={completedCount === 0}
          >
            Empezar de nuevo
          </button>
        </div>
      </div>
    </div>
  );
}
