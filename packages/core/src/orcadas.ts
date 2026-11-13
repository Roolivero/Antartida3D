import { createSeededRng } from './rng.ts';
import {
  tourStop,
  tourStops,
  type OrcadasTourStop,
} from './content/orcadas.ts';
import {
  ORCADAS_ANNUAL_TEMP,
  ORCADAS_CLIMATE,
  ORCADAS_MONTHLY_TEMP,
} from './content/orcadas-series.ts';

export const CHAPTERS = ['arrival', 'observation', 'journey', 'answer'] as const;
export type Chapter = (typeof CHAPTERS)[number];

export const READING_KINDS = ['temp', 'pressure', 'wind', 'clouds'] as const;
export type ReadingKind = (typeof READING_KINDS)[number];

export const ORCADAS_FIRST_YEAR = 1903;
export const ORCADAS_LAT = -60.74;

export interface OrcadasState {
  chapter: Chapter;
  visited: readonly Chapter[];
  tourIndex: number;
  guesses: Partial<Record<ReadingKind, number>>;
  /** Month shown by the scene and the month controls (1..12). */
  month: number;
  /** Month of the day's observation (1..12). Fixed at start: the scene month never changes the reading. */
  obsMonth: number;
  /** Solar hour (0..23). */
  hour: number;
  year: number;
  maxYear: number;
  panel: boolean;
}

export type OrcadasAction =
  | { type: 'goto'; chapter: Chapter }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'tourNext' }
  | { type: 'tourPrev' }
  | { type: 'tourGo'; index: number }
  | { type: 'guess'; kind: ReadingKind; value: number }
  | { type: 'clearGuesses' }
  | { type: 'month'; month: number }
  | { type: 'hour'; hour: number }
  | { type: 'year'; year: number }
  | { type: 'togglePanel' }
  | { type: 'closePanel' };

function normalizeMonth(month: number): number {
  const m = Math.trunc(month);
  return ((((m - 1) % 12) + 12) % 12) + 1;
}

function clampHour(hour: number): number {
  return Math.max(0, Math.min(23, Math.trunc(hour)));
}

function clampYear(year: number, maxYear: number): number {
  return Math.max(ORCADAS_FIRST_YEAR, Math.min(maxYear, Math.trunc(year)));
}

function appendVisited(visited: readonly Chapter[], chapter: Chapter): readonly Chapter[] {
  return visited.includes(chapter) ? visited : [...visited, chapter];
}

export function chapterIndex(c: Chapter): number {
  return CHAPTERS.indexOf(c);
}

/** True once the main temperature reading is recorded. */
export function observationDone(s: OrcadasState): boolean {
  const v = s.guesses.temp;
  return typeof v === 'number' && Number.isFinite(v);
}

/** The observation is optional: the closing chapter covers a missing one. */
export function canAdvanceOrcadas(s: OrcadasState): boolean {
  return s.chapter !== 'answer';
}

function resolveStopYear(stop: OrcadasTourStop | null, maxYear: number): number | null {
  if (!stop || stop.year === undefined) return null;
  return clampYear(stop.year === 'now' ? maxYear : stop.year, maxYear);
}

function enterChapter(s: OrcadasState, chapter: Chapter): OrcadasState {
  const stopYear = resolveStopYear(tourStop(chapter, 0), s.maxYear);
  return {
    ...s,
    chapter,
    visited: appendVisited(s.visited, chapter),
    tourIndex: 0,
    year: stopYear ?? s.year,
  };
}

function goToStop(s: OrcadasState, index: number): OrcadasState {
  const stops = tourStops(s.chapter);
  const idx = Math.trunc(index);
  if (idx < 0 || idx >= stops.length) return s;
  const stopYear = resolveStopYear(stops[idx], s.maxYear);
  return {
    ...s,
    tourIndex: idx,
    year: stopYear ?? s.year,
  };
}

/** True when no further guided-tour stops remain in the active chapter. */
export function tourAtEnd(s: OrcadasState): boolean {
  const stops = tourStops(s.chapter);
  return stops.length === 0 || s.tourIndex >= stops.length - 1;
}

export function initialOrcadas(month: number, year: number): OrcadasState {
  const maxYear = Math.max(ORCADAS_FIRST_YEAR, Math.trunc(year));
  return {
    chapter: 'arrival',
    visited: ['arrival'],
    tourIndex: 0,
    guesses: {},
    month: normalizeMonth(month),
    obsMonth: normalizeMonth(month),
    hour: 12,
    year: clampYear(year, maxYear),
    maxYear,
    panel: false,
  };
}

