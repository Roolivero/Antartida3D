import { expect, test, type Page } from '@playwright/test';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

/**
 * Hit-tests the centre of every map marker and every map bar or hint left in the
 * stage, and returns the ones that are painted above the open list view.
 */
const coveringList = (page: Page) =>
  page.evaluate(() => {
    const list = document.querySelector('.listview');
    if (!list) throw new Error('list view is not open');
    const items = document.querySelectorAll('.vp .mk, .vp [data-key], .top > *, .bottom > *, .hint');
    const out: string[] = [];
    for (const el of items) {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      if (r.width === 0 || r.height === 0 || x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && !list.contains(hit)) out.push((el.getAttribute('aria-label') ?? el.textContent ?? el.className).trim().slice(0, 60));
    }
    return out;
  });

for (const mode of ['Mapa 2D', 'Relieve 3D'] as const) {
  test(`list view covers every map marker and bar (${mode})`, async ({ page }) => {
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: mode }).click();
    await expect(toggle.getByRole('button', { name: mode })).toHaveAttribute('aria-pressed', 'true');
    const markers = page.locator('.vp .mk');
    await expect(markers.first()).toBeVisible();
    const before = await markers.count();
    if (test.info().project.use.hasTouch) {
      // A first tap leaves a marker label open, raised to the top of the map (#54).
      const freeMarker = () =>
        page.evaluate(() => {
          for (const el of document.querySelectorAll('.vp .mk:not(.cluster)')) {
            const r = el.getBoundingClientRect();
            const x = r.left + r.width / 2;
            const y = r.top + r.height / 2;
            if (r.width > 0 && el.contains(document.elementFromPoint(x, y))) return { x, y };
          }
          return null;
        });
      // 3D markers are placed once the camera settles: wait for one that is free to tap.
      await expect.poll(freeMarker, { message: 'a marker free to tap' }).not.toBeNull();
      const spot = (await freeMarker())!;
      await page.touchscreen.tap(spot.x, spot.y);
      await expect(page.locator('.vp .mk.shown')).toHaveCount(1);
    }

    await page.getByRole('button', { name: 'Ver como lista' }).click();
    const list = page.getByRole('dialog', { name: 'Todos los puntos' });
    await expect(list).toBeVisible();
    expect(await coveringList(page)).toEqual([]);

    // The way back to the map stays on top and reachable by pointer.
    await list.getByRole('button', { name: 'Ver mapa' }).click();
    await expect(list).toHaveCount(0);
    await expect(markers.first()).toBeVisible();
    expect(await markers.count()).toBe(before);
  });
}
