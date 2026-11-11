import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';

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