export function orcadasReducer(s: OrcadasState, a: OrcadasAction): OrcadasState {
  switch (a.type) {
    case 'goto':
      return enterChapter(s, a.chapter);
    case 'next': {
      if (!canAdvanceOrcadas(s)) return s;
      const idx = chapterIndex(s.chapter);
      if (idx < 0 || idx >= CHAPTERS.length - 1) return s;
      return enterChapter(s, CHAPTERS[idx + 1]);
    }
    case 'back': {
      const idx = chapterIndex(s.chapter);
      if (idx <= 0) return s;
      return enterChapter(s, CHAPTERS[idx - 1]);
    }
    case 'tourNext': {
      if (tourAtEnd(s)) return s;
      return goToStop(s, s.tourIndex + 1);
    }
    case 'tourPrev': {
      if (s.tourIndex <= 0) return s;
      return goToStop(s, Math.min(s.tourIndex - 1, tourStops(s.chapter).length - 1));
    }
    case 'tourGo':
      return goToStop(s, a.index);
    case 'guess':
      return {
        ...s,
        guesses: { ...s.guesses, [a.kind]: a.value },
      };
    case 'clearGuesses':
      return {
        ...s,
        guesses: {},
      };
    case 'month':
      return {
        ...s,
        month: normalizeMonth(a.month),
      };
    case 'hour':
      return {
        ...s,
        hour: clampHour(a.hour),
      };
    case 'year': {
      const year = clampYear(a.year, s.maxYear);
      if (s.chapter !== 'journey') {
        return { ...s, year };
      }
      const stops = tourStops('journey');
      let tourIndex = 0;
      for (let i = 0; i < stops.length; i++) {
        const stopYear = resolveStopYear(stops[i], s.maxYear);
        if (stopYear !== null && stopYear <= year) {
          tourIndex = i;
        }
      }
      return { ...s, year, tourIndex };
    }
    case 'togglePanel':
      return {
        ...s,
        panel: !s.panel,
      };
    case 'closePanel':
      return {
        ...s,
        panel: false,
      };
  }
}

export interface MonthClimate {
  month: number;
  tempMeanC: number;
  tempSdC: number;
  pressureMeanHpa: number;
  pressureSdHpa: number;
  windMeanKmh: number;
  cloudMeanOktas: number;
}

export interface Reading {
  tempC: number;
  pressureHpa: number;
  windKmh: number;
  windDirDeg: number;
  cloudOktas: number;
}

function round1(val: number): number {
  const r = Math.round(val * 10) / 10;
  return Object.is(r, -0) ? 0 : r;
}

function roundClamped1(val: number, min: number, max: number): number {
  let r = round1(Math.max(min, Math.min(max, val)));
  if (r < min) r = round1(min + 0.05);
  if (r > max) r = round1(max - 0.05);
  return Object.is(r, -0) ? 0 : r;
}

/**
 * Generates a deterministic meteorological observation for a given seed and monthly climate.
 * Uses Box-Muller transform clipped to [-2, 2] SD for temperature and pressure,
 * a positively skewed log-normal multiplier around `windMeanKmh` for wind speed,
 * 16-point compass directions (multiples of 22.5 deg), and integer oktas in 0..8.
 */
export function observationFor(seed: number, climate: MonthClimate): Reading {
  const rng = createSeededRng(seed);

  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  const mag1 = Math.sqrt(-2 * Math.log(u1));
  const zTemp = Math.max(-2, Math.min(2, mag1 * Math.cos(2 * Math.PI * u2)));
  const zPres = Math.max(-2, Math.min(2, mag1 * Math.sin(2 * Math.PI * u2)));

  const tempMin = climate.tempMeanC - 2 * climate.tempSdC;
  const tempMax = climate.tempMeanC + 2 * climate.tempSdC;
  const tempC = roundClamped1(climate.tempMeanC + zTemp * climate.tempSdC, tempMin, tempMax);

  const presMin = climate.pressureMeanHpa - 2 * climate.pressureSdHpa;
  const presMax = climate.pressureMeanHpa + 2 * climate.pressureSdHpa;
  const pressureHpa = roundClamped1(
    climate.pressureMeanHpa + zPres * climate.pressureSdHpa,
    presMin,
    presMax
  );

  // Positively skewed multiplier around 1.0 (right tail extends to ~2.26x mean, left tail to ~0.37x mean)
  const u3 = Math.max(1e-12, rng());
  const u4 = rng();
  const zWind = Math.max(-2, Math.min(2, Math.sqrt(-2 * Math.log(u3)) * Math.cos(2 * Math.PI * u4)));
  const windFactor = Math.exp(0.45 * zWind - 0.085);
  const windKmh = Math.max(0, Math.round(Math.max(0, climate.windMeanKmh) * windFactor));

  const windDirDeg = Math.floor(rng() * 16) * 22.5;

  const cloudOffset = (rng() + rng() - 1) * 2;
  const cloudOktas = Math.max(0, Math.min(8, Math.round(climate.cloudMeanOktas + cloudOffset)));

  return {
    tempC,
    pressureHpa,
    windKmh,
    windDirDeg,
    cloudOktas,
  };
}

