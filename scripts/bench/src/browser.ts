import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, Page } from '@playwright/test';
import type { Interaction } from './types.ts';

// A string, not a function: tsx/esbuild injects `__name()` helpers that do not exist in the page.
const RECORDER = `
  window.__perf = { rec: false, frames: [], long: [] };
  try {
    new PerformanceObserver(function (list) {
      if (window.__perf.rec) for (const e of list.getEntries()) window.__perf.long.push(e.duration);
    }).observe({ type: 'longtask', buffered: false });
  } catch (e) {}
  var last = 0;
  requestAnimationFrame(function tick(t) {
    if (window.__perf.rec && last) window.__perf.frames.push(t - last);
    last = t;
    requestAnimationFrame(tick);
  });
`;

async function record(page: Page, action: () => Promise<void>): Promise<Interaction> {
  await page.evaluate(() => {
    const p = (window as unknown as { __perf: { rec: boolean; frames: number[]; long: number[] } }).__perf;
    p.frames = []; p.long = []; p.rec = true;
  });
  await action();
  await page.waitForTimeout(300);
  const { frames, long } = await page.evaluate(() => {
    const p = (window as unknown as { __perf: { rec: boolean; frames: number[]; long: number[] } }).__perf;
    p.rec = false;
    return { frames: p.frames, long: p.long };
  });
  const sorted = [...frames].sort((a, b) => a - b);
  return {
    longTasks: long.length,
    longTaskMs: Math.round(long.reduce((a, b) => a + b, 0)),
    longFrames: frames.filter((f) => f > 50).length,
    frames: frames.length,
    p95Frame: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
  };
}

const openExpedition = async (page: Page) => {
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Fósiles/ }).click();
};

/** Pan, pinch and the dive into the expedition on a 390 px touch phone with 4x CPU throttling. */
export async function measureInteraction(browser: Browser, url: string) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript({ content: RECORDER });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const box = (await page.locator('.vp').boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: [number, number][]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });

  const pan = await record(page, async () => {
    await touch('touchStart', [[cx, cy]]);
    for (let i = 1; i <= 40; i++) {
      await touch('touchMove', [[cx - i * 4, cy - i * 3]]);
      await page.waitForTimeout(16);
    }
    await touch('touchEnd', []);
  });

  const pinch = await record(page, async () => {
    await touch('touchStart', [[cx - 30, cy], [cx + 30, cy]]);
    for (let i = 1; i <= 40; i++) {
      await touch('touchMove', [[cx - 30 - i * 3, cy - i], [cx + 30 + i * 3, cy + i]]);
      await page.waitForTimeout(16);
    }
    await touch('touchEnd', []);
  });

  const dive = await record(page, async () => {
    await openExpedition(page);
    await page.locator('.exp').waitFor({ timeout: 15_000 });
    await page.waitForTimeout(600);
  });

  await ctx.close();
  return { pan, pinch, dive };
}

/** Network view of the first load: JS bytes over the wire and request count. */
export async function measureLoad(browser: Browser, url: string) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await ctx.close();
  return { requests: requests.length, scripts: requests.filter((u) => /\.m?js(\?|$)/.test(u)) };
}

async function shoot(page: Page, dir: string, name: string) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(dir, `${name}.jpg`), type: 'jpeg', quality: 78 });
}

/** Map, sheet, list, dig and conclusion at 390 px and 1440 px. */
export async function screenshots(browser: Browser, url: string, dir: string) {
  mkdirSync(dir, { recursive: true });
  for (const [w, h] of [[390, 844], [1440, 900]] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await shoot(page, dir, `mapa-${w}`);

    await page.getByRole('button', { name: 'Ver como lista' }).click();
    await shoot(page, dir, `lista-${w}`);
    await page.getByRole('dialog').getByRole('button', { name: /Estación Orcadas/ }).click();
    await shoot(page, dir, `ficha-${w}`);
    await page.keyboard.press('Escape');

    await openExpedition(page);
    await page.locator('.exp').waitFor();
    await page.locator('.ebar .btn.primary').click();
    await shoot(page, dir, `excavacion-${w}`);

    for (let spot = 1; spot <= 3; spot++) {
      const btn = page.getByRole('button', { name: new RegExp(`^Zona de excavación ${spot}`) });
      // Four passes open the card; retry a few in case a press lands before the previous render settles.
      for (let i = 0; i < 8 && !(await page.getByRole('dialog').count()); i++) {
        await btn.press('Enter');
        await page.waitForTimeout(30);
      }
      await page.getByRole('dialog').locator('.btn.primary').click();
      // Preact closes the card on the next frame: wait, or the next passes land while it is still open.
      await page.getByRole('dialog').waitFor({ state: 'detached' });
    }
    await page.locator('.opt').first().click();
    await page.locator('.ebar .btn.primary').click();
    await shoot(page, dir, `conclusion-${w}`);
    await ctx.close();
  }
}
