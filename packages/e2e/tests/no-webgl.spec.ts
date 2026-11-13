import { expect, test } from '@playwright/test';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

test('without WebGL the app falls back cleanly to 2D without the toggle', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });

  await page.goto('/');

  // Toggle should NOT be visible
  await expect(page.getByRole('group', { name: 'Modo de vista' })).toHaveCount(0);

  // 2D layer should be present, and NO canvas
  await expect(page.locator('.layer')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);

  // Flow still works: opening an expedition shows its fallback scene without WebGL
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  const dialog = page.getByRole('dialog', { name: 'Todos los puntos' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Estación Orcadas/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible();
});
