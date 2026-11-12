import {
  MONTH_NAMES,
  READING_KINDS,
  TOLERANCE,
  checkGuess,
  compassPoint,
  prefersReducedMotion,
  truthFor,
  type Reading,
  type ReadingKind,
} from '@antartida/core';
import { useEffect, useRef, useState } from 'react';
import { KindChip } from '../KindChip.tsx';
import { Barometer } from './Barometer.tsx';
import { CloudPicker } from './CloudPicker.tsx';
import { Notebook } from './Notebook.tsx';
import { Thermometer } from './Thermometer.tsx';
import { WindMast } from './WindMast.tsx';

interface InstrumentMeta {
  label: string;
  shortLabel: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  instruction: string;
}

const FIELD_META: Record<ReadingKind, InstrumentMeta> = {
  temp: {
    label: 'Temperatura del abrigo',
    shortLabel: '1. Termómetro',
    unit: '°C',
    min: -25,
    max: 10,
    step: 0.1,
    instruction:
      'La puerta de celosías del abrigo se abre: mirá la lupa graduada en décimas y alineá tu lectura con el menisco de mercurio.',
  },
  pressure: {
    label: 'Presión atmosférica',
    shortLabel: '2. Barómetro',
    unit: 'hPa',
    min: 960,
    max: 1030,
    step: 0.1,
    instruction:
      'Mirá la aguja del barómetro (tiembla apenas con el viento) y leé el valor exacto en el visor de décimas.',
  },
  wind: {
    label: 'Velocidad del viento',
    shortLabel: '3. Viento',
    unit: 'km/h',
    min: 0,
    max: 120,
    step: 1,
    instruction:
      'Observá el rumbo en la veleta sobre la rosa de 16 rumbos y leé la velocidad en el contador de las cazoletas.',
  },
  clouds: {
    label: 'Cobertura de nubes',
    shortLabel: '4. Nubes',
    unit: 'octas',
    min: 0,
    max: 8,
    step: 1,
    instruction:
      'Contá cuántas de las ocho octavas del cielo están cubiertas por nubes: podés elegirlas tocando el cielo o con el deslizador.',
  },
};

function roundToStep(val: number, step: number): number {
  const r = step < 1 ? Math.round(val * 10) / 10 : Math.round(val);
  return Object.is(r, -0) ? 0 : r;
}

function clampToMeta(val: number, meta: InstrumentMeta): number {
  const clamped = Math.max(meta.min, Math.min(meta.max, val));
  return roundToStep(clamped, meta.step);
}

function formatVal(kind: ReadingKind, val: number): string {
  return FIELD_META[kind].step < 1 ? val.toFixed(1) : String(Math.round(val));
}

function initialDraftsFor(reading: Reading): Record<ReadingKind, number> {
  return {
    temp: Math.abs(reading.tempC - -3.0) < 0.05 ? -6.5 : -3.0,
    pressure: Math.abs(reading.pressureHpa - 995.0) < 0.05 ? 988.0 : 995.0,
    wind: reading.windKmh === 20 ? 12 : 20,
    clouds: reading.cloudOktas === 4 ? 2 : 4,
  };
}

