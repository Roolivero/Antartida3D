import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from '@playwright/test';
import { chromiumPath } from '@antartida/e2e/browser';

/**
 * Chromium flags that use the machine's real GPU (ANGLE over EGL). Without them headless Chromium
 * draws with SwiftShader and GPU raster costs (SVG filters re-rasterized on zoom) never show up.
 */
export const GPU_ARGS = ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];

export interface ZoomCost {
  /** Total GPU-process work while zooming (ms). */
  gpuMs: number;
  /** Longest single GPU task (ms): over ~16 ms it shows up as a stutter. */
  maxTaskMs: number;
  /** GPU tasks over 16 ms. */
  longTasks: number;
}

export interface ZoomResult { renderer: string; buttons: ZoomCost; wheel: ZoomCost }

async function trace(page: Page, browser: Awaited<ReturnType<typeof chromium.launch>>, file: string, action: () => Promise<void>): Promise<ZoomCost> {
  await browser.startTracing(page, { path: file, categories: ['disabled-by-default-devtools.timeline', 'gpu', 'viz', 'cc'] });
  await action();
  await page.waitForTimeout(900);
  await browser.stopTracing();
  const tasks = (JSON.parse(readFileSync(file, 'utf8')).traceEvents as { name: string; dur?: number }[])
    .filter((e) => e.name === 'GPUTask' && e.dur)
    .map((e) => e.dur! / 1000);
  rmSync(file, { force: true });
  return {
    gpuMs: Math.round(tasks.reduce((a, b) => a + b, 0)),
    maxTaskMs: Math.round(Math.max(0, ...tasks)),
    longTasks: tasks.filter((d) => d > 16).length,
  };
}

/** Three animated zooms with the + button and ten mouse-wheel notches, desktop 1440 px, after the page settles. */
export async function measureZoomGpu(url: string, chromiumPath: string | undefined, outDir: string): Promise<ZoomResult> {
  const browser = await chromium.launch({ executablePath: chromiumPath, args: GPU_ARGS });
  try {
    const open = async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(4000);
      const box = (await page.locator('.vp').boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.45);
      return page;
    };
    let page = await open();
    const renderer = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown';
    });
    const buttons = await trace(page, browser, join(outDir, 'zoom-trace.json'), async () => {
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: 'Acercar', exact: true }).click();
        await page.waitForTimeout(600);
      }
    });
    await page.close();
    page = await open();
    const wheel = await trace(page, browser, join(outDir, 'zoom-trace.json'), async () => {
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(50);
      }
    });
    await page.close();
    return { renderer, buttons, wheel };
  } finally {
    await browser.close();
  }
}

export interface OceanResult {
  viewport: string;
  dpr: number;
  durationMs: number;
  frames: number;
  totalGpuMs: number;
  gpuMsPerFrame: number;
  maxTaskMs: number;
  longGpuTasks: number;
  drawCalls: number;
  longTasksMain: number;
}

/**
 * Benchmark scenario for 3D ocean:
 * 10 s quiet at 38° overview with water & fauna animation, plus one camera orbit and one zoom.
 * Measures main thread long tasks (>50 ms), GPU ms per frame, and render draw calls.
 */
