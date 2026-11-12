import {
  MONTH_NAMES,
  ORCADAS_ANNUAL_TEMP,
  ORCADAS_CLIMATE,
  ORCADAS_ERAS,
  ORCADAS_MONTHLY_TEMP,
  ORCADAS_SOURCES,
  decadeMeans,
  eraAt,
  factsFor,
  linearTrend,
  movingAverage,
  sourcesOf,
  type OrcadasEra,
  type OrcadasSource,
  type YearValue,
} from '@antartida/core';

export type CenturyViewId = 'annual' | 'stripes' | 'month';

export interface CenturyViewSpec {
  id: CenturyViewId;
  label: string;
  shortDesc: string;
}

export const CENTURY_VIEWS: readonly CenturyViewSpec[] = [
  {
    id: 'annual',
    label: 'Año por año',
    shortDesc: 'Media anual con huecos visibles, media móvil de 11 años en acuarela y tendencia lineal.',
  },
  {
    id: 'stripes',
    label: 'Franjas',
    shortDesc: 'Cada año como una franja de color según su diferencia con la media del siglo.',
  },
  {
    id: 'month',
    label: 'Tu mes',
    shortDesc: 'Todos los registros del mes elegido desde 1903, con récords y tu observación simulada.',
  },
] as const;

export interface EnrichedYearRecord {
  year: number;
  annual: number | null;
  ma11: number | null;
  anomaly: number | null;
  monthValue: number | null;
  validMonthsCount: number;
  era: OrcadasEra;
  eraMilestone: OrcadasEra | null;
}

export interface PointCoord {
  year: number;
  value: number;
  x: number;
  y: number;
}

/**
 * Builds disconnected SVG path strings (`M ... L ...`) for contiguous non-null runs
 * so missing years are never interpolated across.
 */
export function buildSegmentedPaths(
  series: readonly YearValue[],
  xOf: (year: number) => number,
  yOf: (val: number) => number
): string[] {
  const paths: string[] = [];
  let current: string[] = [];

  for (const item of series) {
    if (item.value === null || !Number.isFinite(item.value)) {
      if (current.length >= 2) {
        paths.push(current.join(' '));
      }
      current = [];
      continue;
    }
    const cmd = current.length === 0 ? 'M' : 'L';
    current.push(`${cmd}${xOf(item.year).toFixed(1)},${yOf(item.value).toFixed(1)}`);
  }
  if (current.length >= 2) {
    paths.push(current.join(' '));
  }
  return paths;
}

/**
 * Groups consecutive years where `value === null` into intervals `[startYear, endYear]`
 * so incomplete years can be drawn as hatched gap bands on the chart.
 */
export function buildMissingSpans(
  series: readonly YearValue[]
): { startYear: number; endYear: number; count: number }[] {
  const spans: { startYear: number; endYear: number; count: number }[] = [];
  let currentStart: number | null = null;
  let prevYear = 0;

  for (const item of series) {
    if (item.value === null || !Number.isFinite(item.value)) {
      if (currentStart === null) {
        currentStart = item.year;
      }
      prevYear = item.year;
    } else if (currentStart !== null) {
      spans.push({
        startYear: currentStart,
        endYear: prevYear,
        count: prevYear - currentStart + 1,
      });
      currentStart = null;
    }
  }
  if (currentStart !== null) {
    spans.push({
      startYear: currentStart,
      endYear: prevYear,
      count: prevYear - currentStart + 1,
    });
  }
  return spans;
}

/**
 * Diverging field-notebook watercolor palette for temperature anomalies (cold blue to warm oxide).
 * Pairs color with a tone bucket index (-4..+4) so visual encoding also varies luminance and height.
 */
const STRIPE_COLORS = [
  '#132B43', // <= -1.8 °C (deepest polar indigo)
  '#1E3E5C', // -1.8..-1.2 °C (deep ocean blue)
  '#3D6B8E', // -1.2..-0.7 °C (slate glacier blue)
  '#7FA8C4', // -0.7..-0.25 °C (glacier blue)
  '#DCE7EC', // -0.25..+0.25 °C (near century mean, pale ice)
  '#E7C68E', // +0.25..+0.7 °C (warm sand ocre)
  '#CE8F3A', // +0.7..+1.2 °C (golden ocre)
  '#B65C26', // +1.2..+1.8 °C (terracotta)
  '#8C3314', // > +1.8 °C (deep oxide red)
] as const;

export function stripeColorForAnomaly(anomaly: number): { color: string; bucket: number } {
  if (anomaly <= -1.8) return { color: STRIPE_COLORS[0], bucket: -4 };
  if (anomaly <= -1.2) return { color: STRIPE_COLORS[1], bucket: -3 };
  if (anomaly <= -0.7) return { color: STRIPE_COLORS[2], bucket: -2 };
  if (anomaly <= -0.25) return { color: STRIPE_COLORS[3], bucket: -1 };
  if (anomaly < 0.25) return { color: STRIPE_COLORS[4], bucket: 0 };
  if (anomaly < 0.7) return { color: STRIPE_COLORS[5], bucket: 1 };
  if (anomaly < 1.2) return { color: STRIPE_COLORS[6], bucket: 2 };
  if (anomaly < 1.8) return { color: STRIPE_COLORS[7], bucket: 3 };
  return { color: STRIPE_COLORS[8], bucket: 4 };
}