export function Observation({
  reading,
  guesses,
  onGuess,
  onClear,
  month,
}: {
  reading: Reading;
  guesses: Partial<Record<ReadingKind, number>>;
  onGuess: (kind: ReadingKind, value: number) => void;
  onClear: () => void;
  month: number;
}) {
  const [activeKind, setActiveKind] = useState<ReadingKind>('temp');
  const [drafts, setDrafts] = useState<Record<ReadingKind, number>>(() =>
    initialDraftsFor(reading)
  );
  const [reduced, setReduced] = useState<boolean>(() => prefersReducedMotion());

  const sliderRef = useRef<HTMLDivElement>(null);
  const typeBufferRef = useRef<{ kind: ReadingKind; text: string; ts: number }>({
    kind: 'temp',
    text: '',
    ts: 0,
  });

  useEffect(() => {
    try {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduced(mql.matches);
      const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } catch {
      return undefined;
    }
  }, []);

  // Reset drafts if reading changes (e.g. month changed)
  useEffect(() => {
    setDrafts(initialDraftsFor(reading));
  }, [reading]);

  const monthName = MONTH_NAMES[(month - 1 + 12) % 12] ?? 'enero';
  const windDir = compassPoint(reading.windDirDeg);
  const meta = FIELD_META[activeKind];
  const currentDraft = drafts[activeKind];
  const recordedVal = guesses[activeKind];
  const hasRecorded = typeof recordedVal === 'number' && Number.isFinite(recordedVal);
  const status = hasRecorded ? checkGuess(activeKind, recordedVal, reading) : null;
  const truth = truthFor(activeKind, reading);
  const diff = hasRecorded ? roundToStep(Math.abs(recordedVal - truth), meta.step) : 0;

  const updateDraft = (kind: ReadingKind, nextVal: number) => {
    const m = FIELD_META[kind];
    const clean = clampToMeta(nextVal, m);
    setDrafts((prev) => ({ ...prev, [kind]: clean }));
  };

  const confirmReading = (kind: ReadingKind, val: number) => {
    const clean = roundToStep(val, FIELD_META[kind].step);
    onGuess(kind, clean);
  };

  const handleNumericTyping = (kind: ReadingKind, key: string): boolean => {
    if (!/^[0-9.-]$/.test(key)) return false;
    const now = Date.now();
    const buf = typeBufferRef.current;
    const isFresh = buf.kind !== kind || now - buf.ts > 900;
    const nextText = (isFresh ? '' : buf.text) + key;
    typeBufferRef.current = { kind, text: nextText, ts: now };
    setActiveKind(kind);

    if (nextText !== '-' && nextText !== '.' && nextText !== '-.' && !nextText.endsWith('.')) {
      const parsed = Number(nextText);
      if (Number.isFinite(parsed)) {
        const rounded = roundToStep(parsed, FIELD_META[kind].step);
        setDrafts((prev) => ({
          ...prev,
          [kind]: clampToMeta(rounded, FIELD_META[kind]),
        }));
        onGuess(kind, rounded);
      }
    }
    return true;
  };

  const updateFromPointer = (clientX: number, rect: DOMRect) => {
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = meta.min + ratio * (meta.max - meta.min);
    updateDraft(activeKind, raw);
  };

  const sliderPercent = Math.max(
    0,
    Math.min(100, ((currentDraft - meta.min) / (meta.max - meta.min)) * 100)
  );

  return (
    <div className={`orc-activity orc-obs${reduced ? ' is-reduced' : ''}`}>
      <div className="orc-obs-head">
        <KindChip kind="sim" />
        <span className="orc-obs-meta">
          Climatología de {monthName} · Rumbo de veleta: {windDir}
        </span>
      </div>

      <p className="orc-activity-intro">
        Leé cada instrumento dibujado como un observador meteorológico y anotá las cuatro lecturas
        en la libreta.
      </p>

      {/* Instrument Step / Tab Navigation */}
      <div
        className="orc-obs-tabs"
        role="tablist"
        aria-label="Instrumentos meteorológicos"
      >
        {READING_KINDS.map((kind) => {
          const m = FIELD_META[kind];
          const isSelected = activeKind === kind;
          const g = guesses[kind];
          const isDone = typeof g === 'number' && Number.isFinite(g);
          const tabStatus = isDone ? checkGuess(kind, g, reading) : null;

          return (
            <button
              key={kind}
              type="button"
              role="tab"
              id={`orc-obs-tab-${kind}`}
              aria-selected={isSelected}
              aria-controls={`orc-obs-panel-${kind}`}
              aria-label={`${m.label} (${m.unit})`}
              className={`orc-obs-tab${isSelected ? ' is-active' : ''}${tabStatus ? ` is-${tabStatus}` : ''}`}
              onClick={() => setActiveKind(kind)}
              onKeyDown={(e) => {
                if (handleNumericTyping(kind, e.key)) {
                  e.preventDefault();
                }
              }}
            >
              <span className="orc-obs-tab-title">{m.shortLabel}</span>
              <span className="orc-obs-tab-sub">
                {isDone ? `${formatVal(kind, g)} ${m.unit}` : 'Pendiente'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Instrument Plate + Fine Reading Control */}
      <div
        id={`orc-obs-panel-${activeKind}`}
        role="tabpanel"
        aria-labelledby={`orc-obs-tab-${activeKind}`}
        className="orc-obs-stage"
      >
        <div className="orc-obs-stage-head">
          <div>
            <h3 className="orc-obs-stage-title">{meta.label}</h3>
            <p className="orc-obs-stage-desc">{meta.instruction}</p>
          </div>
          <span className="orc-obs-tol-pill">
            Margen ±{TOLERANCE[activeKind]} {meta.unit}
          </span>
        </div>

        {/* SVG Instrument Illustration */}
        {activeKind === 'temp' && (
          <Thermometer
            tempC={reading.tempC}
            draftC={currentDraft}
            reduced={reduced}
          />
        )}
        {activeKind === 'pressure' && (
          <Barometer
            pressureHpa={reading.pressureHpa}
            draftHpa={currentDraft}
            reduced={reduced}
          />
        )}
        {activeKind === 'wind' && (
          <WindMast
            windKmh={reading.windKmh}
            windDirDeg={reading.windDirDeg}
            draftKmh={currentDraft}
            hasGuessed={typeof guesses.wind === 'number' && Number.isFinite(guesses.wind)}
            reduced={reduced}
          />
        )}
        {activeKind === 'clouds' && (
          <CloudPicker
            cloudOktas={reading.cloudOktas}
            draftOktas={currentDraft}
            onSelectOktas={(oktas) => updateDraft('clouds', oktas)}
          />
        )}

        {/* Fine Accessible Control: − button, custom role="slider", + button, and confirm button */}
        <div className="orc-obs-control-box">
          <div className="orc-obs-control-top">
            <span className="orc-obs-control-lbl">
              Tu lectura en el instrumento:
            </span>
            <output className="orc-obs-draft-readout hand" aria-live="off">
              {formatVal(activeKind, currentDraft)} {meta.unit}
            </output>
          </div>

          <div className="orc-obs-slider-row">
            <button
              type="button"
              className="orc-obs-step-btn"
              aria-label={`Disminuir ${meta.label} en ${meta.step} ${meta.unit}`}
              disabled={currentDraft <= meta.min}
              onClick={() => updateDraft(activeKind, currentDraft - meta.step)}
            >
              −
            </button>

            <div
              ref={sliderRef}
              role="slider"
              tabIndex={0}
              className="orc-obs-slider"
              aria-label={`Deslizador de ${meta.label}`}
              aria-valuemin={meta.min}
              aria-valuemax={meta.max}
              aria-valuenow={currentDraft}
              aria-valuetext={`${formatVal(activeKind, currentDraft)} ${meta.unit}`}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const mult = e.shiftKey ? 10 : 1;
                  updateDraft(activeKind, currentDraft + meta.step * mult);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const mult = e.shiftKey ? 10 : 1;
                  updateDraft(activeKind, currentDraft - meta.step * mult);
                } else if (e.key === 'PageUp') {
                  e.preventDefault();
                  updateDraft(activeKind, currentDraft + meta.step * 10);
                } else if (e.key === 'PageDown') {
                  e.preventDefault();
                  updateDraft(activeKind, currentDraft - meta.step * 10);
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  updateDraft(activeKind, meta.min);
                } else if (e.key === 'End') {
                  e.preventDefault();
                  updateDraft(activeKind, meta.max);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmReading(activeKind, currentDraft);
                } else if (handleNumericTyping(activeKind, e.key)) {
                  e.preventDefault();
                }
              }}
              onPointerDown={(e) => {
                const el = e.currentTarget;
                el.focus();
                el.setPointerCapture(e.pointerId);
                const rect = el.getBoundingClientRect();
                updateFromPointer(e.clientX, rect);
              }}
              onPointerMove={(e) => {
                if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                const rect = e.currentTarget.getBoundingClientRect();
                updateFromPointer(e.clientX, rect);
              }}
            >
              <div className="orc-obs-slider-track">
                <div
                  className="orc-obs-slider-fill"
                  style={{ width: `${sliderPercent}%` }}
                />
                <div
                  className="orc-obs-slider-thumb"
                  style={{ left: `${sliderPercent}%` }}
                />
              </div>
              <div className="orc-obs-slider-limits" aria-hidden="true">
                <span>
                  {meta.min} {meta.unit}
                </span>
                <span>
                  paso {meta.step} {meta.unit}
                </span>
                <span>
                  {meta.max} {meta.unit}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="orc-obs-step-btn"
              aria-label={`Aumentar ${meta.label} en ${meta.step} ${meta.unit}`}
              disabled={currentDraft >= meta.max}
              onClick={() => updateDraft(activeKind, currentDraft + meta.step)}
            >
              +
            </button>
          </div>

          <div className="orc-obs-confirm-row">
            <button
              type="button"
              className="btn primary orc-obs-confirm-btn"
              onClick={() => confirmReading(activeKind, currentDraft)}
            >
              Anotar lectura ({formatVal(activeKind, currentDraft)} {meta.unit})
            </button>
          </div>
        </div>

        {/* Reading Feedback Banner */}
        {status && hasRecorded && (
          <div className={`orc-obs-feedback is-${status}`} role="status" aria-live="polite">
            <div className="orc-obs-feedback-txt">
              {status === 'exact' && (
                <>
                  <strong>¡Lectura exacta!</strong>{' '}
                  <span>
                    Registraste {formatVal(activeKind, recordedVal)} {meta.unit} en la libreta.
                  </span>
                </>
              )}
              {status === 'close' && (
                <>
                  <strong>Muy cerca, dentro del margen</strong>{' '}
                  <span>
                    Registraste {formatVal(activeKind, recordedVal)} {meta.unit} (tolerancia ±
                    {TOLERANCE[activeKind]} {meta.unit}).
                  </span>
                </>
              )}
              {status === 'off' && (
                <>
                  <strong>Lectura fuera del margen:</strong>{' '}
                  <span>
                    se desvió por {formatVal(activeKind, diff)} {meta.unit}{' '}
                    {recordedVal > truth ? 'por encima' : 'por debajo'} del instrumento (margen ±
                    {TOLERANCE[activeKind]} {meta.unit}).
                  </span>
                </>
              )}
            </div>
            {status === 'off' && (
              <button
                type="button"
                className="orc-obs-retry-btn"
                onClick={() => sliderRef.current?.focus()}
              >
                Reintentar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Field Meteorological Notebook */}
      <Notebook
        reading={reading}
        guesses={guesses}
        activeKind={activeKind}
        onSelectKind={(kind) => setActiveKind(kind)}
        onClear={() => {
          setDrafts(initialDraftsFor(reading));
          setActiveKind('temp');
          onClear();
        }}
        month={month}
        reduced={reduced}
      />
    </div>
  );
}
