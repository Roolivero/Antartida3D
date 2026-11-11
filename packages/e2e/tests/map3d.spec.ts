import { expect, test } from '@playwright/test';

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

test.describe('3D relief view', () => {
  test('toggle switches between 2D and 3D and renders canvas', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await expect(toggle).toBeVisible();

    // Default under reducedMotion: 'reduce' is 2D
    await expect(toggle.getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.layer')).toBeVisible();

    // Switch to 3D
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await expect(toggle.getByRole('button', { name: 'Relieve 3D' })).toHaveAttribute('aria-pressed', 'true');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Reload preserves the choice
    await page.reload();
    await expect(toggle.getByRole('button', { name: 'Relieve 3D' })).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas).toBeVisible();

    // Switch back to 2D
    await toggle.getByRole('button', { name: 'Mapa 2D' }).click();
    await expect(toggle.getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('markers are focusable in 3D and Fósiles opens the expedition', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await expect(toggle).toBeVisible();

    // Switch to 3D
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForSelector('canvas');

    // Click cluster containing fosiles or directly fosiles marker
    const clusterOrMarker = page.locator('.ov [data-key*="fosiles"] button');
    await expect(clusterOrMarker).toBeVisible();
    await clusterOrMarker.click();

    // If it was a cluster, clicking it zooms in and separates the points; wait for Fósiles marker
    const fosilesBtn = page.getByRole('button', { name: /Expedición disponible/ });
    await expect(fosilesBtn).toBeVisible({ timeout: 5000 });
    await fosilesBtn.click();

    await expect(page.getByRole('heading', { name: '¿Cómo era la Antártida antes del hielo?' })).toBeVisible({ timeout: 10000 });
  });

  test('terrain is rendered and South Pole pixel is not ocean color', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Wait for terrain textures and mesh to settle
    await page.waitForTimeout(1200);

    const isTerrainVisible = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return false;
      const c2d = document.createElement('canvas');
      c2d.width = 1;
      c2d.height = 1;
      const ctx = c2d.getContext('2d');
      if (!ctx) return false;
      ctx.drawImage(c, c.width / 2, c.height / 2, 1, 1, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      // Ocean color #3F6F94 is r:63, g:111, b:148.
      // Terrain at South Pole is bright snow/relief (r > 130).
      const isOcean = r < 100 && g < 135 && b > 100;
      return !isOcean && (r > 120 || g > 120);
    });

    expect(isTerrainVisible).toBe(true);
  });
});