export async function measureOceanGpu(
  url = 'http://localhost:5103/',
  customChromiumPath?: string,
  outDir = '/tmp'
): Promise<{ desktop: OceanResult; mobile: OceanResult }> {
  const execPath = customChromiumPath ?? chromiumPath;
  const browser = await chromium.launch({ executablePath: execPath, args: GPU_ARGS });

  async function runSingle(width: number, height: number, dpr: number): Promise<OceanResult> {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const btn3D = page.getByRole('button', { name: 'Relieve 3D' });
      await btn3D.click();
      await page.waitForSelector('canvas');
      await page.waitForTimeout(2000);

      // Register long task observer on main thread
      await page.evaluate(() => {
        (window as unknown as { __longTasks: number[] }).__longTasks = [];
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              (window as unknown as { __longTasks: number[] }).__longTasks.push(Math.round(entry.duration));
            }
          }
        });
        obs.observe({ entryTypes: ['longtask'] });
      });

      const traceFile = join(outDir, `trace-ocean-${width}.json`);
      await browser.startTracing(page, {
        path: traceFile,
        categories: ['disabled-by-default-devtools.timeline', 'gpu', 'viz', 'cc', 'toplevel'],
      });

      const startFrames = await page.evaluate(() => (window as unknown as { __frames?: number }).__frames ?? 0);
      const t0 = performance.now();

      // 1. 10 s quiet at 38° tilt overview
      await page.waitForTimeout(10000);

      // 2. One orbit rotation
      await page.evaluate(() => {
        const cc = (window as unknown as { __cameraControls?: { rotate: (azimuth: number, polar: number, enableTransition: boolean) => void } }).__cameraControls;
        cc?.rotate((30 * Math.PI) / 180, 0, true);
      });
      await page.waitForTimeout(1000);

      // 3. One zoom in
      await page.getByRole('button', { name: 'Acercar', exact: true }).click();
      await page.waitForTimeout(1000);

      const t1 = performance.now();
      const endFrames = await page.evaluate(() => (window as unknown as { __frames?: number }).__frames ?? 0);
      const drawCalls = await page.evaluate(() => {
        const gl = (window as unknown as { __gl?: { info?: { render?: { calls?: number } } } }).__gl;
        return gl?.info?.render?.calls ?? 0;
      });
      const inPageLongTasks = await page.evaluate(() => (window as unknown as { __longTasks?: number[] }).__longTasks ?? []);

      await browser.stopTracing();

      const traceEvents = (JSON.parse(readFileSync(traceFile, 'utf8')).traceEvents as { name: string; dur?: number }[]);
      rmSync(traceFile, { force: true });

      const gpuTasks = traceEvents
        .filter((e) => e.name === 'GPUTask' && e.dur)
        .map((e) => e.dur! / 1000);
      const totalGpuMs = Math.round(gpuTasks.reduce((a, b) => a + b, 0));
      const maxTaskMs = Math.round(Math.max(0, ...gpuTasks));
      const longGpuTasks = gpuTasks.filter((d) => d > 16).length;

      const mainRunTasks = traceEvents
        .filter((e) => e.name === 'RunTask' && e.dur && e.dur > 50000)
        .map((e) => Math.round(e.dur! / 1000));

      const frames = Math.max(1, endFrames - startFrames);
      const gpuMsPerFrame = Number((totalGpuMs / frames).toFixed(2));
      const durationMs = Math.round(t1 - t0);
      const longTasksMain = Math.max(inPageLongTasks.length, mainRunTasks.length);

      return {
        viewport: `${width}×${height}`,
        dpr,
        durationMs,
        frames,
        totalGpuMs,
        gpuMsPerFrame,
        maxTaskMs,
        longGpuTasks,
        drawCalls,
        longTasksMain,
      };
    } finally {
      await page.close();
    }
  }

  try {
    const desktop = await runSingle(1440, 900, 1);
    const mobile = await runSingle(390, 844, 2);
    return { desktop, mobile };
  } finally {
    await browser.close();
  }
}

// Direct execution CLI runner
const isDirectCli = process.argv[1] && (
  process.argv[1].endsWith('gpu.ts') ||
  process.argv[1].endsWith('gpu.js') ||
  process.argv[1] === fileURLToPath(import.meta.url)
);

if (isDirectCli) {
  console.log('Running ocean 3D GPU benchmark...');
  const res = await measureOceanGpu();
  console.log('\n--- 1440 px (dpr 1) ---');
  console.log(`Duration: ${res.desktop.durationMs} ms (${res.desktop.frames} frames)`);
  console.log(`Total GPU: ${res.desktop.totalGpuMs} ms (${res.desktop.gpuMsPerFrame} ms/frame)`);
  console.log(`Max GPU task: ${res.desktop.maxTaskMs} ms (tasks > 16ms: ${res.desktop.longGpuTasks})`);
  console.log(`Draw calls: ${res.desktop.drawCalls}`);
  console.log(`Main thread long tasks: ${res.desktop.longTasksMain}`);

  console.log('\n--- 390 px (dpr 2) ---');
  console.log(`Duration: ${res.mobile.durationMs} ms (${res.mobile.frames} frames)`);
  console.log(`Total GPU: ${res.mobile.totalGpuMs} ms (${res.mobile.gpuMsPerFrame} ms/frame)`);
  console.log(`Max GPU task: ${res.mobile.maxTaskMs} ms (tasks > 16ms: ${res.mobile.longGpuTasks})`);
  console.log(`Draw calls: ${res.mobile.drawCalls}`);
  console.log(`Main thread long tasks: ${res.mobile.longTasksMain}`);
}
