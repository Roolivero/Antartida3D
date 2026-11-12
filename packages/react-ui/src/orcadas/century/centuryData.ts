import {
  ORCADAS_ANNUAL_TEMP,
  ORCADAS_ERAS,
  ORCADAS_SOURCES,
  ORCADAS_TREND_SPLIT_YEAR,
  eraAt,
  factsFor,
  movingAverage,
  segmentedTrend,
  sourcesOf,
  type OrcadasEra,
  type OrcadasSource,
  type YearValue,
} from '@antartida/core';

export interface EnrichedYearRecord {
  year: number;
  annual: number | null;
  ma11: number | null;
  anomaly: number | null;
  era: OrcadasEra;
  eraMilestone: OrcadasEra | null;
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

export function formatSlope(slopePerDecade: number): string {
  const absVal = Math.abs(slopePerDecade);
  const formatted = absVal.toFixed(2).replace('.', ',');
  if (slopePerDecade > 0) return `+${formatted} °C por década`;
  if (slopePerDecade < 0) return `−${formatted} °C por década`;
  return `0,00 °C por década`;
}

export function formatTempC(val: number, decimals = 1, signed = false): string {
  const numVal = Number(val.toFixed(decimals));
  if (Object.is(numVal, -0) || numVal === 0) {
    return `${(0).toFixed(decimals).replace('.', ',')} °C`;
  }
  const absVal = Math.abs(val).toFixed(decimals).replace('.', ',');
  if (numVal < 0) return `−${absVal} °C`;
  const prefix = signed && numVal > 0 ? '+' : '';
  return `${prefix}${absVal} °C`;
}

export function getReaderSource(): OrcadasSource {
  const journeyFacts = factsFor('journey');
  for (const fact of journeyFacts) {
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

export function computeCenturyDataset() {
  const validAnnual = ORCADAS_ANNUAL_TEMP.filter(
    (d): d is { year: number; value: number } => d.value !== null && Number.isFinite(d.value)
  );

  const seriesMean =
    validAnnual.length > 0
      ? validAnnual.reduce((acc, d) => acc + d.value, 0) / validAnnual.length
      : -4.2;

  const ma11Series = movingAverage(ORCADAS_ANNUAL_TEMP, 11);
  const trendSegments = segmentedTrend(ORCADAS_ANNUAL_TEMP, ORCADAS_TREND_SPLIT_YEAR);

  let coldestAnnual = validAnnual[0] ?? { year: 1945, value: -7.06 };
  let warmestAnnual = validAnnual[0] ?? { year: 1956, value: -1.42 };
  for (const pt of validAnnual) {
    if (pt.value < coldestAnnual.value) coldestAnnual = pt;
    if (pt.value > warmestAnnual.value) warmestAnnual = pt;
  }

  const recordsByYear = new Map<number, EnrichedYearRecord>();
  const records: EnrichedYearRecord[] = ORCADAS_ANNUAL_TEMP.map((item, idx) => {
    const ma11 = ma11Series[idx]?.value ?? null;
    const anomaly = item.value !== null ? item.value - seriesMean : null;
    const era = eraAt(item.year);
    const eraMilestone = ORCADAS_ERAS.find((e) => e.fromYear === item.year) ?? null;

    const rec: EnrichedYearRecord = {
      year: item.year,
      annual: item.value,
      ma11,
      anomaly,
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
    seriesMean,
    ma11Series,
    trendSegments,
    coldestAnnual,
    warmestAnnual,
    records,
    recordsByYear,
    readerSource: getReaderSource(),
  };
}
