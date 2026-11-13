import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MONTH_NAMES,
  ORCADAS_LAT,
  dayLengthHours,
  factsFor,
  midMonthDayOfYear,
  seaIceAt,
} from '@antartida/core';
import { useMediaQuery } from '../hooks.ts';
import { FactList } from './FactList.tsx';
import { KindChip } from './KindChip.tsx';
import { SunArc } from './time/SunArc.tsx';
import {
  MONTH_SHORT,
  formatHoursMinutes,
  seaIceDescription,
} from './time/timeMath.ts';

const POPOVER_ID = 'orc-month-popover';

function MonthBars({
  daylightPct,
  seaIce,
}: {
  daylightPct: number;
  seaIce: number;
}) {
  return (
    <>
      <span className="orc-month-daylight-track" aria-hidden="true">
        <span
          className="orc-month-daylight-bar"
          style={{ height: `${daylightPct.toFixed(0)}%` }}
        />
      </span>
      <span
        className="orc-month-ice-stripe"
        style={{ opacity: 0.15 + seaIce * 0.85 }}
        data-ice={seaIce > 0 ? 'yes' : 'no'}
        aria-hidden="true"
      />
    </>
  );
}

export function MonthStrip({
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
  // The whole strip only where the scene has room for it: a phone, upright or on its side, gets the chip.
  const isDesktop = useMediaQuery('(min-width: 900px) and (min-height: 501px)');
  const [open, setOpen] = useState(false);

  const normMonth = (((month - 1) % 12) + 12) % 12 + 1;
  const monthName = MONTH_NAMES[normMonth - 1] ?? 'enero';
  const chipMonthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const monthFacts = useMemo(() => factsFor('months'), []);

  const wrapRef = useRef<HTMLElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wasOpenRef = useRef(false);
  const returnFocusRef = useRef(false);
  const outsideFocusTimerRef = useRef<number | null>(null);
  const normMonthRef = useRef(normMonth);
  normMonthRef.current = normMonth;

  useEffect(() => {
    return () => {
      if (outsideFocusTimerRef.current !== null) {
        window.clearTimeout(outsideFocusTimerRef.current);
      }
    };
  }, []);

  const daylight = dayLengthHours(ORCADAS_LAT, midMonthDayOfYear(normMonth));
  const ice = seaIceAt(normMonth);
  const iceDesc = seaIceDescription(ice);

  const monthsData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const d = dayLengthHours(ORCADAS_LAT, midMonthDayOfYear(m));
      const daylightPct = Math.min(100, Math.max(0, (d / 24) * 100));
      const seaIce = seaIceAt(m);
      return {
        m,
        shortName: MONTH_SHORT[i] ?? '',
        fullName: MONTH_NAMES[i] ?? '',
        daylightPct,
        seaIce,
      };
    });
  }, []);

  const currentMonthData = monthsData[normMonth - 1] ?? monthsData[0]!;

  useEffect(() => {
    if (isDesktop) setOpen(false);
  }, [isDesktop]);

  // Move focus into the active month when opening on mobile, and return to the chip on close.
  useEffect(() => {
    if (isDesktop) {
      wasOpenRef.current = false;
      returnFocusRef.current = false;
      return;
    }
    if (open && !wasOpenRef.current) {
      btnRefs.current[normMonthRef.current - 1]?.focus();
    } else if (!open && wasOpenRef.current && returnFocusRef.current) {
      chipRef.current?.focus();
    }
    wasOpenRef.current = open;
    returnFocusRef.current = false;
  }, [open, isDesktop]);

  useEffect(() => {
    if (isDesktop || !open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (wrapRef.current?.contains(target)) return;
      const interactive = target?.closest(
        'button, a, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'
      );
      returnFocusRef.current = false;
      setOpen(false);
      if (!interactive) {
        if (outsideFocusTimerRef.current !== null) {
          window.clearTimeout(outsideFocusTimerRef.current);
        }
        // Defer past the browser's mousedown blur on non-focusable targets like the 3D canvas.
        outsideFocusTimerRef.current = window.setTimeout(() => {
          outsideFocusTimerRef.current = null;
          if (!document.activeElement || document.activeElement === document.body) {
            chipRef.current?.focus();
          }
        }, 0);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isDesktop, open]);

  const stepMonth = (key: string): number | null => {
    if (key === 'ArrowLeft' || key === 'ArrowDown') {
      return normMonth === 1 ? 12 : normMonth - 1;
    }
    if (key === 'ArrowRight' || key === 'ArrowUp') {
      return normMonth === 12 ? 1 : normMonth + 1;
    }
    if (key === 'Home') return 1;
    if (key === 'End') return 12;
    return null;
  };

  const handleStripKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const next = stepMonth(e.key);
    if (next !== null) {
      e.preventDefault();
      e.stopPropagation();
      onMonth(next);
      btnRefs.current[next - 1]?.focus();
    }
  };

  const handleChipKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      returnFocusRef.current = true;
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
      const next = stepMonth(e.key);
      if (next !== null) {
        e.preventDefault();
        e.stopPropagation();
        onMonth(next);
      }
    }
  };

  const handleSelectMonth = (m: number) => {
    onMonth(m);
    if (!isDesktop) {
      returnFocusRef.current = true;
      setOpen(false);
    }
  };

  const stripBody = (
    <>
      <div
        className="orc-month-strip"
        role="group"
        aria-label="Mes en la estación"
        onKeyDown={handleStripKeyDown}
      >
        {monthsData.map(({ m, shortName, fullName, daylightPct, seaIce }, idx) => {
          const isCurrent = m === normMonth;
          return (
            <button
              key={m}
              ref={(el) => {
                btnRefs.current[idx] = el;
              }}
              type="button"
              className={`orc-month-btn${isCurrent ? ' is-active' : ''}`}
              aria-pressed={isCurrent}
              aria-label={fullName}
              tabIndex={isCurrent ? 0 : -1}
              onClick={() => handleSelectMonth(m)}
            >
              <span className="orc-month-short">{shortName}</span>
              <MonthBars daylightPct={daylightPct} seaIce={seaIce} />
            </button>
          );
        })}
      </div>

      <p className="orc-month-legend" aria-hidden="true">
        <span className="orc-month-legend-sun" /> Horas de luz
        <span className="orc-month-legend-ice" /> Hielo en la bahía (simulación)
      </p>

      <details className="orc-month-details">
        <summary className="orc-month-summary-toggle">
          Saber más
        </summary>
        <div className="orc-month-details-body">
          <div className="orc-month-info-row">
            <span className="orc-month-daylight-text">
              Luz solar en {monthName}: {formatHoursMinutes(daylight)}
            </span>
            <span className="orc-month-ice-text">
              <KindChip kind="sim" />
              <span>Bahía Scotia: {iceDesc}</span>
            </span>
          </div>

          <SunArc
            month={normMonth}
            hour={hour}
            monthName={monthName}
            onHour={onHour}
          />

          <FactList facts={monthFacts} />
        </div>
      </details>
    </>
  );

  return (
    <aside
      ref={wrapRef}
      className="orc-month-strip-wrap"
      aria-label="Control estacional de la estación"
    >
      {isDesktop ? (
        stripBody
      ) : (
        <>
          <button
            ref={chipRef}
            type="button"
            className="orc-month-chip"
            aria-expanded={open}
            aria-controls={POPOVER_ID}
            aria-label={`Mes: ${monthName}. Cambiar mes`}
            onClick={() => {
              if (open) {
                returnFocusRef.current = true;
                setOpen(false);
              } else {
                setOpen(true);
              }
            }}
            onKeyDown={handleChipKeyDown}
          >
            <span className="orc-month-chip-name">{chipMonthLabel}</span>
            <span className="orc-month-chip-bars" aria-hidden="true">
              <MonthBars
                daylightPct={currentMonthData.daylightPct}
                seaIce={currentMonthData.seaIce}
              />
            </span>
            <span className="orc-month-chip-caret" aria-hidden="true">
              ▾
            </span>
          </button>

          {open && (
            <div
              id={POPOVER_ID}
              className="orc-month-popover"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  returnFocusRef.current = true;
                  setOpen(false);
                }
              }}
            >
              {stripBody}
            </div>
          )}
        </>
      )}
    </aside>
  );
}
