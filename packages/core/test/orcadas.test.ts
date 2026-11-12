import { describe, expect, it } from 'vitest';
import {
  CHAPTERS,
  ORCADAS_FIRST_YEAR,
  ORCADAS_LAT,
  READING_KINDS,
  TOLERANCE,
  beaufort,
  canAdvanceOrcadas,
  chapterIndex,
  checkGuess,
  compassPoint,
  dayLengthHours,
  decadeMeans,
  initialOrcadas,
  linearTrend,
  midMonthDayOfYear,
  movingAverage,
  observationDone,
  observationFor,
  orcadasReducer as reduce,
  scoreObservation,
  solarAzimuthDeg,
  solarDeclinationDeg,
  solarElevationDeg,
  truthFor,
  type MonthClimate,
  type OrcadasAction,
  type OrcadasState,
  type YearValue,
} from '../src/orcadas.ts';

const run = (actions: OrcadasAction[], from: OrcadasState = initialOrcadas(2, 2025)) =>
  actions.reduce(reduce, from);

const SAMPLE_CLIMATE: MonthClimate = {
  month: 2,
  tempMeanC: 1.2,
  tempSdC: 1.8,
  pressureMeanHpa: 992.4,
  pressureSdHpa: 8.5,
  windMeanKmh: 24,
  cloudMeanOktas: 7,
};

