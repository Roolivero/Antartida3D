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
    // Two expeditions are available now (Fósiles and Desde Ushuaia): name the one under test.
    const fosilesBtn = page.getByRole('button', { name: /Fósiles.*Expedición disponible/ });
    await expect(fosilesBtn).toBeVisible({ timeout: 5000 });
    await fosilesBtn.click();

    await expect(page.getByRole('heading', { name: '¿Cómo era la Antártida antes del hielo?' })).toBeVisible({ timeout: 10000 });
  });

  test('zoom buttons move the orbit camera from where it is, without resetting it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForFunction(() => (window as any).__cameraControls);

    type Cam = { d: number; polar: number; az: number; tx: number; tz: number };
    const cam = () =>
      page.evaluate((): Cam => {
        const cc = (window as any).__cameraControls;
        const t = cc.getTarget();
        return { d: cc.distance, polar: cc.polarAngle, az: cc.azimuthAngle, tx: t.x, tz: t.z };
      });

    // The user orbits and moves somewhere (reduced motion: no transitions).
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.rotateTo(0.6, 0.5, false);
      cc.moveTo(-150, 0, -80, false);
    });
    const before = await cam();

    // "+" must get closer (it used to move away from the overview on desktop) and keep the orbit.
    await page.getByRole('button', { name: 'Acercar', exact: true }).click();
    const zoomedIn = await cam();
    expect(zoomedIn.d).toBeLessThan(before.d * 0.7);
    expect(zoomedIn.polar).toBeCloseTo(before.polar, 3);
    expect(zoomedIn.az).toBeCloseTo(before.az, 3);
    expect(zoomedIn.tx).toBeCloseTo(before.tx, 1);
    expect(zoomedIn.tz).toBeCloseTo(before.tz, 1);

    // "-" goes back out from there, not to the overview.
    await page.getByRole('button', { name: 'Alejar', exact: true }).click();
    const zoomedOut = await cam();
    expect(zoomedOut.d).toBeCloseTo(before.d, 0);
    expect(zoomedOut.tx).toBeCloseTo(before.tx, 1);

    // Unrelated UI state (the legend) must not remount the scene and reset the camera.
    await page.getByRole('button', { name: /Leyenda/ }).click();
    const afterLegend = await cam();
    expect(afterLegend.d).toBeCloseTo(zoomedOut.d, 0);
    expect(afterLegend.tx).toBeCloseTo(before.tx, 1);

    // Wider zoom range than before (120..3500).
    const range = await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      return { min: cc.minDistance, max: cc.maxDistance };
    });
    expect(range.min).toBeLessThan(120);
    expect(range.max).toBeGreaterThan(3500);
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

  test('Tierra del Fuego has relief and the camera gets closer there than over Antarctica', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForFunction(() => (window as any).__cameraControls);

    // Look at Ushuaia (map 31.5, 313.6 -> world -468.5, -186.4).
    await page.evaluate(() => {
      (window as any).__cameraControls.setLookAt(-455, 40, -170, -468.5, 0, -186.4, false);
      (window as any).__invalidate();
    });

    // The regional mesh is fetched once the camera is near and carries a land/water attribute.
    await page.waitForFunction(
      () => {
        let found = false;
        (window as any).__scene.traverse((o: any) => {
          if (o.isMesh && o.geometry?.attributes?.aLand) found = true;
        });
        (window as any).__invalidate();
        return found;
      },
      null,
      { timeout: 20000 },
    );

    const distance = () => page.evaluate(() => (window as any).__cameraControls.distance as number);
    const settle = (check: string) =>
      page.waitForFunction(
        (c) => {
          (window as any).__invalidate();
          const cc = (window as any).__cameraControls;
          return new Function('cc', `return ${c}`)(cc);
        },
        check,
        { timeout: 10000 },
      );

    // Around Ushuaia the camera may go well below the Antarctic limit of 60.
    await settle('cc.minDistance < 60');
    await page.evaluate(() => void (window as any).__cameraControls.dollyTo(1, false));
    await settle('cc.distance < 20');
    const minHere = await page.evaluate(() => (window as any).__cameraControls.minDistance as number);
    expect(await distance()).toBeGreaterThanOrEqual(minHere - 0.01);

    // Moving the target to the South Pole pushes it back out.
    await page.evaluate(() => void (window as any).__cameraControls.moveTo(0, 0, 0, false));
    await settle('cc.minDistance === 60 && cc.distance >= 59.9');
  });

  test('with PointSheet open, elementFromPoint at sheet center returns an element inside the sheet', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);

    // Open PointSheet for a sea marker
    const seaMarker = page.locator('.ov [data-key^="sea-"] button').first();
    await expect(seaMarker).toBeVisible();
    await seaMarker.click();
    const sheet = page.locator('.sheet[role="dialog"]');
    await expect(sheet).toBeVisible();

    // Verify center of sheet points to a node inside the sheet
    const hitInside = await page.evaluate(() => {
      const el = document.querySelector('.sheet[role="dialog"]');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return el.contains(hit);
    });

    expect(hitInside).toBe(true);
  });
});
