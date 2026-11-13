import type { BuildingId } from '@antartida/core';

export const MONTH_SHORT: readonly string[] = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
] as const;

export const BUILDING_LABELS: Record<BuildingId, string> = {
  omond: 'Casa Omond (piedra, 1903)',
  moneta: 'Casa Moneta (madera, 1905)',
  radioMast: 'Torres de radio (1927)',
  modern: 'Laboratorio LABORC y pabellones',
  flag: 'Pabellón nacional',
  windMast: 'Mástil de viento',
};

export function seasonForMonth(month: number): string {
  switch (month) {
    case 12:
    case 1:
    case 2:
      return 'Verano austral';
    case 3:
    case 4:
    case 5:
      return 'Otoño austral';
    case 6:
    case 7:
    case 8:
      return 'Invierno austral';
    default:
      return 'Primavera austral';
  }
}

export function seaIceDescription(iceFraction: number): string {
  if (iceFraction >= 1) return 'bahía cerrada';
  if (iceFraction > 0) return 'hielo suelto';
  return 'bahía abierta';
}

/**
 * Formats decimal daylight hours into "H h MM min" (e.g., 5.678 -> "5 h 40 min").
 */
export function formatHoursMinutes(hours: number): string {
  const clamped = Math.max(0, Math.min(24, hours));
  const h = Math.floor(clamped);
  const m = Math.floor((clamped - h) * 60 + 1e-6);
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

/**
 * Formats a solar hour float (0..24) into "HH:MM" clock notation.
 */
export function formatSolarClock(hourFloat: number): string {
  const norm = Math.max(0, Math.min(24, hourFloat));
  const totalMinutes = Math.round(norm * 60);
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function sunriseSunsetHours(daylightHours: number): {
  sunrise: number;
  sunset: number;
} {
  const half = Math.max(0, Math.min(12, daylightHours / 2));
  return {
    sunrise: 12 - half,
    sunset: 12 + half,
  };
}

export function formatSignedTemp(tempC: number): string {
  const fixed = tempC.toFixed(1).replace('.', ',');
  return tempC > 0 ? `+${fixed}` : fixed;
}

const DEG_TO_RAD = Math.PI / 180;

/**
 * Converts polar coordinates where 0 deg is at 12 o'clock (top) and increases clockwise.
 */
export function polarFromTop(
  cx: number,
  cy: number,
  r: number,
  angleDegFromTop: number
): { x: number; y: number } {
  const rad = (angleDegFromTop - 90) * DEG_TO_RAD;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/**
 * Builds an SVG path for an annular sector between `rInner` and `rOuter`
 * from `startDeg` to `endDeg` (measured clockwise from 12 o'clock).
 */
export function annularSectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): string {
  const p1 = polarFromTop(cx, cy, rOuter, startDeg);
  const p2 = polarFromTop(cx, cy, rOuter, endDeg);
  const p3 = polarFromTop(cx, cy, rInner, endDeg);
  const p4 = polarFromTop(cx, cy, rInner, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/**
 * Returns angle in degrees (0..360) clockwise from 12 o'clock (top) around (cx, cy).
 */
export function angleDegFromTop(cx: number, cy: number, x: number, y: number): number {
  const rad = Math.atan2(y - cy, x - cx);
  const deg = (rad * 180) / Math.PI + 90;
  return ((deg % 360) + 360) % 360;
}
