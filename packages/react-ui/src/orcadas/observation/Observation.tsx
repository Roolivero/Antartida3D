import {
  MONTH_NAMES,
  TOLERANCE,
  checkGuess,
  prefersReducedMotion,
  truthFor,
  type Reading,
  type ReadingKind,
} from '@antartida/core';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { KindChip } from '../KindChip.tsx';
import { Barometer } from './Barometer.tsx';
import { CloudPicker } from './CloudPicker.tsx';
import { Thermometer } from './Thermometer.tsx';
import { WindMast } from './WindMast.tsx';

interface InstrumentMeta {
  label: string;
  shortLabel: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

const OPTIONAL_KINDS = ['pressure', 'wind', 'clouds'] as const;
type OptionalKind = (typeof OPTIONAL_KINDS)[number];

const FIELD_META: Record<ReadingKind, InstrumentMeta> = {
  temp: {
    label: 'Temperatura del abrigo',
    shortLabel: 'Termómetro',
    unit: '°C',
    min: -25,
    max: 10,
    step: 0.1,
  },
  pressure: {
    label: 'Presión atmosférica',
    shortLabel: 'Barómetro',
    unit: 'hPa',
    // Same range as the barometer dial (950 to 1030 hPa).
    min: 950,
    max: 1030,
    step: 0.1,
  },
  wind: {
    label: 'Velocidad del viento',
    shortLabel: 'Viento',
    unit: 'km/h',
    min: 0,
    max: 120,
    step: 1,
  },
  clouds: {
    label: 'Cobertura de nubes',
    shortLabel: 'Nubes',
    unit: 'octas',
    min: 0,
    max: 8,
    step: 1,
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

/** Value for the number input, which needs a decimal point. */
function inputVal(kind: ReadingKind, val: number): string {
  return FIELD_META[kind].step < 1 ? val.toFixed(1) : String(Math.round(val));
}

const decimalComma = (val: number | string): string => String(val).replace('.', ',');

/** Value shown as text, with a decimal comma. */
function formatVal(kind: ReadingKind, val: number): string {
  return decimalComma(inputVal(kind, val));
}

function initialTempDraft(tempC: number): number {
  const centerDeg = Math.round(tempC);
  const candidate = tempC > centerDeg ? centerDeg - 0.9 : centerDeg + 0.9;
  const clamped = clampToMeta(candidate, FIELD_META.temp);
  if (Math.abs(clamped - tempC) <= 0.6) {
    const alt = tempC > centerDeg ? centerDeg + 0.9 : centerDeg - 0.9;
    return clampToMeta(alt, FIELD_META.temp);
  }
  return clamped;
}

function initialDraftsFor(reading: Reading): Record<ReadingKind, number> {
  return {
    temp: initialTempDraft(reading.tempC),
    pressure: Math.abs(reading.pressureHpa - 995.0) < 0.05 ? 988.0 : 995.0,
    wind: reading.windKmh === 20 ? 12 : 20,
    clouds: reading.cloudOktas === 4 ? 2 : 4,
  };
}

function FineSliderRow({
  kind,
  draft,
  sliderRef,
  onDraft,
  onConfirm,
  onTypeGuess,
  onNumericKey,
}: {
  kind: ReadingKind;
  draft: number;
  sliderRef?: RefObject<HTMLDivElement | null>;
  onDraft: (nextVal: number) => void;
  onConfirm: () => void;
  onTypeGuess: (val: number) => void;
  onNumericKey: (kind: ReadingKind, key: string) => boolean;
}) {
  const meta = FIELD_META[kind];
  const [inputStr, setInputStr] = useState<string>(() => inputVal(kind, draft));
  const inputFocusedRef = useRef(false);

  useEffect(() => {
    setInputStr(inputVal(kind, draft));
  }, [kind]);

  useEffect(() => {
    if (!inputFocusedRef.current) {
      setInputStr(inputVal(kind, draft));
    }
  }, [kind, draft]);

  const updateFromPointer = (clientX: number, rect: DOMRect) => {
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onDraft(meta.min + ratio * (meta.max - meta.min));
  };

  const sliderPercent = Math.max(
    0,
    Math.min(100, ((draft - meta.min) / (meta.max - meta.min)) * 100)
  );

  return (
    <div className="orc-obs-slider-row">
      <button
        type="button"
        className="orc-obs-step-btn"
        aria-label={`Disminuir ${meta.label} en ${meta.step} ${meta.unit}`}
        disabled={draft <= meta.min}
        onClick={() => onDraft(draft - meta.step)}
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
        aria-valuenow={draft}
        aria-valuetext={`${formatVal(kind, draft)} ${meta.unit}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onDraft(draft + meta.step * (e.shiftKey ? 10 : 1));
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onDraft(draft - meta.step * (e.shiftKey ? 10 : 1));
          } else if (e.key === 'PageUp') {
            e.preventDefault();
            onDraft(draft + meta.step * 10);
          } else if (e.key === 'PageDown') {
            e.preventDefault();
            onDraft(draft - meta.step * 10);
          } else if (e.key === 'Home') {
            e.preventDefault();
            onDraft(meta.min);
          } else if (e.key === 'End') {
            e.preventDefault();
            onDraft(meta.max);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm();
          } else if (onNumericKey(kind, e.key)) {
            e.preventDefault();
          }
        }}
        onPointerDown={(e) => {
          const el = e.currentTarget;
          el.focus();
          el.setPointerCapture?.(e.pointerId);
          updateFromPointer(e.clientX, el.getBoundingClientRect());
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture && !e.currentTarget.hasPointerCapture(e.pointerId)) {
            return;
          }
          if (e.buttons === 0 && !e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
          updateFromPointer(e.clientX, e.currentTarget.getBoundingClientRect());
        }}
      >
        <div className="orc-obs-slider-track">
          <div className="orc-obs-slider-fill" style={{ width: `${sliderPercent}%` }} />
          <div className="orc-obs-slider-thumb" style={{ left: `${sliderPercent}%` }} />
        </div>
        <div className="orc-obs-slider-limits" aria-hidden="true">
          <span>
            {meta.min} {meta.unit}
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
        disabled={draft >= meta.max}
        onClick={() => onDraft(draft + meta.step)}
      >
        +
      </button>

      <input
        type="number"
        inputMode="decimal"
        className="orc-obs-num-input"
        aria-label={`Lectura numérica de ${meta.label}`}
        min={meta.min}
        max={meta.max}
        step={meta.step}
        value={inputStr}
        onFocus={() => {
          inputFocusedRef.current = true;
        }}
        onChange={(e) => {
          const text = e.target.value;
          setInputStr(text);
          if (text !== '' && text !== '-' && text !== '.' && text !== '-.' && !text.endsWith('.')) {
            const parsed = Number(text);
            if (Number.isFinite(parsed)) {
              const rounded = roundToStep(parsed, meta.step);
              onDraft(rounded);
              onTypeGuess(rounded);
            }
          }
        }}
        onBlur={() => {
          inputFocusedRef.current = false;
          setInputStr(inputVal(kind, draft));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm();
          }
        }}
      />
    </div>
  );
}

function ReadingFeedback({
  kind,
  recordedVal,
  truth,
  status,
  onRetry,
}: {
  kind: ReadingKind;
  recordedVal: number;
  truth: number;
  status: 'exact' | 'close' | 'off';
  onRetry: () => void;
}) {
  const meta = FIELD_META[kind];
  const diff = roundToStep(Math.abs(recordedVal - truth), meta.step);
  return (
    <div className={`orc-obs-feedback is-${status}`} role="status" aria-live="polite">
      <div className="orc-obs-feedback-txt">
        {status === 'exact' && (
          <>
            <strong>¡Lectura exacta!</strong>{' '}
            <span>
              Anotaste {formatVal(kind, recordedVal)} {meta.unit}.
            </span>
          </>
        )}
        {status === 'close' && (
          <>
            <strong>Dentro del margen.</strong>{' '}
            <span>
              Anotaste {formatVal(kind, recordedVal)} {meta.unit} (±{decimalComma(TOLERANCE[kind])} {meta.unit}).
            </span>
          </>
        )}
        {status === 'off' && (
          <>
            <strong>Fuera del margen:</strong>{' '}
            <span>
              se desvió por {formatVal(kind, diff)} {meta.unit}{' '}
              {recordedVal > truth ? 'por encima' : 'por debajo'} (±{decimalComma(TOLERANCE[kind])} {meta.unit}).
            </span>
          </>
        )}
      </div>
      {status === 'off' && (
        <button type="button" className="orc-obs-retry-btn" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Observation({
  reading,
  guesses,
  onGuess,
  month,
}: {
  reading: Reading;
  guesses: Partial<Record<ReadingKind, number>>;
  onGuess: (kind: ReadingKind, value: number) => void;
  month: number;
}) {
  const [activeOptional, setActiveOptional] = useState<OptionalKind>('pressure');
  const [drafts, setDrafts] = useState<Record<ReadingKind, number>>(() =>
    initialDraftsFor(reading)
  );
  const [reduced, setReduced] = useState<boolean>(() => prefersReducedMotion());

  const tempLensRef = useRef<SVGCircleElement>(null);
  const optSliderRef = useRef<HTMLDivElement>(null);
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

  const updateDraft = (kind: ReadingKind, nextVal: number) => {
    const clean = clampToMeta(nextVal, FIELD_META[kind]);
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

  const tempMeta = FIELD_META.temp;
  const tempDraft = drafts.temp;
  const tempRecorded = guesses.temp;
  const hasTempRecorded = typeof tempRecorded === 'number' && Number.isFinite(tempRecorded);
  const tempStatus = hasTempRecorded ? checkGuess('temp', tempRecorded, reading) : null;

  const optMeta = FIELD_META[activeOptional];
  const optDraft = drafts[activeOptional];
  const optRecorded = guesses[activeOptional];
  const hasOptRecorded = typeof optRecorded === 'number' && Number.isFinite(optRecorded);
  const optStatus = hasOptRecorded ? checkGuess(activeOptional, optRecorded, reading) : null;

  return (
    <div className={`orc-obs${reduced ? ' is-reduced' : ''}`}>
      <div className="orc-obs-head">
        <KindChip kind="sim" />
        <span className="orc-obs-meta">Clima de {monthName}</span>
      </div>

      {/* Main instrument: Temperature directly, no tab */}
      <div className="orc-obs-stage-head">
        <div className="orc-obs-stage-title-wrap">
          <h3 className="orc-obs-stage-title">{tempMeta.label}</h3>
          <span className="orc-obs-tol-pill">
            Margen ±{decimalComma(TOLERANCE.temp)} {tempMeta.unit}
          </span>
        </div>
        <p className="orc-obs-hint">
          Tocá o arrastrá en la lupa para alinear la guía con el menisco.
        </p>
      </div>

      <Thermometer
        tempC={reading.tempC}
        draftC={tempDraft}
        reduced={reduced}
        lensRef={tempLensRef}
        onDraftChange={(val) => updateDraft('temp', val)}
        onConfirm={() => confirmReading('temp', tempDraft)}
      />

      <button
        type="button"
        className="btn primary orc-obs-confirm-btn"
        onClick={() => confirmReading('temp', tempDraft)}
      >
        Anotar lectura ({formatVal('temp', tempDraft)} {tempMeta.unit})
      </button>

      {tempStatus && hasTempRecorded && (
        <ReadingFeedback
          kind="temp"
          recordedVal={tempRecorded}
          truth={reading.tempC}
          status={tempStatus}
          onRetry={() => tempLensRef.current?.focus()}
        />
      )}

      <details className="orc-obs-details orc-obs-fine">
        <summary>Ajuste fino</summary>
        <div className="orc-obs-fine-body">
          <FineSliderRow
            kind="temp"
            draft={tempDraft}
            onDraft={(val) => updateDraft('temp', val)}
            onConfirm={() => confirmReading('temp', tempDraft)}
            onTypeGuess={(val) => onGuess('temp', val)}
            onNumericKey={handleNumericTyping}
          />
        </div>
      </details>

      {/* Optional instruments: pressure, wind, clouds */}
      <details className="orc-obs-details orc-obs-more">
        <summary>Mirá también</summary>
        <div className="orc-obs-more-body">
          <div
            className="orc-obs-tabs"
            role="tablist"
            aria-label="Otros instrumentos meteorológicos"
          >
            {OPTIONAL_KINDS.map((kind) => {
              const m = FIELD_META[kind];
              const isSelected = activeOptional === kind;
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
                  onClick={() => setActiveOptional(kind)}
                  onKeyDown={(e) => {
                    if (handleNumericTyping(kind, e.key)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <span className="orc-obs-tab-title">
                    {m.shortLabel}
                    {isDone && (
                      <span className="orc-obs-tab-check" aria-hidden="true">
                        {' '}
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="orc-obs-tab-sub">
                    {isDone ? `${formatVal(kind, g)} ${m.unit}` : 'Opcional'}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            id={`orc-obs-panel-${activeOptional}`}
            role="tabpanel"
            aria-labelledby={`orc-obs-tab-${activeOptional}`}
            className="orc-obs-optional-panel"
          >
            <div className="orc-obs-stage-title-wrap">
              <h3 className="orc-obs-stage-title">{optMeta.label}</h3>
              <span className="orc-obs-tol-pill">
                Margen ±{decimalComma(TOLERANCE[activeOptional])} {optMeta.unit}
              </span>
            </div>

            {activeOptional === 'pressure' && (
              <Barometer
                pressureHpa={reading.pressureHpa}
                draftHpa={optDraft}
                reduced={reduced}
              />
            )}
            {activeOptional === 'wind' && (
              <WindMast
                windKmh={reading.windKmh}
                windDirDeg={reading.windDirDeg}
                draftKmh={optDraft}
                hasGuessed={typeof guesses.wind === 'number' && Number.isFinite(guesses.wind)}
                reduced={reduced}
              />
            )}
            {activeOptional === 'clouds' && (
              <CloudPicker
                cloudOktas={reading.cloudOktas}
                draftOktas={optDraft}
                onSelectOktas={(oktas) => updateDraft('clouds', oktas)}
              />
            )}

            <FineSliderRow
              kind={activeOptional}
              draft={optDraft}
              sliderRef={optSliderRef}
              onDraft={(val) => updateDraft(activeOptional, val)}
              onConfirm={() => confirmReading(activeOptional, optDraft)}
              onTypeGuess={(val) => onGuess(activeOptional, val)}
              onNumericKey={handleNumericTyping}
            />

            <button
              type="button"
              className="btn primary orc-obs-confirm-btn"
              onClick={() => confirmReading(activeOptional, optDraft)}
            >
              Anotar lectura ({formatVal(activeOptional, optDraft)} {optMeta.unit})
            </button>

            {optStatus && hasOptRecorded && (
              <ReadingFeedback
                kind={activeOptional}
                recordedVal={optRecorded}
                truth={truthFor(activeOptional, reading)}
                status={optStatus}
                onRetry={() => optSliderRef.current?.focus()}
              />
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
