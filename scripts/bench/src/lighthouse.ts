import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import type { LighthouseRun } from './types.ts';

/** Mobile preset with Lighthouse's default simulated throttling. */
export async function runLighthouse(url: string, chromePath: string | undefined, outDir: string, tag: string): Promise<LighthouseRun> {
  const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
  try {
    const result = await lighthouse(url, { port: chrome.port, logLevel: 'error', output: 'json', onlyCategories: ['performance', 'accessibility'] });
    if (!result) throw new Error('lighthouse returned no result');
    const { lhr } = result;
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, `lh-${tag}.json`), JSON.stringify(lhr));
    const audit = (id: string) => lhr.audits[id]?.numericValue ?? NaN;
    return {
      performance: Math.round((lhr.categories.performance.score ?? 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility.score ?? 0) * 100),
      lcp: Math.round(audit('largest-contentful-paint')),
      tbt: Math.round(audit('total-blocking-time')),
      cls: Number(audit('cumulative-layout-shift').toFixed(3)),
    };
  } finally {
    await chrome.kill();
  }
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function medianRun(runs: LighthouseRun[]): LighthouseRun {
  const keys = ['performance', 'accessibility', 'lcp', 'tbt', 'cls'] as const;
  return Object.fromEntries(keys.map((k) => [k, median(runs.map((r) => r[k]))])) as unknown as LighthouseRun;
}