/** Monthly climate normals for `month` (1..12). */
export function climateFor(month: number): MonthClimate {
  return ORCADAS_CLIMATE[normalizeMonth(month) - 1] ?? ORCADAS_CLIMATE[0];
}

/** The day's simulated reading. Depends on `obsMonth` only, never on the scene month. */
export function readingFor(s: OrcadasState, seed: number): Reading {
  return observationFor(seed + s.obsMonth, climateFor(s.obsMonth));
}

export const TOLERANCE: Record<ReadingKind, number> = {
  temp: 0.5,
  pressure: 1,
  wind: 5,
  clouds: 1,
};

export function truthFor(kind: ReadingKind, reading: Reading): number {
  switch (kind) {
    case 'temp':
      return reading.tempC;
    case 'pressure':
      return reading.pressureHpa;
    case 'wind':
      return reading.windKmh;
    case 'clouds':
      return reading.cloudOktas;
  }
}

export function checkGuess(
  kind: ReadingKind,
  guess: number,
  reading: Reading
): 'exact' | 'close' | 'off' {
  const diff = Math.abs(guess - truthFor(kind, reading));
  const tol = TOLERANCE[kind];
  if (diff <= tol / 2 + 1e-9) return 'exact';
  if (diff <= tol + 1e-9) return 'close';
  return 'off';
}

export function scoreObservation(
  guesses: Partial<Record<ReadingKind, number>>,
  reading: Reading
): number {
  let score = 0;
  for (const kind of READING_KINDS) {
    const g = guesses[kind];
    if (typeof g === 'number' && Number.isFinite(g) && checkGuess(kind, g, reading) !== 'off') {
      score += 1;
    }
  }
  return score;
}

const BEAUFORT_TABLE: readonly { maxKmh: number; name: string }[] = [
  { maxKmh: 1, name: 'Calma' },
  { maxKmh: 6, name: 'Ventolina' },
  { maxKmh: 12, name: 'Brisa muy débil' },
  { maxKmh: 20, name: 'Brisa débil' },
  { maxKmh: 29, name: 'Brisa moderada' },
  { maxKmh: 39, name: 'Brisa fresca' },
  { maxKmh: 50, name: 'Brisa fuerte' },
  { maxKmh: 62, name: 'Viento fuerte' },
  { maxKmh: 75, name: 'Temporal' },
  { maxKmh: 89, name: 'Temporal fuerte' },
  { maxKmh: 103, name: 'Temporal duro' },
  { maxKmh: 118, name: 'Temporal muy duro' },
];

export function beaufort(kmh: number): { force: number; name: string } {
  const v = Math.max(0, kmh);
  for (let force = 0; force < BEAUFORT_TABLE.length; force++) {
    if (v < BEAUFORT_TABLE[force].maxKmh) {
      return { force, name: BEAUFORT_TABLE[force].name };
    }
  }
  return { force: 12, name: 'Huracán' };
}

const COMPASS_POINTS_16 = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSO',
  'SO',
  'OSO',
  'O',
  'ONO',
  'NO',
  'NNO',
] as const;

