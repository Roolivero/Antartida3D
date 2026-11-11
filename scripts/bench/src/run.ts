/**
 * pnpm bench [app ...] [--runs=3] [--skip-lighthouse] [--skip-shots]
 * Builds each app, serves its preview and measures size, Lighthouse, interaction and screenshots.
 * Results go to docs/rendimiento/results.json and docs/rendimiento.md is regenerated.
 * The stack comparison that chose dibujado is frozen in git history.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { chromiumPath } from '@antartida/e2e/browser';
import { APPS, type AppName } from '@antartida/e2e/ports';
import { measureInteraction, measureLoad, screenshots } from './browser.ts';
import { measureZoomGpu } from './gpu.ts';
import { medianRun, runLighthouse } from './lighthouse.ts';
import { writeReport } from './report.ts';
import { build, startPreview } from './server.ts';
import { initialJs, sumFiles } from './sizes.ts';
import type { AppResult, BenchFile, LighthouseRun } from './types.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const resultsFile = join(root, 'docs/rendimiento/results.json');
const outDir = join(root, 'scripts/bench/out');

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const runs = Number(args.find((a) => a.startsWith('--runs='))?.split('=')[1] ?? 3);
const requested = args.filter((a) => !a.startsWith('--')) as AppName[];
const apps = (requested.length ? requested : (Object.keys(APPS) as AppName[])).filter((a) => existsSync(join(root, 'apps', a, 'package.json')));

const emptyRun: LighthouseRun = { performance: NaN, accessibility: NaN, lcp: NaN, tbt: NaN, cls: NaN };

async function benchApp(app: AppName): Promise<AppResult> {
  const dir = join(root, 'apps', app);
  const port = APPS[app];
  const url = `http://localhost:${port}/`;
  console.log(`\n[${app}] build`);
  const buildMs = build(dir);
  const dist = join(dir, 'dist');
  const initial = initialJs(dist);

  console.log(`[${app}] preview :${port}`);
  const stop = await startPreview(dir, port);
  const browser = await chromium.launch({ executablePath: chromiumPath });
  try {
    const load = await measureLoad(browser, url);
    console.log(`[${app}] interaction (CPU 4x)`);
    const interaction = await measureInteraction(browser, url);
    console.log(`[${app}] zoom (GPU)`);
    const zoomGpu = await measureZoomGpu(url, chromiumPath, outDir);
    if (!flag('skip-shots')) {
      console.log(`[${app}] screenshots`);
      await screenshots(browser, url, join(root, 'docs/rendimiento/capturas', app));
    }
    const lighthouseRuns: LighthouseRun[] = [];
    if (!flag('skip-lighthouse')) {
      for (let i = 1; i <= runs; i++) {
        console.log(`[${app}] lighthouse ${i}/${runs}`);
        lighthouseRuns.push(await runLighthouse(url, chromiumPath, outDir, `${app}-${i}`));
      }
    }
    return {
      app,
      buildMs,
      jsTotal: sumFiles(dist, /\.m?js$/),
      jsInitial: initial.size,
      css: sumFiles(dist, /\.css$/),
      requests: load.requests,
      lighthouse: lighthouseRuns.length ? medianRun(lighthouseRuns) : emptyRun,
      lighthouseRuns,
      interaction,
      zoomGpu,
    };
  } finally {
    await browser.close();
    stop();
  }
}

const previous: BenchFile | null = existsSync(resultsFile) ? JSON.parse(readFileSync(resultsFile, 'utf8')) : null;
const results = new Map((previous?.results ?? []).map((r) => [r.app, r]));
for (const app of apps) {
  try {
    results.set(app, await benchApp(app));
  } catch (e) {
    console.error(`[${app}] failed:`, e);
    results.set(app, { ...(results.get(app) ?? ({ app } as AppResult)), error: String(e).slice(0, 500) });
  }
}

const file: BenchFile = {
  date: new Date().toISOString(),
  machine: `${cpus()[0]?.model ?? 'unknown CPU'} × ${cpus().length}`,
  chromium: (() => { try { return execSync(`${chromiumPath ?? 'chromium'} --version`, { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } })(),
  results: (Object.keys(APPS) as AppName[]).map((a) => results.get(a)).filter((r): r is AppResult => !!r),
};
mkdirSync(join(root, 'docs/rendimiento'), { recursive: true });
writeFileSync(resultsFile, JSON.stringify(file, null, 2) + '\n');
writeReport(file, join(root, 'docs/rendimiento.md'));
console.log('\nResultados en docs/rendimiento/results.json y docs/rendimiento.md');