describe('chapters and state', () => {
  it('initializes at arrival, solar noon, with clamped year and normalized month', () => {
    const s = initialOrcadas(11, 2026);
    expect(s.chapter).toBe('arrival');
    expect(s.visited).toEqual(['arrival']);
    expect(s.guesses).toEqual({});
    expect(s.month).toBe(11);
    expect(s.hour).toBe(12);
    expect(s.year).toBe(2026);
    expect(s.maxYear).toBe(2026);
    expect(s.panel).toBe(false);
    expect(CHAPTERS.map(chapterIndex)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('blocks next on observation until all 4 readings are recorded, and stops at done', () => {
    let s = initialOrcadas(1, 2025);
    expect(canAdvanceOrcadas(s)).toBe(true);
    s = reduce(s, { type: 'next' });
    expect(s.chapter).toBe('observation');
    expect(observationDone(s)).toBe(false);
    expect(canAdvanceOrcadas(s)).toBe(false);
    expect(reduce(s, { type: 'next' }).chapter).toBe('observation');

    s = run(
      [
        { type: 'guess', kind: 'temp', value: 0.5 },
        { type: 'guess', kind: 'pressure', value: 990 },
        { type: 'guess', kind: 'wind', value: 20 },
      ],
      s
    );
    expect(observationDone(s)).toBe(false);
    expect(reduce(s, { type: 'next' }).chapter).toBe('observation');

    s = reduce(s, { type: 'guess', kind: 'clouds', value: 6 });
    expect(observationDone(s)).toBe(true);
    expect(canAdvanceOrcadas(s)).toBe(true);

    s = run([{ type: 'next' }, { type: 'next' }, { type: 'next' }, { type: 'next' }], s);
    expect(s.chapter).toBe('done');
    expect(canAdvanceOrcadas(s)).toBe(false);
    expect(reduce(s, { type: 'next' }).chapter).toBe('done');
    expect(s.visited).toEqual(CHAPTERS);

    const cleared = reduce(s, { type: 'clearGuesses' });
    expect(cleared.guesses).toEqual({});
    expect(observationDone(cleared)).toBe(false);
  });

  it('does not go back from arrival and accumulates visited without duplicates', () => {
    const init = initialOrcadas(3, 2024);
    expect(reduce(init, { type: 'back' })).toBe(init);

    const jumped = run(
      [
        { type: 'goto', chapter: 'eras' },
        { type: 'goto', chapter: 'year' },
        { type: 'goto', chapter: 'eras' },
        { type: 'back' },
      ],
      init
    );
    expect(jumped.chapter).toBe('year');
    expect(jumped.visited).toEqual(['arrival', 'eras', 'year']);
  });

  it('normalizes month circularly, clamps hour to 0..23 and year to [1903, maxYear]', () => {
    const base = initialOrcadas(6, 2024);
    expect(reduce(base, { type: 'month', month: 13 }).month).toBe(1);
    expect(reduce(base, { type: 'month', month: 0 }).month).toBe(12);
    expect(reduce(base, { type: 'month', month: -1 }).month).toBe(11);
    expect(reduce(base, { type: 'month', month: 25 }).month).toBe(1);

    expect(reduce(base, { type: 'hour', hour: -5 }).hour).toBe(0);
    expect(reduce(base, { type: 'hour', hour: 24 }).hour).toBe(23);
    expect(reduce(base, { type: 'hour', hour: 15 }).hour).toBe(15);

    expect(reduce(base, { type: 'year', year: 1850 }).year).toBe(ORCADAS_FIRST_YEAR);
    expect(reduce(base, { type: 'year', year: 2099 }).year).toBe(2024);
    expect(reduce(base, { type: 'year', year: 1955 }).year).toBe(1955);
  });

  it('toggles and closes the side panel', () => {
    const s1 = reduce(initialOrcadas(1, 2025), { type: 'togglePanel' });
    expect(s1.panel).toBe(true);
    const s2 = reduce(s1, { type: 'togglePanel' });
    expect(s2.panel).toBe(false);
    const s3 = reduce(s1, { type: 'closePanel' });
    expect(s3.panel).toBe(false);
  });
});

describe('simulated observation', () => {
  it('is deterministic for the same seed and climate', () => {
    const a = observationFor(42, SAMPLE_CLIMATE);
    const b = observationFor(42, SAMPLE_CLIMATE);
    const c = observationFor(43, SAMPLE_CLIMATE);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('keeps all 500 seeds within physical and statistical bounds with positive wind skew', () => {
    const tempMin = SAMPLE_CLIMATE.tempMeanC - 2 * SAMPLE_CLIMATE.tempSdC;
    const tempMax = SAMPLE_CLIMATE.tempMeanC + 2 * SAMPLE_CLIMATE.tempSdC;
    const presMin = SAMPLE_CLIMATE.pressureMeanHpa - 2 * SAMPLE_CLIMATE.pressureSdHpa;
    const presMax = SAMPLE_CLIMATE.pressureMeanHpa + 2 * SAMPLE_CLIMATE.pressureSdHpa;

    const winds: number[] = [];
    for (let seed = 1; seed <= 500; seed++) {
      const r = observationFor(seed, SAMPLE_CLIMATE);
      expect(r.tempC).toBeGreaterThanOrEqual(tempMin - 1e-9);
      expect(r.tempC).toBeLessThanOrEqual(tempMax + 1e-9);
      expect(Math.round(r.tempC * 10)).toBeCloseTo(r.tempC * 10, 6);

      expect(r.pressureHpa).toBeGreaterThanOrEqual(presMin - 1e-9);
      expect(r.pressureHpa).toBeLessThanOrEqual(presMax + 1e-9);
      expect(Math.round(r.pressureHpa * 10)).toBeCloseTo(r.pressureHpa * 10, 6);

      expect(Number.isInteger(r.windKmh)).toBe(true);
      expect(r.windKmh).toBeGreaterThanOrEqual(0);
      winds.push(r.windKmh);

      expect(r.windDirDeg).toBeGreaterThanOrEqual(0);
      expect(r.windDirDeg).toBeLessThanOrEqual(359);
      expect(r.windDirDeg % 22.5).toBe(0);

      expect(Number.isInteger(r.cloudOktas)).toBe(true);
      expect(r.cloudOktas).toBeGreaterThanOrEqual(0);
      expect(r.cloudOktas).toBeLessThanOrEqual(8);
    }

    const windMean = winds.reduce((s, v) => s + v, 0) / winds.length;
    const windMin = Math.min(...winds);
    const windMax = Math.max(...winds);
    expect(windMean).toBeGreaterThan(SAMPLE_CLIMATE.windMeanKmh * 0.8);
    expect(windMean).toBeLessThan(SAMPLE_CLIMATE.windMeanKmh * 1.2);
    // Positively skewed: upper tail from mean is wider than lower tail from mean
    expect(windMax - windMean).toBeGreaterThan(windMean - windMin);
  });

  it('evaluates truthFor, checkGuess tolerances and scoreObservation', () => {
    const reading = {
      tempC: -2.4,
      pressureHpa: 991.2,
      windKmh: 30,
      windDirDeg: 270,
      cloudOktas: 6,
    };

    expect(READING_KINDS.map((k) => truthFor(k, reading))).toEqual([-2.4, 991.2, 30, 6]);
    expect(TOLERANCE).toEqual({ temp: 0.5, pressure: 1, wind: 5, clouds: 1 });

    // temp: exact <= 0.25, close <= 0.5
    expect(checkGuess('temp', -2.15, reading)).toBe('exact');
    expect(checkGuess('temp', -1.9, reading)).toBe('close');
    expect(checkGuess('temp', -1.8, reading)).toBe('off');

    // pressure: exact <= 0.5, close <= 1.0
    expect(checkGuess('pressure', 991.7, reading)).toBe('exact');
    expect(checkGuess('pressure', 992.2, reading)).toBe('close');
    expect(checkGuess('pressure', 992.3, reading)).toBe('off');

    // wind: exact <= 2.5, close <= 5
    expect(checkGuess('wind', 32, reading)).toBe('exact');
    expect(checkGuess('wind', 35, reading)).toBe('close');
    expect(checkGuess('wind', 36, reading)).toBe('off');

    // clouds: exact <= 0.5, close <= 1
    expect(checkGuess('clouds', 6, reading)).toBe('exact');
    expect(checkGuess('clouds', 7, reading)).toBe('close');
    expect(checkGuess('clouds', 8, reading)).toBe('off');

    expect(
      scoreObservation({ temp: -2.4, pressure: 992.1, wind: 40, clouds: 5 }, reading)
    ).toBe(3);
    expect(scoreObservation({}, reading)).toBe(0);
  });
});

describe('wind scales', () => {
  it('maps km/h to Beaufort 0..12 with Spanish names', () => {
    const cases: readonly [number, number, string][] = [
      [0, 0, 'Calma'],
      [0.8, 0, 'Calma'],
      [1, 1, 'Ventolina'],
      [5, 1, 'Ventolina'],
      [6, 2, 'Brisa muy débil'],
      [11, 2, 'Brisa muy débil'],
      [12, 3, 'Brisa débil'],
      [19, 3, 'Brisa débil'],
      [20, 4, 'Brisa moderada'],
      [28, 4, 'Brisa moderada'],
      [29, 5, 'Brisa fresca'],
      [38, 5, 'Brisa fresca'],
      [39, 6, 'Brisa fuerte'],
      [49, 6, 'Brisa fuerte'],
      [50, 7, 'Viento fuerte'],
      [61, 7, 'Viento fuerte'],
      [62, 8, 'Temporal'],
      [74, 8, 'Temporal'],
      [75, 9, 'Temporal fuerte'],
      [88, 9, 'Temporal fuerte'],
      [89, 10, 'Temporal duro'],
      [102, 10, 'Temporal duro'],
      [103, 11, 'Temporal muy duro'],
      [117, 11, 'Temporal muy duro'],
      [118, 12, 'Huracán'],
      [150, 12, 'Huracán'],
    ];

    for (const [kmh, force, name] of cases) {
      expect(beaufort(kmh)).toEqual({ force, name });
    }
  });

  it('maps degrees to the 16-point Spanish compass rose', () => {
    const expected = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO',
    ];
    expected.forEach((label, i) => {
      expect(compassPoint(i * 22.5)).toBe(label);
    });
    expect(compassPoint(360)).toBe('N');
    expect(compassPoint(355)).toBe('N');
    expect(compassPoint(-22.5)).toBe('NNO');
  });
});

describe('solar astronomy at Orcadas (60.74° S)', () => {
  const dec21 = 355;
  const jun21 = 172;
  const mar21 = 80;
  const sep22 = 265;

  it('computes Cooper solar declination and mid-month day of year', () => {
    expect(solarDeclinationDeg(dec21)).toBeCloseTo(-23.45, 1);
    expect(solarDeclinationDeg(jun21)).toBeCloseTo(23.45, 1);
    expect(Math.abs(solarDeclinationDeg(mar21))).toBeLessThan(0.5);
    expect(midMonthDayOfYear(1)).toBe(15);
    expect(midMonthDayOfYear(6)).toBe(166);
    expect(midMonthDayOfYear(12)).toBe(349);
  });

  it('computes day length at solstices, equinoxes and polar extremes', () => {
    const summerDay = dayLengthHours(ORCADAS_LAT, dec21);
    expect(summerDay).toBeGreaterThanOrEqual(18);
    expect(summerDay).toBeLessThanOrEqual(19.5);

    const winterDay = dayLengthHours(ORCADAS_LAT, jun21);
    expect(winterDay).toBeGreaterThanOrEqual(5);
    expect(winterDay).toBeLessThanOrEqual(6.5);

    expect(Math.abs(dayLengthHours(ORCADAS_LAT, mar21) - 12)).toBeLessThanOrEqual(0.4);
    expect(Math.abs(dayLengthHours(ORCADAS_LAT, sep22) - 12)).toBeLessThanOrEqual(0.4);

    // Polar day and polar night at 80° S
    expect(dayLengthHours(-80, dec21)).toBe(24);
    expect(dayLengthHours(-80, jun21)).toBe(0);
  });

  it('places the Sun due north at solar noon with max summer elevation 90 - 60.74 + 23.45 ± 0.5', () => {
    const maxEl = solarElevationDeg(ORCADAS_LAT, dec21, 12);
    const expectedMaxEl = 90 - 60.74 + 23.45;
    expect(Math.abs(maxEl - expectedMaxEl)).toBeLessThanOrEqual(0.5);

    const midnightEl = solarElevationDeg(ORCADAS_LAT, dec21, 0);
    expect(midnightEl).toBeLessThan(0);

    for (const day of [dec21, jun21, mar21]) {
      const noonAz = solarAzimuthDeg(ORCADAS_LAT, day, 12);
      const distFromNorth = Math.min(noonAz, 360 - noonAz);
      expect(distFromNorth).toBeLessThan(1e-6);
    }

    // Morning in the East (~90°), afternoon in the West (~270°)
    expect(solarAzimuthDeg(ORCADAS_LAT, mar21, 6)).toBeCloseTo(90, 0);
    expect(solarAzimuthDeg(ORCADAS_LAT, mar21, 18)).toBeCloseTo(270, 0);
  });
});

describe('time series statistics', () => {
  it('computes decadeMeans ignoring nulls and omitting empty decades', () => {
    const series: YearValue[] = [
      { year: 1903, value: -4.0 },
      { year: 1907, value: -5.0 },
      { year: 1909, value: null },
      { year: 1912, value: null },
      { year: 1920, value: -3.0 },
      { year: 1925, value: -3.6 },
      { year: 1929, value: -2.4 },
    ];
    expect(decadeMeans(series)).toEqual([
      { decade: 1900, mean: -4.5, n: 2 },
      { decade: 1920, mean: -3.0, n: 3 },
    ]);
  });

  it('computes linearTrend by ordinary least squares and returns null for < 2 valid points', () => {
    // Hand-calculated points on exact line y = 0.02 * (year - 1900) - 4.0 -> slopePerDecade = 0.2, intercept = -42
    const exactLine: YearValue[] = [
      { year: 1900, value: -4.0 },
      { year: 1950, value: -3.0 },
      { year: 1975, value: null },
      { year: 2000, value: -2.0 },
    ];
    const trend = linearTrend(exactLine);
    expect(trend).not.toBeNull();
    expect(trend!.n).toBe(3);
    expect(trend!.slopePerDecade).toBeCloseTo(0.2, 10);
    expect(trend!.intercept).toBeCloseTo(-42, 10);

    // Hand-calculated noisy points: (0, 1), (10, 3), (20, 2), (30, 6)
    // meanX = 15, meanY = 3; dx = [-15, -5, 5, 15], dy = [-2, 0, -1, 3]
    // Sxx = 225 + 25 + 25 + 225 = 500; Sxy = 30 + 0 - 5 + 45 = 70
    // slopePerYear = 70 / 500 = 0.14 -> slopePerDecade = 1.4, intercept = 3 - 0.14 * 15 = 0.9
    const noisy: YearValue[] = [
      { year: 0, value: 1 },
      { year: 10, value: 3 },
      { year: 20, value: 2 },
      { year: 30, value: 6 },
    ];
    const noisyTrend = linearTrend(noisy);
    expect(noisyTrend!.slopePerDecade).toBeCloseTo(1.4, 10);
    expect(noisyTrend!.intercept).toBeCloseTo(0.9, 10);
    expect(noisyTrend!.n).toBe(4);

    expect(linearTrend([])).toBeNull();
    expect(linearTrend([{ year: 1903, value: -4.2 }, { year: 1904, value: null }])).toBeNull();
  });

  it('computes centered movingAverage and returns null when more than half of the window is missing', () => {
    const series: YearValue[] = [
      { year: 1903, value: 1 },
      { year: 1904, value: 2 },
      { year: 1905, value: 3 },
      { year: 1906, value: null },
      { year: 1907, value: null },
      { year: 1908, value: 6 },
    ];
    // Window = 3 (needs at least 2 valid values; > 1.5 missing -> null):
    // i=0 (1903): [out, 1, 2] -> 2 valid (1 missing) -> 1.5
    // i=1 (1904): [1, 2, 3] -> 3 valid -> 2
    // i=2 (1905): [2, 3, null] -> 2 valid (1 missing) -> 2.5
    // i=3 (1906): [3, null, null] -> 1 valid (2 missing > 1.5) -> null
    // i=4 (1907): [null, null, 6] -> 1 valid (2 missing > 1.5) -> null
    // i=5 (1908): [null, 6, out] -> 1 valid (2 missing > 1.5) -> null
    expect(movingAverage(series, 3)).toEqual([
      { year: 1903, value: 1.5 },
      { year: 1904, value: 2 },
      { year: 1905, value: 2.5 },
      { year: 1906, value: null },
      { year: 1907, value: null },
      { year: 1908, value: null },
    ]);
  });
});