export function compassPoint(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  const idx = Math.round(norm / 22.5) % 16;
  return COMPASS_POINTS_16[idx];
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
/** Standard sunrise/sunset geometric solar altitude (-0.833 deg) for atmospheric refraction and solar semi-diameter. */
const SUNRISE_ALTITUDE_DEG = -0.833;

/**
 * Solar declination angle in degrees for day of year `dayOfYear` (1..365).
 * Formula: Cooper, P.I. (1969), "The absorption of radiation in solar stills",
 * Solar Energy 12(3): 333-346: delta = 23.45 * sin(2 * pi * (284 + n) / 365).
 */
export function solarDeclinationDeg(dayOfYear: number): number {
  return 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
}

/**
 * Day length in hours at latitude `latDeg` and `dayOfYear`.
 * Uses the sunrise hour angle formula cos(omega_0) = (sin(h_0) - sin(lat)*sin(decl)) / (cos(lat)*cos(decl))
 * with h_0 = -0.833 deg (refraction + solar semi-diameter correction; reduces to -tan(lat)*tan(decl) for h_0 = 0).
 * Reference: Iqbal, M. (1983), An Introduction to Solar Radiation; NOAA Solar Calculator.
 */
export function dayLengthHours(latDeg: number, dayOfYear: number): number {
  const latRad = latDeg * DEG_TO_RAD;
  const declRad = solarDeclinationDeg(dayOfYear) * DEG_TO_RAD;
  const h0Rad = SUNRISE_ALTITUDE_DEG * DEG_TO_RAD;

  const denom = Math.cos(latRad) * Math.cos(declRad);
  if (Math.abs(denom) < 1e-12) {
    return latRad * declRad >= 0 ? 24 : 0;
  }

  const cosOmega = (Math.sin(h0Rad) - Math.sin(latRad) * Math.sin(declRad)) / denom;
  if (cosOmega <= -1) return 24;
  if (cosOmega >= 1) return 0;

  const omegaDeg = Math.acos(cosOmega) * RAD_TO_DEG;
  return (2 * omegaDeg) / 15;
}

/**
 * Solar elevation angle above the horizon in degrees at `latDeg`, `dayOfYear`, and `solarHour` (0..24).
 * Formula: sin(alpha) = sin(lat)*sin(decl) + cos(lat)*cos(decl)*cos(omega), where omega = (solarHour - 12) * 15 deg.
 */
export function solarElevationDeg(latDeg: number, dayOfYear: number, solarHour: number): number {
  const latRad = latDeg * DEG_TO_RAD;
  const declRad = solarDeclinationDeg(dayOfYear) * DEG_TO_RAD;
  const omegaRad = (solarHour - 12) * 15 * DEG_TO_RAD;

  const sinEl =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(omegaRad);
  return Math.asin(Math.max(-1, Math.min(1, sinEl))) * RAD_TO_DEG;
}

/**
 * Solar azimuth angle in degrees clockwise from true North (0 = North, 90 = East, 180 = South, 270 = West).
 * Computed from horizontal tangent-plane components:
 * x_north = cos(lat)*sin(decl) - sin(lat)*cos(decl)*cos(omega),
 * y_east = -cos(decl)*sin(omega).
 */
export function solarAzimuthDeg(latDeg: number, dayOfYear: number, solarHour: number): number {
  const latRad = latDeg * DEG_TO_RAD;
  const declRad = solarDeclinationDeg(dayOfYear) * DEG_TO_RAD;
  const omegaRad = (solarHour - 12) * 15 * DEG_TO_RAD;

  const xNorth =
    Math.cos(latRad) * Math.sin(declRad) -
    Math.sin(latRad) * Math.cos(declRad) * Math.cos(omegaRad);
  const yEast = -Math.cos(declRad) * Math.sin(omegaRad);

  const az = Math.atan2(yEast, xNorth) * RAD_TO_DEG;
  return ((az % 360) + 360) % 360;
}

/** Solar hour (0..23) half an hour before sunset at Orcadas, mid-month; 20 when the sun never sets. */
export function sunsetHour(month: number): number {
  const day = dayLengthHours(ORCADAS_LAT, midMonthDayOfYear(month));
  if (day >= 24) return 20;
  if (day <= 0) return 12;
  return clampHour(Math.floor(12 + day / 2 - 0.5));
}

const MID_MONTH_DAY_OF_YEAR = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349] as const;

/** Day of year (1..365) of the 15th of `month` (1..12) in a non-leap year. */
export function midMonthDayOfYear(month: number): number {
  return MID_MONTH_DAY_OF_YEAR[normalizeMonth(month) - 1];
}

export interface YearValue {
  year: number;
  value: number | null;
}

export function decadeMeans(
  series: readonly YearValue[]
): { decade: number; mean: number; n: number }[] {
  const buckets = new Map<number, { sum: number; n: number }>();
  for (const item of series) {
    if (item.value === null || !Number.isFinite(item.value)) continue;
    const decade = Math.floor(item.year / 10) * 10;
    const entry = buckets.get(decade);
    if (entry) {
      entry.sum += item.value;
      entry.n += 1;
    } else {
      buckets.set(decade, { sum: item.value, n: 1 });
    }
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([decade, { sum, n }]) => ({
      decade,
      mean: sum / n,
      n,
    }));
}