export function formatTempC(val: number, decimals = 1, signed = false): string {
  const fixed = val.toFixed(decimals);
  const clean = fixed === '-0.0' || fixed === '-0.00' ? (0).toFixed(decimals) : fixed;
  const numVal = Number(clean);
  const prefix = signed && numVal > 0 ? '+' : '';
  return `${prefix}${clean} °C`;
}

export function getReaderSource(): OrcadasSource {
  const centuryFacts = factsFor('century');
  for (const fact of centuryFacts) {
    for (const src of sourcesOf(fact)) {
      if (src.id === 'reader') return src;
    }
  }
  return (
    ORCADAS_SOURCES.find((s) => s.id === 'reader') ?? {
      id: 'reader',
      label: 'READER: datos de superficie de Orcadas',
      org: 'SCAR · British Antarctic Survey',
      url: 'https://legacy.bas.ac.uk/met/READER/surface/Orcadas.All.temperature.html',
      consulted: '11 de noviembre de 2026',
      license: 'Open Government Licence v3.0',
      verified: true,
    }
  );
}

export function computeCenturyDataset(month: number) {
  const normMonthIdx = (((Math.trunc(month) - 1) % 12) + 12) % 12;
  const monthName = MONTH_NAMES[normMonthIdx] ?? 'enero';
  const monthClimate = ORCADAS_CLIMATE[normMonthIdx] ?? ORCADAS_CLIMATE[0];

  const validAnnual = ORCADAS_ANNUAL_TEMP.filter(
    (d): d is { year: number; value: number } => d.value !== null && Number.isFinite(d.value)
  );

  const seriesMean =
    validAnnual.length > 0
      ? validAnnual.reduce((acc, d) => acc + d.value, 0) / validAnnual.length
      : -4.2;

  const ma11Series = movingAverage(ORCADAS_ANNUAL_TEMP, 11);
  const trend = linearTrend(ORCADAS_ANNUAL_TEMP);
  const decades = decadeMeans(ORCADAS_ANNUAL_TEMP);

  let coldestAnnual = validAnnual[0] ?? { year: 1945, value: -7.06 };
  let warmestAnnual = validAnnual[0] ?? { year: 1956, value: -1.42 };
  for (const pt of validAnnual) {
    if (pt.value < coldestAnnual.value) coldestAnnual = pt;
    if (pt.value > warmestAnnual.value) warmestAnnual = pt;
  }

  const monthSeries: YearValue[] = ORCADAS_MONTHLY_TEMP.map((row) => ({
    year: row.year,
    value: row.months[normMonthIdx] ?? null,
  }));

  const validMonth = monthSeries.filter(
    (d): d is { year: number; value: number } => d.value !== null && Number.isFinite(d.value)
  );

  let coldestMonth = validMonth[0] ?? { year: 1930, value: -21.2 };
  let warmestMonth = validMonth[0] ?? { year: 1956, value: 1.5 };
  for (const pt of validMonth) {
    if (pt.value < coldestMonth.value) coldestMonth = pt;
    if (pt.value > warmestMonth.value) warmestMonth = pt;
  }

  const recordsByYear = new Map<number, EnrichedYearRecord>();
  const records: EnrichedYearRecord[] = ORCADAS_ANNUAL_TEMP.map((item, idx) => {
    const monthlyRow = ORCADAS_MONTHLY_TEMP[idx];
    const validMonthsCount = monthlyRow
      ? monthlyRow.months.filter((m) => m !== null && Number.isFinite(m)).length
      : item.value !== null
        ? 12
        : 0;
    const ma11 = ma11Series[idx]?.value ?? null;
    const anomaly = item.value !== null ? item.value - seriesMean : null;
    const monthValue = monthlyRow?.months[normMonthIdx] ?? null;
    const era = eraAt(item.year);
    const eraMilestone = ORCADAS_ERAS.find((e) => e.fromYear === item.year) ?? null;

    const rec: EnrichedYearRecord = {
      year: item.year,
      annual: item.value,
      ma11,
      anomaly,
      monthValue,
      validMonthsCount,
      era,
      eraMilestone,
    };
    recordsByYear.set(item.year, rec);
    return rec;
  });

  const firstYear = ORCADAS_ANNUAL_TEMP[0]?.year ?? 1903;
  const lastYear = ORCADAS_ANNUAL_TEMP[ORCADAS_ANNUAL_TEMP.length - 1]?.year ?? 2026;

  return {
    firstYear,
    lastYear,
    totalYears: ORCADAS_ANNUAL_TEMP.length,
    validAnnualCount: validAnnual.length,
    seriesMean,
    ma11Series,
    trend,
    decades,
    coldestAnnual,
    warmestAnnual,
    monthIdx: normMonthIdx + 1,
    monthName,
    monthClimate,
    monthSeries,
    validMonthCount: validMonth.length,
    coldestMonth,
    warmestMonth,
    records,
    recordsByYear,
    readerSource: getReaderSource(),
  };
}
