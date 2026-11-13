import { useMemo, useRef } from 'react';
import {
  MONTH_NAMES,
  ORCADAS_LAT,
  dayLengthHours,
  factsFor,
  midMonthDayOfYear,
  seaIceAt,
} from '@antartida/core';
import { FactList } from './FactList.tsx';
import { KindChip } from './KindChip.tsx';
import { SunArc } from './time/SunArc.tsx';
import {
  MONTH_SHORT,
  formatHoursMinutes,
  seaIceDescription,
} from './time/timeMath.ts';

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
  const normMonth = (((month - 1) % 12) + 12) % 12 + 1;
  const monthName = MONTH_NAMES[normMonth - 1] ?? 'enero';
  const monthFacts = useMemo(() => factsFor('months'), []);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = normMonth === 1 ? 12 : normMonth - 1;
      onMonth(prev);
      btnRefs.current[prev - 1]?.focus();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = normMonth === 12 ? 1 : normMonth + 1;
      onMonth(next);
      btnRefs.current[next - 1]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      onMonth(1);
      btnRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      onMonth(12);
      btnRefs.current[11]?.focus();
    }
  };

  return (
    <aside className="orc-month-strip-wrap" aria-label="Control estacional de la estación">
      <div
        className="orc-month-strip"
        role="group"
        aria-label="Mes en la estación"
        onKeyDown={handleKeyDown}
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
              onClick={() => onMonth(m)}
            >
              <span className="orc-month-short">{shortName}</span>
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
    </aside>
  );
}