export function linearTrend(
  series: readonly YearValue[]
): { slopePerDecade: number; intercept: number; n: number } | null {
  const valid = series.filter(
    (p): p is { year: number; value: number } => p.value !== null && Number.isFinite(p.value)
  );
  const n = valid.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  for (const p of valid) {
    sumX += p.year;
    sumY += p.value;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let sxy = 0;
  for (const p of valid) {
    const dx = p.year - meanX;
    sxx += dx * dx;
    sxy += dx * (p.value - meanY);
  }
  if (sxx === 0) return null;

  const slopePerYear = sxy / sxx;
  return {
    slopePerDecade: slopePerYear * 10,
    intercept: meanY - slopePerYear * meanX,
    n,
  };
}

export interface TrendSegment {
  fromYear: number;
  toYear: number;
  slopePerDecade: number;
  intercept: number;
  n: number;
}

/**
 * Least-squares trend of two segments split after `splitYear`: [first year, splitYear] and
 * [splitYear + 1, last year with a value]. A segment with fewer than two values is left out.
 */
export function segmentedTrend(series: readonly YearValue[], splitYear: number): TrendSegment[] {
  const valid = series.filter((p) => p.value !== null && Number.isFinite(p.value));
  if (valid.length === 0) return [];
  const parts = [
    valid.filter((p) => p.year <= splitYear),
    valid.filter((p) => p.year > splitYear),
  ];
  const out: TrendSegment[] = [];
  for (const part of parts) {
    const t = linearTrend(part);
    if (!t) continue;
    out.push({ fromYear: part[0].year, toYear: part[part.length - 1].year, ...t });
  }
  return out;
}

/** Split year of the two-segment trend: Zazulie, Rusticucci y Solomon (2010) find no significant trend up to 1950. */
export const ORCADAS_TREND_SPLIT_YEAR = 1950;

export function movingAverage(series: readonly YearValue[], window: number): YearValue[] {
  const w = Math.max(1, Math.trunc(window));
  const halfLeft = Math.floor((w - 1) / 2);

  return series.map((item, i) => {
    const start = i - halfLeft;
    const end = start + w - 1;
    let sum = 0;
    let validCount = 0;

    for (let j = start; j <= end; j++) {
      if (j >= 0 && j < series.length) {
        const val = series[j].value;
        if (val !== null && Number.isFinite(val)) {
          sum += val;
          validCount += 1;
        }
      }
    }

    const missing = w - validCount;
    if (missing > w / 2 || validCount === 0) {
      return { year: item.year, value: null };
    }
    return { year: item.year, value: sum / validCount };
  });
}

/** Years since the record started and how many of them have a complete annual mean. */
export function recordSpan(untilYear: number): { years: number; completeYears: number } {
  const last = Math.trunc(untilYear);
  return {
    years: Math.max(0, last - ORCADAS_FIRST_YEAR),
    completeYears: ORCADAS_ANNUAL_TEMP.filter(
      (p) => p.year < last && p.value !== null && Number.isFinite(p.value)
    ).length,
  };
}

/** One sentence for the record length, shared by every chapter that counts years. */
export function recordSpanText(untilYear: number): string {
  const { years, completeYears } = recordSpan(untilYear);
  if (years === 0) return `Registro desde ${ORCADAS_FIRST_YEAR}: primer año`;
  const yearsWord = years === 1 ? 'año' : 'años';
  return `Registro desde ${ORCADAS_FIRST_YEAR}: ${years} ${yearsWord}, ${completeYears} de ellos completos`;
}

/** Mean temperature of `month` (1..12) in every year of the record; null where the month has no data. */
export function sameMonthSeries(month: number): YearValue[] {
  const idx = normalizeMonth(month) - 1;
  return ORCADAS_MONTHLY_TEMP.map((row) => ({ year: row.year, value: row.months[idx] ?? null }));
}

export interface AnswerSegment {
  fromYear: number;
  toYear: number;
  /** Years with data for the month. */
  years: number;
  /** Of those, years as cold as the reading or colder. */
  asCold: number;
}

/**
 * Answer to the guiding question: in how many years of each segment (up to ORCADAS_TREND_SPLIT_YEAR
 * and after it) the same month was as cold as `tempC` or colder.
 */
export function answerFor(tempC: number, month: number): [AnswerSegment, AnswerSegment] {
  const series = sameMonthSeries(month).filter(
    (p): p is { year: number; value: number } => p.value !== null && Number.isFinite(p.value)
  );
  const build = (part: { year: number; value: number }[]): AnswerSegment => ({
    fromYear: part[0]?.year ?? 0,
    toYear: part[part.length - 1]?.year ?? 0,
    years: part.length,
    asCold: part.filter((p) => p.value <= tempC).length,
  });
  return [
    build(series.filter((p) => p.year <= ORCADAS_TREND_SPLIT_YEAR)),
    build(series.filter((p) => p.year > ORCADAS_TREND_SPLIT_YEAR)),
  ];
}
