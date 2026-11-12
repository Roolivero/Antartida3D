/**
 * Builds packages/core/src/content/orcadas-series.ts from READER meteorological records.
 * Run with `pnpm --filter @antartida/core orcadas-series`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'https://legacy.bas.ac.uk/met/READER/surface/';
const FILES = {
  temp: 'Orcadas.All.temperature.txt',
  press: 'Orcadas.All.msl_pressure.txt',
  wind: 'Orcadas.All.wind_speed.txt',
} as const;

const cacheDir = join(homedir(), '.cache/antartida3d/orcadas');
const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, '../src/content/orcadas-series.ts');

async function loadData(filename: string): Promise<string> {
  const localCachePath = join(cacheDir, filename.replace('Orcadas.All.', ''));
  if (existsSync(localCachePath)) {
    return readFileSync(localCachePath, 'utf8');
  }

  const directPath = join(cacheDir, filename);
  if (existsSync(directPath)) {
    return readFileSync(directPath, 'utf8');
  }

  mkdirSync(cacheDir, { recursive: true });
  const url = `${BASE_URL}${filename}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  writeFileSync(localCachePath, text, 'utf8');
  return text;
}

interface ParsedRow {
  year: number;
  months: (number | null)[];
}

function parseReaderFile(content: string, name: string): ParsedRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error(`File ${name} is empty or missing data lines`);
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const parts = rawLine.split(/\s+/);
    if (parts.length !== 13) {
      throw new Error(`Line ${i + 1} in ${name} has ${parts.length} columns, expected 13: "${rawLine}"`);
    }

    const year = Number.parseInt(parts[0], 10);
    if (!Number.isInteger(year)) {
      throw new Error(`Invalid year "${parts[0]}" at line ${i + 1} in ${name}`);
    }

    const months: (number | null)[] = [];
    for (let m = 0; m < 12; m++) {
      const valStr = parts[m + 1];
      if (valStr === '-') {
        months.push(null);
      } else {
        const val = Number.parseFloat(valStr);
        if (Number.isNaN(val)) {
          throw new Error(`Invalid numeric value "${valStr}" for month ${m + 1} at year ${year} in ${name}`);
        }
        months.push(val);
      }
    }

    rows.push({ year, months });
  }

  // Validate consecutive years
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].year !== rows[i - 1].year + 1) {
      throw new Error(
        `Non-consecutive years in ${name}: year ${rows[i - 1].year} followed by ${rows[i].year}`
      );
    }
  }

  return rows;
}

function round2(val: number): number {
  const r = Math.round(val * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

function populationStats(values: number[]): { mean: number; sd: number } {
  if (values.length === 0) return { mean: 0, sd: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance = values.reduce((acc, x) => acc + (x - mean) ** 2, 0) / values.length;
  return { mean, sd: Math.sqrt(variance) };
}

async function main() {
  const [tempText, pressText, windText] = await Promise.all([
    loadData(FILES.temp),
    loadData(FILES.press),
    loadData(FILES.wind),
  ]);

  const tempRows = parseReaderFile(tempText, 'temperature');
  const pressRows = parseReaderFile(pressText, 'msl_pressure');
  const windRows = parseReaderFile(windText, 'wind_speed');

  // Validate temperature range: -40 to 15
  for (const r of tempRows) {
    for (let m = 0; m < 12; m++) {
      const v = r.months[m];
      if (v !== null && (v < -40 || v > 15)) {
        throw new Error(
          `Temperature out of valid range [-40, 15]: ${v} °C at year ${r.year}, month ${m + 1}`
        );
      }
    }
  }

  // ORCADAS_ANNUAL_TEMP: null if any month is missing, mean of 12 months rounded to 2 decimals otherwise
  const annualTemp = tempRows.map((r) => {
    const hasMissing = r.months.some((v) => v === null);
    if (hasMissing) {
      return { year: r.year, value: null };
    }
    const sum = (r.months as number[]).reduce((a, b) => a + b, 0);
    return { year: r.year, value: round2(sum / 12) };
  });

  // Climatology: per month 1..12
  const climate = [];
  for (let m = 0; m < 12; m++) {
    const tVals = tempRows.map((r) => r.months[m]).filter((v): v is number => v !== null);
    const pVals = pressRows.map((r) => r.months[m]).filter((v): v is number => v !== null);
    const wVals = windRows.map((r) => r.months[m]).filter((v): v is number => v !== null);

    const tStats = populationStats(tVals);
    const pStats = populationStats(pVals);
    const wStats = populationStats(wVals);

    climate.push({
      month: m + 1,
      tempMeanC: round2(tStats.mean),
      tempSdC: round2(tStats.sd),
      pressureMeanHpa: round2(pStats.mean),
      pressureSdHpa: round2(pStats.sd),
      windMeanKmh: round2(wStats.mean * 1.852),
      cloudMeanOktas: 6,
    });
  }

  // Verify control values
  const janTemp = climate[0].tempMeanC;
  const julTemp = climate[6].tempMeanC;
  const julPress = climate[6].pressureMeanHpa;
  const completeYears = annualTemp.filter((y) => y.value !== null).length;

  if (janTemp !== 0.65) {
    throw new Error(`Control check failed: January mean temperature is ${janTemp}, expected 0.65`);
  }
  if (julTemp !== -10.03) {
    throw new Error(`Control check failed: July mean temperature is ${julTemp}, expected -10.03`);
  }
  if (julPress !== 995.39) {
    throw new Error(`Control check failed: July mean pressure is ${julPress}, expected 995.39`);
  }
  if (completeYears !== 113) {
    throw new Error(`Control check failed: Complete annual temperature years is ${completeYears}, expected 113`);
  }

  // Serialize output
  const code = `// Generated by scripts/build-orcadas-series.ts. Do not edit.
// Source: SCAR / British Antarctic Survey READER
// https://legacy.bas.ac.uk/met/READER/surface/Orcadas.All.temperature.html
// License: Open Government Licence v3.0

import type { MonthClimate, YearValue } from '../orcadas.ts';

export const ORCADAS_MONTHLY_TEMP: readonly { year: number; months: readonly (number | null)[] }[] = ${JSON.stringify(
    tempRows,
    null,
    2
  )} as const;

export const ORCADAS_ANNUAL_TEMP: readonly YearValue[] = ${JSON.stringify(
    annualTemp,
    null,
    2
  )} as const;

export const ORCADAS_CLIMATE: readonly MonthClimate[] = [
${climate
  .map(
    (c) => `  {
    month: ${c.month},
    tempMeanC: ${c.tempMeanC},
    tempSdC: ${c.tempSdC},
    pressureMeanHpa: ${c.pressureMeanHpa},
    pressureSdHpa: ${c.pressureSdHpa},
    windMeanKmh: ${c.windMeanKmh},
    // Simulation parameter: no sourced cloud climatology
    cloudMeanOktas: ${c.cloudMeanOktas},
  },`
  )
  .join('\n')}
] as const;
`;

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, code, 'utf8');
  console.log(`Wrote ${outFile} (${tempRows.length} years, ${completeYears} complete annual years)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
