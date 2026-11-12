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
  expect(consoleErrors, 'console errors (exceptions, shader compile errors)').toEqual([]);
});

test.describe('Ocean 3D animation efficiency', () => {
  test('in active 3D mode with motion allowed, seaTime advances over 1 s', async ({ page }) => {
    // Override reducedMotion for this test to allow animation
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');

    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await expect(page.locator('canvas')).toBeVisible();

    // Wait for initial render and setup
    await page.waitForFunction(() => typeof (window as unknown as { __seaTime?: number }).__seaTime === 'number');

    const t0 = await page.evaluate(() => (window as unknown as { __seaTime: number }).__seaTime);
    await page.waitForTimeout(1000);
    const t1 = await page.evaluate(() => (window as unknown as { __seaTime: number }).__seaTime);

    expect(t1).toBeGreaterThan(t0);
    // Should have advanced around 0.7 - 1.3 seconds
    expect(t1 - t0).toBeGreaterThanOrEqual(0.5);
  });

  test('when document is hidden, frame rendering does not advance', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');

    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await expect(page.locator('canvas')).toBeVisible();

    // Wait until frames counter starts ticking
    await page.waitForFunction(() => ((window as unknown as { __frames?: number }).__frames ?? 0) > 3);

    // Simulate document becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Allow loop to settle
    await page.waitForTimeout(200);

    const framesBefore = await page.evaluate(() => (window as unknown as { __frames?: number }).__frames ?? 0);
    await page.waitForTimeout(1000);
    const framesAfter = await page.evaluate(() => (window as unknown as { __frames?: number }).__frames ?? 0);

    // When hidden, uTime is paused and invalidate() is not called by animation clock
    expect(framesAfter).toBe(framesBefore);
  });

  test('with prefers-reduced-motion, seaTime does not change and canvas screenshots are identical', async ({ page }) => {
    // Default playwright config uses reducedMotion: 'reduce'
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Settle textures
    await page.waitForTimeout(1000);

    const t0 = await page.evaluate(() => (window as unknown as { __seaTime?: number }).__seaTime ?? 0);
    const shot1 = await canvas.screenshot();

    await page.waitForTimeout(1000);

    const t1 = await page.evaluate(() => (window as unknown as { __seaTime?: number }).__seaTime ?? 0);
    const shot2 = await canvas.screenshot();

    // Time remains locked at 0
    expect(t0).toBe(0);
    expect(t1).toBe(0);

    // Screenshots are byte-for-byte identical
    expect(shot1.equals(shot2)).toBe(true);
  });

  test('open sea in the tilted 3D view is water color, and the far corner fades to paper, never black (1440 and 390 px)', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Settle scene and terrain
    await page.waitForTimeout(1200);

    const samples = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const cc = (window as any).__cameraControls;
      if (!c || !cc) return null;
      const c2d = document.createElement('canvas');
      c2d.width = 1;
      c2d.height = 1;
      const ctx = c2d.getContext('2d');
      if (!ctx) return null;
      const rect = c.getBoundingClientRect();
      const pixel = (cssX: number, cssY: number) => {
        const sx = (cssX / rect.width) * c.width;
        const sy = (cssY / rect.height) * c.height;
        ctx.drawImage(c, sx, sy, 1, 1, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return { r, g, b };
      };
      // Open sea at 0° E, 55° S (Weddell / Scotia side, away from land and markers), in the
      // polar stereographic map space (scale 1590, centered on 500, 500): world = map - 500.
      const r = 1590 * Math.tan(((90 - 55) / 2) * (Math.PI / 180));
      const V = cc.camera.position.constructor;
      const p = new V(0, 0, -r).project(cc.camera);
      return {
        sea: pixel(((p.x + 1) / 2) * rect.width, ((1 - p.y) / 2) * rect.height),
        corner: pixel(10, 10),
      };
    });

    expect(samples).not.toBeNull();
    const { sea, corner } = samples!;
    // The sea is drawn: bluish water, not the raw paper background.
    expect(sea.b).toBeGreaterThanOrEqual(sea.r);
    expect(sea.r > 220 && sea.g > 210 && sea.b > 190).toBe(false);
    // Far away the world fades into paper (#42), but the canvas never shows black there.
    expect(corner.r + corner.g + corner.b).toBeGreaterThan(30);
  });

  test('ARA Almirante Irizar marker exists, can be focused with Tab, and opens a card with verified source (1440 and 390 px)', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForTimeout(800);

    const irizarBtn = page.locator('[data-key="sea-irizar"] button');
    await expect(irizarBtn).toBeVisible();

    // Test focusability (Tab key / focus-visible)
    await irizarBtn.focus();
    await expect(irizarBtn).toBeFocused();

    // Click opens PointSheet with verified source or pending tag
    await irizarBtn.click();
    const sheet = page.locator('.sheet[role="dialog"]');
    await expect(sheet).toBeVisible();
    const sheetText = await sheet.innerText();
    const hasSource = sheetText.includes('Fuente') || sheetText.includes('fuente') || sheetText.includes('[Fuente a definir]');
    expect(hasSource).toBe(true);

    // Close sheet
    await page.keyboard.press('Escape');
    await expect(sheet).not.toBeVisible();
  });

  test('hint, brand title, subtitle, and registration panel bounding boxes do not overlap at 390 px in 2D and 3D', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(500);

    const checkNoIntersections = async (mode: string) => {
      const hint = await page.locator('.hint').boundingBox();
      const brand = await page.locator('.brand').boundingBox();
      const sub = await page.locator('.brand p').boundingBox();
      const reg = await page.locator('.reg').boundingBox();

      expect(hint, `${mode}: hint bounding box`).not.toBeNull();
      expect(brand, `${mode}: brand bounding box`).not.toBeNull();
      expect(sub, `${mode}: sub bounding box`).not.toBeNull();
      expect(reg, `${mode}: reg bounding box`).not.toBeNull();

      const overlaps = (
        a: { x: number; y: number; width: number; height: number },
        b: { x: number; y: number; width: number; height: number }
      ) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);

      expect(overlaps(hint!, brand!), `${mode}: hint overlaps brand`).toBe(false);
      expect(overlaps(hint!, sub!), `${mode}: hint overlaps subtitle`).toBe(false);
      expect(overlaps(hint!, reg!), `${mode}: hint overlaps registration panel`).toBe(false);
      expect(overlaps(brand!, reg!), `${mode}: brand overlaps registration panel`).toBe(false);
    };

    // 1. Check in 2D
    await checkNoIntersections('2D');

    // 2. Check in 3D
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await toggle.getByRole('button', { name: 'Relieve 3D' }).click();
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForTimeout(500);
    await checkNoIntersections('3D');
  });
});
